import * as CANNON from "cannon-es";
import { fixFriction } from "../sim/home";

// 街の破壊（物理エンジン cannon-es）。
// 向かいのビルと、うしろのビルを、コンクリートのブロック（1.5m 角）を積んで作る。
// 風は扇風機の口から円すい状に広がる「光線（レイ）」の束で表し、毎回いちばん手前に当たったブロックを押す。
// 1本のレイが運ぶ力 = 全体の押す力 F(t) ÷ 本数。F は1秒ごとに2倍なので、
//   最初は1つめのブロックだけが抜け（壁に穴があく）→ 奥のブロック → 上のブロックが落ちてきて吹き飛ぶ（全体崩壊）
// という順番が、計算から自然に出てくる。

export type TownSimInput = {
  // 押す力（N）を t の関数で
  force: (t: number) => number;
  // うしろのビルが反動でくずれる時刻
  reactionT: number;
  // 計算する範囲（これより前は何も動かないので省く）
  t0: number;
  t1: number;
};

export const NOZZLE = new CANNON.Vec3(0, 1.05, 0);
export const BLOCK = 1.5;
// 向かいのビル（x 16〜19）と、うしろのビル（x -20〜-17）
export const FRONT = { x0: 16, cols: 8, rows: 8, layers: 2 };
export const BACK = { x0: -20, cols: 7, rows: 6, layers: 2 };

export type TownSim = {
  fps: number;
  t0: number;
  frames: number;
  nBody: number;
  // 各ブロック：どちらのビルか（0 向かい、1 うしろ）、外側の面か（窓をつける）
  kind: { building: number; facade: boolean; row: number; col: number }[];
  data: Float32Array; // frames × nBody × 7
  // 風がブロックに強く当たった瞬間（破片と粉じんを出す）
  hits: { t: number; p: [number, number, number] }[];
  // ブロックが地面に落ちた瞬間（土けむり）
  lands: { t: number; p: [number, number, number]; v: number }[];
};

let cache: TownSim | null = null;

export const simulateTown = (inp: TownSimInput): TownSim => {
  if (cache) return cache;
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = 12;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.05;
  const measure = fixFriction(world);
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);

  const bodies: CANNON.Body[] = [];
  const kind: TownSim["kind"] = [];
  const half = new CANNON.Vec3(BLOCK / 2 - 0.01, BLOCK / 2 - 0.005, BLOCK / 2 - 0.01);
  const shape = new CANNON.Box(half);
  const build = (b: { x0: number; cols: number; rows: number; layers: number }, building: number) => {
    for (let l = 0; l < b.layers; l++)
      for (let r = 0; r < b.rows; r++)
        for (let c = 0; c < b.cols; c++) {
          const x = b.x0 + (l + 0.5) * BLOCK;
          const z = (c - (b.cols - 1) / 2) * BLOCK;
          const body = new CANNON.Body({ mass: 1500, shape, position: new CANNON.Vec3(x, (r + 0.5) * BLOCK, z) });
          body.sleepSpeedLimit = 0.2;
          body.sleepTimeLimit = 0.5;
          world.addBody(body);
          body.sleep();
          bodies.push(body);
          // 窓をつける面：向かいのビルは扇風機側（いちばん手前の層）、うしろのビルも扇風機側
          const facade = building === 0 ? l === 0 : l === b.layers - 1;
          kind.push({ building, facade, row: r, col: c });
        }
  };
  build(FRONT, 0);
  build(BACK, 1);

  // 風のレイ：中心＋同心円（6, 12, 18, 24 本）
  const rays: [number, number][] = [[0, 0]];
  [6, 12, 18, 24].forEach((n, ring) => {
    for (let k = 0; k < n; k++) rays.push([((ring + 1) / 4) * Math.cos((k / n) * Math.PI * 2), ((ring + 1) / 4) * Math.sin((k / n) * Math.PI * 2)]);
  });

  const fps = 60;
  const sub = 4;
  const dt = 1 / (fps * sub);
  const frames = Math.round((inp.t1 - inp.t0) * fps);
  const nBody = bodies.length;
  const data = new Float32Array(frames * nBody * 7);
  const hits: TownSim["hits"] = [];
  const lands: TownSim["lands"] = [];
  const lastHit = new Float32Array(nBody).fill(-9);
  const prevVy = new Float32Array(nBody);
  const idOf = new Map(bodies.map((b, i) => [b.id, i]));
  const result = new CANNON.RaycastResult();
  let reacted = false;

  for (let f = 0; f < frames; f++) {
    const t = inp.t0 + f / fps;
    // 風：広がりは最初は細く、押す力が数十トンを超えるころ衝撃波のように広がる
    const spread = 0.05 + 0.4 * Math.min(1, Math.max(0, (t - 16.2) / 2.2));
    const F = inp.force(t);
    const per = F / rays.length;
    for (const [u, v] of rays) {
      const dir = new CANNON.Vec3(1, u * spread * 0.9 + 0.01, v * spread);
      dir.normalize();
      const to = NOZZLE.vadd(dir.scale(80));
      result.reset();
      world.raycastClosest(NOZZLE, to, { skipBackfaces: true, collisionFilterMask: -1 }, result);
      if (!result.hasHit || !result.body || result.body.mass === 0) continue;
      const i = idOf.get(result.body.id);
      if (i === undefined) continue;
      const b = result.body;
      // 1フレームぶんの力積（4サブステップぶん、フレームの最初にまとめて与える）
      const imp = dir.scale(per / fps);
      const rel = result.hitPointWorld.vsub(b.position);
      b.wakeUp();
      b.applyImpulse(imp, rel);
      if (per > 2e3 && t - lastHit[i] > 0.4) {
        lastHit[i] = t;
        hits.push({ t, p: [result.hitPointWorld.x, result.hitPointWorld.y, result.hitPointWorld.z] });
      }
    }
    // うしろのビル：反動の衝撃で一気にくずれる（扇風機は魔法で固定）
    if (!reacted && t >= inp.reactionT) {
      reacted = true;
      bodies.forEach((b, i) => {
        if (kind[i].building !== 1) return;
        const h = b.position.y / (BACK.rows * BLOCK);
        const s = Math.sin(i * 12.9898) * 43758.5453;
        const rnd = s - Math.floor(s);
        b.wakeUp();
        b.velocity.set(-(4 + 9 * h + 3 * rnd), 2 * rnd, (rnd - 0.5) * 3);
        b.angularVelocity.set((rnd - 0.5) * 2, 0, 1 + rnd);
      });
    }
    for (let s = 0; s < sub; s++) {
      world.step(dt);
      measure();
    }
    bodies.forEach((b, i) => {
      const o = (f * nBody + i) * 7;
      data[o] = b.position.x;
      data[o + 1] = b.position.y;
      data[o + 2] = b.position.z;
      data[o + 3] = b.quaternion.x;
      data[o + 4] = b.quaternion.y;
      data[o + 5] = b.quaternion.z;
      data[o + 6] = b.quaternion.w;
      // 地面に落ちた瞬間（下向きの速さが急に消えた）
      if (prevVy[i] < -6 && b.velocity.y > -1 && b.position.y < 2.5) lands.push({ t, p: [b.position.x, 0, b.position.z], v: -prevVy[i] });
      prevVy[i] = b.velocity.y;
      // 遠くへ飛んでいったブロックは止める（計算を軽く）
      if (Math.abs(b.position.x) > 400 && b.type === CANNON.Body.DYNAMIC) {
        b.type = CANNON.Body.STATIC;
        b.velocity.set(0, 0, 0);
      }
    });
  }
  cache = { fps, t0: inp.t0, frames, nBody, kind, data, hits, lands };
  return cache;
};

// t のときのブロックの位置と向き（t0 より前は最初の位置）
export const townPose = (sim: TownSim, t: number, i: number) => {
  const f = Math.max(0, Math.min(sim.frames - 1, Math.round((t - sim.t0) * sim.fps)));
  const o = (f * sim.nBody + i) * 7;
  const d = sim.data;
  return { p: [d[o], d[o + 1], d[o + 2]] as [number, number, number], q: [d[o + 3], d[o + 4], d[o + 5], d[o + 6]] as [number, number, number, number] };
};
