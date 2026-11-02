import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AnimalMode, AnimalResult, GECKO, simulateAnimal } from "../sim/animal";
import { PersonPart } from "./PhysicsScene";
import { Pill, SpeedLines, Streaks, Town } from "./FleaScene";

// もし人間が動物の能力を持っていたら？の場面（9種類）。物理・動きの計算は sim/animal.ts
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
// 0：能力を持った人（青）、1：ふつうの人（赤）。ネコとハヤブサは左がふつうの人
const SHIRT: Record<AnimalMode, string[]> = {
  cheetah: ["#2f8bff"],
  beetle: ["#2f8bff"],
  gecko: ["#2f8bff", "#ff4a3d"],
  cat: ["#ff4a3d", "#2f8bff"],
  falcon: ["#ff4a3d", "#2f8bff"],
  chameleon: ["#2f8bff"],
  shrimp: ["#2f8bff"],
  basilisk: ["#2f8bff"],
  woodpecker: ["#2f8bff"],
};

const val = (sim: AnimalResult, name: string, f: number) => sim.values[name]?.[f] ?? 0;
const pelvis = (sim: AnimalResult, f: number, fig = 0) => {
  const o = ((f * sim.figures + fig) * 13 + 6) * 7;
  return [sim.doll[o], sim.doll[o + 1], sim.doll[o + 2]] as [number, number, number];
};

// 画面のゆれ：ぶつかった瞬間ほど大きく、すぐおさまる
const shakeAt = (sim: AnimalResult, t: number) => {
  let a = 0;
  for (const e of sim.events) {
    if (e.kind !== "impact" && e.kind !== "launch") continue;
    const d = t - e.t;
    if (d >= 0 && d < 0.8) a = Math.max(a, Math.min(0.35, e.v * 0.016) * Math.exp(-d * 5));
  }
  return a;
};

const Cam: React.FC<{ sim: AnimalResult; f: number }> = ({ sim, f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const t = f / sim.fps;
  const sh = shakeAt(sim, t);
  const sx = sh * Math.sin(t * 71);
  const sy = sh * Math.cos(t * 59);
  const set = (p: [number, number, number], l: [number, number, number]) => {
    camera.position.set(p[0] + sx, p[1] + sy, p[2]);
    camera.lookAt(l[0], l[1], l[2]);
  };
  const p = pelvis(sim, f);
  switch (sim.mode) {
    case "cheetah":
      set([p[0] - 3.5, 1.5, 8.5], [p[0] + 1.5, 1.0, 0]);
      break;
    case "beetle":
      set([p[0] - 6, 4.2, 17], [p[0] - 9, 1.6, 0]);
      break;
    case "gecko": {
      const h = val(sim, "height", f);
      set([GECKO.x + 4.5, 2.0 + h * 0.75, 10.5], [GECKO.x + 0.5, 1.6 + h * 0.9, -1]);
      break;
    }
    case "cat": {
      // 落ちていく2人を追いかける（地面に近づくと、着地する所を見る）
      const y = Math.max(1.6, (pelvis(sim, f, 0)[1] + pelvis(sim, f, 1)[1]) / 2);
      set([0, y + 0.8, 8.8], [0, y - 0.2, 0]);
      break;
    }
      break;
    case "falcon":
      set([0, 1.2, 6.2], [0, 2.2, 0]);
      break;
    case "chameleon":
      set([1.9, 1.7, 5.4], [1.9, 1.35, 0]);
      break;
    case "shrimp":
      set([-1.6, 1.7, 4.6], [0.7, 1.05, 0]);
      break;
    case "basilisk":
      set([p[0] - 3.8, 2.0, 8.2], [p[0] + 1.6, 0.6, 0]);
      break;
    case "woodpecker":
      set([-1.0, 1.75, 3.0], [0.35, 1.45, 0]);
      break;
  }
  camera.updateProjectionMatrix();
  return null;
};

const Car: React.FC<{ color: string }> = ({ color }) => {
  const body = useMemo(() => new RoundedBoxGeometry(4.0, 0.9, 1.7, 4, 0.18), []);
  const cabin = useMemo(() => new RoundedBoxGeometry(2.2, 0.55, 1.5, 4, 0.2), []);
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh geometry={cabin} position={[-0.25, 0.72, 0]} castShadow>
        <meshStandardMaterial color="#1d2a3a" roughness={0.15} metalness={0.5} />
      </mesh>
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

const Bus: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[11, 2.6, 2.5]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
    {/* 窓 */}
    <mesh position={[0, 0.45, 1.26]}>
      <planeGeometry args={[10, 0.9]} />
      <meshStandardMaterial color="#20303f" roughness={0.1} metalness={0.4} />
    </mesh>
    {[-3.6, 3.6].map((x) =>
      [-1.05, 1.05].map((z) => (
        <mesh key={`${x}${z}`} position={[x, -1.25, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.35, 24]} />
          <meshStandardMaterial color="#151515" roughness={0.9} />
        </mesh>
      )),
    )}
  </group>
);

const Thing: React.FC<{ sim: AnimalResult; f: number; k: number }> = ({ sim, f, k }) => {
  const ob = sim.objects[k];
  const n = sim.objects.length;
  const o = (f * n + k) * 7;
  const pos: [number, number, number] = [sim.obj[o], sim.obj[o + 1], sim.obj[o + 2]];
  const quat: [number, number, number, number] = [sim.obj[o + 3], sim.obj[o + 4], sim.obj[o + 5], sim.obj[o + 6]];
  if (ob.shape === "car") {
    return (
      <group position={pos} quaternion={quat}>
        <Car color={ob.color ?? "#e8333a"} />
      </group>
    );
  }
  if (ob.shape === "bus") {
    return (
      <group position={pos} quaternion={quat}>
        <Bus color={ob.color ?? "#2f8bff"} />
      </group>
    );
  }
  if (ob.shape === "rope") {
    const len = val(sim, "ropeLen", f);
    return (
      <mesh position={pos} quaternion={quat} castShadow>
        <boxGeometry args={[len, 0.05, 0.05]} />
        <meshStandardMaterial color="#c9a46a" roughness={0.9} />
      </mesh>
    );
  }
  if (ob.shape === "apple") {
    return (
      <group position={pos}>
        <mesh castShadow>
          <sphereGeometry args={[ob.size[0] / 2, 24, 18]} />
          <meshStandardMaterial color={ob.color} roughness={0.35} />
        </mesh>
        <mesh position={[0, ob.size[0] / 2 + 0.02, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
          <meshStandardMaterial color="#5a3b1e" />
        </mesh>
      </group>
    );
  }
  if (ob.shape === "post") {
    return (
      <mesh position={pos} castShadow receiveShadow>
        <cylinderGeometry args={[ob.size[0] / 2, ob.size[0] / 2, ob.size[1], 16]} />
        <meshStandardMaterial color={ob.color} roughness={0.8} />
      </mesh>
    );
  }
  if (ob.shape === "tree") {
    // つついた穴（回数とともに深く、大きく）
    const pecks = val(sim, "pecks", f);
    const hole = Math.min(0.11, 0.02 + pecks * 0.0012);
    return (
      <group position={pos}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[ob.size[0] / 2, ob.size[0] / 2 + 0.06, ob.size[1], 24]} />
          <meshStandardMaterial color={ob.color} roughness={0.95} />
        </mesh>
        <mesh position={[0, ob.size[1] / 2 + 1.2, 0]} castShadow>
          <sphereGeometry args={[2.2, 18, 14]} />
          <meshStandardMaterial color="#4f8f3a" roughness={0.9} />
        </mesh>
        {pecks > 0 ? (
          <mesh position={[-ob.size[0] / 2 - 0.002, 1.62 - pos[1], 0]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[hole, 20]} />
            <meshBasicMaterial color="#2a1a0c" />
          </mesh>
        ) : null}
      </group>
    );
  }
  return (
    <mesh position={pos} quaternion={quat} castShadow receiveShadow>
      {ob.shape === "sphere" ? <sphereGeometry args={[ob.size[0] / 2, 18, 14]} /> : <boxGeometry args={ob.size} />}
      <meshStandardMaterial color={ob.color} roughness={0.85} />
    </mesh>
  );
};

// カメレオンの舌（口からまっすぐのびる、ピンクの太いひも）
const Tongue: React.FC<{ sim: AnimalResult; f: number }> = ({ sim, f }) => {
  const len = val(sim, "tongue", f);
  if (len <= 0.01) return null;
  const x = val(sim, "mouthX", f);
  const y = val(sim, "mouthY", f);
  return (
    <group position={[x + len / 2, y, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, len, 12]} />
        <meshStandardMaterial color="#ff6f9c" roughness={0.3} />
      </mesh>
      <mesh position={[len / 2, 0, 0]}>
        <sphereGeometry args={[0.055, 14, 10]} />
        <meshStandardMaterial color="#ff4f86" roughness={0.3} />
      </mesh>
    </group>
  );
};

// 水しぶき・木くず・土けむり（できごとの起きた場所から、決まった動きで飛ぶ）
const Particles: React.FC<{ sim: AnimalResult; t: number }> = ({ sim, t }) => {
  const items: React.ReactNode[] = [];
  sim.events.forEach((e, ei) => {
    const d = t - e.t;
    if (e.kind === "splash" && d >= 0 && d < 0.9) {
      const n = e.v > 15 && ei === sim.events.length - 1 ? 40 : 12;
      for (let i = 0; i < n; i++) {
        const a = random(`sa${ei}-${i}`) * Math.PI * 2;
        const up = 2 + random(`su${ei}-${i}`) * (n > 12 ? 5 : 3.5);
        const sp = 0.6 + random(`ss${ei}-${i}`) * 1.4;
        const y = up * d - 4.9 * d * d;
        if (y < -0.05) continue;
        items.push(
          <mesh key={`s${ei}-${i}`} position={[e.pos[0] - d * 2 + Math.cos(a) * sp * d, y, e.pos[2] + Math.sin(a) * sp * d]}>
            <sphereGeometry args={[0.05 + 0.04 * random(`sr${ei}-${i}`), 6, 5]} />
            <meshStandardMaterial color="#e8f6ff" transparent opacity={0.85 * (1 - d / 0.9)} roughness={0.1} />
          </mesh>,
        );
      }
    }
    if (e.kind === "chip" && d >= 0 && d < 0.7) {
      for (let i = 0; i < 3; i++) {
        const up = 1 + random(`ca${ei}-${i}`) * 2;
        const side = (random(`cs${ei}-${i}`) - 0.5) * 2;
        items.push(
          <mesh key={`c${ei}-${i}`} position={[e.pos[0] - 0.6 * d - 0.02, e.pos[1] + up * d - 4.9 * d * d, e.pos[2] + side * d]} rotation={[d * 20 + i, d * 13, i]}>
            <boxGeometry args={[0.03, 0.006, 0.02]} />
            <meshStandardMaterial color="#d8b07a" />
          </mesh>,
        );
      }
    }
    if (e.kind === "impact" && d >= 0 && d < 2.5 && sim.mode !== "shrimp") {
      for (let i = 0; i < 18; i++) {
        const a = random(`ia${ei}-${i}`) * Math.PI * 2;
        const sp = 0.8 + random(`is${ei}-${i}`) * 2.2;
        const r = 0.15 + d * (0.25 + random(`ir${ei}-${i}`) * 0.3);
        const dd = (sp * (1 - Math.exp(-d * 2))) / 2;
        items.push(
          <mesh key={`i${ei}-${i}`} position={[e.pos[0] + Math.cos(a) * dd, 0.15 + r * 0.4 + d * 0.2, e.pos[2] + Math.sin(a) * dd]}>
            <sphereGeometry args={[r, 9, 7]} />
            <meshStandardMaterial color="#d8d2c4" transparent opacity={Math.max(0, 0.4 * (1 - d / 2.5))} depthWrite={false} roughness={1} />
          </mesh>,
        );
      }
    }
    if (e.kind === "impact" && sim.mode === "shrimp" && d >= 0 && d < 0.5) {
      // シャコのパンチ：水の中なら泡がつぶれて光る（キャビテーション）。こぶしの先に光る泡
      const r = 0.1 + d * 1.6;
      items.push(
        <mesh key={`b${ei}`} position={e.pos}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshBasicMaterial color="#cfefff" transparent opacity={0.55 * (1 - d / 0.5)} depthWrite={false} />
        </mesh>,
      );
    }
  });
  return <group>{items}</group>;
};

// 横に流れる線（速く走っているとき）
const HStreaks: React.FC<{ strength: number; t: number; width: number; height: number }> = ({ strength, t, width, height }) => {
  if (strength <= 0.02) return null;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: strength }}>
      {Array.from({ length: 26 }, (_, i) => {
        const y = random(`hy${i}`) * height;
        const len = 160 + random(`hl${i}`) * 340;
        const x = width - (((random(`hx${i}`) * width + t * 3200) % (width + len)));
        return <rect key={i} x={x} y={y} width={len} height={3 + random(`hw${i}`) * 4} fill="#fff" opacity={0.6} rx={3} />;
      })}
    </svg>
  );
};

// 雲（ハヤブサ：下へ落ちていくので、雲が下から上へ流れる）
const Clouds: React.FC<{ sim: AnimalResult; f: number }> = ({ sim, f }) => {
  const fall = 3000 - val(sim, "alt1", f);
  return (
    <group>
      {Array.from({ length: 26 }, (_, i) => {
        const span = 260;
        const y = ((((random(`cy${i}`) * span - fall * 0.6) % span) + span) % span) - span / 2;
        return (
          <mesh key={i} position={[(random(`cx${i}`) - 0.5) * 60, y, -12 - random(`cz${i}`) * 40]} scale={[1.6, 0.7, 1]}>
            <sphereGeometry args={[3 + random(`cr${i}`) * 4, 14, 10]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.85} roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
};

const Lake: React.FC = () => (
  <group>
    <mesh position={[-60, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 200]} />
      <meshStandardMaterial color="#d8c39a" roughness={1} />
    </mesh>
    <mesh position={[150, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[300, 200]} />
      <meshStandardMaterial color="#2f7fc4" roughness={0.15} metalness={0.2} transparent opacity={0.88} />
    </mesh>
    {/* 水の中（しずんだ人が少し見えるように、底は暗い青） */}
    <mesh position={[150, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[300, 200]} />
      <meshStandardMaterial color="#123a5c" roughness={1} />
    </mesh>
    {Array.from({ length: 10 }, (_, i) => (
      <group key={i} position={[-8 - i * 6, 0, -14 - (i % 3) * 4]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.3, 2.8, 10]} />
          <meshStandardMaterial color="#6b4a2e" />
        </mesh>
        <mesh position={[0, 3.8, 0]} castShadow>
          <sphereGeometry args={[1.7, 16, 12]} />
          <meshStandardMaterial color="#4f8f3a" roughness={0.9} />
        </mesh>
      </group>
    ))}
  </group>
);

const Meter: React.FC<{ sim: AnimalResult; f: number }> = ({ sim, f }) => {
  const v = (n: string) => val(sim, n, f);
  const items: [string, string][] = [];
  switch (sim.mode) {
    case "cheetah":
      items.push(["#2f8bff", `時速 ${Math.round(v("speed"))}km`]);
      items.push(["#e8333a", "車 時速60km"]);
      if (v("t100") > 0) items.push(["#ffd23a", `100m ${v("t100").toFixed(1)}秒`]);
      break;
    case "beetle":
      items.push(["#ffd23a", "引っぱる重さ 約75トン"]);
      break;
    case "gecko":
      items.push(["#2f8bff", `高さ ${v("height").toFixed(1)}m`]);
      break;
    case "falcon":
      items.push(["#ff4a3d", `時速 ${Math.round(v("speed0"))}km`]);
      items.push(["#2f8bff", `時速 ${Math.round(v("speed1"))}km`]);
      break;
    case "chameleon":
      items.push(["#ff6f9c", `舌の長さ ${v("tongue").toFixed(1)}m`]);
      break;
    case "shrimp":
      items.push(["#2f8bff", "パンチ 時速83km"]);
      break;
    case "basilisk":
      items.push([v("speed") >= 106 ? "#2fc46b" : "#2f8bff", `時速 ${Math.round(v("speed"))}km`]);
      break;
    case "woodpecker":
      items.push(["#ffd23a", `つついた回数 ${Math.round(v("pecks"))}回`]);
      break;
    default:
      break;
  }
  if (!items.length) return null;
  return (
    <div style={{ position: "absolute", top: 28, left: 28, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      {items.map(([c, s], i) => (
        <Pill key={i} color={c} size={i === 0 ? 54 : 42}>
          {s}
        </Pill>
      ))}
    </div>
  );
};

const LANES: Partial<Record<AnimalMode, string[]>> = {
  cat: ["ふつうの人", "ネコの能力"],
  falcon: ["スカイダイバー", "ハヤブサの能力"],
  gecko: ["ヤモリの能力", "ふつうの人"],
};

export const AnimalScene: React.FC<{ mode: AnimalMode; width: number; height: number; offset?: number; speed?: number; bare?: boolean }> = ({ mode, width, height, offset = 0, speed = 1, bare = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sim = useMemo(() => simulateAnimal(mode, fps), [mode, fps]);
  // speed < 1 はスローモーション
  const f = Math.min(Math.floor(offset + frame * speed), sim.frames - 1);
  const t = f / fps;
  const at = (sec: number) => Math.round((sec * fps - offset) / speed);
  let flash = 0;
  let lines = 0;
  for (const e of sim.events) {
    const d = t - e.t;
    if (e.kind === "impact" || e.kind === "launch" || e.kind === "flash") {
      flash = Math.max(flash, interpolate(d, [0, 0.02, 0.3], [0, e.kind === "launch" ? 0.45 : 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      lines = Math.max(lines, interpolate(d, [0, 0.05, 0.6], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }
  }
  const sp = val(sim, "speed", f);
  const hstreak = mode === "cheetah" || mode === "basilisk" ? Math.min(1, sp / 100) * 0.5 : 0;
  const vstreak = mode === "falcon" ? Math.min(1, val(sim, "speed1", f) / 300) * 0.6 : 0;
  const np = 13;
  const sky =
    mode === "falcon"
      ? "linear-gradient(180deg, #2f7fd8 0%, #6fb2ee 60%, #bfe0fa 100%)"
      : "linear-gradient(180deg, #4f9be8 0%, #9fd0f7 55%, #dff0fb 100%)";
  const lanes = LANES[mode];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: sky }} />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 45, near: 0.1, far: 500 }} gl={{ antialias: true }}>
        <Cam sim={sim} f={f} />
        <fog attach="fog" args={[mode === "falcon" ? "#a9d3f5" : "#cfe6f7", 60, 300]} />
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
          shadow-camera-top={30}
          shadow-camera-bottom={-10}
          shadow-camera-far={150}
          shadow-bias={-0.0004}
        />
        {mode === "falcon" ? (
          <Clouds sim={sim} f={f} />
        ) : mode === "basilisk" ? (
          <Lake />
        ) : (
          <group position={[mode === "cheetah" || mode === "beetle" ? Math.floor(pelvis(sim, f)[0] / 90) * 90 : 0, 0, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
              <planeGeometry args={[800, 600]} />
              <meshStandardMaterial color="#7fb069" roughness={0.95} />
            </mesh>
            <Town />
            {mode === "cheetah" || mode === "beetle" ? (
              <group position={[90, 0, 0]}>
                <Town />
              </group>
            ) : null}
          </group>
        )}
        {sim.objects.map((_, k) => (
          <Thing key={k} sim={sim} f={f} k={k} />
        ))}
        {mode === "chameleon" ? <Tongue sim={sim} f={f} /> : null}
        {sim.parts.map((p, i) => {
          const o = ((f * sim.figures + p.fig) * np + (i % np)) * 7;
          const color = p.look === "shirt" ? SHIRT[mode][p.fig] : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
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
        <Particles sim={sim} t={t} />
      </ThreeCanvas>
      <HStreaks strength={hstreak} t={t} width={width} height={height} />
      <Streaks strength={vstreak} t={-t} width={width} height={height} />
      <SpeedLines strength={lines} seed={Math.floor(t * 12)} width={width} height={height} />
      {bare ? null : <Meter sim={sim} f={f} />}
      {lanes && !bare ? (
        <div style={{ position: "absolute", bottom: 210, left: 28, display: "flex", flexDirection: "column", gap: 12 }}>
          {lanes.map((s, i) => (
            <Pill key={i} color={SHIRT[mode][i]} size={40}>
              {s}
            </Pill>
          ))}
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash), pointerEvents: "none" }} />
      {/* 効果音（ぶつかる強さで音量を変える。しぶき・木くずは小さく） */}
      {sim.events.map((e, i) => {
        const from = at(e.t);
        if (bare) return null;
        if (from < 0) return null;
        if (e.kind === "splash") {
          if (i % 2 === 1 && e.v < 15) return null;
          return (
            <Sequence key={i} from={from} durationInFrames={20}>
              <Audio src={staticFile("sfx/plop.wav")} volume={e.v > 15 ? 0.35 : 0.08} />
            </Sequence>
          );
        }
        if (e.kind === "chip") {
          // 1秒20回は多すぎるので、スローのときだけ鳴らす
          if (speed > 0.3 || i % 2) return null;
          return (
            <Sequence key={i} from={from} durationInFrames={10}>
              <Audio src={staticFile("sfx/tok.wav")} volume={0.12} />
            </Sequence>
          );
        }
        if (e.kind === "impact") {
          return (
            <Sequence key={i} from={from} durationInFrames={50}>
              <Audio src={staticFile(e.v > 12 ? "sfx/impact.wav" : "sfx/thud1.wav")} volume={Math.min(0.45, 0.12 + e.v * 0.012)} />
            </Sequence>
          );
        }
        return (
          <Sequence key={i} from={from} durationInFrames={30}>
            <Audio src={staticFile("sfx/whoosh.wav")} volume={0.3} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
