import * as CANNON from "cannon-es";
import { applyBalance, createRagdoll, PartName, Pose, POSES, Ragdoll } from "./ragdoll";

// 【検証】階段でつまずいたら、上りと下り どっちが危ない？
// 家の階段（けあげ20cm・ふみづら24cm・14段、高さ2.8m）で、人がつまずく場面を物理エンジンで計算する。
//  up   ：上りで、つま先が段の角に引っかかる → 前の段に手をつく
//  down ：下りで、足を踏み外す → 前へ投げ出されて、下まで転げ落ちる
//  rail ：下りで同じように踏み外すが、手すりを持っている
export type StairsMode = "up" | "down" | "rail";

export const STAIRS = { n: 14, rise: 0.2, run: 0.24, width: 0.9, trip: 0.9, len: 7, railZ: -0.36 };

export type StairsHit = { t: number; v: number; part: PartName };

export type StairsResult = {
  mode: StairsMode;
  frames: number;
  fps: number;
  parts: { name: PartName; size: [number, number, number]; look: string }[];
  doll: Float32Array;
  // 頭の速さ（km/h）
  headV: Float32Array;
  // 落ちた段数（足もとの高さから）
  steps: Float32Array;
  hits: StairsHit[];
  // 頭がぶつかったときの、いちばん大きい速さ（km/h）とその時刻
  headHit: number;
  headHitT: number;
  // 手すりの位置（rail のとき）：つかんだ点
  grip: [number, number, number] | null;
  startStep: number;
};

const G = 9.8;
const S = STAIRS;

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

// 手すりを左手で持って下りる
const RAIL_STEP: Pose = {
  ...POSES.stepL,
  shoulderL: [-0.35, 0, -0.55],
  elbowL: [-0.5, 0, 0],
};

const cache = new Map<string, StairsResult>();

export const stepTop = (i: number) => i * S.rise;

export const simulateStairs = (mode: StairsMode, fps: number): StairsResult => {
  const key = `${mode}:${fps}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const frames = Math.round(S.len * fps);
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 30;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.05;
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);
  // 段（床から段の上面までの箱）と、上の階の床
  for (let i = 1; i <= S.n; i++) {
    const h = stepTop(i);
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(S.run / 2, h / 2, S.width / 2)), position: new CANNON.Vec3((i - 0.5) * S.run, h / 2, 0) });
    world.addBody(b);
  }
  const top = stepTop(S.n);
  world.addBody(new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(1.5, top / 2, S.width / 2)), position: new CANNON.Vec3(S.n * S.run + 1.5, top / 2, 0) }));
  // 両側の壁（体が横へ落ちないように。見た目は奥の壁だけ）
  for (const z of [-S.width / 2 - 0.05, S.width / 2 + 0.05]) {
    world.addBody(new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(6, 3, 0.05)), position: new CANNON.Vec3(S.n * S.run * 0.5, 3, z) }));
  }

  const down = mode !== "up";
  const k = down ? 12 : 4;
  // 下りは -x を向く（yaw = -90°）、上りは +x を向く
  const yaw = down ? -Math.PI / 2 : Math.PI / 2;
  const x0 = (k - 0.5) * S.run + (down ? 0.02 : -0.04);
  const rd: Ragdoll = createRagdoll(world, [x0, stepTop(k), 0], yaw);
  const startPose = mode === "up" ? POSES.swing : mode === "rail" ? RAIL_STEP : POSES.stepL;
  rd.setPose(startPose);
  rd.balance = 1;
  const names = Object.keys(rd.bodies) as PartName[];
  const nP = names.length;
  // 最初の姿勢になじませる（体を固定したまま関節だけ動かす）
  const sub = 10;
  const dt = 1 / (fps * sub);
  const pelvisHold = rd.bodies.pelvis.position.clone();
  for (let i = 0; i < 240; i++) {
    applyBalance(rd);
    world.step(dt);
    const d = pelvisHold.vsub(rd.bodies.pelvis.position);
    for (const b of Object.values(rd.bodies)) {
      b.position.vadd(d, b.position);
      b.velocity.set(0, 0, 0);
      b.angularVelocity.set(0, 0, 0);
    }
  }
  const settled = Object.fromEntries(names.map((n) => [n, { p: rd.bodies[n].position.clone(), q: rd.bodies[n].quaternion.clone() }]));
  const freeze = () => {
    for (const n of names) {
      const b = rd.bodies[n];
      b.position.copy(settled[n].p);
      b.quaternion.copy(settled[n].q);
      b.velocity.set(0, 0, 0);
      b.angularVelocity.set(0, 0, 0);
    }
  };
  freeze();

  const doll = new Float32Array(frames * nP * 7);
  const headV = new Float32Array(frames);
  const steps = new Float32Array(frames);
  const hits: StairsHit[] = [];
  const footY0 = stepTop(k);
  let tripped = false;
  let grip: CANNON.PointToPointConstraint | null = null;
  let gripPos: [number, number, number] | null = null;
  const prevV = Object.fromEntries(names.map((n) => [n, new CANNON.Vec3()])) as Record<PartName, CANNON.Vec3>;
  let headHit = 0;
  let headHitT = -1;
  let lowest = footY0;
  const dir = down ? -1 : 1;
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f * sub + s) * dt;
      if (t < S.trip) {
        freeze();
        continue;
      }
      if (!tripped) {
        tripped = true;
        for (const n of names) {
          const b = rd.bodies[n];
          b.velocity.set(dir * (down ? 1.3 : 1.0), down ? -0.3 : 0.1, 0);
        }
        if (down) {
          // 下り：体をのせていた足のかかとが、段の角からすべり落ちる
          rd.bodies.footR.velocity.set(dir * 2.2, -0.5, 0);
          rd.bodies.shinR.velocity.set(dir * 1.8, -0.4, 0);
        } else {
          // 上り：つま先が次の段の角に引っかかって止まる
          rd.bodies.footR.velocity.set(0, 0, 0);
          rd.bodies.shinR.velocity.scale(0.3, rd.bodies.shinR.velocity);
        }
        rd.balance = 0;
        rd.setStrength(down ? 0.2 : 0.35);
        rd.setPose(BRACE);
        if (mode === "rail") {
          // 左手で手すりを握る（握る力は 体重の約1.5倍まで）
          const hand = rd.bodies.lowerArmL;
          const local = new CANNON.Vec3(0, -0.13, 0);
          const wp = hand.pointToWorldFrame(local);
          const anchor = new CANNON.Body({ mass: 0, position: wp.clone() });
          anchor.collisionResponse = false;
          world.addBody(anchor);
          grip = new CANNON.PointToPointConstraint(hand, local, anchor, new CANNON.Vec3(0, 0, 0), 1000);
          world.addConstraint(grip);
          gripPos = [wp.x, wp.y, wp.z];
          // 手すりを持った腕は、ひじを少し曲げて体を引きもどす
          rd.setStrength(0.6, ["shoulderL", "elbowL", "waist", "hipL", "hipR", "kneeL", "kneeR"]);
          rd.setPose({ ...BRACE, shoulderL: [-0.6, 0, -0.5], elbowL: [-0.6, 0, 0], shoulderR: [-1.2, 0, 0.3] });
        }
      }
      world.step(dt);
      // ぶつかった瞬間（速さが一気に落ちた）を記録
      for (const n of names) {
        const v = rd.bodies[n].velocity;
        const dv = prevV[n].vsub(v).length();
        const sp = prevV[n].length();
        if (dv > 1.2 && sp > 1.2) {
          const last = hits.length ? hits[hits.length - 1] : null;
          if (!last || t - last.t > 0.06) hits.push({ t, v: sp, part: n });
          else if (sp > last.v) Object.assign(last, { v: sp, part: n });
          if (n === "head" && sp * 3.6 > headHit) {
            headHit = sp * 3.6;
            headHitT = t;
          }
        }
        prevV[n].copy(v);
      }
    }
    names.forEach((n, i) => {
      const b = rd.bodies[n];
      const o = (f * nP + i) * 7;
      doll.set([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], o);
    });
    headV[f] = rd.bodies.head.velocity.length() * 3.6;
    const fy = Math.min(rd.bodies.footL.position.y, rd.bodies.footR.position.y, rd.bodies.pelvis.position.y - 0.1) - 0.04;
    lowest = Math.min(lowest, fy);
    steps[f] = Math.max(0, Math.round((footY0 - lowest) / S.rise));
  }
  const res: StairsResult = {
    mode,
    frames,
    fps,
    parts: names.map((n) => ({ name: n, size: rd.sizes[n], look: rd.looks[n] })),
    doll,
    headV,
    steps,
    hits,
    headHit,
    headHitT,
    grip: gripPos,
    startStep: k,
  };
  cache.set(key, res);
  return res;
};
