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
  | "fchaos"
  // 空気の濃さくらべ（右の世界は空気が2倍）。強い風の中に立つ
  | "wind"
  // 地球を貫く穴の中を落ちていく（tunnelzero は中心付近の無重力）
  | "tunnel"
  | "tunnelzero"
  // 空気抵抗くらべ（右・奥の世界は空気抵抗ゼロ）
  | "afeather"
  | "athrow"
  | "arain"
  | "asky"
  | "aplane"
  // 身長10cmの人（体の大きさをそろえて比べる。右・奥が10cmの人）
  | "tworld"
  | "tlift"
  | "tjump"
  | "tfall"
  | "twind"
  | "train"
  // 地面がトランポリン（右・奥の世界）
  | "bjump"
  | "bdrop"
  | "bwall"
  | "bparty"
  // 摩擦が10倍（右・奥の世界）
  | "xpush"
  | "xbrake"
  | "xslide"
  // 氷が水に浮く・沈む（右・奥は「氷が水より重い」世界）
  | "ice"
  // 金の立方体（約21万トン・一辺約22m）と人。goldgone は金が消える
  | "gold"
  | "goldgone"
  // 走る電車の中でジャンプ（一定の速さ・加速中・急ブレーキ中）
  | "trconst"
  | "tracc"
  | "trbrake"
  | "strfeet"
  | "strhold"
  // 雨の中を歩く・走る
  | "rwalk"
  | "rrun"
  // 落ちるエレベーター（elevsafe は非常止めで止まる）
  | "elevfall"
  | "elevfloat"
  | "elevsafe"
  // 高さ1mの台から飛び降りる（lknee：ひざをのばしたまま／ひざを曲げる、lmat：かたい床／マットの上）
  | "lknee"
  | "lmat"
  // テーブルからトーストを落とす（tbutter：バターあり／なし（印だけ）、tflick：ゆっくり押す／指ではじく）
  | "tbutter"
  | "tflick";

export const AIR_KINDS: SimKind[] = ["afeather", "athrow", "arain", "asky", "aplane"];
// 水そうの大きさ（中心のz、幅、奥行き、高さ、水面の高さ）
export const TANK = { z: 0.45, w: 0.9, d: 0.5, h: 0.9, level: 0.75 };
// 金が消える時刻（秒）と、金の立方体の一辺（m）
export const GOLD_GONE = 2.0;
export const GOLD_SIDE = 22.3;
// 雨の検証：コンビニまで10m、歩く 秒速1.5m・走る 秒速5m。強い雨（1m³に600粒・落ちる速さ 秒速7m）。
// 人の大きさ：上から見た面積 0.11m²（肩幅45cm × 厚さ25cm）、前から見た面積 0.79m²（45cm × 175cm）
export const RAIN = { dist: 10, walk: 1.5, run: 5, n: 600, fall: 7, top: 0.11, front: 0.79 };
// エレベーター：ロープが切れる時刻（秒）と、落ちる高さ（10階 ≒ 30m）
// elevfloat は同じ落下を 1/4 のスローで見せる（中の人が浮く様子）
export const ELEV = { snap: 0.4, height: 60, floor: 3, slow: 0.25 };
export const TRAIN_KINDS: SimKind[] = ["trconst", "tracc", "trbrake"];
// 満員電車の急ブレーキ（つり革の検証）。t0 秒にブレーキ、a は減速（m/s²）、v は最初の時速
export const STRAP_KINDS: SimKind[] = ["strfeet", "strhold"];
export const STRAP = { t0: 1.2, a: 4.5 / 3.6, v: 60 };
export const X_KINDS: SimKind[] = ["xpush", "xbrake", "xslide"];
// 飛び降りの検証：台の高さ（m）、跳び出す時刻（秒）、台の奥行きの中心、衝撃をならす時間（秒）、マットの厚さ
export const LAND_KINDS: SimKind[] = ["lknee", "lmat"];
// トーストの検証：テーブルの高さ、トーストの大きさ（一辺・厚さ）、1レーンの枚数、テーブルの左右の位置、押す速さ。
// トーストはテーブルの手前のふち（z = 0）から、カメラの方（+z）へ落ちる
export const TOAST_KINDS: SimKind[] = ["tbutter", "tflick"];
export const TOAST = { h: 0.75, size: 0.11, thick: 0.012, n: 5, x: [-0.65, 0.65], push: 0.12, start: 0.3 };
export const LAND = { h: 1.0, t0: 0.7, z: -0.55, win: 0.04, mat: 0.4 };
export const BOUNCE_KINDS: SimKind[] = ["bjump", "bdrop", "bwall", "bparty"];
export const TINY_KINDS: SimKind[] = ["tworld", "tlift", "tjump", "tfall", "twind", "train"];

// 身長10cmの人：大きさは 175cm の 1/17.5。
// 10cmの人の世界を17.5倍に拡大して（ふつうの人と同じ大きさにそろえて）計算すると、
//  - 重さは 17.5³ 分の1 なのに、筋肉の力（断面積）は 17.5² 分の1 → 体重のわりに 17.5倍強い
//  - 拡大した世界では、時間が √17.5 ≒ 4.18倍 ゆっくり進むのと同じ（重さで動く物の動きのルール）
//    → 計算は地球の重力のまま行い、4.18倍の速さで再生する
//  - 空気抵抗の式は、拡大した世界でもそのまま使える（そよ風 6m/s → 拡大した世界では約25m/s）
export const TINY = 17.5;
export const TINY_SPEED = Math.sqrt(TINY);

export const FRICTION_KINDS: SimKind[] = ["fstand", "fpush", "fbrake", "ladder", "fchaos"];
// この時刻（秒）で、右（奥）の世界の摩擦が消える
export const FRICTION_OFF = 0.6;

export type SimBody = {
  lane: number;
  shape: "part" | "mat" | "toast" | "box" | "sphere" | "cone" | "car" | "platform" | "ladder" | "wall" | "feather" | "plane" | "barbell" | "coins" | "egg" | "ice";
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

const gravityLabel = (g2: number) =>
  g2 === 0.5 ? "重力半分 0.5G" : g2 === 2 ? "重力2倍 2G" : `重力${g2}倍 ${g2}G`;
const SUB = 8;

type Lane = {
  world: CANNON.World;
  g: number;
  // 再生の速さ（10cmの人の世界は 4.18倍速）
  speed?: number;
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

const build = (kind: SimKind, frames: number, fps: number, g2: number): Build => {
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
    [G, G * g2].forEach((g, lane) => {
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
        const c = 3000;
        const rest = 0.09;
        // 台は重め（30kg）にする。物理エンジンは軽い物の上だと足がすべりやすいため
        const pm = 30;
        const plate = new CANNON.Body({
          mass: pm,
          shape: new CANNON.Box(new CANNON.Vec3(0.36, 0.03, 0.36)),
          position: new CANNON.Vec3(x, rest, 0),
          material: groundMaterial,
        });
        plate.linearFactor.set(0, 1, 0);
        plate.angularFactor.set(0, 0, 0);
        world.addBody(plate);
        bodies.push({ lane, shape: "platform", size: [0.72, 0.06, 0.72] });
        tracked.push(plate);
        const rd = addDoll(world, lane, lane, [x, rest + 0.03 + 0.06, 0]);
        // 体重計にのる直前は、体を少し浮かせて持っておく
        const reading = val(`kg${lane}`);
        const natural = rest + (pm * g) / k;
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
          const F = k * (natural - plate.position.y) - pm * g;
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
    [G, G * g2].forEach((g, lane) => {
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
  } else if (kind === "brake" || kind === "fbrake" || kind === "xbrake") {
    // 同じ速さ（時速36km）で走る車が、線のところで急ブレーキ
    [0, 1].forEach((lane) => {
      const g = kind === "brake" && lane === 1 ? G * g2 : G;
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
        // 摩擦10倍の世界（xbrake の奥）は 0.7 × 10 = 7
        const mu = kind === "xbrake" && lane === 1 ? 7 : fw.isOff() ? 0 : 0.7;
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
  } else if (kind === "fpush" || kind === "xpush") {
    // 重い箱（40kg）を、同じ力で押す（fpush：150N、奥は摩擦ゼロ。xpush：300N、奥は摩擦10倍）
    const xp = kind === "xpush";
    [0, 1].forEach((lane) => {
      const fw = frictionWorld(xp ? 0 : lane);
      const world = fw.world;
      const z = lane === 0 ? 0.9 : -0.9;
      const boxMat = new CANNON.Material("box");
      world.addContactMaterial(
        // xpush は、箱と床の摩擦を下の control で計算する（物理エンジンの摩擦は、
        // 箱の角ごとに上限がかかって実際より強くなるため）
        new CANNON.ContactMaterial(groundMaterial, boxMat, { friction: xp ? 0 : 0.5, restitution: 0 }),
      );
      const boxMu = lane === 1 ? 5 : 0.5;
      if (xp && lane === 1) {
        // すべての摩擦を10倍に（箱と床 0.5 → 5、靴と床も10倍）
        world.defaultContactMaterial.friction *= 10;
        for (const m of world.contactmaterials) {
          m.friction *= 10;
        }
      }
      const F = xp ? 300 : 150;
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
        let pushF = 0;
        if (t > 0.7 && t < (xp ? 2.6 : 1.5) && hand().x > box.position.x - 0.4 - (xp ? 0.5 : 0.12)) {
          pushF = F;
          box.force.x += F;
          // 押し返される力（xpush は足をふんばって受け止めるので、体全体に分けてかける）
          if (xp) {
            for (const b of Object.values(rd.bodies)) {
              b.force.x -= (F * b.mass) / 66;
            }
          } else {
            rd.bodies.torso.force.x -= F;
          }
        }
        if (xp) {
          // 床の摩擦：止まっていれば押す力を μmg まで打ち消し、すべっていれば μmg で止めようとする
          const maxF = boxMu * box.mass * G;
          if (Math.abs(box.velocity.x) > 0.02) {
            box.force.x -= Math.sign(box.velocity.x) * maxF;
          } else {
            box.force.x -= Math.sign(pushF) * Math.min(Math.abs(pushF), maxF);
            if (Math.abs(pushF) <= maxF) {
              box.velocity.x = 0;
            }
          }
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
  } else if (kind === "wind") {
    // 風速24m/s（台風なみ）の横風。風が押す力 = 1/2 × 空気の密度 × 速さ² × 受ける面積 × 抗力係数
    [1.2, 2.4].forEach((rho, lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -1.5 : 1.0;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      rd.balance = 0.15;
      const things: CANNON.Body[] = [];
      // 荷物の入った段ボール箱（18kg）を2つ
      [[-0.9, 0.6], [-0.6, -0.7]].forEach(([dx, z]) => {
        const box = new CANNON.Body({
          mass: 18,
          shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25)),
          position: new CANNON.Vec3(x + dx, 0.25, z),
          material: bodyMaterial,
        });
        world.addBody(box);
        bodies.push({ lane, shape: "box", size: [0.5, 0.5, 0.5], color: "#c8925a" });
        tracked.push(box);
        soundOf.set(box, "body");
        things.push(box);
      });
      const windAt = (t: number) =>
        24 * smooth((t - 0.5) / 1.2) * (1 + 0.12 * Math.sin(t * 5.3) + 0.06 * Math.sin(t * 13.1));
      const speed = val(`wind${lane}`);
      const all: { b: CANNON.Body; half: CANNON.Vec3 }[] = [
        ...(Object.keys(rd.bodies) as PartName[]).map((p) => ({
          b: rd.bodies[p],
          half: new CANNON.Vec3(rd.sizes[p][0] / 2, rd.sizes[p][1] / 2, rd.sizes[p][2] / 2),
        })),
        ...things.map((b) => ({ b, half: new CANNON.Vec3(0.25, 0.25, 0.25) })),
      ];
      const control = (t: number) => {
        rd.setPose(POSES.stand, POSES.stance, smooth((t - 0.2) / 0.3));
        applyBalance(rd);
        const w = windAt(t);
        for (const { b, half } of all) {
          // 風の向き（+x）から見た、箱の影の面積
          const q = b.quaternion;
          const ex = q.vmult(new CANNON.Vec3(1, 0, 0));
          const ey = q.vmult(new CANNON.Vec3(0, 1, 0));
          const ez = q.vmult(new CANNON.Vec3(0, 0, 1));
          const area =
            4 *
            (half.y * half.z * Math.abs(ex.x) +
              half.x * half.z * Math.abs(ey.x) +
              half.x * half.y * Math.abs(ez.x));
          const rel = w - b.velocity.x;
          b.force.x += 0.5 * rho * 1.0 * area * rel * Math.abs(rel);
        }
      };
      const record = (f: number) => {
        speed[f] = windAt(f / fps);
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "tunnel" || kind === "tunnelzero") {
    // 地面のない世界で、力を抜いた人形が回りながら落ちる（中心付近は重力ゼロでただよう）
    const zero = kind === "tunnelzero";
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, zero ? 0 : -3.2, 0) });
    world.allowSleep = false;
    (world.solver as CANNON.GSSolver).iterations = 20;
    const rd = addDoll(world, 0, 0, [0, 0, 0], 0.4);
    rd.balance = 0;
    rd.setStrength(0.03);
    rd.setPose(POSES.slip);
    // ゆっくり回り出すように、少しだけ回転をつける
    rd.bodies.torso.angularVelocity.set(0.5, 0.35, 0.6);
    rd.bodies.pelvis.angularVelocity.set(0.3, -0.2, 0.4);
    rd.bodies.upperArmL.velocity.set(-0.4, 0.3, 0.2);
    rd.bodies.upperArmR.velocity.set(0.4, 0.2, -0.2);
    lanes.push({ world, g: zero ? 0 : 3.2, dolls: [rd], control: () => {}, record: () => {} });
  } else if (kind === "afeather") {
    // 両手に鉄球と羽根を持って、同じ高さから同時に落とす。左はいまの地球、右は空気抵抗ゼロ
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -1.2 : 1.2;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      const ball = new CANNON.Body({
        mass: 2,
        shape: new CANNON.Sphere(0.07),
        position: new CANNON.Vec3(x + 0.25, 1.4, 0.5),
        material: bodyMaterial,
        type: CANNON.Body.KINEMATIC,
      });
      // 羽根は軽くて平たい（長さ22cm）
      const feather = new CANNON.Body({
        mass: 0.01,
        shape: new CANNON.Box(new CANNON.Vec3(0.03, 0.004, 0.11)),
        position: new CANNON.Vec3(x - 0.25, 1.4, 0.5),
        material: bodyMaterial,
        type: CANNON.Body.KINEMATIC,
        angularDamping: 0.6,
      });
      for (const b of [ball, feather]) {
        b.collisionFilterGroup = 2;
        b.collisionFilterMask = 1;
        world.addBody(b);
      }
      bodies.push({ lane, shape: "sphere", size: [0.14, 0.14, 0.14], color: "#5b6270" });
      bodies.push({ lane, shape: "feather", size: [0.06, 0.008, 0.22] });
      tracked.push(ball, feather);
      soundOf.set(ball, "ball");
      const ballT = val(`ball${lane}`);
      const featherT = val(`feather${lane}`);
      const release = 3.3;
      let ballAt = -1;
      let featherAt = -1;
      const handL = () => rd.bodies.lowerArmL.pointToWorldFrame(new CANNON.Vec3(0, -0.2, 0));
      const handR = () => rd.bodies.lowerArmR.pointToWorldFrame(new CANNON.Vec3(0, -0.2, 0));
      const control = (t: number) => {
        applyBalance(rd);
        rd.setPose(POSES.stand, POSES.hold, smooth((t - 0.05) / 0.45));
        if (t < release) {
          // 手に持っている間は、手の位置についていく（落とす瞬間は止めておく）
          ball.position.copy(handR());
          feather.position.copy(handL());
          ball.velocity.set(0, 0, 0);
          feather.velocity.set(0, 0, 0);
          return;
        }
        if (ball.type !== CANNON.Body.DYNAMIC) {
          for (const b of [ball, feather]) {
            b.type = CANNON.Body.DYNAMIC;
            b.updateMassProperties();
            b.velocity.set(0, 0, 0);
          }
        }
        if (lane === 0 && featherAt < 0) {
          // 空気抵抗：速さの2乗に比例して、動きと逆向きに（落ちる速さは秒速0.5mくらいで頭打ち）
          const v = feather.velocity;
          const sp = v.length();
          const c = (feather.mass * G) / (0.5 * 0.5);
          feather.force.x -= c * sp * v.x;
          feather.force.y -= c * sp * v.y;
          feather.force.z -= c * sp * v.z;
          // 空気の流れで、左右にゆれながら落ちる
          const s = t - release;
          feather.force.x += feather.mass * G * 1.1 * Math.sin(s * 4.2);
          feather.force.z += feather.mass * G * 0.4 * Math.sin(s * 2.9 + 1);
          feather.angularVelocity.set(1.6 * Math.cos(s * 4.2), 0.8, 1.2 * Math.sin(s * 3.1));
        }
        if (ballAt < 0 && ball.position.y < 0.08) {
          ballAt = t - release;
        }
        if (featherAt < 0 && feather.position.y < 0.03) {
          featherAt = t - release;
          feather.angularVelocity.set(0, 0, 0);
        }
      };
      const record = (f: number) => {
        const s = f / fps - release;
        ballT[f] = s < 0 ? 0 : ballAt < 0 ? s : ballAt;
        featherT[f] = s < 0 ? 0 : featherAt < 0 ? -s : featherAt;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "athrow" || kind === "aplane") {
    // 手前がいまの地球、奥が空気抵抗ゼロ。同じ速さで、ビーチボール（athrow）か紙ひこうき（aplane）を投げる
    const plane = kind === "aplane";
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const z = lane === 0 ? 0.9 : -0.9;
      const rd = addDoll(world, lane, lane, [0, 0, z], Math.PI / 2);
      const thing = new CANNON.Body({
        mass: plane ? 0.02 : 0.15,
        shape: plane
          ? new CANNON.Box(new CANNON.Vec3(0.13, 0.02, 0.09))
          : new CANNON.Sphere(0.25),
        position: new CANNON.Vec3(0, 1.3, z),
        material: bodyMaterial,
        type: CANNON.Body.KINEMATIC,
        angularDamping: 0.4,
      });
      thing.collisionFilterGroup = 2;
      thing.collisionFilterMask = 1;
      world.addBody(thing);
      if (plane) {
        bodies.push({ lane, shape: "plane", size: [0.26, 0.04, 0.18], color: lane === 0 ? "#ffffff" : "#fff3c4" });
      } else {
        bodies.push({ lane, shape: "sphere", size: [0.5, 0.5, 0.5], color: "beach" });
      }
      tracked.push(thing);
      if (!plane) {
        soundOf.set(thing, "ball");
      }
      const landX = val(`land${lane}`);
      let released = false;
      let landed = -1;
      const hand = () => rd.bodies.lowerArmR.pointToWorldFrame(new CANNON.Vec3(0, plane ? -0.2 : -0.32, 0));
      const releaseAt = plane ? 0.8 : 0.86;
      const control = (t: number) => {
        applyBalance(rd);
        if (t < 0.3) {
          rd.setPose(POSES.stand);
        } else if (t < 0.75) {
          rd.setPose(POSES.stand, POSES.windup, smooth((t - 0.3) / 0.3));
        } else {
          rd.setPose(POSES.throw);
          rd.joints.shoulderR.gain = plane ? 22 : 30;
        }
        if (!released) {
          thing.position.copy(hand());
          if (t >= releaseAt) {
            released = true;
            thing.type = CANNON.Body.DYNAMIC;
            thing.updateMassProperties();
            if (plane) {
              thing.velocity.set(6.2, 0.9, 0);
              thing.angularFactor.set(0, 0, 0);
            } else {
              thing.velocity.set(5.0, 5.0, 0);
            }
          }
          return;
        }
        const v = thing.velocity;
        const sp = v.length();
        if (landed < 0 && lane === 0) {
          if (plane) {
            // 翼が空気を押し下げた反動（揚力）は動きと直角に上向き、抗力は動きと逆向き（滑空比 約5）
            const kL = (thing.mass * G) / 36;
            const kD = kL / 5;
            thing.force.x += kL * sp * -v.y - kD * sp * v.x;
            thing.force.y += kL * sp * v.x - kD * sp * v.y;
          } else {
            // ビーチボールの空気抵抗 = 1/2 × 空気の密度 × 速さ² × 断面積 × 抗力係数（0.47）
            const c = 0.5 * 1.2 * Math.PI * 0.25 * 0.25 * 0.47;
            thing.force.x -= c * sp * v.x;
            thing.force.y -= c * sp * v.y;
            thing.force.z -= c * sp * v.z;
          }
        }
        if (plane && landed < 0) {
          // 紙ひこうきは、進む向きに機首を向ける
          thing.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.atan2(v.y, Math.max(0.01, v.x)));
        }
        // 紙ひこうきは機首から地面に着くので、中心の高さで判定する
        const bottom = plane ? 0.16 : 0.27;
        if (landed < 0 && thing.position.y < bottom && v.y <= 0.01) {
          landed = thing.position.x;
          thing.linearDamping = 0.95;
          thing.angularDamping = 0.9;
          if (plane) {
            thing.angularFactor.set(1, 1, 1);
          }
        }
      };
      const record = (f: number) => {
        landX[f] = landed;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "arain") {
    // 雨の中に立つ。左はいまの雨（時速30km）、右は空気抵抗ゼロの雨（時速500km）で、頭をかばってかがむ
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -1.2 : 1.2;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      rd.balance = 0.6;
      const control = (t: number) => {
        applyBalance(rd);
        if (lane === 0) {
          rd.setPose(POSES.stand);
        } else {
          rd.setPose(POSES.stand, POSES.cover, smooth((t - 0.35) / 0.35));
        }
      };
      lanes.push({ world, g: G, dolls: [rd], control, record: () => {} });
    });
  } else if (kind === "asky") {
    // 高度4000mから飛び降りる。人と一緒に落ちていく目線で見るので、世界の重力はゼロにして、
    // 速さと高度は計算式で出す。左は空気抵抗あり（時速200kmで頭打ち）、右は空気抵抗ゼロ
    const H0 = 4000;
    const VT = 55;
    // 場面の長さで、落ち始めから地面に着く直前（28.5秒）までを見せる
    const span = 28.5;
    const R = new CANNON.Quaternion();
    R.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    [0, 1].forEach((lane) => {
      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
      world.allowSleep = false;
      (world.solver as CANNON.GSSolver).iterations = 20;
      const x = lane === 0 ? -1.35 : 1.35;
      const rd = addDoll(world, lane, lane, [0, 0, 0]);
      rd.balance = 0;
      // おなかを下に向けて寝かせる（頭がカメラのほう）
      const c = new CANNON.Vec3(0, 1.0, 0);
      for (const b of Object.values(rd.bodies)) {
        const rel = b.position.vsub(c);
        const r = R.vmult(rel);
        b.position.set(x + r.x, 1.6 + r.y, r.z);
        b.quaternion.copy(R.mult(b.quaternion));
      }
      rd.setPose(POSES.arch);
      const speed = val(`v${lane}`);
      const alt = val(`h${lane}`);
      const time = val(`t${lane}`);
      const control = (t: number) => {
        rd.setPose(POSES.arch);
        // 体の向きは、空気抵抗のあるほうは風で少しずつゆれる。全体の位置はその場にとどめる
        const pel = rd.bodies.pelvis;
        const pull = new CANNON.Vec3(x - pel.position.x, 1.6 - pel.position.y, 0 - pel.position.z);
        for (const b of Object.values(rd.bodies)) {
          b.force.x += pull.x * 60 * b.mass * 0.02 - b.velocity.x * b.mass * 2;
          b.force.y += pull.y * 60 * b.mass * 0.02 - b.velocity.y * b.mass * 2;
          b.force.z += pull.z * 60 * b.mass * 0.02 - b.velocity.z * b.mass * 2;
        }
        if (lane === 0) {
          const T = (t / (frames / fps)) * span;
          const v = VT * Math.tanh((G * T) / VT);
          const q = (v / VT) ** 2;
          // 風で手足と服がばたつく（強さは速さの2乗）
          (["upperArmL", "upperArmR", "lowerArmL", "lowerArmR", "shinL", "shinR", "head"] as PartName[]).forEach((p, i) => {
            const b = rd.bodies[p];
            const n = Math.sin(t * (17 + i * 3.1) + i) + 0.6 * Math.sin(t * (29 + i * 1.7) + 2 * i);
            b.force.y += q * b.mass * 9 * n;
            b.force.x += q * b.mass * 4 * Math.sin(t * (13 + i) + i * 0.7);
          });
        }
      };
      const record = (f: number) => {
        const T = (f / frames) * span;
        time[f] = T;
        if (lane === 0) {
          speed[f] = VT * Math.tanh((G * T) / VT) * 3.6;
          alt[f] = H0 - ((VT * VT) / G) * Math.log(Math.cosh((G * T) / VT));
        } else {
          speed[f] = G * T * 3.6;
          alt[f] = Math.max(0, H0 - 0.5 * G * T * T);
        }
      };
      lanes.push({ world, g: 0, dolls: [rd], control, record });
    });
  } else if (kind === "tworld") {
    // 10cmの人（を17.5倍に拡大）が、大きな物にかこまれて立つ。まわりの物は描くだけ
    const { world } = makeWorld(G);
    const rd = addDoll(world, 0, 0, [0, 0, 0], 0.5);
    rd.setStrength(TINY);
    lanes.push({
      world,
      g: G,
      speed: TINY_SPEED,
      dolls: [rd],
      control: (t) => {
        rd.setPose(POSES.stand, POSES.stance, smooth((t - 0.5) / 2));
        applyBalance(rd);
      },
      record: () => {},
    });
  } else if (kind === "tlift") {
    // 体重の2倍の重さを、胸の前から頭の上へ持ち上げる。左はふつうの人（バーベル132kg）、
    // 右は10cmの人（500円玉4枚 28g。拡大した世界では 150kg）
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -1.4 : 1.4;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      rd.balance = 1.2;
      if (lane === 1) {
        rd.setStrength(TINY);
      }
      rd.setPose(POSES.carry);
      // 持つ物：胸の前、手の高さに置く（はじめは台の上）
      const y0 = 1.02;
      const z0 = 0.36;
      const thing = new CANNON.Body({
        mass: lane === 0 ? 132 : 150,
        position: new CANNON.Vec3(x, y0, z0),
        material: bodyMaterial,
      });
      if (lane === 0) {
        thing.addShape(new CANNON.Box(new CANNON.Vec3(0.9, 0.025, 0.025)));
        bodies.push({ lane, shape: "barbell", size: [1.8, 0.05, 0.05] });
      } else {
        thing.addShape(new CANNON.Cylinder(0.23, 0.23, 0.13, 24));
        bodies.push({ lane, shape: "coins", size: [0.46, 0.13, 0.46] });
      }
      thing.collisionFilterGroup = 2;
      thing.collisionFilterMask = 1 | 8;
      world.addBody(thing);
      tracked.push(thing);
      // 台（持ち上げる前に置いてある）
      const stand = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.3, (y0 - 0.06) / 2, 0.12)),
        position: new CANNON.Vec3(x, (y0 - 0.06) / 2, z0 + 0.05),
        material: groundMaterial,
      });
      stand.collisionFilterGroup = 8;
      stand.collisionFilterMask = 2;
      world.addBody(stand);
      bodies.push({ lane, shape: "box", size: [0.6, y0 - 0.06, 0.24], color: "#8a6a4a" });
      tracked.push(stand);
      // 両手でつかむ（手のひらの位置と、持つ物の左右の端をつなぐ）
      const grip = lane === 0 ? 0.24 : 0.2;
      for (const [arm, sx] of [["lowerArmL", -1], ["lowerArmR", 1]] as const) {
        world.addConstraint(
          new CANNON.PointToPointConstraint(
            rd.bodies[arm],
            new CANNON.Vec3(0, -0.17, 0),
            thing,
            new CANNON.Vec3(sx * grip, 0, 0),
            4000,
          ),
        );
      }
      const lifted = val(`lift${lane}`);
      const control = (t: number) => {
        applyBalance(rd);
        // 1秒たったら、頭の上へ持ち上げようとする
        // （どちらも実際の時間で同じタイミング・同じ速さで持ち上げようとする）
        rd.setPose(POSES.carry, POSES.press, smooth((t / (lane === 1 ? TINY_SPEED : 1) - 1.0) / 1.2));
      };
      const record = (f: number) => {
        lifted[f] = thing.position.y - y0;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record, speed: lane === 1 ? TINY_SPEED : 1 });
    });
  } else if (kind === "tjump") {
    // どちらも高さ50cmまで跳ぶ。10cmの人には身長の5倍（拡大した世界では 8.75m）
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -3.0 : 3.0;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      // 足の高さが 50cm（10cmの人は拡大した世界で 8.75m）になるよう、けり出す速さを合わせてある
      const kick = Math.sqrt(2 * G * (lane === 0 ? 0.5 : 0.5 * TINY)) * (lane === 0 ? 1.42 : 1.06);
      if (lane === 1) {
        rd.setStrength(TINY);
      }
      const k = lane === 0 ? 1 : TINY_SPEED;
      // 足が地面をはなれる瞬間（実際の時間で0.85秒）が、どちらの世界でも同じになるように
      let next = 0.85 * k - 0.45;
      let step = jumper(rd, next, kick);
      const top = val(`top${lane}`);
      let best = 0;
      const control = (t: number) => {
        // 着地して落ち着いたら、もう一度跳ぶ（どちらの世界も同じ時刻に）
        if (t > next + 2.2 * k) {
          next += 2.2 * k;
          step = jumper(rd, next, kick);
          best = 0;
        }
        step(t);
        applyBalance(rd);
        // 真上に跳ぶ（空中で前後左右に流れていかないようにする）
        if (rd.bodies.pelvis.position.y > 1.25) {
          for (const b of Object.values(rd.bodies)) {
            b.velocity.x *= 0.995;
            b.velocity.z *= 0.995;
          }
        }
      };
      const record = (f: number) => {
        best = Math.max(best, rd.bodies.footL.position.y - 0.04);
        top[f] = best;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record, speed: k });
    });
  } else if (kind === "tfall") {
    // 高さ30mのビルから落ちる（目線は人と一緒に落ちていく）。左はふつうの人、右は10cmの人。
    // 速さは「重力 − 空気抵抗」で計算する（最高速度：ふつうの人は秒速55m、10cmの人は秒速9.3m）
    const H0 = 30;
    const R = new CANNON.Quaternion();
    R.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    [0, 1].forEach((lane) => {
      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
      world.allowSleep = false;
      (world.solver as CANNON.GSSolver).iterations = 20;
      const x = lane === 0 ? -1.35 : 1.35;
      const rd = addDoll(world, lane, lane, [0, 0, 0]);
      rd.balance = 0;
      const c = new CANNON.Vec3(0, 1.0, 0);
      for (const b of Object.values(rd.bodies)) {
        const r = R.vmult(b.position.vsub(c));
        b.position.set(x + r.x, 1.6 + r.y, r.z);
        b.quaternion.copy(R.mult(b.quaternion));
      }
      const VT = lane === 0 ? 55 : 9.3;
      // 落ちる速さと高さを、先に細かい刻みで計算しておく（実際の時間）
      const speed = val(`v${lane}`);
      const alt = val(`h${lane}`);
      const time = val(`t${lane}`);
      let v = 0;
      let h = H0;
      let landedAt = -1;
      for (let f = 0; f < frames; f++) {
        for (let k = 0; k < 20; k++) {
          if (h > 0) {
            v += G * (1 - (v / VT) ** 2) * (1 / (fps * 20));
            h -= v * (1 / (fps * 20));
            if (h <= 0) {
              h = 0;
              landedAt = (f + k / 20) / fps;
            }
          }
        }
        speed[f] = v * 3.6;
        alt[f] = h;
        time[f] = landedAt < 0 ? f / fps : landedAt;
      }
      const k = lane === 0 ? 1 : TINY_SPEED;
      if (lane === 1) {
        rd.setStrength(TINY);
      }
      const control = (t: number) => {
        rd.setPose(POSES.arch);
        const pel = rd.bodies.pelvis;
        for (const b of Object.values(rd.bodies)) {
          b.force.x += (x - pel.position.x) * 1.2 * b.mass - b.velocity.x * b.mass * 2;
          b.force.y += (1.6 - pel.position.y) * 1.2 * b.mass - b.velocity.y * b.mass * 2;
          b.force.z += (0 - pel.position.z) * 1.2 * b.mass - b.velocity.z * b.mass * 2;
        }
        // 空気で手足がばたつく（強さは「速さ ÷ 最高速度」の2乗。10cmの人はすぐ最高速度に近づく）
        const fNow = Math.min(frames - 1, Math.floor((t / k) * fps));
        if (alt[fNow] > 0) {
          const q = (speed[fNow] / 3.6 / VT) ** 2;
          (["upperArmL", "upperArmR", "lowerArmL", "lowerArmR", "shinL", "shinR", "head"] as PartName[]).forEach((p, i) => {
            const b = rd.bodies[p];
            const n = Math.sin(t * (17 + i * 3.1) + i) + 0.6 * Math.sin(t * (29 + i * 1.7) + 2 * i);
            b.force.y += q * b.mass * 9 * n;
            b.force.x += q * b.mass * 4 * Math.sin(t * (13 + i) + i * 0.7);
          });
        }
      };
      lanes.push({ world, g: 0, dolls: [rd], control, record: () => {}, speed: k });
    });
  } else if (kind === "twind") {
    // どちらも風速6m/s。10cmの人は、拡大した世界では風速25m/s（台風なみ）を受けるのと同じ
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -1.5 : 1.0;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      rd.balance = 0.15;
      const k = lane === 0 ? 1 : TINY_SPEED;
      if (lane === 1) {
        rd.setStrength(TINY);
      }
      const W = 6 * k;
      // その世界の時刻 t での風速（実際の時間で0.6秒から吹き始める。突風のゆらぎつき）
      const windAt = (t: number) => {
        const tt = t / k;
        return W * smooth((tt - 0.6) / 1.0) * (1 + 0.12 * Math.sin(tt * 5.3) + 0.06 * Math.sin(tt * 13.1));
      };
      const speed = val(`wind${lane}`);
      const all = (Object.keys(rd.bodies) as PartName[]).map((p) => ({
        b: rd.bodies[p],
        half: new CANNON.Vec3(rd.sizes[p][0] / 2, rd.sizes[p][1] / 2, rd.sizes[p][2] / 2),
      }));
      const control = (t: number) => {
        rd.setPose(POSES.stand, POSES.stance, smooth((t / k - 0.2) / 0.3));
        applyBalance(rd);
        const w = windAt(t);
        for (const { b, half } of all) {
          const q = b.quaternion;
          const ex = q.vmult(new CANNON.Vec3(1, 0, 0));
          const ey = q.vmult(new CANNON.Vec3(0, 1, 0));
          const ez = q.vmult(new CANNON.Vec3(0, 0, 1));
          const area =
            4 *
            (half.y * half.z * Math.abs(ex.x) +
              half.x * half.z * Math.abs(ey.x) +
              half.x * half.y * Math.abs(ez.x));
          const rel = w - b.velocity.x;
          b.force.x += 0.5 * 1.2 * 1.0 * area * rel * Math.abs(rel);
        }
      };
      const record = (f: number) => {
        // 画面に出す風速は、どちらも実際の風速
        speed[f] = windAt((f / fps) * k) / k;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record, speed: k });
    });
  } else if (kind === "train") {
    // 大粒の雨（直径5mm・秒速9m）が頭に当たる。左はふつうの人、右は10cmの人。
    // 10cmの人には、雨粒はソフトボールくらい（拡大した世界で直径8.75cm・350g）。
    // 当たると体が 秒速0.85m（拡大した世界）ほど押される。ふつうの人は、ほとんど何も感じない
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x = lane === 0 ? -1.3 : 1.3;
      const rd = addDoll(world, lane, lane, [x, 0, 0]);
      rd.balance = lane === 0 ? 1 : 0.25;
      const k = lane === 0 ? 1 : TINY_SPEED;
      if (lane === 1) {
        rd.setStrength(TINY);
      }
      const hitN = val(`hit${lane}`);
      // 当たる時刻（実際の時間）
      const hits = [1.5, 4.2];
      const done = hits.map(() => false);
      const control = (t: number) => {
        applyBalance(rd);
        hits.forEach((h, i) => {
          if (!done[i] && t >= h * k) {
            done[i] = true;
            // 雨粒の勢い（質量 × 速さ）を、頭と肩に分けて与える
            const dv = lane === 0 ? 0.0001 : 0.85;
            for (const p of ["head", "torso", "upperArmL", "upperArmR"] as PartName[]) {
              rd.bodies[p].velocity.y -= dv * 1.6;
              rd.bodies[p].velocity.x += dv * (i === 0 ? 0.7 : -0.6);
            }
          }
        });
        if (lane === 1 && t > hits[0] * k) {
          rd.setPose(POSES.stand, POSES.cover, smooth((t / k - hits[0] - 0.15) / 0.3));
        } else {
          rd.setPose(POSES.stand);
        }
      };
      const record = (f: number) => {
        hitN[f] = hits.filter((h) => f / fps >= h).length;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record, speed: k });
    });
  } else if (BOUNCE_KINDS.includes(kind)) {
    // 地面がトランポリン：右（奥）の世界は、地面が「ばね」になっている。
    // 沈んだ深さに比例して押し返す力（人は体重で約15cm沈む）と、少しだけのブレーキ（はね返りは約8割）
    const party = kind === "bparty";
    const laneIds = party ? [1] : [0, 1];
    laneIds.forEach((lane) => {
      const { world, ground } = makeWorld(G);
      const tramp = lane === 1;
      if (tramp) {
        world.removeBody(ground);
      }
      // k：沈んだ1mあたりの押し返す力（N）、c：ブレーキ。体の部位ごとに、地面にふれている所だけが押される
      const members: { b: CANNON.Body; size?: [number, number, number]; r?: number; k: number; c: number }[] = [];
      const x0 = party ? 0 : (lane === 0 ? -1 : 1) * (kind === "bdrop" ? 0.9 : 1.4);
      const dolls: Ragdoll[] = [];
      const addMember = (rd: Ragdoll) => {
        for (const p of Object.keys(rd.bodies) as PartName[]) {
          // 両足で立つと約10cm沈む（66kg × 9.8 ÷ 2 ÷ 0.1 ≒ 3200）。ブレーキはごく弱く（よくはずむ）
          members.push({ b: rd.bodies[p], size: rd.sizes[p], k: 3200, c: 8 });
        }
      };
      // 地面のばね（トランポリンの世界だけ）
      const springs = () => {
        if (!tramp) {
          return;
        }
        for (const m of members) {
          const low = m.r !== undefined ? m.b.position.y - m.r : lowestY(m.b, m.size!);
          const depth = -low;
          if (depth > 0) {
            m.b.force.y += m.k * depth - m.c * m.b.velocity.y;
            // 横には、ほとんどすべらない（マットが足をつかむ）
            m.b.velocity.x *= 0.985;
            m.b.velocity.z *= 0.985;
          }
        }
      };
      const deep = val(`deep${lane}`);
      const top = val(`top${lane}`);
      let best = 0;
      let control: Lane["control"] = () => {};
      let record: Lane["record"] = () => {};

      if (kind === "bjump" || party) {
        // その場で何度もジャンプする。トランポリンでは、いちばん沈んだときに足でけって、勢いを足していく
        const spots: [number, number, number][] = party
          ? [
              [-2.4, -1.0, 0.4],
              [-1.2, 0.5, 0.15],
              [0, -0.5, 0],
              [1.2, 0.5, -0.15],
              [2.4, -1.0, -0.4],
            ]
          : [[x0, 0, 0]];
        const steps = spots.map(([x, z, yaw], i) => {
          const rd = addDoll(world, lane, party ? i : lane, [x, tramp ? -0.12 : 0, z], yaw);
          dolls.push(rd);
          addMember(rd);
          if (!tramp) {
            let next = 0.85 - 0.45;
            let step = jumper(rd, next, Math.sqrt(2 * G * 0.5) * 1.42);
            return (t: number) => {
              if (t > next + 2.2) {
                next += 2.2;
                step = jumper(rd, next, Math.sqrt(2 * G * 0.5) * 1.42);
              }
              step(t);
              applyBalance(rd);
              if (rd.bodies.pelvis.position.y > 1.25) {
                for (const b of Object.values(rd.bodies)) {
                  b.velocity.x *= 0.995;
                  b.velocity.z *= 0.995;
                }
              }
            };
          }
          // トランポリンの上では、ひざをのばして体を固めて跳ぶ（足がクッションになって勢いを吸わないように）
          rd.setStrength(5, ["hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR", "waist"]);
          let lastVy = 0;
          let pushes = 0;
          let airborne = false;
          let started = false;
          const start = 0.6 + i * 0.35;
          return (t: number) => {
            applyBalance(rd);
            const feet = Math.min(lowestY(rd.bodies.footL, rd.sizes.footL), lowestY(rd.bodies.footR, rd.sizes.footR));
            // 足（マットに沈んでいる所）の上下の速さで、いちばん沈んだ瞬間を見つける
            const vy = (rd.bodies.footL.velocity.y + rd.bodies.footR.velocity.y) / 2;
            rd.setPose(feet > 0.05 ? POSES.air : POSES.stand);
            // 最初はふつうにジャンプ。そのあとは、いちばん沈んだ瞬間（下向き → 上向きに変わる）に
            // 足でけって勢いを足していく（回数に上限）
            if (!started && t > start) {
              started = true;
              rd.addVelocity([0, 3.2, 0]);
            }
            if (feet > 0.05) {
              airborne = true;
            }
            if (started && airborne && feet < -0.03 && lastVy < 0 && vy >= 0 && pushes < (party ? 10 : 8)) {
              rd.addVelocity([0, party ? 2.8 : 3.6, 0]);
              pushes++;
              airborne = false;
            }
            lastVy = vy;
            // 真上に跳ぶ（空中で前後左右に流れていかないようにする）
            if (feet > 0.3) {
              for (const b of Object.values(rd.bodies)) {
                b.velocity.x *= 0.997;
                b.velocity.z *= 0.997;
              }
            }
          };
        });
        control = (t) => {
          springs();
          steps.forEach((s) => s(t));
        };
      } else if (kind === "bdrop") {
        // 生卵を手から落とす（高さ約1.4m）。かたい地面なら割れる（ぶつかる速さが秒速2mをこえたら）
        const rd = addDoll(world, lane, lane, [x0, tramp ? -0.12 : 0, 0]);
        dolls.push(rd);
        addMember(rd);
        const egg = new CANNON.Body({
          mass: 0.06,
          shape: new CANNON.Sphere(0.035),
          position: new CANNON.Vec3(x0 + 0.25, 1.4, 0.5),
          material: bodyMaterial,
          type: CANNON.Body.KINEMATIC,
        });
        egg.collisionFilterGroup = 2;
        egg.collisionFilterMask = 1;
        world.addBody(egg);
        bodies.push({ lane, shape: "egg", size: [0.07, 0.09, 0.07] });
        tracked.push(egg);
        members.push({ b: egg, r: 0.035, k: 29, c: 0.22 });
        const broken = val(`broken${lane}`);
        let isBroken = false;
        const release = 1.4;
        const handR = () => rd.bodies.lowerArmR.pointToWorldFrame(new CANNON.Vec3(0, -0.2, 0));
        control = (t) => {
          springs();
          applyBalance(rd);
          rd.setPose(POSES.stand, POSES.hold, smooth((t - 0.05) / 0.45));
          if (t < release) {
            egg.position.copy(handR());
            egg.velocity.set(0, 0, 0);
            return;
          }
          if (egg.type !== CANNON.Body.DYNAMIC && !isBroken) {
            egg.type = CANNON.Body.DYNAMIC;
            egg.updateMassProperties();
            egg.velocity.set(0, 0, 0);
          }
          if (!tramp && !isBroken && egg.position.y < 0.045) {
            isBroken = true;
            egg.type = CANNON.Body.STATIC;
            egg.velocity.set(0, 0, 0);
            egg.position.y = 0.012;
          }
        };
        record = (f) => {
          broken[f] = isBroken ? 1 : 0;
        };
      } else if (kind === "bwall") {
        // 高さ3mの塀の上から、前へ飛び降りる
        const H = 3;
        const wx = x0 - 0.9;
        const wall = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Box(new CANNON.Vec3(0.45, H / 2, 0.6)),
          position: new CANNON.Vec3(wx, H / 2, 0),
          material: groundMaterial,
        });
        world.addBody(wall);
        bodies.push({ lane, shape: "wall", size: [0.9, H, 1.2] });
        tracked.push(wall);
        const rd = addDoll(world, lane, lane, [wx + 0.22, H, 0], Math.PI / 2);
        dolls.push(rd);
        addMember(rd);
        const jumpAt = 0.9;
        let jumped = false;
        let landedAt = -1;
        control = (t) => {
          springs();
          applyBalance(rd);
          const feet = Math.min(lowestY(rd.bodies.footL, rd.sizes.footL), lowestY(rd.bodies.footR, rd.sizes.footR));
          if (t < jumpAt - 0.35) {
            rd.setPose(POSES.stand);
          } else if (t < jumpAt) {
            rd.setPose(POSES.stand, POSES.crouch, smooth((t - jumpAt + 0.35) / 0.3));
          } else {
            if (!jumped) {
              jumped = true;
              rd.addVelocity([2.3, 1.8, 0]);
            }
            if (feet > 0.08) {
              rd.setPose(POSES.air);
            } else {
              if (landedAt < 0 && t > jumpAt + 0.3) {
                landedAt = t;
              }
              rd.setPose(POSES.land, POSES.stand, tramp ? 0.3 : smooth((t - landedAt - 0.3) / 0.5));
            }
          }
        };
      }
      const prevRecord = record;
      record = (f) => {
        prevRecord(f);
        // いちばん沈んだ深さ（画面のマットのへこみ用）と、足のいちばん高い位置
        let d = 0;
        for (const m of members) {
          const low = m.r !== undefined ? m.b.position.y - m.r : lowestY(m.b, m.size!);
          d = Math.max(d, -low);
        }
        deep[f] = tramp ? d : 0;
        if (dolls[0]) {
          best = Math.max(best, Math.min(dolls[0].bodies.footL.position.y, dolls[0].bodies.footR.position.y) - 0.04);
        }
        top[f] = best;
      };
      lanes.push({ world, g: G, dolls, control, record });
    });
  } else if (kind === "xslide") {
    // すべり台（角度35度・長さ3.2m）。手前はいまの地球（おしりとすべり台の摩擦 0.25）、奥は10倍の 2.5。
    // tan35° ≒ 0.7 なので、0.25 ならすべり出し、2.5 ならすべらない（すべるには約68度以上が必要）
    const A = (35 * Math.PI) / 180;
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const z = lane === 0 ? 1.1 : -1.1;
      const slideMat = new CANNON.Material("slide");
      const mu = lane === 0 ? 0.25 : 2.5;
      // すべり台との摩擦は、下の control で「摩擦係数 × 面を押す力」として計算する
      // （物理エンジンの摩擦は、関節でつながった人形だと実際より強く引っかかるため）
      world.addContactMaterial(new CANNON.ContactMaterial(bodyMaterial, slideMat, { friction: 0, restitution: 0 }));
      const addStatic = (half: [number, number, number], pos: [number, number, number], rot: number, color: string) => {
        const b = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Box(new CANNON.Vec3(...half)),
          position: new CANNON.Vec3(...pos),
          material: slideMat,
        });
        b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rot);
        world.addBody(b);
        bodies.push({ lane, shape: "box", size: [half[0] * 2, half[1] * 2, half[2] * 2], color });
        tracked.push(b);
      };
      // 上の台（高さ2m）と、すべる面、両側の手すり
      const top = 2.0;
      addStatic([0.5, 0.05, 0.42], [-1.1, top - 0.05, z], 0, "#3a86ff");
      const L = 3.2;
      const sx = -0.6 + (L / 2) * Math.cos(A);
      const sy = top - (L / 2) * Math.sin(A) - 0.05;
      addStatic([L / 2, 0.05, 0.42], [sx, sy, z], -A, "#ff6b3d");
      for (const dz of [-0.45, 0.45]) {
        addStatic([L / 2, 0.14, 0.03], [sx + 0.08 * Math.sin(A), sy + 0.14 * Math.cos(A), z + dz], -A, "#ffd21a");
      }
      // 台の脚
      addStatic([0.05, top / 2, 0.05], [-1.5, top / 2 - 0.1, z - 0.35], 0, "#888");
      addStatic([0.05, top / 2, 0.05], [-1.5, top / 2 - 0.1, z + 0.35], 0, "#888");
      // 座るとおしりが後ろへ下がるので、台の前のほうに立たせておく
      const rd = addDoll(world, lane, lane, [-0.72, top, z], Math.PI / 2);
      rd.balance = 0.5;
      const moved = val(`slide${lane}`);
      let x0 = 0;
      let shifted = false;
      const control = (t: number) => {
        applyBalance(rd);
        rd.setPose(POSES.stand, POSES.sit, smooth(t / 0.5));
        // 座り終わったら、すべり台の入り口まで体ごと移す（この場面は1秒目から見せる）
        if (!shifted && t > 0.9) {
          shifted = true;
          // すべり台の少し下（入り口から0.5m）に、体を傾けずに座らせる
          const dx = -0.1 - rd.bodies.pelvis.position.x;
          const dy = -0.5 * Math.tan(A) + 0.04;
          for (const b of Object.values(rd.bodies)) {
            b.position.x += dx;
            b.position.y += dy;
            b.velocity.set(0, 0, 0);
          }
        }
        // おしりがすべる面にふれていたら、体全体に摩擦をかける
        const n = new CANNON.Vec3(Math.sin(A), Math.cos(A), 0);
        const tan = new CANNON.Vec3(Math.cos(A), -Math.sin(A), 0);
        const pel = rd.bodies.pelvis.position;
        const d = (pel.x - -0.6) * n.x + (pel.y - top) * n.y;
        if (shifted && pel.x > -0.6 && pel.x < 2.0 && d < 0.16) {
          for (const b of Object.values(rd.bodies)) {
            const vt = b.velocity.dot(tan);
            const maxF = mu * b.mass * G * Math.cos(A);
            const gravityT = b.mass * G * Math.sin(A);
            if (Math.abs(vt) > 0.03) {
              // すべっている：動きと逆向きに μN
              b.force.vadd(tan.scale(-Math.sign(vt) * maxF), b.force);
            } else {
              // 止まっている：重力の坂方向の力を、μN まで打ち消す
              b.force.vadd(tan.scale(-Math.min(gravityT, maxF)), b.force);
            }
          }
        }
        if (t > 1.0 && t < 1.25) {
          // すべり台の上で、前へ少しおしりをずらす
          for (const b of Object.values(rd.bodies)) {
            b.velocity.x = Math.max(b.velocity.x, 0.9);
          }
        }
        if (t < 1.0) {
          x0 = rd.bodies.pelvis.position.x;
        }
      };
      const record = (f: number) => {
        moved[f] = rd.bodies.pelvis.position.x - x0;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "ice") {
    // 水そう（深さ90cm）に、人が氷を3つ落とす。左はいまの氷（水の0.92倍の重さ）、右は「もしも」の氷（水の1.08倍）。
    // 浮力 = 水の密度 × 重力 × 水に入っている体積。水の中では動きにブレーキがかかる
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x0 = lane === 0 ? -1.0 : 1.0;
      const rd = addDoll(world, lane, lane, [x0, 0, -0.25]);
      rd.balance = 1;
      const level = TANK.level;
      // 水そうのかべ（ガラス）
      const walls: [number, number, number, number, number, number][] = [
        [x0 - TANK.w / 2, TANK.h / 2, TANK.z, 0.02, TANK.h / 2, TANK.d / 2],
        [x0 + TANK.w / 2, TANK.h / 2, TANK.z, 0.02, TANK.h / 2, TANK.d / 2],
        [x0, TANK.h / 2, TANK.z - TANK.d / 2, TANK.w / 2, TANK.h / 2, 0.02],
        [x0, TANK.h / 2, TANK.z + TANK.d / 2, TANK.w / 2, TANK.h / 2, 0.02],
      ];
      for (const [x, y, z, hx, hy, hz] of walls) {
        const wb = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)), position: new CANNON.Vec3(x, y, z) });
        wb.collisionFilterGroup = 8;
        wb.collisionFilterMask = 2;
        world.addBody(wb);
      }
      const rho = lane === 0 ? 917 : 1080;
      const s = 0.16;
      const cubes = [-0.22, 0, 0.22].map((dx, k) => {
        const c = new CANNON.Body({
          mass: rho * s * s * s,
          shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)),
          position: new CANNON.Vec3(x0 + dx, 1.35, TANK.z),
          material: bodyMaterial,
          type: CANNON.Body.KINEMATIC,
        });
        c.quaternion.setFromEuler(0.3 * k, 0.5 * k, 0.2);
        c.collisionFilterGroup = 2;
        c.collisionFilterMask = 1 | 2 | 8;
        world.addBody(c);
        bodies.push({ lane, shape: "ice", size: [s, s, s] });
        tracked.push(c);
        soundOf.set(c, "ball");
        return c;
      });
      const depth = val(`ice${lane}`);
      const splash = val(`splash${lane}`);
      const releaseAt = [1.2, 1.45, 1.7];
      const entered = cubes.map(() => false);
      let lastSplash = -1;
      const control = (t: number) => {
        applyBalance(rd);
        rd.setPose(POSES.stand, POSES.hold, smooth((t - 0.1) / 0.5));
        cubes.forEach((c, k) => {
          if (t < releaseAt[k]) {
            // 手の前（水そうの真上）に持っている
            c.position.set(x0 + [-0.22, 0, 0.22][k], 1.35, TANK.z);
            c.velocity.set(0, 0, 0);
            return;
          }
          if (c.type !== CANNON.Body.DYNAMIC) {
            c.type = CANNON.Body.DYNAMIC;
            c.updateMassProperties();
            c.velocity.set(0, 0, 0);
          }
          const bottom = c.position.y - s / 2;
          const sub = Math.min(1, Math.max(0, (level - bottom) / s));
          if (sub > 0) {
            if (!entered[k]) {
              entered[k] = true;
              lastSplash = t;
            }
            // 浮力と、水の中のブレーキ（上下・左右・回転）
            c.force.y += 1000 * G * s * s * s * sub;
            c.force.vadd(c.velocity.scale(-c.mass * 6 * sub), c.force);
            c.torque.vadd(c.angularVelocity.scale(-c.mass * 0.05 * sub), c.torque);
          }
        });
      };
      const record = (f: number) => {
        // 氷のいちばん下の高さ（水面からの深さ）
        depth[f] = Math.min(...cubes.map((c) => c.position.y));
        splash[f] = lastSplash;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "gold" || kind === "goldgone") {
    // 人類がこれまでに掘り出した金（約21万トン）を集めた立方体（一辺約22m）の前に、6人が立つ。
    // goldgone は、2秒で金が消えて、みんながおどろいて手を上げる
    const { world } = makeWorld(G);
    const dolls: Ragdoll[] = [];
    const spots: [number, number, number][] = [
      [-5, 6, 0.2],
      [-3, 8.5, -0.1],
      [-1, 6.5, 0.15],
      [1.2, 9, 0],
      [3.2, 6.8, -0.2],
      [5.2, 8.2, 0.1],
    ];
    spots.forEach(([x, z, yaw], i) => {
      // 立方体のほうを向く（-z 向き）
      const rd = addDoll(world, 0, i, [x, 0, z], Math.PI + yaw);
      rd.balance = 1;
      dolls.push(rd);
    });
    const gone = val("gone");
    lanes.push({
      world,
      g: G,
      dolls,
      control: (t) => {
        dolls.forEach((rd, i) => {
          applyBalance(rd);
          if (kind === "goldgone" && t > GOLD_GONE + 0.25 + i * 0.08) {
            rd.setPose(POSES.stand, POSES.air, smooth((t - GOLD_GONE - 0.25 - i * 0.08) / 0.3));
          } else {
            rd.setPose(POSES.stand);
          }
        });
      },
      record: (f) => {
        gone[f] = kind === "goldgone" ? Math.min(1, Math.max(0, (f / fps - GOLD_GONE) / 0.6)) : 0;
      },
    });
  } else if (TOAST_KINDS.includes(kind)) {
    // テーブルのふちからトーストを落とす（マシューズの論文と同じ考え方で、運動方程式を細かく計算する）。
    //  1. トーストを押して、重心がふちを少しこえると、ふちを支点に回り始める
    //  2. 回るほど前へずり落ちる力が大きくなり、摩擦で支えきれなくなると、すべりながらテーブルをはなれる
    //  3. はなれたときの回る速さのまま、回りながら床へ落ちる。床につくまでに回った角度で、どちらの面が下かが決まる
    // 物理エンジンの箱の摩擦は、小さくて軽い物だと大きくなりすぎるので、トーストだけは自分で計算する
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const h = TOAST.h;
      // 計算はトーストが進む向き（手前 +z）を x として行い、最後に向きを直す
      const edge = 0;
      const cx = TOAST.x[lane];
      const fast = kind === "tflick" && lane === 1;
      const butter = !(kind === "tbutter" && lane === 1);
      const table = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, h / 2, 0.4)),
        position: new CANNON.Vec3(cx, h / 2, -0.4),
      });
      world.addBody(table);
      bodies.push({ lane, shape: "box", size: [1.0, h, 0.8], color: "#6e4428" });
      tracked.push(table);
      const L = TOAST.size;
      const d = TOAST.thick;
      const A = L / 2;
      const I = (L * L + d * d) / 12;
      // 1枚ごとに、ふちをこえて回り始めるときの はみ出し（m）と、摩擦の強さを少し変える
      const r0s = [0.003, 0.006, 0.009, 0.012, 0.005];
      const mus = [0.4, 0.45, 0.5, 0.4, 0.55];
      const flicks = [1.5, 1.35, 1.65, 1.45, 1.55];
      type St = { phase: number; x: number; y: number; phi: number; w: number; r: number; u: number; vx: number; vy: number; result: number; z: number };
      const sts: St[] = [];
      const dummies: CANNON.Body[] = [];
      for (let i = 0; i < TOAST.n; i++) {
        const z = cx - 0.3 + i * 0.15;
        // phase 0：テーブルの上（押される前・押されている）、1：ふちで回る、2：落ちている、3：床の上
        sts.push({ phase: 0, x: edge - A - 0.03 - i * 0.008, y: h + d / 2, phi: 0, w: 0, r: 0, u: 0, vx: 0, vy: 0, result: 0, z });
        const body = new CANNON.Body({ mass: 0 });
        dummies.push(body);
        bodies.push({ lane, shape: "toast", size: [L, d, L], color: butter ? "butter" : "mark" });
        tracked.push(body);
      }
      const up = val(`up${lane}`);
      const down = val(`down${lane}`);
      const step = (st: St, i: number, t: number, dt: number) => {
        const t0 = TOAST.start + i * 0.35;
        const mu = mus[i];
        if (st.phase === 0) {
          if (t < t0) {
            return;
          }
          if (fast) {
            // 指ではじく：テーブルの上をすべる間は、摩擦でブレーキがかかる
            if (st.vx === 0) {
              st.vx = flicks[i];
            }
            st.vx = Math.max(0, st.vx - mu * G * dt);
            st.x += st.vx * dt;
            if (st.x >= edge) {
              st.phase = 1;
              st.r = st.x - edge;
              st.u = st.vx;
            }
          } else {
            // ゆっくり押す（秒速12cm）。重心がふちを r0 こえたら、回り始める
            st.x += TOAST.push * dt;
            if (st.x >= edge + r0s[i]) {
              st.phase = 1;
              st.r = st.x - edge;
              st.u = 0;
            }
          }
        } else if (st.phase === 1) {
          // ふちを支点に回る。重心がふちから r の所にあり、トーストの向きに すべる速さ u
          const IE = I + st.r * st.r;
          const acc = (G * st.r * Math.cos(st.phi) - 2 * st.r * st.u * st.w) / IE;
          const N = (G * Math.cos(st.phi) * I) / IE;
          const need = st.w * st.w * st.r + G * Math.sin(st.phi);
          if (st.u <= 1e-9 && need > mu * N) {
            st.u = 1e-6;
          }
          if (st.u > 0) {
            st.u = Math.max(0, st.u + (G * Math.sin(st.phi) + st.w * st.w * st.r - mu * N) * dt);
            st.r += st.u * dt;
          }
          st.w += acc * dt;
          st.phi += st.w * dt;
          st.x = edge + st.r * Math.cos(st.phi) + (d / 2) * Math.sin(st.phi);
          st.y = h - st.r * Math.sin(st.phi) + (d / 2) * Math.cos(st.phi);
          if (st.r >= A || st.phi > Math.PI / 2) {
            st.phase = 2;
            st.vx = st.w * st.r * Math.sin(st.phi) + st.u * Math.cos(st.phi);
            st.vy = -st.w * st.r * Math.cos(st.phi) - st.u * Math.sin(st.phi);
          }
        } else if (st.phase === 2) {
          st.vy -= G * dt;
          st.x += st.vx * dt;
          st.y += st.vy * dt;
          st.phi += st.w * dt;
          const low = A * Math.abs(Math.sin(st.phi)) + (d / 2) * Math.abs(Math.cos(st.phi));
          if (st.y <= low) {
            // 床にぶつかった瞬間の向き：上の面（バター）が下を向いていれば「バターが下」
            const deg = (((st.phi * 180) / Math.PI) % 360 + 360) % 360;
            st.result = deg > 90 && deg < 270 ? -1 : 1;
            st.phase = 3;
            // 近いほうの面を下にして、ぱたんと倒れる
            st.w = st.result === -1 ? Math.PI : 0;
          }
        } else {
          // 床の上：ぱたんと平らになって止まる
          st.phi += (st.w - (st.phi % (2 * Math.PI))) * Math.min(1, dt * 18);
          st.y += (d / 2 - st.y) * Math.min(1, dt * 18);
          st.vx *= 0.9;
          st.x += st.vx * dt * 0.3;
        }
      };
      const control = (t: number, dt: number) => {
        const n = 20;
        sts.forEach((st, i) => {
          for (let k = 0; k < n; k++) {
            step(st, i, t + (k * dt) / n, dt / n);
          }
          const body = dummies[i];
          // 計算の x（進む向き）を手前（+z）に、st.z を左右の位置（x）にする
          body.position.set(st.z, st.y, st.x);
          // 手前へ倒れるように、x 軸のまわりに phi 回す
          body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), st.phi);
        });
      };
      const record = (f: number) => {
        up[f] = sts.filter((st) => st.result === 1).length;
        down[f] = sts.filter((st) => st.result === -1).length;
      };
      lanes.push({ world, g: G, dolls: [], control, record });
    });
  } else if (LAND_KINDS.includes(kind)) {
    // 高さ1mの台の上に立ち、前へ跳び出して地面に着地する。
    // 着地の衝撃（地面が体を押し返す力）は、全身の「上下の勢い（運動量）」の変わり方から求める：
    //   押し返す力 ＝ 勢いの変化 ÷ 時間 ＋ 体重。0.04秒ごとにならして、いちばん大きい値を「体重の何倍」で記録する
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x0 = lane === 0 ? -1.4 : 1.4;
      // 台（動かない箱）
      const deck = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.45, LAND.h / 2, 0.35)),
        position: new CANNON.Vec3(x0, LAND.h / 2, LAND.z),
        material: groundMaterial,
      });
      world.addBody(deck);
      bodies.push({ lane, shape: "box", size: [0.9, LAND.h, 0.7], color: "#d9dee5" });
      tracked.push(deck);
      // マット（lmat の右）：厚さ40cmの体操用マット。上の板が、マットの押し返す力で支えられている
      const onMat = kind === "lmat" && lane === 1;
      let plate: CANNON.Body | null = null;
      const k = 60000;
      const c = 2500;
      const pm = 20;
      const natural = LAND.mat - 0.03;
      if (onMat) {
        plate = new CANNON.Body({
          mass: pm,
          shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.03, 0.6)),
          position: new CANNON.Vec3(x0, LAND.mat - 0.03, 0.8),
          material: groundMaterial,
        });
        plate.linearFactor.set(0, 1, 0);
        plate.angularFactor.set(0, 0, 0);
        world.addBody(plate);
        bodies.push({ lane, shape: "mat", size: [1.5, LAND.mat, 1.2] });
        tracked.push(plate);
      }
      const rd = addDoll(world, lane, lane, [x0, LAND.h, LAND.z + 0.17]);
      // ひざを曲げて受け止めるのは lknee の右だけ。ほかは、ひざをのばしたまま（関節を強く固める）
      const soft = kind === "lknee" && lane === 1;
      const parts = Object.values(rd.bodies);
      const M = parts.reduce((a, b) => a + b.mass, 0);
      const force = val(`force${lane}`);
      const peakV = val(`peak${lane}`);
      const landed = val(`landed${lane}`);
      // 勢いの記録（0.04秒前の値と比べる）
      const hist: number[] = [];
      const histT: number[] = [];
      let now = 0;
      let peak = 0;
      let touch = -1;
      let jumped = false;
      let lastTimes = 1;
      const feetY = () =>
        Math.min(lowestY(rd.bodies.footL, rd.sizes.footL), lowestY(rd.bodies.footR, rd.sizes.footR));
      const control = (t: number, dt: number) => {
        rd.balance = 1;
        if (plate) {
          // ばねの力（板が沈んだ分）とブレーキ。底（厚さ3cm）まで沈んだら、かたい床と同じ
          // ウレタンのマット：少し沈むと、ほぼ一定の力で押し返しながら つぶれていく（沈むほど少しずつ強く）
          const y = plate.position.y;
          const x = Math.max(0, natural - y);
          // もどるときは押し返す力が弱い（ウレタンはゆっくりもどる）ので、ほとんどはね返らない
          const back = plate.velocity.y > 0 ? 0.35 : 1;
          plate.force.y += x > 0 ? back * (2600 * (1 - Math.exp(-x / 0.03)) + 4000 * x) - 600 * plate.velocity.y : 0;
          plate.force.y += k * Math.min(0, natural - y);
          if (y < 0.06) {
            plate.force.y += 400000 * (0.06 - y) - 8000 * plate.velocity.y;
          }
        }
        if (t < LAND.t0) {
          rd.setPose(POSES.stand);
        } else if (t < LAND.t0 + 0.25) {
          // 軽くしゃがんでから、前へ跳び出す
          rd.setPose(POSES.stand, POSES.crouch, smooth((t - LAND.t0) / 0.2) * 0.35);
        } else {
          if (!jumped) {
            jumped = true;
            // 前へ 秒速2.4m・上へ 秒速1.4m で跳び出す（着地は台から約1.2m前、落ちる速さ 秒速約4.6m）
            for (const b of parts) {
              b.velocity.set(0, 1.4, 2.4);
              b.angularVelocity.set(0, 0, 0);
            }
          }
          if (touch < 0 && t > LAND.t0 + 0.4 && feetY() < (plate ? plate.position.y + 0.04 : 0.02)) {
            touch = t;
          }
          if (soft) {
            // 空中でひざを少し曲げておき、足がついたら、ひざ・股関節を曲げながら、ゆっくり受け止める
            rd.setStrength(touch < 0 ? 1 : 0.22, ["kneeL", "kneeR", "hipL", "hipR", "ankleL", "ankleR"]);
            rd.setPose(touch < 0 ? POSES.stand : POSES.crouch, touch < 0 ? POSES.land : undefined, touch < 0 ? 0.35 : 0);
          } else {
            // ひざをのばしたまま（脚の関節をかたく）
            rd.setStrength(4, ["kneeL", "kneeR", "hipL", "hipR", "ankleL", "ankleR"]);
            rd.setPose(POSES.stand);
          }
        }
        applyBalance(rd);
        // 全身の上下の勢い
        let P = 0;
        for (const b of parts) {
          P += b.mass * b.velocity.y;
        }
        now = t + dt;
        hist.push(P);
        histT.push(now);
        while (histT.length > 2 && now - histT[1] >= LAND.win) {
          hist.shift();
          histT.shift();
        }
        if (now - histT[0] >= LAND.win - 1e-6) {
          const F = (P - hist[0]) / (now - histT[0]) + M * G;
          const times = F / (M * G);
          if (touch >= 0 && t - touch < 0.5) {
            peak = Math.max(peak, times);
          }
          lastTimes = times;
        }
      };
      const record = (f: number) => {
        force[f] = Math.max(0, lastTimes);
        peakV[f] = peak;
        landed[f] = touch;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (STRAP_KINDS.includes(kind)) {
    // 急ブレーキの電車で立っている人。計算は「電車といっしょに動く目線」で、ブレーキ中は体に前向きの慣性力をかける。
    // 人は窓の方（カメラ）を向いて立つので、ブレーキの力は体の横向きにかかる。
    // 体をまっすぐに保つ力（balance）は弱くして、足の幅・つり革で倒れるかどうかが決まるようにする
    [0, 1].forEach((lane) => {
      const { world } = makeWorld(G);
      const x0 = lane === 0 ? -1.4 : 1.4;
      const rd = addDoll(world, lane, lane, [x0, 0, 0]);
      const wide = kind === "strfeet" && lane === 1;
      const hold = kind === "strhold" && lane === 1;
      const stance = wide ? POSES.wide : POSES.narrow;
      let grip: CANNON.PointToPointConstraint | null = null;
      let anchor: CANNON.Body | null = null;
      const moved = val(`moved${lane}`);
      const fell = val(`fell${lane}`);
      const speed = val(`v${lane}`);
      const pos = val(`pos${lane}`);
      const ax = val(`ax${lane}`);
      const ay = val(`ay${lane}`);
      const az = val(`az${lane}`);
      let x00 = NaN;
      let down = 0;
      let peak = 0;
      const control = (t: number) => {
        rd.balance = 0.12;
        rd.setPose(hold ? { ...stance, ...POSES.strap } : stance);
        applyBalance(rd);
        if (hold && !grip && t > 0.7) {
          // 上げた右手の先を、天井から下がったつり革（動かない点）につなぐ
          const arm = rd.bodies.lowerArmR;
          const local = new CANNON.Vec3(0, -rd.sizes.lowerArmR[1] / 2, 0);
          const p = arm.pointToWorldFrame(local);
          anchor = new CANNON.Body({ mass: 0, position: p.clone() });
          anchor.collisionResponse = false;
          world.addBody(anchor);
          grip = new CANNON.PointToPointConstraint(arm, local, anchor, new CANNON.Vec3(0, 0, 0), 900);
          world.addConstraint(grip);
        }
        // ブレーキ中（電車が止まるまで）は、体に前向きの慣性力
        if (t > STRAP.t0 && t < STRAP.t0 + STRAP.v / 3.6 / STRAP.a) {
          for (const b of Object.values(rd.bodies)) {
            b.force.x += b.mass * STRAP.a;
          }
        }
        if (Number.isNaN(x00) && t > STRAP.t0 - 0.05) {
          x00 = rd.bodies.pelvis.position.x;
        }
        if (rd.bodies.head.position.y < 1.0) {
          down = 1;
        }
      };
      const record = (f: number) => {
        const t = f / fps;
        const tb = Math.max(0, t - STRAP.t0);
        const v0 = STRAP.v / 3.6;
        const vb = Math.max(0, v0 - STRAP.a * tb);
        speed[f] = vb * 3.6;
        pos[f] = v0 * Math.min(t, STRAP.t0) + (v0 * v0 - vb * vb) / (2 * STRAP.a);
        // ブレーキのあと、腰がいちばん大きく動いた幅（ゆれの大きさ）
        // （となりの人が倒れきるブレーキ 2.5秒後までの値で止める）
        if (t <= STRAP.t0 + 2.5) {
          peak = Math.max(peak, Number.isNaN(x00) ? 0 : Math.abs(rd.bodies.pelvis.position.x - x00));
        }
        moved[f] = peak;
        fell[f] = down;
        ax[f] = anchor ? anchor.position.x : NaN;
        ay[f] = anchor ? anchor.position.y : NaN;
        az[f] = anchor ? anchor.position.z : NaN;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (TRAIN_KINDS.includes(kind)) {
    // 電車の中でジャンプする。計算は「電車といっしょに動く目線」で行い、電車が速くなる・遅くなるときは、
    // 体に「電車の加速と逆向きの力（慣性力）」をかける。電車の外の景色は、電車の進んだ距離だけ流す
    const setups: Record<string, { v: number; a: number }[]> = {
      trconst: [
        { v: 0, a: 0 },
        { v: 80, a: 0 },
      ],
      tracc: [
        { v: 80, a: 0 },
        // 発車して加速中（毎秒 時速3kmずつ速くなる ＝ 0.83m/s²）
        { v: 20, a: 3 / 3.6 },
      ],
      trbrake: [
        { v: 80, a: 0 },
        // 急ブレーキ中（毎秒 時速4.5kmずつ遅くなる ＝ 1.25m/s²）
        { v: 80, a: -4.5 / 3.6 },
      ],
    };
    setups[kind].forEach(({ v, a }, lane) => {
      const { world } = makeWorld(G);
      const x0 = lane === 0 ? -1.4 : 1.4;
      const rd = addDoll(world, lane, lane, [x0, 0, 0]);
      rd.balance = 1;
      // ジャンプの高さは約50cm（空中にいる時間 約0.6秒）。真上に跳ぶ
      let step = jumper(rd, 0.8, 3.4);
      let next = 0.8;
      const shift = val(`shift${lane}`);
      const pos = val(`pos${lane}`);
      const speed = val(`v${lane}`);
      const take = val(`take${lane}`);
      const land = val(`land${lane}`);
      let airborne = false;
      let takeX = NaN;
      let landX = NaN;
      const foot = () => (rd.bodies.footL.position.x + rd.bodies.footR.position.x) / 2;
      const control = (t: number) => {
        if (t > next + 3.0) {
          next += 3.0;
          step = jumper(rd, next, 3.4);
        }
        step(t);
        applyBalance(rd);
        // 慣性力（電車の加速と逆向き）
        if (a !== 0) {
          for (const b of Object.values(rd.bodies)) {
            b.force.x -= b.mass * a;
          }
        }
        const feet = Math.min(lowestY(rd.bodies.footL, rd.sizes.footL), lowestY(rd.bodies.footR, rd.sizes.footR));
        if (!airborne && feet > 0.03) {
          airborne = true;
          takeX = foot();
          landX = NaN;
        } else if (airborne && feet < 0.01) {
          airborne = false;
          landX = foot();
        }
      };
      const record = (f: number) => {
        const t = f / fps;
        pos[f] = (v / 3.6) * t + 0.5 * a * t * t;
        speed[f] = v + a * 3.6 * t;
        take[f] = takeX;
        land[f] = landX;
        shift[f] = Number.isNaN(landX) ? NaN : landX - takeX;
      };
      lanes.push({ world, g: G, dolls: [rd], control, record });
    });
  } else if (kind === "rwalk" || kind === "rrun") {
    // 雨の中、10m先のコンビニまで歩く（秒速1.5m）／走る（秒速5m）。
    // 足を前後に交互に出しながら、体全体を一定の速さで進ませる（地面の摩擦はゼロにして、足をすべらせて進む）
    const run = kind === "rrun";
    const V = run ? RAIN.run : RAIN.walk;
    const { world } = makeWorld(G);
    world.defaultContactMaterial.friction = 0;
    for (const m of world.contactmaterials) {
      m.friction = 0;
    }
    const rd = addDoll(world, 0, 0, [0, 0, 0], Math.PI / 2);
    rd.balance = 1.2;
    const start = 0.6;
    const hits = val("hits");
    const dist = val("dist");
    const top = val("top");
    const front = val("front");
    const period = run ? 0.36 : 0.62;
    lanes.push({
      world,
      g: G,
      dolls: [rd],
      control: (t) => {
        applyBalance(rd);
        const moving = t > start && rd.bodies.pelvis.position.x < RAIN.dist;
        if (moving) {
          // 足を交互に前へ（走るときは前かがみで、ひざを高く）
          const ph = ((t - start) / period) % 2;
          const a = ph < 1 ? POSES.step : POSES.stepL;
          const b = ph < 1 ? POSES.stepL : POSES.step;
          rd.setPose(run ? POSES.runA : a, run ? POSES.runB : b, 0);
          if (run) {
            rd.setPose(ph < 1 ? POSES.runA : POSES.runB, ph < 1 ? POSES.runB : POSES.runA, smooth(ph % 1));
          } else {
            rd.setPose(a, b, smooth(ph % 1));
          }
          for (const body of Object.values(rd.bodies)) {
            body.velocity.x += (V - body.velocity.x) * 0.08;
          }
        } else {
          rd.setPose(POSES.stand);
          for (const body of Object.values(rd.bodies)) {
            body.velocity.x *= 0.9;
          }
        }
      },
      record: (f) => {
        // ぬれた雨粒の数（目安）：上から当たる分 ＝ 雨の量 × 上から見た面積 × 外にいた時間、
        // 前から当たる分 ＝ 空気中の雨粒の数 × 前から見た面積 × 進んだ距離
        const t = f / fps;
        const d = Math.min(RAIN.dist, Math.max(0, rd.bodies.pelvis.position.x));
        const tin = Math.max(0, Math.min(t, start + RAIN.dist / V));
        const tTop = RAIN.n * RAIN.fall * RAIN.top * tin;
        const tFront = RAIN.n * RAIN.front * d;
        top[f] = tTop;
        front[f] = tFront;
        hits[f] = tTop + tFront;
        dist[f] = d;
      },
    });
  } else if (kind === "elevfall" || kind === "elevsafe" || kind === "elevfloat") {
    // エレベーターの中の人を「かごといっしょに動く目線」で計算する。
    // ロープが切れて自由落下している間は、かごの中は無重力（重力 0）。
    // elevfall：20階（60m）落ちて、時速約120km で地面にぶつかる（elevfloat は同じものを 1/4 のスローで）
    // elevsafe：0.4秒落ちたところで非常止めがレールをつかみ、1G で減速して止まる
    const safe = kind === "elevsafe";
    const { world } = makeWorld(G);
    const rd = addDoll(world, 0, 0, [0, 0, -0.1]);
    rd.balance = 0.6;
    const T0 = ELEV.snap;
    const Tf = safe ? 0.4 : Math.sqrt((2 * ELEV.height) / G);
    const vImpact = G * Tf;
    const brakeT = safe ? vImpact / G : 0;
    const fallY = val("fall");
    const speed = val("speed");
    const hit = val("hit");
    let impacted = false;
    let kicked = false;
    world.addBody(
      Object.assign(
        new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(1.0, 0.05, 0.8)), position: new CANNON.Vec3(0, 2.45, 0) }),
        {},
      ),
    );
    for (const [x, z, hx, hz] of [
      [-1.05, 0, 0.05, 0.8],
      [1.05, 0, 0.05, 0.8],
      [0, -0.85, 1.0, 0.05],
    ] as const) {
      world.addBody(new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, 1.2, hz)), position: new CANNON.Vec3(x, 1.2, z) }));
    }
    const slow = kind === "elevfloat" ? ELEV.slow : 1;
    lanes.push({
      world,
      g: G,
      speed: slow,
      dolls: [rd],
      control: (t) => {
        const free = t >= T0 && t < T0 + Tf;
        if (t < T0) {
          world.gravity.set(0, -G, 0);
        } else if (free) {
          // 自由落下：かごの中は無重力
          world.gravity.set(0, 0, 0);
          rd.balance = 0;
          if (!kicked) {
            // 床を押していた足の力が残って、少しだけ浮き上がる
            kicked = true;
            rd.addVelocity([0.05, 0.35, 0.02]);
            rd.bodies.torso.angularVelocity.set(0.25, 0.1, 0.15);
          }
          // 床をけってジャンプしようとする（足が床にふれていないので、手足が動くだけ）
          const s = t - T0;
          rd.setPose(s % 0.9 < 0.45 ? POSES.crouch : POSES.air);
        } else if (safe && t < T0 + Tf + brakeT) {
          // 非常止め：1G で減速 → かごの中は重力2倍
          world.gravity.set(0, -2 * G, 0);
          rd.setPose(POSES.land);
        } else {
          world.gravity.set(0, -G, 0);
          if (!safe && !impacted) {
            impacted = true;
            // 地面にぶつかった瞬間、かごは止まり、中の人は落ちていた速さのまま床へ
            rd.addVelocity([0, -vImpact * 0.35, 0]);
          }
          rd.setPose(safe ? POSES.stand : POSES.slip);
          if (safe) {
            rd.balance = Math.min(0.6, rd.balance + 0.002);
          }
        }
        applyBalance(rd);
      },
      record: (f) => {
        const t = (f / fps) * slow;
        const s = Math.min(Math.max(0, t - T0), Tf);
        let v = G * s;
        let y = 0.5 * G * s * s;
        if (safe && t > T0 + Tf) {
          const b = Math.min(t - T0 - Tf, brakeT);
          v = vImpact - G * b;
          y += vImpact * b - 0.5 * G * b * b;
        }
        if (!safe && t >= T0 + Tf) {
          v = 0;
        }
        fallY[f] = y;
        speed[f] = v * 3.6;
        hit[f] = !safe && t >= T0 + Tf ? t - T0 - Tf : -1;
      },
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
    const g = G * g2;
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

// g2 は重力くらべの右（奥）の世界の重力（1G に対する倍率）
export const simulate = (
  kind: SimKind,
  frames: number,
  fps: number,
  g2 = 0.5,
): SimResult => {
  const key = `${kind}:${frames}:${fps}:${g2}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const { lanes, bodies, tracked, values } = build(kind, frames, fps, g2);
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
      const sp = lane.speed ?? 1;
      const steps = Math.round(SUB * sp);
      for (let s = 0; s < steps; s++) {
        const t = (f / fps) * sp + s * dt;
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
      : kind === "wind"
        ? ["いまの空気", "空気が2倍"]
        : AIR_KINDS.includes(kind)
          ? ["いまの地球", "空気抵抗ゼロ"]
          : TINY_KINDS.includes(kind)
            ? ["身長175cm", "身長10cm（拡大）"]
            : BOUNCE_KINDS.includes(kind)
              ? ["ふつうの地面", "トランポリンの地面"]
              : X_KINDS.includes(kind)
                ? ["いまの地球", "摩擦10倍"]
                : kind === "ice"
                  ? ["いまの氷", "もしも 沈む氷"]
                  : kind === "trconst"
                    ? ["止まっている電車", "時速80kmの電車"]
                    : kind === "tracc"
                      ? ["一定の速さ", "加速中"]
                      : kind === "trbrake"
                        ? ["一定の速さ", "急ブレーキ中"]
                        : kind === "strfeet"
                          ? ["足をそろえる", "足を開く"]
                          : kind === "strhold"
                            ? ["何もつかまない", "つり革をつかむ"]
                            : kind === "lknee"
                              ? ["ひざをのばす", "ひざを曲げる"]
                              : kind === "lmat"
                                ? ["かたい床", "マットの上"]
                                : kind === "tbutter"
                                  ? ["バターあり", "バターなし"]
                                  : kind === "tflick"
                                    ? ["そっと押す", "はじく"]
        : ["いまの地球 1G", gravityLabel(g2)],
  };
  cache.set(key, result);
  return result;
};
