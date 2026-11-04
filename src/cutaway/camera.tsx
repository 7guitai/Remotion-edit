import React from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// マクロズームのカメラ。キー（その時刻に向かう目標：見る点・距離・向き・画角）を、イージングでなめらかにつなぐ。
// 弱点を指摘するときは dist を小さく（超マクロ）、「そこで発想を変えた」で dist を大きく（全体を見せる）。
export type CamKey = {
  t: number; // 動きはじめる時刻（秒）
  look: [number, number, number];
  dist: number;
  // 水平の角度（0 = 正面 +z）と、見下ろす角度（ラジアン）
  az?: number;
  el?: number;
  fov?: number;
  dur?: number; // 移るのにかける秒数
};

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export const camAt = (keys: CamKey[], t: number) => {
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (t >= keys[k].t) i = k;
  const cur = keys[i];
  const prev = keys[Math.max(0, i - 1)];
  const u = i === 0 ? 1 : easeInOut(Math.min(1, (t - cur.t) / (cur.dur ?? 1.1)));
  // 距離は対数でつなぐ（大きく寄る・引くときも速さが自然）
  const dist = Math.exp(lerp(Math.log(prev.dist), Math.log(cur.dist), u));
  const look = prev.look.map((v, k) => lerp(v, cur.look[k], u)) as [number, number, number];
  const az = lerp(prev.az ?? 0, cur.az ?? 0, u);
  const el = lerp(prev.el ?? 0.12, cur.el ?? 0.12, u);
  const fov = lerp(prev.fov ?? 38, cur.fov ?? 38, u);
  return { dist, look, az, el, fov };
};

export const CameraRig: React.FC<{ keys: CamKey[]; t: number; drift?: number }> = ({ keys, t, drift = 0.03 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = camAt(keys, t);
  // ゆっくり回りこむ（止まって見えないように）
  const az = c.az + Math.sin(t * 0.35) * drift;
  // 字幕（画面の60%）に重ならないよう、見る点を画面の少し上に出す（カメラごと下へずらす）
  const lift = c.dist * Math.tan(((c.fov * Math.PI) / 180) / 2) * 0.28;
  const look: [number, number, number] = [c.look[0], c.look[1] - lift, c.look[2]];
  camera.position.set(look[0] + c.dist * Math.cos(c.el) * Math.sin(az), look[1] + c.dist * Math.sin(c.el), look[2] + c.dist * Math.cos(c.el) * Math.cos(az));
  camera.fov = c.fov;
  camera.near = Math.max(0.01, c.dist * 0.01);
  camera.far = c.dist * 40 + 200;
  camera.lookAt(...look);
  camera.updateProjectionMatrix();
  return null;
};
