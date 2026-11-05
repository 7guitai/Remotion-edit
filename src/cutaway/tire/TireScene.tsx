import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { CutTorus } from "../parts";
import { Drops, FlowStream, bubbleMat, liquidMat, STREAM } from "../fluid";
import { mat } from "../materials";

// 自転車タイヤの4世代（単位 cm。車輪は XY 平面、地面は y = GROUND、右へ走る）
// 0: ゴムのかたまり  1: 空気入り（チューブ）  2: チューブレス＋シーラント  3: 空気のいらないタイヤ（樹脂のスポーク）
export type TireProps = { t: number; starts: number[] };

const sm = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const ease = (x: number) => sm(0, 1, x);

const RC = 32; // タイヤの管の中心の半径
const TR = 3.4; // 管の太さ（半径）
const OUT = RC + TR; // 外周の半径
const GROUND = -OUT + 0.6;
const SPEED = 120; // cm/s

// 走っている時間：[ビート, 何秒後から, 何秒後まで（-1 は最後まで）]
const ROLL: Record<number, [number, number, number][]> = {
  0: [
    [0, 0, -1],
    [1, 0, -1],
    [2, 0, -1],
    [3, 0, -1],
  ],
  1: [
    [4, 0, -1],
    [5, 0, -1],
    [6, 0, -1],
  ],
  2: [
    [9, 0, -1],
    [13, 0, -1],
  ],
  3: [
    [14, 0, -1],
    [15, 0, -1],
    [16, 0, 0.3],
    [17, 0, -1],
    [18, 0, -1],
  ],
};
export const rolled = (g: number, t: number, starts: number[]) => {
  let w = 0;
  for (const [b, a0, a1] of ROLL[g]) {
    const s = starts[b] + a0;
    const e = a1 < 0 ? (starts[b + 1] ?? s + 4) : starts[b] + a1;
    w += Math.max(0, Math.min(t, e) - s);
  }
  return w * SPEED;
};
export const rollIntervals = (starts: number[]) =>
  Object.values(ROLL)
    .flat()
    .map(([b, a0, a1]) => [starts[b] + a0, a1 < 0 ? (starts[b + 1] ?? starts[b] + 4) : starts[b] + a1] as [number, number]);

// 道のデコボコ（右へ走るので、道は左へ流れる）。x は世界の座標
const BUMP_GAP = 75;
const BUMP_H = 2.4;
const BUMP_W = 8;
export const bumpAt = (x: number, s: number) => {
  const u = (((x + s) % BUMP_GAP) + BUMP_GAP) % BUMP_GAP - BUMP_GAP / 2;
  return Math.abs(u) < BUMP_W / 2 ? BUMP_H * Math.cos((Math.PI * u) / BUMP_W) ** 2 : 0;
};

const rubber = () => mat("rubber", { color: "#0b0b0c", roughness: 0.75 }, "tire");
const rubberCut = () => mat("rubberCut", { color: "#101012" }, "tireCut");
const tube = () => mat("rubber", { color: "#3a2f2a", roughness: 0.8 }, "tube");
const resin = () => mat("ceramic", { color: "#2f7ff0", roughness: 0.3, clearcoat: 0.7, transparent: true, opacity: 0.9 }, "resin");
const sealM = (() => {
  let m: THREE.Material | null = null;
  return () => (m ??= liquidMat("#f3f1e6", 0.95));
})();
const bubM = (() => {
  let m: THREE.Material | null = null;
  return () => (m ??= bubbleMat());
})();

// 道とデコボコ
const Road: React.FC<{ s: number }> = ({ s }) => {
  const items: React.ReactNode[] = [];
  for (let k = -4; k <= 4; k++) {
    const x = k * BUMP_GAP - (s % BUMP_GAP);
    items.push(
      <mesh key={k} position={[x, GROUND, -9.85]} rotation={[Math.PI / 2, 0, 0]} scale={[BUMP_W / 2, 1, BUMP_H]}>
        <cylinderGeometry args={[1, 1, 20.3, 24, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.95} />
      </mesh>,
    );
    // 白い線（流れが見えるように）
    items.push(
      <mesh key={`l${k}`} position={[x + BUMP_GAP / 2, GROUND + 0.02, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 1.2]} />
        <meshStandardMaterial color="#d9d9d4" roughness={0.8} />
      </mesh>,
    );
  }
  return (
    <group>
      {/* 道は奥側だけ（手前の面が断面の手前に来ないように、z = 0.3 まで） */}
      <mesh position={[0, GROUND - 3, -10]}>
        <boxGeometry args={[340, 6, 20.6]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.95} />
      </mesh>
      {items}
    </group>
  );
};

// ホイール（ハブ・針金のスポーク・リム）とフォーク
const Wheel: React.FC<{ angle: number; rimR?: number }> = ({ angle, rimR = 28.5 }) => {
  const spokes = useMemo(() => Array.from({ length: 32 }, (_, k) => (k / 32) * Math.PI * 2), []);
  return (
    <group>
      <group rotation={[0, 0, -angle]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mat("chrome")}>
          <cylinderGeometry args={[2.4, 2.4, 9, 32]} />
        </mesh>
        {spokes.map((a, k) => {
          const L = rimR - 2.5;
          return (
            <mesh key={k} position={[Math.cos(a) * (2.4 + L / 2), Math.sin(a) * (2.4 + L / 2), (k % 2 ? -1 : -2.2)]} rotation={[0, 0, a - Math.PI / 2]} material={mat("chrome")}>
              <cylinderGeometry args={[0.16, 0.16, L, 6]} />
            </mesh>
          );
        })}
        {/* バルブ（回っているのが分かる目印） */}
        <mesh position={[0, -(rimR - 2.5), -0.6]} material={mat("brass")}>
          <cylinderGeometry args={[0.45, 0.45, 4, 12]} />
        </mesh>
      </group>
      <CutTorus R={rimR} r={1.4} thick={0.45} material={mat("chrome", { roughness: 0.2 }, "rim")} cutMaterial={mat("chromeCut")} />
      {/* フォーク（上下の揺れが見えるように） */}
      <mesh position={[0, 26, -6]} rotation={[0, 0, 0.12]} material={mat("chrome", { color: "#9ca3af" }, "fork")}>
        <cylinderGeometry args={[1.1, 1.3, 52, 16]} />
      </mesh>
    </group>
  );
};

// タイヤがつぶれる：地面（デコボコこみ）より下へは行けない。深さ depth の所は、そのぶん上で止まる。つぶれた分は横へふくらむ
const squash = (ground: (x: number) => number) => (p: THREE.Vector3, depth: number) => {
  const floor = ground(p.x) + depth;
  if (p.y < floor) {
    const d = floor - p.y;
    p.y = floor;
    p.z -= d * 0.35;
  }
};

// ---------------- 第1世代：ゴムのかたまり ----------------
const Solid: React.FC<TireProps> = ({ t, starts }) => {
  const s = rolled(0, t, starts);
  const lift = bumpAt(0, s) * 0.92;
  const jolt = bumpAt(0, s) / BUMP_H;
  const L3 = t - starts[3];
  return (
    <group>
      <Road s={s} />
      <group position={[0, lift, 0]}>
        <Wheel angle={s / OUT} />
        <CutTorus R={RC} r={TR} thick={TR} material={rubber()} cutMaterial={rubberCut()} deform={squash((x) => GROUND - 0.45 + bumpAt(x, s) * 0.08 - lift)} deformKey={t} />
      </group>
      {/* 衝撃がそのまま車軸と体へ（赤い矢印） */}
      <FlowStream points={[[0, GROUND + 0.5, 1.2], [0, -20, 1.2], [0, 0 + lift, 1.2], [0, 30 + lift, -5]]} color={STREAM.hot} width={0.9} t={t} speed={1.6} active={jolt * sm(0, 0.4, L3) + jolt * 0.5 * sm(starts[1], starts[1] + 0.5, t)} />
    </group>
  );
};

// ---------------- 第2世代：空気入りタイヤ（チューブ） ----------------
const Pneumatic: React.FC<TireProps> = ({ t, starts }) => {
  const s = rolled(1, t, starts);
  const L7 = t - starts[7];
  const L8 = t - starts[8];
  const flat = sm(0.2, 2.2, L8);
  const d = 0.6 + 4.6 * flat; // つぶれ（空気が抜けるほど大きく）
  const lift = bumpAt(0, s) * 0.2 - (d - 0.6);
  const nail = sm(0, 0.8, L7);
  const ground = (x: number) => GROUND + bumpAt(x, s) - lift;
  const def = squash(ground);
  // 空気の圧力（中から外へ押す青い矢印）
  const press = sm(starts[5], starts[5] + 0.5, t) * (1 - sm(0.2, 1.4, L8));
  const arrows = useMemo(() => Array.from({ length: 12 }, (_, k) => -Math.PI / 2 + ((k - 5.5) / 12) * Math.PI * 1.1), []);
  return (
    <group>
      <Road s={s} />
      {/* くぎ */}
      <mesh position={[0.8, GROUND - 4 + 8.2 * nail, 1.2]} material={mat("chrome", { color: "#c7cbd1", roughness: 0.3 }, "nail")}>
        <cylinderGeometry args={[0.18, 0.02, 7, 12]} />
      </mesh>
      <group position={[0, lift, 0]}>
        <Wheel angle={s / OUT} />
        <CutTorus R={RC} r={TR} thick={0.45} material={rubber()} cutMaterial={rubberCut()} deform={def} deformKey={t} />
        {/* チューブ（中の空気をためる管）と空気 */}
        <CutTorus R={RC} r={TR - 0.5} thick={0.22} material={tube()} cutMaterial={tube()} deform={(p, dep) => def(p, dep + 0.5)} deformKey={t} />
        <CutTorus R={RC} r={TR - 0.75} thick={TR - 0.75} material={mat("acrylic", { color: "#93c5fd", opacity: 0.32 * (1 - 0.8 * flat) }, "air")} deform={(p, dep) => def(p, dep + 0.75)} deformKey={t + 0.5} />
        {arrows.map((a, k) => (
          <FlowStream key={k} points={[[Math.cos(a) * 30.2, Math.sin(a) * 30.2, 0.6], [Math.cos(a) * 32, Math.sin(a) * 32, 0.6], [Math.cos(a) * 33.6, Math.sin(a) * 33.6, 0.6]]} color={STREAM.cold} width={0.35} t={t} speed={0.8} active={press} />
        ))}
        {/* 抜ける空気（赤）と、穴から出る泡 */}
        <FlowStream points={[[-6, -31, 0.7], [-2, -32.5, 0.7], [0.8, -33.6 + (d - 0.6), 0.7], [1.6, -37 + (d - 0.6), 1.2]]} color={STREAM.air} width={0.45} t={t} speed={1.4} active={sm(0, 0.4, L8) * (1 - sm(1.8, 2.4, L8))} />
      </group>
      <Drops e={{ seed: "air", origin: [1.0, GROUND + 0.6, 1.5], t0: starts[8] + 0.1, t1: starts[8] + 2.2, rate: 30, vel: [6, 4, 4], spread: 10, gravity: -6, floorY: -999, size: 0.2, life: 1.2 }} t={t} material={bubM()} />
    </group>
  );
};

// ---------------- 第3世代：チューブレス＋シーラント ----------------
const SEAL = Array.from({ length: 46 }, (_, k) => ({ a: -Math.PI / 2 + (random(`sa${k}`) - 0.5) * 0.7, r: RC - 2.2 + random(`sr${k}`) * 4.6, z: -0.3 - random(`sz${k}`) * 2.4, s: 0.32 + random(`ss${k}`) * 0.3 }));
const SLASH_A = -Math.PI / 3;
const Tubeless: React.FC<TireProps> = ({ t, starts }) => {
  const s = rolled(2, t, starts);
  const L10 = t - starts[10];
  const L11 = t - starts[11];
  const L12 = t - starts[12];
  const L13 = t - starts[13];
  const seep = sm(0, 2.5, L13);
  const d = 0.6 + 1.6 * seep;
  const lift = bumpAt(0, s) * 0.2 - (d - 0.6);
  const def = squash((x) => GROUND + bumpAt(x, s) - lift);
  const thorn = sm(0, 0.6, L10);
  const toHole = sm(0.4, 1.8, L10);
  const plug = sm(0.2, 1.2, L11);
  const hole: [number, number, number] = [0, -OUT + 0.9, -0.6];
  const slash: [number, number, number] = [Math.cos(SLASH_A) * (OUT - 0.2), Math.sin(SLASH_A) * (OUT - 0.2), -1.2];
  const holeOut = L12 > 0 && t < starts[14] ? 1 : 0;
  return (
    <group>
      <Road s={s} />
      {/* とげ */}
      <mesh position={[0.2, GROUND - 3 + 5.6 * thorn - 3 * sm(0.3, 0.9, L11), 0.8]} material={mat("chrome", { color: "#8b6b45", roughness: 0.6, metalness: 0.1 }, "thorn")}>
        <coneGeometry args={[0.25, 5, 10]} />
      </mesh>
      <group position={[0, lift, 0]}>
        <Wheel angle={s / OUT} />
        <CutTorus R={RC} r={TR} thick={0.5} material={rubber()} cutMaterial={rubberCut()} deform={def} deformKey={t} />
        <CutTorus R={RC} r={TR - 0.55} thick={TR - 0.55} material={mat("acrylic", { color: "#93c5fd", opacity: 0.22 }, "air3")} deform={(p, dep) => def(p, dep + 0.55)} deformKey={t + 0.5} />
        {/* シーラント（白い液）：ふだんは下にたまる。穴があくと、穴へ集まる */}
        {SEAL.map((q, k) => {
          const base: [number, number, number] = [Math.cos(q.a) * q.r, Math.sin(q.a) * q.r + (d - 0.6) * 0.5, q.z];
          const slosh = Math.sin(t * 4 + k) * 0.3;
          const go = toHole * (k < 30 ? 1 : 0.3);
          const p = base.map((v, i) => v + (hole[i] - v) * go * (0.85 + 0.15 * random(`h${k}`))) as [number, number, number];
          return (
            <mesh key={k} position={[p[0] + slosh * (1 - go), p[1], p[2]]} material={sealM()}>
              <sphereGeometry args={[q.s, 10, 8]} />
            </mesh>
          );
        })}
        {/* 固まった栓 */}
        {plug > 0.01 ? (
          <mesh position={hole} scale={plug} material={mat("ceramic", { color: "#ecebe2", roughness: 0.6 }, "plug")}>
            <sphereGeometry args={[0.9, 16, 12]} />
          </mesh>
        ) : null}
        {/* 大きな切れ目（黒い傷） */}
        {L12 > -0.2 ? (
          <mesh position={slash} rotation={[0, 0, SLASH_A + Math.PI / 2]}>
            <boxGeometry args={[3.2, 0.5, 0.6]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        ) : null}
        {/* ゴムを通りぬけていく空気（青い点） */}
        {seep > 0.01
          ? Array.from({ length: 60 }, (_, k) => {
              const a = (k / 60) * Math.PI * 2 + random(`pa${k}`) * 0.1;
              const u = (random(`pu${k}`) + (t - starts[13]) * 0.35) % 1;
              const r = RC + 1.5 + u * 5;
              return (
                <mesh key={k} position={[Math.cos(a) * r, Math.sin(a) * r, -1]}>
                  <sphereGeometry args={[0.28, 8, 6]} />
                  <meshBasicMaterial color="#60a5fa" transparent opacity={0.8 * Math.sin(Math.PI * u) * seep} depthWrite={false} />
                </mesh>
              );
            })
          : null}
      </group>
      {/* とげの穴：はじめは泡が出て、栓ができると止まる */}
      <Drops e={{ seed: "tb", origin: [0.6, GROUND + 0.8, 1.2], t0: starts[10] + 0.4, t1: starts[11] + 0.6, rate: 18, vel: [5, 3, 3], spread: 6, gravity: -6, floorY: -999, size: 0.2, life: 1 }} t={t} material={bubM()} />
      {/* 大きな切れ目からは、液も空気も出ていく */}
      {holeOut ? (
        <group>
          <Drops e={{ seed: "sl", origin: [slash[0] + 0.6, slash[1] - 0.3 + lift, 0.2], t0: starts[12] + 0.6, t1: starts[13], rate: 22, vel: [10, -2, 4], spread: 6, gravity: 60, floorY: GROUND + 0.05, size: 0.35, restitution: 0.2 }} t={t} material={sealM()} />
          <Drops e={{ seed: "sa", origin: [slash[0] + 0.6, slash[1] + lift, 0.4], t0: starts[12] + 0.5, t1: starts[13], rate: 20, vel: [8, 2, 4], spread: 8, gravity: -6, floorY: -999, size: 0.2, life: 1 }} t={t} material={bubM()} />
        </group>
      ) : null}
    </group>
  );
};

// ---------------- 第4世代：空気のいらないタイヤ（樹脂のスポーク） ----------------
const N_SPOKE = 30;
const AirFree: React.FC<TireProps> = ({ t, starts }) => {
  const s = rolled(3, t, starts);
  const angle = s / OUT;
  const L16 = t - starts[16];
  const nail = sm(0.2, 0.9, L16) * (1 - sm(1.5, 2.1, L16));
  const ground = (x: number) => GROUND + bumpAt(x, s) * 0.85;
  const def = squash(ground);
  const IN_R = 24.5;
  const OUT_R = 30.8;
  // スポーク：地面に近いほど押されて曲がる
  const spokes = useMemo(() => Array.from({ length: N_SPOKE }, (_, k) => (k / N_SPOKE) * Math.PI * 2), []);
  const geoms = spokes.map((a0) => {
    const a = a0 - angle;
    const bottom = Math.max(0, -Math.sin(a)) ** 6;
    const bump = bumpAt(Math.cos(a) * OUT, s);
    const c = (1.1 + bump * 0.9) * bottom;
    const len = OUT_R - IN_R - c;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const r = IN_R + len * u;
      // S 字（押されるほど大きくふくらむ）
      const off = (0.09 + 0.06 * c) * Math.sin(u * Math.PI * 2);
      pts.push(new THREE.Vector3(Math.cos(a + off) * r, Math.sin(a + off) * r, -1.2));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.42, 6, false);
  });
  return (
    <group>
      <Road s={s} />
      <mesh position={[0.6, GROUND - 4 + 7.6 * nail, 1.2]} material={mat("chrome", { color: "#c7cbd1", roughness: 0.3 }, "nail")}>
        <cylinderGeometry args={[0.18, 0.02, 7, 12]} />
      </mesh>
      <group>
        <Wheel angle={angle} rimR={IN_R - 1} />
        {/* 内側の輪・外側の輪（樹脂）と、地面に接するゴム */}
        <CutTorus R={IN_R} r={1.2} thick={1.2} material={resin()} cutMaterial={resin()} />
        <CutTorus R={OUT_R + 0.9} r={1.1} thick={1.1} material={resin()} cutMaterial={resin()} deform={(p, dep) => def(p, dep + 3.1)} deformKey={t} />
        <CutTorus R={OUT_R + 3.2} r={1.6} thick={1.6} material={rubber()} cutMaterial={rubberCut()} deform={(p, dep) => def(p, dep)} deformKey={t + 0.25} />
        {geoms.map((g, k) => (
          <mesh key={k} geometry={g} material={resin()} />
        ))}
      </group>
    </group>
  );
};

const GENS = [Solid, Pneumatic, Tubeless, AirFree];
const FIRST_BEAT = [0, 4, 9, 14];
// 世代の切りかえ：新しい車輪が右から走ってきて、前の車輪は左へ走り去る
export const TireScene: React.FC<TireProps & { gen: number }> = ({ t, starts, gen }) => {
  const a = t - starts[FIRST_BEAT[gen]];
  const k = gen > 0 ? ease(a / 1.0) : 1;
  const Cur = GENS[gen];
  const Prev = gen > 0 ? GENS[gen - 1] : null;
  return (
    <group>
      {Prev && k < 1 ? (
        <group position={[-260 * k, 0, 0]}>
          <Prev t={t} starts={starts} />
        </group>
      ) : null}
      <group position={[260 * (1 - k), 0, 0]}>
        <Cur t={t} starts={starts} />
      </group>
    </group>
  );
};
