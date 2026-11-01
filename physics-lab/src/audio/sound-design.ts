import type { SimulationResult } from "../physics/types";

export type SoundCue = { frame: number; src: string; volume: number };

/** 効果音の配置を、事前計算済みのイベント（脱落・衝突・勝者確定）から決める */
export const buildSoundCues = (
  sim: SimulationResult,
  elimFrames: number[],
  frameAt: (t: number) => number,
  pulseFrames: number[] = [],
  eventFrames: number[] = [],
): SoundCue[] => {
  const cues: SoundCue[] = [];
  const intro = sim.introFrames;

  // 冒頭のカウント音 → GO
  cues.push({ frame: Math.round(intro * 0.3), src: "audio/countdown.wav", volume: 0.5 });
  cues.push({ frame: Math.round(intro * 0.65), src: "audio/countdown.wav", volume: 0.5 });
  cues.push({ frame: intro, src: "audio/go.wav", volume: 0.6 });

  // 脱落: 同じフレームに重なったら1つにまとめて少し大きく
  const perFrame = new Map<number, number>();
  for (const f of elimFrames) if (f < sim.durationFrames) perFrame.set(f, (perFrame.get(f) ?? 0) + 1);
  let lastElim = -10;
  for (const [f, n] of [...perFrame.entries()].sort((a, b) => a[0] - b[0])) {
    if (f - lastElim < 2) continue;
    cues.push({ frame: f, src: "audio/elimination.wav", volume: Math.min(0.75, 0.45 + 0.1 * (n - 1)) });
    lastElim = f;
  }

  // 衝突: 強い衝突だけを、最短3フレーム間隔で
  let lastHit = -10;
  const endHits = sim.winnerFrame + sim.fps * 2;
  for (const h of sim.hits) {
    if (h.strength < 6) continue;
    const f = frameAt(h.t);
    if (f >= endHits || f >= sim.durationFrames) break;
    if (f - lastHit < 3) continue;
    cues.push({ frame: f, src: "audio/collision.wav", volume: Math.min(0.35, 0.08 + h.strength * 0.015) });
    lastHit = f;
  }

  for (const f of pulseFrames) {
    if (f < sim.winnerFrame) cues.push({ frame: f, src: "audio/pulse.wav", volume: 0.45 });
  }

  for (const f of eventFrames) {
    cues.push({ frame: f, src: "audio/go.wav", volume: 0.75 });
    cues.push({ frame: f + 4, src: "audio/pulse.wav", volume: 0.6 });
  }

  cues.push({ frame: sim.winnerFrame, src: "audio/victory.wav", volume: 0.8 });
  return cues;
};

/** BGMの音量: スロー区間で下げ、勝者確定後は少し戻す */
export const bgmVolume = (frame: number, sim: SimulationResult): number => {
  const speed = sim.frames[Math.min(frame, sim.frames.length - 1)].speed;
  const base = frame < sim.introFrames ? 0.22 : 0.3;
  const slow = speed > 0 && speed < 1 ? 0.12 : base;
  const fadeOut = Math.min(1, (sim.durationFrames - frame) / 20);
  return slow * fadeOut;
};
