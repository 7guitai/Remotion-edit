import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { simulateSlime, SLIME } from "../sim/slime";
import { PersonPart } from "./PhysicsScene";

// スライムの3DCG（たて長・画面いっぱい）。大理石の台の上に人が立ち、上かららせん状のスライムが落ちてくる
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const SHIRT = "#ff7a2f";

// スライムの表面を作る範囲（中心と、半分の大きさ）
const BOX = { cx: 0, cy: 1.7, cz: 0, half: 2.0 };

const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }, [gl, scene]);
  return null;
};

const Cam: React.FC<{ t: number }> = ({ t }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // ゆっくり回りこむ
  const a = 0.35 + t * 0.06;
  camera.position.set(Math.sin(a) * 4.9, 2.9, Math.cos(a) * 4.9);
  camera.lookAt(0, 1.25, 0);
  camera.updateProjectionMatrix();
  return null;
};

const useMarble = () =>
  useMemo(() => {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const x = c.getContext("2d")!;
    x.fillStyle = "#b8b4ae";
    x.fillRect(0, 0, size, size);
    // 大理石の すじ
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 70; k++) {
      x.strokeStyle = `rgba(${60 + rnd() * 60},${58 + rnd() * 50},${55 + rnd() * 50},${0.15 + rnd() * 0.35})`;
      x.lineWidth = 1 + rnd() * 5;
      x.beginPath();
      let px = rnd() * size;
      let py = rnd() * size;
      x.moveTo(px, py);
      for (let s = 0; s < 14; s++) {
        px += (rnd() - 0.3) * 60;
        py += (rnd() - 0.5) * 40;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    for (let k = 0; k < 9000; k++) {
      const g = 150 + rnd() * 70;
      x.fillStyle = `rgba(${g},${g},${g - 6},0.18)`;
      x.fillRect(rnd() * size, rnd() * size, 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

const Slime: React.FC<{ pos: Float32Array; n: number; f: number }> = ({ pos, n, f }) => {
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#16a80a",
        emissive: "#0b4a02",
        emissiveIntensity: 0.35,
        roughness: 0.06,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.93,
        envMapIntensity: 1.1,
        sheen: 0.3,
      }),
    [],
  );
  const mc = useMemo(() => {
    const m = new MarchingCubes(140, mat, false, false, 300000);
    m.isolation = 60;
    m.position.set(BOX.cx, BOX.cy, BOX.cz);
    m.scale.set(BOX.half, BOX.half, BOX.half);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [mat]);
  mc.reset();
  const o = f * n * 3;
  for (let i = 0; i < n; i++) {
    const x = pos[o + i * 3];
    const y = pos[o + i * 3 + 1];
    const z = pos[o + i * 3 + 2];
    if (y < -0.2) continue;
    const bx = (x - BOX.cx) / (2 * BOX.half) + 0.5;
    const by = (y - BOX.cy) / (2 * BOX.half) + 0.5;
    const bz = (z - BOX.cz) / (2 * BOX.half) + 0.5;
    if (bx < 0.02 || bx > 0.98 || by < 0.02 || by > 0.98 || bz < 0.02 || bz > 0.98) continue;
    mc.addBall(bx, by, bz, 0.0024, 12);
  }
  mc.update();
  return <primitive object={mc} />;
};

export const SlimeScene: React.FC<{ visc: number; width: number; height: number; offset?: number }> = ({ visc, width, height, offset = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sim = useMemo(() => simulateSlime(visc, durationInFrames + offset, fps), [visc, durationInFrames, fps, offset]);
  const f = Math.min(frame + offset, sim.frames - 1);
  const marble = useMarble();
  const np = sim.parts.length;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, #f3d2b0 0%, #e6b48a 55%, #c98e64 100%)" }} />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 42, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <Cam t={f / fps} />
        <Env />
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 7, 4]} intensity={2.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-bias={-0.0005} />
        <directionalLight position={[-4, 3, -2]} intensity={0.8} color="#ffd8b0" />
        {/* 大理石の台 */}
        <mesh position={[0, -1.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[SLIME.half * 2, 3.2, SLIME.half * 2]} />
          <meshPhysicalMaterial map={marble} roughness={0.22} clearcoat={0.6} clearcoatRoughness={0.15} />
        </mesh>
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
        <Slime pos={sim.pos} n={sim.n} f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
