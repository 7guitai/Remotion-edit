import Matter from "matter-js";
import { LAYOUT } from "../config/physics";
import { VIDEO } from "../config/video";
import { GENERATOR_VERSION, eventTimes, makeBallInfo, round } from "./common";
import { collideAliveWithWall } from "./collision";
import { buildTimeline, type StepRecord } from "./recorder";
import { SeededRandom } from "./seeded-random";
import { TEAMS, type TeamId } from "./teams";
import type { CourseSpec, GameEvent, HitEvent, SimulationConfig, SimulationResult, WinnerInfo } from "./types";

const { Engine, Bodies, Body, Composite, Events } = Matter;

const CAT_BALL = 0x1;
const CAT_OBSTACLE = 0x4;

/** 速さの差がこれ未満なら「互角」とみなし、人数の多いチームが勝つ */
const TIE_SPEED = 0.8;
/** GIANT: 大きさの倍率・続く秒数 */
const GIANT_SCALE = 2.4;
const GIANT_SECONDS = 5;
/** SPEED UP の速さ倍率 */
const SPEEDUP = 1.4;

/** 先頭チームの占有率の目標: start秒で 1/4、finish秒で 1。序盤はゆっくり、終盤に一気に */
const targetShare = (t: number, start: number, finish: number) => {
  if (t <= start) return 0.25;
  const p = Math.min(1, (t - start) / (finish - start));
  return 0.25 + 0.75 * Math.pow(p, 1.6);
};

/**
 * TAKEOVER（LAST COLOR STANDING）のルール
 * - 真上から見た円形のアリーナ。重力なし・摩擦なしで、ボールは跳ね回り続ける。誰も脱落しない
 * - 違う色のボールがぶつかると、強くぶつけた側（速いほう）が相手を自分の色に変える
 *   速さが互角なら人数の多い色が勝つ（勢いのある色がさらに広がる）
 * - 色を変えられたボールは少しのあいだ無敵（変えられない）。無敵時間の長さで展開のテンポを調整する
 * - 後半のイベント: GIANT（一番少ない色のボール1個が5秒間巨大化し、触れた相手を必ず変える）→ SPEED UP
 * - 全員が1色になったら決着。期限までに決着しなければ一番多い色の勝ち
 * - 勝者（winner.ballIndex）は勝った色の中で最も多く相手を変えたボール（MVP）
 */
export const runTakeover = (config: SimulationConfig): SimulationResult => {
  const rng = new SeededRandom(config.seed);
  const r = config.ballRadius;
  const { cx, cy, radius: R } = LAYOUT.arena;
  const n = config.ballCount;

  // --- コース: 中央の柱と、周りの柱（バンパー） ---
  const bumperCount = rng.int(4, 6);
  const ringR = R * rng.range(0.5, 0.58);
  const offset = rng.range(0, Math.PI * 2);
  const course: CourseSpec = {
    spinner: { arms: 1, length: 0, thickness: 0, angularSpeed: 0, initialAngle: 0 },
    bumpers: Array.from({ length: bumperCount }, (_, i) => {
      const a = offset + (i / bumperCount) * Math.PI * 2;
      return { x: cx + Math.cos(a) * ringR, y: cy + Math.sin(a) * ringR, radius: 30 };
    }),
    hubRadius: 54,
    gateAngularSpeed: 0,
    gateInitialAngle: 0,
  };

  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0.001 }, positionIterations: 10, velocityIterations: 8 });
  const obstacleOpts = { isStatic: true, restitution: 1, friction: 0, collisionFilter: { category: CAT_OBSTACLE, mask: CAT_BALL, group: 0 } };
  const obstacles = [Bodies.circle(cx, cy, course.hubRadius, obstacleOpts), ...course.bumpers.map((b) => Bodies.circle(b.x, b.y, b.radius, obstacleOpts))];

  // 4色が四方に分かれて陣取る（各色15個を扇形の範囲に配置）
  const perTeam = n / TEAMS.length;
  const teamOrder = rng.shuffle(TEAMS);
  const base = rng.range(0, Math.PI * 2);
  const spacing = r * 2 + 12;
  const slotsFor = (ti: number) => {
    const a0 = base + (ti * Math.PI) / 2;
    const out: { x: number; y: number }[] = [];
    for (let row = 0; out.length < perTeam * 3 && row < 40; row++) {
      const y = cy - R + r + 8 + row * spacing * 0.866;
      for (let x = cx - R + (row % 2 ? spacing / 2 : 0); x <= cx + R; x += spacing) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > R - r - 10 || d < course.hubRadius + r + 14) continue;
        if (course.bumpers.some((b) => Math.hypot(x - b.x, y - b.y) < b.radius + r + 8)) continue;
        let rel = (Math.atan2(y - cy, x - cx) - a0) % (Math.PI * 2);
        if (rel < 0) rel += Math.PI * 2;
        if (rel > 0.12 && rel < Math.PI / 2 - 0.12) out.push({ x, y });
      }
    }
    return rng.shuffle(out).slice(0, perTeam);
  };
  const teamOf: TeamId[] = [];
  const positions: { x: number; y: number }[] = [];
  teamOrder.forEach((t, ti) => {
    const slots = slotsFor(ti);
    if (slots.length < perTeam) throw new Error("初期配置の場所が足りません");
    for (const s of slots) {
      teamOf.push(t.id);
      positions.push(s);
    }
  });
  const balls = positions.map((p, i) => {
    const b = Bodies.circle(p.x, p.y, r, {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      inertia: Infinity,
      density: 0.002,
      collisionFilter: { category: CAT_BALL, mask: CAT_BALL | CAT_OBSTACLE, group: 0 },
      label: `ball_${i}`,
    });
    const a = rng.range(0, Math.PI * 2);
    Body.setVelocity(b, { x: Math.cos(a) * 6, y: Math.sin(a) * 6 });
    return b;
  });
  Composite.add(engine.world, [...obstacles, ...balls]);

  const ballInfo = makeBallInfo(teamOf.map((id) => TEAMS.find((t) => t.id === id)!), r);
  const team = [...teamOf];
  const lastConverted = balls.map(() => -Infinity);
  const takeovers = balls.map(() => 0);
  const conversions: { t: number; ball: number; team: TeamId; by: number }[] = [];
  const hits: HitEvent[] = [];
  const pulses: number[] = [];
  const events: GameEvent[] = [];
  const evTimes = eventTimes(config.targetFinishSeconds);
  let giant: { ball: number; start: number; end: number; scale: number } | null = null;
  let giantScale = 1;
  let winner: WinnerInfo | null = null;
  let simTime = 0;
  const ballIndexById = new Map<number, number>(balls.map((b, i) => [b.id, i]));

  const counts = () => {
    const c = Object.fromEntries(TEAMS.map((t) => [t.id, 0])) as Record<TeamId, number>;
    for (const t of team) c[t]++;
    return c;
  };
  const teamsLeft = () => Object.values(counts()).filter((v) => v > 0).length;
  /** 色を変えられたあとの無敵時間。進行が目標より速いときは長く、遅いときは短く */
  const immunity = () => {
    const c = counts();
    const share = Math.max(...Object.values(c)) / n;
    const behind = targetShare(simTime, 2, config.targetFinishSeconds) - share;
    return behind > 0.08 ? 0.3 : behind > 0 ? 0.8 : behind > -0.08 ? 1.6 : 3;
  };
  /** 勢いの強さ（px/step 相当）。進行が遅れているほど大きい */
  const momentum = () => {
    const c = counts();
    const share = Math.max(...Object.values(c)) / n;
    const behind = targetShare(simTime, 2, config.targetFinishSeconds) - share;
    return Math.max(-8, Math.min(6, 1 + behind * 25));
  };
  const isGiantActive = (i: number) => giant !== null && giant.ball === i && simTime < giant.end;

  /** このステップで決まった色の変更（同じボールが2回変わらないように） */
  const pending = new Map<number, { team: TeamId; by: number }>();
  Events.on(engine, "collisionStart", (event) => {
    if (winner) return;
    for (const pair of event.pairs) {
      const ia = ballIndexById.get(pair.bodyA.id);
      const ib = ballIndexById.get(pair.bodyB.id);
      if (ia === undefined || ib === undefined) continue;
      if (team[ia] === team[ib] || pending.has(ia) || pending.has(ib)) continue;
      const va = balls[ia].velocity;
      const vb = balls[ib].velocity;
      const sa = Math.hypot(va.x, va.y);
      const sb = Math.hypot(vb.x, vb.y);
      hits.push({ t: simTime, strength: round(Math.hypot(va.x - vb.x, va.y - vb.y), 1), kind: "ball" });
      // 強さ = 速さ + 勢い（人数が多い色ほど有利）。進行が目標より遅いほど勢いの効きを強くする
      const c = counts();
      const m = momentum();
      const pa = sa + m * (c[team[ia]] / n) * 4;
      const pb = sb + m * (c[team[ib]] / n) * 4;
      let attacker: number;
      if (isGiantActive(ia)) attacker = ia;
      else if (isGiantActive(ib)) attacker = ib;
      else if (Math.abs(pa - pb) >= TIE_SPEED) attacker = pa > pb ? ia : ib;
      else attacker = c[team[ia]] === c[team[ib]] ? (ia < ib ? ia : ib) : c[team[ia]] > c[team[ib]] ? ia : ib;
      const victim = attacker === ia ? ib : ia;
      if (isGiantActive(victim)) continue;
      if (simTime - lastConverted[victim] < immunity()) continue;
      pending.set(victim, { team: team[attacker], by: attacker });
    }
  });

  const steps: StepRecord[] = [];
  const record = () => {
    const pos = new Array<number>(balls.length * 3);
    balls.forEach((b, i) => {
      pos[i * 3] = b.position.x;
      pos[i * 3 + 1] = b.position.y;
      pos[i * 3 + 2] = b.angle;
    });
    steps.push({ t: simTime, pos, alive: teamsLeft(), gateAngle: 0, gateHalf: 0, spinnerAngle: 0, tilt: 0 });
  };

  const dtMs = 1000 / config.physicsHz;
  const dt = 1 / config.physicsHz;
  const totalSteps = Math.round(config.durationSeconds * config.physicsHz);
  record();

  for (let step = 1; step <= totalSteps; step++) {
    simTime = step / config.physicsHz;
    pending.clear();

    // --- 後半のイベント: GIANT（一番少ない色のボールが巨大化）→ SPEED UP ---
    if (!winner && events.length < 2 && simTime >= evTimes[events.length]) {
      if (events.length === 0) {
        const c = counts();
        const weakest = TEAMS.map((t) => t.id)
          .filter((id) => c[id] > 0)
          .sort((a, b) => c[a] - c[b] || a.localeCompare(b))[0];
        const candidates = balls.map((_, i) => i).filter((i) => team[i] === weakest);
        const pick = candidates[Math.floor(rng.next() * candidates.length)];
        giant = { ball: pick, start: round(simTime, 4), end: round(simTime + GIANT_SECONDS, 4), scale: GIANT_SCALE };
        events.push({ t: round(simTime, 4), label: "GIANT" });
      } else {
        events.push({ t: round(simTime, 4), label: "SPEED UP" });
      }
      pulses.push(round(simTime, 4));
    }

    // 巨大化（0.4秒で大きくなり、終わりに0.4秒で戻る）
    if (giant) {
      const g: { ball: number; start: number; end: number; scale: number } = giant;
      const grow = Math.min(1, (simTime - g.start) / 0.4);
      const shrink = Math.min(1, Math.max(0, (simTime - g.end) / 0.4));
      const want = 1 + (g.scale - 1) * grow * (1 - shrink);
      if (Math.abs(want - giantScale) > 1e-6) {
        Body.scale(balls[g.ball], want / giantScale, want / giantScale);
        Body.setInertia(balls[g.ball], Infinity);
        giantScale = want;
      }
    }

    // 速さを一定に保つ（だんだん速く、SPEED UP でさらに速く）
    const targetSpeed = (5.5 + simTime * 0.1) * (events.length >= 2 ? SPEEDUP : 1);
    for (const b of balls) {
      const v = b.velocity;
      const sp = Math.hypot(v.x, v.y) || 0.01;
      const k = 1 + 0.05 * (targetSpeed / sp - 1);
      Body.setVelocity(b, { x: v.x * k, y: v.y * k });
    }

    Engine.update(engine, dtMs);

    for (let i = 0; i < balls.length; i++) {
      const rr = giant && giant.ball === i ? r * giantScale : r;
      collideAliveWithWall(balls[i], rr, { angle: 0, halfWidth: 0 }, true);
      const v = balls[i].velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > config.maxSpeed) Body.setVelocity(balls[i], { x: (v.x / sp) * config.maxSpeed, y: (v.y / sp) * config.maxSpeed });
    }

    // --- 色の変更を適用 ---
    if (!winner && pending.size > 0) {
      const before = teamsLeft();
      for (const [i, { team: t, by }] of [...pending.entries()].sort((a, b) => a[0] - b[0])) {
        team[i] = t;
        lastConverted[i] = simTime;
        takeovers[by]++;
        conversions.push({ t: round(simTime, 4), ball: i, team: t, by });
        hits.push({ t: simTime, strength: 10, kind: "ball" });
      }
      if (teamsLeft() < before) pulses.push(round(simTime, 4));
      if (teamsLeft() === 1) winner = mvpWinner("last-standing");
    }

    // --- タイムアウト: 一番多い色の勝ち。残りは一斉にその色になる ---
    if (!winner && simTime >= config.deadlineSeconds) {
      const c = counts();
      const top = TEAMS.map((t) => t.id).sort((a, b) => c[b] - c[a] || a.localeCompare(b))[0];
      for (let i = 0; i < n; i++) {
        if (team[i] === top) continue;
        team[i] = top;
        conversions.push({ t: round(simTime, 4), ball: i, team: top, by: -1 });
      }
      winner = mvpWinner("timeout");
    }
    record();
  }

  function mvpWinner(decidedBy: WinnerInfo["decidedBy"]): WinnerInfo {
    // 決着時は全員が同じ色
    const champion = team[0];
    const members = balls.map((_, i) => i).filter((i) => team[i] === champion);
    const mvp = members.sort((a, b) => takeovers[b] - takeovers[a] || a - b)[0];
    return { ballIndex: mvp, decidedAt: round(simTime, 4), decidedBy };
  }

  if (!winner) throw new Error("勝者が決まらないままシミュレーションが終了しました");
  const decided: WinnerInfo = winner;
  const { frames, winnerFrame } = buildTimeline(steps, decided.decidedAt, config);

  return {
    format: "physics-lab/last-ball-standing@1",
    mode: "takeover",
    events,
    takeover: { conversions, giant, mvpTakeovers: takeovers[decided.ballIndex] },
    winnerSafe: true,
    generator: { version: GENERATOR_VERSION, createdAt: new Date().toISOString() },
    config,
    course,
    layout: { arena: { ...LAYOUT.arena }, dropZone: { ...LAYOUT.dropZone } },
    fps: VIDEO.fps,
    durationFrames: frames.length,
    introFrames: VIDEO.fps * VIDEO.introSeconds,
    balls: ballInfo,
    eliminations: [],
    hits,
    pulses,
    winner: decided,
    winnerFrame,
    frames,
  };
};
