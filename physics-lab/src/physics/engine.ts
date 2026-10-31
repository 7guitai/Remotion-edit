import Matter from "matter-js";
import { LAYOUT } from "../config/physics";
import type { CourseSpec, SimulationConfig } from "./types";
import type { SeededRandom } from "./seeded-random";

const { Engine, Bodies, Body, Composite, Common } = Matter;

/** 衝突カテゴリ */
export const CAT = {
  alive: 0x0001,
  dead: 0x0002,
  obstacle: 0x0004,
  tray: 0x0008,
} as const;

export const ALIVE_FILTER = { category: CAT.alive, mask: CAT.alive | CAT.obstacle, group: 0 };
export const DEAD_FILTER = { category: CAT.dead, mask: CAT.dead | CAT.tray, group: 0 };

export type World = {
  engine: Matter.Engine;
  balls: Matter.Body[];
  spinner: Matter.Body;
  obstacles: Matter.Body[];
};

/** seedからコース構造（回転バー・バンパー・ゲート）を決める */
export const buildCourse = (rng: SeededRandom): CourseSpec => {
  const R = LAYOUT.arena.radius;
  const arms = rng.pick([1, 2, 3] as const);
  const spinner = {
    arms,
    length: R * rng.range(0.52, 0.6),
    thickness: 22,
    angularSpeed: rng.sign() * rng.range(1.2, 1.9),
    // 初期配置のボール（アリーナ上部）と重ならない向きから回し始める
    initialAngle: arms === 1 ? 0 : arms === 2 ? Math.PI / 4 : Math.PI / 2,
  };

  // バンパーは回転バーの外側の円周上に並べる（個数・半径をseedで変える）。
  // 真上は初期配置のボールがいるので、真上を挟む位置から並べる
  const bumperCount = rng.int(3, 5);
  const ringR = R * rng.range(0.71, 0.75);
  const offset = -Math.PI / 2 + Math.PI / bumperCount;
  const bumperRadius = Math.round(rng.range(24, 32));
  const bumpers = Array.from({ length: bumperCount }, (_, i) => {
    const a = offset + (i / bumperCount) * Math.PI * 2;
    return {
      x: LAYOUT.arena.cx + Math.cos(a) * ringR,
      y: LAYOUT.arena.cy + Math.sin(a) * ringR,
      radius: bumperRadius,
    };
  });

  return {
    spinner,
    bumpers,
    hubRadius: Math.round(rng.range(40, 56)),
    gateAngularSpeed: rng.sign() * rng.range(1.6, 2.2),
    gateInitialAngle: rng.range(0, Math.PI * 2),
  };
};

/** 初期配置の候補（上から順）。回転バーの初期角度・ハブ・バンパー・壁から離れた点だけ */
const spawnSlots = (config: SimulationConfig, course: CourseSpec): { x: number; y: number }[] => {
  const { cx, cy, radius: R } = LAYOUT.arena;
  const r = config.ballRadius;
  const spacing = r * 2 + 8;
  const rowH = spacing * 0.866;
  const s = course.spinner;
  const armDirs = Array.from({ length: s.arms }, (_, k) => s.initialAngle + (k / s.arms) * Math.PI * 2);
  const clear = (x: number, y: number) => {
    const dx = x - cx;
    const dy = y - cy;
    if (Math.hypot(dx, dy) > R - r - 8) return false;
    if (Math.hypot(dx, dy) < course.hubRadius + r + 10) return false;
    for (const b of course.bumpers) if (Math.hypot(x - b.x, y - b.y) < b.radius + r + 8) return false;
    for (const a of armDirs) {
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const along = Math.max(0, Math.min(s.length, dx * ux + dy * uy));
      if (Math.hypot(dx - ux * along, dy - uy * along) < s.thickness / 2 + r + 10) return false;
    }
    return true;
  };
  const out: { x: number; y: number }[] = [];
  for (let row = 0; cy - R + row * rowH < cy + R; row++) {
    const y = cy - R + r + 12 + row * rowH;
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let x = cx - R + offset; x <= cx + R; x += spacing) if (clear(x, y)) out.push({ x, y });
  }
  return out;
};

export const createWorld = (config: SimulationConfig, course: CourseSpec, rng: SeededRandom): World => {
  // Matter内部の乱数もseedで固定しておく
  (Common as unknown as { _seed: number })._seed = config.seed;

  const engine = Engine.create({
    gravity: { x: 0, y: config.gravity, scale: 0.001 },
    positionIterations: 10,
    velocityIterations: 8,
    enableSleeping: false,
  });

  const { cx, cy, radius: R } = LAYOUT.arena;
  const obstacleOpts = {
    isStatic: true,
    restitution: 0.9,
    friction: 0.0,
    collisionFilter: { category: CAT.obstacle, mask: CAT.alive, group: 0 },
  };

  // 回転スイーパー（中心から放射状に伸びる腕）
  const { spinner: s } = course;
  const bars = Array.from({ length: s.arms }, (_, k) => {
    const a = (k / s.arms) * Math.PI * 2;
    const bar = Bodies.rectangle(cx + (Math.cos(a) * s.length) / 2, cy + (Math.sin(a) * s.length) / 2, s.length, s.thickness, {
      chamfer: { radius: s.thickness / 2 },
    });
    Body.setAngle(bar, a);
    return bar;
  });
  const spinner = Body.create({ parts: bars, ...obstacleOpts, label: "spinner" });
  Body.setPosition(spinner, { x: cx, y: cy });
  Body.setAngle(spinner, s.initialAngle);

  const hub = Bodies.circle(cx, cy, course.hubRadius, { ...obstacleOpts, restitution: 1.0, label: "hub" });
  const bumpers = course.bumpers.map((b) =>
    Bodies.circle(b.x, b.y, b.radius, { ...obstacleOpts, restitution: 1.05, label: "bumper" }),
  );

  // ドロップゾーン（脱落ボールだけが当たる床・壁・天井）
  const dz = LAYOUT.dropZone;
  const trayOpts = {
    isStatic: true,
    friction: 0.2,
    restitution: 0.3,
    collisionFilter: { category: CAT.tray, mask: CAT.dead, group: 0 },
    label: "tray",
  };
  const T = 200;
  const tray = [
    Bodies.rectangle(540, dz.floor + T / 2, 1400, T, trayOpts),
    Bodies.rectangle(dz.left - T / 2, 960, T, 2400, trayOpts),
    Bodies.rectangle(dz.right + T / 2, 960, T, 2400, trayOpts),
    Bodies.rectangle(540, LAYOUT.ceiling - T / 2, 1400, T, trayOpts),
  ];

  // ボールはアリーナ上部から六角格子で詰めて配置（障害物・壁と重なる位置は使わない）
  const r = config.ballRadius;
  const slots = spawnSlots(config, course).slice(0, config.ballCount);
  if (slots.length < config.ballCount) throw new Error(`初期配置の場所が足りません (${slots.length}/${config.ballCount})`);
  const order = rng.shuffle(Array.from({ length: config.ballCount }, (_, i) => i));
  const balls: Matter.Body[] = [];
  for (let i = 0; i < config.ballCount; i++) {
    const slot = slots[order[i]];
    const x = slot.x + rng.range(-2, 2);
    const y = slot.y + rng.range(-2, 2);
    const ball = Bodies.circle(x, y, r, {
      restitution: config.restitution,
      friction: config.friction,
      frictionAir: config.airFriction,
      frictionStatic: 0.05,
      density: 0.002,
      collisionFilter: { ...ALIVE_FILTER },
      label: `ball_${i}`,
    });
    Body.setVelocity(ball, { x: rng.range(-3, 3), y: rng.range(-2, 1) });
    balls.push(ball);
  }

  Composite.add(engine.world, [spinner, hub, ...bumpers, ...tray, ...balls]);
  return { engine, balls, spinner, obstacles: [spinner, hub, ...bumpers] };
};
