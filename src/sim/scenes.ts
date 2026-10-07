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

export type SimKind =
  | "scale"
  | "jump"
  | "slip"
  | "throw"
  | "brake"
  | "party"
  // 摩擦の比較（右・奥のレーンは FRICTION_OFF 秒で摩擦がゼロになる）
  | "fstand"
  | "fpush"
  | "fbrake"
  | "ladder"
  | "fchaos";

export const FRICTION_KINDS: SimKind[] = ["fstand", "fpush", "fbrake", "ladder", "fchaos"];
// この時刻（秒）で、右（奥）の世界の摩擦が消える
export const FRICTION_OFF = 0.6;

export type SimBody = {
  lane: number;
  shape: "part" | "box" | "sphere" | "cone" | "car" | "platform" | "ladder" | "wall";
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
  impacts: Impact[];
  // 場面ごとの数値（体重計の目盛り・最高点・ストップウォッチなど）。frames 個ずつ
  values: Record<string, Float32Array>;
  // 各レーンの重力（m/s²）
  gravity: number[];
  // 各レーンの名前（画面のラベル）
  labels: string[];
};

// ぶつかった物の種類で効果音を変える（body=人、ball=ボール、cone=コーン）
export type HitSound = "body" | "ball" | "cone";
export type Impact = { frame: number; v: number; sound: HitSound; lane: number };

// 物体ごとの音の種類（車はコーンに当たったときだけ鳴らすので cone 扱い）
const soundOf = new WeakMap<CANNON.Body, HitSound | "car">();

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

// 摩擦の比較用の世界。lane 1 は FRICTION_OFF 秒で、すべての摩擦（地面・物どうし）がゼロになる
const frictionWorld = (lane: number) => {
  const { world } = makeWorld(G);
  let off = false;
  return {
    world,
    isOff: () => off,
    update: (t: number) => {
      if (lane === 1 && !off && t >= FRICTION_OFF) {
        off = true;
        world.defaultContactMaterial.friction = 0;
        for (const m of world.contactmaterials) {
          m.friction = 0;
        }
      }
    },
  };
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

// 一歩ふみ出そうとする。摩擦がないと、足が前後にすべって開き、転んでしまう
const stepper = (rd: Ragdoll, start: number) => {
  let fall = -1;
  return (t: number) => {
    applyBalance(rd);
    if (t < start) {
      rd.setPose(POSES.stand);
      return;
    }
    // ふみ出したあとは股関節と足首の力を抜く（ひざはまっすぐ）。どちらの世界でも同じ
    rd.setStrength(t < start + 0.6 ? 1 : 0.05, ["hipL", "hipR"]);
    if (fall < 0 && rd.bodies.pelvis.position.y < 0.72) {
      // 体が沈み始めたら、あわてて手をばたつかせる
      fall = t;
      rd.balance = 0.2;
      rd.setStrength(0.05, ["hipL", "hipR", "kneeL", "kneeR", "waist"]);
    }
    if (fall >= 0) {
      rd.setPose(POSES.step, POSES.slip, smooth((t - fall) / 0.25));
    } else {
      // ひざを上げて足を前へ運び（0.3秒）、前に下ろす（0.3秒）
      if (t < start + 0.3) {
        rd.setPose(POSES.stand, POSES.swing, smooth((t - start) / 0.3));
      } else {
        rd.setPose(POSES.swing, POSES.step, smooth((t - start - 0.3) / 0.3));
      }
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
    ragdollParts.forEach((p) => soundOf.set(rd.bodies[p], "body"));
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
      soundOf.set(ball, "ball");
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
  } else if (kind === "brake" || kind === "fbrake") {
    // 同じ速さ（時速36km）で走る車が、線のところで急ブレーキ
    [0, 1].forEach((lane) => {
      const g = kind === "brake" && lane === 1 ? G / 2 : G;
      const fw = frictionWorld(kind === "fbrake" ? lane : 0);
      const world = kind === "brake" ? makeWorld(g).world : fw.world;
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
      soundOf.set(car, "car");
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
        soundOf.set(cone, "cone");
      }
      const stopX = val(`stop${lane}`);
      let braking = false;
      let stopped = -1;
      const control = (t: number) => {
        fw.update(t);
        // 車の前の端が線（x = 0）を越えたらブレーキ
        if (!braking && car.position.x + 2.0 >= 0) {
          braking = true;
        }
        // 動摩擦力 = 摩擦係数 × 車が地面を押す力（重さ × 重力）。重力が半分なら半分、摩擦ゼロなら0
        const mu = fw.isOff() ? 0 : 0.7;
        if (braking && stopped < 0) {
          if (car.velocity.x > 0.02) {
            car.force.x -= mu * car.mass * g;
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
  } else if (kind === "fstand") {
    // 一歩ふみ出す。横から見るので、人は +x を向く
    [0, 1].forEach((lane) => {
      const fw = frictionWorld(lane);
      const rd = addDoll(fw.world, lane, lane, [lane === 0 ? -1.2 : 1.2, 0, 0], Math.PI / 2);
      const step = stepper(rd, FRICTION_OFF + 0.15);
      const control = (t: number) => {
        fw.update(t);
        step(t);
      };
      lanes.push({ world: fw.world, g: G, dolls: [rd], control, record: () => {} });
    });
  } else if (kind === "fpush") {
    // 重い箱（40kg）を、同じ力（150N）で押す。手前がいまの地球、奥が摩擦ゼロ
    [0, 1].forEach((lane) => {
      const fw = frictionWorld(lane);
      const world = fw.world;
      const z = lane === 0 ? 0.9 : -0.9;
      const boxMat = new CANNON.Material("box");
      world.addContactMaterial(
        new CANNON.ContactMaterial(groundMaterial, boxMat, { friction: 0.5, restitution: 0 }),
      );
      const rd = addDoll(world, lane, lane, [0, 0, z], Math.PI / 2);
      const box = new CANNON.Body({
        mass: 40,
        shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4)),
        position: new CANNON.Vec3(0.95, 0.4, z),
        material: boxMat,
      });
      world.addBody(box);
      bodies.push({ lane, shape: "box", size: [0.8, 0.8, 0.8], color: "#c8925a" });
      tracked.push(box);
      const boxMoved = val(`box${lane}`);
      const manMoved = val(`man${lane}`);
      const hand = () =>
        rd.bodies.lowerArmR.pointToWorldFrame(new CANNON.Vec3(0, -0.17, 0));
      const control = (t: number) => {
        fw.update(t);
        applyBalance(rd);
        rd.setPose(POSES.stand, POSES.push, smooth((t - 0.2) / 0.4));
        // 手が箱にふれている間だけ押す（押した力と同じ力で、自分も押し返される）
        if (t > 0.7 && t < 1.5 && hand().x > box.position.x - 0.4 - 0.12) {
          box.force.x += 150;
          rd.bodies.torso.force.x -= 150;
        }
      };
      const record = (f: number) => {
        boxMoved[f] = box.position.x - 0.95;
        manMoved[f] = rd.bodies.pelvis.position.x;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "ladder") {
    // 壁に立てかけた長さ3mのはしご（地面から70度）。床の摩擦がないと、足もとがすべって倒れる
    [0, 1].forEach((lane) => {
      const fw = frictionWorld(lane);
      const world = fw.world;
      // 手前がいまの地球、奥が摩擦ゼロ。どちらも壁は右側にある
      const side = 1;
      const wallX = 0.6;
      const z = lane === 0 ? 1.3 : -1.3;
      const wall = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.15, 1.75, 0.65)),
        position: new CANNON.Vec3(wallX + side * 0.15, 1.75, z),
        material: groundMaterial,
      });
      world.addBody(wall);
      bodies.push({ lane, shape: "wall", size: [0.3, 3.5, 1.3] });
      tracked.push(wall);
      const L = 3;
      const angle = (70 * Math.PI) / 180;
      const ladder = new CANNON.Body({
        mass: 12,
        material: bodyMaterial,
        position: new CANNON.Vec3(
          wallX - side * ((L / 2) * Math.cos(angle) + 0.03),
          (L / 2) * Math.sin(angle) + 0.005,
          z,
        ),
      });
      // 2本の柱（長さ方向が y）と、7本の横木（z 方向）
      for (const z of [-0.24, 0.24]) {
        ladder.addShape(new CANNON.Box(new CANNON.Vec3(0.03, L / 2, 0.03)), new CANNON.Vec3(0, 0, z));
      }
      for (let k = 0; k < 7; k++) {
        ladder.addShape(
          new CANNON.Box(new CANNON.Vec3(0.018, 0.018, 0.24)),
          new CANNON.Vec3(0, -L / 2 + 0.35 + k * 0.38, 0),
        );
      }
      // 柱を壁側へ傾ける（z 軸まわりに 90°−70°）
      ladder.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -side * (Math.PI / 2 - angle));
      world.addBody(ladder);
      bodies.push({ lane, shape: "ladder", size: [0.06, L, 0.54] });
      tracked.push(ladder);
      soundOf.set(ladder, "cone");
      lanes.push({ world, g: G, dolls: [], control: (t) => fw.update(t), record: () => {} });
    });
  } else if (kind === "fchaos") {
    // 摩擦ゼロの広場で、5人が歩き出そうとする
    const fw = frictionWorld(1);
    const world = fw.world;
    const dolls: Ragdoll[] = [];
    const spots: [number, number, number][] = [
      [-2.4, -1.0, 0.4],
      [-1.2, 0.4, 0.15],
      [0, -0.5, 0],
      [1.2, 0.4, -0.15],
      [2.4, -1.0, -0.4],
    ];
    // 少しずつずれたタイミングで、それぞれ歩き出そうとする
    const steps = spots.map(([x, z, yaw], i) => {
      const rd = addDoll(world, 0, i, [x, 0, z], yaw);
      dolls.push(rd);
      return stepper(rd, FRICTION_OFF + 0.2 + i * 0.3);
    });
    lanes.push({
      world,
      g: G,
      dolls,
      control: (t) => {
        fw.update(t);
        steps.forEach((step) => step(t));
      },
      record: () => {},
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
  const impacts: Impact[] = [];
  const dt = 1 / (fps * SUB);
  // ぶつかった瞬間の「面に向かう速さ」を、フレームごと・レーンごと・音の種類ごとに集める
  // （横にすべっているだけの接触では鳴らさない）
  const sounds: HitSound[] = ["body", "ball", "cone"];
  const hits = lanes.map(() => ({ body: 0, ball: 0, cone: 0 }));
  const lastHit = lanes.map(() => ({ body: -100, ball: -100, cone: -100 }));
  lanes.forEach((lane, li) => {
    for (const b of lane.world.bodies) {
      const self = soundOf.get(b);
      if (!self) {
        continue;
      }
      b.addEventListener(
        "collide",
        (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
          const other = soundOf.get(e.body);
          // 人の体どうし（自分の腕と胴体など）は鳴らさない。車と地面も鳴らさない
          if ((self === "body" && other === "body") || (self === "car" && !other)) {
            return;
          }
          const sound: HitSound =
            self === "cone" || other === "cone" || self === "car"
              ? "cone"
              : self === "ball" || other === "ball"
                ? "ball"
                : "body";
          const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
          hits[li][sound] = Math.max(hits[li][sound], v);
        },
      );
    }
  });
  for (let f = 0; f < frames; f++) {
    lanes.forEach((lane, li) => {
      hits[li] = { body: 0, ball: 0, cone: 0 };
      for (let s = 0; s < SUB; s++) {
        const t = f / fps + s * dt;
        lane.control(t, dt);
        lane.world.step(dt);
      }
      lane.record(f);
      for (const sound of sounds) {
        const v = hits[li][sound];
        if (v > 0.8 && f - lastHit[li][sound] > 4) {
          impacts.push({ frame: f, v, sound, lane: li });
          lastHit[li][sound] = f;
        }
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
    labels: FRICTION_KINDS.includes(kind)
      ? ["いまの地球", "摩擦ゼロ"]
      : ["いまの地球 1G", "重力半分 0.5G"],
  };
  cache.set(key, result);
  return result;
};
