import Matter from "matter-js";
import { LAYOUT } from "../config/physics";
import { VIDEO } from "../config/video";
import { CAT, DEAD_FILTER, buildCourse, createWorld } from "./engine";
import { clampSpeed, collideAliveWithWall, collideDeadWithWall, wrapAngle } from "./collision";
import { buildTimeline, type StepRecord } from "./recorder";
import { SeededRandom } from "./seeded-random";
import { BEAT_SECONDS, GENERATOR_VERSION, ballTeams, eventTimes, paceTarget, round } from "./common";
import { runBattle } from "./simulation-battle";
import { runCollapse } from "./simulation-collapse";
import type { GameEvent, BallInfo, Elimination, HitEvent, SimulationConfig, SimulationResult, WinnerInfo } from "./types";

const { Engine, Body, Events } = Matter;


/** ゲートが開き始めるシミュレーション秒 */
const GATE_OPEN_AT = 1.0;
/** ゲート幅の変化速度の上限（rad/s） */
const GATE_RATE = (160 * Math.PI) / 180;
const GATE_MAX_HALF = (85 * Math.PI) / 180;
const DEG = Math.PI / 180;
/** 衝撃波パルスを始める時刻 */
const PULSE_START = 4;
/** 何拍ごとにパルスを出すか（残数で変える） */
const PULSE_EVERY = (alive: number) => (alive > 12 ? 2 : 1);
/** パルスの強さ（px/step） */
const PULSE_POWER = [4, 7] as const;
/** この残数以下を終盤とし、重力を左右に傾ける */
const FINAL_STAGE = 10;
/** 傾き: 重力の向きを左右に振る（通常時・終盤の最大角, 周期秒） */
const TILT_MAX = (70 * Math.PI) / 180;
const TILT_BASE = (40 * Math.PI) / 180;
const TILT_PERIOD = 2.4;

/** 残数の目標カーブ: 開始時 ballCount → targetFinishSeconds で 1 */
export const targetAlive = (t: number, config: SimulationConfig): number =>
  paceTarget(t, config.ballCount, GATE_OPEN_AT, config.targetFinishSeconds);

/**
 * Last Ball Standing のルール
 * - アリーナ外周には回転する出口（ゲート）が1つある。ゲートから外に出たボールは脱落
 * - 脱落ボールは外周の外側を転がってドロップゾーンに溜まる（画面からは消えない）
 * - 1ステップで脱落確定するのは最大1個。よって「全員同時脱落」は起こらない
 * - 残り1個になった瞬間に勝者確定。ゲートは閉じ、勝者は壁の内側に保護される
 * - deadlineSeconds までに決着しなければタイムアウト: アリーナ中心に最も近いボールが勝者、残りはその場で停止して脱落扱い
 * - ゲート幅は「残数の目標カーブ」との差で自動調整し、展開のテンポを保つ
 */
export const runGate = (config: SimulationConfig): SimulationResult => {
  const rng = new SeededRandom(config.seed);
  const course = buildCourse(rng);
  const teams = ballTeams(config.ballCount, rng);
  const world = createWorld(config, course, rng);
  const { engine, balls, spinner } = world;
  const r = config.ballRadius;
  const { cx, cy, radius: R, wallThickness: wallT } = LAYOUT.arena;

  const ballInfo: BallInfo[] = balls.map((_, i) => ({
    id: `ball_${String(i + 1).padStart(3, "0")}`,
    number: i + 1,
    team: teams[i].id,
    color: teams[i].color,
    radius: r,
  }));

  const ballIndexById = new Map<number, number>(balls.map((b, i) => [b.id, i]));
  const alive = balls.map(() => true);
  let aliveCount = balls.length;
  const eliminations: Elimination[] = [];
  const hits: HitEvent[] = [];
  const pulses: number[] = [];
  // パルス用の乱数はコース生成とは別系列にする（パルス仕様を変えてもコースが変わらないように）
  const pulseRng = new SeededRandom(config.seed ^ 0x9e3779b9);
  let winner: WinnerInfo | null = null;

  const dtMs = 1000 / config.physicsHz;
  const totalSteps = Math.round(config.durationSeconds * config.physicsHz);
  let gateAngle = course.gateInitialAngle;
  // 球の直径より少し狭いすき間（このときは誰も通れない）
  const minGateHalf = (r - 1) / R;
  let gateHalf = minGateHalf;
  let spinnerBoost = 1;
  let tiltAmp = 0;
  let tiltPhase = 0;
  let tilt = 0;
  let spinnerAngle = course.spinner.initialAngle;
  let simTime = 0;
  const events: GameEvent[] = [];
  const evTimes = eventTimes(config.targetFinishSeconds);

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
    steps.push({ t: simTime, pos, alive: aliveCount, gateAngle, gateHalf, spinnerAngle, tilt, double: events.length >= 1 && !winner });
  };

  record();
  for (let step = 1; step <= totalSteps; step++) {
    simTime = step / config.physicsHz;
    const dt = 1 / config.physicsHz;

    // --- 後半のイベント: DOUBLE EXIT（反対側にも出口）→ SPEED UP（出口と回転バーが2倍速） ---
    if (!winner && events.length < 2 && simTime >= evTimes[events.length]) {
      events.push({ t: round(simTime, 4), label: events.length === 0 ? "DOUBLE EXIT" : "SPEED UP" });
    }
    const double = events.length >= 1 && !winner;
    const speedUp = events.length >= 2 ? 2 : 1;

    // --- ゲート制御 ---
    gateAngle = wrapAngle(gateAngle + course.gateAngularSpeed * dt * (1 + simTime / 30) * speedUp);
    // 出口は閉じない。進行が速すぎるときは「球より狭いすき間」まで絞る（出口は常に見えている）
    let desiredHalf = minGateHalf;
    if (!winner && simTime >= GATE_OPEN_AT) {
      const diff = aliveCount - targetAlive(simTime, config);
      // 目標時刻が近づいても残っている場合は、時間とともに出口を大きく開く
      const overdue = Math.max(0, simTime - (config.targetFinishSeconds - 3));
      const base = 12 * DEG + (simTime / config.targetFinishSeconds) * 6 * DEG + overdue * 15 * DEG;
      const gain = 3 * DEG;
      desiredHalf = diff < -1 ? minGateHalf : Math.max(minGateHalf, Math.min(GATE_MAX_HALF, base + diff * gain));
    }
    gateHalf += Math.max(-GATE_RATE * dt, Math.min(GATE_RATE * dt, desiredHalf - gateHalf));

    // --- 回転バー（速度を使って衝突に回転の勢いを伝える）。残りが少なくなるほど速く回して終盤を盛り上げる ---
    const boostTarget = 1 + 0.8 * Math.min(1, Math.max(0, (8 - aliveCount) / 6));
    spinnerBoost += Math.max(-dt, Math.min(dt, boostTarget - spinnerBoost));
    spinnerAngle += course.spinner.angularSpeed * spinnerBoost * speedUp * dt;
    (Body.setAngle as (b: Matter.Body, a: number, updateVelocity?: boolean) => void)(spinner, spinnerAngle, true);

    // --- 衝撃波パルス: BGMの拍（0.5秒）に合わせて中心から衝撃波が出て、生存ボールを外周へはじき飛ばす。
    //     底に溜まって動かない状態を崩し、外周の出口に向かわせる。残りが少ないほど頻繁 ---
    const beat = Math.round(simTime / BEAT_SECONDS);
    if (!winner && simTime >= PULSE_START && Math.abs(simTime - beat * BEAT_SECONDS) < dt / 2) {
      const every = PULSE_EVERY(aliveCount);
      if (beat % every === 0) {
        for (let i = 0; i < balls.length; i++) {
          if (!alive[i]) continue;
          const b = balls[i];
          const dx = b.position.x - cx;
          const dy = b.position.y - cy;
          const d = Math.hypot(dx, dy) || 1;
          // 外向き＋少し上向き（壁際のボールは壁で跳ね返って宙に舞う）
          const k = pulseRng.range(PULSE_POWER[0], PULSE_POWER[1]);
          const a = Math.atan2(dy, dx) + pulseRng.range(-0.5, 0.5);
          Body.setVelocity(b, { x: b.velocity.x + Math.cos(a) * k, y: b.velocity.y + Math.sin(a) * k - 4 });
        }
        pulses.push(round(simTime, 4));
      }
    }

    // --- 傾き: 生存ボールだけに重力の横成分を足して、壁沿いに左右へ転がす（アリーナが揺れる）。終盤ほど大きく ---
    const tiltTarget = winner || simTime < GATE_OPEN_AT ? 0 : aliveCount <= FINAL_STAGE ? TILT_MAX : TILT_BASE;
    tiltAmp += Math.max(-dt, Math.min(dt, tiltTarget - tiltAmp));
    if (tiltAmp > 0) tiltPhase += ((Math.PI * 2) / TILT_PERIOD) * dt;
    tilt = tiltAmp * Math.sin(tiltPhase);
    if (tilt !== 0) {
      const g = config.gravity * 0.001 * dtMs * dtMs;
      for (let i = 0; i < balls.length; i++) {
        if (!alive[i]) continue;
        const v = balls[i].velocity;
        Body.setVelocity(balls[i], { x: v.x + g * Math.sin(tilt), y: v.y - g * (1 - Math.cos(tilt)) });
      }
    }

    Engine.update(engine, dtMs);

    // --- 外周壁・脱落判定 ---
    const gate = [{ angle: gateAngle, halfWidth: gateHalf }, ...(double ? [{ angle: wrapAngle(gateAngle + Math.PI), halfWidth: gateHalf }] : [])];
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

  // 勝者が決着後もアリーナ内（壁の内側）にいるか
  const wi = decided.ballIndex;
  const winnerSafe = steps
    .filter((st) => st.t >= decided.decidedAt)
    .every((st) => Math.hypot(st.pos[wi * 3] - cx, st.pos[wi * 3 + 1] - cy) <= R);

  return {
    format: "physics-lab/last-ball-standing@1",
    mode: "gate",
    events,
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

/** モードに応じたシミュレーションを実行する */
export const runSimulation = (config: SimulationConfig): SimulationResult => {
  switch (config.mode) {
    case "collapse":
      return runCollapse(config);
    case "battle":
      return runBattle(config);
    default:
      return runGate(config);
  }
};
