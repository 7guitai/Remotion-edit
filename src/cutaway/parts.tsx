import React, { useMemo } from "react";
import * as THREE from "three";

// 断面の部品。どれも「手前半分（z > 0）を切り落とした」形で、切り口は z = 0 の面（カメラ側）に向く。
// 単位は自由（ボールペンは 1 = 1mm を見やすく拡大）。y が上。

// 切り口（2枚の台形）を作る：外側の半径 ro、内側の半径 ri（下 b・上 t）、高さ h
const cutFaces = (rob: number, rot: number, rib: number, rit: number, h: number) => {
  const g = new THREE.BufferGeometry();
  const y0 = -h / 2;
  const y1 = h / 2;
  const v: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => v.push(...a, ...b, ...c, ...a, ...c, ...d);
  // 右の切り口（x > 0）と左の切り口（x < 0）
  quad([rib, y0, 0], [rob, y0, 0], [rot, y1, 0], [rit, y1, 0]);
  quad([-rob, y0, 0], [-rib, y0, 0], [-rit, y1, 0], [-rot, y1, 0]);
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  const uv: number[] = [];
  for (let i = 0; i < v.length / 3; i++) uv.push(v[i * 3] * 0.2, v[i * 3 + 1] * 0.2);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};

export type CutShellProps = {
  // 下と上の外側の半径、肉の厚さ（下・上）。厚さ ≥ 半径なら中身のつまった棒（インクなど）
  rBottom: number;
  rTop: number;
  thick: number | [number, number];
  height: number;
  position?: [number, number, number];
  material: THREE.Material;
  cutMaterial?: THREE.Material;
  // 上下のふた（半分の輪）をつけるか
  caps?: boolean;
  segments?: number;
  // 切らずに丸ごと（半透明の外装など）
  whole?: boolean;
};

// 断面パイプ・円すい（thetaLength = π の半円筒＋内側の面＋切り口）
export const CutShell: React.FC<CutShellProps> = ({ rBottom, rTop, thick, height, position, material, cutMaterial, caps = true, segments = 48, whole = false }) => {
  const [tb, tt] = Array.isArray(thick) ? thick : [thick, thick];
  const rib = Math.max(0, rBottom - tb);
  const rit = Math.max(0, rTop - tt);
  const geo = useMemo(() => {
    const ts = whole ? 0 : Math.PI / 2;
    const tl = whole ? Math.PI * 2 : Math.PI;
    const outer = new THREE.CylinderGeometry(rTop, rBottom, height, segments, 1, true, ts, tl);
    const inner = rib > 0 || rit > 0 ? new THREE.CylinderGeometry(rit, rib, height, segments, 1, true, ts, tl) : null;
    const faces = whole ? null : cutFaces(rBottom, rTop, rib, rit, height);
    const capT = caps && !whole ? new THREE.RingGeometry(Math.max(rit, 1e-4), rTop, segments, 1, 0, Math.PI).rotateX(-Math.PI / 2).translate(0, height / 2, 0) : null;
    const capB = caps && !whole ? new THREE.RingGeometry(Math.max(rib, 1e-4), rBottom, segments, 1, Math.PI, Math.PI).rotateX(Math.PI / 2).translate(0, -height / 2, 0) : null;
    return { outer, inner, faces, capT, capB };
  }, [rBottom, rTop, rib, rit, height, segments, caps, whole]);
  const cm = cutMaterial ?? material;
  return (
    <group position={position}>
      <mesh geometry={geo.outer} material={material} />
      {geo.inner ? (
        <mesh geometry={geo.inner}>
          <primitive object={backOf(material)} attach="material" />
        </mesh>
      ) : null}
      {geo.faces ? <mesh geometry={geo.faces} material={cm} /> : null}
      {geo.capT ? <mesh geometry={geo.capT} material={cm} /> : null}
      {geo.capB ? <mesh geometry={geo.capB} material={cm} /> : null}
    </group>
  );
};

// 内側の面は裏から見えるように（同じ素材の BackSide 版）
const backs = new WeakMap<THREE.Material, THREE.Material>();
const backOf = (m: THREE.Material) => {
  let b = backs.get(m);
  if (!b) {
    b = m.clone();
    b.side = THREE.BackSide;
    backs.set(m, b);
  }
  // 透明度などは元の素材にそろえる
  b.opacity = m.opacity;
  b.transparent = m.transparent;
  b.depthWrite = m.depthWrite;
  return b;
};

// ゴムパッキン・O リング：押されると Y がつぶれて横にふくらむ（体積をほぼ保つ）。wear で細く・角がとれる
export const RubberRing: React.FC<{ radius: number; tube: number; squash?: number; wear?: number; position?: [number, number, number]; material: THREE.Material; cut?: boolean }> = ({ radius, tube, squash = 0, wear = 0, position, material, cut = true }) => {
  const sy = 1 - 0.45 * squash;
  const sxz = 1 / Math.sqrt(sy);
  const t = tube * (1 - 0.45 * wear);
  return (
    <group position={position} scale={[1, sy, 1]}>
      <mesh rotation={[Math.PI / 2, 0, cut ? Math.PI : 0]}>
        <torusGeometry args={[radius + (t * (sxz - 1)) / 2, t, 18, 64, cut ? Math.PI : Math.PI * 2]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
};

// ばね（らせん）：length を変えると縮む
export const Spring: React.FC<{ radius: number; wire: number; turns: number; length: number; position?: [number, number, number]; material: THREE.Material }> = ({ radius, wire, turns, length, position, material }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = turns * 40;
    for (let i = 0; i <= n; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.cos(a), (i / n) * length, radius * Math.sin(a)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 8, false);
  }, [radius, wire, turns, length]);
  return <mesh geometry={geo} material={material} position={position} />;
};

// ---- 断面のドーナツ形（タイヤ・チューブ・O リング）----
// 輪は XY 平面（軸は z）。管の奥半分（z ≤ 0）を残し、切り口は z = 0 の輪の帯。
// deform(p, depth) で頂点を毎フレーム動かせる（depth は外側の面からの深さ：外面 0、内面 = 肉の厚さ）。タイヤが地面でつぶれる表現に使う
type TorusParts = { outer: THREE.BufferGeometry; inner: THREE.BufferGeometry | null; faces: THREE.BufferGeometry };
const torusSurface = (R: number, r: number, nu: number, nv: number, depth: number) => {
  const pos: number[] = [];
  const dep: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const u = (i / nu) * Math.PI * 2;
      const v = Math.PI + (j / nv) * Math.PI;
      pos.push((R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v));
      dep.push(depth);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j;
      const b = (i + 1) * (nv + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(pos.map((_, k) => (k % 3 === 2 ? 0 : pos[k] * 0.05)).filter((_, k) => k % 3 !== 2), 2));
  g.setIndex(idx);
  g.userData.base = Float32Array.from(pos);
  g.userData.depth = Float32Array.from(dep);
  return g;
};
const torusFaces = (R: number, r: number, thick: number, nu: number) => {
  const pos: number[] = [];
  const dep: number[] = [];
  const idx: number[] = [];
  const bands: [number, number, number, number][] = thick >= r ? [[R - r, R + r, 0, 0]] : [
    [R + r - thick, R + r, thick, 0],
    [R - r, R - r + thick, 0, thick],
  ];
  for (const [r0, r1, d0, d1] of bands) {
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * Math.PI * 2;
      pos.push(r0 * Math.cos(u), r0 * Math.sin(u), 0, r1 * Math.cos(u), r1 * Math.sin(u), 0);
      // 切り口の深さ：外側の帯は外周が 0、内周（管の内側）が thick。中身のつまった管は外周 0・中心へ深く
      dep.push(thick >= r ? r : d0, d1);
    }
    for (let i = 0; i < nu; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uv: number[] = [];
  for (let k = 0; k < pos.length / 3; k++) uv.push(pos[k * 3] * 0.05, pos[k * 3 + 1] * 0.05);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.userData.base = Float32Array.from(pos);
  g.userData.depth = Float32Array.from(dep);
  return g;
};
const applyDeform = (g: THREE.BufferGeometry, deform?: (p: THREE.Vector3, depth: number) => void) => {
  const base = g.userData.base as Float32Array;
  const dep = g.userData.depth as Float32Array;
  const attr = g.getAttribute("position") as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let k = 0; k < dep.length; k++) {
    p.set(base[k * 3], base[k * 3 + 1], base[k * 3 + 2]);
    if (deform) deform(p, dep[k]);
    attr.setXYZ(k, p.x, p.y, p.z);
  }
  attr.needsUpdate = true;
  g.computeVertexNormals();
};

export const CutTorus: React.FC<{
  R: number;
  r: number;
  thick: number;
  material: THREE.Material;
  cutMaterial?: THREE.Material;
  innerMaterial?: THREE.Material;
  segments?: number;
  tubeSegments?: number;
  deform?: (p: THREE.Vector3, depth: number) => void;
  // deform が変わったことを知らせる値（毎フレーム変える）
  deformKey?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ R, r, thick, material, cutMaterial, innerMaterial, segments = 160, tubeSegments = 20, deform, deformKey = 0, position, rotation }) => {
  const geo = useMemo<TorusParts>(() => {
    const outer = torusSurface(R, r, segments, tubeSegments, 0);
    const inner = thick < r ? torusSurface(R, r - thick, segments, tubeSegments, thick) : null;
    return { outer, inner, faces: torusFaces(R, r, thick, segments) };
  }, [R, r, thick, segments, tubeSegments]);
  useMemo(() => {
    applyDeform(geo.outer, deform);
    if (geo.inner) applyDeform(geo.inner, deform);
    applyDeform(geo.faces, deform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, deformKey]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo.outer} material={material} />
      {geo.inner ? (
        <mesh geometry={geo.inner}>
          <primitive object={backOf(innerMaterial ?? material)} attach="material" />
        </mesh>
      ) : null}
      <mesh geometry={geo.faces} material={cutMaterial ?? material} />
    </group>
  );
};
