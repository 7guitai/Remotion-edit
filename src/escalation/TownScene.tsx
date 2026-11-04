import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { PersonPart } from "../components/PhysicsScene";
import { fk, runPose } from "../sim/animal";
import { POSES, RAGDOLL_PARTS } from "../sim/ragdoll";
import { BACK, BLOCK, FRONT, NOZZLE, TownSim, townPose } from "./townSim";
import { ShotKind } from "./types";

// 街の場面（Phase 1〜2）：広場の扇風機・見物人・向かいのビルとうしろのビル・風の流れ・破片と土けむり
export type TownEvents = {
  hatT: number; // 帽子が飛ぶ
  fleeT: number; // 人が逃げだす
  glassT: number; // 窓ガラスが割れる
  drillT: number; // 壁に穴があきはじめる
  reactionT: number; // うしろのビルがくずれる
};

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const lerp3 = (a: number[], b: number[], u: number) => a.map((v, i) => v + (b[i] - v) * u) as [number, number, number];

// 場面ごとのカメラ（u はその場面の中の進み具合 0〜1）
const shotCam = (kind: ShotKind, u: number): { pos: [number, number, number]; look: [number, number, number]; fov: number } => {
  switch (kind) {
    case "closeup":
      return { pos: lerp3([0.9, 1.2, 1.25], [1.25, 1.35, 1.6], u), look: [0.05, 1.0, 0], fov: 50 };
    case "plaza":
      return { pos: lerp3([-5.2, 2.4, 7.0], [-6.2, 3.0, 8.2], u), look: [6, 1.6, -0.5], fov: 55 };
    case "street":
      return { pos: lerp3([-3.4, 1.9, 2.0], [-2.2, 2.2, 1.6], u), look: [16, 3.6, 0], fov: 55 };
    case "front":
      return { pos: lerp3([4, 4.5, 16], [2, 6, 19], u), look: [18, 5, 0], fov: 58 };
    case "back":
      return { pos: lerp3([-3, 2.8, 10], [-2, 4, 12], u), look: [-18.5, 4.5, 0], fov: 58 };
    default: {
      // 屋根の上 → 街の上空へ、カメラがぐんぐん上がる
      const h = 25 * Math.pow(120, u);
      return { pos: [-h * 0.25, h, h * 0.75], look: [h * 0.5, 0, 0], fov: 55 };
    }
  }
};

export const TownCamera: React.FC<{ kind: ShotKind; u: number; shake: number; frame: number }> = ({ kind, u, shake, frame }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = shotCam(kind, u);
  const sx = shake * Math.sin(frame * 1.9);
  const sy = shake * Math.cos(frame * 2.3);
  camera.position.set(c.pos[0] + sx, c.pos[1] + sy, c.pos[2]);
  camera.fov = c.fov;
  // 近くの場面は near を小さく far も小さく、上空の場面は near を大きく（奥行きの精度を保つ）
  const height = c.pos[1];
  camera.near = height > 40 ? height * 0.02 : 0.05;
  camera.far = height > 40 ? 30000 : 3000;
  camera.lookAt(c.look[0], c.look[1], c.look[2]);
  camera.updateProjectionMatrix();
  return null;
};

// まわりの家（上空から見下ろしたときの町並み）
const Houses: React.FC = () => {
  const { walls, roofs } = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cone = new THREE.ConeGeometry(0.75, 1, 4);
    cone.rotateY(Math.PI / 4);
    const items: { x: number; z: number; w: number; d: number; h: number; c: THREE.Color; r: THREE.Color }[] = [];
    const wallC = ["#f2e6d0", "#e9eef2", "#f4dccb", "#e2e8d8", "#efe2c8"];
    const roofC = ["#8a3b2e", "#3d4f6b", "#5a4a3a", "#7a2f2f", "#4a5a48"];
    for (let gx = -14; gx <= 14; gx++)
      for (let gz = -14; gz <= 14; gz++) {
        const x = gx * 14 + (random(`hx${gx},${gz}`) - 0.5) * 3;
        const z = gz * 14 + (random(`hz${gx},${gz}`) - 0.5) * 3;
        if (Math.abs(z) < 12 && x > -30 && x < 30) continue;
        if (Math.abs(z) < 5) continue; // 大通り（風の通り道）
        const k = Math.floor(random(`hk${gx},${gz}`) * 5);
        items.push({ x, z, w: 7 + random(`hw${gx},${gz}`) * 4, d: 7 + random(`hd${gx},${gz}`) * 3, h: 5 + random(`hh${gx},${gz}`) * 9, c: new THREE.Color(wallC[k]), r: new THREE.Color(roofC[k]) });
      }
    const wm = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.85 }), items.length);
    const rm = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ roughness: 0.7 }), items.length);
    const m = new THREE.Matrix4();
    items.forEach((it, i) => {
      m.compose(new THREE.Vector3(it.x, it.h / 2, it.z), new THREE.Quaternion(), new THREE.Vector3(it.w, it.h, it.d));
      wm.setMatrixAt(i, m);
      wm.setColorAt(i, it.c);
      m.compose(new THREE.Vector3(it.x, it.h + 1.2, it.z), new THREE.Quaternion(), new THREE.Vector3(it.w, 2.4, it.d));
      rm.setMatrixAt(i, m);
      rm.setColorAt(i, it.r);
    });
    wm.castShadow = wm.receiveShadow = true;
    rm.castShadow = true;
    return { walls: wm, roofs: rm };
  }, []);
  return (
    <group>
      <primitive object={walls} />
      <primitive object={roofs} />
    </group>
  );
};

// 扇風機（台の上）。羽根は風が強いほど速く回り、速すぎると円盤のようにぼやける
const Fan: React.FC<{ frame: number; spin: number }> = ({ frame, spin }) => {
  const blur = Math.min(1, spin / 0.9);
  const a = frame * Math.min(spin, 0.9);
  return (
    <group>
      {/* カフェのテーブル */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 32]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.72, 12]} />
        <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.04, 24]} />
        <meshStandardMaterial color="#3e8ed0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.24, 12]} />
        <meshStandardMaterial color="#3e8ed0" roughness={0.4} />
      </mesh>
      <group position={[NOZZLE.x - 0.05, NOZZLE.y, NOZZLE.z]} rotation={[0, 0, -Math.PI / 2]}>
        {/* モーター */}
        <mesh position={[0, -0.09, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 20]} />
          <meshStandardMaterial color="#3e8ed0" roughness={0.4} />
        </mesh>
        {/* 羽根 */}
        <group rotation={[0, a, 0]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} rotation={[0.25, (k * Math.PI * 2) / 3, 0]} position={[0, 0, 0]}>
              <boxGeometry args={[0.36, 0.006, 0.12]} />
              <meshStandardMaterial color="#bfe4ff" transparent opacity={0.85 * (1 - blur)} />
            </mesh>
          ))}
        </group>
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.01, 40]} />
          <meshStandardMaterial color="#d8efff" transparent opacity={0.45 * blur} />
        </mesh>
        {/* ガード（あみ） */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.21, 0.008, 8, 48]} />
          <meshStandardMaterial color="#e9eef2" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

// 見物人（関節の角度から形を計算：立っている → 逃げる）
const PEOPLE = [
  { x: 4.5, z: 2.4, face: -2.6, shirt: "#ff6b3d", hat: true, run: 1 },
  { x: 6.2, z: -2.6, face: -0.6, shirt: "#2f8bff", hat: false, run: -1 },
  { x: 8.0, z: 2.9, face: -2.2, shirt: "#2fae5a", hat: false, run: 1 },
  { x: 3.2, z: -3.4, face: -0.8, shirt: "#ffd23a", hat: false, run: -1 },
  { x: 9.6, z: -2.2, face: -1.2, shirt: "#c04ad8", hat: false, run: -1 },
];
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const qYaw = (y: number) => {
  const q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), y);
  return q;
};

const People: React.FC<{ t: number; ev: TownEvents }> = ({ t, ev }) => (
  <group>
    {PEOPLE.map((pp, i) => {
      const dt = t - ev.fleeT - i * 0.12;
      let x = pp.x;
      let z = pp.z;
      let yaw = pp.face;
      let pose = { ...POSES.stand };
      if (dt > 0) {
        // くるっと向きを変えて、風の通り道から離れる向きに走る
        const turn = smooth(0, 0.35, dt);
        const target = pp.run > 0 ? 0 : Math.PI;
        yaw = pp.face + (target - pp.face) * turn;
        const run = Math.max(0, dt - 0.25);
        const v = 5.5 * smooth(0, 0.5, run);
        z += pp.run * v * run;
        x += 0.8 * run;
        pose = runPose((run * 1.6 + i * 0.3) % 1, Math.min(1, run * 2));
      } else if (t > ev.hatT) {
        // 風に向かって身をかがめる
        pose = { ...pose, waist: [0.25 * smooth(ev.hatT, ev.fleeT, t), 0, 0], shoulderL: [-1.2, 0, -0.3], shoulderR: [-1.2, 0, 0.3], elbowL: [-1.6, 0, 0], elbowR: [-1.6, 0, 0] };
      }
      const xf = fk(new CANNON.Vec3(x, 0.99, z), qYaw(yaw), pose);
      return (
        <group key={i}>
          {RAGDOLL_PARTS.map((p) => {
            const c = p.look === "shirt" ? pp.shirt : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
            const w = xf[p.name];
            return <PersonPart key={p.name} part={p.name} size={p.size} color={c} pos={[w.p.x, w.p.y, w.p.z]} quat={[w.q.x, w.q.y, w.q.z, w.q.w]} />;
          })}
          {pp.hat ? <Hat head={xf.head.p} t={t} ev={ev} /> : null}
        </group>
      );
    })}
  </group>
);

const Hat: React.FC<{ head: CANNON.Vec3; t: number; ev: TownEvents }> = ({ head, t, ev }) => {
  const d = t - ev.hatT;
  const p = d < 0 ? [head.x, head.y + 0.14, head.z] : [head.x + 6 * d, head.y + 0.14 + 3 * d - 2 * d * d, head.z - 0.5 * d];
  if (d > 3) return null;
  return (
    <group position={p as [number, number, number]} rotation={[d * 5, d * 3, d * 7]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.12, 16]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.015, 24]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
    </group>
  );
};

// 風の流れ：細い白いすじ → 音速をこえると衝撃波の円すい → 光る柱
const Wind: React.FC<{ frame: number; t: number; strength: number; speed: number }> = ({ frame, t, strength, speed }) => {
  const n = Math.round(30 + 90 * strength);
  const L = 26;
  const vis = Math.min(speed, 40);
  const streakLen = 0.4 + Math.min(4, speed / 25);
  const beam = smooth(19.5, 22.5, t);
  const shock = smooth(12.5, 13.5, t) * (1 - beam);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const s = (random(`ws${i}`) + (frame / 30) * (vis / L)) % 1;
        const x = NOZZLE.x + s * L;
        const r = (0.2 + 0.05 * x) * Math.sqrt(random(`wr${i}`));
        const a = random(`wa${i}`) * Math.PI * 2;
        return (
          <mesh key={i} position={[x, NOZZLE.y + r * Math.sin(a), NOZZLE.z + r * Math.cos(a)]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, streakLen, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={(0.25 + 0.5 * strength) * Math.sin(Math.PI * s)} depthWrite={false} />
          </mesh>
        );
      })}
      {shock > 0.01 ? (
        <mesh position={[NOZZLE.x + 9, NOZZLE.y, NOZZLE.z]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.9, 18, 32, 1, true]} />
          <meshBasicMaterial color="#dff3ff" transparent opacity={0.22 * shock} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ) : null}
      {beam > 0.01 ? (
        <group>
          <mesh position={[NOZZLE.x + 1500, NOZZLE.y, NOZZLE.z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35 + 0.6 * beam, 0.35 + 0.6 * beam, 3000, 24, 1, true]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9 * beam} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[NOZZLE.x + 1500, NOZZLE.y, NOZZLE.z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[2.5 * beam, 2.5 * beam, 3000, 24, 1, true]} />
            <meshBasicMaterial color="#8fd0ff" transparent opacity={0.35 * beam} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

// ブロック（窓つき）。向かいのビルは窓ガラスが割れたら窓が消える
const FRONT_C = "#e6d8c0";
const BACK_C = "#cfd8e2";
const Blocks: React.FC<{ sim: TownSim; t: number; ev: TownEvents; box: THREE.BoxGeometry }> = ({ sim, t, ev, box }) => (
  <group>
    {sim.kind.map((k, i) => {
      const { p, q } = townPose(sim, t, i);
      if (Math.abs(p[0]) > 300) return null;
      const glassOn = k.building === 0 ? t < ev.glassT : t < ev.reactionT;
      const faceX = k.building === 0 ? -BLOCK / 2 - 0.005 : BLOCK / 2 + 0.005;
      return (
        <group key={i} position={p} quaternion={q}>
          <mesh geometry={box} castShadow receiveShadow>
            <meshStandardMaterial color={k.building === 0 ? FRONT_C : BACK_C} roughness={0.9} />
          </mesh>
          {k.facade && k.row > 0 ? (
            <mesh position={[faceX, 0.1, 0]} rotation={[0, k.building === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <planeGeometry args={[0.8, 0.9]} />
              {glassOn ? (
                <meshStandardMaterial color="#9cc9e8" metalness={0.4} roughness={0.1} emissive="#203040" />
              ) : (
                <meshStandardMaterial color="#2a2a30" roughness={1} />
              )}
            </mesh>
          ) : null}
        </group>
      );
    })}
  </group>
);

// 窓ガラスの破片（割れた瞬間に、窓の位置から飛び散る）
const GlassShards: React.FC<{ t: number; at: number; x: number; cols: number; rows: number; dir: number }> = ({ t, at, x, cols, rows, dir }) => {
  const d = t - at;
  if (d < 0 || d > 2.6) return null;
  const items: React.ReactNode[] = [];
  for (let r = 1; r < rows; r++)
    for (let c = 0; c < cols; c++)
      for (let k = 0; k < 3; k++) {
        const key = `${at}-${r}-${c}-${k}`;
        const vx = dir * (1 + 3 * random(`gx${key}`));
        const vy = 1 + 3 * random(`gy${key}`);
        const vz = (random(`gz${key}`) - 0.5) * 4;
        const y0 = (r + 0.55) * BLOCK;
        const y = Math.max(0.02, y0 + vy * d - 4.9 * d * d);
        items.push(
          <mesh key={key} position={[x + vx * d, y, (c - (cols - 1) / 2) * BLOCK + vz * d]} rotation={[d * 9 + k, d * 7, d * 5 + c]}>
            <boxGeometry args={[0.18, 0.012, 0.12]} />
            <meshStandardMaterial color="#cfeaff" transparent opacity={0.75 * (1 - d / 2.6)} metalness={0.5} roughness={0.05} />
          </mesh>,
        );
      }
  return <group>{items}</group>;
};

// 壁に穴があくときの破片と粉じん（カメラのほうへ飛んでくる）、ブロックが落ちたときの土けむり
const Debris: React.FC<{ sim: TownSim; t: number; ev: TownEvents }> = ({ sim, t, ev }) => {
  const items: React.ReactNode[] = [];
  // 穴をあけている間：当たっている所から、毎秒たくさんの小さな破片が手前へ
  if (t > ev.drillT && t < 17.5) {
    for (let k = 0; k < 40; k++) {
      const born = ev.drillT + ((k + random(`db${k}`)) / 40) * (t - ev.drillT);
      const birth = Math.floor((t - born) / 0.8);
      const d = (t - born) % 0.8;
      const key = `${k}-${birth}`;
      const v = [-(6 + 10 * random(`dvx${key}`)), 2 + 5 * random(`dvy${key}`), (random(`dvz${key}`) - 0.5) * 8];
      const y = Math.max(0.05, NOZZLE.y + 0.4 + v[1] * d - 4.9 * d * d);
      items.push(
        <mesh key={`d${key}`} position={[FRONT.x0 - 0.1 + v[0] * d, y, v[2] * d]} rotation={[d * 8, d * 6, k]}>
          <dodecahedronGeometry args={[0.05 + 0.1 * random(`ds${k}`), 0]} />
          <meshStandardMaterial color="#9a9184" roughness={1} />
        </mesh>,
      );
    }
  }
  // 風が強く当たったブロックから、破片がはじける
  for (const [n, h] of sim.hits.entries()) {
    const d = t - h.t;
    if (d < 0 || d > 1.5) continue;
    for (let k = 0; k < 5; k++) {
      const key = `${n}-${k}`;
      const v = [-(3 + 8 * random(`hx${key}`)), 2 + 6 * random(`hy${key}`), (random(`hz${key}`) - 0.5) * 9];
      items.push(
        <mesh key={`h${key}`} position={[h.p[0] + v[0] * d, Math.max(0.05, h.p[1] + v[1] * d - 4.9 * d * d), h.p[2] + v[2] * d]} rotation={[d * 7, d * 5, k]}>
          <boxGeometry args={[0.25, 0.18, 0.2]} />
          <meshStandardMaterial color="#b9ab95" roughness={1} />
        </mesh>,
      );
    }
  }
  // 土けむり
  for (const [n, l] of sim.lands.entries()) {
    const d = t - l.t;
    if (d < 0 || d > 3) continue;
    const r = 0.8 + d * 1.6;
    items.push(
      <mesh key={`l${n}`} position={[l.p[0], 0.6 + d * 0.8, l.p[2]]}>
        <sphereGeometry args={[r, 12, 10]} />
        <meshStandardMaterial color="#cfc3ad" transparent opacity={0.4 * (1 - d / 3)} depthWrite={false} />
      </mesh>,
    );
  }
  // 崩れたビルを包む大きな土煙
  const cloud = smooth(16.8, 19, t) * (1 - smooth(20.5, 22, t));
  if (cloud > 0.01)
    for (let k = 0; k < 14; k++) {
      const a = random(`cl${k}`) * Math.PI * 2;
      const rr = 4 + 6 * random(`cr${k}`) + (t - 16.8) * 1.2;
      items.push(
        <mesh key={`c${k}`} position={[FRONT.x0 + 2 + Math.cos(a) * rr * 0.6, 2 + random(`ch${k}`) * 6, Math.sin(a) * rr]}>
          <sphereGeometry args={[2.2 + random(`cs${k}`) * 2 + (t - 16.8) * 0.5, 12, 10]} />
          <meshStandardMaterial color="#d6cbb6" transparent opacity={0.35 * cloud} depthWrite={false} />
        </mesh>,
      );
    }
  // うしろのビルの土煙
  const cloud2 = smooth(19.3, 20.5, t) * (1 - smooth(20.8, 22, t));
  if (cloud2 > 0.01)
    for (let k = 0; k < 10; k++) {
      const a = random(`bl${k}`) * Math.PI * 2;
      const rr = 3 + 5 * random(`br${k}`) + (t - 19.3) * 2;
      items.push(
        <mesh key={`b${k}`} position={[BACK.x0 + 1 - Math.abs(Math.cos(a)) * rr * 0.5, 1.5 + random(`bh${k}`) * 5, Math.sin(a) * rr]}>
          <sphereGeometry args={[2 + random(`bs${k}`) * 2 + (t - 19.3) * 0.6, 12, 10]} />
          <meshStandardMaterial color="#d2d2cc" transparent opacity={0.35 * cloud2} depthWrite={false} />
        </mesh>,
      );
    }
  return <group>{items}</group>;
};

// 穴の黒いあと（向かいのビルの、風が当たる所）
const Crater: React.FC<{ t: number; ev: TownEvents }> = ({ t, ev }) => {
  const g = smooth(ev.drillT, 15.6, t);
  if (g <= 0 || t > 16.5) return null;
  return (
    <mesh position={[FRONT.x0 - 0.02, NOZZLE.y + 0.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <circleGeometry args={[0.15 + 0.55 * g, 24]} />
      <meshStandardMaterial color="#3a332c" roughness={1} />
    </mesh>
  );
};

export const TownScene: React.FC<{ sim: TownSim; t: number; frame: number; ev: TownEvents; strength: number; speed: number; spin: number }> = ({ sim, t, frame, ev, strength, speed, spin }) => {
  const box = useMemo(() => new THREE.BoxGeometry(BLOCK - 0.02, BLOCK - 0.01, BLOCK - 0.02), []);
  return (
    <group>
      <color attach="background" args={["#9fd0f7"]} />
      <fog attach="fog" args={["#cfe6f7", 80, 2500]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dff0ff", "#6f8f5a", 0.5]} />
      <directionalLight
        position={[30, 60, 25]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
      {/* 地面：広場の石畳・大通り・遠くの野原 */}
      {/* 地面の3枚の板（野原・大通り・広場）。とても大きな三角形は奥行きの計算が狂って、広場の上に野原が描かれるフレームがあった。
          → 地面は「最初に描いて、奥行きは書きこまない」背景あつかいにし、野原は細かく分割する（上に立つ物は、あとから必ず上に描かれる） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow renderOrder={-30}>
        <planeGeometry args={[20000, 20000, 64, 64]} />
        <meshStandardMaterial color="#7fb069" roughness={1} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow renderOrder={-20}>
        <planeGeometry args={[440, 9, 40, 1]} />
        <meshStandardMaterial color="#6b6f76" roughness={0.9} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow renderOrder={-10}>
        <planeGeometry args={[34, 22, 8, 8]} />
        <meshStandardMaterial color="#d9cfbf" roughness={0.9} depthWrite={false} />
      </mesh>
      <Houses />
      <Fan frame={frame} spin={spin} />
      <People t={t} ev={ev} />
      <Blocks sim={sim} t={t} ev={ev} box={box} />
      <Crater t={t} ev={ev} />
      <GlassShards t={t} at={ev.glassT} x={FRONT.x0 - 0.05} cols={FRONT.cols} rows={FRONT.rows} dir={1} />
      <GlassShards t={t} at={ev.reactionT} x={BACK.x0 + BACK.layers * BLOCK + 0.05} cols={BACK.cols} rows={BACK.rows} dir={-1} />
      <Debris sim={sim} t={t} ev={ev} />
      <Wind frame={frame} t={t} strength={strength} speed={speed} />
    </group>
  );
};
