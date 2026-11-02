import * as CANNON from "cannon-es";
import { applyBalance, createRagdoll, PartName, Pose, POSES, Ragdoll, RAGDOLL_JOINTS, RAGDOLL_PARTS } from "./ragdoll";

// 「もし人間が動物の能力を持っていたら？」の場面。
// 走る・登る・つつく などの決まった動きは、関節の角度から体の形を計算して動かす（順運動学）。
// 転ぶ・落ちる・レンガが飛び散る などは、物理エンジン（cannon-es）で計算する。
export type AnimalMode = "cheetah" | "beetle" | "gecko" | "cat" | "falcon" | "chameleon" | "shrimp" | "basilisk" | "woodpecker";

export type AnimalObject = {
  shape: "box" | "sphere" | "bus" | "car" | "brick" | "apple" | "post" | "tree" | "rope";
  size: [number, number, number];
  color?: string;
};

export type AnimalEvent = { t: number; kind: "flash" | "impact" | "launch" | "splash" | "chip"; v: number; pos: [number, number, number] };

export type AnimalResult = {
  mode: AnimalMode;
  frames: number;
  fps: number;
  figures: number;
  parts: { name: PartName; size: [number, number, number]; look: string; fig: number }[];
  // frames × (人数 × 13部位) × 7
  doll: Float32Array;
  objects: AnimalObject[];
  // frames × 物の数 × 7
  obj: Float32Array;
  values: Record<string, Float32Array>;
  events: AnimalEvent[];
};

const G = 9.8;
const PN = RAGDOLL_PARTS.map((p) => p.name);
const NP = PN.length;
const REST = Object.fromEntries(RAGDOLL_PARTS.map((p) => [p.name, new CANNON.Vec3(...p.pos)])) as Record<PartName, CANNON.Vec3>;

const eul = ([x, y, z]: [number, number, number]) => {
  const q = new CANNON.Quaternion();
  q.setFromEuler(x, y, z, "XYZ");
  return q;
};
const axisQ = (ax: [number, number, number], a: number) => {
  const q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(...ax), a);
  return q;
};

export type Xf = { p: CANNON.Vec3; q: CANNON.Quaternion };

// 骨盤の位置と向き（root）と姿勢（関節の角度）から、13部位の位置と向きを計算する
export const fk = (rootP: CANNON.Vec3, rootQ: CANNON.Quaternion, pose: Pose): Record<PartName, Xf> => {
  const out = {} as Record<PartName, Xf>;
  out.pelvis = { p: rootP.clone(), q: rootQ.clone() };
  for (const j of RAGDOLL_JOINTS) {
    const par = out[j.parent];
    const ang = pose[j.name] ?? [0, 0, 0];
    const q = par.q.mult(eul(ang));
    const J = new CANNON.Vec3(...j.at);
    const jw = par.p.vadd(par.q.vmult(J.vsub(REST[j.parent])));
    const p = jw.vadd(q.vmult(REST[j.child].vsub(J)));
    out[j.child] = { p, q };
  }
  return out;
};

// 2つの姿勢をまぜる（u = 0 で a、1 で b）
const mix = (a: Pose, b: Pose, u: number): Pose => {
  const r: Pose = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>;
  keys.forEach((k) => {
    const x = a[k] ?? [0, 0, 0];
    const y = b[k] ?? [0, 0, 0];
    r[k] = [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u];
  });
  return r;
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// 走る姿勢（phase は 0〜1 でひと回り、k は走りの強さ 0〜1）
const runPose = (phase: number, k: number): Pose => {
  const f = phase * Math.PI * 2;
  const s = Math.sin(f);
  const c = Math.cos(f);
  return {
    waist: [0.3 * k, 0, 0],
    neck: [-0.25 * k, 0, 0],
    hipL: [-0.15 - 1.0 * k * s, 0, 0],
    hipR: [-0.15 + 1.0 * k * s, 0, 0],
    kneeL: [0.25 + 1.5 * k * Math.max(0, c), 0, 0],
    kneeR: [0.25 + 1.5 * k * Math.max(0, -c), 0, 0],
    ankleL: [-0.2 * k, 0, 0],
    ankleR: [-0.2 * k, 0, 0],
    shoulderL: [1.0 * k * s, 0, -0.15],
    shoulderR: [-1.0 * k * s, 0, 0.15],
    elbowL: [-1.4 * k - 0.25, 0, 0],
    elbowR: [-1.4 * k - 0.25, 0, 0],
  };
};

// 記録係：人と物の位置を、フレームごとに書きこむ
class Rec {
  doll: Float32Array;
  obj: Float32Array;
  values: Record<string, Float32Array> = {};
  events: AnimalEvent[] = [];
  objects: AnimalObject[] = [];
  constructor(public frames: number, public figures: number, nObj: number) {
    this.doll = new Float32Array(frames * figures * NP * 7);
    this.obj = new Float32Array(frames * nObj * 7);
  }
  val(name: string) {
    return (this.values[name] = this.values[name] ?? new Float32Array(this.frames));
  }
  setFig(f: number, fig: number, x: Record<PartName, Xf>) {
    PN.forEach((nm, i) => {
      const o = ((f * this.figures + fig) * NP + i) * 7;
      const { p, q } = x[nm];
      this.doll.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], o);
    });
  }
  setFigBodies(f: number, fig: number, rd: Ragdoll) {
    PN.forEach((nm, i) => {
      const b = rd.bodies[nm];
      const o = ((f * this.figures + fig) * NP + i) * 7;
      this.doll.set([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], o);
    });
  }
  setObj(f: number, k: number, p: CANNON.Vec3 | [number, number, number], q?: CANNON.Quaternion) {
    const n = this.objects.length;
    const o = (f * n + k) * 7;
    const pp = Array.isArray(p) ? p : [p.x, p.y, p.z];
    this.obj.set([pp[0], pp[1], pp[2], q?.x ?? 0, q?.y ?? 0, q?.z ?? 0, q?.w ?? 1], o);
  }
}

// 計算した姿勢のまま、物理の人形に入れかえる（そこから先は物理で動く）
const toRagdoll = (world: CANNON.World, now: Record<PartName, Xf>, prev: Record<PartName, Xf>, dt: number): Ragdoll => {
  const rd = createRagdoll(world, [0, 0, 0], 0);
  PN.forEach((nm) => {
    const b = rd.bodies[nm];
    b.position.copy(now[nm].p);
    b.quaternion.copy(now[nm].q);
    b.velocity.copy(now[nm].p.vsub(prev[nm].p).scale(1 / dt));
  });
  return rd;
};

const makeWorld = (friction = 0.7) => {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 25;
  world.defaultContactMaterial.friction = friction;
  world.defaultContactMaterial.restitution = 0.05;
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);
  return world;
};

const YAW_X = axisQ([0, 1, 0], Math.PI / 2); // 顔を +x へ向ける

// ---- チーター：時速93kmで走る（車と競走 → 止まれずに転んで段ボールの山へ） ----
export const CHEETAH = { vmax: 25.9, acc: 8.6, start: 1.0, trip: 8.6, car: 16.7, boxes: 172 };
const cheetah = (frames: number, fps: number): AnimalResult => {
  const C = CHEETAH;
  const nBox = 18;
  const rec = new Rec(frames, 1, 1 + nBox);
  rec.objects.push({ shape: "car", size: [4, 0.9, 1.7], color: "#e8333a" });
  const world = makeWorld(0.8);
  const boxes: CANNON.Body[] = [];
  for (let i = 0; i < nBox; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const b = new CANNON.Body({ mass: 6, shape: new CANNON.Box(new CANNON.Vec3(0.3, 0.3, 0.3)), position: new CANNON.Vec3(C.boxes + row * 0.05, 0.3 + row * 0.6, -1.5 + col * 0.62 + (row % 2) * 0.3) });
    world.addBody(b);
    boxes.push(b);
    rec.objects.push({ shape: "box", size: [0.6, 0.6, 0.6], color: "#c8925a" });
  }
  const speed = rec.val("speed");
  const dist = rec.val("dist");
  const t100 = rec.val("t100");
  let x = 0;
  let v = 0;
  let phase = 0;
  let rd: Ragdoll | null = null;
  let prev = fk(new CANNON.Vec3(0, 0.99, 0), YAW_X, POSES.stand);
  let hit100 = -1;
  const sub = 8;
  const dt = 1 / (fps * sub);
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f * sub + s) * dt;
      if (!rd) {
        if (t > C.start) v = Math.min(C.vmax, v + C.acc * dt);
        x += v * dt;
        if (hit100 < 0 && x >= 100) hit100 = t - C.start;
        const k = Math.min(1, v / 8);
        // 歩幅は速いほど大きく、足の回転も速くなる（最高で1秒に約4.5歩）
        phase += dt * (v > 0 ? 1.2 + v * 0.13 : 0);
        const bob = 0.05 * Math.abs(Math.cos(phase * Math.PI * 2)) * k;
        const root = new CANNON.Vec3(x, 0.99 - 0.1 * k + bob, 0);
        const rq = YAW_X.mult(axisQ([1, 0, 0], 0.22 * k));
        const pose = v > 0 ? runPose(phase, k) : POSES.stand;
        const now = fk(root, rq, pose);
        if (t >= C.trip) {
          // つまずく：ここからは物理。足が引っかかって前へ投げ出される
          rd = toRagdoll(world, now, prev, dt);
          rd.balance = 0;
          rd.setStrength(0.25);
          rd.setPose(POSES.slip);
          rd.bodies.footL.velocity.x *= 0.2;
          rd.bodies.footR.velocity.x *= 0.2;
          rd.bodies.torso.velocity.y += 2.5;
          rd.bodies.head.velocity.y += 2.5;
          rec.events.push({ t, kind: "launch", v: v, pos: [x, 1, 0] });
        }
        prev = now;
      } else {
        rd.setPose(POSES.slip);
      }
      world.step(dt);
    }
    const t = f / fps;
    const carX = -15 + C.car * t;
    rec.setObj(f, 0, [carX, 0.7, -2.6]);
    boxes.forEach((b, i) => rec.setObj(f, 1 + i, b.position, b.quaternion));
    if (rd) {
      rec.setFigBodies(f, 0, rd);
      speed[f] = Math.abs(rd.bodies.pelvis.velocity.x) * 3.6;
      dist[f] = rd.bodies.pelvis.position.x;
    } else {
      rec.setFig(f, 0, prev);
      speed[f] = v * 3.6;
      dist[f] = x;
    }
    t100[f] = hit100;
  }
  // 段ボールに当たった瞬間
  const hitF = Array.from({ length: frames }, (_, f) => f).find((f) => rec.values.dist[f] > C.boxes - 1.2);
  if (hitF !== undefined) rec.events.push({ t: hitF / fps, kind: "impact", v: 15, pos: [C.boxes, 0.6, 0] });
  return finish("cheetah", rec, frames, fps);
};

// ---- フンコロガシ：体重の1141倍（約75トン）を引っぱる。バス6台をロープで引く ----
export const BEETLE = { buses: 6, start: 1.5, v: 1.3 };
const beetle = (frames: number, fps: number): AnimalResult => {
  const B = BEETLE;
  const rec = new Rec(frames, 1, B.buses + 1);
  for (let i = 0; i < B.buses; i++) rec.objects.push({ shape: "bus", size: [11, 3, 2.5], color: ["#2f8bff", "#ff8a2f", "#2fc46b", "#b25cff", "#ffd23a", "#ff4a3d"][i] });
  rec.objects.push({ shape: "rope", size: [1, 0.04, 0.04] });
  let x = 0;
  let phase = 0;
  let busX = -4.5 - 5.5;
  const sp = rec.val("speed");
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    // ロープがぴんと張ると、バスが動き出す（少しおくれて、ぐっと）
    const go = smooth((t - B.start) / 0.8);
    const v = B.v * go;
    x += v / fps;
    phase += (v * 0.9) / fps;
    const pull = smooth((t - B.start + 0.6) / 0.6);
    const pose: Pose = mix(POSES.stand, { ...runPose(phase, 0.45), waist: [0.55, 0, 0], neck: [-0.4, 0, 0], shoulderL: [1.1, 0, -0.25], shoulderR: [1.1, 0, 0.25], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] }, pull);
    const root = new CANNON.Vec3(x, 0.93, 0);
    const rq = YAW_X.mult(axisQ([1, 0, 0], 0.35 * pull));
    const now = fk(root, rq, pose);
    rec.setFig(f, 0, now);
    const tug = t > B.start ? 0.12 * Math.sin((t - B.start) * 9) * Math.exp(-(t - B.start) * 3) : 0;
    busX = x - 4.5 - 5.5 + tug;
    for (let i = 0; i < B.buses; i++) rec.setObj(f, i, [busX - i * 12, 1.6, 0]);
    // ロープ：手から先頭のバスの前まで（x 方向の中心と長さ）
    const hand = now.lowerArmR.p;
    const front = busX + 5.5;
    rec.setObj(f, B.buses, [(hand.x + front) / 2, (hand.y + 1.0) / 2, 0], axisQ([0, 0, 1], Math.atan2(hand.y - 1.0, hand.x - front)));
    rec.val("ropeLen")[f] = Math.hypot(hand.x - front, hand.y - 1.0);
    sp[f] = v * 3.6;
  }
  rec.events.push({ t: B.start, kind: "impact", v: 6, pos: [busX, 0.5, 0] });
  return finish("beetle", rec, frames, fps);
};

// ---- ヤモリ：手と足の裏で壁にはりつく。ビルの壁を登る（ふつうの人は下で見上げる） ----
export const GECKO = { wallZ: -6 + 5, x: -6.5, start: 1.2, v: 1.1 };
const gecko = (frames: number, fps: number): AnimalResult => {
  const W = GECKO;
  const rec = new Rec(frames, 2, 0);
  const h = rec.val("height");
  let y = 0.99;
  let phase = 0;
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    const k = smooth((t - W.start) / 0.6);
    const v = W.v * k;
    y += v / fps;
    phase += (v * 0.8) / fps;
    const s = Math.sin(phase * Math.PI * 2);
    // 壁に向かって（-z を向いて）、体を壁にそわせる。手と足を交互に上げる
    const climb: Pose = {
      shoulderL: [-2.6 - 0.4 * s, 0, -0.35],
      shoulderR: [-2.6 + 0.4 * s, 0, 0.35],
      elbowL: [-0.5 - 0.4 * Math.max(0, s), 0, 0],
      elbowR: [-0.5 - 0.4 * Math.max(0, -s), 0, 0],
      hipL: [-0.6 + 0.5 * s, 0, -0.35],
      hipR: [-0.6 - 0.5 * s, 0, 0.35],
      kneeL: [1.2 - 0.5 * s, 0, 0],
      kneeR: [1.2 + 0.5 * s, 0, 0],
      ankleL: [-0.6, 0, 0],
      ankleR: [-0.6, 0, 0],
      neck: [-0.4, 0, 0],
    };
    const pose = mix(POSES.stand, climb, k);
    const rq = axisQ([0, 1, 0], Math.PI);
    const now = fk(new CANNON.Vec3(W.x, y, W.wallZ + 0.22 + 0.12 * k), rq, pose);
    rec.setFig(f, 0, now);
    h[f] = Math.max(0, y - 0.99);
    // ふつうの人：下で見上げる
    const look: Pose = { ...POSES.stand, neck: [-0.5, 0, 0], waist: [-0.15, 0, 0] };
    rec.setFig(f, 1, fk(new CANNON.Vec3(W.x + 2.6, 0.99, W.wallZ + 3.2), axisQ([0, 1, 0], Math.PI - 0.5), look));
  }
  return finish("gecko", rec, frames, fps);
};

// ---- ネコ：さかさまに落ちても、空中で体をひねって足から着地（左はふつうの人） ----
export const CAT = { h: 9, drop: 1.0 };
const cat = (frames: number, fps: number): AnimalResult => {
  const rec = new Rec(frames, 2, 0);
  const world = makeWorld(0.8);
  const dolls: Ragdoll[] = [-1.3, 1.3].map((x) => {
    const rd = createRagdoll(world, [x, 0, 0], 0);
    // あおむけ（せなかが下）で、高さ9mに持ち上げる
    const R = axisQ([1, 0, 0], -Math.PI / 2);
    for (const b of Object.values(rd.bodies)) {
      const rel = b.position.vsub(new CANNON.Vec3(x, 0.9, 0));
      const r = R.vmult(rel);
      b.position.set(x + r.x, CAT.h + r.y, r.z);
      b.quaternion.copy(R.mult(b.quaternion));
      b.type = CANNON.Body.KINEMATIC;
    }
    rd.balance = 0;
    return rd;
  });
  const sp = rec.val("speed");
  const sub = 10;
  const dt = 1 / (fps * sub);
  let released = false;
  const landT = [-1, -1];
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f * sub + s) * dt;
      if (!released && t >= CAT.drop) {
        released = true;
        dolls.forEach((rd) =>
          Object.values(rd.bodies).forEach((b) => {
            b.type = CANNON.Body.DYNAMIC;
            b.updateMassProperties();
            b.velocity.setZero();
          }),
        );
      }
      dolls.forEach((rd, i) => {
        const fall = t - CAT.drop;
        const feet = Math.min(rd.bodies.footL.position.y, rd.bodies.footR.position.y);
        if (landT[i] < 0 && released && fall > 0.3 && Math.min(feet, rd.bodies.torso.position.y - 0.12, rd.bodies.head.position.y - 0.12) < 0.06) landT[i] = t;
        if (i === 0) {
          // ふつうの人：あわてて手足をばたつかせるだけ
          rd.setStrength(0.6);
          rd.setPose(POSES.slip);
          return;
        }
        // ネコの立ち直り：まず頭、次に体をひねって、足を下へ向け、ひざを曲げて着地を待つ
        if (fall < 0.12) {
          rd.setPose(POSES.stand);
        } else if (landT[i] < 0) {
          rd.balance = Math.min(2.5, (fall - 0.12) * 8);
          rd.setPose(mix(POSES.stand, POSES.land, smooth((fall - 0.3) / 0.3)));
          applyBalance(rd);
        } else {
          rd.balance = 1.5;
          rd.setPose(t - landT[i] < 0.4 ? POSES.crouch : mix(POSES.crouch, POSES.stand, smooth((t - landT[i] - 0.4) / 0.6)));
          applyBalance(rd);
        }
      });
      world.step(dt);
    }
    dolls.forEach((rd, i) => rec.setFigBodies(f, i, rd));
    sp[f] = Math.abs(dolls[1].bodies.pelvis.velocity.y) * 3.6;
    rec.val("land0")[f] = landT[0];
    rec.val("land1")[f] = landT[1];
  }
  landT.forEach((lt, i) => lt > 0 && rec.events.push({ t: lt, kind: "impact", v: Math.sqrt(2 * G * CAT.h), pos: [i === 0 ? -1.3 : 1.3, 0.2, 0] }));
  return finish("cat", rec, frames, fps);
};

// ---- ハヤブサ：急降下で時速389km（左はスカイダイバー、時速約200kmで頭打ち） ----
// 時間は2倍速で進める（最高速度に近づくまでが長いので）
export const FALCON = { vt: [55, 108], h0: 3000, ff: 2 };
const falcon = (frames: number, fps: number): AnimalResult => {
  const rec = new Rec(frames, 2, 0);
  for (let f = 0; f < frames; f++) {
    const t = (f / fps) * FALCON.ff;
    [0, 1].forEach((i) => {
      const VT = FALCON.vt[i];
      const v = VT * Math.tanh((G * t) / VT);
      rec.val(`speed${i}`)[f] = v * 3.6;
      rec.val(`alt${i}`)[f] = FALCON.h0 - ((VT * VT) / G) * Math.log(Math.cosh((G * t) / VT));
      // 左：おなかを下に手足を広げる。右：頭を下に、手を体につけて矢のように
      const w = Math.sin(t * (12 + i * 5)) * 0.06 * Math.min(1, v / 50);
      const pose: Pose =
        i === 0
          ? { shoulderL: [-1.6 + w, 0, -1.2], shoulderR: [-1.6 - w, 0, 1.2], elbowL: [-0.6, 0, 0], elbowR: [-0.6, 0, 0], hipL: [0, 0, -0.4], hipR: [0, 0, 0.4], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0], neck: [-0.6, 0, 0] }
          : { shoulderL: [0.15 + w, 0, -0.1], shoulderR: [0.15 - w, 0, 0.1], elbowL: [0, 0, 0], elbowR: [0, 0, 0], neck: [-0.3, 0, 0] };
      const rq = i === 0 ? axisQ([1, 0, 0], Math.PI / 2) : axisQ([1, 0, 0], Math.PI * 0.95);
      rec.setFig(f, i, fk(new CANNON.Vec3(i === 0 ? -1.4 : 1.4, 2, 0), rq, pose));
    });
  }
  return finish("falcon", rec, frames, fps);
};

// ---- カメレオン：舌を体の長さの2倍（約3.5m）のばして、リンゴをとる ----
export const CHAMELEON = { shoot: 2.0, out: 0.12, back: 0.3, dist: 3.5 };
const chameleon = (frames: number, fps: number): AnimalResult => {
  const C = CHAMELEON;
  const rec = new Rec(frames, 1, 2);
  rec.objects.push({ shape: "post", size: [0.12, 1.55, 0.12], color: "#8a6a4a" }, { shape: "apple", size: [0.18, 0.18, 0.18], color: "#e83a3a" });
  const pose: Pose = { ...POSES.stand, neck: [0.05, 0, 0] };
  const now = fk(new CANNON.Vec3(0, 0.99, 0), YAW_X, pose);
  const mouth = now.head.p.vadd(new CANNON.Vec3(0.12, -0.05, 0));
  const L = rec.val("tongue");
  const v = rec.val("speed");
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    rec.setFig(f, 0, now);
    const a = t - C.shoot;
    let len = 0;
    let carry = false;
    if (a >= 0 && a < C.out) len = C.dist * (1 - Math.pow(1 - a / C.out, 2.2));
    else if (a >= C.out && a < C.out + C.back) {
      len = C.dist * (1 - smooth((a - C.out) / C.back));
      carry = true;
    } else if (a >= C.out + C.back) carry = true;
    L[f] = len;
    v[f] = a >= 0 && a < C.out ? ((C.dist * 2.2) / C.out) * Math.pow(1 - a / C.out, 1.2) * 3.6 : 0;
    rec.setObj(f, 0, [mouth.x + C.dist + 0.1, 0.78, 0]);
    const appleX = carry ? mouth.x + len + 0.09 : mouth.x + C.dist + 0.09;
    const ay = carry && a >= C.out + C.back ? mouth.y - 0.05 : mouth.y;
    rec.setObj(f, 1, [appleX, ay, 0]);
  }
  rec.events.push({ t: C.shoot, kind: "launch", v: 27, pos: [mouth.x, mouth.y, 0] }, { t: C.shoot + C.out, kind: "flash", v: 27, pos: [mouth.x + C.dist, mouth.y, 0] });
  rec.val("mouthX").fill(mouth.x);
  rec.val("mouthY").fill(mouth.y);
  return finish("chameleon", rec, frames, fps);
};

// ---- シャコ：パンチの速さ 秒速23m（時速80km）。レンガの壁をなぐる ----
export const SHRIMP = { punch: 2.2, wallX: 1.15, v: 23 };
const shrimp = (frames: number, fps: number): AnimalResult => {
  const S = SHRIMP;
  const cols = 7;
  const rows = 9;
  const rec = new Rec(frames, 1, cols * rows);
  const world = makeWorld(0.6);
  const bricks: CANNON.Body[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = new CANNON.Body({
        mass: 2.5,
        shape: new CANNON.Box(new CANNON.Vec3(0.1, 0.1, 0.2)),
        position: new CANNON.Vec3(S.wallX, 0.1 + r * 0.2, -1.4 + c * 0.4 + (r % 2) * 0.2 + 0.2),
      });
      world.addBody(b);
      bricks.push(b);
      rec.objects.push({ shape: "brick", size: [0.2, 0.2, 0.4], color: ["#b5502f", "#a8472a", "#c25c38"][(r + c) % 3] });
    }
  }
  // こぶし（見えない玉）：パンチの瞬間だけ、秒速23mで壁へ
  const fist = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Sphere(0.16), position: new CANNON.Vec3(-5, 1.35, 0) });
  fist.collisionResponse = false;
  world.addBody(fist);
  const sub = 10;
  const dt = 1 / (fps * sub);
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f * sub + s) * dt;
      const a = t - S.punch;
      if (a >= -0.02 && a < 0.12) {
        fist.collisionResponse = true;
        fist.position.set(0.6 + S.v * Math.max(0, a), 1.3, 0.12);
        fist.velocity.set(S.v, 0, 0);
      } else {
        fist.collisionResponse = false;
        fist.position.set(-5, 1.3, 0);
        fist.velocity.setZero();
      }
      world.step(dt);
    }
    const t = f / fps;
    const a = t - S.punch;
    // 構え → 右手を引く → 一気に突き出す
    const guard: Pose = { waist: [0.1, 0.3, 0], shoulderL: [-1.1, 0, -0.3], elbowL: [-1.9, 0, 0], shoulderR: [-0.7, 0, 0.3], elbowR: [-2.2, 0, 0], hipL: [-0.3, 0, 0], kneeL: [0.3, 0, 0], hipR: [0.15, 0, 0], kneeR: [0.2, 0, 0] };
    const cock: Pose = { ...guard, waist: [0.1, 0.6, 0], shoulderR: [0.3, 0, 0.3], elbowR: [-2.3, 0, 0] };
    const hit: Pose = { ...guard, waist: [0.2, -0.35, 0], shoulderR: [-1.55, 0, 0.05], elbowR: [-0.05, 0, 0] };
    const pose = a < -0.6 ? mix(POSES.stand, guard, smooth((t - 0.6) / 0.5)) : a < 0 ? mix(guard, cock, smooth((a + 0.6) / 0.4)) : a < 0.05 ? mix(cock, hit, a / 0.05) : a < 0.9 ? hit : mix(hit, guard, smooth((a - 0.9) / 0.5));
    rec.setFig(f, 0, fk(new CANNON.Vec3(0, 0.95, 0), YAW_X, pose));
    bricks.forEach((b, i) => rec.setObj(f, i, b.position, b.quaternion));
  }
  rec.events.push({ t: S.punch + 0.02, kind: "impact", v: 23, pos: [S.wallX, 1.3, 0.12] });
  return finish("shrimp", rec, frames, fps);
};

// ---- バシリスク：水の上を走る（秒速30m）。少しでも遅くなると…しずむ ----
export const BASILISK = { v: 30, start: 1.0, acc: 12, shore: 0, slow: 6.4 };
const basilisk = (frames: number, fps: number): AnimalResult => {
  const B = BASILISK;
  const rec = new Rec(frames, 1, 0);
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 20;
  const sp = rec.val("speed");
  let x = -4;
  let v = 0;
  let phase = 0;
  let rd: Ragdoll | null = null;
  let prev = fk(new CANNON.Vec3(x, 0.99, 0), YAW_X, POSES.stand);
  let lastStep = -1;
  const sub = 8;
  const dt = 1 / (fps * sub);
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f * sub + s) * dt;
      if (!rd) {
        if (t > B.start && t < B.slow) v = Math.min(B.v, v + B.acc * dt);
        else if (t >= B.slow) v = Math.max(0, v - 9 * dt);
        x += v * dt;
        const k = Math.min(1, v / 8);
        phase += dt * (v > 0 ? 1.2 + v * 0.16 : 0);
        // 足が水面をたたくたびに、しぶき
        const step = Math.floor(phase * 2);
        if (step !== lastStep && x > 0 && v > 3) {
          rec.events.push({ t, kind: "splash", v, pos: [x + 0.3, 0, (step % 2 ? 0.1 : -0.1)] });
        }
        lastStep = step;
        // 水の上では、遅くなるほど足がしずむ（秒速30mより遅いと、体を支えきれない）
        const sink = x > 0 ? Math.max(0, 1 - v / B.v) * 1.2 : 0;
        const root = new CANNON.Vec3(x, 0.99 - 0.1 * k - sink + 0.05 * Math.abs(Math.cos(phase * Math.PI * 2)) * k, 0);
        const now = fk(root, YAW_X.mult(axisQ([1, 0, 0], 0.25 * k)), v > 0 ? runPose(phase, k) : POSES.stand);
        if (t > B.slow + 0.5 && x > 0) {
          rd = toRagdoll(world, now, prev, dt);
          rd.balance = 0;
          rd.setStrength(0.3);
          rec.events.push({ t, kind: "splash", v: 20, pos: [x, 0, 0] });
        }
        prev = now;
      } else {
        // 水の中：浮力と水の抵抗（人の体は水とほぼ同じ重さなので、ゆっくりしずんで止まる）
        rd.setPose(POSES.slip);
        for (const b of Object.values(rd.bodies)) {
          if (b.position.y < 0) {
            b.force.y += b.mass * G * 0.99;
            b.force.x -= b.velocity.x * b.mass * 4;
            b.force.y -= b.velocity.y * b.mass * 4;
            b.force.z -= b.velocity.z * b.mass * 4;
          }
        }
      }
      world.step(dt);
    }
    if (rd) {
      rec.setFigBodies(f, 0, rd);
      sp[f] = Math.abs(rd.bodies.pelvis.velocity.x) * 3.6;
    } else {
      rec.setFig(f, 0, prev);
      sp[f] = v * 3.6;
    }
    rec.val("x")[f] = rd ? rd.bodies.pelvis.position.x : x;
  }
  return finish("basilisk", rec, frames, fps);
};

// ---- キツツキ：1秒に20回、頭で木をつつく ----
export const WOODPECKER = { start: 1.5, hz: 20, treeX: 0.62 };
const woodpecker = (frames: number, fps: number): AnimalResult => {
  const W = WOODPECKER;
  const rec = new Rec(frames, 1, 1);
  rec.objects.push({ shape: "tree", size: [0.55, 9, 0.55], color: "#7a5636" });
  const n = rec.val("pecks");
  // 1フレームの中も細かく計算して、いちばん木に近い瞬間を記録（30fps では1秒20回は速すぎて見えないので、スローで見せる）
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    const a = t - W.start;
    const nod = a > 0 ? Math.abs(Math.sin(a * W.hz * Math.PI)) : 0;
    const pose: Pose = { ...POSES.stand, waist: [0.12 + 0.18 * (1 - nod), 0, 0], neck: [0.15 + 0.45 * (1 - nod), 0, 0], shoulderL: [0.2, 0, -0.15], shoulderR: [0.2, 0, 0.15] };
    rec.setFig(f, 0, fk(new CANNON.Vec3(0, 0.99, 0), YAW_X, pose));
    rec.setObj(f, 0, [W.treeX + 0.27, 4.5, 0]);
    n[f] = a > 0 ? Math.floor(a * W.hz) : 0;
    if (a > 0 && Math.floor(a * W.hz) !== Math.floor((a - 1 / fps) * W.hz)) rec.events.push({ t, kind: "chip", v: 6, pos: [W.treeX, 1.62, 0] });
  }
  return finish("woodpecker", rec, frames, fps);
};

const finish = (mode: AnimalMode, rec: Rec, frames: number, fps: number): AnimalResult => ({
  mode,
  frames,
  fps,
  figures: rec.figures,
  parts: Array.from({ length: rec.figures }, (_, fig) => RAGDOLL_PARTS.map((p) => ({ name: p.name, size: p.size, look: p.look, fig }))).flat(),
  doll: rec.doll,
  objects: rec.objects,
  obj: rec.obj,
  values: rec.values,
  events: rec.events.sort((a, b) => a.t - b.t),
});

const SIMS: Record<AnimalMode, (frames: number, fps: number) => AnimalResult> = { cheetah, beetle, gecko, cat, falcon, chameleon, shrimp, basilisk, woodpecker };
// 場面ごとの計算の長さ（秒）
export const ANIMAL_LEN: Record<AnimalMode, number> = { cheetah: 16, beetle: 16, gecko: 18, cat: 6, falcon: 22, chameleon: 5, shrimp: 6, basilisk: 12, woodpecker: 12 };

const cache = new Map<string, AnimalResult>();
export const simulateAnimal = (mode: AnimalMode, fps: number): AnimalResult => {
  const key = `${mode}:${fps}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = SIMS[mode](Math.round(ANIMAL_LEN[mode] * fps), fps);
  cache.set(key, r);
  return r;
};
