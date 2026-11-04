import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { PersonPart } from "../../components/PhysicsScene";
import { fk, runPose } from "../../sim/animal";
import { Pose, POSES, RAGDOLL_PARTS } from "../../sim/ragdoll";
import { BLOCK, BUILDINGS, LAMP, LampSim, blockCenter, blockFlux, lampPose } from "./lampSim";
import { flux, power, surfaceTemp } from "./lampPhysics";
import { addGlow, glowColor, glowStrength, makeGlowUniforms, tempScale } from "./glow";

// 夜の広場（Phase 1〜2）：街灯・見物人・3つのビル・窓の明かり → ひび割れ → 火 → 赤熱 → 白熱 → 蒸発の反動で飛ぶ
export const LEV = { shieldT: 11.97, fleeT: 14.56, glassT: 18.52, fireT: 19.79, redT: 22.85, meltT: 26.17, pushT: 35.4 };

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const lerp3 = (a: number[], b: number[], u: number) => a.map((v, i) => v + (b[i] - v) * u) as [number, number, number];

const shotCam = (kind: string, u: number): { pos: [number, number, number]; look: [number, number, number]; fov: number } => {
  switch (kind) {
    case "lampClose":
      return { pos: lerp3([2.0, 1.5, 3.6], [2.5, 1.7, 4.4], u), look: [0, 4.8, 0], fov: 52 };
    case "lampPlaza":
      return { pos: lerp3([-5.5, 3.0, 12.5], [-6.8, 3.6, 14], u), look: [0.5, 2.6, 0], fov: 55 };
    case "lampLow":
      return { pos: lerp3([1.2, 1.15, 9.0], [1.6, 1.3, 10.2], u), look: [0, 3.0, 0], fov: 55 };
    case "lampFront":
      return { pos: lerp3([-3, 2.4, 6], [-1, 3.2, 7.5], u), look: [11, 5, -1.5], fov: 58 };
    case "lampOrbit": {
      const a = 1.9 + u * 1.5;
      return { pos: [7.5 * Math.cos(a), 2.6 + u, 7.5 * Math.sin(a)], look: [0, 4.6, 0], fov: 60 };
    }
    case "lampWide":
      return { pos: lerp3([-26, 20, 34], [-33, 26, 42], u), look: [0, 4, 0], fov: 55 };
    default: {
      const h = 45 * Math.pow(50, u);
      return { pos: [-h * 0.3, h, h * 0.6], look: [0, 0, 0], fov: 55 };
    }
  }
};

export const LampCamera: React.FC<{ kind: string; u: number; shake: number; frame: number; t: number }> = ({ kind, u, shake, frame, t }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  // 白熱した街：カメラの露出をしぼって、熱い所は白・少し遠い所はオレンジ・遠い所は赤、の差が見えるように
  gl.toneMappingExposure = Math.max(0.25, 2 ** (-0.25 * Math.max(0, t - 26.5)));
  const c = shotCam(kind, u);
  camera.position.set(c.pos[0] + shake * Math.sin(frame * 1.9), c.pos[1] + shake * Math.cos(frame * 2.3), c.pos[2]);
  camera.fov = c.fov;
  const h = c.pos[1];
  camera.near = h > 40 ? h * 0.02 : 0.05;
  camera.far = h > 40 ? 40000 : 3000;
  camera.lookAt(c.look[0], c.look[1], c.look[2]);
  camera.updateProjectionMatrix();
  return null;
};

// 街灯の明るさ → 3D の光の強さ。目（カメラ）が慣れるので、はじめはそのまま、明るくなるほどゆっくり強くする
// 壁が熱で光りはじめたら、カメラの明るさを下げていく（光る色が見えるように）
const lightLevel = (t: number) => 6 * 2 ** (0.36 * Math.min(t, 13)) * 2 ** (0.03 * Math.max(0, t - 13)) * 2 ** (-0.32 * Math.max(0, t - 20));

const LAMP3 = new THREE.Vector3(LAMP.x, LAMP.y, LAMP.z);

// 光のにじみ（グレア）用のテクスチャ
let glareTex: THREE.CanvasTexture | null = null;
const getGlare = () => {
  if (glareTex) return glareTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.08, "rgba(255,250,235,0.95)");
  grd.addColorStop(0.25, "rgba(255,225,170,0.45)");
  grd.addColorStop(0.6, "rgba(255,200,130,0.12)");
  grd.addColorStop(1, "rgba(255,190,120,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  // 光の筋（十字）
  g.globalCompositeOperation = "lighter";
  for (const [w, h] of [
    [256, 6],
    [6, 256],
  ]) {
    const l = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    l.addColorStop(0, "rgba(255,255,255,0.8)");
    l.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = l;
    g.fillRect(128 - w / 2, 128 - h / 2, w, h);
  }
  glareTex = new THREE.CanvasTexture(c);
  glareTex.colorSpace = THREE.SRGBColorSpace;
  return glareTex;
};

export const Glare: React.FC<{ position: [number, number, number]; size: number; opacity?: number }> = ({ position, size, opacity = 1 }) => (
  <sprite position={position} scale={[size, size, 1]} renderOrder={50}>
    <spriteMaterial map={getGlare()} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
  </sprite>
);

// 街灯（ポール・アーム・灯具）
const StreetLamp: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 2.7, 0]} castShadow>
      <cylinderGeometry args={[0.07, 0.1, 5.4, 16]} />
      <meshStandardMaterial color="#3b4048" metalness={0.6} roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[0.18, 0.22, 0.3, 16]} />
      <meshStandardMaterial color="#30343b" metalness={0.5} roughness={0.5} />
    </mesh>
    <mesh position={[0, 5.45, 0]} castShadow>
      <boxGeometry args={[0.7, 0.12, 0.34]} />
      <meshStandardMaterial color="#3b4048" metalness={0.6} roughness={0.4} />
    </mesh>
    <mesh position={[0, 5.37, 0]}>
      <boxGeometry args={[0.6, 0.04, 0.28]} />
      <meshStandardMaterial color="#fff6e0" emissive="#fff3d6" emissiveIntensity={3 + Math.min(40, t * 2)} />
    </mesh>
  </group>
);

// まわりの家（遠く）。光で熱くなると、近い家から光りだす
const Houses: React.FC<{ uniforms: ReturnType<typeof makeGlowUniforms> }> = ({ uniforms }) => {
  const { walls, roofs } = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cone = new THREE.ConeGeometry(0.75, 1, 4);
    cone.rotateY(Math.PI / 4);
    const items: { x: number; z: number; w: number; d: number; h: number; c: THREE.Color; r: THREE.Color }[] = [];
    const wallC = ["#e9dfcc", "#dfe5ea", "#ecd6c6", "#d9dfd0", "#e6d9c0"];
    const roofC = ["#6e3328", "#34455e", "#4d4033", "#682a2a", "#404d3e"];
    for (let gx = -16; gx <= 16; gx++)
      for (let gz = -16; gz <= 16; gz++) {
        const x = gx * 14 + (random(`lx${gx},${gz}`) - 0.5) * 3;
        const z = gz * 14 + (random(`lz${gx},${gz}`) - 0.5) * 3;
        if (Math.hypot(x, z) < 34) continue;
        if (Math.abs(x) < 5 && z > 0) continue; // 南へのびる道
        const k = Math.floor(random(`lk${gx},${gz}`) * 5);
        items.push({ x, z, w: 7 + random(`lw${gx},${gz}`) * 4, d: 7 + random(`ld${gx},${gz}`) * 3, h: 5 + random(`lh${gx},${gz}`) * 9, c: new THREE.Color(wallC[k]), r: new THREE.Color(roofC[k]) });
      }
    const wm = new THREE.InstancedMesh(box, addGlow(new THREE.MeshStandardMaterial({ roughness: 0.85 }), uniforms), items.length);
    const rm = new THREE.InstancedMesh(cone, addGlow(new THREE.MeshStandardMaterial({ roughness: 0.7 }), uniforms), items.length);
    const m = new THREE.Matrix4();
    items.forEach((it, i) => {
      m.compose(new THREE.Vector3(it.x, it.h / 2, it.z), new THREE.Quaternion(), new THREE.Vector3(it.w, it.h, it.d));
      wm.setMatrixAt(i, m);
      wm.setColorAt(i, it.c);
      m.compose(new THREE.Vector3(it.x, it.h + 1.2, it.z), new THREE.Quaternion(), new THREE.Vector3(it.w, 2.4, it.d));
      rm.setMatrixAt(i, m);
      rm.setColorAt(i, it.r);
    });
    wm.receiveShadow = true;
    return { walls: wm, roofs: rm };
  }, [uniforms]);
  return (
    <group>
      <primitive object={walls} />
      <primitive object={roofs} />
    </group>
  );
};

// 見物人（南側から街灯を見上げる → まぶしくて顔をおおう → 南へ逃げる）
const PEOPLE = [
  { x: -2.2, z: 3.6, shirt: "#ff6b3d" },
  { x: 0.4, z: 4.4, shirt: "#2f8bff" },
  { x: 2.6, z: 3.2, shirt: "#2fae5a" },
  { x: -3.8, z: 1.4, shirt: "#ffd23a" },
  { x: 3.9, z: 1.0, shirt: "#c04ad8" },
  { x: 1.4, z: 6.2, shirt: "#e8e8e8" },
];
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const qYaw = (y: number) => {
  const q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), y);
  return q;
};
const People: React.FC<{ t: number }> = ({ t }) => {
  if (t > LEV.fleeT + 7) return null;
  return (
    <group>
      {PEOPLE.map((pp, i) => {
        // 街灯のほうを向く（モデルは +z が前）
        const face = Math.atan2(-pp.x, -pp.z);
        let x = pp.x;
        let z = pp.z;
        let yaw = face;
        let pose: Pose = { ...POSES.stand, neck: [-0.35, 0, 0] };
        const dt = t - LEV.fleeT - i * 0.15;
        if (dt > 0) {
          const away = Math.atan2(pp.x * 0.4, 1);
          const turn = smooth(0, 0.35, dt);
          yaw = face + (away - face) * turn;
          const run = Math.max(0, dt - 0.25);
          const v = 6 * smooth(0, 0.5, run);
          x += Math.sin(away) * v * run;
          z += Math.cos(away) * v * run;
          pose = runPose((run * 1.6 + i * 0.3) % 1, Math.min(1, run * 2));
          // 片手で顔をおおったまま走る
          pose = { ...pose, shoulderR: [-2.3, 0, 0.35], elbowR: [-1.9, 0, 0] };
        } else if (t > LEV.shieldT - 0.6) {
          const k = smooth(LEV.shieldT - 0.6, LEV.shieldT, t);
          pose = { ...pose, neck: [0.3 * k - 0.35 * (1 - k), 0, 0], waist: [0.25 * k, 0, 0], shoulderL: [-2.4 * k, 0, -0.3], shoulderR: [-2.4 * k, 0, 0.3], elbowL: [-1.9 * k, 0, 0], elbowR: [-1.9 * k, 0, 0] };
        }
        const xf = fk(new CANNON.Vec3(x, 0.99, z), qYaw(yaw), pose);
        return (
          <group key={i}>
            {RAGDOLL_PARTS.map((p) => {
              const c = p.look === "shirt" ? pp.shirt : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
              const w = xf[p.name];
              return <PersonPart key={p.name} part={p.name} size={p.size} color={c} pos={[w.p.x, w.p.y, w.p.z]} quat={[w.q.x, w.q.y, w.q.z, w.q.w]} />;
            })}
          </group>
        );
      })}
    </group>
  );
};

// ビルのブロック：受けた光の強さ → 温度 → 光る色（影になったブロックは、まわりの熱で少しだけ）
const faceRot = (n: [number, number, number]): [number, number, number] => [0, n[0] < 0 ? -Math.PI / 2 : n[0] > 0 ? Math.PI / 2 : n[2] > 0 ? 0 : Math.PI, 0];
const Blocks: React.FC<{ sim: LampSim; t: number; frame: number; box: THREE.BoxGeometry }> = ({ sim, t, frame, box }) => (
  <group>
    {sim.kind.map((k, i) => {
      const { p, q } = lampPose(sim, t, i);
      if (Math.hypot(p[0], p[2]) > 500) return null;
      const p0 = lampPose(sim, 0, i).p;
      const d2 = (p0[0] - LAMP.x) ** 2 + (p0[1] - LAMP.y) ** 2 + (p0[2] - LAMP.z) ** 2;
      // 影のブロックも、まわりの熱い壁からの熱で少しだけ温まる
      const E = Math.max(blockFlux(sim, t, i), (0.03 * power(t)) / (4 * Math.PI * d2));
      const T = surfaceTemp(E);
      const sc = tempScale(surfaceTemp(flux(t, 10)));
      const gc = glowColor(T, sc);
      const gs = glowStrength(T, sc);
      const n = k.normal;
      const win = k.facade && k.row > 0 && t < 30;
      // 窓：夜の明かり（ところどころ）→ ひび割れて暗く → 火
      const lit = random(`win${i}`) < 0.45;
      const fire = t >= LEV.fireT;
      const flick = 0.7 + 0.3 * Math.sin(frame * 0.9 + i * 1.7) * Math.sin(frame * 0.37 + i);
      return (
        <group key={i} position={p} quaternion={q}>
          <mesh geometry={box} castShadow receiveShadow>
            <meshStandardMaterial color={BUILDINGS[k.building].color} roughness={0.9} emissive={new THREE.Color(gc[0], gc[1], gc[2])} emissiveIntensity={gs} />
          </mesh>
          {win ? (
            <mesh position={[n[0] * 0.756, 0.1, n[2] * 0.756]} rotation={faceRot(n)}>
              <planeGeometry args={[0.8, 0.9]} />
              {fire ? (
                <meshStandardMaterial color="#331a08" emissive="#ff7a1a" emissiveIntensity={2.5 * flick * (1 - smooth(27, 30, t))} />
              ) : t >= LEV.glassT ? (
                <meshStandardMaterial color="#1c1f26" roughness={1} />
              ) : (
                <meshStandardMaterial color={lit ? "#ffe2a0" : "#4a5a70"} emissive={lit ? "#ffcf7a" : "#000"} emissiveIntensity={lit ? 0.9 : 0} metalness={0.3} roughness={0.2} />
              )}
            </mesh>
          ) : null}
        </group>
      );
    })}
  </group>
);

// 窓から出る炎とけむり、窓ガラスの破片、とけたしずく、蒸発のけむり、落ちたときの土けむり
const facadeList = (sim: LampSim) => sim.kind.map((k, i) => ({ k, i })).filter(({ k }) => k.facade && k.row > 0);
const Effects: React.FC<{ sim: LampSim; t: number; frame: number }> = ({ sim, t, frame }) => {
  const items: React.ReactNode[] = [];
  const fac = useMemo(() => facadeList(sim), [sim]);
  // ガラスの破片（下へ落ちる）
  const dg = t - LEV.glassT;
  if (dg > 0 && dg < 2.2)
    fac.forEach(({ k, i }) => {
      const c = lampPose(sim, 0, i).p;
      const n = k.normal;
      for (let s = 0; s < 2; s++) {
        const key = `g${i}-${s}`;
        const out = 0.5 + 1.5 * random(`go${key}`);
        const y = Math.max(0.02, c[1] + 0.1 + 0.5 * random(`gy${key}`) * dg - 4.9 * dg * dg);
        items.push(
          <mesh key={key} position={[c[0] + n[0] * (0.78 + out * dg), y, c[2] + n[2] * (0.78 + out * dg) + (random(`gz${key}`) - 0.5) * 0.6]} rotation={[dg * 9 + s, dg * 7, dg * 5]}>
            <boxGeometry args={[0.16, 0.01, 0.11]} />
            <meshStandardMaterial color="#cfe4f5" transparent opacity={0.8 * (1 - dg / 2.2)} metalness={0.5} roughness={0.05} />
          </mesh>,
        );
      }
    });
  // 炎（窓の外へ、上にゆらめく）
  const fireOn = smooth(LEV.fireT, LEV.fireT + 0.6, t) * (1 - smooth(28, 31, t));
  if (fireOn > 0.01)
    fac.forEach(({ k, i }) => {
      if (random(`fr${i}`) > 0.6) return;
      const c = lampPose(sim, 0, i).p;
      const n = k.normal;
      const h = (0.5 + 0.5 * random(`fh${i}`)) * (0.7 + 0.3 * Math.sin(frame * 0.8 + i)) * fireOn;
      items.push(
        <mesh key={`f${i}`} position={[c[0] + n[0] * 0.95, c[1] + 0.35 + h * 0.5, c[2] + n[2] * 0.95]}>
          <coneGeometry args={[0.3, h * 1.4, 8]} />
          <meshBasicMaterial color="#ff9a2a" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>,
      );
    });
  // 黒いけむり（ビルの上へ）
  const smoke = smooth(LEV.fireT, LEV.fireT + 1.5, t) * (1 - smooth(29, 32, t));
  if (smoke > 0.01)
    BUILDINGS.forEach((b, bi) => {
      for (let s = 0; s < 10; s++) {
        const key = `${bi}-${s}`;
        const age = (t - LEV.fireT + random(`sa${key}`) * 4) % 4;
        const top = blockCenter(b, 0, b.rows - 1, Math.floor(random(`sc${key}`) * b.cols));
        items.push(
          <mesh key={`s${key}`} position={[top[0] + (random(`sx${key}`) - 0.5) * 3, top[1] + 1 + age * 2.2, top[2] + (random(`sz${key}`) - 0.5) * 3]}>
            <sphereGeometry args={[1 + age * 0.7, 10, 8]} />
            <meshStandardMaterial color="#2a2522" transparent opacity={0.45 * smoke * (1 - age / 4)} depthWrite={false} />
          </mesh>,
        );
      }
    });
  // とけたしずく（白く光る壁から、たれて落ちる）
  const melt = smooth(LEV.meltT, LEV.meltT + 1, t) * (1 - smooth(34.5, 35.5, t));
  if (melt > 0.01)
    fac.forEach(({ k, i }) => {
      if (random(`md${i}`) > 0.35) return;
      const c = lampPose(sim, 0, i).p;
      const n = k.normal;
      const per = 0.9 + 0.6 * random(`mp${i}`);
      const age = (t - LEV.meltT + random(`ma${i}`) * per) % per;
      const y = c[1] - 0.6 - 4.9 * age * age;
      if (y < 0.05) return;
      items.push(
        <mesh key={`m${i}`} position={[c[0] + n[0] * 0.8, y, c[2] + n[2] * 0.8 + (random(`mz${i}`) - 0.5)]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshBasicMaterial color="#fff2c8" />
        </mesh>,
      );
    });
  // 蒸発のけむり（光の来るほうへ、表面からふき出す）
  const vap = smooth(30.5, 32, t);
  if (vap > 0.01)
    fac.forEach(({ k, i }) => {
      if (i % 2) return;
      const { p } = lampPose(sim, t, i);
      const toL = new THREE.Vector3(LAMP.x - p[0], LAMP.y - p[1], LAMP.z - p[2]).normalize();
      for (let s = 0; s < 2; s++) {
        const age = ((t * 2.2 + random(`va${i}-${s}`)) % 1) * 1;
        const r = 0.5 + age * 1.6;
        items.push(
          <mesh key={`v${i}-${s}`} position={[p[0] + toL.x * (0.9 + age * 4), p[1] + toL.y * (0.9 + age * 4) + age, p[2] + toL.z * (0.9 + age * 4)]}>
            <sphereGeometry args={[r * 0.5, 8, 6]} />
            <meshBasicMaterial color="#ffb070" transparent opacity={0.1 * vap * (1 - age)} depthWrite={false} />
          </mesh>,
        );
      }
    });
  // 落ちたブロックの土けむり（熱で光っている）
  for (const [n, l] of sim.lands.entries()) {
    const d = t - l.t;
    if (d < 0 || d > 2.5) continue;
    items.push(
      <mesh key={`l${n}`} position={[l.p[0], 0.6 + d * 0.8, l.p[2]]}>
        <sphereGeometry args={[0.8 + d * 1.8, 10, 8]} />
        <meshBasicMaterial color="#ff9a50" transparent opacity={0.18 * (1 - d / 2.5)} depthWrite={false} />
      </mesh>,
    );
  }
  return <group>{items}</group>;
};

// 夜空の星（町の場面）
const TownStars: React.FC<{ fade: number }> = ({ fade }) => {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 900;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = 0.05 + 0.95 * random(`tsu${i}`);
      const a = random(`tsa${i}`) * Math.PI * 2;
      const r = 2500;
      p[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(a);
      p[i * 3 + 1] = r * u;
      p[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(a);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  if (fade <= 0.01) return null;
  return (
    <points geometry={geom}>
      <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} transparent opacity={fade} depthWrite={false} />
    </points>
  );
};

export const LampTown: React.FC<{ sim: LampSim; t: number; frame: number }> = ({ sim, t, frame }) => {
  const box = useMemo(() => new THREE.BoxGeometry(BLOCK - 0.02, BLOCK - 0.01, BLOCK - 0.02), []);
  const groundU = useMemo(() => makeGlowUniforms(LAMP3, 1), []);
  const houseU = useMemo(() => makeGlowUniforms(LAMP3, 0), []);
  const groundMat = useMemo(() => addGlow(new THREE.MeshStandardMaterial({ color: "#3d4a36", roughness: 1, depthWrite: false }), groundU), [groundU]);
  const plazaMat = useMemo(() => addGlow(new THREE.MeshStandardMaterial({ color: "#8d8a84", roughness: 0.9, depthWrite: false }), groundU), [groundU]);
  const roadMat = useMemo(() => addGlow(new THREE.MeshStandardMaterial({ color: "#3c3f45", roughness: 0.9, depthWrite: false }), groundU), [groundU]);
  const P = power(t);
  groundU.uP.value = P;
  groundU.uGlow.value = 0.4;
  groundU.uTScale.value = houseU.uTScale.value = tempScale(surfaceTemp(flux(t, 10)));
  houseU.uP.value = P;
  const I = lightLevel(t);
  return (
    <group>
      <fog attach="fog" args={["#0a1124", 300, 6000]} />
      <ambientLight intensity={(0.05 + 0.25 * smooth(8, 20, t)) * (1 - 0.85 * smooth(20, 26, t))} color="#8fa6d8" />
      <hemisphereLight args={["#24345e", "#0c0f14", 0.35 * (1 - 0.8 * smooth(20, 26, t))]} />
      <pointLight position={[LAMP.x, LAMP.y - 0.15, LAMP.z]} intensity={I} decay={2} distance={0} color="#fff1d8" castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} shadow-camera-near={0.2} shadow-camera-far={200} shadow-bias={-0.002} />
      <TownStars fade={1 - smooth(5, 12, t)} />
      {/* 地面：最初に描く背景あつかい（奥行きを書きこまない） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow renderOrder={-30} material={groundMat}>
        <planeGeometry args={[20000, 20000, 128, 128]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 140]} receiveShadow renderOrder={-20} material={roadMat}>
        <planeGeometry args={[8, 280, 1, 40]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow renderOrder={-10} material={plazaMat}>
        <circleGeometry args={[9.5, 64]} />
      </mesh>
      <Houses uniforms={houseU} />
      <StreetLamp t={t} />
      <People t={t} />
      <Blocks sim={sim} t={t} frame={frame} box={box} />
      <Effects sim={sim} t={t} frame={frame} />
      <Glare position={[LAMP.x, LAMP.y - 0.1, LAMP.z]} size={Math.min(9, 1.6 * 2 ** (0.12 * t))} opacity={1 - 0.5 * smooth(22, 28, t)} />
    </group>
  );
};
