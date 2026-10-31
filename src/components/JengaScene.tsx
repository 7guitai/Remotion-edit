import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { JENGA, simulateJenga, JengaResult } from "../sim/jenga";
import { PersonPart } from "./PhysicsScene";
import { fontFamily } from "../theme";

// 人が乗った巨大ジェンガ（たて長・画面いっぱい）。広場に木のブロックの塔、鉄の棒で1本ずつ押し出す
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const SHIRT = "#2f8cff";

const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }, [gl, scene]);
  return null;
};

// 画面のゆれ（大きなブロックが地面に当たった直後ほど大きい）
const shakeAt = (sim: JengaResult, t: number) => {
  let a = 0;
  for (const h of sim.hits) {
    const dt = t - h.frame / sim.fps;
    if (dt >= 0 && dt < 0.5 && h.kind === "block") a = Math.max(a, Math.min(0.12, h.v * 0.012) * (1 - dt / 0.5));
  }
  return a;
};

const Cam: React.FC<{ sim: JengaResult; t: number }> = ({ sim, t }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // ふだんは塔のまわりを ゆっくり回る。最後の1本で少し寄り、崩れたら引いて低い位置から見上げる
  const last = sim.schedule[sim.lastPlan];
  const near = interpolate(t, [last.t1 - 1, last.t1 + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const away = sim.collapse < 0 ? 0 : interpolate(t, [sim.collapse - 0.6, sim.collapse + 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ease = (u: number) => u * u * (3 - 2 * u);
  const a = -0.55 + t * 0.03;
  const r = 18 - 2.5 * ease(near) + 3 * ease(away);
  const h = 5.2 - 0.4 * ease(near) - 2.6 * ease(away);
  const lookY = 4.3 + 0.3 * ease(near) - 1.4 * ease(away);
  const lookX = 3.5 * ease(away);
  const sh = shakeAt(sim, t);
  const sx = sh * Math.sin(t * 71);
  const sy = sh * Math.cos(t * 59);
  camera.position.set(Math.sin(a) * r + lookX * 0.6 + sx, h + sy, Math.cos(a) * r);
  camera.lookAt(lookX, lookY, 0);
  camera.updateProjectionMatrix();
  return null;
};

// 木目のテクスチャ
const useWood = () =>
  useMemo(() => {
    const W = 512;
    const H = 128;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d")!;
    x.fillStyle = "#e7c48f";
    x.fillRect(0, 0, W, H);
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 46; k++) {
      x.strokeStyle = `rgba(${150 + rnd() * 30},${100 + rnd() * 25},${55 + rnd() * 20},${0.18 + rnd() * 0.3})`;
      x.lineWidth = 0.6 + rnd() * 2.2;
      x.beginPath();
      let y = rnd() * H;
      x.moveTo(0, y);
      for (let s = 0; s <= 16; s++) {
        y += (rnd() - 0.5) * 3;
        x.lineTo((s / 16) * W, y);
      }
      x.stroke();
    }
    // ふし
    for (let k = 0; k < 2; k++) {
      const cx = rnd() * W;
      const cy = rnd() * H;
      for (let r = 2; r < 14; r += 3) {
        x.strokeStyle = `rgba(130,85,45,${0.35 - r * 0.02})`;
        x.beginPath();
        x.ellipse(cx, cy, r * 2.2, r * 0.7, 0, 0, Math.PI * 2);
        x.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

// 広場の床（大きな石だたみ）
const useFloor = () =>
  useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const x = c.getContext("2d")!;
    x.fillStyle = "#c9c4bb";
    x.fillRect(0, 0, size, size);
    let seed = 9;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 8;
    const s = size / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const g = 190 + rnd() * 22;
        x.fillStyle = `rgb(${g},${g - 4},${g - 10})`;
        x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      }
    }
    for (let k = 0; k < 14000; k++) {
      const g = 150 + rnd() * 80;
      x.fillStyle = `rgba(${g},${g},${g - 8},0.16)`;
      x.fillRect(rnd() * size, rnd() * size, 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.anisotropy = 8;
    return t;
  }, []);

// 塔が地面に落ちたときの土けむり
const Dust: React.FC<{ sim: JengaResult; t: number; f: number }> = ({ sim, t, f }) => {
  if (sim.land < 0) return null;
  const dt = t - sim.land;
  if (dt < 0 || dt > 4) return null;
  // けむりの中心：落ちたブロックの まん中あたり
  const lf = Math.min(sim.frames - 1, Math.round((sim.land + 0.4) * sim.fps));
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < sim.nb; i++) {
    cx += sim.blocks[(lf * sim.nb + i) * 7];
    cz += sim.blocks[(lf * sim.nb + i) * 7 + 2];
  }
  cx /= sim.nb;
  cz /= sim.nb;
  void f;
  const puffs = Array.from({ length: 34 }, (_, i) => {
    const a = random(`ja${i}`) * Math.PI * 2;
    const sp = 1.5 + random(`js${i}`) * 4;
    const d = (sp * (1 - Math.exp(-dt * 1.6))) / 1.6;
    const r = 0.25 + dt * (0.22 + random(`jr${i}`) * 0.3);
    const along = (random(`jl${i}`) - 0.5) * 6;
    return (
      <mesh key={i} position={[cx + along + Math.cos(a) * d, 0.2 + r * 0.5 + dt * (0.25 + random(`jy${i}`) * 0.5), cz + Math.sin(a) * d]}>
        <sphereGeometry args={[r, 10, 8]} />
        <meshStandardMaterial color="#d9cdb6" transparent opacity={Math.max(0, 0.35 * (1 - dt / 4))} depthWrite={false} roughness={1} />
      </mesh>
    );
  });
  return <group>{puffs}</group>;
};

const Overlay: React.FC<{ sim: JengaResult; t: number; frame: number }> = ({ sim, t, frame }) => {
  // 崩れたときの1本は、ぬけたことにしない（記録＝崩れる前までに ぬけた本数）
  const shown = Math.min(sim.collapse >= 0 ? sim.lastPlan : 99, sim.count[Math.min(sim.frames - 1, Math.max(0, Math.round(t * sim.fps)))]);
  const last = sim.schedule[sim.lastPlan];
  const warn = t > last.t1 - 0.6 && (sim.collapse < 0 || t < sim.collapse + 0.3);
  const crashed = sim.collapse >= 0 && t > sim.collapse + 0.3;
  const pop = (t0: number) => interpolate(t - t0, [0, 0.18, 0.3], [0.6, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 1本ぬけるたびに、数字が ぴょんとはねる
  const lastDone = sim.schedule.findIndex((p, i) => i <= sim.lastPlan && t < p.t2);
  const bumpT = lastDone > 0 ? sim.schedule[lastDone - 1].t2 : lastDone < 0 ? sim.schedule[sim.lastPlan].t2 : -9;
  const bump = interpolate(t - bumpT, [0, 0.12, 0.3], [1, 1.25, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outline = "0 0 2px #000, 0 4px 14px rgba(0,0,0,0.35)";
  const intro = interpolate(frame, [0, 8], [0.85, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ fontFamily, color: "#fff", alignItems: "center" }}>
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", transform: `scale(${intro})` }}>
        <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.12, textShadow: outline, WebkitTextStroke: "3px #1b2a44" }}>
          人が乗った
          <br />
          巨大ジェンガ
        </div>
        <div style={{ marginTop: 18, fontSize: 38, fontWeight: 800, textShadow: outline }}>
          本物の20倍・ブロック1本 約110kg
        </div>
      </div>
      {/* ぬいた本数 */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          padding: "10px 34px",
          borderRadius: 26,
          background: "rgba(20,32,56,0.72)",
          transform: `scale(${bump})`,
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 800 }}>ぬいた数</span>
        <span style={{ fontSize: 96, fontWeight: 900, color: "#ffd84a", fontVariantNumeric: "tabular-nums" }}>{shown}</span>
        <span style={{ fontSize: 44, fontWeight: 800 }}>本</span>
      </div>
      {t < sim.schedule[2].t1 ? (
        <div
          style={{
            position: "absolute",
            bottom: 330,
            padding: "14px 30px",
            borderRadius: 22,
            background: "rgba(20,32,56,0.72)",
            fontSize: 52,
            fontWeight: 900,
            textAlign: "center",
            lineHeight: 1.25,
            transform: `scale(${pop(sim.schedule[0].t1 - 0.4)})`,
          }}
        >
          重さのかかっていない
          <br />
          ゆるいブロックから押し出す
        </div>
      ) : null}
      {warn ? (
        <div
          style={{
            position: "absolute",
            bottom: 330,
            padding: "14px 30px",
            borderRadius: 22,
            background: "rgba(200,30,30,0.85)",
            fontSize: 54,
            fontWeight: 900,
            textAlign: "center",
            lineHeight: 1.25,
            transform: `scale(${pop(last.t1 - 0.6)})`,
          }}
        >
          {sim.lastPlan + 1}本目は
          <br />
          重さのかかったブロック…
        </div>
      ) : null}
      {crashed ? (
        <div style={{ position: "absolute", top: 640, textAlign: "center", transform: `scale(${pop(sim.collapse + 0.3)}) rotate(-4deg)` }}>
          <div style={{ fontSize: 150, fontWeight: 900, color: "#ff4b3a", WebkitTextStroke: "5px #fff", textShadow: "0 8px 22px rgba(0,0,0,0.4)" }}>崩壊！</div>
          <div style={{ fontSize: 56, fontWeight: 900, textShadow: outline, marginTop: 6 }}>記録 {sim.lastPlan}本</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const JengaScene: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sim = useMemo(() => simulateJenga(durationInFrames, fps), [durationInFrames, fps]);
  const f = Math.min(frame, sim.frames - 1);
  const t = f / fps;
  const wood = useWood();
  const floor = useFloor();
  const geoX = useMemo(() => new RoundedBoxGeometry(JENGA.l, JENGA.h, JENGA.w - 0.008, 3, 0.025), []);
  const geoZ = useMemo(() => new RoundedBoxGeometry(JENGA.w - 0.008, JENGA.h, JENGA.l, 3, 0.025), []);
  const mats = useMemo(
    () =>
      sim.tone.map(
        (k) =>
          new THREE.MeshStandardMaterial({
            map: wood,
            color: new THREE.Color().setRGB(1 - k * 0.12, 0.97 - k * 0.14, 0.92 - k * 0.18),
            roughness: 0.62,
          }),
      ),
    [sim, wood],
  );
  const np = sim.parts.length;
  // 効果音：ブロックが落ちた音（速さで音量を変える。小さめ）。崩れて地面に落ちたときは重い音
  const sounds = sim.hits.map((h, i) => {
    const vol = h.kind === "body" ? Math.min(0.22, 0.05 + h.v * 0.02) : Math.min(0.3, 0.3 * Math.min(1, (h.v / 8) ** 1.5));
    const file = h.kind === "body" ? "sfx/thud2.wav" : h.v > 5 ? `sfx/thud${(i % 3) + 1}.wav` : "sfx/clack.wav";
    return (
      <Sequence key={i} from={h.frame} durationInFrames={20}>
        <Audio src={staticFile(file)} volume={vol} />
      </Sequence>
    );
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #7fb6ec 0%, #b9dbf6 55%, #e9f3fb 100%)" }} />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 42, near: 0.1, far: 200 }} gl={{ antialias: true }}>
        <Cam sim={sim} t={t} />
        <Env />
        <fog attach="fog" args={["#cfe3f5", 45, 110]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[6, 14, 8]}
          intensity={2.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-6, 4, -3]} intensity={0.6} color="#ffe2c0" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial map={floor} color="#a8a399" roughness={0.9} envMapIntensity={0.4} />
        </mesh>
        {sim.tone.map((_, i) => {
          const o = (f * sim.nb + i) * 7;
          const level = Math.floor(i / 3);
          return (
            <mesh
              key={i}
              geometry={level % 2 === 0 ? geoX : geoZ}
              material={mats[i]}
              position={[sim.blocks[o], sim.blocks[o + 1], sim.blocks[o + 2]]}
              quaternion={[sim.blocks[o + 3], sim.blocks[o + 4], sim.blocks[o + 5], sim.blocks[o + 6]]}
              castShadow
              receiveShadow
            />
          );
        })}
        {/* 押し棒（鉄）。後ろに赤い持ち手 */}
        <group
          position={[sim.rod[f * 7], sim.rod[f * 7 + 1], sim.rod[f * 7 + 2]]}
          quaternion={[sim.rod[f * 7 + 3], sim.rod[f * 7 + 4], sim.rod[f * 7 + 5], sim.rod[f * 7 + 6]]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[JENGA.rodR, JENGA.rodR, JENGA.rodHalf * 2, 24]} />
            <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
        {sim.parts.map((p, i) => {
          const o = (f * np + i) * 7;
          const color = p.look === "shirt" ? SHIRT : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
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
        <Dust sim={sim} t={t} f={f} />
      </ThreeCanvas>
      <Overlay sim={sim} t={t} frame={frame} />
      {sounds}
      {sim.land >= 0 ? (
        <Sequence from={Math.round(sim.land * fps)} durationInFrames={60}>
          <Audio src={staticFile("sfx/impact.wav")} volume={0.42} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
