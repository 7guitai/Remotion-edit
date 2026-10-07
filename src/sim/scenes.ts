import * as CANNON from "cannon-es";
import {
  applyBalance,
  createRagdoll,
  Look,
  PartName,
  POSES,
  Ragdoll,
  ragdollParts,
} from "./ragdoll";

// 物理シミュレーションの場面。1フレームごとに全部の物体の位置と向きを記録しておき、
// 描画するときはそのフレームの記録を読むだけにする（どのフレームから描いても同じ結果になる）

export type SimKind = "scale" | "jump" | "slip" | "throw" | "brake" | "party";

export type SimBody = {
  lane: number;
  shape: "part" | "box" | "sphere" | "cone" | "car" | "platform";
  part?: PartName;
  look?: Look;
  doll?: number;
  size: [number, number, number];
  color?: string;
};

export type SimResult = {
  kind: SimKind;
  frames: number;
  fps: number;
  bodies: SimBody[];
  // frames × bodies × 7（x, y, z, qx, qy, qz, qw）
  data: Float32Array;
  // 地面などにぶつかった瞬間（効果音用）
  impacts: { frame: number; v: number }[];
  // 場面ごとの数値（体重計の目盛り・最高点・ストップウォッチなど）。frames 個ずつ
  values: Record<string, Float32Array>;
  // 各レーンの重力（m/s²）
  gravity: number[];
};

export const G = 9.8;
const SUB = 8;

type Lane = {
  world: CANNON.World;
  g: number;
  dolls: Ragdoll[];
  control: (t: number, dt: number) => void;
  record: (frame: number) => void;
};

const groundMaterial = new CANNON.Material("ground");
const bodyMaterial = new CANNON.Material("body");

const makeWorld = (g: number) => {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -g, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 30;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.05;
  world.addContactMaterial(
    new CANNON.ContactMaterial(groundMaterial, bodyMaterial, {
      friction: 0.9,
      restitution: 0.02,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 4,
    }),
  );
  const ground = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: groundMaterial,
  });
  ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);
  return { world, ground };
};

// 箱のいちばん低い角の高さ
const lowestY = (b: CANNON.Body, size: [number, number, number]) => {
  const q = b.quaternion;
  // 回転行列の2行目（ワールドの y 成分）
  const r0 = 2 * (q.x * q.y + q.w * q.z);
  const r1 = 1 - 2 * (q.x * q.x + q.z * q.z);
  const r2 = 2 * (q.y * q.z - q.w * q.x);
  return (
    b.position.y -
    (Math.abs(r0) * size[0] + Math.abs(r1) * size[1] + Math.abs(r2) * size[2]) / 2
  );
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// ジャンプの流れ：立つ → しゃがむ → 跳ぶ → 空中 → 着地でひざを曲げる → 立ち上がる
const jumper = (rd: Ragdoll, start: number, kick: number) => {
  let phase: "stand" | "crouch" | "air" | "land" = "stand";
  let since = 0;
  let launched = false;
  const footY = () =>
    Math.min(rd.bodies.footL.position.y, rd.bodies.footR.position.y);
  return (t: number) => {
    since = t - start;
    if (phase === "stand") {
      rd.setPose(POSES.stand);
      if (t >= start) {
        phase = "crouch";
      }
    } else if (phase === "crouch") {
      rd.setPose(POSES.stand, POSES.crouch, smooth(since / 0.35));
      if (since >= 0.45) {
        phase = "air";
        launched = false;
      }
    } else if (phase === "air") {
      rd.setPose(POSES.air);
      if (!launched) {
        rd.addVelocity([0, kick, 0]);
        launched = true;
      }
      const vy = rd.bodies.pelvis.velocity.y;
      if (vy < 0 && footY() < 0.07 && since > 0.6) {
        phase = "land";
        start = t;
      }
    } else {
      rd.setPose(POSES.land, POSES.stand, smooth((t - start - 0.25) / 0.5));
    }
  };
};

const ragdollBodies = (rd: Ragdoll, lane: number, doll: number): SimBody[] =>
  ragdollParts.map((p) => ({
    lane,
    shape: "part" as const,
    part: p,
    look: rd.looks[p],
    doll,
    size: rd.sizes[p],
  }));

type Build = {
  lanes: Lane[];
  bodies: SimBody[];
  tracked: CANNON.Body[];
  values: Record<string, Float32Array>;
};

const build = (kind: SimKind, frames: number, fps: number): Build => {
  const values: Record<string, Float32Array> = {};
  const bodies: SimBody[] = [];
  const tracked: CANNON.Body[] = [];
  const lanes: Lane[] = [];
  const val = (name: string) => {
    values[name] = values[name] ?? new Float32Array(frames);
    return values[name];
  };
  const addDoll = (
    world: CANNON.World,
    lane: number,
    doll: number,
    origin: [number, number, number],
    yaw = 0,
  ) => {
    const rd = createRagdoll(world, origin, yaw, bodyMaterial);
    bodies.push(...ragdollBodies(rd, lane, doll));
    tracked.push(...ragdollParts.map((p) => rd.bodies[p]));
    return rd;
  };

  if (kind === "jump" || kind === "scale" || kind === "slip") {
    // 左：いまの地球（1G）、右：重力半分（0.5G）
    [G, G / 2].forEach((g, lane) => {
      const { world } = makeWorld(g);
      const x = lane === 0 ? -1.0 : 1.0;
      let control: Lane["control"] = () => {};
      let record: Lane["record"] = () => {};
      if (kind === "jump") {
        const rd = addDoll(world, lane, lane, [x, 0, 0]);
        const step = jumper(rd, 0.5, 3.6);
        const top = val(`top${lane}`);
        let best = 0;
        control = (t) => {
          step(t);
          applyBalance(rd);
        };
        record = (f) => {
          best = Math.max(best, rd.bodies.footL.position.y - 0.04);
          top[f] = best;
        };
        lanes.push({ world, g, dolls: [rd], control, record });
      } else if (kind === "scale") {
        // ばね式の体重計：台がどれだけ沈んだかで重さを読む（地球の重力で目盛りを合わせてある）
        const k = 40000;
        const c = 900;
        const rest = 0.09;
        const plate = new CANNON.Body({
          mass: 2,
          shape: new CANNON.Box(new CANNON.Vec3(0.26, 0.03, 0.26)),
          position: new CANNON.Vec3(x, rest, 0),
          material: groundMaterial,
        });
        plate.linearFactor.set(0, 1, 0);
        plate.angularFactor.set(0, 0, 0);
        world.addBody(plate);
        bodies.push({ lane, shape: "platform", size: [0.52, 0.06, 0.52] });
        tracked.push(plate);
        const rd = addDoll(world, lane, lane, [x, rest + 0.03 + 0.2, 0]);
        // 体重計にのる直前は、体を少し浮かせて持っておく
        const reading = val(`kg${lane}`);
        const natural = rest + (2 * g) / k;
        control = (t) => {
          rd.setPose(POSES.stand);
          applyBalance(rd);
          const springF = k * (natural - plate.position.y) - c * plate.velocity.y;
          plate.force.y += springF;
          if (t < 0.4) {
            // 0.4秒までは宙に支えておく（体重計にのる前）
            for (const b of Object.values(rd.bodies)) {
              b.velocity.y = 0;
              b.force.y += b.mass * g;
            }
          }
        };
        record = (f) => {
          // ばねの力から台の重さを引いたもの÷地球の重力 ＝ 表示される体重
          const F = k * (natural - plate.position.y) - 2 * g;
          reading[f] = Math.max(0, F / G);
        };
        lanes.push({ world, g, dolls: [rd], control, record });
      } else {
        // バナナの皮ですべって転ぶ。横から見るので、人は +x を向く
        const rd = addDoll(world, lane, lane, [lane === 0 ? 0.0 : 3.2, 0, 0], Math.PI / 2);
        const timer = val(`timer${lane}`);
        let slipAt = -1;
        let hitAt = -1;
        const slip = 0.7;
        control = (t) => {
          if (t < slip) {
            rd.setPose(POSES.stand);
            applyBalance(rd);
            return;
          }
          if (slipAt < 0) {
            slipAt = t;
            rd.balance = 0;
            rd.setStrength(0.025);
            rd.setPose(POSES.slip);
            for (const p of ["footL", "footR", "shinL", "shinR"] as PartName[]) {
              rd.bodies[p].velocity.x += 2.4;
              rd.bodies[p].velocity.y += 0.5;
            }
          }
          // 足以外のどこかが地面に着いたら「倒れた」
          const low = Math.min(
            ...(Object.keys(rd.bodies) as PartName[])
              .filter((p) => !/foot|shin/.test(p))
              .map((p) => lowestY(rd.bodies[p], rd.sizes[p])),
          );
          if (hitAt < 0 && low < 0.03) {
            hitAt = t;
          }
        };
        record = (f) => {
          const t = f / fps;
          timer[f] =
            slipAt < 0 ? 0 : hitAt < 0 ? t - slipAt : hitAt - slipAt;
        };
        lanes.push({ world, g, dolls: [rd], control, record });
      }
    });
  } else if (kind === "throw") {
    // 手前が 1G、奥が 0.5G。同じ速さ・同じ角度でボールを投げる
    [G, G / 2].forEach((g, lane) => {
      const { world } = makeWorld(g);
      const z = lane === 0 ? 0.9 : -0.9;
      const rd = addDoll(world, lane, lane, [0, 0, z], Math.PI / 2);
      const ball = new CANNON.Body({
        mass: 0.4,
        shape: new CANNON.Sphere(0.11),
        position: new CANNON.Vec3(0, 1.2, z),
        material: bodyMaterial,
        type: CANNON.Body.KINEMATIC,
        linearDamping: 0.0,
        angularDamping: 0.3,
      });
      // ボールは地面とだけぶつかる（投げる人の手に当たらないように）
      ball.collisionFilterGroup = 2;
      ball.collisionFilterMask = 1;
      world.addBody(ball);
      bodies.push({
        lane,
        shape: "sphere",
        size: [0.22, 0.22, 0.22],
        color: lane === 0 ? "#ff3b3b" : "#2f8bff",
      });
      tracked.push(ball);
      const landX = val(`land${lane}`);
      let released = false;
      let landed = -1;
      const hand = () =>
        rd.bodies.lowerArmR.pointToWorldFrame(new CANNON.Vec3(0, -0.17, 0));
      const control = (t: number) => {
        applyBalance(rd);
        if (t < 0.3) {
          rd.setPose(POSES.stand);
        } else if (t < 0.75) {
          rd.setPose(POSES.stand, POSES.windup, smooth((t - 0.3) / 0.3));
        } else {
          rd.setPose(POSES.throw);
          rd.joints.shoulderR.gain = 30;
        }
        if (!released) {
          const p = hand();
          ball.position.copy(p);
          if (t >= 0.86) {
            released = true;
            ball.type = CANNON.Body.DYNAMIC;
            ball.updateMassProperties();
            ball.velocity.set(5.3, 5.3, 0);
          }
        } else if (landed < 0 && ball.position.y < 0.13 && ball.velocity.y <= 0) {
          landed = ball.position.x;
          // 地面に落ちたら転がりながら止まる
          ball.linearDamping = 0.6;
        }
      };
      const record = (f: number) => {
        landX[f] = landed;
      };
      lanes.push({ world, g, dolls: [rd], control, record });
    });
  } else if (kind === "brake") {
    // 同じ速さ（時速36km）で走る車が、線のところで急ブレーキ
    [G, G / 2].forEach((g, lane) => {
      const { world } = makeWorld(g);
      const z = lane === 0 ? 1.7 : -1.7;
      const carMat = new CANNON.Material("car");
      // タイヤと地面の摩擦は、下の control で力として計算する（線を越えたらタイヤがロックしてこすれる）
      world.addContactMaterial(
        new CANNON.ContactMaterial(groundMaterial, carMat, {
          friction: 0,
          restitution: 0,
        }),
      );
      // コーンは車にはじき飛ばされる
      world.addContactMaterial(
        new CANNON.ContactMaterial(bodyMaterial, carMat, {
          friction: 0.1,
          restitution: 0.5,
        }),
      );
      // 車体は地面から0.25m浮いていて（タイヤの分）、コーンには車体の高さでぶつかる
      const car = new CANNON.Body({
        mass: 1200,
        position: new CANNON.Vec3(-7, 0.7, z),
        material: carMat,
      });
      car.addShape(new CANNON.Box(new CANNON.Vec3(2.0, 0.45, 0.85)));
      car.addShape(
        new CANNON.Box(new CANNON.Vec3(2.0, 0.13, 0.7)),
        new CANNON.Vec3(0, -0.57, 0),
      );
      car.angularFactor.set(0, 0, 0);
      car.velocity.set(10, 0, 0);
      world.addBody(car);
      bodies.push({ lane, shape: "car", size: [4.0, 0.9, 1.7], color: lane === 0 ? "#e8333a" : "#2f7bff" });
      tracked.push(car);
      // コーン（ここより先に行ったらアウト）
      for (let i = 0; i < 3; i++) {
        const cone = new CANNON.Body({
          mass: 0.6,
          shape: new CANNON.Cylinder(0.05, 0.2, 0.6, 12),
          position: new CANNON.Vec3(9.5, 0.3, z - 0.6 + i * 0.6),
          material: bodyMaterial,
        });
        world.addBody(cone);
        bodies.push({ lane, shape: "cone", size: [0.4, 0.6, 0.4] });
        tracked.push(cone);
      }
      const stopX = val(`stop${lane}`);
      let braking = false;
      let stopped = -1;
      const control = () => {
        // 車の前の端が線（x = 0）を越えたらブレーキ
        if (!braking && car.position.x + 2.0 >= 0) {
          braking = true;
        }
        if (braking && stopped < 0) {
          // 動摩擦力 = 摩擦係数 × 車が地面を押す力（重さ × 重力）。重力が半分なら、止める力も半分
          if (car.velocity.x > 0.02) {
            car.force.x -= 0.7 * car.mass * g;
          } else {
            car.velocity.set(0, car.velocity.y, 0);
            car.type = CANNON.Body.STATIC;
            stopped = car.position.x + 2.0;
          }
        }
      };
      const record = (f: number) => {
        stopX[f] = stopped;
      };
      lanes.push({ world, g, dolls: [], control, record });
    });
  } else {
    // 重力半分の世界で、みんなでジャンプ
    const g = G / 2;
    const { world } = makeWorld(g);
    const dolls: Ragdoll[] = [];
    const steps: ((t: number) => void)[] = [];
    const spots: [number, number][] = [
      [-2.4, -1.2],
      [-1.2, 0.3],
      [0, -0.6],
      [1.2, 0.3],
      [2.4, -1.2],
    ];
    spots.forEach(([x, z], i) => {
      const rd = addDoll(world, 0, i, [x, 0, z], (x / 2.4) * -0.4);
      dolls.push(rd);
      let next = 0.2 + i * 0.22;
      let step = jumper(rd, next, 3.4 + (i % 2) * 0.4);
      steps.push((t) => {
        // 着地して落ち着いたら、もう一度跳ぶ
        if (t > next + 2.9) {
          next = t + 0.1;
          step = jumper(rd, next, 3.4 + (i % 2) * 0.4);
        }
        step(t);
        applyBalance(rd);
      });
    });
    lanes.push({
      world,
      g,
      dolls,
      control: (t) => steps.forEach((s) => s(t)),
      record: () => {},
    });
  }
  return { lanes, bodies, tracked, values };
};

const cache = new Map<string, SimResult>();

export const simulate = (kind: SimKind, frames: number, fps: number): SimResult => {
  const key = `${kind}:${frames}:${fps}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const { lanes, bodies, tracked, values } = build(kind, frames, fps);
  const data = new Float32Array(frames * tracked.length * 7);
  const impacts: { frame: number; v: number }[] = [];
  const dt = 1 / (fps * SUB);
  // 地面にぶつかった強さを、フレームごと・レーンごとに集める
  const hits = lanes.map(() => 0);
  const lastHit = lanes.map(() => -100);
  lanes.forEach((lane, li) => {
    lane.world.addEventListener(
      "beginContact",
      (e: { bodyA: CANNON.Body; bodyB: CANNON.Body }) => {
        const v = e.bodyA.velocity.vsub(e.bodyB.velocity).length();
        hits[li] = Math.max(hits[li], v);
      },
    );
  });
  for (let f = 0; f < frames; f++) {
    lanes.forEach((lane, li) => {
      hits[li] = 0;
      for (let s = 0; s < SUB; s++) {
        const t = f / fps + s * dt;
        lane.control(t, dt);
        lane.world.step(dt);
      }
      lane.record(f);
      if (hits[li] > 1.6 && f - lastHit[li] > 5) {
        impacts.push({ frame: f, v: hits[li] });
        lastHit[li] = f;
      }
    });
    tracked.forEach((b, i) => {
      const o = (f * tracked.length + i) * 7;
      data[o] = b.position.x;
      data[o + 1] = b.position.y;
      data[o + 2] = b.position.z;
      data[o + 3] = b.quaternion.x;
      data[o + 4] = b.quaternion.y;
      data[o + 5] = b.quaternion.z;
      data[o + 6] = b.quaternion.w;
    });
  }
  const result: SimResult = {
    kind,
    frames,
    fps,
    bodies,
    data,
    impacts,
    values,
    gravity: lanes.map((l) => l.g),
  };
  cache.set(key, result);
  return result;
};
