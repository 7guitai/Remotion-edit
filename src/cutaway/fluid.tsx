import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";

// 流体の2段階の見せ方
//  1) 物理パーティクル：しずく（重力＋床ではね返り＋べちゃっと広がる）、すき間からにじみ出すしずく、気泡
//  2) 論理ストリーム：経路を示す色つきリボンと、その上を流れる白い矢印

export const STREAM = { hot: "#ef4444", cold: "#3b82f6", air: "#ef4444", ink: "#3b82f6" };

// ---- しずく（噴き出し・飛び散り）----
export type DropEmitter = {
  seed: string;
  origin: [number, number, number];
  t0: number; // 出はじめ
  t1: number; // 出おわり
  rate: number; // 1秒あたりの数
  vel: [number, number, number]; // 平均の速さ
  spread: number; // 速さのばらつき
  gravity: number; // 下向きの加速度
  floorY: number;
  size: number;
  restitution?: number;
  life?: number;
};

// 時刻 t における、1つのしずくの位置（1回はね返って、2回めで床にべちゃっと広がる）
const dropAt = (e: DropEmitter, born: number, k: number, t: number) => {
  const a = t - born;
  const vx = e.vel[0] + (random(`${e.seed}x${k}`) - 0.5) * e.spread;
  const vy = e.vel[1] + (random(`${e.seed}y${k}`) - 0.5) * e.spread;
  const vz = e.vel[2] + (random(`${e.seed}z${k}`) - 0.5) * e.spread * 0.5;
  const g = e.gravity;
  const y0 = e.origin[1] - e.floorY;
  // 床に着く時間
  const hit = (vy + Math.sqrt(vy * vy + 2 * g * y0)) / g;
  const r = e.size * (0.6 + 0.8 * random(`${e.seed}s${k}`));
  if (a < hit) return { p: [e.origin[0] + vx * a, e.origin[1] + vy * a - 0.5 * g * a * a, e.origin[2] + vz * a] as const, r, splat: 0 };
  const vyHit = vy - g * hit;
  const ev = -vyHit * (e.restitution ?? 0.3);
  const b = a - hit;
  const hit2 = (2 * ev) / g;
  const x1 = e.origin[0] + vx * hit;
  const z1 = e.origin[2] + vz * hit;
  if (b < hit2) return { p: [x1 + vx * 0.4 * b, e.floorY + ev * b - 0.5 * g * b * b, z1 + vz * 0.4 * b] as const, r: r * 0.8, splat: 0 };
  return { p: [x1 + vx * 0.4 * hit2, e.floorY, z1 + vz * 0.4 * hit2] as const, r, splat: Math.min(1, (b - hit2) * 4) };
};

export const Drops: React.FC<{ e: DropEmitter; t: number; material: THREE.Material }> = ({ e, t, material }) => {
  const n = Math.floor((Math.min(t, e.t1) - e.t0) * e.rate);
  if (n <= 0) return null;
  const items: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const born = e.t0 + k / e.rate;
    if (t - born > (e.life ?? 99)) continue;
    const d = dropAt(e, born, k, t);
    items.push(
      d.splat > 0 ? (
        <mesh key={k} position={[d.p[0], d.p[1] + 0.01, d.p[2]]} scale={[1 + 1.6 * d.splat, 0.18, 1 + 1.6 * d.splat]} material={material}>
          <sphereGeometry args={[d.r, 16, 10]} />
        </mesh>
      ) : (
        <mesh key={k} position={d.p as unknown as [number, number, number]} scale={[1, 1.25, 1]} material={material}>
          <sphereGeometry args={[d.r, 16, 12]} />
        </mesh>
      ),
    );
  }
  return <group>{items}</group>;
};

// ---- すき間からにじみ出すしずく：ふくらむ → 表面をつたって下る → 落ちる ----
export type Seep = { seed: string; at: [number, number, number]; t0: number; period: number; size: number; slide: [number, number, number]; slideTime: number; gravity: number; floorY: number };
export const SeepDrops: React.FC<{ s: Seep; t: number; material: THREE.Material; count?: number }> = ({ s, t, material, count = 6 }) => {
  const items: React.ReactNode[] = [];
  for (let k = 0; k < count; k++) {
    const born = s.t0 + k * s.period * (0.8 + 0.4 * random(`${s.seed}${k}`));
    const a = t - born;
    if (a < 0) continue;
    const grow = s.period * 0.9;
    let p: [number, number, number];
    let r = s.size;
    let sy = 1;
    if (a < grow) {
      // じわじわふくらむ
      r = s.size * Math.cbrt(a / grow);
      p = [...s.at];
    } else if (a < grow + s.slideTime) {
      const u = (a - grow) / s.slideTime;
      p = [s.at[0] + s.slide[0] * u * u, s.at[1] + s.slide[1] * u * u, s.at[2] + s.slide[2] * u * u];
      sy = 1.3;
    } else {
      const f = a - grow - s.slideTime;
      const top = s.at[1] + s.slide[1];
      const y = top - 0.5 * s.gravity * f * f;
      if (y <= s.floorY) {
        const spl = Math.min(1, (s.floorY - y) / (s.gravity * 0.15) + 0.2);
        items.push(
          <mesh key={k} position={[s.at[0] + s.slide[0], s.floorY + 0.01, s.at[2] + s.slide[2]]} scale={[1 + 1.8 * spl, 0.15, 1 + 1.8 * spl]} material={material}>
            <sphereGeometry args={[s.size, 16, 10]} />
          </mesh>,
        );
        continue;
      }
      p = [s.at[0] + s.slide[0], y, s.at[2] + s.slide[2]];
      sy = 1.4;
    }
    items.push(
      <mesh key={k} position={p} scale={[1, sy, 1]} material={material}>
        <sphereGeometry args={[Math.max(0.001, r), 16, 12]} />
      </mesh>,
    );
  }
  return <group>{items}</group>;
};

// ---- 気泡：経路にそって、ゆらゆら進む ----
export const Bubbles: React.FC<{ seed: string; path: THREE.Curve<THREE.Vector3>; t: number; t0: number; count: number; speed: number; size: number; material: THREE.Material; wobble?: number }> = ({ seed, path, t, t0, count, speed, size, material, wobble = 0.15 }) => {
  if (t < t0) return null;
  const items: React.ReactNode[] = [];
  for (let k = 0; k < count; k++) {
    const u = (random(`${seed}${k}`) + (t - t0) * speed) % 1;
    const start = random(`${seed}st${k}`) * 0.8;
    if ((t - t0) * speed < start) continue;
    const p = path.getPointAt(u);
    const w = Math.sin((t * 6 + k) * 1.3) * wobble;
    const r = size * (0.5 + random(`${seed}r${k}`));
    items.push(
      <mesh key={k} position={[p.x + w, p.y, p.z + 0.2]} material={material}>
        <sphereGeometry args={[r, 14, 10]} />
      </mesh>,
    );
  }
  return <group>{items}</group>;
};

// ---- 論理ストリーム：色リボン＋白い矢印 ----
export const FlowStream: React.FC<{ points: [number, number, number][]; color: string; width: number; t: number; speed?: number; active?: number; arrows?: number; blocked?: number }> = ({ points, color, width, t, speed = 0.5, active = 1, arrows, blocked = 1 }) => {
  const { curve, tube, len } = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return { curve: c, tube: new THREE.TubeGeometry(c, 96, width, 10, false), len: c.getLength() };
  }, [points, width]);
  if (active <= 0.01) return null;
  const n = arrows ?? Math.max(2, Math.round(len / (width * 9)));
  const items: React.ReactNode[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < n; k++) {
    // blocked < 1：矢印は経路の途中（blocked の位置）で止まって消える
    const u = (k / n + (t * speed * width * 9) / len) % 1;
    if (u > blocked) continue;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const q = new THREE.Quaternion().setFromUnitVectors(up, tan);
    const fade = Math.min(1, u * 8, (blocked - u) * 8, (1 - u) * 8);
    items.push(
      <mesh key={k} position={[p.x, p.y, p.z + width * 1.05]} quaternion={q} renderOrder={20}>
        <coneGeometry args={[width * 1.5, width * 2.6, 3]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95 * fade * active} depthWrite={false} />
      </mesh>,
    );
  }
  return (
    <group>
      <mesh geometry={tube} renderOrder={19}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.6 * active} roughness={0.4} depthWrite={false} />
      </mesh>
      {items}
    </group>
  );
};

// しずく・インク用の素材（半透明・つやあり）
export const liquidMat = (color: string, opacity = 0.75) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.05 });
export const bubbleMat = () => new THREE.MeshPhysicalMaterial({ color: "#e6f2ff", roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false });
