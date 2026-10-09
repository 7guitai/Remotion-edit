import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 真空断熱のしくみの図解（たて動画の映像エリア 1080×1000 を想定）
// compare：ふつうのコップと真空断熱タンブラーの氷くらべ（イメージ）
// conduction / convection / radiation：熱の伝わり方3つ
// vacuum：二重のかべの間の真空（分子がいないので熱が伝わらない）
// mirror：内側の鏡面が放射の熱をはね返す
// dewar：魔法びん（デュワーびん）のしくみ
// product：商品紹介のカード
export type ThermoMode =
  | "compare"
  | "conduction"
  | "convection"
  | "radiation"
  | "vacuum"
  | "mirror"
  | "dewar"
  | "product";

const HOT = "#ff5a3c";
const COLD = "#3aa0ff";

const Label: React.FC<{ x: number; y: number; children: React.ReactNode; color?: string; size?: number }> = ({
  x,
  y,
  children,
  color = "#fff",
  size = 46,
}) => (
  <text
    x={x}
    y={y}
    fontFamily={fontFamily}
    fontWeight={900}
    fontSize={size}
    textAnchor="middle"
    fill={color}
    stroke="#0b1020"
    strokeWidth={size * 0.18}
    paintOrder="stroke"
  >
    {children}
  </text>
);

// 氷（溶けると小さくなる）
const Ice: React.FC<{ x: number; y: number; s: number; rot: number }> = ({ x, y, s, rot }) =>
  s <= 0.02 ? null : (
    <rect
      x={x - 40 * s}
      y={y - 40 * s}
      width={80 * s}
      height={80 * s}
      rx={14 * s}
      fill="rgba(220,245,255,0.85)"
      stroke="#9fd8ff"
      strokeWidth={4}
      transform={`rotate(${rot} ${x} ${y}) translate(${x} ${y}) scale(0.8) translate(${-x} ${-y})`}
    />
  );

// コップ（double は二重のかべ＝真空断熱）
const Cup: React.FC<{ cx: number; melt: number; double?: boolean; drops?: number }> = ({
  cx,
  melt,
  double,
  drops = 0,
}) => {
  const top = 290;
  const bottom = 620;
  const wTop = 250;
  const wBot = 190;
  const path = (inset: number) =>
    `M ${cx - wTop / 2 + inset} ${top} L ${cx - wBot / 2 + inset} ${bottom - inset} L ${cx + wBot / 2 - inset} ${bottom - inset} L ${cx + wTop / 2 - inset} ${top}`;
  const water = 420 + 30 * melt;
  const ices = [
    [cx - 45, water + 10, 12],
    [cx + 42, water + 5, -18],
    [cx, water - 45, 30],
  ];
  return (
    <g>
      {/* 中の飲み物 */}
      <path
        d={`M ${cx - wTop / 2 + 18 + (water - top) * 0.07} ${water} L ${cx - wBot / 2 + 18} ${bottom - 18} L ${cx + wBot / 2 - 18} ${bottom - 18} L ${cx + wTop / 2 - 18 - (water - top) * 0.07} ${water} Z`}
        fill="#7fd0ff"
        opacity={0.55}
      />
      {ices.map(([x, y, r], i) => (
        <Ice key={i} x={x} y={y} s={Math.max(0, 1 - melt * (0.9 + i * 0.08))} rot={r} />
      ))}
      <path d={path(0)} fill="none" stroke={double ? "#c9d3de" : "#e6f4ff"} strokeWidth={double ? 16 : 10} strokeLinejoin="round" />
      {double ? <path d={path(26)} fill="none" stroke="#c9d3de" strokeWidth={10} strokeLinejoin="round" /> : null}
      {/* 外側につく水滴（ふつうのコップだけ） */}
      {Array.from({ length: Math.round(drops * 14) }, (_, i) => {
        const t = random(`d${i}`);
        const y = top + 40 + random(`dy${i}`) * 260;
        const side = i % 2 ? 1 : -1;
        const x = cx + side * (wTop / 2 - ((y - top) / (bottom - top)) * ((wTop - wBot) / 2) + 6);
        return <ellipse key={i} cx={x} cy={y + t * 20} rx={9} ry={13} fill="rgba(200,235,255,0.9)" />;
      })}
    </g>
  );
};

// 分子（熱いほど大きくふるえる）
const Molecule: React.FC<{ x: number; y: number; heat: number; seed: string; r?: number }> = ({ x, y, heat, seed, r = 18 }) => {
  const frame = useCurrentFrame();
  const amp = 2 + heat * 14;
  const dx = Math.sin(frame * (0.9 + random(seed) * 0.6) + random(`${seed}p`) * 6) * amp;
  const dy = Math.cos(frame * (1.1 + random(`${seed}q`) * 0.6) + random(`${seed}r`) * 6) * amp;
  const color = `rgb(${Math.round(58 + 197 * heat)},${Math.round(160 - 70 * heat)},${Math.round(255 - 195 * heat)})`;
  return <circle cx={x + dx} cy={y + dy} r={r} fill={color} stroke="#fff" strokeWidth={3} />;
};

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; opacity?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  color = HOT,
  width = 12,
  opacity = 1,
}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = width * 2.6;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={x2 - Math.cos(a) * h * 0.8} y2={y2 - Math.sin(a) * h * 0.8} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon
        points={`${x2},${y2} ${x2 - Math.cos(a - 0.45) * h},${y2 - Math.sin(a - 0.45) * h} ${x2 - Math.cos(a + 0.45) * h},${y2 - Math.sin(a + 0.45) * h}`}
        fill={color}
      />
    </g>
  );
};

export const ThermoScene: React.FC<{ mode: ThermoMode; width: number; height: number; product?: { name: string; points: string[] } }> = ({
  mode,
  width,
  height,
  product,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const bg = "radial-gradient(circle at 50% 40%, #1d3a66 0%, #0b1020 75%)";

  let body: React.ReactNode = null;
  if (mode === "compare") {
    const melt = interpolate(p, [0.1, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const minutes = Math.round(melt * 60);
    body = (
      <>
        <Cup cx={290} melt={melt} drops={melt} />
        <Cup cx={790} melt={melt * 0.06} double />
        <Label x={290} y={250}>ふつうのコップ</Label>
        <Label x={790} y={250} color="#ffe600">真空断熱</Label>
        <Label x={540} y={120} size={64} color="#7dff9a">{`${minutes}分後`}</Label>
        <Label x={540} y={175} size={32} color="#cfd8e6">※イメージ</Label>
      </>
    );
  } else if (mode === "conduction") {
    // 左の熱い分子のふるえが、となりへ順に伝わっていく
    const n = 7;
    body = (
      <>
        {Array.from({ length: n }, (_, i) => {
          const reach = p * (n + 2) - i;
          const heat = Math.max(0.05, Math.min(1, reach)) * (1 - i / (n * 1.6));
          return <Molecule key={i} x={150 + i * 130} y={430} heat={heat} seed={`c${i}`} r={34} />;
        })}
        <Arrow x1={140} y1={540} x2={140 + 820 * Math.min(1, p * 1.2)} y2={540} />
        <Label x={540} y={170} size={84} color="#ffb347">① 伝導</Label>
        <Label x={540} y={260}>分子がぶつかって伝わる</Label>
      </>
    );
  } else if (mode === "convection") {
    // 温められた流れが、輪になって回る
    body = (
      <>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2 + frame * 0.05;
          const x = 540 + Math.cos(a) * 240;
          const y = 440 + Math.sin(a) * 120;
          const heat = 0.5 + 0.5 * Math.sin(a);
          return <Molecule key={i} x={x} y={y} heat={heat} seed={`v${i}`} r={24} />;
        })}
        <rect x={360} y={600} width={360} height={26} rx={13} fill={HOT} />
        <Label x={540} y={170} size={84} color="#ffb347">② 対流</Label>
        <Label x={540} y={260}>温まった空気や水が動いて運ぶ</Label>
      </>
    );
  } else if (mode === "radiation") {
    // 熱い物から、光（赤外線）として熱が飛んでいく
    const waves = Array.from({ length: 6 }, (_, i) => (i / 6 + p * 1.5) % 1);
    body = (
      <>
        <circle cx={220} cy={450} r={110} fill="url(#sun)" />
        {waves.map((w, i) => (
          <path
            key={i}
            d={`M ${350 + w * 520} ${350 + (i % 3) * 110} q 25 -30 50 0 t 50 0 t 50 0`}
            fill="none"
            stroke="#ff8a3c"
            strokeWidth={10}
            strokeLinecap="round"
            opacity={1 - w}
          />
        ))}
        <Label x={540} y={170} size={84} color="#ffb347">③ 放射</Label>
        <Label x={540} y={260}>何もない空間でも、光として届く</Label>
      </>
    );
  } else if (mode === "vacuum" || mode === "mirror") {
    // 二重のかべの断面：外側の空気の分子はふるえているが、真空のすき間には分子がない
    const blocked = interpolate(p, [0.35, 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    body = (
      <>
        {/* 外（暑い部屋） */}
        {Array.from({ length: 12 }, (_, i) => (
          <Molecule key={i} x={90 + (i % 3) * 90} y={290 + Math.floor(i / 3) * 100} heat={0.95} seed={`o${i}`} r={22} />
        ))}
        {/* 外側のかべ・真空・内側のかべ */}
        <rect x={360} y={230} width={40} height={400} fill="#c9d3de" />
        <rect x={400} y={230} width={240} height={400} fill="#05070f" />
        <rect x={640} y={230} width={40} height={400} fill={mode === "mirror" ? "url(#mirror)" : "#c9d3de"} />
        {/* 中（冷たい飲み物） */}
        <rect x={680} y={230} width={400} height={400} fill={COLD} opacity={0.25} />
        {Array.from({ length: 9 }, (_, i) => (
          <Molecule key={i} x={760 + (i % 3) * 100} y={300 + Math.floor(i / 3) * 130} heat={0.05} seed={`i${i}`} r={22} />
        ))}
        <Label x={520} y={440} size={58} color="#9fb4d6">真空</Label>
        <Label x={520} y={500} size={34} color="#9fb4d6">分子がいない</Label>
        {mode === "vacuum" ? (
          <>
            <Arrow x1={300} y1={330} x2={395} y2={330} opacity={0.9} />
            <Arrow x1={300} y1={570} x2={395} y2={570} opacity={0.9} />
            <g opacity={blocked}>
              <Label x={430} y={360} size={90} color="#ff2d2d">✕</Label>
              <Label x={430} y={600} size={90} color="#ff2d2d">✕</Label>
            </g>
            <Label x={540} y={110} size={56}>伝導も対流も、ほぼゼロ</Label>
          </>
        ) : (
          <>
            {/* 放射の熱が、鏡のかべではね返る */}
            {[0, 1, 2].map((k) => {
              const t = ((p * 2 + k / 3) % 1);
              const x = t < 0.5 ? 300 + t * 2 * 330 : 630 - (t - 0.5) * 2 * 330;
              const y = 290 + k * 130 + (t < 0.5 ? t * 2 * 40 : 40 + (t - 0.5) * 2 * 40);
              return <circle key={k} cx={x} cy={y} r={16} fill="#ff8a3c" />;
            })}
            <Label x={540} y={110} size={56}>鏡のかべで、放射もはね返す</Label>
          </>
        )}
        <Label x={180} y={200} size={40}>外（暑い）</Label>
        <Label x={880} y={200} size={40}>中（冷たい）</Label>
      </>
    );
  } else if (mode === "dewar") {
    body = (
      <>
        <rect x={430} y={270} width={220} height={360} rx={60} fill="#c9d3de" />
        <rect x={452} y={292} width={176} height={316} rx={48} fill="#05070f" />
        <rect x={472} y={312} width={136} height={276} rx={38} fill="url(#mirror)" />
        <rect x={496} y={232} width={88} height={70} rx={16} fill="#8a6a4a" />
        <Label x={540} y={110} size={64} color="#ffe600">1892年</Label>
        <Label x={540} y={195}>デュワーが考えた「魔法びん」</Label>
      </>
    );
  } else if (mode === "product") {
    const name = product?.name ?? "真空断熱タンブラー";
    const points = product?.points ?? ["冷たいまま・温かいまま", "水滴がつきにくい", "氷が長もち"];
    const pop = interpolate(frame, [0, 12], [0.85, 1], { extrapolateRight: "clamp" });
    body = (
      <g transform={`translate(540 330) scale(${pop}) translate(-540 -330)`}>
        <rect x={90} y={40} width={900} height={590} rx={40} fill="#ffffff" />
        {/* 商品のイラスト（タンブラー） */}
        <path d="M 180 200 L 210 580 L 370 580 L 400 200 Z" fill="#7a8ca3" />
        <path d="M 198 200 L 226 562 L 354 562 L 382 200 Z" fill="#a9bacd" />
        <rect x={170} y={170} width={240} height={40} rx={14} fill="#2b3a55" />
        <text x={540} y={125} fontFamily={fontFamily} fontWeight={900} fontSize={56} textAnchor="middle" fill="#0b1020">
          {name}
        </text>
        {points.map((t, i) => (
          <g key={i} opacity={interpolate(frame, [8 + i * 8, 16 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
            <circle cx={470} cy={240 + i * 90} r={24} fill="#22b573" />
            <text x={470} y={251 + i * 90} fontFamily={fontFamily} fontWeight={900} fontSize={30} textAnchor="middle" fill="#fff">
              ✓
            </text>
            <text x={510} y={253 + i * 90} fontFamily={fontFamily} fontWeight={900} fontSize={38} fill="#0b1020">
              {t}
            </text>
          </g>
        ))}
        <rect x={470} y={505} width={460} height={90} rx={45} fill="#ff3b5c" />
        <text x={700} y={564} fontFamily={fontFamily} fontWeight={900} fontSize={40} textAnchor="middle" fill="#fff">
          概要欄のリンクから ▶
        </text>
      </g>
    );
  }

  return (
    <AbsoluteFill style={{ background: bg }}>
      <svg width={width} height={height} viewBox="0 0 1080 1000" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="sun">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.6" stopColor="#ffb347" />
            <stop offset="1" stopColor="#ff5a3c" />
          </radialGradient>
          <linearGradient id="mirror" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f2f6fb" />
            <stop offset="0.45" stopColor="#c8a06a" />
            <stop offset="0.55" stopColor="#ffe7c2" />
            <stop offset="1" stopColor="#b07a42" />
          </linearGradient>
        </defs>
        {body}
      </svg>
    </AbsoluteFill>
  );
};
