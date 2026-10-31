import Matter from "matter-js";
import { LAYOUT } from "../config/physics";
import { VIDEO } from "../config/video";
import { CAT, DEAD_FILTER, buildCourse, createWorld } from "./engine";
import { clampSpeed, collideAliveWithWall, collideDeadWithWall, wrapAngle } from "./collision";
import { buildTimeline, type StepRecord } from "./recorder";
import { SeededRandom } from "./seeded-random";
import type { BallInfo, Elimination, HitEvent, SimulationConfig, SimulationResult, WinnerInfo } from "./types";

const { Engine, Body, Events } = Matter;

export const GENERATOR_VERSION = "1.0.0";

/** ゲートが開き始めるシミュレーション秒 */
const GATE_OPEN_AT = 1.0;
/** ゲート幅の変化速度の上限（rad/s） */
const GATE_RATE = (160 * Math.PI) / 180;
const GATE_MAX_HALF = (60 * Math.PI) / 180;
const DEG = Math.PI / 180;

/** 残数の目標カーブ: 開始時 ballCount → targetFinishSeconds で 1 */
export const targetAlive = (t: number, config: SimulationConfig): number => {
  if (t <= GATE_OPEN_AT) return config.ballCount;
  const p = Math.min(1, (t - GATE_OPEN_AT) / (config.targetFinishSeconds - GATE_OPEN_AT));
  return 1 + (config.ballCount - 1) * Math.pow(1 - p, 1.1);
};

/** 24色のネオンカラー（seedで割り当て順を変える） */
const ballColors = (count: number, rng: SeededRandom): string[] => {
  const hues = Array.from({ length: count }, (_, i) => Math.round((i * 360) / count));
  return rng.shuffle(hues).map((h) => `hsl(${h}, 100%, 60%)`);
};

/**
 * Last Ball Standing のルール
 * - アリーナ外周には回転する出口（ゲート）が1つある。ゲートから外に出たボールは脱落
 * - 脱落ボールは外周の外側を転がってドロップゾーンに溜まる（画面からは消えない）
 * - 1ステップで脱落確定するのは最大1個。よって「全員同時脱落」は起こらない
 * - 残り1個になった瞬間に勝者確定。ゲートは閉じ、勝者は壁の内側に保護される
 * - deadlineSeconds までに決着しなければタイムアウト: アリーナ中心に最も近いボールが勝者、残りはその場で停止して脱落扱い
 * - ゲート幅は「残数の目標カーブ」との差で自動調整し、展開のテンポを保つ
 */
export const runSimulation = (config: SimulationConfig): SimulationResult => {
  const rng = new SeededRandom(config.seed);
  const course = buildCourse(rng);
  const colors = ballColors(config.ballCount, rng);
  const world = createWorld(config, course, rng);
  const { engine, balls, spinner } = world;
  const r = config.ballRadius;
  const { cx, cy, radius: R, wallThickness: wallT } = LAYOUT.arena;

  const ballInfo: BallInfo[] = balls.map((_, i) => ({
    id: `ball_${String(i + 1).padStart(3, "0")}`,
    number: i + 1,
    color: colors[i],
    radius: r,
  }));

  const ballIndexById = new Map<number, number>(balls.map((b, i) => [b.id, i]));
  const alive = balls.map(() => true);
  let aliveCount = balls.length;
  const eliminations: Elimination[] = [];
  const hits: HitEvent[] = [];
  let winner: WinnerInfo | null = null;

  const dtMs = 1000 / config.physicsHz;
  const totalSteps = Math.round(config.durationSeconds * config.physicsHz);
  let gateAngle = course.gateInitialAngle;
  let gateHalf = 0;
  let spinnerAngle = course.spinner.initialAngle;
  let simTime = 0;

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const ia = ballIndexById.get(pair.bodyA.id);
      const ib = ballIndexById.get(pair.bodyB.id);
      const aAlive = ia !== undefined && alive[ia];
      const bAlive = ib !== undefined && alive[ib];
      if (!aAlive && !bAlive) continue;
      const va = pair.bodyA.velocity;
      const vb = pair.bodyB.velocity;
      const strength = Math.hypot(va.x - vb.x, va.y - vb.y);
      if (strength < 4) continue;
      hits.push({ t: simTime, strength: Math.round(strength * 10) / 10, kind: aAlive && bAlive ? "ball" : "obstacle" });
    }
  });

  const eliminate = (i: number, reason: Elimination["reason"]) => {
    alive[i] = false;
    aliveCount--;
    const b = balls[i];
    eliminations.push({
      ballIndex: i,
      t: round(simTime, 4),
      x: round(b.position.x, 1),
      y: round(b.position.y, 1),
      aliveAfter: aliveCount,
      place: aliveCount + 1,
      reason,
    });
    if (reason === "escaped") {
      b.collisionFilter = { ...DEAD_FILTER };
    } else {
      // タイムアウトで脱落したボールはその場で停止（勝者の障害物として残る）
      Body.setStatic(b, true);
      b.collisionFilter = { category: CAT.dead, mask: CAT.alive, group: 0 };
    }
  };

  const steps: StepRecord[] = [];
  const record = () => {
    const pos = new Array<number>(balls.length * 3);
    balls.forEach((b, i) => {
      pos[i * 3] = b.position.x;
      pos[i * 3 + 1] = b.position.y;
      pos[i * 3 + 2] = b.angle;
    });
    steps.push({ t: simTime, pos, alive: aliveCount, gateAngle, gateHalf, spinnerAngle });
  };

  record();
  for (let step = 1; step <= totalSteps; step++) {
    simTime = step / config.physicsHz;
    const dt = 1 / config.physicsHz;

    // --- ゲート制御 ---
    gateAngle = wrapAngle(gateAngle + course.gateAngularSpeed * dt * (1 + simTime / 30));
    let desiredHalf = 0;
    if (!winner && simTime >= GATE_OPEN_AT) {
      const diff = aliveCount - targetAlive(simTime, config);
      const base = 12 * DEG + (simTime / config.targetFinishSeconds) * 6 * DEG;
      desiredHalf = diff < -1 ? 0 : Math.max(0, Math.min(GATE_MAX_HALF, base + diff * 3 * DEG));
    }
    const rate = GATE_RATE;
    gateHalf += Math.max(-rate * dt, Math.min(rate * dt, desiredHalf - gateHalf));
    if (gateHalf < 0.2 * DEG) gateHalf = desiredHalf === 0 ? 0 : gateHalf;

    // --- 回転バー（速度を使って衝突に回転の勢いを伝える） ---
    spinnerAngle += course.spinner.angularSpeed * dt;
    (Body.setAngle as (b: Matter.Body, a: number, updateVelocity?: boolean) => void)(spinner, spinnerAngle, true);

    Engine.update(engine, dtMs);

    // --- 外周壁・脱落判定 ---
    const gate = { angle: gateAngle, halfWidth: gateHalf };
    let eliminatedThisStep = false;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (alive[i]) {
        const isProtected = winner !== null;
        const outcome = collideAliveWithWall(b, r, gate, isProtected);
        const d = Math.hypot(b.position.x - cx, b.position.y - cy);
        const escaped = outcome === "forced-out" || d > R + wallT + r * 0.5;
        if (escaped && !eliminatedThisStep && aliveCount > 1) {
          eliminate(i, "escaped");
          eliminatedThisStep = true;
          if (aliveCount === 1) {
            winner = { ballIndex: alive.indexOf(true), decidedAt: round(simTime, 4), decidedBy: "last-standing" };
          }
        }
      }
      if (!alive[i] && !b.isStatic) collideDeadWithWall(b, r);
      clampSpeed(b, config.maxSpeed);
    }

    // --- タイムアウト ---
    if (!winner && simTime >= config.deadlineSeconds) {
      const candidates = balls
        .map((b, i) => ({ i, d: Math.hypot(b.position.x - cx, b.position.y - cy) }))
        .filter(({ i }) => alive[i])
        .sort((a, b) => a.d - b.d || a.i - b.i);
      const champion = candidates[0].i;
      // 中心から遠い順に脱落扱い（順位もこの順）
      for (const { i } of [...candidates].reverse()) {
        if (i !== champion) eliminate(i, "timeout");
      }
      winner = { ballIndex: champion, decidedAt: round(simTime, 4), decidedBy: "timeout" };
    }

    record();
  }

  if (!winner) throw new Error("勝者が決まらないままシミュレーションが終了しました");
  const decided: WinnerInfo = winner;

  const { frames, winnerFrame } = buildTimeline(steps, decided.decidedAt, config);

  return {
    format: "physics-lab/last-ball-standing@1",
    generator: { version: GENERATOR_VERSION, createdAt: new Date().toISOString() },
    config,
    course,
    layout: { arena: { ...LAYOUT.arena }, dropZone: { ...LAYOUT.dropZone } },
    fps: VIDEO.fps,
    durationFrames: frames.length,
    introFrames: VIDEO.fps * VIDEO.introSeconds,
    balls: ballInfo,
    eliminations,
    hits,
    winner: decided,
    winnerFrame,
    frames,
  };
};

const round = (v: number, digits: number) => {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
};
