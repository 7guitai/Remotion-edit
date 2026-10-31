import * as CANNON from "cannon-es";
import { applyBalance, createRagdoll, POSES, Ragdoll } from "./ragdoll";

// 巨大ジェンガのシミュレーション。本物（約1.5×2.5×7.5cm・54本・18段）の20倍の木のブロックを積み、
// てっぺんに人が立つ。鉄の棒（ピストン）でブロックを1本ずつ横から押し出していき、塔が崩れるまで続ける
export const JENGA = {
  // ブロックの高さ・はば・長さ（m）
  h: 0.3,
  w: 0.5,
  l: 1.5,
  levels: 18,
  // 木の密度（kg/m³）→ 1本 約110kg
  density: 500,
  // 押し棒の太さ（半分）と長さ（半分）
  rodR: 0.09,
  rodHalf: 1.1,
};

// 抜く順番（段・何本目（0〜2）・押す向き（+1/-1）・押す速さ m/s）。下の段が0、てっぺんが17
// まん中を先に抜き、最後は「まん中がない段」の端を抜く（片側だけで支えることになる）
export const JENGA_PULLS: [number, number, number, number][] = [
  [8, 1, 1, 2.4],
  [5, 1, -1, 2.4],
  [11, 1, 1, 2.4],
  [3, 1, -1, 2.4],
  [13, 1, 1, 2.4],
  [7, 1, -1, 2.4],
  [2, 1, 1, 2.4],
  [14, 1, -1, 2.4],
  [12, 1, 1, 2.4],
  [9, 1, -1, 2.4],
  [8, 0, 1, 0.55],
  [11, 2, -1, 0.55],
  [5, 0, 1, 0.55],
];

export type JengaHit = { frame: number; v: number; kind: "block" | "body" };

export type JengaResult = {
  frames: number;
  fps: number;
  // frames × 本数 × 7（位置と向き）
  blocks: Float32Array;
  nb: number;
  // ブロックごとの色の濃さ（木目のちがい）
  tone: number[];
  // frames × 7（押し棒）
  rod: Float32Array;
  doll: Float32Array;
  parts: { name: string; size: [number, number, number]; look: string }[];
  // それぞれの時点で抜き終わった本数
  count: Int16Array;
  // 押している最中の段（ない時は -1）
  active: Int16Array;
  // 崩れ始めた時刻（秒）。崩れなければ -1
  collapse: number;
  // 塔のてっぺんが地面近くまで落ちた時刻（秒）。土けむりを出す
  land: number;
  // 押す予定（押し始め・押し終わりの時刻と段）。最後まで押したのは lastPlan 番目まで
  schedule: { t1: number; t2: number; level: number; loose: boolean }[];
  lastPlan: number;
  hits: JengaHit[];
};

const cache = new Map<string, JengaResult>();

// いつも同じ結果になる乱数
const rand = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

export const simulateJenga = (frames: number, fps: number, start = 1.2): JengaResult => {
  const key = `${frames}:${fps}:${start}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const J = JENGA;
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 40;
  (world.solver as CANNON.GSSolver).tolerance = 1e-9;
  const wood = new CANNON.Material("wood");
  const steel = new CANNON.Material("steel");
  world.addContactMaterial(new CANNON.ContactMaterial(wood, wood, { friction: 0.42, restitution: 0.02 }));
  world.addContactMaterial(new CANNON.ContactMaterial(wood, steel, { friction: 0.05, restitution: 0 }));
  // ゆるいブロック：重さがほとんどかかっていないので、こすれる力（摩擦）も小さい
  const looseMat = new CANNON.Material("loose");
  world.addContactMaterial(new CANNON.ContactMaterial(looseMat, wood, { friction: 0.03, restitution: 0.02 }));
  world.addContactMaterial(new CANNON.ContactMaterial(looseMat, steel, { friction: 0.05, restitution: 0 }));
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.02;
  // cannon-es の摩擦は「μ×重力×重さ」で決まり、上に乗っている重さ（押しつける力）を見ない。
  // しかも計算の中では、この値を「1回の時間刻みで加える勢い（力×時間）」の上限として使うので、刻みを細かくするほど摩擦が強くなりすぎる。
  // ジェンガは「重さがかかったブロックほど抜けにくい」が大事なので、1つ前の計算で出た押しつける力（N）×μ×刻み を上限にする
  const load = new Map<number, { sum: number; n: number }>();
  const pairKey = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const np = (world as any).narrowphase;
  const origFriction = np.createFrictionEquationsFromContact.bind(np);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  np.createFrictionEquationsFromContact = (ce: any, outArr: any[]) => {
    const len0 = outArr.length;
    const ok = origFriction(ce, outArr);
    if (ok) {
      let red = ce.bi.invMass + ce.bj.invMass;
      red = red > 0 ? 1 / red : 0;
      const mu = outArr[len0].maxForce / (9.8 * red || 1);
      const rec = load.get(pairKey(ce.bi.id, ce.bj.id));
      // 押しつける力は、塔ぜんぶの重さ（約6万N）までにおさえる（めりこみを直す一瞬の大きな力で、くっつかないように）
      const n = Math.min(60000, rec && rec.n > 0 ? rec.sum / rec.n : 9.8 * red);
      for (const fe of [outArr[len0], outArr[len0 + 1]]) {
        fe.maxForce = mu * n * world.dt;
        fe.minForce = -mu * n * world.dt;
      }
    }
    return ok;
  };
  const measureLoad = () => {
    load.clear();
    for (const c of world.contacts) {
      const k = pairKey(c.bi.id, c.bj.id);
      const rec = load.get(k) ?? { sum: 0, n: 0 };
      rec.sum += Math.max(0, c.multiplier);
      rec.n++;
      load.set(k, rec);
    }
  };
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: wood });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  // ブロック：段ごとに向きを90度かえる（偶数段は x 方向に長い）
  const rnd = rand(11);
  const blocks: CANNON.Body[] = [];
  const tone: number[] = [];
  const mass = J.h * J.w * J.l * J.density;
  for (let k = 0; k < J.levels; k++) {
    for (let c = 0; c < 3; c++) {
      // 本物のジェンガと同じく、ほんの少しずつ寸法がちがう（ゆるいブロックができる）
      // 抜く人は「ゆるい（重さがかかっていない）ブロック」を選ぶ。そのブロックだけ少し薄くしておく（最後の3本はゆるくない）
      const loose = JENGA_PULLS.slice(0, -3).some(([lv, ix]) => lv === k && ix === c);
      const hh = J.h / 2 - rnd() * 0.0015 - (loose ? 0.004 : 0);
      const shape = new CANNON.Box(
        k % 2 === 0 ? new CANNON.Vec3(J.l / 2, hh, J.w / 2 - 0.004) : new CANNON.Vec3(J.w / 2 - 0.004, hh, J.l / 2),
      );
      const off = (c - 1) * J.w;
      const b = new CANNON.Body({
        mass,
        shape,
        material: loose ? looseMat : wood,
        position: new CANNON.Vec3(k % 2 === 0 ? 0 : off, J.h / 2 + k * J.h, k % 2 === 0 ? off : 0),
        linearDamping: 0.01,
        angularDamping: 0.02,
      });
      b.collisionFilterGroup = 1;
      b.collisionFilterMask = 1 | 2 | 4;
      world.addBody(b);
      blocks.push(b);
      tone.push(rnd());
    }
  }
  // 押し棒（動きを決めて動かす。ブロックにだけ当たる）
  const rod = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: steel });
  rod.addShape(new CANNON.Box(new CANNON.Vec3(J.rodHalf, J.rodR, J.rodR)));
  rod.collisionFilterGroup = 2;
  rod.collisionFilterMask = 1;
  rod.position.set(-8, 3, 0);
  world.addBody(rod);
  // 人（てっぺんに立つ）
  const top = J.levels * J.h;
  const rd: Ragdoll = createRagdoll(world, [0, top + 0.01, 0], 0.5);
  rd.balance = 1;
  const names = Object.keys(rd.bodies) as (keyof Ragdoll["bodies"])[];
  const bodies = names.map((nm) => rd.bodies[nm]);
  bodies.forEach((b) => (b.collisionFilterMask = 1));

  // 押し棒の動き：1本ごとに「構える → 押す → 下がる」
  type Plan = { t0: number; t1: number; t2: number; level: number; from: CANNON.Vec3; to: CANNON.Vec3; axis: "x" | "z"; sign: number; idx: number };
  const plans: Plan[] = [];
  let t = start;
  const approach = 0.4;
  for (const [level, idx, sign, speed] of JENGA_PULLS) {
    const axis = level % 2 === 0 ? "x" : "z";
    const y = J.h / 2 + level * J.h;
    const off = (idx - 1) * J.w;
    // 棒の中心：押し始め（棒の先がブロックの端の少し手前）→ 押し終わり（ブロックが下の段から落ちる所まで）
    const s0 = -sign * (J.l / 2 + J.rodHalf + J.rodR + 0.25);
    const s1 = -sign * (J.rodHalf - J.l / 2 - 0.12);
    const v = (a: number) => (axis === "x" ? new CANNON.Vec3(a, y, off) : new CANNON.Vec3(off, y, a));
    const dur = Math.abs(s1 - s0) / speed;
    plans.push({ t0: t, t1: t + approach, t2: t + approach + dur, level, from: v(s0), to: v(s1), axis, sign, idx });
    t += approach + dur + 0.25;
  }

  const sub = 8;
  const dt = 1 / (fps * sub);
  const nb = blocks.length;
  const out = new Float32Array(frames * nb * 7);
  const rodOut = new Float32Array(frames * 7);
  const doll = new Float32Array(frames * bodies.length * 7);
  const count = new Int16Array(frames);
  const active = new Int16Array(frames);
  const hits: JengaHit[] = [];
  const prevV = new Float32Array(nb * 3);
  const prevB = new Float32Array(bodies.length);
  let collapse = -1;
  let lastPlan = plans.length - 1;
  let land = -1;
  // 人が力を抜く（足もとが動き出した）
  let fall = false;
  let done = 0;
  const topIdx = blocks.length - 2;
  const q = new CANNON.Quaternion();
  for (let fr = 0; fr < frames; fr++) {
    let act = -1;
    for (let s = 0; s < sub; s++) {
      const tt = (fr * sub + s) * dt;
      // 押し棒の位置
      const pi = plans.findIndex((p) => tt < p.t2 + 0.25);
      // 崩れ始めたら、いま押している1本で終わり（次は押さない）
      if (pi < 0 || pi > lastPlan) {
        rod.velocity.set((-8 - rod.position.x) / dt, (3 - rod.position.y) / dt, -rod.position.z / dt);
        rod.collisionResponse = false;
      } else {
        const p = plans[pi];
        const prev = pi > 0 ? plans[pi - 1] : null;
        let pos: CANNON.Vec3;
        if (tt < p.t1) {
          // 構える：前の終わりの位置（または画面の外）から、次の押し始めの位置へ
          const back = prev ? prev.from : new CANNON.Vec3(p.from.x * 2.5, p.from.y, p.from.z * 2.5);
          const u = Math.max(0, Math.min(1, (tt - p.t0) / (p.t1 - p.t0)));
          const e = u * u * (3 - 2 * u);
          pos = new CANNON.Vec3(back.x + (p.from.x - back.x) * e, back.y + (p.from.y - back.y) * e, back.z + (p.from.z - back.z) * e);
          rod.collisionResponse = false;
        } else if (tt < p.t2) {
          const u = (tt - p.t1) / (p.t2 - p.t1);
          pos = new CANNON.Vec3(p.from.x + (p.to.x - p.from.x) * u, p.from.y, p.from.z + (p.to.z - p.from.z) * u);
          rod.collisionResponse = true;
          act = p.level;
        } else {
          // 下がる
          const u = Math.min(1, (tt - p.t2) / 0.25);
          pos = new CANNON.Vec3(p.to.x + (p.from.x - p.to.x) * u, p.from.y, p.to.z + (p.from.z - p.to.z) * u);
          rod.collisionResponse = false;
          if (u >= 1 && done < pi + 1) done = pi + 1;
        }
        // 動きを決めた物体は、速さで動かす（位置を直接書きかえると、ぶつかった相手に大きな力が出てしまう）
        rod.velocity.set((pos.x - rod.position.x) / dt, (pos.y - rod.position.y) / dt, (pos.z - rod.position.z) / dt);
        if (plans[pi].axis === "z") {
          q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
          rod.quaternion.copy(q);
        } else {
          rod.quaternion.set(0, 0, 0, 1);
        }
        if (tt >= p.t2 && done < pi + 1) done = pi + 1;
      }
      // 人：崩れるまでは立っている。崩れたら力が抜ける
      if (!fall) {
        rd.setPose(POSES.stand);
        applyBalance(rd);
      } else {
        rd.balance = 0;
        rd.setPose(POSES.air);
        rd.setStrength(0.5);
      }
      // ゆっくりした ずれ（計算の誤差で、止まっているはずの塔が少しずつ すべる）をおさえる。本物の木のブロックは じわじわ すべらない
      for (const b of blocks) {
        if (b.velocity.lengthSquared() < 0.02 * 0.02 && b.angularVelocity.lengthSquared() < 0.04 * 0.04) {
          b.velocity.scale(0.9, b.velocity);
          b.angularVelocity.scale(0.9, b.angularVelocity);
        }
      }
      world.step(dt);
      measureLoad();
    }
    // 足もとが動き出したら、人は力が抜ける。崩れ始め：てっぺんの段が 0.3m 以上下がるか、0.6m 以上ずれた
    const tb = blocks[topIdx];
    if (fr / fps > start && tb.velocity.length() > 0.4) fall = true;
    if (collapse >= 0 && land < 0 && tb.position.y < 1) land = (fr + 1) / fps;
    if (collapse < 0 && (tb.position.y < top - J.h / 2 - 0.3 || Math.hypot(tb.position.x, tb.position.z) > 0.6)) {
      collapse = (fr + 1) / fps;
      const tc = collapse;
      lastPlan = Math.max(0, plans.findIndex((p) => tc < p.t2 + 0.25));
      fall = true;
    }
    // 落ちたブロックの音：速さが急に落ちたら「ぶつかった」とみなす
    let best = 0;
    for (let i = 0; i < nb; i++) {
      const b = blocks[i];
      const dv = Math.hypot(b.velocity.x - prevV[i * 3], b.velocity.y - prevV[i * 3 + 1], b.velocity.z - prevV[i * 3 + 2]);
      if (dv > 1.2 && prevV[i * 3 + 1] < -1) best = Math.max(best, dv);
      prevV[i * 3] = b.velocity.x;
      prevV[i * 3 + 1] = b.velocity.y;
      prevV[i * 3 + 2] = b.velocity.z;
    }
    if (best > 0 && !hits.some((h) => h.kind === "block" && fr - h.frame < 3)) hits.push({ frame: fr, v: best, kind: "block" });
    let bb = 0;
    bodies.forEach((b, i) => {
      if (prevB[i] < -2 && b.velocity.y - prevB[i] > 2) bb = Math.max(bb, b.velocity.y - prevB[i]);
      prevB[i] = b.velocity.y;
    });
    if (bb > 0 && !hits.some((h) => h.kind === "body" && fr - h.frame < 6)) hits.push({ frame: fr, v: bb, kind: "body" });

    blocks.forEach((b, i) => {
      const o = (fr * nb + i) * 7;
      out[o] = b.position.x; out[o + 1] = b.position.y; out[o + 2] = b.position.z;
      out[o + 3] = b.quaternion.x; out[o + 4] = b.quaternion.y; out[o + 5] = b.quaternion.z; out[o + 6] = b.quaternion.w;
    });
    rodOut.set([rod.position.x, rod.position.y, rod.position.z, rod.quaternion.x, rod.quaternion.y, rod.quaternion.z, rod.quaternion.w], fr * 7);
    bodies.forEach((b, i) => {
      const o = (fr * bodies.length + i) * 7;
      doll[o] = b.position.x; doll[o + 1] = b.position.y; doll[o + 2] = b.position.z;
      doll[o + 3] = b.quaternion.x; doll[o + 4] = b.quaternion.y; doll[o + 5] = b.quaternion.z; doll[o + 6] = b.quaternion.w;
    });
    count[fr] = done;
    active[fr] = act;
  }
  const res: JengaResult = {
    frames,
    fps,
    blocks: out,
    nb,
    tone,
    rod: rodOut,
    doll,
    parts: names.map((nm) => ({ name: nm, size: rd.sizes[nm], look: rd.looks[nm] })),
    count,
    active,
    collapse,
    land,
    schedule: plans.map((p, i) => ({ t1: p.t1, t2: p.t2, level: p.level, loose: i < JENGA_PULLS.length - 3 })),
    lastPlan,
    hits,
  };
  cache.set(key, res);
  return res;
};
