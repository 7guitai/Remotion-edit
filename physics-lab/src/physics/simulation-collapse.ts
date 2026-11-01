import Matter from "matter-js";
import { LAYOUT } from "../config/physics";
import { VIDEO } from "../config/video";
import { BEAT_SECONDS, GENERATOR_VERSION, ballTeams, linearTarget, makeBallInfo, round } from "./common";
import { clampSpeed, collideAliveWithWall } from "./collision";
import { buildTimeline, type StepRecord } from "./recorder";
import { SeededRandom } from "./seeded-random";
import type { CourseSpec, Elimination, HitEvent, SimulationConfig, SimulationResult, Tile, WinnerInfo } from "./types";

const { Engine, Bodies, Body, Composite, Events } = Matter;

/** 床が崩れ始める時刻 */
const COLLAPSE_START = 2;
/** 点滅（予告）してから落ちるまで */
const WARN_SECONDS = 0.75;
/** 床のリング構成: [内半径, 外半径, 分割数] */
const RINGS: [number, number, number][] = [
  [58, 215, 8],
  [215, 420, 16],
];

const CAT_BALL = 0x1;
const CAT_OBSTACLE = 0x4;

/**
 * COLLAPSE（崩れる床）のルール
 * - 真上から見た円形の床。床は扇形のタイルに分かれていて、予告の点滅のあと1枚ずつ落ちる
 * - ボールの中心が落ちたタイルの上に来たら脱落（穴に落ちる）
 * - 床全体が傾いていて、傾きの向きがゆっくり回る。ボールは床の上を流れるように転がる
 * - 中央の回転バーがボールをはじく
 * - 落とすタイルは残数の目標との差で選ぶ（遅れているときはボールが多いタイル）
 * - 最後の1枚は落とさない。残り1個で勝者確定。期限までに決着しなければ中心に近いボールが勝者
 */
export const runCollapse = (config: SimulationConfig): SimulationResult => {
  const rng = new SeededRandom(config.seed);
  const r = config.ballRadius;
  const { cx, cy, radius: R } = LAYOUT.arena;

  // --- コース ---
  const arms = rng.pick([2, 3] as const);
  const course: CourseSpec = {
    spinner: {
      arms,
      length: RINGS[0][1] - 20,
      thickness: 20,
      angularSpeed: rng.sign() * rng.range(1.2, 1.8),
      initialAngle: rng.range(0, Math.PI * 2),
    },
    bumpers: [],
    hubRadius: 46,
    gateAngularSpeed: 0,
    gateInitialAngle: 0,
  };
  const tilt0 = rng.range(0, Math.PI * 2);
  const tiltSpeed = rng.sign() * rng.range(0.55, 0.85);

  const tiles: Tile[] = [];
  for (const [r0, r1, n] of RINGS) {
    const offset = rng.range(0, (Math.PI * 2) / n);
    for (let k = 0; k < n; k++) {
      const a0 = offset + (k / n) * Math.PI * 2;
      tiles.push({ r0, r1, a0, a1: a0 + (Math.PI * 2) / n, warnAt: null, fallAt: null });
    }
  }
  const tileAt = (x: number, y: number): number => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx);
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (d < t.r0 || d >= t.r1) continue;
      let rel = (a - t.a0) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      if (rel < t.a1 - t.a0) return i;
    }
    return -1; // ハブの上
  };

  // --- ワールド ---
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0.001 }, positionIterations: 10, velocityIterations: 8 });
  const obstacleOpts = { isStatic: true, restitution: 0.9, friction: 0, collisionFilter: { category: CAT_OBSTACLE, mask: CAT_BALL, group: 0 } };
  const s = course.spinner;
  const bars = Array.from({ length: s.arms }, (_, k) => {
    const a = (k / s.arms) * Math.PI * 2;
    const bar = Bodies.rectangle(cx + (Math.cos(a) * s.length) / 2, cy + (Math.sin(a) * s.length) / 2, s.length, s.thickness, {
      chamfer: { radius: s.thickness / 2 },
    });
    Body.setAngle(bar, a);
    return bar;
  });
  const spinner = Body.create({ parts: bars, ...obstacleOpts });
  Body.setPosition(spinner, { x: cx, y: cy });
  Body.setAngle(spinner, s.initialAngle);
  const hub = Bodies.circle(cx, cy, course.hubRadius, obstacleOpts);

  // 初期配置: 六角格子で床全体に散らす（ハブ・回転バーを避ける）
  const spacing = r * 2 + 18;
  const slots: { x: number; y: number }[] = [];
  for (let row = 0; ; row++) {
    const y = cy - R + r + 10 + row * spacing * 0.866;
    if (y > cy + R) break;
    for (let x = cx - R + (row % 2 ? spacing / 2 : 0); x <= cx + R; x += spacing) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > R - r - 10 || d < course.hubRadius + r + 12) continue;
      let clear = true;
      for (let k = 0; k < s.arms; k++) {
        const a = s.initialAngle + (k / s.arms) * Math.PI * 2;
        const along = Math.max(0, Math.min(s.length, (x - cx) * Math.cos(a) + (y - cy) * Math.sin(a)));
        if (Math.hypot(x - cx - Math.cos(a) * along, y - cy - Math.sin(a) * along) < s.thickness / 2 + r + 8) clear = false;
      }
      if (clear) slots.push({ x, y });
    }
  }
  const picked = rng.shuffle(slots).slice(0, config.ballCount);
  if (picked.length < config.ballCount) throw new Error("初期配置の場所が足りません");
  const teams = ballTeams(config.ballCount, rng);
  const balls = picked.map((p, i) => {
    const b = Bodies.circle(p.x, p.y, r, {
      restitution: config.restitution,
      friction: config.friction,
      frictionAir: config.airFriction,
      frictionStatic: 0,
      density: 0.002,
      collisionFilter: { category: CAT_BALL, mask: CAT_BALL | CAT_OBSTACLE, group: 0 },
      label: `ball_${i}`,
    });
    Body.setVelocity(b, { x: rng.range(-2, 2), y: rng.range(-2, 2) });
    return b;
  });
  Composite.add(engine.world, [spinner, hub, ...balls]);

  const ballInfo = makeBallInfo(teams, r);
  const alive = balls.map(() => true);
  let aliveCount = balls.length;
  const eliminations: Elimination[] = [];
  const hits: HitEvent[] = [];
  const pulses: number[] = [];
  let winner: WinnerInfo | null = null;
  let simTime = 0;
  const ballIndexById = new Map<number, number>(balls.map((b, i) => [b.id, i]));

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const ia = ballIndexById.get(pair.bodyA.id);
      const ib = ballIndexById.get(pair.bodyB.id);
      if (ia === undefined && ib === undefined) continue;
      const va = pair.bodyA.velocity;
      const vb = pair.bodyB.velocity;
      const strength = Math.hypot(va.x - vb.x, va.y - vb.y);
      if (strength >= 4) hits.push({ t: simTime, strength: round(strength, 1), kind: ia !== undefined && ib !== undefined ? "ball" : "obstacle" });
    }
  });

  const eliminate = (i: number, reason: Elimination["reason"]) => {
    alive[i] = false;
    aliveCount--;
    const b = balls[i];
    eliminations.push({ ballIndex: i, t: round(simTime, 4), x: round(b.position.x, 1), y: round(b.position.y, 1), aliveAfter: aliveCount, place: aliveCount + 1, reason });
    b.collisionFilter = { category: 0, mask: 0, group: 0 };
    Body.setStatic(b, true);
  };

  const steps: StepRecord[] = [];
  let spinnerAngle = s.initialAngle;
  let tilt = tilt0;
  const record = () => {
    const pos = new Array<number>(balls.length * 3);
    balls.forEach((b, i) => {
      pos[i * 3] = b.position.x;
      pos[i * 3 + 1] = b.position.y;
      pos[i * 3 + 2] = b.angle;
    });
    steps.push({ t: simTime, pos, alive: aliveCount, gateAngle: 0, gateHalf: 0, spinnerAngle, tilt });
  };

  const dtMs = 1000 / config.physicsHz;
  const dt = 1 / config.physicsHz;
  const totalSteps = Math.round(config.durationSeconds * config.physicsHz);
  let lastPick = -Infinity;
  record();

  for (let step = 1; step <= totalSteps; step++) {
    simTime = step / config.physicsHz;

    // --- 崩落の制御 ---
    if (!winner && simTime >= COLLAPSE_START) {
      const target = linearTarget(simTime, config.ballCount, COLLAPSE_START, config.targetFinishSeconds);
      const behind = aliveCount - target;
      const interval = behind > 3 ? 0.3 : behind > 0 ? 0.8 : behind > -3 ? 1.3 : 2.0;
      const standing = tiles.map((t, i) => i).filter((i) => tiles[i].warnAt === null);
      // 拍に合わせて落とす（BGMと同期）
      const onBeat = Math.abs(simTime / (BEAT_SECONDS / 2) - Math.round(simTime / (BEAT_SECONDS / 2))) < dt / (BEAT_SECONDS / 2) / 2;
      if (onBeat && simTime - lastPick >= interval && standing.length > 1) {
        const count = new Map<number, number>();
        balls.forEach((b, i) => {
          if (!alive[i]) return;
          const ti = tileAt(b.position.x, b.position.y);
          if (ti >= 0) count.set(ti, (count.get(ti) ?? 0) + 1);
        });
        // 遅れているときはボールの多いタイルを、そうでなければ外側寄りのタイルをランダムに
        const scored = standing.map((i) => ({
          i,
          score: (behind > 0 ? (count.get(i) ?? 0) * 3 : 0) + (tiles[i].r0 > 100 ? 2 : 0) + rng.next() * 3,
        }));
        scored.sort((a, b) => b.score - a.score);
        const pick = scored[0].i;
        tiles[pick].warnAt = round(simTime, 4);
        tiles[pick].fallAt = round(simTime + WARN_SECONDS, 4);
        lastPick = simTime;
      }
    }
    for (const t of tiles) if (t.fallAt !== null && Math.abs(t.fallAt - simTime) < dt / 2) pulses.push(round(simTime, 4));

    // --- 傾き: 向きがゆっくり回り、終盤ほど強くなる ---
    tilt = tilt0 + tiltSpeed * simTime;
    const strength = winner ? 0 : 0.01 + 0.035 * Math.min(1, simTime / config.targetFinishSeconds);
    for (let i = 0; i < balls.length; i++) {
      if (!alive[i]) continue;
      const v = balls[i].velocity;
      // 勝者は決着後すぐにブレーキをかけて止まる
      const k = winner ? 0.85 : 1;
      Body.setVelocity(balls[i], { x: (v.x + Math.cos(tilt) * strength) * k, y: (v.y + Math.sin(tilt) * strength) * k });
    }

    spinnerAngle += s.angularSpeed * dt;
    (Body.setAngle as (b: Matter.Body, a: number, updateVelocity?: boolean) => void)(spinner, spinnerAngle, true);

    Engine.update(engine, dtMs);

    // --- 外周の手すり・脱落判定 ---
    let eliminatedThisStep = false;
    for (let i = 0; i < balls.length; i++) {
      if (!alive[i]) continue;
      const b = balls[i];
      collideAliveWithWall(b, r, { angle: 0, halfWidth: 0 }, true);
      clampSpeed(b, config.maxSpeed);
      const ti = tileAt(b.position.x, b.position.y);
      const fallen = ti >= 0 && tiles[ti].fallAt !== null && simTime >= (tiles[ti].fallAt as number);
      if (fallen && !eliminatedThisStep && aliveCount > 1 && !winner) {
        eliminate(i, "escaped");
        eliminatedThisStep = true;
        if (aliveCount === 1) {
          winner = { ballIndex: alive.indexOf(true), decidedAt: round(simTime, 4), decidedBy: "last-standing" };
          // 決着したら、予告中でまだ落ちていないタイルは落とさない
          for (const t of tiles) if (t.fallAt !== null && t.fallAt > simTime) t.warnAt = t.fallAt = null;
        }
      }
    }

    // --- タイムアウト ---
    if (!winner && simTime >= config.deadlineSeconds) {
      const candidates = balls
        .map((b, i) => ({ i, d: Math.hypot(b.position.x - cx, b.position.y - cy) }))
        .filter(({ i }) => alive[i])
        .sort((a, b) => a.d - b.d || a.i - b.i);
      for (const { i } of [...candidates].reverse()) if (i !== candidates[0].i) eliminate(i, "timeout");
      winner = { ballIndex: candidates[0].i, decidedAt: round(simTime, 4), decidedBy: "timeout" };
    }
    record();
  }

  if (!winner) throw new Error("勝者が決まらないままシミュレーションが終了しました");
  const decided: WinnerInfo = winner;
  const { frames, winnerFrame } = buildTimeline(steps, decided.decidedAt, config);

  // 勝者は決着の瞬間、落ちていない床の上にいるか（決着後は床が元に戻る演出が入る）
  const wi = decided.ballIndex;
  const atDecision = steps.find((st) => st.t >= decided.decidedAt) ?? steps[steps.length - 1];
  const wt = tileAt(atDecision.pos[wi * 3], atDecision.pos[wi * 3 + 1]);
  const winnerSafe = wt < 0 || tiles[wt].fallAt === null || decided.decidedAt < (tiles[wt].fallAt as number);

  return {
    format: "physics-lab/last-ball-standing@1",
    mode: "collapse",
    tiles,
    winnerSafe,
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
    pulses,
    winner: decided,
    winnerFrame,
    frames,
  };
};
