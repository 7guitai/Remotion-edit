import * as CANNON from "cannon-es";
import { applyBalance, createRagdoll, PartName, Pose, POSES, Ragdoll } from "./ragdoll";
import { fk, runPose, toRagdoll, Xf } from "./animal";

// 「家の中の事故 検証10選」の場面（階段は sim/stairs.ts）。
// 家を断面で見せて、左の部屋（lane 0）と右の部屋（lane 1）で、条件だけを変えて同じことをする。
export type HomeMode = "bath" | "socks" | "cord" | "ladder" | "bed" | "phone" | "door" | "shelf" | "furniture";

export const LANE_X = [-2.45, 2.45];
export const ROOM = { half: 2.3, h: 2.5, back: -1.3 };

export type HomeVis = {
  b: number;
  off: [number, number, number];
  size: [number, number, number];
  color: string;
  shape?: "box" | "cyl" | "sphere";
  // 中が見えるように描かない（物理の板）
  hidden?: boolean;
  glass?: boolean;
  rot?: [number, number, number];
};

export type HomeHit = { t: number; v: number; lane: number; part: string };
// 画面に出す「ゴンッ！」などのきっかけ
export type HomeEvent = { t: number; lane: number; text: string; big: boolean };

export type HomeResult = {
  mode: HomeMode;
  frames: number;
  fps: number;
  nFig: number;
  parts: { name: PartName; size: [number, number, number]; look: string; fig: number }[];
  doll: Float32Array;
  nBody: number;
  body: Float32Array;
  vis: HomeVis[];
  values: Record<string, Float32Array>;
  hits: HomeHit[];
  // 頭をぶつけた速さ（km/h）と時刻（レーンごと）
  head: { v: number; t: number }[];
  // 床のゆれ（地震、x 方向の位置）
  shake: Float32Array;
  // 場面ごとの数字（落ちた高さなど）
  info: Record<string, number>;
  // 事件が起きる時刻（すべる・つまずく など）
  t0: number;
  events: HomeEvent[];
};

const G = 9.8;
const SUB = 10;
const PN: PartName[] = ["footL", "footR", "shinL", "shinR", "thighL", "thighR", "pelvis", "torso", "head", "upperArmL", "upperArmR", "lowerArmL", "lowerArmR"];
const NP = PN.length;

// cannon-es の摩擦は「重さにかかわらず強すぎる」ので、1つ前の計算で出た押しつける力 × μ × 刻み を上限にする（ジェンガと同じ直し方）
const fixFriction = (world: CANNON.World) => {
  const load = new Map<number, { sum: number; n: number }>();
  const key = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const np = (world as any).narrowphase;
  const orig = np.createFrictionEquationsFromContact.bind(np);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  np.createFrictionEquationsFromContact = (ce: any, out: any[]) => {
    const n0 = out.length;
    const ok = orig(ce, out);
    if (ok) {
      let red = ce.bi.invMass + ce.bj.invMass;
      red = red > 0 ? 1 / red : 0;
      const mu = out[n0].maxForce / (G * red || 1);
      const rec = load.get(key(ce.bi.id, ce.bj.id));
      const n = Math.min(8000, rec && rec.n > 0 ? rec.sum / rec.n : G * red);
      for (const fe of [out[n0], out[n0 + 1]]) {
        fe.maxForce = mu * n * world.dt;
        fe.minForce = -mu * n * world.dt;
      }
    }
    return ok;
  };
  return () => {
    load.clear();
    for (const c of world.contacts) {
      const k = key(c.bi.id, c.bj.id);
      const r = load.get(k) ?? { sum: 0, n: 0 };
      r.sum += Math.max(0, c.multiplier);
      r.n++;
      load.set(k, r);
    }
  };
};

const qEuler = (x: number, y: number, z: number) => {
  const q = new CANNON.Quaternion();
  q.setFromEuler(x, y, z, "XYZ");
  return q;
};

// つまずいて、とっさに両手を前に出す
const BRACE: Pose = {
  waist: [0.35, 0, 0],
  neck: [-0.3, 0, 0],
  shoulderL: [-1.5, 0, -0.25],
  shoulderR: [-1.5, 0, 0.25],
  elbowL: [-0.3, 0, 0],
  elbowR: [-0.3, 0, 0],
  hipL: [-0.5, 0, 0],
  hipR: [0.2, 0, 0],
  kneeL: [0.4, 0, 0],
  kneeR: [0.3, 0, 0],
};
// スマホを見ながら歩く（右手を胸の前、頭は下向き）
const PHONE: Pose = {
  neck: [0.45, 0, 0],
  shoulderR: [-0.7, 0, 0.15],
  elbowR: [-1.5, 0, 0],
  shoulderL: [-0.3, 0, -0.1],
  elbowL: [-1.2, 0, 0],
};
// 高いところへ手をのばす
const REACH: Pose = {
  shoulderL: [-2.7, 0, -0.1],
  shoulderR: [-2.7, 0, 0.1],
  elbowL: [-0.1, 0, 0],
  elbowR: [-0.1, 0, 0],
  neck: [-0.35, 0, 0],
};
// 横へ手をのばす（脚立の上で）
const REACH_SIDE: Pose = {
  waist: [0, 0, 0.25],
  shoulderR: [-1.2, 0, 1.6],
  elbowR: [-0.1, 0, 0],
  shoulderL: [0, 0, -0.3],
  neck: [0, 0, 0.2],
};
// 走って急に止まろうとする（足を前へつっぱる）
const SKID: Pose = {
  waist: [-0.2, 0, 0],
  hipL: [-0.55, 0, -0.08],
  hipR: [-0.25, 0, 0.08],
  kneeL: [0.2, 0, 0],
  kneeR: [0.45, 0, 0],
  shoulderL: [-0.9, 0, -0.5],
  shoulderR: [-0.9, 0, 0.5],
  elbowL: [-0.3, 0, 0],
  elbowR: [-0.3, 0, 0],
};
// 歩いている途中：両足を前後に開いて、どちらの足の裏も床に平らにつく
const STRIDE: Pose = {
  hipL: [-0.32, 0, 0],
  hipR: [0.32, 0, 0],
  ankleL: [0.32, 0, 0],
  ankleR: [-0.32, 0, 0],
  shoulderL: [0.3, 0, -0.12],
  shoulderR: [-0.3, 0, 0.12],
  elbowL: [-0.3, 0, 0],
  elbowR: [-0.3, 0, 0],
};
// あお向けにころぶとき（とっさに手を後ろへ）
const FALLBACK: Pose = {
  waist: [0.25, 0, 0],
  neck: [0.2, 0, 0],
  shoulderL: [-0.6, 0, -0.9],
  shoulderR: [-0.6, 0, 0.9],
  hipL: [-0.7, 0, 0],
  hipR: [-0.5, 0, 0],
  kneeL: [0.5, 0, 0],
  kneeR: [0.6, 0, 0],
};

type Fig = {
  rd: Ragdoll | null;
  // 物理になる前（順運動学で動かすとき）の姿勢
  xf: Record<PartName, Xf> | null;
  prevXf: Record<PartName, Xf> | null;
  lane: number;
  prevV: Record<PartName, CANNON.Vec3>;
};

class Home {
  world: CANNON.World;
  measure: () => void;
  bodies: CANNON.Body[] = [];
  vis: HomeVis[] = [];
  figs: Fig[] = [];
  hits: HomeHit[] = [];
  head = [
    { v: 0, t: -1 },
    { v: 0, t: -1 },
  ];
  person = new CANNON.Material("person");
  floors: CANNON.Material[] = [new CANNON.Material("floor0"), new CANNON.Material("floor1")];
  dt: number;
  constructor(public fps: number, mu: [number, number] = [0.6, 0.6]) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
    this.world.allowSleep = false;
    (this.world.solver as CANNON.GSSolver).iterations = 30;
    this.world.defaultContactMaterial.friction = 0.6;
    this.world.defaultContactMaterial.restitution = 0.05;
    this.measure = fixFriction(this.world);
    this.floors.forEach((m, i) => this.world.addContactMaterial(new CANNON.ContactMaterial(this.person, m, { friction: mu[i], restitution: 0.02 })));
    this.dt = 1 / (fps * SUB);
  }
  // 部屋ごとの床（上面が y = 0）
  addFloors(type: CANNON.BodyType = CANNON.Body.STATIC) {
    return LANE_X.map((x, i) => {
      const b = new CANNON.Body({ mass: 0, type, material: this.floors[i], shape: new CANNON.Box(new CANNON.Vec3(ROOM.half, 0.5, 2.5)), position: new CANNON.Vec3(x, -0.5, 0) });
      this.world.addBody(b);
      return b;
    });
  }
  track(b: CANNON.Body, parts: Omit<HomeVis, "b">[]) {
    const i = this.bodies.length;
    this.bodies.push(b);
    parts.forEach((p) => this.vis.push({ ...p, b: i }));
    return b;
  }
  // 箱を組み合わせた物（家具など）
  // cannon-es は「物体の位置＝重心」として回すので、箱の体積から重心を求めて、そこを物体の位置にする
  // （位置を床に置いたままだと、重心が床にあることになって、いくら揺らしても倒れない）
  compound(mass: number, pos: [number, number, number], boxes: { off: [number, number, number]; size: [number, number, number]; color: string; hidden?: boolean; glass?: boolean }[], opts: Partial<CANNON.BodyOptions> = {}) {
    let vol = 0;
    const c = [0, 0, 0];
    boxes.forEach((x) => {
      const v = x.size[0] * x.size[1] * x.size[2];
      vol += v;
      for (let k = 0; k < 3; k++) c[k] += x.off[k] * v;
    });
    for (let k = 0; k < 3; k++) c[k] /= vol;
    const offs = boxes.map((x) => [x.off[0] - c[0], x.off[1] - c[1], x.off[2] - c[2]] as [number, number, number]);
    const b = new CANNON.Body({ mass, position: new CANNON.Vec3(pos[0] + c[0], pos[1] + c[1], pos[2] + c[2]), ...opts });
    boxes.forEach((x, i) => b.addShape(new CANNON.Box(new CANNON.Vec3(x.size[0] / 2, x.size[1] / 2, x.size[2] / 2)), new CANNON.Vec3(...offs[i])));
    this.world.addBody(b);
    return this.track(
      b,
      boxes.map((x, i) => ({ off: offs[i], size: x.size, color: x.color, hidden: x.hidden, glass: x.glass })),
    );
  }
  addFig(lane: number, rd: Ragdoll | null, xf: Record<PartName, Xf> | null = null) {
    this.figs.push({ rd, xf, prevXf: xf, lane, prevV: Object.fromEntries(PN.map((n) => [n, new CANNON.Vec3()])) as Record<PartName, CANNON.Vec3> });
  }
  // 立っている人を作り、骨盤を固定したまま関節だけ最初の姿勢になじませる
  // 立っている人：関節の角度から体の形を計算して置く（足の裏が pos の高さに来るように）
  standing(lane: number, pos: [number, number, number], yaw: number, pose: Pose) {
    const rd = createRagdoll(this.world, pos, yaw, this.person);
    rd.setPose(pose);
    const q = qYaw(yaw);
    let xf = fk(new CANNON.Vec3(pos[0], pos[1] + 0.99, pos[2]), q, pose);
    const low = Math.min(xf.footL.p.y, xf.footR.p.y) - 0.04;
    xf = fk(new CANNON.Vec3(pos[0], pos[1] + 0.99 - (low - pos[1]), pos[2]), q, pose);
    PN.forEach((n) => {
      rd.bodies[n].position.copy(xf[n].p);
      rd.bodies[n].quaternion.copy(xf[n].q);
    });
    this.addFig(lane, rd);
    return rd;
  }
  // 寝ている人（頭が奥 -z、顔が上）
  lying(lane: number, pos: [number, number, number], strength = 0.25) {
    const rd = createRagdoll(this.world, [0, 0, 0], 0, this.person);
    const q = qEuler(-Math.PI / 2, 0, 0);
    for (const b of Object.values(rd.bodies)) {
      const p = q.vmult(b.position);
      b.position.set(p.x + pos[0], p.y + pos[1], p.z + pos[2]);
      b.quaternion.copy(q.mult(b.quaternion));
    }
    rd.balance = 0;
    rd.setStrength(strength);
    this.addFig(lane, rd);
    return rd;
  }
  // 1サブステップ進めて、ぶつかった瞬間を記録する
  step(t: number) {
    this.world.step(this.dt);
    this.measure();
    for (const fg of this.figs) {
      if (!fg.rd) continue;
      for (const n of PN) {
        const v = fg.rd.bodies[n].velocity;
        const pv = fg.prevV[n];
        const dv = pv.vsub(v).length();
        const sp = pv.length();
        if (dv > 1.2 && sp > 1.2) {
          const last = [...this.hits].reverse().find((h) => h.lane === fg.lane);
          if (!last || t - last.t > 0.06) this.hits.push({ t, v: sp, lane: fg.lane, part: n });
          else if (sp > last.v) Object.assign(last, { v: sp, part: n });
          if (n === "head" && sp * 3.6 > this.head[fg.lane].v) this.head[fg.lane] = { v: sp * 3.6, t };
        }
        pv.copy(v);
      }
    }
  }
}

// 記録
const record = (h: Home, frames: number, fps: number, mode: HomeMode, run: (rec: (f: number) => void) => void, extraFn: () => Partial<HomeResult> = () => ({})): HomeResult => {
  const nFig = h.figs.length;
  const doll = new Float32Array(frames * nFig * NP * 7);
  const nBody = h.bodies.length;
  const body = new Float32Array(frames * Math.max(1, nBody) * 7);
  run((f) => {
    h.figs.forEach((fg, k) => {
      PN.forEach((n, i) => {
        const o = ((f * nFig + k) * NP + i) * 7;
        if (fg.rd) {
          const b = fg.rd.bodies[n];
          doll.set([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], o);
        } else if (fg.xf) {
          const x = fg.xf[n];
          doll.set([x.p.x, x.p.y, x.p.z, x.q.x, x.q.y, x.q.z, x.q.w], o);
        }
      });
    });
    h.bodies.forEach((b, i) => {
      body.set([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], (f * nBody + i) * 7);
    });
  });
  const sizes = createSizes();
  return {
    mode,
    frames,
    fps,
    nFig,
    parts: h.figs.flatMap((fg, k) => PN.map((n) => ({ name: n, size: sizes.size[n], look: sizes.look[n], fig: k }))),
    doll,
    nBody,
    body,
    vis: h.vis,
    values: {},
    hits: h.hits,
    head: h.head,
    shake: new Float32Array(frames),
    info: {},
    t0: 0,
    events: [],
    ...extraFn(),
  };
};

let sizeCache: { size: Record<PartName, [number, number, number]>; look: Record<PartName, string> } | null = null;
const createSizes = () => {
  if (sizeCache) return sizeCache;
  const w = new CANNON.World();
  const rd = createRagdoll(w, [0, 0, 0], 0);
  sizeCache = { size: rd.sizes, look: rd.looks };
  return sizeCache;
};

const YAW_X = Math.PI / 2;
const qYaw = (yaw: number) => {
  const q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
  return q;
};

// 体の向き（ワールド）の「上」から何度傾いたか
const tilt = (b: CANNON.Body) => {
  const up = b.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
  return Math.acos(Math.max(-1, Math.min(1, up.y)));
};

// ---- 1. お風呂場：ぬれた床（せっけん）／すべり止めマット ----
export const BATH = { t0: 0.8, mu: [0.06, 0.9] as [number, number], shear: 170, push: 0.3 };
const bath = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps, BATH.mu);
  h.addFloors();
  const rds = LANE_X.map((x, lane) => h.standing(lane, [x - 0.6, 0, 0.1], YAW_X, STRIDE));
  const states = rds.map(() => ({ slipped: false, slipT: -1 }));
  const snap = rds.map((rd) => Object.fromEntries(PN.map((n) => [n, { p: rd.bodies[n].position.clone(), q: rd.bodies[n].quaternion.clone() }])));
  return record(h, frames, fps, "bath", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        if (t < BATH.t0) {
          const reset = () =>
            rds.forEach((rd, i) => PN.forEach((n) => {
              const b = rd.bodies[n];
              b.position.copy(snap[i][n].p);
              b.quaternion.copy(snap[i][n].q);
              b.velocity.set(0, 0, 0);
              b.angularVelocity.set(0, 0, 0);
            }));
          // 止めている間も計算して、足が床を押す力（摩擦の上限に使う）を測っておく
          reset();
          h.world.step(h.dt);
          h.measure();
          reset();
          continue;
        }
        rds.forEach((rd, i) => {
          if (Math.abs(t - BATH.t0) < h.dt / 2) {
            // 歩いて前へ体重をのせる（前の足は、かかとから着いて少し前へすべろうとする）
            for (const b of Object.values(rd.bodies)) b.velocity.set(0.6, 0, 0);
            for (const n of ["footL", "footR", "shinL", "shinR"] as PartName[]) rd.bodies[n].velocity.set(0, 0, 0);
            // 一歩ふみ出した瞬間は、足の筋肉がまだ構えていない
            rd.setStrength(0.3, ["hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"]);
          }
          const st = states[i];
          // 歩くとき、前の足のかかとには「前へすべらせようとする力」がかかる（体重の約2割）。床の摩擦がそれより小さいと すべる
          // 前の足は前へ、後ろの足は後ろへ（歩くときに足が床をこする力。合わせると0なので、体全体は押されない）
          if (t < BATH.t0 + BATH.push) {
            rd.bodies.footL.applyForce(new CANNON.Vec3(BATH.shear, 0, 0));
            rd.bodies.footR.applyForce(new CANNON.Vec3(-BATH.shear, 0, 0));
          }
          // 足がすべって大きく開いたら（腰が下がったら）、バランスをくずす（どちらの部屋も同じ決まり）
          // 床についた足が、床の上をすべっているか
          const fl = rd.bodies.footL;
          const fr = rd.bodies.footR;
          const rel = Math.max(fl.position.y < 0.12 ? fl.velocity.x : 0, fr.position.y < 0.12 ? -fr.velocity.x : 0);
          if (!st.slipped && Math.abs(t - BATH.t0 - BATH.push) < h.dt / 2) rd.setStrength(1);
          if (!st.slipped && t > BATH.t0 + 0.06 && rel > 0.5) {
            st.slipped = true;
            st.slipT = t;
            rd.balance = 0;
            rd.setStrength(0.3);
            rd.setPose(FALLBACK);
          }
          applyBalance(rd);
        });
        h.step(t);
      }
      rec(f);
    }
  }, () => ({ t0: BATH.t0, info: { slip0: states[0].slipT, slip1: states[1].slipT } }));
};

// ---- 2. 靴下でフローリングを走って、止まろうとする（靴下／はだし） ----
export const SOCKS = { t0: 0.4, v: 2.6, run: 0.5, mu: [0.15, 0.55] as [number, number], table: 1.5 };
const socks = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps, SOCKS.mu);
  h.addFloors();
  // 左の人は右へ、右の人は左へ（まん中の壁に向かって）走る
  const dirs = [1, -1];
  const startX = [-4.45, 4.45];
  // 止まろうとした所から 1.5m 先にローテーブル
  const stopPos = startX.map((x, i) => x + dirs[i] * SOCKS.v * SOCKS.run);
  stopPos.forEach((x, i) => {
    const cx = x + dirs[i] * (SOCKS.table + 0.3);
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.3, 0.21, 0.45)), position: new CANNON.Vec3(cx, 0.21, 0) });
    h.world.addBody(b);
    h.track(b, [
      { off: [0, 0.19, 0], size: [0.62, 0.05, 0.92], color: "#8a5a3a" },
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ off: [sx * 0.26, -0.03, sz * 0.4] as [number, number, number], size: [0.05, 0.38, 0.05] as [number, number, number], color: "#6b4528" }))),
    ]);
  });
  LANE_X.forEach((_, i) => h.addFig(i, null, null));
  const xfAt = (lane: number, t: number) => {
    const x = startX[lane] + dirs[lane] * SOCKS.v * Math.max(0, t - SOCKS.t0);
    const ph = (Math.max(0, t - SOCKS.t0) * 1.7) % 1;
    const k = t < SOCKS.t0 ? 0 : 0.8;
    return fk(new CANNON.Vec3(x, 0.96 + 0.04 * k * Math.abs(Math.sin(ph * Math.PI * 2)), 0), qYaw(dirs[lane] * YAW_X), runPose(ph, k));
  };
  const tStop = SOCKS.t0 + SOCKS.run;
  const stopAt = [0, 0];
  const v0 = [-1, -1];
  const slideEnd = [0, 0];
  return record(h, frames, fps, "socks", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        h.figs.forEach((fg, i) => {
          if (!fg.rd) {
            const now = xfAt(i, t);
            fg.prevXf = fg.xf ?? now;
            fg.xf = now;
            if (t >= tStop) {
              // 止まろうとした瞬間から物理で動かす（足を前へつっぱって、すべる）
              fg.rd = toRagdoll(h.world, now, xfAt(i, t - h.dt), h.dt, h.person);
              fg.rd.yaw = dirs[i] * YAW_X;
              for (const b of Object.values(fg.rd.bodies)) b.velocity.set(dirs[i] * SOCKS.v, 0, 0);
              fg.rd.setPose(POSES.stand);
              fg.rd.balance = 1;
              stopAt[i] = fg.rd.bodies.pelvis.position.x;
            }
          } else {
            // 何かにぶつかったか、体が大きくかたむいたら、バランスをくずす（どちらも同じ決まり）
            const bumped = h.hits.some((x) => x.lane === i && x.t > tStop + 0.1);
            if (fg.rd.balance > 0 && (bumped || tilt(fg.rd.bodies.torso) > 0.5)) {
              v0[i] = t;
              fg.rd.balance = 0;
              fg.rd.setStrength(0.3);
              fg.rd.setPose(FALLBACK);
            }
            applyBalance(fg.rd);
            slideEnd[i] = Math.max(slideEnd[i], dirs[i] * (fg.rd.bodies.pelvis.position.x - stopAt[i]));
          }
        });
        h.step(t);
      }
      rec(f);
    }
  }, () => ({ t0: tStop, info: { slide0: slideEnd[0], slide1: slideEnd[1], fall0: v0[0], fall1: v0[1] } }));
};

// ---- 3. 床のコードにつまずく（手ぶら／両手に荷物） ----
export const CORD = { t0: 0.3, v: 1.25, trip: 1.3 };
const cord = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps, [0.6, 0.6]);
  h.addFloors();
  const cordX = LANE_X.map((x) => x - 0.1);
  const startX = cordX.map((x) => x - CORD.v * CORD.trip - 0.35);
  // 床をはうコード（見た目だけ）
  LANE_X.forEach((_, i) => {
    const b = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(cordX[i], 0.012, 0) });
    b.collisionResponse = false;
    h.track(b, [{ off: [0, 0, 0], size: [0.024, 0.024, 3.2], color: "#f4f4f4", shape: "cyl", rot: [Math.PI / 2, 0, 0] }]);
  });
  // 右の部屋の人は、スマホを見ながら歩く（スマホは右手について動く。見た目だけ）
  const phone = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, -5, 0) });
  h.track(phone, [{ off: [0, -0.15, 0.03], size: [0.075, 0.15, 0.012], color: "#1d2330" }]);
  LANE_X.forEach((_, i) => h.addFig(i, null, null));
  const q = qYaw(YAW_X);
  const walk = (lane: number, t: number) => {
    const x = startX[lane] + CORD.v * t;
    const ph = (t * 0.95) % 1;
    const p = runPose(ph, 0.32);
    const pose = lane === 1 ? { ...p, ...PHONE } : p;
    return fk(new CANNON.Vec3(x, 0.98 + 0.015 * Math.abs(Math.sin(ph * Math.PI * 2)), 0), q, pose);
  };

  return record(h, frames, fps, "cord", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        h.figs.forEach((fg, i) => {
          const tw = Math.max(0, t - CORD.t0);
          if (!fg.rd) {
            const now = walk(i, tw);
            fg.prevXf = fg.xf ?? now;
            fg.xf = now;
            if (i === 1) {
              phone.position.copy(now.lowerArmR.p);
              phone.quaternion.copy(now.lowerArmR.q);
            }
            if (t >= CORD.t0 + CORD.trip) {
              fg.rd = toRagdoll(h.world, now, walk(i, tw - h.dt), h.dt, h.person);
              fg.rd.yaw = YAW_X;
              // 後ろの足がコードに引っかかって止まる
              const back = now.footL.p.x < now.footR.p.x ? "L" : "R";
              fg.rd.bodies[`foot${back}` as PartName].velocity.set(0, 0, 0);
              fg.rd.bodies[`shin${back}` as PartName].velocity.scale(0.2, fg.rd.bodies[`shin${back}` as PartName].velocity);
              fg.rd.balance = 0;
              if (i === 0) {
                fg.rd.setStrength(0.4);
                fg.rd.setPose(BRACE);
              } else {
                // スマホを見ていて、つまずいたのに気づくのがおくれる：手が前に出ない
                fg.rd.setStrength(0.4);
                fg.rd.setStrength(0.9, ["shoulderL", "shoulderR", "elbowL", "elbowR"]);
                fg.rd.setPose({ ...BRACE, ...PHONE });
              }
            }
          } else if (i === 1) {
            phone.position.copy(fg.rd.bodies.lowerArmR.position);
            phone.quaternion.copy(fg.rd.bodies.lowerArmR.quaternion);
          }
        });
        h.step(t);
      }
      rec(f);
    }
  }, () => ({ t0: CORD.t0 + CORD.trip }));
};

// ---- 4. 高い所の物をとろうとして落ちる（踏み台 45cm／脚立の天板 1.2m） ----
export const LADDER = { t0: 1.0, stool: 0.45, top: 1.2, f: 90, push: 0.6 };
const ladder = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps, [0.6, 0.6]);
  h.addFloors();
  const L = LADDER;
  // 左：踏み台
  h.compound(
    5,
    [LANE_X[0], 0, 0],
    [
      { off: [0, L.stool - 0.03, 0], size: [0.42, 0.06, 0.36], color: "#e3b24a" },
      { off: [-0.18, L.stool / 2 - 0.03, 0], size: [0.05, L.stool - 0.06, 0.36], color: "#d9a43c" },
      { off: [0.18, L.stool / 2 - 0.03, 0], size: [0.05, L.stool - 0.06, 0.36], color: "#d9a43c" },
    ],
  );
  // 右：脚立（天板の高さ 1.2m）
  h.compound(
    7,
    [LANE_X[1], 0, 0],
    [
      { off: [0, L.top - 0.02, 0], size: [0.42, 0.04, 0.3], color: "#cfd5dc" },
      { off: [-0.2, L.top / 2, 0.22], size: [0.035, L.top, 0.035], color: "#b8c0c8" },
      { off: [0.2, L.top / 2, 0.22], size: [0.035, L.top, 0.035], color: "#b8c0c8" },
      { off: [-0.2, L.top / 2, -0.22], size: [0.035, L.top, 0.035], color: "#b8c0c8" },
      { off: [0.2, L.top / 2, -0.22], size: [0.035, L.top, 0.035], color: "#b8c0c8" },
      { off: [0, 0.4, 0.25], size: [0.42, 0.04, 0.16], color: "#cfd5dc" },
      { off: [0, 0.8, 0.18], size: [0.42, 0.04, 0.14], color: "#cfd5dc" },
      { off: [0, 0.02, 0.32], size: [0.46, 0.04, 0.06], color: "#8a9099" },
      { off: [0, 0.02, -0.32], size: [0.46, 0.04, 0.06], color: "#8a9099" },
    ],
  );
  // 人は奥の壁を向き（-z）、右（+x）の高い棚へ手をのばして、バランスをくずす
  const rds = LANE_X.map((x, lane) => h.standing(lane, [x, lane === 0 ? L.stool : L.top, 0], Math.PI, POSES.stand));
  const snap = rds.map((rd) => Object.fromEntries(PN.map((n) => [n, { p: rd.bodies[n].position.clone(), q: rd.bodies[n].quaternion.clone() }])));
  const fallen = [-1, -1];
  return record(h, frames, fps, "ladder", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        rds.forEach((rd, i) => {
          if (t < L.t0) {
            PN.forEach((n) => {
              const b = rd.bodies[n];
              b.position.copy(snap[i][n].p);
              b.quaternion.copy(snap[i][n].q);
              b.velocity.set(0, 0, 0);
              b.angularVelocity.set(0, 0, 0);
            });
            rd.setPose(t > L.t0 - 0.5 ? REACH_SIDE : POSES.stand);
            return;
          }
          if (Math.abs(t - L.t0) < h.dt / 2) {
            rd.balance = 0;
            rd.setStrength(0.5);
          }
          if (t < L.t0 + L.push) rd.bodies.torso.applyForce(new CANNON.Vec3(L.f, 0, 0));
          if (fallen[i] < 0 && tilt(rd.bodies.pelvis) > 0.7) {
            fallen[i] = t;
            rd.setStrength(0.3);
            rd.setPose(BRACE);
          }
        });
        h.step(t);
      }
      rec(f);
    }
  }, () => ({ t0: L.t0, info: { fall0: fallen[0], fall1: fallen[1] } }));
};

// ---- 6. 寝返りでベッドから落ちる（ベッドガードなし／あり） ----
export const BED = { t0: 1.0, top: 0.5, w: 1.0, v: 1.8 };
const bed = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps, [0.6, 0.6]);
  h.addFloors();
  LANE_X.forEach((x, i) => {
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(BED.w / 2, BED.top / 2, 1.0)), position: new CANNON.Vec3(x - 0.5, BED.top / 2, -0.2) });
    h.world.addBody(b);
    h.track(b, [
      { off: [0, -0.1, 0], size: [BED.w + 0.06, BED.top - 0.2, 2.06], color: "#8a5a3a" },
      { off: [0, 0.12, 0], size: [BED.w, 0.26, 2.0], color: "#f2f2ee" },
      { off: [0, 0.27, -0.8], size: [0.55, 0.1, 0.32], color: "#ffffff" },
    ]);
    if (i === 1) {
      // ベッドガード（すき間を作らないよう、マットに沿わせる）
      const g = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.02, 0.18, 0.7)), position: new CANNON.Vec3(x - 0.5 + BED.w / 2 + 0.02, BED.top + 0.18, -0.4) });
      h.world.addBody(g);
      h.track(g, [{ off: [0, 0, 0], size: [0.04, 0.36, 1.4], color: "#e9edf2" }]);
    }
  });
  const rds = LANE_X.map((x, lane) => h.lying(lane, [x - 0.5 + 0.22, BED.top + 0.12, 0.65], 0.25));
  return record(h, frames, fps, "bed", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        rds.forEach((rd) => {
          if (Math.abs(t - BED.t0) < h.dt / 2) {
            // 寝返り：右（+x）へ転がる
            for (const b of Object.values(rd.bodies)) {
              b.velocity.set(BED.v, 0.6, 0);
              b.angularVelocity.set(0, 0, -7);
            }
          }
        });
        h.step(t);
      }
      rec(f);
    }
  }, () => ({ t0: BED.t0 }));
};

// ---- 寝ながらスマホを顔に落とす（スマホ 190g／タブレット 480g、高さ 30cm） ----
export const PHONE_DROP = { t0: 1.0, h: 0.3, m: [0.19, 0.48], size: [[0.072, 0.008, 0.147], [0.17, 0.007, 0.25]] as [number, number, number][] };
const phone = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps, [0.6, 0.6]);
  h.addFloors();
  LANE_X.forEach((x) => {
    const fb = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.05, 1.0)), position: new CANNON.Vec3(x, 0.05, 0.5) });
    h.world.addBody(fb);
    h.track(fb, [
      { off: [0, 0, 0], size: [1.0, 0.1, 2.0], color: "#eef3fb" },
      { off: [0, 0.07, -0.85], size: [0.5, 0.08, 0.3], color: "#ffffff" },
    ]);
  });
  const P = PHONE_DROP;
  const HOLD: Pose = { shoulderL: [-1.75, 0, -0.25], shoulderR: [-1.75, 0, 0.25], elbowL: [-0.9, 0, 0], elbowR: [-0.9, 0, 0] };
  const rds = LANE_X.map((x, lane) => {
    const rd = h.lying(lane, [x, 0.21, 1.35], 0.8);
    rd.setPose(HOLD);
    return rd;
  });
  // 顔の真上 30cm に、画面を下にして持つ
  const items = rds.map((rd, i) => {
    const hp = rd.bodies.head.position;
    const sz = P.size[i];
    const b = new CANNON.Body({ mass: P.m[i], type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(sz[0] / 2, sz[1] / 2, sz[2] / 2)), position: new CANNON.Vec3(hp.x, hp.y + 0.12 + P.h, hp.z + 0.03) });
    h.world.addBody(b);
    h.track(b, [
      { off: [0, 0, 0], size: sz, color: "#1d2330" },
      { off: [0, -sz[1] / 2 - 0.001, 0], size: [sz[0] * 0.9, 0.002, sz[2] * 0.92], color: "#7fb4e6" },
    ]);
    return b;
  });
  const hitV = [0, 0];
  const prevV = [0, 0];
  return record(h, frames, fps, "phone", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        items.forEach((b, i) => {
          if (Math.abs(t - P.t0) < h.dt / 2) {
            // 手がすべって落とす
            b.type = CANNON.Body.DYNAMIC;
            b.mass = P.m[i];
            b.updateMassProperties();
            b.velocity.set(0, 0, 0);
          }
          const v = -b.velocity.y;
          if (t > P.t0 && hitV[i] === 0 && prevV[i] - v > 1.0) hitV[i] = prevV[i];
          prevV[i] = v;
        });
        h.step(t);
      }
      rec(f);
    }
  }, () => ({ t0: P.t0, info: { v0: hitV[0], v1: hitV[1], e0: 0.5 * P.m[0] * hitV[0] ** 2, e1: 0.5 * P.m[1] * hitV[1] ** 2 } }));
};

// ---- 7. ドアに指をはさむ（ドアノブ側／ちょうつがい側） ----
// ドアは物理でなく、力のつり合いと回転の式で動かす（にんじんを指のかわりにはさむ）
export const DOOR = { t0: 0.6, w: 0.8, h: 2.0, open: 1.2, push: 50, knob: 0.72, gap: 0.02, mass: 15 };
const door = (fps: number, frames: number): HomeResult => {
  const h = new Home(fps);
  h.addFloors();
  const D = DOOR;
  // 回転の慣性 I = m w²/3。手で 0.15秒押したあと、惰性で閉まる
  const I = (D.mass * D.w * D.w) / 3;
  const pushT = 0.15;
  const omega = (D.push * D.knob * pushT) / I;
  const hinge = LANE_X.map((x) => new CANNON.Vec3(x - 0.4, 0, -0.2));
  const doors = hinge.map((p) => {
    const b = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, position: p.clone() });
    return h.track(b, [
      { off: [D.w / 2, D.h / 2, 0.02], size: [D.w, D.h, 0.04], color: "#d8b48a" },
      { off: [D.knob, 1.0, 0.07], size: [0.12, 0.03, 0.03], color: "#c0c4ca" },
    ]);
  });
  // にんじん（左はドアノブ側の先、右はちょうつがいのすき間）
  const carrots: CANNON.Body[][] = [];
  LANE_X.forEach((_, i) => {
    const pieces: CANNON.Body[] = [];
    const n = i === 0 ? 1 : 3;
    for (let k = 0; k < n; k++) {
      const b = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, position: new CANNON.Vec3(0, -5, 0) });
      h.track(b, [{ off: [0, 0, 0], size: [0.045, i === 0 ? 0.18 : 0.06, 0.045], color: "#f08a24", shape: "cyl", rot: [Math.PI / 2, 0, 0] }]);
      pieces.push(b);
    }
    carrots.push(pieces);
  });
  const ang = [D.open, D.open];
  const stopT = [-1, -1];
  const crushT = [-1, -1];
  // 左：ドアの先がにんじんに当たる角度（ドアの先から 2cm 内側、ドアの面の外へ 4cm）で止まる
  const knobStop = 0.05;
  return record(h, frames, fps, "door", (rec) => {
    for (let f = 0; f < frames; f++) {
      const t = f / fps;
      for (let i = 0; i < 2; i++) {
        if (t >= D.t0) {
          const dtt = t - D.t0;
          // 押している間は加速、そのあとは一定の速さ
          const a = dtt < pushT ? D.open - 0.5 * (omega / pushT) * dtt * dtt : D.open - 0.5 * omega * pushT - omega * (dtt - pushT);
          if (i === 0) {
            if (a <= knobStop && stopT[0] < 0) stopT[0] = t;
            // にんじんに当たって止まり、少しはね返る
            ang[0] = stopT[0] >= 0 ? knobStop + 0.12 * Math.exp(-(t - stopT[0]) * 5) * Math.abs(Math.sin((t - stopT[0]) * 12)) : Math.max(knobStop, a);
          } else {
            ang[1] = Math.max(0, a);
            if (ang[1] <= 0.02 && crushT[1] < 0) crushT[1] = t;
          }
        }
        // ドアは手前（+z）へ開いている
        const q = qYaw(-ang[i]);
        doors[i].position.copy(hinge[i]);
        doors[i].quaternion.copy(q);
        // にんじんの位置
        const ps = carrots[i];
        if (i === 0) {
          // ドアノブ側の枠のすき間に置く（ドアの先が当たって止まる）
          ps[0].position.set(hinge[i].x + D.w - 0.015, 1.0, hinge[i].z + 0.06);
        } else {
          // ちょうつがい側のすき間（ドアと枠の間）。閉まりきると つぶれて3つに割れる
          const base = new CANNON.Vec3(hinge[i].x - 0.015, 1.0, hinge[i].z);
          ps.forEach((p, k) => {
            if (crushT[1] < 0) {
              p.position.set(base.x, base.y, base.z - 0.06 + k * 0.06);
              p.quaternion.set(0, 0, 0, 1);
            } else {
              const d = t - crushT[1];
              const vx = (k - 1) * 0.8;
              const y = Math.max(0.02, base.y + 1.2 * d - 4.9 * d * d);
              p.position.set(base.x + vx * Math.min(d, 0.45), y, base.z - 0.06 + k * 0.06 + 0.7 * Math.min(d, 0.45));
              p.quaternion.copy(qEuler(d * 9 * (k - 1), d * 5, d * 7));
            }
          });
        }
      }
      rec(f);
    }
  }, () => ({ t0: D.t0, info: { omega, crush: crushT[1], stop: stopT[0], ratio: D.knob / D.gap } }));
};

// ---- 8・9. 地震（揺れる床） ----
export const QUAKE = { t0: 1.0, a: 7, hz: 0.7, len: 6, shelfA: 5 };
// 床の位置（揺れはじめ・終わりをなめらかに）
const quakeX = (t: number, amp = QUAKE.a) => {
  const Q = { ...QUAKE, a: amp };
  const u = t - Q.t0;
  if (u <= 0) return 0;
  const w = Math.PI * 2 * Q.hz;
  const env = Math.min(1, u / 1.2) * Math.min(1, Math.max(0, (Q.len - u) / 1.0));
  return (Q.a / (w * w)) * env * Math.sin(w * u);
};

const quakeWorld = (fps: number, amp = QUAKE.a) => {
  const h = new Home(fps, [0.6, 0.6]);
  const floors = h.addFloors(CANNON.Body.KINEMATIC);
  // 奥の壁も一緒に揺れる
  const walls = LANE_X.map((x) => {
    const b = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(0.1, 1.3, 1.5)), position: new CANNON.Vec3(x - 1.2, 1.3, 0) });
    h.world.addBody(b);
    return b;
  });
  const moving = [...floors, ...walls];
  const base = moving.map((b) => b.position.x);
  const drive = (t: number) => {
    // 速さで動かす（位置を直接動かすと、上の物が跳ねる）
    const v = (quakeX(t + h.dt, amp) - quakeX(t, amp)) / h.dt;
    moving.forEach((b, i) => {
      b.velocity.set(v, 0, 0);
      void base[i];
    });
  };
  return { h, walls, drive, moving };
};

// 8. 本棚：重い物を上に置く／下に置く
const shelf = (fps: number, frames: number): HomeResult => {
  const { h, walls, drive } = quakeWorld(fps, QUAKE.shelfA);
  // 本棚：奥行き 0.32（x）、幅 0.8（z）、高さ 1.8。前は +x
  const W = 0.34;
  const sx = LANE_X.map((x) => x - 1.1 + W / 2 + 0.005);
  const boards = [0.02, 0.62, 1.2, 1.78];
  sx.forEach((x) => {
    h.compound(
      18,
      [x, 0, 0],
      [
        ...boards.map((y) => ({ off: [0, y, 0] as [number, number, number], size: [W, 0.03, 0.8] as [number, number, number], color: "#f2ebe0" })),
        { off: [-W / 2 + 0.01, 0.9, 0], size: [0.02, 1.8, 0.8], color: "#e6dccb" },
        { off: [0, 0.9, -0.4], size: [W, 1.8, 0.02], color: "#e6dccb" },
        { off: [0, 0.9, 0.4], size: [W, 1.8, 0.02], color: "#e6dccb", hidden: true },
      ],
    );
  });
  // 中身：重い箱（6kg×3）と軽い箱（0.5kg×3）。左は重い物が上、右は重い物が下
  const COLORS = ["#7a4a2a", "#3d5a80", "#2f6b4a"];
  sx.forEach((x, lane) => {
    for (let k = 0; k < 3; k++) {
      for (const heavy of [true, false]) {
        const shelfY = heavy === (lane === 0) ? boards[2] : boards[0];
        const z = -0.25 + k * 0.25;
        const size: [number, number, number] = heavy ? [0.26, 0.3, 0.2] : [0.22, 0.24, 0.2];
        const y = shelfY + 0.015 + size[1] / 2;
        const b = new CANNON.Body({ mass: heavy ? 6 : 0.5, shape: new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)), position: new CANNON.Vec3(x + 0.01, y, z) });
        h.world.addBody(b);
        h.track(b, [{ off: [0, 0, 0], size, color: heavy ? COLORS[k] : "#f3d36b" }]);
      }
    }
  });
  void walls;
  const shake = new Float32Array(frames);
  return record(h, frames, fps, "shelf", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        drive(t);
        h.step(t);
      }
      shake[f] = quakeX(f / fps, QUAKE.shelfA);
      rec(f);
    }
  }, () => ({ t0: QUAKE.t0, shake }));
};

// 9. タンスと寝ている人：固定なし／L字金具で壁に固定
const furniture = (fps: number, frames: number): HomeResult => {
  const { h, walls, drive, moving } = quakeWorld(fps);
  const D = 0.45;
  const tx = LANE_X.map((x) => x - 1.1 + D / 2 + 0.005);
  const tansu = tx.map((x) =>
    h.compound(
      45,
      [x, 0, 0],
      [
        { off: [0, 0.9, 0], size: [D, 1.8, 0.9], color: "#9b6a43" },
        ...[0.3, 0.75, 1.2, 1.6].map((y) => ({ off: [D / 2 + 0.005, y, 0] as [number, number, number], size: [0.01, 0.36, 0.84] as [number, number, number], color: "#b5825a" })),
      ],
    ),
  );
  // L字金具（右の部屋）：タンスの上の角を壁につなぐ
  const wallB = walls[1];
  const wp = new CANNON.Vec3(tx[1] - D / 2, 1.78, 0);
  const anchorLocal = tansu[1].pointToLocalFrame(wp);
  const fix = new CANNON.PointToPointConstraint(tansu[1], anchorLocal, wallB, wallB.pointToLocalFrame(wp), 6000);
  h.world.addConstraint(fix);
  const fixVis = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, position: wp.clone() });
  h.track(fixVis, [{ off: [0.02, 0, 0], size: [0.05, 0.04, 0.12], color: "#c9ced6" }]);
  // ふとんで寝ている人（タンスの前、足がカメラ側）
  LANE_X.forEach((x) => {
    const fb = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.04, 1.0)), position: new CANNON.Vec3(x - 1.1 + D + 0.75, 0.04, 0) });
    h.world.addBody(fb);
    moving.push(fb);
    h.track(fb, [{ off: [0, 0, 0], size: [1.0, 0.08, 2.0], color: "#eef3fb" }]);
  });
  const rds = LANE_X.map((x, lane) => h.lying(lane, [x - 1.1 + D + 0.75, 0.2, 0.75], 0.3));
  void rds;
  const shake = new Float32Array(frames);
  const fixV = fixVis;
  return record(h, frames, fps, "furniture", (rec) => {
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < SUB; s++) {
        const t = (f * SUB + s) * h.dt;
        drive(t);
        h.step(t);
        fixV.position.copy(tansu[1].pointToWorldFrame(anchorLocal));
      }
      shake[f] = quakeX(f / fps);
      rec(f);
    }
  }, () => ({ t0: QUAKE.t0, shake }));
};

// 物体 k の、上向きからのかたむき（フレーム f）
const bodyTilt = (r: HomeResult, f: number, k: number) => {
  const o = (f * r.nBody + k) * 7;
  const q = new CANNON.Quaternion(r.body[o + 3], r.body[o + 4], r.body[o + 5], r.body[o + 6]);
  const up = q.vmult(new CANNON.Vec3(0, 1, 0));
  return Math.acos(Math.max(-1, Math.min(1, up.y)));
};

const findEvents = (r: HomeResult): HomeEvent[] => {
  const ev: HomeEvent[] = [];
  r.head.forEach((h, lane) => {
    if (h.v > 6) ev.push({ t: h.t, lane, text: "ゴンッ！", big: true });
  });
  const info = r.info;
  if (r.mode === "bath") [info.slip0, info.slip1].forEach((t, lane) => t > 0 && ev.push({ t, lane, text: "ズルッ！", big: false }));
  if (r.mode === "socks") [info.fall0, info.fall1].forEach((t, lane) => t > 0 && ev.push({ t, lane, text: "ガンッ！", big: false }));
  if (r.mode === "cord") [0, 1].forEach((lane) => ev.push({ t: r.t0, lane, text: "ガッ！", big: false }));
  if (r.mode === "bed") {
    const h = r.hits.filter((x) => x.lane === 0 && x.t > r.t0).sort((a, b) => b.v - a.v)[0];
    if (h) ev.push({ t: h.t, lane: 0, text: "ドスン！", big: true });
  }
  if (r.mode === "phone") {
    [0, 1].forEach((lane) => {
      const k = 2 + lane;
      for (let f = Math.round(r.t0 * r.fps) + 1; f < r.frames - 1; f++) {
        const y0 = r.body[(f * r.nBody + k) * 7 + 1];
        const y1 = r.body[((f + 1) * r.nBody + k) * 7 + 1];
        if (y1 >= y0 - 1e-4) {
          ev.push({ t: f / r.fps, lane, text: "ゴツッ！", big: lane === 1 });
          break;
        }
      }
    });
  }
  if (r.mode === "door") {
    if (info.stop > 0) ev.push({ t: info.stop, lane: 0, text: "コツッ", big: false });
    if (info.crush > 0) ev.push({ t: info.crush, lane: 1, text: "バキッ！", big: true });
  }
  if (r.mode === "shelf" || r.mode === "furniture") {
    [0, 1].forEach((lane) => {
      for (let f = 0; f < r.frames; f++) {
        if (bodyTilt(r, f, lane) > 1.25) {
          ev.push({ t: f / r.fps, lane, text: "ドーン！", big: true });
          break;
        }
      }
    });
  }
  return ev.sort((a, b) => a.t - b.t);
};

export const HOME_LEN: Record<HomeMode, number> = { bath: 6, socks: 6, cord: 6, ladder: 6, bed: 6, phone: 4, door: 4, shelf: 9, furniture: 9 };

const cache = new Map<string, HomeResult>();
export const simulateHome = (mode: HomeMode, fps: number): HomeResult => {
  const key = `${mode}:${fps}`;
  const c = cache.get(key);
  if (c) return c;
  const frames = Math.round(HOME_LEN[mode] * fps);
  const fn = { bath, socks, cord, ladder, bed, phone, door, shelf, furniture }[mode];
  const r = fn(fps, frames);
  r.events = findEvents(r);
  cache.set(key, r);
  return r;
};
