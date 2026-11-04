import * as CANNON from "cannon-es";
import { fixFriction } from "../../sim/home";
import { CM, flux, power } from "./lampPhysics";

// 夜の広場の街灯と、まわりの3つのビル（cannon-es）。
// 街灯の光はビルのブロック（1.5m 角のコンクリート）に、いちばん手前の面にだけ当たる（光線をブロックの中心へ飛ばして、
// とちゅうで別のブロックに当たったら影）。受けた光の強さ E = P/(4πd²)×cosθ から
//   ・表面の温度（放射平衡）→ 赤く光る・白く光る（描くときに計算）
//   ・E が 10⁶ W/m² をこえると表面が蒸発し、その反動で押される：力 = Cm × E × 面積（Cm = 3×10⁻⁵ N/W）
// を毎フレーム出す。光は1秒ごとに2倍なので、手前の層から順に、ビルが外へ押し飛ばされる。

export const LAMP = new CANNON.Vec3(0, 5.2, 0);
export const BLOCK = 1.5;
const AREA = BLOCK * BLOCK;
const ABLATE = 1e6;

// ビル：axis の向き（sign）に d0 から奥へ layers 層、横に cols 列、上に rows 段
export type Building = { axis: "x" | "z"; sign: number; d0: number; cols: number; rows: number; layers: number; color: string };
export const BUILDINGS: Building[] = [
  { axis: "x", sign: 1, d0: 10, cols: 7, rows: 7, layers: 2, color: "#d9cdb8" }, // 東（向かいのビル）
  { axis: "z", sign: -1, d0: 11, cols: 7, rows: 6, layers: 2, color: "#c9d2dc" }, // 北
  { axis: "x", sign: -1, d0: 11.5, cols: 6, rows: 8, layers: 2, color: "#e3d3c8" }, // 西
];

export type LampSim = {
  fps: number;
  t0: number;
  frames: number;
  nBody: number;
  kind: { building: number; facade: boolean; row: number; col: number; normal: [number, number, number] }[];
  data: Float32Array; // frames × nBody × 7（位置・向き）
  // 光の当たり方 g（E = P(t) × g）。frames × nBody。t0 より前は exp0
  expo: Float32Array;
  exp0: Float32Array;
  lands: { t: number; p: [number, number, number]; v: number }[];
};

export const blockCenter = (b: Building, l: number, r: number, c: number): [number, number, number] => {
  const n = b.sign * (b.d0 + (l + 0.5) * BLOCK);
  const s = (c - (b.cols - 1) / 2) * BLOCK;
  const y = (r + 0.5) * BLOCK;
  return b.axis === "x" ? [n, y, s] : [s, y, n];
};

let cache: LampSim | null = null;

export const simulateLamp = (t0 = 31, t1 = 41.5): LampSim => {
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
  const kind: LampSim["kind"] = [];
  const shape = new CANNON.Box(new CANNON.Vec3(BLOCK / 2 - 0.01, BLOCK / 2 - 0.005, BLOCK / 2 - 0.01));
  BUILDINGS.forEach((b, bi) => {
    for (let l = 0; l < b.layers; l++)
      for (let r = 0; r < b.rows; r++)
        for (let c = 0; c < b.cols; c++) {
          const [x, y, z] = blockCenter(b, l, r, c);
          const body = new CANNON.Body({ mass: 1500, shape, position: new CANNON.Vec3(x, y, z) });
          body.sleepSpeedLimit = 0.2;
          body.sleepTimeLimit = 0.5;
          world.addBody(body);
          body.sleep();
          bodies.push(body);
          const normal: [number, number, number] = b.axis === "x" ? [-b.sign, 0, 0] : [0, 0, -b.sign];
          kind.push({ building: bi, facade: l === 0, row: r, col: c, normal });
        }
  });
  const nBody = bodies.length;
  const idOf = new Map(bodies.map((b, i) => [b.id, i]));
  const result = new CANNON.RaycastResult();
  const inv = new CANNON.Quaternion();

  // 光の当たり方：街灯からブロックの中心へ光線を飛ばし、最初に当たったのがそのブロックなら日なた
  const exposure = (out: Float32Array, off: number, hitOut?: (CANNON.Vec3 | null)[]) => {
    bodies.forEach((b, i) => {
      const to = b.position;
      const dir = to.vsub(LAMP);
      const d = dir.length();
      dir.scale(1 / d, dir);
      result.reset();
      world.raycastClosest(LAMP, to.vadd(dir.scale(0.05)), { skipBackfaces: true }, result);
      let g = 0;
      if (result.hasHit && result.body && idOf.get(result.body.id) === i) {
        // いちばん光のほうを向いた面の cos（ブロックの向きで見る）
        b.quaternion.conjugate(inv);
        const local = inv.vmult(dir);
        const cos = Math.max(Math.abs(local.x), Math.abs(local.y), Math.abs(local.z));
        const dh = result.hitPointWorld.vsub(LAMP).length();
        g = cos / (4 * Math.PI * dh * dh);
        if (hitOut) hitOut[i] = result.hitPointWorld.clone();
      } else if (hitOut) hitOut[i] = null;
      out[off + i] = g;
    });
  };

  const exp0 = new Float32Array(nBody);
  exposure(exp0, 0);

  const fps = 60;
  const sub = 4;
  const dt = 1 / (fps * sub);
  const frames = Math.round((t1 - t0) * fps);
  const data = new Float32Array(frames * nBody * 7);
  const expo = new Float32Array(frames * nBody);
  const lands: LampSim["lands"] = [];
  const prevVy = new Float32Array(nBody);
  const hitP: (CANNON.Vec3 | null)[] = new Array(nBody).fill(null);

  for (let f = 0; f < frames; f++) {
    const t = t0 + f / fps;
    exposure(expo, f * nBody, hitP);
    const P = power(t);
    bodies.forEach((b, i) => {
      const E = P * expo[f * nBody + i];
      if (E < ABLATE || !hitP[i] || b.type !== CANNON.Body.DYNAMIC) return;
      // 蒸発の反動：光の来る向きと反対へ（街灯から遠ざかる向き）
      const dir = b.position.vsub(LAMP);
      dir.normalize();
      const imp = dir.scale((CM * E * AREA) / fps);
      b.wakeUp();
      b.applyImpulse(imp, hitP[i]!.vsub(b.position).scale(0.6));
    });
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
      if (prevVy[i] < -6 && b.velocity.y > -1 && b.position.y < 2.5) lands.push({ t, p: [b.position.x, 0, b.position.z], v: -prevVy[i] });
      prevVy[i] = b.velocity.y;
      if (b.position.length() > 600 && b.type === CANNON.Body.DYNAMIC) {
        b.type = CANNON.Body.STATIC;
        b.velocity.set(0, 0, 0);
      }
    });
  }
  void flux;
  cache = { fps, t0, frames, nBody, kind, data, expo, exp0, lands };
  return cache;
};

const frameOf = (sim: LampSim, t: number) => Math.max(0, Math.min(sim.frames - 1, Math.round((t - sim.t0) * sim.fps)));

export const lampPose = (sim: LampSim, t: number, i: number) => {
  const f = frameOf(sim, t);
  const o = (f * sim.nBody + i) * 7;
  const d = sim.data;
  return { p: [d[o], d[o + 1], d[o + 2]] as [number, number, number], q: [d[o + 3], d[o + 4], d[o + 5], d[o + 6]] as [number, number, number, number] };
};

// t のときにブロック i が受けている光の強さ（W/m²）
export const blockFlux = (sim: LampSim, t: number, i: number) => {
  const g = t < sim.t0 ? sim.exp0[i] : sim.expo[frameOf(sim, t) * sim.nBody + i];
  return power(t) * g;
};
