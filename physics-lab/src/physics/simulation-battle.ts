import Matter from "matter-js";
import { LAYOUT } from "../config/physics";
import { VIDEO } from "../config/video";
import { GENERATOR_VERSION, linearTarget, makeBallInfo, round } from "./common";
import { buildTimeline, type StepRecord } from "./recorder";
import { SeededRandom } from "./seeded-random";
import { TEAMS } from "./teams";
import type { CourseSpec, Elimination, HitEvent, HpEvent, SimulationConfig, SimulationResult, WinnerInfo } from "./types";

const { Engine, Bodies, Body, Composite, Events } = Matter;

export const MAX_HP = 14;
/** 安全地帯（外周の電気柵）が縮み始める時刻・縮み終わる時刻・最終半径 */
const ZONE_START = 4;
const ZONE_END = 18;
const ZONE_MIN = 230;
/** ダメージを受けたあとの無敵時間 */

const CAT_BALL = 0x1;
const CAT_OBSTACLE = 0x4;

/** 安全地帯の半径 */
export const zoneRadius = (t: number, R: number) => {
  if (t <= ZONE_START) return R;
  const p = Math.min(1, (t - ZONE_START) / (ZONE_END - ZONE_START));
  return R + (ZONE_MIN - R) * (p * p * (3 - 2 * p));
};

/**
 * BATTLE（HPバトル）のルール
 * - 真上から見た円形のアリーナ。重力なし・摩擦なしで、ボールは跳ね回り続ける
 * - 全員HP10。敵チームのボールに「速いほうがぶつけた側」としてダメージ1（勢いが1.6倍以上なら2）
 *   同じチームどうしはダメージなし（最後の1チームになったら同士討ちあり）
 * - 中央の回転トゲに当たると2ダメージ。4秒以降は外周が電気柵になり、触れると1ダメージ
 * - 外周（安全地帯）は4秒から18秒にかけて縮む
 * - HP0で脱落。全員が同時に0になる場合は、直前のHPが最も高いボールがHP1で生き残る
 * - 期限までに決着しなければHPが最も高いボールが勝者
 */
export const runBattle = (config: SimulationConfig): SimulationResult => {
  const rng = new SeededRandom(config.seed);
  const r = config.ballRadius;
  const { cx, cy, radius: R } = LAYOUT.arena;

  const course: CourseSpec = {
    spinner: { arms: 4, length: rng.range(105, 125), thickness: 22, angularSpeed: rng.sign() * rng.range(1.0, 1.5), initialAngle: rng.range(0, Math.PI) },
    bumpers: [],
    hubRadius: 42,
    gateAngularSpeed: 0,
    gateInitialAngle: 0,
  };
  const s = course.spinner;

  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0.001 }, positionIterations: 10, velocityIterations: 8 });
  const obstacleOpts = { isStatic: true, restitution: 1, friction: 0, collisionFilter: { category: CAT_OBSTACLE, mask: CAT_BALL, group: 0 } };
  const bars = Array.from({ length: s.arms }, (_, k) => {
    const a = (k / s.arms) * Math.PI * 2;
    const bar = Bodies.rectangle(cx + (Math.cos(a) * s.length) / 2, cy + (Math.sin(a) * s.length) / 2, s.length, s.thickness, { chamfer: { radius: s.thickness / 2 } });
    Body.setAngle(bar, a);
    return bar;
  });
  const spinner = Body.create({ parts: bars, ...obstacleOpts, label: "spike" });
  Body.setPosition(spinner, { x: cx, y: cy });
  Body.setAngle(spinner, s.initialAngle);
  const hub = Bodies.circle(cx, cy, course.hubRadius, { ...obstacleOpts, label: "spike" });

  // 4チームが斜め4方向に分かれて陣取る
  const perTeam = config.ballCount / TEAMS.length;
  const teamOrder = rng.shuffle(TEAMS);
  const teams = Array.from({ length: config.ballCount }, (_, i) => teamOrder[Math.floor(i / perTeam)]);
  const base = rng.range(0, Math.PI / 2);
  const balls = teams.map((_, i) => {
    const ti = Math.floor(i / perTeam);
    const k = i % perTeam;
    const a = base + Math.PI / 4 + (ti * Math.PI) / 2;
    const hx = cx + Math.cos(a) * 270;
    const hy = cy + Math.sin(a) * 270;
    // 1 + 2 + 3 の三角形
    const row = k === 0 ? 0 : k <= 2 ? 1 : 2;
    const col = k === 0 ? 0 : k <= 2 ? k - 1.5 : k - 4;
    const ux = -Math.cos(a);
    const uy = -Math.sin(a);
    const x = hx + ux * (row - 1) * 58 + -uy * col * 60;
    const y = hy + uy * (row - 1) * 58 + ux * col * 60;
    const b = Bodies.circle(x, y, r, {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      inertia: Infinity,
      density: 0.002,
      collisionFilter: { category: CAT_BALL, mask: CAT_BALL | CAT_OBSTACLE, group: 0 },
      label: `ball_${i}`,
    });
    // 中心方向へ突撃（少しばらつかせる）
    const va = a + Math.PI + rng.range(-0.6, 0.6);
    Body.setVelocity(b, { x: Math.cos(va) * 7, y: Math.sin(va) * 7 });
    return b;
  });
  Composite.add(engine.world, [spinner, hub, ...balls]);

  const ballInfo = makeBallInfo(teams, r);
  const alive = balls.map(() => true);
  const hp = balls.map(() => MAX_HP);
  const lastHurt = balls.map(() => -Infinity);
  let aliveCount = balls.length;
  const eliminations: Elimination[] = [];
  const hits: HitEvent[] = [];
  const hpEvents: HpEvent[] = [];
  let winner: WinnerInfo | null = null;
  let simTime = 0;
  let zone: number = R;
  const ballIndexById = new Map<number, number>(balls.map((b, i) => [b.id, i]));
  const spikeIds = new Set<number>([spinner.id, hub.id, ...spinner.parts.map((p) => p.id)]);

  /** このステップのダメージ予定 */
  const pending = new Map<number, { dmg: number; source: HpEvent["source"] }>();
  const hurt = (i: number, dmg: number, source: HpEvent["source"]) => {
    if (!alive[i] || simTime - lastHurt[i] < invulnerable()) return;
    const cur = pending.get(i);
    if (!cur || cur.dmg < dmg) pending.set(i, { dmg, source });
  };

  /** ダメージ後の無敵時間。進行が目標より速いときは長く、遅いときは短くしてテンポを保つ */
  const invulnerable = () => {
    const behind = aliveCount - linearTarget(simTime, config.ballCount, 2, config.targetFinishSeconds);
    return behind > 2 ? 0.25 : behind < -1 ? 2 : 0.5;
  };
  const teamsAlive = () => new Set(teams.filter((_, i) => alive[i]).map((t) => t.id)).size;
  const multiplier = () => {
    const behind = aliveCount - linearTarget(simTime, config.ballCount, 2, config.targetFinishSeconds);
    return behind > 3 ? 2 : 1;
  };

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const ia = ballIndexById.get(pair.bodyA.id);
      const ib = ballIndexById.get(pair.bodyB.id);
      if (ia !== undefined && ib !== undefined) {
        if (!alive[ia] || !alive[ib]) continue;
        const friendly = teams[ia].id === teams[ib].id && teamsAlive() > 1;
        const va = balls[ia].velocity;
        const vb = balls[ib].velocity;
        const sa = Math.hypot(va.x, va.y);
        const sb = Math.hypot(vb.x, vb.y);
        hits.push({ t: simTime, strength: round(Math.hypot(va.x - vb.x, va.y - vb.y), 1), kind: "ball" });
        if (friendly) continue;
        const m = multiplier();
        if (Math.abs(sa - sb) < 0.8) {
          hurt(ia, m, "ball");
          hurt(ib, m, "ball");
        } else if (sa > sb) {
          hurt(ib, (sa > sb * 1.6 ? 2 : 1) * m, "ball");
        } else {
          hurt(ia, (sb > sa * 1.6 ? 2 : 1) * m, "ball");
        }
      } else {
        const bi = ia ?? ib;
        const other = ia !== undefined ? pair.bodyB : pair.bodyA;
        if (bi === undefined || !alive[bi]) continue;
        if (spikeIds.has(other.id) || spikeIds.has(other.parent.id)) {
          hurt(bi, 2, "spike");
          hits.push({ t: simTime, strength: 12, kind: "obstacle" });
        }
      }
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
  const record = () => {
    const pos = new Array<number>(balls.length * 3);
    balls.forEach((b, i) => {
      pos[i * 3] = b.position.x;
      pos[i * 3 + 1] = b.position.y;
      pos[i * 3 + 2] = b.angle;
    });
    steps.push({ t: simTime, pos, alive: aliveCount, gateAngle: 0, gateHalf: 0, spinnerAngle, tilt: 0, zone });
  };

  const dtMs = 1000 / config.physicsHz;
  const dt = 1 / config.physicsHz;
  const totalSteps = Math.round(config.durationSeconds * config.physicsHz);
  record();

  for (let step = 1; step <= totalSteps; step++) {
    simTime = step / config.physicsHz;
    zone = zoneRadius(simTime, R);
    pending.clear();

    spinnerAngle += s.angularSpeed * dt;
    (Body.setAngle as (b: Matter.Body, a: number, updateVelocity?: boolean) => void)(spinner, spinnerAngle, true);

    // 速さを一定に保つ（だんだん速くなる）
    const targetSpeed = 6 + simTime * 0.12;
    for (let i = 0; i < balls.length; i++) {
      if (!alive[i]) continue;
      const v = balls[i].velocity;
      const sp = Math.hypot(v.x, v.y) || 0.01;
      const k = 1 + 0.05 * (targetSpeed / sp - 1);
      Body.setVelocity(balls[i], { x: v.x * k, y: v.y * k });
    }

    Engine.update(engine, dtMs);

    // --- 外周（電気柵） ---
    for (let i = 0; i < balls.length; i++) {
      if (!alive[i]) continue;
      const b = balls[i];
      const dx = b.position.x - cx;
      const dy = b.position.y - cy;
      const d = Math.hypot(dx, dy);
      if (d > zone - r) {
        const nx = dx / d;
        const ny = dy / d;
        Body.setPosition(b, { x: cx + nx * (zone - r), y: cy + ny * (zone - r) });
        const v = b.velocity;
        const vn = v.x * nx + v.y * ny;
        if (vn > 0) Body.setVelocity(b, { x: v.x - 2 * vn * nx, y: v.y - 2 * vn * ny });
        if (simTime >= ZONE_START && !winner) hurt(i, 1, "fence");
      }
      const v = b.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > config.maxSpeed) Body.setVelocity(b, { x: (v.x / sp) * config.maxSpeed, y: (v.y / sp) * config.maxSpeed });
    }

    // --- ダメージ適用・脱落 ---
    if (!winner && pending.size > 0) {
      const before = new Map<number, number>();
      for (const [i, { dmg, source }] of pending) {
        before.set(i, hp[i]);
        hp[i] = Math.max(0, hp[i] - dmg);
        lastHurt[i] = simTime;
        hpEvents.push({ t: round(simTime, 4), ball: i, hp: hp[i], source });
      }
      const dying = [...pending.keys()].filter((i) => hp[i] <= 0);
      if (dying.length > 0 && dying.length >= aliveCount) {
        // 全員同時に0になる場合: 直前のHPが最も高いボールを残す
        const keep = [...dying].sort((a, b) => (before.get(b) ?? 0) - (before.get(a) ?? 0) || a - b)[0];
        hp[keep] = 1;
        hpEvents.push({ t: round(simTime, 4), ball: keep, hp: 1, source: "ball" });
      }
      for (const i of dying.sort((a, b) => a - b)) {
        if (hp[i] > 0) continue;
        eliminate(i, "escaped");
      }
      if (aliveCount === 1) winner = { ballIndex: alive.indexOf(true), decidedAt: round(simTime, 4), decidedBy: "last-standing" };
    }

    // --- タイムアウト ---
    if (!winner && simTime >= config.deadlineSeconds) {
      const order = balls.map((_, i) => i).filter((i) => alive[i]).sort((a, b) => hp[b] - hp[a] || a - b);
      for (const i of [...order].reverse()) if (i !== order[0]) eliminate(i, "timeout");
      winner = { ballIndex: order[0], decidedAt: round(simTime, 4), decidedBy: "timeout" };
    }
    record();
  }

  if (!winner) throw new Error("勝者が決まらないままシミュレーションが終了しました");
  const decided: WinnerInfo = winner;
  const { frames, winnerFrame } = buildTimeline(steps, decided.decidedAt, config);

  return {
    format: "physics-lab/last-ball-standing@1",
    mode: "battle",
    hp: { max: MAX_HP, events: hpEvents, zoneStart: ZONE_START },
    winnerSafe: true,
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
    pulses: [],
    winner: decided,
    winnerFrame,
    frames,
  };
};
