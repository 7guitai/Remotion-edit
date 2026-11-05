import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// 「断面図×工学の進化」シリーズの素材（PBR）。金属は映りこみ（環境マップ）がないと黒く見えるので、Studio を必ず置く
export type MatName = "brass" | "brassCut" | "chrome" | "chromeCut" | "rubber" | "rubberCut" | "ceramic" | "acrylic" | "plastic" | "plasticCut" | "paper";

// 切断面のザラつき：細かいノイズのでこぼこ（bump）
let grain: THREE.CanvasTexture | null = null;
const getGrain = () => {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const s = Math.sin(i * 12.9898) * 43758.5453;
    const v = 110 + 120 * (s - Math.floor(s));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(6, 6);
  return grain;
};

export const SPEC: Record<MatName, THREE.MeshPhysicalMaterialParameters> = {
  brass: { color: "#d4af37", metalness: 0.85, roughness: 0.25 },
  brassCut: { color: "#c9a43a", metalness: 0.8, roughness: 0.45 },
  chrome: { color: "#e5e7eb", metalness: 0.95, roughness: 0.08 },
  chromeCut: { color: "#cfd3d8", metalness: 0.9, roughness: 0.38 },
  rubber: { color: "#222222", metalness: 0, roughness: 0.9 },
  rubberCut: { color: "#141416", metalness: 0, roughness: 0.95 },
  ceramic: { color: "#f5f5f0", metalness: 0.05, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  // 半透明のゴースト表示（外装を被せたまま中を見せる）
  acrylic: { color: "#dbeafe", metalness: 0, roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1 },
  plastic: { color: "#1f2430", metalness: 0, roughness: 0.45 },
  plasticCut: { color: "#2b303b", metalness: 0, roughness: 0.7 },
  paper: { color: "#f7f5ee", metalness: 0, roughness: 0.95 },
};

const cache = new Map<string, THREE.MeshPhysicalMaterial>();
// 同じ素材は使い回す（色などを変えたいときは key を変える）
export const mat = (name: MatName, over: THREE.MeshPhysicalMaterialParameters = {}, key = "") => {
  const k = name + key;
  let m = cache.get(k);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ ...SPEC[name], ...over });
    if (name.endsWith("Cut")) {
      m.bumpMap = getGrain();
      m.bumpScale = 0.6;
    }
    cache.set(k, m);
  }
  return m;
};

// 外装の「ふつう ↔ 半透明ゴースト」切りかえ（g = 0 ふつう、1 ゴースト）
export const ghostMat = (base: MatName, g: number, key: string) => {
  const m = mat(base, {}, `ghost-${key}`);
  const s = SPEC[base];
  m.transparent = g > 0.001 || !!s.transparent;
  m.opacity = THREE.MathUtils.lerp((s.opacity as number) ?? 1, 0.28, g);
  m.roughness = THREE.MathUtils.lerp((s.roughness as number) ?? 0.5, 0.1, g);
  m.depthWrite = g < 0.5;
  m.side = g > 0.001 ? THREE.DoubleSide : THREE.FrontSide;
  return m;
};

// スタジオの照明（環境マップ＋キーライト・リムライト）
export const Studio: React.FC<{ envIntensity?: number }> = ({ envIntensity = 1 }) => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = envIntensity;
  }, [gl, scene, envIntensity]);
  return (
    <group>
      <ambientLight intensity={0.15} />
      <directionalLight position={[30, 60, 50]} intensity={2.2} />
      <directionalLight position={[-40, 20, -30]} intensity={1.2} color="#9cc4ff" />
      <directionalLight position={[0, -30, 40]} intensity={0.5} color="#ffe2c0" />
    </group>
  );
};
