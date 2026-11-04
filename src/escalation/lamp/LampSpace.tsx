import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { interpolate, random } from "remotion";
import * as THREE from "three";
import { atmoMat, buildMaps, fbm, Stars, useTextures } from "../EarthScene";
import { L_GALAXY, L_SUN, power } from "./lampPhysics";
import { Glare } from "./LampTown";

// 宇宙の場面（Phase 3〜4）：夜の地球の1点が光る → 太陽とならぶ → 海が蒸発・岩がとける → 天の川銀河より明るい
// 長さの単位は地球の半径 R = 1（太陽系・銀河の場面は、距離を縮めて描く）
export const SEV = { sunT: Math.log2(L_SUN / power(0)), oceanT: 87.98, crustT: 91.48, bindT: 104.03, galaxyT: Math.log2(L_GALAXY / power(0)) };

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// 街灯のある場所（北緯35度）と、太陽の向き（街灯は夜の側）
const LAT = (35 * Math.PI) / 180;
const LP = new THREE.Vector3(Math.cos(LAT), Math.sin(LAT), 0);
const EAST = new THREE.Vector3(0, 0, -1);
const NORTH = new THREE.Vector3().crossVectors(EAST, LP).normalize().negate();
const SUN_DIR = new THREE.Vector3(-1, -0.15, 0.55).normalize();

// 夜の街の明かり・とけた岩（コードで描く）
type NightMaps = { lights: THREE.CanvasTexture; lava: THREE.CanvasTexture; cracks: THREE.CanvasTexture };
let nightMaps: NightMaps | null = null;
const getNightMaps = (): NightMaps => {
  if (nightMaps) return nightMaps;
  const earth = buildMaps().earth[0];
  const W = earth.width;
  const H = earth.height;
  const src = earth.getContext("2d")!.getImageData(0, 0, W, H).data;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const lc = mk();
  const lctx = lc.getContext("2d")!;
  const li = lctx.createImageData(W, H);
  const va = mk();
  const vctx = va.getContext("2d")!;
  const vi = vctx.createImageData(W, H);
  const cr = mk();
  const cctx = cr.getContext("2d")!;
  const ci = cctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const land = src[o + 1] > src[o + 2] * 0.95 && src[o] < 235;
      const n = fbm((x / W) * 24, (y / H) * 12, 24, 3);
      const city = land && n > 0.6 && random(`c${x},${y}`) < 0.1 ? 0.6 + 0.4 * random(`cb${x},${y}`) : 0;
      li.data[o] = 255 * city;
      li.data[o + 1] = 200 * city;
      li.data[o + 2] = 120 * city;
      li.data[o + 3] = 255;
      // とけた岩：暗い岩のすきまから光る
      const r = Math.abs(fbm((x / W) * 10 + 3.1, (y / H) * 5 + 1.7, 10, 5) - 0.5);
      const hot = Math.max(0, 1 - r * 9);
      vi.data[o] = 255 * Math.min(1, 0.25 + hot);
      vi.data[o + 1] = 255 * Math.min(1, 0.05 + hot * 0.65);
      vi.data[o + 2] = 255 * hot * 0.25;
      vi.data[o + 3] = 255;
      // 大きな割れ目（地球がバラバラになりかける）
      const r2 = Math.abs(fbm((x / W) * 4 + 9.3, (y / H) * 2 + 4.4, 4, 4) - 0.5);
      const crack = Math.max(0, 1 - r2 * 22);
      ci.data[o] = 255 * crack;
      ci.data[o + 1] = 240 * crack;
      ci.data[o + 2] = 200 * crack;
      ci.data[o + 3] = 255;
    }
  lctx.putImageData(li, 0, 0);
  vctx.putImageData(vi, 0, 0);
  cctx.putImageData(ci, 0, 0);
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  nightMaps = { lights: tex(lc), lava: tex(va), cracks: tex(cr) };
  return nightMaps;
};

// 天の川銀河（2本の腕のうずまき、点の集まり）
const GAL_R = 60;
const SUN_G = new THREE.Vector3(GAL_R * 0.55, 0, GAL_R * 0.12);
const Galaxy: React.FC = () => {
  const geom = useMemo(() => {
    const n = 42000;
    const p = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const core = random(`gk${i}`) < 0.22;
      let x: number, y: number, z: number;
      if (core) {
        const r = GAL_R * 0.18 * Math.pow(random(`gr${i}`), 1.5);
        const a = random(`ga${i}`) * Math.PI * 2;
        x = r * Math.cos(a) * 1.4;
        z = r * Math.sin(a);
        y = (random(`gy${i}`) - 0.5) * GAL_R * 0.08;
      } else {
        const arm = random(`gm${i}`) < 0.5 ? 0 : Math.PI;
        const r = GAL_R * (0.12 + 0.88 * Math.sqrt(random(`gr${i}`)));
        const a = arm + Math.log(r / (GAL_R * 0.12)) / 0.32 + (random(`gs${i}`) - 0.5) * 0.9;
        x = r * Math.cos(a);
        z = r * Math.sin(a);
        y = (random(`gy${i}`) - 0.5) * GAL_R * 0.025;
      }
      p.set([x, y, z], i * 3);
      const warm = core ? 1 : random(`gc${i}`) * 0.5;
      col.set([0.75 + 0.25 * warm, 0.78 + 0.1 * warm, 1 - 0.35 * warm], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <group>
      <points geometry={geom}>
        <pointsMaterial vertexColors size={2.2} sizeAttenuation={false} transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <Glare position={[0, 0, 0]} size={GAL_R * 0.9} opacity={0.55} />
    </group>
  );
};

type Cam = { pos: THREE.Vector3; look: THREE.Vector3; up: THREE.Vector3; near: number; far: number };
const spaceCam = (kind: string, u: number, T: number): Cam => {
  if (kind === "night") {
    // 街の真上から、ぐんぐん上がる（地上100km → 地球半径の半分）
    const alt = 0.3 * Math.pow(3.5, u);
    const pos = LP.clone().multiplyScalar(1 + alt).add(NORTH.clone().multiplyScalar(-alt * 0.7));
    return { pos, look: LP.clone(), up: NORTH.clone(), near: alt * 0.05, far: 2000 };
  }
  if (kind === "nightSpace") {
    const dist = interpolate(u, [0, 1], [2.6, 3.4]);
    const dir = LP.clone().multiplyScalar(0.85).add(EAST.clone().multiplyScalar(0.45 - 0.2 * u)).add(NORTH.clone().multiplyScalar(-0.2)).normalize();
    return { pos: dir.multiplyScalar(dist), look: new THREE.Vector3(0, 0, 0), up: new THREE.Vector3(0, 1, 0), near: 0.01, far: 2000 };
  }
  if (kind === "solar") {
    // 太陽（上）と地球（下）がたてにならぶように、横から見る
    const side = new THREE.Vector3().crossVectors(SUN_DIR, new THREE.Vector3(0, 1, 0)).normalize();
    const mid = SUN_DIR.clone().multiplyScalar(30);
    const pos = mid.clone().add(side.multiplyScalar(-(84 + 8 * u)));
    return { pos, look: mid, up: SUN_DIR.clone(), near: 0.05, far: 3000 };
  }
  if (kind === "boil") {
    const a = 0.5 + u * 0.9;
    const base = LP.clone().multiplyScalar(0.5).add(EAST.clone().multiplyScalar(Math.cos(a))).add(SUN_DIR.clone().multiplyScalar(-0.3 * Math.sin(a))).normalize();
    const dist = interpolate(T, [87, 100, 108.5], [3.2, 2.8, 3.6], { extrapolateRight: "clamp" });
    return { pos: base.multiplyScalar(dist), look: new THREE.Vector3(0, 0, 0), up: new THREE.Vector3(0, 1, 0), near: 0.01, far: 2000 };
  }
  // galaxy：太陽系のそばから、銀河全体が見える所まで引いていく
  const k = smooth(0, 0.55, u);
  const near = SUN_G.clone().add(new THREE.Vector3(2, 3, 6));
  const far = new THREE.Vector3(-10, 105, 115);
  const pos = near.clone().lerp(far, k);
  const look = SUN_G.clone().lerp(new THREE.Vector3(16, 0, 4), k);
  return { pos, look, up: new THREE.Vector3(0, 1, 0), near: 0.05, far: 5000 };
};

const SpaceCamera: React.FC<{ kind: string; u: number; T: number; shake: number; frame: number }> = ({ kind, u, T, shake, frame }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = spaceCam(kind, u, T);
  camera.position.copy(c.pos).add(new THREE.Vector3(Math.sin(frame * 1.7), Math.cos(frame * 2.1), 0).multiplyScalar(shake));
  camera.up.copy(c.up);
  camera.fov = 50;
  camera.near = c.near;
  camera.far = c.far;
  camera.lookAt(c.look);
  camera.updateProjectionMatrix();
  return null;
};

// 地球（夜の明かり・海の蒸気・とけた岩・割れ目）
const Earth: React.FC<{ T: number; frame: number; lampI: number }> = ({ T, frame, lampI }) => {
  const tex = useTextures();
  const nm = getNightMaps();
  const atmo = useMemo(atmoMat, []);
  const steam = smooth(SEV.oceanT, SEV.oceanT + 1.5, T) * (1 - smooth(SEV.crustT + 1, SEV.crustT + 4, T));
  const lava = smooth(SEV.crustT, SEV.crustT + 4, T);
  const crack = smooth(SEV.bindT - 0.3, SEV.bindT + 0.5, T);
  // 街灯の光で大気が明るく光る
  const glowA = smooth(44, 70, T);
  (atmo.uniforms.color.value as THREE.Color).setRGB(0.44 + 1.6 * glowA + 2 * lava, 0.71 + 1.2 * glowA + 0.6 * lava, 1 + 0.4 * glowA - 0.6 * lava);
  const base = new THREE.Color("#ffffff").lerp(new THREE.Color("#3a2a22"), lava);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial map={tex.earth[0]} color={base} roughness={0.9} emissiveMap={lava > 0.01 ? nm.lava : nm.lights} emissive="#ffffff" emissiveIntensity={lava > 0.01 ? 1.6 * lava : 0.7 * (1 - steam)} />
      </mesh>
      {crack > 0.01 ? (
        <mesh>
          <sphereGeometry args={[1.002, 128, 96]} />
          <meshBasicMaterial map={nm.cracks} transparent opacity={crack} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ) : null}
      <mesh rotation={[0, frame * 0.0004, 0]}>
        <sphereGeometry args={[1.008, 96, 64]} />
        <meshStandardMaterial map={tex.clouds} transparent depthWrite={false} opacity={0.8 * (1 - lava)} />
      </mesh>
      {steam > 0.01 ? (
        <mesh>
          <sphereGeometry args={[1.03, 96, 64]} />
          <meshStandardMaterial color="#f4f6f8" emissive="#ffe9d6" emissiveIntensity={0.55} transparent opacity={0.92 * steam} depthWrite={false} roughness={1} />
        </mesh>
      ) : null}
      <mesh>
        <sphereGeometry args={[1.06, 64, 48]} />
        <primitive object={atmo} attach="material" />
      </mesh>
      {/* 街灯の光が、まわりの地面と雲を照らす */}
      <pointLight position={LP.clone().multiplyScalar(1.015).toArray()} intensity={lampI} decay={2} distance={0} color="#fff0d0" />
    </group>
  );
};

const Sun: React.FC<{ pos: THREE.Vector3; size: number }> = ({ pos, size }) => (
  <group position={pos.toArray()}>
    <mesh>
      <sphereGeometry args={[size * 0.12, 48, 32]} />
      <meshBasicMaterial color="#fff4d6" />
    </mesh>
    <Glare position={[0, 0, 0]} size={size} />
  </group>
);

export const LampSpace: React.FC<{ kind: string; u: number; T: number; frame: number; shake: number }> = ({ kind, u, T, frame, shake }) => {
  const P = power(T);
  const lampPos = LP.clone().multiplyScalar(1.01);
  // 地球の場面の、街灯の光のにじみ（明るさの対数で大きく）
  const glare = Math.min(kind === "boil" ? 1.4 : 3.2, 0.03 * 2 ** ((T - 41) / 7.5));
  const lampI = Math.min(30, 0.004 * 2 ** ((T - 41) / 3.2));
  const sunPos = SUN_DIR.clone().multiplyScalar(60);
  const isGalaxy = kind === "galaxy";
  return (
    <group>
      <SpaceCamera kind={kind} u={u} T={T} shake={shake} frame={frame} />
      {isGalaxy ? null : <Stars />}
      <ambientLight intensity={0.04} />
      {isGalaxy ? (
        <group>
          <Galaxy />
          {/* 太陽系の場所（街灯のある地球）：銀河の明るさとくらべて大きく */}
          {T > SEV.galaxyT ? (
            <mesh position={SUN_G.toArray()} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[(T - SEV.galaxyT) * 22, (T - SEV.galaxyT) * 22 + 3, 96]} />
              <meshBasicMaterial color="#fff6e0" transparent opacity={Math.max(0, 0.8 - (T - SEV.galaxyT) * 0.25)} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          ) : null}
          <Glare position={SUN_G.toArray()} size={Math.max(0.6, Math.min(150, GAL_R * 0.9 * Math.pow(P / L_GALAXY, 0.45)))} />
        </group>
      ) : (
        <group>
          <directionalLight position={SUN_DIR.clone().multiplyScalar(10).toArray()} intensity={2.4} />
          <Earth T={T} frame={frame} lampI={lampI} />
          {kind === "solar" ? (
            <group>
              <Sun pos={sunPos} size={34} />
              <Glare position={lampPos.toArray()} size={34 * Math.pow(P / L_SUN, 0.35)} />
            </group>
          ) : (
            <Glare position={lampPos.toArray()} size={glare} />
          )}
        </group>
      )}
    </group>
  );
};
