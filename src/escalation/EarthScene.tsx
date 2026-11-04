import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { interpolate, random } from "remotion";
import * as THREE from "three";
import { ShotKind } from "./types";

// 地球・宇宙の場面（Phase 3〜4）。
// 地球の地図はコードで描く（NASA の画像に頼らない）。風（光の柱）は、地表の1点から西向きに接線方向へ光速で出ていく。
// 地球が速く回ると、出ていく向きが回るので、光の点の集まりが渦（アルキメデスのらせん）をえがく。
// 長さの単位は地球の半径 R = 1。光速は C / R = 約47（R/秒）。

const C_R = 299792458 / 6.371e6;

// ---- 地図（手続き的に描く）----
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number, wrap: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const h = (a: number, b: number) => hash(((a % wrap) + wrap) % wrap, b);
  return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
};
const fbm = (x: number, y: number, wrap: number, oct = 6) => {
  let a = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < oct; o++) {
    a += amp * vnoise(x * f, y * f, wrap * f);
    amp *= 0.5;
    f *= 2;
  }
  return a;
};

type Maps = { earth: HTMLCanvasElement[]; clouds: HTMLCanvasElement };
let maps: Maps | null = null;
const W = 1024;
const H = 512;
const buildMaps = (): Maps => {
  if (maps) return maps;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const cl = document.createElement("canvas");
  cl.width = W;
  cl.height = H;
  const cctx = cl.getContext("2d")!;
  const cimg = cctx.createImageData(W, H);
  const k = 6; // 横方向に何マス（つなぎ目なく一周させる）
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI;
    const alat = Math.abs(lat) / (Math.PI / 2);
    for (let x = 0; x < W; x++) {
      const nx = (x / W) * k;
      const ny = (y / H) * (k / 2);
      const h = fbm(nx, ny, k) + 0.15 * (alat > 0.85 ? 1 : 0);
      const o = (y * W + x) * 4;
      let r: number, g: number, b: number;
      if (alat > 0.88) {
        r = g = b = 240;
      } else if (h > 0.53) {
        // 陸：緯度で色を変える（赤道は緑、亜熱帯は砂漠、高緯度は暗い緑）
        const desert = Math.exp(-(((alat - 0.28) / 0.1) ** 2)) * (0.6 + 0.4 * fbm(nx * 3, ny * 3, k * 3, 3));
        const hi = Math.min(1, (h - 0.53) * 4);
        r = 70 + 120 * desert + 40 * hi;
        g = 120 + 50 * desert - 10 * hi;
        b = 60 + 40 * desert + 10 * hi;
      } else {
        const d = Math.min(1, (0.53 - h) * 5);
        r = 20 + 20 * (1 - d);
        g = 70 + 60 * (1 - d);
        b = 140 + 50 * (1 - d);
      }
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
      const cv = fbm(nx * 2 + 17.3, ny * 2 + 5.1, k * 2, 5);
      const ca = Math.max(0, Math.min(1, (cv - 0.5) * 4)) * (0.7 + 0.3 * Math.cos(lat * 3));
      cimg.data[o] = cimg.data[o + 1] = cimg.data[o + 2] = 255;
      cimg.data[o + 3] = Math.round(ca * 230);
    }
  }
  ctx.putImageData(img, 0, 0);
  cctx.putImageData(cimg, 0, 0);
  // 速く回ったときの横ぶれ（ブラー）：横にずらして重ねた地図を3段階
  const smear = (frac: number) => {
    const s = document.createElement("canvas");
    s.width = W;
    s.height = H;
    const sctx = s.getContext("2d")!;
    const n = 24;
    sctx.globalAlpha = 1;
    sctx.drawImage(c, 0, 0);
    for (let i = 1; i < n; i++) {
      sctx.globalAlpha = 1 / (i + 1);
      const dx = (i / n) * frac * W;
      sctx.drawImage(c, dx, 0);
      sctx.drawImage(c, dx - W, 0);
    }
    return s;
  };
  maps = { earth: [c, smear(0.06), smear(0.3), smear(1)], clouds: cl };
  return maps;
};

const useTextures = () =>
  useMemo(() => {
    const m = buildMaps();
    const make = (cv: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      return t;
    };
    return { earth: m.earth.map(make), clouds: make(m.clouds) };
  }, []);

// 大気の光（ふちが青く光る）
const atmoMat = () =>
  new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color("#6fb6ff") } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(color * f * 1.6, f); }`,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

const Stars: React.FC = () => {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 2500;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = random(`su${i}`) * 2 - 1;
      const a = random(`sa${i}`) * Math.PI * 2;
      const r = 400;
      p[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(a);
      p[i * 3 + 1] = r * u;
      p[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(a);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial color="#ffffff" size={1.2} sizeAttenuation={false} />
    </points>
  );
};

// 光の柱：放出した時刻 τ ごとの点を、いまの時刻 T まで光速で進めた位置につなぐ
const beamPoints = (T: number, angleAt: (t: number) => number, start: number, maxLen: number, samples: number) => {
  const pts: THREE.Vector3[] = [];
  const tMax = Math.min(T - start, maxLen / C_R);
  if (tMax <= 0) return pts;
  for (let i = 0; i <= samples; i++) {
    const age = (i / samples) * tMax;
    const th = angleAt(T - age);
    const px = Math.cos(th);
    const pz = -Math.sin(th);
    // 西向きの接線（扇風機は西へ吹く）
    const wx = Math.sin(th);
    const wz = Math.cos(th);
    const d = age * C_R;
    pts.push(new THREE.Vector3(px + wx * d, 0, pz + wz * d));
  }
  return pts;
};

const Beam: React.FC<{ T: number; angleAt: (t: number) => number; start: number; spiral: number; maxLen: number; width: number }> = ({ T, angleAt, start, spiral, maxLen, width }) => {
  const geoms = useMemo(() => {
    const pts = beamPoints(T, angleAt, start, maxLen, spiral > 0 ? 4000 : 60);
    if (pts.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pts);
    const seg = spiral > 0 ? 6000 : 60;
    return [new THREE.TubeGeometry(curve, seg, width * (1 + 2 * spiral), 6, false), new THREE.TubeGeometry(curve, seg, width * (4 + 8 * spiral), 8, false)];
  }, [T, angleAt, start, spiral, maxLen, width]);
  if (!geoms) return null;
  return (
    <group>
      <mesh geometry={geoms[0]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={geoms[1]}>
        <meshBasicMaterial color="#7cc8ff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

// カメラ（u は場面の中の進み具合 0〜1）
const earthCam = (kind: ShotKind, u: number, T: number, th: number): { pos: THREE.Vector3; look: THREE.Vector3; up: THREE.Vector3 } => {
  const p = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
  const west = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
  if (kind === "region") {
    // 町の上空：高度がぐんぐん上がる（地上100km → 2000km）
    const alt = 0.03 * Math.pow(12, u);
    const pos = p.clone().multiplyScalar(1 + alt).add(west.clone().multiplyScalar(-alt * 1.6));
    return { pos, look: p.clone().add(west.clone().multiplyScalar(alt * 2.5)), up: p.clone() };
  }
  if (kind === "space") {
    const dist = interpolate(u, [0, 0.08, 1], [2.2, 6.5, 7.5], { extrapolateRight: "clamp" });
    const a = 0.9 + u * 0.6;
    const pos = new THREE.Vector3(Math.cos(a) * dist, 0.9 + 0.6 * u, Math.sin(a) * dist);
    return { pos, look: new THREE.Vector3(0.6, 0, 0.9), up: new THREE.Vector3(0, 1, 0) };
  }
  // spin：北極の上の方から見下ろす。クライマックスでは大きく引いて、光のうずの全体を見せる
  const dist = interpolate(T, [86, 100, 104, 109, 116], [6.5, 7, 10, 26, 34], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const pos = new THREE.Vector3(0.3 * dist, dist, 0.45 * dist);
  return { pos, look: new THREE.Vector3(0, 0, 0), up: new THREE.Vector3(0, 0, -1) };
};

const EarthCamera: React.FC<{ kind: ShotKind; u: number; T: number; th: number; shake: number; frame: number }> = ({ kind, u, T, th, shake, frame }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = earthCam(kind, u, T, th);
  camera.position.copy(c.pos).add(new THREE.Vector3(Math.sin(frame * 1.7), Math.cos(frame * 2.1), 0).multiplyScalar(shake));
  camera.up.copy(c.up);
  camera.fov = 50;
  camera.near = 0.002;
  camera.far = 2000;
  camera.lookAt(c.look);
  camera.updateProjectionMatrix();
  return null;
};

export const EarthScene: React.FC<{
  kind: ShotKind;
  u: number;
  T: number;
  frame: number;
  angleAt: (t: number) => number;
  // 1フレームで地球が回る角度（ブラーの強さを決める）
  perFrame: number;
  beamStart: number;
  shake: number;
}> = ({ kind, u, T, frame, angleAt, perFrame, beamStart, shake }) => {
  const tex = useTextures();
  const atmo = useMemo(atmoMat, []);
  const th = angleAt(T);
  const lvl = perFrame < 0.03 ? 0 : perFrame < 0.25 ? 1 : perFrame < 1.2 ? 2 : 3;
  const spiral = Math.min(1, Math.max(0, (T - 100) / 4));
  const maxLen = kind === "spin" ? 80 : 60;
  return (
    <group>
      <color attach="background" args={["#02030a"]} />
      <EarthCamera kind={kind} u={u} T={T} th={th} shake={shake} frame={frame} />
      <Stars />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 2, 3]} intensity={2.4} />
      <group rotation={[0, th, 0]}>
        <mesh>
          <sphereGeometry args={[1, 96, 64]} />
          <meshStandardMaterial map={tex.earth[lvl]} roughness={0.9} metalness={0} />
        </mesh>
        <mesh rotation={[0, frame * 0.0004, 0]}>
          <sphereGeometry args={[1.008, 96, 64]} />
          <meshStandardMaterial map={tex.clouds} transparent depthWrite={false} opacity={lvl >= 2 ? 0.5 : 0.9} />
        </mesh>
        {/* 風が出ている町（光る点） */}
        <mesh position={[1.001, 0, 0]} visible={kind !== "region"}>
          <sphereGeometry args={[0.012 + 0.01 * spiral, 12, 10]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[1.06, 64, 48]} />
        <primitive object={atmo} attach="material" />
      </mesh>
      <Beam T={T} angleAt={angleAt} start={beamStart} spiral={spiral} maxLen={maxLen} width={kind === "region" ? 0.0006 : kind === "space" ? 0.008 : 0.012} />
    </group>
  );
};
