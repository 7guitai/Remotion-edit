import { VIDEO } from "../config/video";
import type { FrameState, SimulationConfig } from "./types";

/** 物理ステップごとの生データ */
export type StepRecord = {
  t: number;
  pos: number[];
  alive: number;
  gateAngle: number;
  gateHalf: number;
  spinnerAngle: number;
  /** 重力の傾き（rad, 0 = 真下） */
  tilt: number;
  zone?: number;
};

/** 勝者確定の前後をスローにする区間（シミュレーション秒、勝者確定時刻からの相対） */
const SLOWMO = { before: 1.1, after: 0.35, speed: 0.35, ramp: 0.3 };

/** シミュレーション時刻 t における再生速度 */
export const playbackSpeed = (t: number, decidedAt: number): number => {
  const start = decidedAt - SLOWMO.before;
  const end = decidedAt + SLOWMO.after;
  const lerp = (a: number, b: number, p: number) => a + (b - a) * Math.min(1, Math.max(0, p));
  if (t < start - SLOWMO.ramp || t > end + SLOWMO.ramp) return 1;
  if (t < start) return lerp(1, SLOWMO.speed, (t - (start - SLOWMO.ramp)) / SLOWMO.ramp);
  if (t > end) return lerp(SLOWMO.speed, 1, (t - end) / SLOWMO.ramp);
  return SLOWMO.speed;
};

const lerpAngle = (a: number, b: number, p: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * p;
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * 物理ステップ列 → 動画フレーム列。
 * 冒頭 introSeconds は t=0 で静止、その後は再生速度（勝者確定前後はスロー）に従って時刻を進め、
 * 隣接ステップを線形補間してフレームの状態を作る。
 */
export const buildTimeline = (
  steps: StepRecord[],
  decidedAt: number,
  config: SimulationConfig,
): { frames: FrameState[]; winnerFrame: number } => {
  const fps = VIDEO.fps;
  const total = fps * VIDEO.durationSeconds;
  const intro = fps * VIDEO.introSeconds;
  const lastT = steps[steps.length - 1].t;

  const frames: FrameState[] = [];
  let t = 0;
  let winnerFrame = -1;
  for (let f = 0; f < total; f++) {
    const speed = f < intro ? 0 : playbackSpeed(t, decidedAt);
    if (f >= intro && f > 0) t = Math.min(lastT, t + speed / fps);
    if (winnerFrame < 0 && t >= decidedAt) winnerFrame = f;

    const x = t * config.physicsHz;
    const i0 = Math.min(steps.length - 1, Math.floor(x));
    const i1 = Math.min(steps.length - 1, i0 + 1);
    const p = x - i0;
    const a = steps[i0];
    const b = steps[i1];
    const pos = a.pos.map((v, k) =>
      k % 3 === 2 ? r3(lerpAngle(v, b.pos[k], p)) : r1(v + (b.pos[k] - v) * p),
    );
    const gateHalf = a.gateHalf + (b.gateHalf - a.gateHalf) * p;
    const gateAngle = lerpAngle(a.gateAngle, b.gateAngle, p);
    frames.push({
      t: Math.round(t * 10000) / 10000,
      b: pos,
      alive: a.alive,
      gate: gateHalf > 0.001 ? [r3(gateAngle - gateHalf), r3(gateAngle + gateHalf)] : null,
      spinnerAngle: r3(lerpAngle(a.spinnerAngle, b.spinnerAngle, p)),
      tilt: r3(a.tilt + (b.tilt - a.tilt) * p),
      ...(a.zone !== undefined && b.zone !== undefined ? { zone: r1(a.zone + (b.zone - a.zone) * p) } : {}),
      speed: Math.round(speed * 100) / 100,
    });
  }
  if (winnerFrame < 0) throw new Error("勝者確定の瞬間が動画の尺に収まっていません");
  return { frames, winnerFrame };
};
