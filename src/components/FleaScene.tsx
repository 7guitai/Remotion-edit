import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FLEA, FleaResult, simulateFlea } from "../sim/flea";
import { PersonPart } from "./PhysicsScene";
import { fontFamily } from "../theme";

// もし人間がノミと同じジャンプ力だったら？の場面。
// jump：2人が並んで跳ぶ（右の人を追いかけて空へ）、top：てっぺんから町を見下ろす、land：車の屋根に落ちてくるのを下から見上げる
export type FleaMode = "jump" | "top" | "land";

const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const SHIRTS = ["#ff4a3d", "#2f8bff"];

const pose = (sim: FleaResult, f: number, lane: number, name: string) => {
  const i = sim.parts.findIndex((p) => p.lane === lane && p.name === name);
  const o = ((f * 2 + lane) * sim.nParts + (i % sim.nParts)) * 7;
  return [sim.doll[o], sim.doll[o + 1], sim.doll[o + 2]] as [number, number, number];
};

// 画面のゆれ（跳んだ瞬間と、落ちた瞬間）
const shakeAt = (sim: FleaResult, t: number) => {
  let a = 0;
  if (sim.launch >= 0) {
    const d = t - sim.launch;
    if (d >= 0 && d < 0.5) a = Math.max(a, 0.18 * (1 - d / 0.5));
  }
  if (sim.land >= 0) {
    const d = t - sim.land;
    if (d >= 0 && d < 0.9) a = Math.max(a, 0.45 * Math.exp(-d * 4));
  }
  return a;
};

const Cam: React.FC<{ sim: FleaResult; f: number; mode: FleaMode }> = ({ sim, f, mode }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const t = f / sim.fps;
  const p = pose(sim, f, 1, "pelvis");
  const sh = shakeAt(sim, t);
  const sx = sh * Math.sin(t * 73);
  const sy = sh * Math.cos(t * 61);
  if (mode === "jump") {
    // 2人の全身が見える位置から、右の人を追いかけて上へ（高くなるほど引いて、ビルとくらべる）
    const h = Math.max(0, p[1] - 1);
    const lookY = 0.55 + h * 0.95;
    const d = 10.5 + h * 0.62;
    camera.position.set(1.0 + h * 0.08 + sx, 1.5 + h * 0.75 + sy, d);
    camera.lookAt(0.6 + h * 0.05, lookY, 0);
  } else if (mode === "top") {
    // 真上近くから見下ろす（町がミニチュアのように小さい）
    // 人の後ろ上から、人ごしに はるか下の町を見下ろす
    camera.position.set(p[0] + 1.5 + sx, p[1] + 5.5 + sy, p[2] + 7);
    camera.lookAt(p[0] - 2, 0, -3);
  } else {
    // 車の横の地面すれすれから見上げる
    const fallY = Math.max(1.6, p[1]);
    camera.position.set(FLEA.car.x - 5.2 + sx, 0.55 + sy, 7.2);
    camera.lookAt(FLEA.car.x - 0.4, Math.min(9, 1.4 + (fallY - 1.6) * 0.32), 0);
  }
  camera.updateProjectionMatrix();
  return null;
};

// 13階建てのビル（窓の並んだ壁）
const useWindows = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 1024;
    const x = c.getContext("2d")!;
    x.fillStyle = "#d9dde3";
    x.fillRect(0, 0, 256, 1024);
    const floors = 13;
    const fh = 1024 / floors;
    for (let k = 0; k < floors; k++) {
      x.fillStyle = "#c3c8d0";
      x.fillRect(0, k * fh, 256, 4);
      for (let w = 0; w < 4; w++) {
        x.fillStyle = (k * 7 + w * 3) % 5 === 0 ? "#f6e7b0" : "#7fa6c9";
        x.fillRect(16 + w * 60, k * fh + 18, 44, fh - 34);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

const Town: React.FC = () => {
  const win = useWindows();
  const B = FLEA.building;
  const houses = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        x: 4 + i * 7.5 - (i > 4 ? 60 : 0),
        z: -9 - (i % 3) * 2,
        w: 5 + (i % 2) * 1.2,
        h: 5.4 + ((i * 37) % 5) * 0.4,
        wall: ["#f2e6d0", "#e9eef2", "#f4dccb", "#e2e8d8"][i % 4],
        roof: ["#8a3b2e", "#3d4f6b", "#5a4a3a", "#7a2f2f"][i % 4],
      })),
    [],
  );
  return (
    <group>
      <mesh position={[B.x, B.h / 2, B.z]} castShadow receiveShadow>
        <boxGeometry args={[B.w, B.h, B.d]} />
        <meshStandardMaterial map={win} roughness={0.6} />
      </mesh>
      <mesh position={[B.x, B.h + 0.3, B.z]} castShadow>
        <boxGeometry args={[B.w + 0.4, 0.6, B.d + 0.4]} />
        <meshStandardMaterial color="#9aa3ae" />
      </mesh>
      {/* 道路 */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 7]} />
        <meshStandardMaterial color="#5b5f66" roughness={0.9} />
      </mesh>
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[-90 + i * 4.5, 0.02, 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.15]} />
          <meshBasicMaterial color="#f2f2f2" />
        </mesh>
      ))}
      {houses.map((hs, i) => (
        <group key={i} position={[hs.x, 0, hs.z]}>
          <mesh position={[0, hs.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[hs.w, hs.h, 6]} />
            <meshStandardMaterial color={hs.wall} roughness={0.85} />
          </mesh>
          <mesh position={[0, hs.h + 1.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[hs.w * 0.78, 2.4, 4]} />
            <meshStandardMaterial color={hs.roof} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={`t${i}`} position={[-40 + i * 8.5, 0, -5.5 - (i % 2) * 0.8]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.3, 2.8, 10]} />
            <meshStandardMaterial color="#6b4a2e" />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <sphereGeometry args={[1.6, 16, 12]} />
            <meshStandardMaterial color="#4f8f3a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 止めてある車。落ちてきた人が当たると、屋根がへこむ
const Car: React.FC<{ sim: FleaResult; f: number }> = ({ sim, f }) => {
  const body = useMemo(() => new RoundedBoxGeometry(4.0, 0.9, 1.7, 4, 0.18), []);
  const cabin = useMemo(() => new RoundedBoxGeometry(2.2, 0.55, 1.5, 4, 0.2), []);
  const t = f / sim.fps;
  const crush = sim.land >= 0 ? interpolate(t - sim.land, [0, 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const o = f * 7;
  return (
    <group position={[sim.car[o], sim.car[o + 1], sim.car[o + 2]]} quaternion={[sim.car[o + 3], sim.car[o + 4], sim.car[o + 5], sim.car[o + 6]]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color="#f2c230" roughness={0.35} metalness={0.3} />
      </mesh>
      {/* 屋根（へこむと低く、平たく、少しゆがむ） */}
      <group position={[-0.25, 0.72 - 0.28 * crush, 0]} scale={[1 + 0.06 * crush, 1 - 0.6 * crush, 1 + 0.08 * crush]} rotation={[0.08 * crush, 0, -0.05 * crush]}>
        <mesh geometry={cabin} castShadow>
          <meshStandardMaterial color={crush > 0 ? "#3a4656" : "#1d2a3a"} roughness={0.15} metalness={0.5} />
        </mesh>
      </group>
      {[-1.3, 1.3].map((x) =>
        [-0.78, 0.78].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.4, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.24, 24]} />
            <meshStandardMaterial color="#151515" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
};

// 落ちた瞬間の土けむり・ガラスのかけら・地面を走る衝撃の輪
const Impact: React.FC<{ sim: FleaResult; t: number }> = ({ sim, t }) => {
  if (sim.land < 0) return null;
  const dt = t - sim.land;
  if (dt < 0 || dt > 3) return null;
  const cx = FLEA.car.x - 0.3;
  const puffs = Array.from({ length: 30 }, (_, i) => {
    const a = random(`fa${i}`) * Math.PI * 2;
    const sp = 1.5 + random(`fs${i}`) * 4;
    const d = (sp * (1 - Math.exp(-dt * 2))) / 2;
    const r = 0.25 + dt * (0.35 + random(`fr${i}`) * 0.4);
    return (
      <mesh key={i} position={[cx + Math.cos(a) * d, 0.3 + r * 0.4 + dt * 0.4 * random(`fy${i}`), Math.sin(a) * d]}>
        <sphereGeometry args={[r, 10, 8]} />
        <meshStandardMaterial color="#d8d2c4" transparent opacity={Math.max(0, 0.45 * (1 - dt / 3))} depthWrite={false} roughness={1} />
      </mesh>
    );
  });
  const shards = Array.from({ length: 26 }, (_, i) => {
    const a = random(`ga${i}`) * Math.PI * 2;
    const up = 2 + random(`gu${i}`) * 4;
    const sp = 1 + random(`gs${i}`) * 3;
    const tt = Math.min(dt, 1.2);
    const y = Math.max(0.03, 1.5 + up * tt - 4.9 * tt * tt);
    return (
      <mesh key={`g${i}`} position={[cx + Math.cos(a) * sp * tt, y, Math.sin(a) * sp * tt]} rotation={[dt * 9 + i, dt * 7, i]}>
        <boxGeometry args={[0.08, 0.01, 0.06]} />
        <meshStandardMaterial color="#cfe8ff" metalness={0.4} roughness={0.1} transparent opacity={0.85} />
      </mesh>
    );
  });
  const ring = Math.min(1, dt / 0.7);
  return (
    <group>
      {puffs}
      {shards}
      {dt < 0.7 ? (
        <mesh position={[cx, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1 + ring * 9, 1.6 + ring * 9.5, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - ring)} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

// 集中線（画面のふちから中心へ向かう線）。strength 0〜1
export const SpeedLines: React.FC<{ strength: number; seed: number; width: number; height: number }> = ({ strength, seed, width, height }) => {
  if (strength <= 0.01) return null;
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.hypot(width, height) / 2;
  const lines = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2 + random(`sl${seed}-${i}`) * 0.08;
    const inner = R * (0.42 + random(`si${seed}-${i}`) * 0.25);
    const w = 3 + random(`sw${seed}-${i}`) * 9;
    const x1 = cx + Math.cos(a) * inner;
    const y1 = cy + Math.sin(a) * inner;
    const x2 = cx + Math.cos(a) * R;
    const y2 = cy + Math.sin(a) * R;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    return <polygon key={i} points={`${x1},${y1} ${x2 + nx},${y2 + ny} ${x2 - nx},${y2 - ny}`} fill="#fff" />;
  });
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: strength }}>
      {lines}
    </svg>
  );
};

// 上へ速く動いているときの、たての流れる線
const Streaks: React.FC<{ strength: number; t: number; width: number; height: number }> = ({ strength, t, width, height }) => {
  if (strength <= 0.02) return null;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: strength }}>
      {Array.from({ length: 22 }, (_, i) => {
        const x = random(`kx${i}`) * width;
        const len = 120 + random(`kl${i}`) * 260;
        const y = ((random(`ky${i}`) * height + t * 2600) % (height + len)) - len;
        return <rect key={i} x={x} y={y} width={3 + random(`kw${i}`) * 4} height={len} fill="#fff" opacity={0.65} rx={3} />;
      })}
    </svg>
  );
};

const Pill: React.FC<{ color: string; children: React.ReactNode; size?: number }> = ({ color, children, size = 44 }) => (
  <div
    style={{
      fontFamily,
      fontWeight: 900,
      fontSize: size,
      color: "#fff",
      background: "rgba(10,16,28,0.8)",
      border: `6px solid ${color}`,
      borderRadius: 18,
      padding: "2px 22px",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

export const FleaScene: React.FC<{ mode: FleaMode; width: number; height: number; offset?: number; speed?: number }> = ({ mode, width, height, offset = 0, speed = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // どの場面でも同じ長さを計算して使い回す（14秒）
  const sim = useMemo(() => simulateFlea(fps * 14, fps), [fps]);
  // speed < 1 はスローモーション
  const f = Math.min(Math.floor(offset + frame * speed), sim.frames - 1);
  const at = (sec: number) => Math.round((sec * fps - offset) / speed);
  const t = f / fps;
  const flash =
    (sim.launch >= 0 ? interpolate(t - sim.launch, [0, 0.02, 0.25], [0, 0.75, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0) +
    (sim.land >= 0 ? interpolate(t - sim.land, [0, 0.02, 0.35], [0, 0.95, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0);
  const lines = Math.max(
    sim.launch >= 0 ? interpolate(t - sim.launch, [0, 0.05, 0.6], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
    sim.land >= 0 ? interpolate(t - sim.land, [0, 0.05, 0.8], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
  );
  const flying = sim.launch >= 0 && t > sim.launch && (sim.land < 0 || t < sim.land);
  const streak = flying && mode === "jump" ? Math.min(1, sim.speed[f] / 90) * 0.55 : flying && mode === "land" ? Math.min(1, sim.speed[f] / 90) * 0.35 : 0;
  const h = sim.height[f];
  // 「ドーン！」の文字（落ちた瞬間に、たたきつけるように）
  const boomD = sim.land >= 0 ? t - sim.land : -1;
  const boom = boomD >= 0 && boomD < 1.6 && mode === "land" ? interpolate(boomD, [0, 0.1, 0.2], [2.4, 0.9, 1], { extrapolateRight: "clamp" }) : 0;
  const np = sim.nParts;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #4f9be8 0%, #9fd0f7 55%, #dff0fb 100%)" }} />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 45, near: 0.1, far: 400 }} gl={{ antialias: true }}>
        <Cam sim={sim} f={f} mode={mode} />
        <fog attach="fog" args={["#cfe6f7", 60, 260]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#dff0ff", "#6f8f5a", 0.5]} />
        <directionalLight
          position={[12, 30, 14]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={50}
          shadow-camera-bottom={-10}
          shadow-camera-far={120}
          shadow-bias={-0.0004}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[600, 600]} />
          <meshStandardMaterial color="#7fb069" roughness={0.95} />
        </mesh>
        <Town />
        <Car sim={sim} f={f} />
        {sim.parts.map((p, i) => {
          const o = ((f * 2 + p.lane) * np + (i % np)) * 7;
          const color = p.look === "shirt" ? SHIRTS[p.lane] : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
          return (
            <PersonPart
              key={i}
              part={p.name}
              size={p.size}
              color={color}
              pos={[sim.doll[o], sim.doll[o + 1], sim.doll[o + 2]]}
              quat={[sim.doll[o + 3], sim.doll[o + 4], sim.doll[o + 5], sim.doll[o + 6]]}
            />
          );
        })}
        <Impact sim={sim} t={t} />
      </ThreeCanvas>
      <Streaks strength={streak} t={t} width={width} height={height} />
      <SpeedLines strength={lines} seed={Math.floor(t * 12)} width={width} height={height} />
      {/* 高さと速さのメーター（右の人） */}
      {mode !== "top" ? (
        <div style={{ position: "absolute", top: 24, right: 24, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <Pill color={SHIRTS[1]} size={50}>{`高さ ${h < 10 ? h.toFixed(1) : Math.round(h)}m`}</Pill>
          <Pill color="#ffd23a" size={40}>{`時速 ${Math.round(flying ? sim.speed[f] : 0)}km`}</Pill>
        </div>
      ) : (
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <Pill color={SHIRTS[1]} size={50}>{`高さ ${Math.round(h)}m`}</Pill>
        </div>
      )}
      {mode === "jump" && (sim.launch < 0 || t < sim.launch + 0.8) ? (
        <div style={{ position: "absolute", top: 24, left: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <Pill color={SHIRTS[0]} size={40}>ふつうの人</Pill>
          <Pill color={SHIRTS[1]} size={40}>ノミのジャンプ力</Pill>
        </div>
      ) : null}
      {boom > 0 ? (
        <div
          style={{
            position: "absolute",
            top: height * 0.18,
            width: "100%",
            textAlign: "center",
            fontFamily,
            fontWeight: 900,
            fontSize: 170,
            color: "#ffe23a",
            WebkitTextStroke: "10px #1a1a1a",
            paintOrder: "stroke fill",
            transform: `scale(${boom}) rotate(-8deg)`,
            opacity: interpolate(boomD, [1.2, 1.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          ドーン！
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash), pointerEvents: "none" }} />
      {/* 効果音：跳んだ瞬間の風を切る音、落ちた瞬間の衝撃とガラスの割れる音 */}
      {sim.launch >= 0 && at(sim.launch) >= 0 && mode === "jump" ? (
        <Sequence from={at(sim.launch)} durationInFrames={40}>
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
        </Sequence>
      ) : null}
      {sim.land >= 0 && at(sim.land) >= 0 && mode === "land" ? (
        <Sequence from={at(sim.land)} durationInFrames={60}>
          <Audio src={staticFile("sfx/impact.wav")} volume={Math.min(0.5, 0.2 + sim.landV / 100)} />
          <Audio src={staticFile("sfx/crack.wav")} volume={0.25} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
