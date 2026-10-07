import * as CANNON from "cannon-es";

// 物理エンジン（cannon-es）で動かす人形。
// 関節は「筋肉」つき：目標の姿勢へ戻ろうとする力（強さは strength で変えられる）を持つので、
// 立つ・しゃがむ・跳ぶ・着地でひざを曲げる、といった動きができる。strength を 0 にすると、ぐにゃっと倒れる。

export type PartName =
  | "pelvis"
  | "torso"
  | "head"
  | "upperArmL"
  | "lowerArmL"
  | "upperArmR"
  | "lowerArmR"
  | "thighL"
  | "shinL"
  | "footL"
  | "thighR"
  | "shinR"
  | "footR";

export type JointName =
  | "waist"
  | "neck"
  | "shoulderL"
  | "elbowL"
  | "shoulderR"
  | "elbowR"
  | "hipL"
  | "kneeL"
  | "ankleL"
  | "hipR"
  | "kneeR"
  | "ankleR";

// 見た目の色分け（服・肌・靴）
export type Look = "shirt" | "pants" | "skin" | "shoe";

type PartDef = {
  name: PartName;
  // 箱の大きさ（幅・高さ・奥行き, m）。頭は球（半径 = size[0] / 2）
  size: [number, number, number];
  // 立ったときの中心（足もとが原点、+z が顔の向き）
  pos: [number, number, number];
  mass: number;
  look: Look;
};

// 身長およそ1.75m・体重およそ66kg
const PARTS: PartDef[] = [
  { name: "footL", size: [0.11, 0.08, 0.26], pos: [-0.1, 0.04, 0.05], mass: 1, look: "shoe" },
  { name: "footR", size: [0.11, 0.08, 0.26], pos: [0.1, 0.04, 0.05], mass: 1, look: "shoe" },
  { name: "shinL", size: [0.11, 0.42, 0.11], pos: [-0.1, 0.29, 0], mass: 4, look: "pants" },
  { name: "shinR", size: [0.11, 0.42, 0.11], pos: [0.1, 0.29, 0], mass: 4, look: "pants" },
  { name: "thighL", size: [0.14, 0.42, 0.14], pos: [-0.1, 0.71, 0], mass: 7, look: "pants" },
  { name: "thighR", size: [0.14, 0.42, 0.14], pos: [0.1, 0.71, 0], mass: 7, look: "pants" },
  { name: "pelvis", size: [0.32, 0.16, 0.2], pos: [0, 0.99, 0], mass: 10, look: "pants" },
  { name: "torso", size: [0.38, 0.46, 0.22], pos: [0, 1.3, 0], mass: 20, look: "shirt" },
  { name: "head", size: [0.24, 0.24, 0.24], pos: [0, 1.67, 0], mass: 5, look: "skin" },
  { name: "upperArmL", size: [0.09, 0.3, 0.09], pos: [-0.25, 1.37, 0], mass: 2, look: "shirt" },
  { name: "upperArmR", size: [0.09, 0.3, 0.09], pos: [0.25, 1.37, 0], mass: 2, look: "shirt" },
  { name: "lowerArmL", size: [0.08, 0.28, 0.08], pos: [-0.25, 1.08, 0], mass: 1.5, look: "skin" },
  { name: "lowerArmR", size: [0.08, 0.28, 0.08], pos: [0.25, 1.08, 0], mass: 1.5, look: "skin" },
];

type JointDef = {
  name: JointName;
  parent: PartName;
  child: PartName;
  // 関節の位置（立った姿勢で）
  at: [number, number, number];
  // 曲がる範囲（円すいの開き・ねじれ, ラジアン）
  cone: number;
  twist: number;
  // 筋肉の強さ（最大トルク N·m）
  torque: number;
};

const JOINTS: JointDef[] = [
  { name: "waist", parent: "pelvis", child: "torso", at: [0, 1.07, 0], cone: 0.7, twist: 0.5, torque: 520 },
  { name: "neck", parent: "torso", child: "head", at: [0, 1.55, 0], cone: 0.6, twist: 0.6, torque: 70 },
  { name: "shoulderL", parent: "torso", child: "upperArmL", at: [-0.25, 1.52, 0], cone: 3.0, twist: 0.8, torque: 90 },
  { name: "shoulderR", parent: "torso", child: "upperArmR", at: [0.25, 1.52, 0], cone: 3.0, twist: 0.8, torque: 90 },
  { name: "elbowL", parent: "upperArmL", child: "lowerArmL", at: [-0.25, 1.22, 0], cone: 2.4, twist: 0.3, torque: 50 },
  { name: "elbowR", parent: "upperArmR", child: "lowerArmR", at: [0.25, 1.22, 0], cone: 2.4, twist: 0.3, torque: 50 },
  { name: "hipL", parent: "pelvis", child: "thighL", at: [-0.1, 0.92, 0], cone: 2.0, twist: 0.4, torque: 600 },
  { name: "hipR", parent: "pelvis", child: "thighR", at: [0.1, 0.92, 0], cone: 2.0, twist: 0.4, torque: 600 },
  { name: "kneeL", parent: "thighL", child: "shinL", at: [-0.1, 0.5, 0], cone: 2.3, twist: 0.2, torque: 600 },
  { name: "kneeR", parent: "thighR", child: "shinR", at: [0.1, 0.5, 0], cone: 2.3, twist: 0.2, torque: 600 },
  { name: "ankleL", parent: "shinL", child: "footL", at: [-0.1, 0.08, 0], cone: 0.7, twist: 0.2, torque: 260 },
  { name: "ankleR", parent: "shinR", child: "footR", at: [0.1, 0.08, 0], cone: 0.7, twist: 0.2, torque: 260 },
];

// 姿勢：関節ごとの曲げ角（親に対する、x→y→z の順のオイラー角, ラジアン）。書かない関節はまっすぐ
// 向きの決まり（顔は +z）：
//  - 下を向いた部位（腕・脚）は x がマイナスで前へ、プラスで後ろへ（ひざ・ひじは、ひざがプラス・ひじがマイナスで曲がる）
//  - 上を向いた部位（胴体・頭）は x がプラスで前かがみ
//  - z は左右に開く向き（左はマイナス、右はプラスで外へ）
export type Pose = Partial<Record<JointName, [number, number, number]>>;

export const POSES: Record<string, Pose> = {
  stand: {
    shoulderL: [0, 0, -0.12],
    shoulderR: [0, 0, 0.12],
    elbowL: [-0.25, 0, 0],
    elbowR: [-0.25, 0, 0],
  },
  // 跳ぶ前にしゃがんで腕をうしろへ
  crouch: {
    waist: [0.5, 0, 0],
    hipL: [-1.2, 0, 0],
    hipR: [-1.2, 0, 0],
    kneeL: [1.6, 0, 0],
    kneeR: [1.6, 0, 0],
    ankleL: [-0.4, 0, 0],
    ankleR: [-0.4, 0, 0],
    shoulderL: [0.9, 0, -0.2],
    shoulderR: [0.9, 0, 0.2],
    elbowL: [-0.3, 0, 0],
    elbowR: [-0.3, 0, 0],
  },
  // 空中：バンザイ
  air: {
    shoulderL: [-2.7, 0, -0.35],
    shoulderR: [-2.7, 0, 0.35],
    elbowL: [-0.15, 0, 0],
    elbowR: [-0.15, 0, 0],
    hipL: [-0.15, 0, 0],
    hipR: [-0.15, 0, 0],
    kneeL: [0.3, 0, 0],
    kneeR: [0.3, 0, 0],
  },
  // 着地：ひざを曲げて受け止める
  land: {
    waist: [0.25, 0, 0],
    hipL: [-0.7, 0, 0],
    hipR: [-0.7, 0, 0],
    kneeL: [1.0, 0, 0],
    kneeR: [1.0, 0, 0],
    ankleL: [-0.3, 0, 0],
    ankleR: [-0.3, 0, 0],
    shoulderL: [-0.9, 0, -0.5],
    shoulderR: [-0.9, 0, 0.5],
    elbowL: [-0.6, 0, 0],
    elbowR: [-0.6, 0, 0],
  },
  // 投げる前：右腕を後ろ上へ
  windup: {
    waist: [0, 0.5, 0],
    shoulderR: [2.3, 0, 0.3],
    elbowR: [-0.9, 0, 0],
    shoulderL: [-1.2, 0, -0.3],
    hipL: [-0.3, 0, 0],
    kneeL: [0.2, 0, 0],
  },
  // 投げたあと：右腕を前へ振り抜く
  throw: {
    waist: [0.25, -0.5, 0],
    shoulderR: [-1.4, 0, 0.1],
    elbowR: [-0.1, 0, 0],
    shoulderL: [0.6, 0, -0.3],
    hipR: [-0.3, 0, 0],
    kneeR: [0.2, 0, 0],
  },
  // 足をすべらせて、手をばたつかせる
  slip: {
    waist: [-0.3, 0, 0],
    shoulderL: [-2.2, 0, -1.0],
    shoulderR: [-2.2, 0, 1.0],
    elbowL: [-0.6, 0, 0],
    elbowR: [-0.6, 0, 0],
    hipL: [-1.0, 0, 0],
    hipR: [-0.4, 0, 0],
  },
  // 箱を両手で押す（左足を後ろに引いて踏んばる）
  push: {
    waist: [0.25, 0, 0],
    shoulderL: [-1.45, 0, -0.1],
    shoulderR: [-1.45, 0, 0.1],
    elbowL: [-0.2, 0, 0],
    elbowR: [-0.2, 0, 0],
    hipL: [0.35, 0, 0],
    kneeL: [0.15, 0, 0],
    hipR: [-0.25, 0, 0],
    kneeR: [0.3, 0, 0],
    ankleR: [-0.05, 0, 0],
  },
  // 一歩ふみ出す途中：右ひざを上げる
  swing: {
    waist: [0.08, 0, 0],
    hipR: [-0.75, 0, 0],
    kneeR: [1.0, 0, 0],
    ankleR: [-0.1, 0, 0],
    hipL: [0.1, 0, 0],
    shoulderL: [-0.4, 0, -0.12],
    shoulderR: [0.3, 0, 0.12],
    elbowL: [-0.4, 0, 0],
    elbowR: [-0.25, 0, 0],
  },
  // 右足を前へ一歩ふみ出す
  step: {
    waist: [0.1, 0, 0],
    hipR: [-0.6, 0, 0],
    kneeR: [0.15, 0, 0],
    ankleR: [0.45, 0, 0],
    hipL: [0.35, 0, 0],
    kneeL: [0.1, 0, 0],
    ankleL: [-0.45, 0, 0],
    shoulderL: [-0.5, 0, -0.12],
    shoulderR: [0.4, 0, 0.12],
    elbowL: [-0.4, 0, 0],
    elbowR: [-0.25, 0, 0],
  },
  // 足を少し開いて立つ
  stance: {
    hipL: [0, 0, -0.18],
    hipR: [0, 0, 0.18],
    ankleL: [0, 0, 0.18],
    ankleR: [0, 0, -0.18],
    shoulderL: [0, 0, -0.25],
    shoulderR: [0, 0, 0.25],
    elbowL: [-0.25, 0, 0],
    elbowR: [-0.25, 0, 0],
  },
};

// 関節のサーボ：円すい・ねじれの可動域に加えて、目標の姿勢へ「回転の速さ」で引き戻す
// （速度で制御するので、強くしても計算が暴れにくい）
class ServoJoint extends CANNON.ConeTwistConstraint {
  motors: CANNON.RotationalMotorEquation[];
  target = new CANNON.Quaternion();
  strength = 1;
  baseTorque: number;
  gain = 14;

  constructor(
    a: CANNON.Body,
    b: CANNON.Body,
    opts: ConstructorParameters<typeof CANNON.ConeTwistConstraint>[2],
    torque: number,
  ) {
    super(a, b, opts);
    this.baseTorque = torque;
    this.motors = [0, 1, 2].map(() => new CANNON.RotationalMotorEquation(a, b, torque));
    this.equations.push(...this.motors);
  }

  update() {
    super.update();
    const a = this.bodyA;
    const b = this.bodyB;
    // 目標の向き（ワールド）= 親の向き × 目標の曲げ
    const want = a.quaternion.mult(this.target);
    // ずれ = want × b⁻¹（ワールドでの回転）
    const err = want.mult(b.quaternion.conjugate());
    if (err.w < 0) {
      err.x = -err.x;
      err.y = -err.y;
      err.z = -err.z;
      err.w = -err.w;
    }
    const s = Math.sqrt(err.x * err.x + err.y * err.y + err.z * err.z);
    const angle = 2 * Math.atan2(s, err.w);
    const k = s > 1e-9 ? angle / s : 2;
    const e = [err.x * k, err.y * k, err.z * k];
    const axes = [
      new CANNON.Vec3(1, 0, 0),
      new CANNON.Vec3(0, 1, 0),
      new CANNON.Vec3(0, 0, 1),
    ];
    // ソルバーの上限は「1ステップあたりの力積」なので、トルク × 時間刻み にする
    const dt = a.world?.dt || 1 / 240;
    const force = this.baseTorque * this.strength * dt;
    this.motors.forEach((m, i) => {
      m.axisA.copy(axes[i]);
      m.axisB.copy(axes[i]);
      // a·(ωA − ωB) = target → 子が e の向きに回る
      m.targetVelocity = -this.gain * e[i];
      m.maxForce = force;
      m.minForce = -force;
      m.enabled = force > 0;
    });
  }
}

export type Ragdoll = {
  bodies: Record<PartName, CANNON.Body>;
  joints: Record<JointName, ServoJoint>;
  looks: Record<PartName, Look>;
  sizes: Record<PartName, [number, number, number]>;
  yaw: number;
  setPose: (pose: Pose, blend?: Pose, t?: number) => void;
  setStrength: (s: number, only?: JointName[]) => void;
  // 体をまっすぐ立たせる力（背中に棒を入れるイメージ）。0 で無効
  balance: number;
  // 全身に同じ速度を足す（ジャンプ・突き飛ばし）
  addVelocity: (v: [number, number, number]) => void;
};

const toQuat = ([x, y, z]: [number, number, number]) => {
  const q = new CANNON.Quaternion();
  q.setFromEuler(x, y, z, "XYZ");
  return q;
};

// 足もとの位置 origin・向き yaw（0 で +z を向く）で人形を作る
export const createRagdoll = (
  world: CANNON.World,
  origin: [number, number, number],
  yaw = 0,
  material?: CANNON.Material,
): Ragdoll => {
  const rot = new CANNON.Quaternion();
  rot.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
  const place = (p: [number, number, number]) => {
    const v = rot.vmult(new CANNON.Vec3(...p));
    return new CANNON.Vec3(v.x + origin[0], v.y + origin[1], v.z + origin[2]);
  };
  const bodies = {} as Record<PartName, CANNON.Body>;
  const looks = {} as Record<PartName, Look>;
  const sizes = {} as Record<PartName, [number, number, number]>;
  for (const p of PARTS) {
    const shape =
      p.name === "head"
        ? new CANNON.Sphere(p.size[0] / 2)
        : new CANNON.Box(new CANNON.Vec3(p.size[0] / 2, p.size[1] / 2, p.size[2] / 2));
    const body = new CANNON.Body({
      mass: p.mass,
      shape,
      position: place(p.pos),
      quaternion: rot.clone(),
      material,
      linearDamping: 0.01,
      angularDamping: 0.08,
    });
    // 人形はグループ4（ボールなど、人に当たらない物と分けるため）
    body.collisionFilterGroup = 4;
    world.addBody(body);
    bodies[p.name] = body;
    looks[p.name] = p.look;
    sizes[p.name] = p.size;
  }
  const joints = {} as Record<JointName, ServoJoint>;
  for (const j of JOINTS) {
    const a = bodies[j.parent];
    const b = bodies[j.child];
    const at = place(j.at);
    const pivotA = a.pointToLocalFrame(at);
    const pivotB = b.pointToLocalFrame(at);
    const c = new ServoJoint(
      a,
      b,
      {
        pivotA,
        pivotB,
        axisA: new CANNON.Vec3(0, 1, 0),
        axisB: new CANNON.Vec3(0, 1, 0),
        angle: j.cone,
        twistAngle: j.twist,
        collideConnected: false,
      },
      j.torque,
    );
    world.addConstraint(c);
    joints[j.name] = c;
  }
  // 腕と胴体・両足どうしなど、近くの部位がぶつかり合って暴れないように
  const ignore: [PartName, PartName][] = [
    ["upperArmL", "torso"],
    ["upperArmR", "torso"],
    ["lowerArmL", "torso"],
    ["lowerArmR", "torso"],
    ["lowerArmL", "pelvis"],
    ["lowerArmR", "pelvis"],
    ["lowerArmL", "thighL"],
    ["lowerArmR", "thighR"],
    ["thighL", "thighR"],
    ["shinL", "shinR"],
    ["footL", "footR"],
    ["thighL", "torso"],
    ["thighR", "torso"],
    ["head", "upperArmL"],
    ["head", "upperArmR"],
  ];
  for (const [p, q] of ignore) {
    world.addConstraint(
      Object.assign(
        new CANNON.Constraint(bodies[p], bodies[q], { collideConnected: false }),
        { update: () => {} },
      ),
    );
  }

  const rd: Ragdoll = {
    bodies,
    joints,
    looks,
    sizes,
    yaw,
    balance: 1,
    setPose: (pose, blend, t = 0) => {
      for (const j of JOINTS) {
        const a = pose[j.name] ?? [0, 0, 0];
        const b = blend ? (blend[j.name] ?? [0, 0, 0]) : a;
        const mix: [number, number, number] = [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
        ];
        joints[j.name].target.copy(toQuat(mix));
      }
    },
    setStrength: (s, only) => {
      for (const j of JOINTS) {
        if (!only || only.includes(j.name)) {
          joints[j.name].strength = s;
        }
      }
    },
    addVelocity: (v) => {
      for (const b of Object.values(bodies)) {
        b.velocity.x += v[0];
        b.velocity.y += v[1];
        b.velocity.z += v[2];
      }
    },
  };
  rd.setPose(POSES.stand);
  return rd;
};

// 体幹（骨盤と胴体）をまっすぐに保つ力。balance が大きいほど倒れにくい
export const applyBalance = (rd: Ragdoll) => {
  if (rd.balance <= 0) {
    return;
  }
  const up = new CANNON.Quaternion();
  up.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rd.yaw);
  for (const name of ["pelvis", "torso"] as PartName[]) {
    const b = rd.bodies[name];
    const err = up.mult(b.quaternion.conjugate());
    if (err.w < 0) {
      err.x = -err.x;
      err.y = -err.y;
      err.z = -err.z;
      err.w = -err.w;
    }
    const kp = 2200 * rd.balance;
    const kd = 140 * rd.balance;
    b.torque.x += kp * 2 * err.x - kd * b.angularVelocity.x;
    b.torque.y += kp * 2 * err.y - kd * b.angularVelocity.y;
    b.torque.z += kp * 2 * err.z - kd * b.angularVelocity.z;
  }
};

export const ragdollParts = PARTS.map((p) => p.name);
