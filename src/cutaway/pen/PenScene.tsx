import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { CutShell, RubberRing, Spring } from "../parts";
import { Bubbles, Drops, FlowStream, liquidMat, bubbleMat, SeepDrops, STREAM } from "../fluid";
import { ghostMat, mat } from "../materials";

// ボールペンの4世代（単位 1 = 約0.1mm を拡大して描く。ペン先の玉は直径2、紙は y = 0）
// 0: 万年筆（毛細管）  1: ボールペン（重力式）  2: 加圧式（バネ＋ゴムのピストン）  3: ゲルインク＋フォロアー

export type PenProps = { t: number; starts: number[] };

const sm = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const ease = (x: number) => sm(0, 1, x);

const INK = "#1e3a8a";
const GEL = "#2747c9";
const inkMat = () => mat("ceramic", { color: INK, roughness: 0.18, metalness: 0, clearcoat: 1 }, "ink");
const gelMat = () => mat("ceramic", { color: GEL, roughness: 0.3, metalness: 0, clearcoat: 0.8, transparent: true, opacity: 0.92 }, "gel");
const dropMat = (() => {
  let m: THREE.Material | null = null;
  return () => (m ??= liquidMat("#2340b0", 0.85));
})();
const bubM = (() => {
  let m: THREE.Material | null = null;
  return () => (m ??= bubbleMat());
})();

// ---- 書いた長さ（紙が動く量）：世代ごとに、書いているビートの間だけ増える ----
const WRITE: Record<number, [number, number, number][]> = {
  // [ビート, そのビートの何秒後から, 何秒後まで（-1 は最後まで）]
  0: [
    [1, 0, -1],
    [2, 0, -1],
    [3, 0, 0.9],
  ],
  1: [
    [6, 0, -1],
    [7, 0, -1],
  ],
  2: [
    [10, 0.6, -1],
    [11, 0, -1],
    [12, 0, -1],
  ],
  3: [
    [15, 0.4, -1],
    [17, 0, -1],
    [18, 0, -1],
  ],
};
const SPEED = 6;
export const written = (g: number, t: number, starts: number[]) => {
  let w = 0;
  for (const [b, a0, a1] of WRITE[g]) {
    const s = starts[b] + a0;
    const e = a1 < 0 ? (starts[b + 1] ?? s + 4) : starts[b] + a1;
    w += Math.max(0, Math.min(t, e) - s);
  }
  return w * SPEED;
};
export const isWriting = (g: number, t: number, starts: number[]) =>
  WRITE[g].some(([b, a0, a1]) => t >= starts[b] + a0 && t < (a1 < 0 ? (starts[b + 1] ?? 1e9) : starts[b] + a1));

// 紙（罫線が流れて、書いた線がのびる）
const Paper: React.FC<{ w: number; blots?: React.ReactNode }> = ({ w }) => {
  const lines = [];
  for (let k = -12; k <= 12; k++) {
    const x = ((k * 7 - w) % 168) + (k * 7 - w < 0 ? 0 : 0);
    lines.push(
      <mesh key={k} position={[((x + 84 * 3) % 168) - 84, 0.006, 0]} material={mat("paper", { color: "#9fb3d1" }, "rule")} visible={Math.abs(((x + 84 * 3) % 168) - 84) < 22}>
        <boxGeometry args={[0.12, 0.004, 29]} />
      </mesh>,
    );
  }
  const len = Math.min(w, 22);
  return (
    <group>
      {/* 机の上の1枚の紙（暗い背景に浮かぶように、小さめ） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat("paper", { color: "#d8d4c8" }, "sheet")}>
        <planeGeometry args={[46, 30]} />
      </mesh>
      {lines}
      {len > 0.05 ? (
        <mesh position={[-len / 2 + 0.2, 0.02, 0]} material={inkMat()}>
          <boxGeometry args={[len, 0.03, 0.9]} />
        </mesh>
      ) : null}
    </group>
  );
};

// ボールペンの先（クロームの先端・ボール・インクの通り道）。ボールは書いた長さだけ転がる
const Tip: React.FC<{ roll: number; channelFrom?: number; ink?: THREE.Material; gapGlow?: number }> = ({ roll, channelFrom = 1.9, ink, gapGlow = 0 }) => (
  <group>
    <CutShell rBottom={1.25} rTop={2.15} thick={[0.3, 0.55]} height={7} position={[0, 4.1, 0]} material={mat("chrome")} cutMaterial={mat("chromeCut")} />
    {channelFrom < 7.6 ? <CutShell rBottom={0.55} rTop={0.55} thick={0.55} height={7.6 - channelFrom} position={[0, (7.6 + channelFrom) / 2, 0]} material={ink ?? inkMat()} /> : null}
    <group position={[0, 1, 0]} rotation={[0, 0, -roll]}>
      <mesh material={mat("chrome")}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      {/* 回っているのが見えるように、細い帯 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.001, 0.05, 8, 64]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
    {gapGlow > 0.01 ? (
      <mesh position={[0, 1.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.97, 0.05, 10, 64]} />
        <meshBasicMaterial color="#facc15" transparent opacity={gapGlow} depthWrite={false} />
      </mesh>
    ) : null}
  </group>
);

// 替え芯の透明なチューブ
const Tube: React.FC<{ top?: number; capped?: boolean }> = ({ top = 59.6, capped }) => (
  <group>
    <CutShell rBottom={2.0} rTop={2.0} thick={0.35} height={top - 7.6} position={[0, (top + 7.6) / 2, 0]} material={mat("acrylic", { opacity: 0.32 }, "tube")} cutMaterial={mat("acrylic", { opacity: 0.6, color: "#e5eefc" }, "tubeCut")} />
    {capped ? <CutShell rBottom={2.0} rTop={2.0} thick={2} height={0.8} position={[0, top + 0.4, 0]} material={mat("chrome")} cutMaterial={mat("chromeCut")} /> : null}
  </group>
);

const Column: React.FC<{ from: number; to: number; material: THREE.Material; r?: number }> = ({ from, to, material, r = 1.65 }) =>
  to - from > 0.05 ? <CutShell rBottom={r} rTop={r} thick={r} height={to - from} position={[0, (from + to) / 2, 0]} material={material} /> : null;

// ---------------- 第1世代：万年筆 ----------------
const Fountain: React.FC<PenProps> = ({ t, starts }) => {
  const w = written(0, t, starts);
  const L3 = t - starts[3];
  const L4 = t - starts[4];
  // 飛行機：空気がふくらみ、インクの面が下がる（そのぶんペン先から出る）
  const expand = sm(0.2, 2.2, L4);
  const inkTop = 62 - 8 * expand;
  const clog = sm(0.2, 1.4, L3);
  const crust = useMemo(() => Array.from({ length: 9 }, (_, k) => [(random(`cx${k}`) - 0.5) * 0.7, 0.45 + random(`cy${k}`) * 1.4, -0.15 - random(`cz${k}`) * 0.3, 0.12 + random(`cr${k}`) * 0.16]), []);
  return (
    <group>
      {/* ペン先（金色の真鍮）：奥半分を残した断面。内側の中央の線がスリット（細い溝） */}
      <CutShell rBottom={0.32} rTop={3.3} thick={0.28} height={13.5} position={[0, 7.05, 0]} material={mat("brass")} cutMaterial={mat("brassCut")} />
      <FlowStream points={[[0, 0.5, -0.12], [0, 4.5, -0.95], [0, 9, -1.95]]} color="#3a2a10" width={0.07} t={0} active={1} arrows={0} />
      <mesh position={[0, 9.1, -2.05]}>
        <sphereGeometry args={[0.32, 16, 10]} />
        <meshStandardMaterial color="#1a1206" />
      </mesh>
      {/* ペン芯（黒）とインクの通り道 */}
      <CutShell rBottom={2.1} rTop={2.1} thick={2.1} height={16} position={[0, 17, 0]} material={mat("plastic")} cutMaterial={mat("plasticCut")} />
      <CutShell rBottom={0.35} rTop={0.35} thick={0.35} height={16} position={[0, 17, 0.02]} material={inkMat()} />
      {/* 首と胴（透明）、インクタンク */}
      <CutShell rBottom={3.6} rTop={3.8} thick={0.5} height={14} position={[0, 19, 0]} material={mat("acrylic", { opacity: 0.3 }, "sec")} />
      <CutShell rBottom={4.6} rTop={4.6} thick={0.45} height={50} position={[0, 51, 0]} material={mat("acrylic", { opacity: 0.28 }, "barrel")} cutMaterial={mat("acrylic", { opacity: 0.55, color: "#e5eefc" }, "barrelCut")} />
      <Column from={26} to={inkTop} r={4.15} material={inkMat()} />
      {/* ふくらむ空気 */}
      <Column from={inkTop} to={75.5} r={4.1} material={mat("acrylic", { opacity: 0.18 + 0.25 * expand, color: "#ffffff" }, "air")} />
      {/* インクの流れ（毛細管で、溝を伝ってペン先へ） */}
      <FlowStream points={[[0, 44, 0.3], [0, 26, 0.45], [0, 12, 0.45], [0, 6, -0.6], [0, 1.6, -0.2], [0, 0.4, 0.05]]} color={STREAM.ink} width={0.32} t={t} speed={0.6} active={sm(starts[1], starts[1] + 0.5, t) * (1 - sm(starts[5] - 0.6, starts[5], t))} blocked={1 - 0.5 * clog} />
      {/* 乾いて固まったインク */}
      {clog > 0.01
        ? crust.map(([x, y, z, r], k) => (
            <mesh key={k} position={[x, y, z]} scale={clog}>
              <dodecahedronGeometry args={[r, 1]} />
              <meshStandardMaterial color="#121a36" roughness={0.95} />
            </mesh>
          ))
        : null}
      {/* 空気の圧力（赤）と、吹き出すインク */}
      <FlowStream points={[[0, 74, 0.5], [0, 68, 0.5], [0, inkTop + 1.5, 0.5]]} color={STREAM.air} width={0.55} t={t} speed={0.9} active={sm(0, 0.5, L4) * (1 - sm(starts[5] - 0.4, starts[5], t))} />
      <Drops e={{ seed: "spurt", origin: [0, 0.6, 0.3], t0: starts[4] + 0.9, t1: starts[5] - 0.2, rate: 26, vel: [1.5, 4, 3], spread: 9, gravity: 40, floorY: 0.03, size: 0.38, restitution: 0.3 }} t={t} material={dropMat()} />
      <Paper w={w} />
    </group>
  );
};

// ---------------- 第2世代：重力式ボールペン ----------------
const Gravity: React.FC<PenProps> = ({ t, starts }) => {
  const w = written(1, t, starts);
  const L8 = t - starts[8];
  const flip = ease(L8 / 1.1);
  const s = sm(1.0, 2.4, L8); // 上を向いたあと、インクが離れていく
  return (
    <group>
      <group position={[0, 31, 0]} rotation={[0, 0, Math.PI * flip]}>
        <group position={[0, -31, 0]}>
          <Tip roll={w} channelFrom={1.9 + 5.7 * s} />
          <Tube />
          <Column from={7.6 + 14 * s} to={45 + 14 * s} material={mat("ceramic", { color: "#18265e", roughness: 0.25, clearcoat: 1 }, "oil")} />
          <FlowStream points={[[0, 44, 0.3], [0, 20, 0.3], [0, 2.2, 0.3], [0.75, 0.6, 0.6], [1.7, 0.08, 0.5]]} color={STREAM.ink} width={0.3} t={t} speed={0.45} active={sm(starts[6], starts[6] + 0.5, t) * (1 - sm(starts[8], starts[8] + 0.4, t))} />
          {/* 入りこむ空気（赤）と気泡 */}
          <FlowStream points={[[0, -0.5, 0.4], [0, 3, 0.4], [0, 8, 0.4], [0, 7.6 + 14 * s + 2, 0.4]]} color={STREAM.air} width={0.35} t={t} speed={0.8} active={sm(1.2, 1.8, L8)} />
          <Bubbles seed="air" path={new THREE.LineCurve3(new THREE.Vector3(0, 0.8, 0.3), new THREE.Vector3(0, 7.6 + 14 * s, 0.3))} t={t} t0={starts[8] + 1.3} count={10} speed={0.5} size={0.28} material={bubM()} />
        </group>
      </group>
      <group visible={flip < 0.05}>
        <Paper w={w} />
      </group>
    </group>
  );
};

// ---------------- 第3世代：加圧式（バネ・ガス＋ゴムのピストン） ----------------
const Pressurized: React.FC<PenProps> = ({ t, starts }) => {
  const w = written(2, t, starts);
  const push = sm(starts[10], starts[10] + 0.6, t);
  const pistonY = 42 - 1.2 * push - 0.06 * w;
  const L11 = t - starts[11];
  const gap = sm(0.6, 1.2, L11) * (1 - sm(0, 0.6, t - starts[13]));
  return (
    <group>
      <Tip roll={w} gapGlow={gap * (1 - sm(starts[12] + 0.5, starts[12] + 1.2, t))} />
      <Tube capped />
      <Column from={7.6} to={pistonY} material={inkMat()} />
      {/* ピストン（ステンレス）とゴムの O リング：押されてつぶれる */}
      <CutShell rBottom={1.62} rTop={1.62} thick={1.62} height={1.3} position={[0, pistonY + 0.65, 0]} material={mat("chrome")} cutMaterial={mat("chromeCut")} />
      <RubberRing radius={1.45} tube={0.3} squash={0.15 + 0.55 * push} position={[0, pistonY + 0.65, 0]} material={mat("rubber")} />
      <Spring radius={1.25} wire={0.17} turns={13} length={59.6 - (pistonY + 1.3)} position={[0, pistonY + 1.3, 0]} material={mat("chrome")} />
      <FlowStream points={[[0, 58.5, 0.9], [0, 52, 0.9], [0, pistonY + 2.2, 0.9]]} color={STREAM.air} width={0.5} t={t} speed={0.9} active={sm(starts[9] + 0.8, starts[9] + 1.4, t)} />
      <FlowStream points={[[0, pistonY - 1, 0.3], [0, 20, 0.3], [0, 2.2, 0.3], [0.75, 0.6, 0.6], [1.7, 0.08, 0.5]]} color={STREAM.ink} width={0.3} t={t} speed={0.5} active={push * (1 - sm(starts[11], starts[11] + 0.5, t))} />
      {/* わずかな隙間からにじみ出すインク */}
      <SeepDrops s={{ seed: "sr", at: [0.98, 1.68, 0.3], t0: starts[11] + 1.4, period: 0.85, size: 0.26, slide: [0.5, -0.9, 0.15], slideTime: 0.5, gravity: 30, floorY: 0.03 }} t={t} material={dropMat()} count={8} />
      <SeepDrops s={{ seed: "sl", at: [-0.98, 1.68, 0.3], t0: starts[11] + 1.9, period: 0.95, size: 0.24, slide: [-0.5, -0.9, 0.15], slideTime: 0.55, gravity: 30, floorY: 0.03 }} t={t} material={dropMat()} count={7} />
      <Paper w={w} />
    </group>
  );
};

// ---------------- 第4世代：ゲルインク（チキソトロピー）＋フォロアー ----------------
const GEL_PTS = Array.from({ length: 110 }, (_, k) => [(random(`gx${k}`) - 0.5) * 2.8, 7.8 + random(`gy${k}`) * 30, -0.1 - random(`gz${k}`) * 1.3] as [number, number, number]);
const Gel: React.FC<PenProps> = ({ t, starts }) => {
  const w = written(3, t, starts);
  const inkTop = 38 - 0.05 * w;
  const L14 = t - starts[14];
  const tilt = L14 > 0 && t < starts[15] ? 0.22 * Math.sin(L14 * 5) * sm(0, 0.4, L14) * (1 - sm(1.6, 2.2, L14)) : 0;
  const shear = isWriting(3, t, starts) ? 1 : 0;
  const shearK = sm(starts[15], starts[15] + 0.5, t);
  const follower = sm(starts[16], starts[16] + 0.4, t);
  const ghost = sm(starts[17], starts[17] + 1.2, t);
  return (
    <group>
      <group position={[0, 1, 0]} rotation={[0, 0, tilt]}>
        <group position={[0, -1, 0]}>
          <Tip roll={w} ink={gelMat()} />
          <Tube />
          <Column from={7.6} to={inkTop} material={gelMat()} />
          {/* 止まっているときは粒が動かない。玉の近く（こすれる所）だけ流れる */}
          {GEL_PTS.map((p, k) => {
            const y = p[1] > inkTop - 0.4 ? -99 : p[1];
            const near = y < 13;
            const flow = near && shear ? ((t * 6 + k * 0.37) % 6) : 0;
            const py = near && shear ? Math.max(1.9, y - flow) : y;
            if (py < 0) return null;
            const inCh = py < 7.6;
            return (
              <mesh key={k} position={[inCh ? p[0] * 0.15 : p[0], py, p[2] * (inCh ? 0.3 : 1)]}>
                <sphereGeometry args={[0.13, 8, 6]} />
                <meshBasicMaterial color={near && shear ? "#e0f2fe" : "#93a9e8"} transparent opacity={0.8} />
              </mesh>
            );
          })}
          {/* せん断で液体になる所（玉のまわり）が光る */}
          {shearK > 0.01 ? (
            <mesh position={[0, 1.6, 0.1]}>
              <sphereGeometry args={[1.35, 32, 20]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={(0.1 + 0.05 * Math.sin(t * 9)) * shearK * shear} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          ) : null}
          <FlowStream points={[[0, 5.5, 0.3], [0, 2.4, 0.3], [0.75, 0.6, 0.6], [1.7, 0.08, 0.5]]} color={STREAM.ink} width={0.26} t={t} speed={0.7} active={shearK * shear} />
          {/* フォロアー（透明な栓）と、ふさがれる空気 */}
          <Column from={inkTop} to={inkTop + 5} material={mat("acrylic", { color: "#fde68a", opacity: 0.6, roughness: 0.15 }, "follower")} />
          {follower > 0.01 ? (
            <mesh position={[0, inkTop + 5.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.65, 48, 0, Math.PI]} />
              <meshBasicMaterial color="#fef3c7" transparent opacity={(0.5 + 0.3 * Math.sin(t * 7)) * follower * (1 - ghost)} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          ) : null}
          <FlowStream points={[[0, 58.5, 0.9], [0, 50, 0.9], [0, inkTop + 5.4, 0.9]]} color={STREAM.air} width={0.45} t={t} speed={0.7} active={follower * (1 - sm(starts[17], starts[17] + 0.6, t))} />
          {/* 完成形：外装（半透明のゴースト表示）とクリップ */}
          {ghost > 0.01 ? (
            <group>
              <CutShell rBottom={4.3} rTop={4.6} thick={0.4} height={64} position={[0, 40, 0]} material={ghostMat("acrylic", 1, "body")} whole segments={64} />
              <CutShell rBottom={1.5} rTop={4.3} thick={0.3} height={7.6} position={[0, 4.4, 0]} material={ghostMat("acrylic", 1, "nose")} whole />
              <mesh position={[0, 66, -5.1]} material={mat("chrome")}>
                <boxGeometry args={[1.4, 22, 0.6]} />
              </mesh>
              <CutShell rBottom={2.6} rTop={2.6} thick={2.6} height={5} position={[0, 74.5, 0]} material={mat("ceramic")} whole />
            </group>
          ) : null}
        </group>
      </group>
      <Paper w={w} />
    </group>
  );
};

const GENS = [Fountain, Gravity, Pressurized, Gel];
// 世代の切りかえ：前の模型は上へ、新しい模型は下からせり上がる
const FIRST_BEAT = [0, 5, 9, 13];
export const PenScene: React.FC<PenProps & { gen: number }> = ({ t, starts, gen }) => {
  const a = t - starts[FIRST_BEAT[gen]];
  const k = gen > 0 ? ease(a / 0.9) : 1;
  const Cur = GENS[gen];
  const Prev = gen > 0 ? GENS[gen - 1] : null;
  return (
    <group>
      {Prev && k < 1 ? (
        <group position={[0, 140 * k, 0]}>
          <Prev t={t} starts={starts} />
        </group>
      ) : null}
      <group position={[0, -140 * (1 - k), 0]}>
        <Cur t={t} starts={starts} />
      </group>
    </group>
  );
};
