import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { simulateStairs, STAIRS, StairsMode, StairsResult, stepTop } from "../sim/stairs";
import { PersonPart } from "./PhysicsScene";
import { Pill, SpeedLines } from "./FleaScene";
import { fontFamily } from "../theme";

// 【検証】階段でつまずいたら、上りと下り どっちが危ない？ の場面（横から見た家の階段）
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
export const STAIRS_COLOR: Record<StairsMode, string> = { up: "#2fae5a", down: "#ff4a3d", rail: "#2f8bff" };
export const STAIRS_LABEL: Record<StairsMode, string> = { up: "上りでつまずく", down: "下りで踏み外す", rail: "手すりを持って下りる" };

const S = STAIRS;

const at = (sim: StairsResult, f: number, name: string) => {
  const i = sim.parts.findIndex((p) => p.name === name);
  const o = (f * sim.parts.length + i) * 7;
  return [sim.doll[o], sim.doll[o + 1], sim.doll[o + 2]] as [number, number, number];
};

const shakeAt = (sim: StairsResult, t: number) => {
  let a = 0;
  for (const h of sim.hits) {
    const d = t - h.t;
    if (d >= 0 && d < 0.6) a = Math.max(a, Math.min(0.06, h.v * 0.008) * Math.exp(-d * 7));
  }
  if (sim.headHitT >= 0) {
    const d = t - sim.headHitT;
    if (d >= 0 && d < 0.8) a = Math.max(a, 0.12 * Math.exp(-d * 5));
  }
  return a;
};

const Cam: React.FC<{ sim: StairsResult; f: number; aspect: number }> = ({ sim, f, aspect }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // 少しおくれて追いかける（体の位置を数フレームならす）
  let px = 0;
  let py = 0;
  let n = 0;
  for (let k = Math.max(0, f - 6); k <= f; k++) {
    const p = at(sim, k, "pelvis");
    px += p[0];
    py += p[1];
    n++;
  }
  px /= n;
  py /= n;
  const t = f / sim.fps;
  const sh = shakeAt(sim, t);
  // 縦長の画面では、階段の上下が入るように少し引く
  const d = aspect < 1.2 ? 5.6 : 4.4;
  const dir = sim.mode === "up" ? 1 : -1;
  camera.position.set(px + dir * 0.5 + sh * Math.sin(t * 77), py + 0.35 + sh * Math.cos(t * 63), d);
  camera.lookAt(px + dir * 0.3, py - 0.35, 0);
  camera.updateProjectionMatrix();
  return null;
};

// 壁紙（細いたてじま）と腰板
const useWall = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f3ead9";
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? "#efe3cf" : "#f6eedf";
      x.fillRect(i * 16, 0, 8, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 3);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

const House: React.FC<{ sim: StairsResult }> = ({ sim }) => {
  const wall = useWall();
  const top = stepTop(S.n);
  const W = S.width;
  const slope = S.rise / S.run;
  // 手すり（rail のときだけ）：つかんだ点を通り、階段と同じかたむき
  const g = sim.grip;
  const railLen = (S.n * S.run + 0.6) / Math.cos(Math.atan(slope));
  const railMidX = (S.n * S.run) / 2;
  const railMidY = g ? g[1] + (railMidX - g[0]) * slope : 0;
  return (
    <group>
      {/* 1階の床（フローリング）と2階の床 */}
      <mesh position={[-3, -0.05, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 4]} />
        <meshStandardMaterial color="#b98a5a" roughness={0.7} />
      </mesh>
      <mesh position={[S.n * S.run + 1.5, top / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[3, top, W]} />
        <meshStandardMaterial color="#e9dcc6" roughness={0.9} />
      </mesh>
      <mesh position={[S.n * S.run + 1.5, top + 0.01, 0]} receiveShadow>
        <boxGeometry args={[3, 0.02, W]} />
        <meshStandardMaterial color="#b98a5a" roughness={0.7} />
      </mesh>
      {/* 段（ふみ板は木の色、角は少し濃い色の すべり止め） */}
      {Array.from({ length: S.n }, (_, i) => {
        const h = stepTop(i + 1);
        const x = (i + 0.5) * S.run;
        return (
          <group key={i}>
            <mesh position={[x, h / 2 - 0.02, 0]} receiveShadow castShadow>
              <boxGeometry args={[S.run, h - 0.04, W]} />
              <meshStandardMaterial color="#efe6d6" roughness={0.9} />
            </mesh>
            <mesh position={[x + 0.01, h - 0.02, 0]} receiveShadow castShadow>
              <boxGeometry args={[S.run + 0.03, 0.04, W]} />
              <meshStandardMaterial color="#c4925e" roughness={0.6} />
            </mesh>
            <mesh position={[x + (S.run + 0.03) / 2 - 0.02, h - 0.025, 0]}>
              <boxGeometry args={[0.035, 0.045, W + 0.002]} />
              <meshStandardMaterial color="#7a5232" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* 奥の壁と腰板 */}
      <mesh position={[1.5, 3, -W / 2 - 0.05]} receiveShadow>
        <boxGeometry args={[16, 8, 0.1]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      {/* 階段の横の壁（ささら） */}
      <mesh position={[railMidX, (top + 0) / 2 - 0.05, -W / 2 - 0.02]} rotation={[0, 0, Math.atan(slope)]}>
        <boxGeometry args={[railLen, 0.3, 0.04]} />
        <meshStandardMaterial color="#c4925e" roughness={0.6} />
      </mesh>
      {/* 1階の廊下：額縁と観葉植物（家の中らしさ） */}
      <mesh position={[-2.2, 1.5, -W / 2 + 0.01]}>
        <boxGeometry args={[0.8, 0.6, 0.03]} />
        <meshStandardMaterial color="#6b4a2e" />
      </mesh>
      <mesh position={[-2.2, 1.5, -W / 2 + 0.03]}>
        <boxGeometry args={[0.66, 0.46, 0.01]} />
        <meshStandardMaterial color="#9cc7e0" />
      </mesh>
      <mesh position={[-1.2, 0.2, -0.2]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.4, 16]} />
        <meshStandardMaterial color="#d7d2c8" />
      </mesh>
      <mesh position={[-1.2, 0.7, -0.2]} castShadow>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#4f8f3a" roughness={0.9} />
      </mesh>
      {g ? (
        <group>
          <mesh position={[railMidX, railMidY, g[2]]} rotation={[0, 0, Math.atan(slope)]} castShadow>
            <boxGeometry args={[railLen, 0.05, 0.05]} />
            <meshStandardMaterial color="#8a5a32" roughness={0.4} />
          </mesh>
          {[2, 6, 10, 13].map((i) => {
            const x = (i - 0.5) * S.run;
            const y = g[1] + (x - g[0]) * slope;
            return (
              <mesh key={i} position={[x, y, g[2] - 0.06]}>
                <boxGeometry args={[0.05, 0.05, 0.1]} />
                <meshStandardMaterial color="#b0b0b0" metalness={0.6} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ) : null}
    </group>
  );
};

// ぶつかったところの、ちり・衝撃の輪
const Dust: React.FC<{ sim: StairsResult; t: number; f: number }> = ({ sim, t, f }) => {
  const big = sim.hits.filter((h) => h.v > 2.5);
  return (
    <group>
      {big.map((h, k) => {
        const d = t - h.t;
        if (d < 0 || d > 1.2) return null;
        const hf = Math.min(sim.frames - 1, Math.round(h.t * sim.fps));
        const p = at(sim, hf, h.part);
        return (
          <group key={k} position={p}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = random(`sd${k}-${i}`) * Math.PI * 2;
              const r = 0.04 + d * 0.2;
              const s = 0.4 + d * 0.8 * random(`ss${k}-${i}`);
              return (
                <mesh key={i} position={[Math.cos(a) * s * 0.4, Math.abs(Math.sin(a)) * s * 0.25, Math.sin(a) * 0.2]}>
                  <sphereGeometry args={[r, 8, 6]} />
                  <meshStandardMaterial color="#e8e2d6" transparent opacity={Math.max(0, 0.5 * (1 - d / 1.2))} depthWrite={false} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {f >= 0 ? null : null}
    </group>
  );
};

export const StairsScene: React.FC<{ mode: StairsMode; width: number; height: number; offset?: number; speed?: number }> = ({ mode, width, height, offset = 0, speed = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sim = useMemo(() => simulateStairs(mode, fps), [mode, fps]);
  const f = Math.max(0, Math.min(Math.floor(offset + frame * speed), sim.frames - 1));
  const t = f / fps;
  const tAt = (sec: number) => Math.round((sec * fps - offset) / speed);
  const hh = sim.headHitT;
  const flash = hh >= 0 ? interpolate(t - hh, [0, 0.02, 0.3], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const lines = Math.max(
    hh >= 0 ? interpolate(t - hh, [0, 0.04, 0.9], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
    // 足をすべらせた瞬間（つまずいた瞬間）
    interpolate(t - S.trip, [0, 0.05, 0.5], [0, mode === "up" ? 0.5 : 0.75, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const boomD = hh >= 0 ? t - hh : -1;
  const boom = boomD >= 0 && boomD < 1.5 ? interpolate(boomD, [0, 0.1, 0.2], [2.4, 0.9, 1], { extrapolateRight: "clamp" }) : 0;
  const tripD = t - S.trip;
  const tripText = tripD >= 0 && tripD < 0.9 ? interpolate(tripD, [0, 0.08, 0.16], [2.0, 0.92, 1], { extrapolateRight: "clamp" }) : 0;
  const shownHead = hh >= 0 && t >= hh ? sim.headHit : 0;
  const color = STAIRS_COLOR[mode];
  const wide = width > height * 1.3;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#f3ead9" }} />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 42, near: 0.05, far: 100 }} gl={{ antialias: true }}>
        <Cam sim={sim} f={f} aspect={width / height} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#fff6e8", "#8a6a4a", 0.45]} />
        <directionalLight
          position={[2, 8, 5]}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-6}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-2}
          shadow-bias={-0.0004}
        />
        <House sim={sim} />
        {sim.parts.map((p, i) => {
          const o = (f * sim.parts.length + i) * 7;
          const c = p.look === "shirt" ? color : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
          return (
            <PersonPart
              key={i}
              part={p.name}
              size={p.size}
              color={c}
              pos={[sim.doll[o], sim.doll[o + 1], sim.doll[o + 2]]}
              quat={[sim.doll[o + 3], sim.doll[o + 4], sim.doll[o + 5], sim.doll[o + 6]]}
            />
          );
        })}
        <Dust sim={sim} t={t} f={f} />
      </ThreeCanvas>
      <SpeedLines strength={lines * 0.8} seed={Math.floor(t * 12)} width={width} height={height} />
      <div style={{ position: "absolute", top: 24, left: 24, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
        <Pill color={color} size={wide ? 44 : 50}>{STAIRS_LABEL[mode]}</Pill>
      </div>
      <div style={{ position: "absolute", ...(wide ? { bottom: 210, left: 24, alignItems: "flex-start" } : { top: 24, right: 24, alignItems: "flex-end" }), display: "flex", flexDirection: "column", gap: 10 }}>
        <Pill color="#ffd23a" size={42}>{`落ちた段数 ${sim.steps[f]}段`}</Pill>
        <Pill color={shownHead > 0 ? "#ff4a3d" : "#8a8f99"} size={42}>{shownHead > 0 ? `頭を打つ 時速${Math.round(shownHead)}km` : "頭は打っていない"}</Pill>
      </div>
      {tripText > 0 ? (
        <div
          style={{
            position: "absolute",
            top: height * 0.2,
            width: "100%",
            textAlign: "center",
            fontFamily,
            fontWeight: 900,
            fontSize: 120,
            color: "#fff",
            WebkitTextStroke: "9px #1a1a1a",
            paintOrder: "stroke fill",
            transform: `scale(${tripText}) rotate(-6deg)`,
            opacity: interpolate(tripD, [0.6, 0.9], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {mode === "up" ? "ガッ！" : "ズルッ！"}
        </div>
      ) : null}
      {boom > 0 ? (
        <div
          style={{
            position: "absolute",
            top: height * 0.22,
            width: "100%",
            textAlign: "center",
            fontFamily,
            fontWeight: 900,
            fontSize: 160,
            color: "#ffe23a",
            WebkitTextStroke: "10px #1a1a1a",
            paintOrder: "stroke fill",
            transform: `scale(${boom}) rotate(-8deg)`,
            opacity: interpolate(boomD, [1.1, 1.5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          ゴンッ！
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash), pointerEvents: "none" }} />
      {/* 効果音：ぶつかるたびに小さく（強さに合わせて）、頭を打った瞬間だけ少し大きく */}
      {sim.hits.map((h, k) => {
        const from = tAt(h.t);
        if (from < 0 || h.v < 1.5) return null;
        return (
          <Sequence key={k} from={from} durationInFrames={30}>
            <Audio src={staticFile(`sfx/thud${(k % 3) + 1}.wav`)} volume={Math.min(0.32, 0.04 + h.v * 0.04)} />
          </Sequence>
        );
      })}
      {hh >= 0 && tAt(hh) >= 0 ? (
        <Sequence from={tAt(hh)} durationInFrames={45}>
          <Audio src={staticFile("sfx/impact.wav")} volume={0.32} />
        </Sequence>
      ) : null}
      {tAt(S.trip) >= 0 ? (
        <Sequence from={tAt(S.trip)} durationInFrames={30}>
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.18} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
