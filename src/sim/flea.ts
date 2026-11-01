import * as CANNON from "cannon-es";
import { applyBalance, createRagdoll, POSES, Ragdoll } from "./ragdoll";

// もし人間がノミと同じジャンプ力だったら？
// ノミ（ウサギノミ）は体長の約23倍の高さまで跳ぶ（Bennet-Clark & Alder 1967）。人（175cm）なら約40m。
// 40m まで上がるには、跳び出す速さが √(2 × 9.8 × 40) ≒ 秒速28m（時速100km）。空中にいる時間は約5.7秒。
// 左はふつうの人（50cmくらい跳ぶ）、右はノミのジャンプ力の人。右の人は少し前へ跳び、止めてある車の屋根に落ちる
export const FLEA = {
  // 跳ぶ時刻（しゃがみ始め）、しゃがむ時間
  jump: 2.2,
  crouch: 0.45,
  // 跳び出す速さ（上・前）
  up: 28.1,
  fwd: 0.75,
  // 2人の立つ位置（x）と、車の位置
  x: [-1.6, 1.6],
  car: { x: 5.9, z: 0 },
  // 13階建てのビル（1階3m）
  building: { x: -9, z: -6, w: 10, d: 10, h: 39 },
};

export type FleaResult = {
  frames: number;
  fps: number;
  doll: Float32Array;
  nParts: number;
  parts: { name: string; size: [number, number, number]; look: string; lane: number }[];
  car: Float32Array;
  // 右の人の高さ（足もと）と速さ（km/h）
  height: Float32Array;
  speed: Float32Array;
  launch: number;
  land: number;
  landV: number;
  hits: { frame: number; v: number }[];
};

const cache = new Map<string, FleaResult>();

export const simulateFlea = (frames: number, fps: number): FleaResult => {
  const key = `${frames}:${fps}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 30;
  world.defaultContactMaterial.friction = 0.7;
  world.defaultContactMaterial.restitution = 0.05;
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);
  // 車（1.2トン）。車体は地面から少し浮いている（タイヤの分）。屋根の高さ 約1.45m
  const car = new CANNON.Body({ mass: 1200, position: new CANNON.Vec3(FLEA.car.x, 0.7, FLEA.car.z) });
  car.addShape(new CANNON.Box(new CANNON.Vec3(2.0, 0.45, 0.85)));
  car.addShape(new CANNON.Box(new CANNON.Vec3(2.0, 0.13, 0.7)), new CANNON.Vec3(0, -0.57, 0));
  car.addShape(new CANNON.Box(new CANNON.Vec3(1.1, 0.27, 0.75)), new CANNON.Vec3(-0.25, 0.72, 0));
  world.addBody(car);
  const dolls: Ragdoll[] = FLEA.x.map((x) => createRagdoll(world, [x, 0, 0], 0));
  dolls.forEach((rd) => (rd.balance = 1));
  const names = Object.keys(dolls[0].bodies) as (keyof Ragdoll["bodies"])[];
  const nParts = names.length;
  const sub = 10;
  const dt = 1 / (fps * sub);
  const doll = new Float32Array(frames * nParts * 2 * 7);
  const carOut = new Float32Array(frames * 7);
  const height = new Float32Array(frames);
  const speed = new Float32Array(frames);
  const hits: { frame: number; v: number }[] = [];
  const launched = [false, false];
  let launch = -1;
  let land = -1;
  let landV = 0;
  let prevVy = 0;
  const footY = (rd: Ragdoll) => Math.min(rd.bodies.footL.position.y, rd.bodies.footR.position.y);
  for (let fr = 0; fr < frames; fr++) {
    for (let s = 0; s < sub; s++) {
      const t = (fr * sub + s) * dt;
      dolls.forEach((rd, lane) => {
        const k = t - FLEA.jump;
        if (k < 0) {
          rd.setPose(POSES.stand);
        } else if (k < FLEA.crouch) {
          rd.setPose(POSES.stand, POSES.crouch, Math.min(1, k / 0.3));
        } else {
          if (!launched[lane]) {
            launched[lane] = true;
            // 左はふつうのジャンプ（秒速3m → 約45cm）、右はノミのジャンプ力
            // しゃがんだときの体の動きは消して、まっすぐ上（右の人は少し前）へ跳ばす
            for (const b of Object.values(rd.bodies)) {
              b.velocity.set(lane === 0 ? 0 : FLEA.fwd, lane === 0 ? 3.0 : FLEA.up, 0);
              b.angularVelocity.set(0, 0, 0);
            }
            if (lane === 1) launch = t;
          }
          if (lane === 1 && land >= 0) {
            // 着地のあとは力が抜けて、車の上にくずれる
            rd.balance = 0;
            rd.setStrength(0.15);
            rd.setPose(POSES.crouch);
          } else {
            rd.setPose(lane === 1 && rd.bodies.pelvis.velocity.y < 0 ? POSES.land : POSES.air);
            // 空中で手足を動かした反動で、横（z）へずれていかないようにする（車の上に落ちるように）
            if (lane === 1) {
              const dz = -rd.bodies.pelvis.position.z;
              for (const b of Object.values(rd.bodies)) b.velocity.z += (dz * 2 - b.velocity.z) * 0.05;
            }
          }
        }
        applyBalance(rd);
      });
      world.step(dt);
      const rd = dolls[1];
      if (launch >= 0 && land < 0 && t > launch + 1 && rd.bodies.pelvis.velocity.y > prevVy + 5) {
        land = t;
        landV = -prevVy;
      }
      prevVy = rd.bodies.pelvis.velocity.y;
    }
    dolls.forEach((rd, lane) => {
      names.forEach((nm, i) => {
        const b = rd.bodies[nm];
        const o = ((fr * 2 + lane) * nParts + i) * 7;
        doll[o] = b.position.x; doll[o + 1] = b.position.y; doll[o + 2] = b.position.z;
        doll[o + 3] = b.quaternion.x; doll[o + 4] = b.quaternion.y; doll[o + 5] = b.quaternion.z; doll[o + 6] = b.quaternion.w;
      });
    });
    carOut.set([car.position.x, car.position.y, car.position.z, car.quaternion.x, car.quaternion.y, car.quaternion.z, car.quaternion.w], fr * 7);
    height[fr] = Math.max(0, footY(dolls[1]) - 0.05);
    speed[fr] = Math.abs(dolls[1].bodies.pelvis.velocity.y) * 3.6;
    if (land >= 0 && !hits.length) hits.push({ frame: Math.round(land * fps), v: landV });
  }
  const res: FleaResult = {
    frames,
    fps,
    doll,
    nParts,
    parts: [0, 1].flatMap((lane) => names.map((nm) => ({ name: nm, size: dolls[0].sizes[nm], look: dolls[0].looks[nm], lane }))),
    car: carOut,
    height,
    speed,
    launch,
    land,
    landV,
    hits,
  };
  cache.set(key, res);
  return res;
};
