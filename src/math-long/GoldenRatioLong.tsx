import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { lerp, ramp, serif, smooth, Tex } from "../math-shorts/kit";
import { LongProps } from "./timeline";

// 【黄金比の正体】ロング（1920×1080）
// 色の意味：ゴールド＝黄金比・主役 ／ コーラルとエメラルド＝2つを比べるときだけ ／ オフホワイト＝基準の図形と文字

const LW = 1920;
const LH = 1080;
const PHI = (1 + Math.sqrt(5)) / 2;
const COL = {
  bg: "#0F141C",
  fg: "#F0F4F8",
  gold: "#F59E0B",
  coral: "#F43F5E",
  emerald: "#10B981",
  faint: "rgba(240,244,248,0.35)",
};
const BGM_VOLUME = 0.045;
const PHI_DIGITS = "1.61803398874989484820458683436563811772030917980576286213544862270526046281890244970720720418939113748475";

type Pt = { x: number; y: number };

// ── 図形の部品 ─────────────────────────────────────────

// ひまわりの種。k 番目の種は 1周×alpha×k の向きに生まれ、古いものほど外へ押し出される
const Sunflower: React.FC<{
  cx: number;
  cy: number;
  n: number;
  alpha: number;
  c?: number;
  r?: number;
  color?: (k: number) => string;
  opacity?: number;
}> = ({ cx, cy, n, alpha, c = 14, r = 6, color = () => COL.gold, opacity = 1 }) => {
  const seeds = [];
  for (let k = 0; k < Math.ceil(n); k++) {
    const age = n - k;
    if (age <= 0) continue;
    const rad = c * Math.sqrt(age);
    const a = 2 * Math.PI * alpha * k;
    seeds.push(
      <circle
        key={k}
        cx={cx + rad * Math.cos(a)}
        cy={cy + rad * Math.sin(a)}
        r={r * Math.min(1, age)}
        fill={color(k)}
      />,
    );
  }
  return <g opacity={opacity}>{seeds}</g>;
};

// 長方形から正方形を切り取っていく（左→上→右→下の順に回る）。切り口の正方形と渦巻きの弧を返す
type Sq = { x: number; y: number; s: number; arc: string };
const cutSquares = (x: number, y: number, w: number, h: number, count: number): Sq[] => {
  const out: Sq[] = [];
  for (let i = 0; i < count; i++) {
    const d = i % 4;
    if (d === 0) {
      const s = h;
      out.push({ x, y, s, arc: `M ${x} ${y + s} A ${s} ${s} 0 0 1 ${x + s} ${y}` });
      x += s;
      w -= s;
    } else if (d === 1) {
      const s = w;
      out.push({ x, y, s, arc: `M ${x} ${y} A ${s} ${s} 0 0 1 ${x + s} ${y + s}` });
      y += s;
      h -= s;
    } else if (d === 2) {
      const s = h;
      const sx = x + w - s;
      out.push({ x: sx, y, s, arc: `M ${sx + s} ${y} A ${s} ${s} 0 0 1 ${sx} ${y + s}` });
      w -= s;
    } else {
      const s = w;
      const sy = y + h - s;
      out.push({ x, y: sy, s, arc: `M ${x + s} ${sy + s} A ${s} ${s} 0 0 1 ${x} ${sy}` });
      h -= s;
    }
  }
  return out;
};

// 渦巻きの弧を k（0〜1）だけ描く
const Arc: React.FC<{ d: string; k: number; color?: string; width?: number }> = ({ d, k, color = COL.gold, width = 4 }) =>
  k <= 0 ? null : (
    <path d={d} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${k} 1`} strokeLinecap="round" />
  );

const pentagon = (cx: number, cy: number, R: number): Pt[] =>
  Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

const Star: React.FC<{ cx: number; cy: number; R: number; k: number; color?: string; width?: number }> = ({
  cx,
  cy,
  R,
  k,
  color = COL.gold,
  width = 4,
}) => {
  const p = pentagon(cx, cy, R);
  const order = [0, 2, 4, 1, 3, 0].map((i) => `${p[i].x},${p[i].y}`).join(" ");
  const outline = [0, 1, 2, 3, 4, 0].map((i) => `${p[i].x},${p[i].y}`).join(" ");
  return (
    <g>
      <polyline points={outline} fill="none" stroke={COL.fg} strokeOpacity={0.5} strokeWidth={2} />
      <polyline points={order} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${k} 1`} strokeLinejoin="round" />
    </g>
  );
};

// ペンローズのひし形の模様（ロビンソンの三角形を分けていく作り方）
type Tri = { c: 0 | 1; a: [number, number]; b: [number, number]; d: [number, number] };
const PENROSE: Tri[] = (() => {
  let tris: Tri[] = [];
  for (let i = 0; i < 10; i++) {
    let b: [number, number] = [Math.cos(((2 * i - 1) * Math.PI) / 10), Math.sin(((2 * i - 1) * Math.PI) / 10)];
    let c: [number, number] = [Math.cos(((2 * i + 1) * Math.PI) / 10), Math.sin(((2 * i + 1) * Math.PI) / 10)];
    if (i % 2 === 0) [b, c] = [c, b];
    tris.push({ c: 0, a: [0, 0], b, d: c });
  }
  const mix = (p: [number, number], q: [number, number], s: number): [number, number] => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
  for (let step = 0; step < 5; step++) {
    const next: Tri[] = [];
    for (const { c, a, b, d } of tris) {
      if (c === 0) {
        const p = mix(a, b, 1 / PHI);
        next.push({ c: 0, a: d, b: p, d: b }, { c: 1, a: p, b: d, d: a });
      } else {
        const q = mix(b, a, 1 / PHI);
        const r = mix(b, d, 1 / PHI);
        next.push({ c: 1, a: r, b: d, d: a }, { c: 1, a: q, b: r, d: b }, { c: 0, a: r, b: q, d: a });
      }
    }
    tris = next;
  }
  return tris;
})();

const Penrose: React.FC<{ cx: number; cy: number; R: number; k: number; opacity?: number }> = ({ cx, cy, R, k, opacity = 1 }) => (
  <g opacity={opacity}>
    {PENROSE.map((tri, i) => {
      const dist = Math.hypot((tri.a[0] + tri.b[0] + tri.d[0]) / 3, (tri.a[1] + tri.b[1] + tri.d[1]) / 3);
      const show = smooth((k * 1.3 - dist) / 0.3);
      if (show <= 0) return null;
      const P = (p: [number, number]) => `${cx + p[0] * R},${cy + p[1] * R}`;
      return (
        <g key={i} opacity={show}>
          <polygon points={`${P(tri.a)} ${P(tri.b)} ${P(tri.d)}`} fill={tri.c === 1 ? COL.gold : COL.emerald} fillOpacity={0.55} />
          <polyline points={`${P(tri.d)} ${P(tri.a)} ${P(tri.b)}`} fill="none" stroke={COL.bg} strokeWidth={1.6} />
        </g>
      );
    })}
  </g>
);

const Parthenon: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => {
  const h = w * 0.55;
  const cols = 8;
  return (
    <g stroke={COL.fg} strokeOpacity={0.75} strokeWidth={2.5} fill="none">
      <polygon points={`${x},${y + h * 0.28} ${x + w / 2},${y} ${x + w},${y + h * 0.28}`} />
      <rect x={x} y={y + h * 0.28} width={w} height={h * 0.1} />
      {Array.from({ length: cols }, (_, i) => {
        const cx = x + w * 0.06 + (i * w * 0.88) / (cols - 1);
        return <line key={i} x1={cx} x2={cx} y1={y + h * 0.38} y2={y + h * 0.92} strokeWidth={10} strokeOpacity={0.5} />;
      })}
      <rect x={x - w * 0.03} y={y + h * 0.92} width={w * 1.06} height={h * 0.08} />
    </g>
  );
};

// ── 文字 ───────────────────────────────────────────

const Cap: React.FC<{
  x?: number;
  y: number;
  size?: number;
  color?: string;
  opacity: number;
  align?: "center" | "left" | "right";
  weight?: number;
  width?: number;
  children: React.ReactNode;
}> = ({ x = LW / 2, y, size = 46, color = COL.fg, opacity, align = "center", weight = 600, width = 1600, children }) =>
  opacity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? x - width / 2 : align === "left" ? x : x - width,
        width,
        top: y,
        textAlign: align,
        fontFamily: serif,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.45,
        letterSpacing: "0.05em",
        color,
        opacity,
        transform: `translateY(${(1 - Math.min(1, opacity)) * 8}px)`,
        whiteSpace: "pre",
      }}
    >
      {children}
    </div>
  );

export const GoldenRatioLong: React.FC<LongProps> = ({ lines, starts, durs, voices, bgm, subtitles }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const n = lines.length;
  // 文 i の開始から f（0〜1）の位置の時刻
  const at = (i: number, f = 0) => (i >= n ? end : starts[i] + f * durs[i]);
  // 文 a の頭で出て、文 b の頭で消える（0.5秒のフェード）
  const on = (a: number, b: number, fa = 0) => ramp(t, at(a, fa) - 0.15, 0.5) * (1 - ramp(t, at(b) - 0.5, 0.5));
  const k = (i: number, f0 = 0, f1 = 1) => smooth((t - at(i, f0)) / Math.max(0.01, at(i, f1) - at(i, f0)));

  // 章の見出し（左上）
  const chapters = lines
    .map((l, i) => ({ i, title: l.chapter }))
    .filter((c): c is { i: number; title: string } => !!c.title && c.title !== "導入");

  // ── 導入：ひまわり ──
  const sfN = lerp(0, 420, smooth((t - at(0)) / (at(2) - at(0))));
  const hookAlpha = t < at(2) ? 1 / (PHI * PHI) : t < at(3) ? 137 / 360 : t < at(4) ? 138 / 360 : 137.5 / 360;
  const hookSwap = t < at(2) ? 1 : Math.min(ramp(t, at(2) - 0.2, 0.5), 1 - ramp(t, at(5) - 0.6, 0.5));
  const hookColor = t < at(2) ? COL.gold : t < at(4) ? COL.coral : COL.gold;

  // ── 導入：足し算の列 ──
  const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34];

  // ── 黄金比とは：棒を分ける ──
  const split = lerp(0.5, 1 / PHI, smooth((t - at(11)) / (at(13) - at(11))));
  const barX = 360;
  const barW = 1200;

  // ── 第1章：黄金長方形 ──
  const GR = { x: 960 - 405, y: 300, w: 810, h: 810 / PHI };
  const grCuts = cutSquares(GR.x, GR.y, GR.w, GR.h, 9);
  const cutCount =
    t < at(22, 0.4) ? 0 : t < at(24, 0.3) ? 1 : t < at(25) ? 2 : lerp(3, 9, smooth((t - at(25)) / (at(26) - at(25))));

  // ── 第2章：円周率の長方形 ──
  const PIH = 250;
  const PI_R = { x: 150, y: 260, w: Math.PI * PIH, h: PIH };
  const strip = (Math.PI - 3) * PIH;
  const ZOOM = 720 / PIH;
  const INSET = { x: 1080, y: 360, w: PIH * ZOOM, h: strip * ZOOM };

  // ── 第3章：正方形を足す（21×13 の長方形を切った正方形を、小さい順に見せる） ──
  const U = 34;
  const FIBR = { x: 960 - (21 * U) / 2, y: 190, w: 21 * U, h: 13 * U };
  const fibSquares = cutSquares(FIBR.x, FIBR.y, FIBR.w, FIBR.h, 7).reverse();
  const fibShown =
    t < at(61) ? 0 : t < at(62) ? 2 : t < at(63) ? 3 : lerp(4, 7, smooth((t - at(63)) / Math.max(0.1, durs[63])));

  // ── 第3章：割り算のグラフ ──
  const G = { x0: 260, x1: 1660, y0: 820, y1: 260 };
  const gy = (v: number) => lerp(G.y0, G.y1, (v - 1.2) / 0.9);
  const ratios = [2, 1.5, 5 / 3, 1.6, 13 / 8, 21 / 13, 34 / 21, 55 / 34];
  const ratios2 = [9 / 7, 16 / 9, 25 / 16, 41 / 25, 66 / 41, 107 / 66, 173 / 107];
  const gx = (i: number) => lerp(G.x0 + 60, G.x1 - 60, i / 7);
  const ratioShown = t < at(71) ? 0 : t < at(72) ? lerp(0, 3, k(71, 0, 0.9)) : lerp(3, 6, k(72, 0, 0.9)) + (t > at(73) ? lerp(0, 2, k(73, 0, 0.6)) : 0);

  // ── 第4章：ひまわりの角度 ──
  const sf4Alpha =
    t < at(85) ? 1 / (PHI * PHI) : t < at(86) ? 1 / 2 : t < at(86, 0.45) ? 1 / 3 : t < at(89) ? 2 / 5 : 1 / (PHI * PHI);
  const sf4N = t < at(82) ? 0 : t < at(85) ? lerp(0, 160, smooth((t - at(82)) / (at(85) - at(82)))) : 260;

  const L = (i: number) => lines[i]?.text ?? "";

  return (
    <AbsoluteFill style={{ backgroundColor: COL.bg }}>
      <svg width={LW} height={LH} style={{ position: "absolute" }}>
        {/* 導入：ひまわり（137度・138度・137.5度） */}
        <g opacity={on(0, 5) * hookSwap}>
          <Sunflower cx={960} cy={500} n={t < at(2) ? sfN : 420} alpha={hookAlpha} c={18} r={7} color={() => hookColor} />
        </g>

        {/* 導入：花と足し算を並べる */}
        <g opacity={on(7, 9)}>
          <Sunflower cx={520} cy={500} n={300} alpha={1 / (PHI * PHI)} c={15} r={6} />
        </g>

        {/* 黄金比とは：棒 */}
        <g opacity={on(10, 14)}>
          <rect x={barX} y={470} width={barW * split} height={26} fill={COL.gold} rx={4} />
          <rect x={barX + barW * split + 6} y={470} width={barW * (1 - split) - 6} height={26} fill={COL.emerald} rx={4} />
          <g opacity={ramp(t, at(11), 0.5)} stroke={COL.fg} strokeWidth={2} fill="none">
            <path d={`M ${barX} 440 V 420 H ${barX + barW} V 440`} />
            <path d={`M ${barX} 526 V 546 H ${barX + barW * split} V 526`} stroke={COL.gold} />
            <path d={`M ${barX + barW * split + 6} 526 V 546 H ${barX + barW} V 526`} stroke={COL.emerald} />
          </g>
        </g>

        {/* 黄金比とは：星形の五角形 */}
        <g opacity={on(14, 20)}>
          <Star cx={960} cy={480} R={300} k={k(14, 0.2, 0.9)} />
        </g>

        {/* 第1章：黄金長方形から正方形を切り取る */}
        <g opacity={on(21, 27)}>
          <rect x={GR.x} y={GR.y} width={GR.w} height={GR.h} fill="none" stroke={COL.fg} strokeWidth={3} />
          {grCuts.map((s, i) => {
            const kk = Math.max(0, Math.min(1, cutCount - i));
            return (
              <g key={i} opacity={kk}>
                <rect x={s.x} y={s.y} width={s.s} height={s.s} fill={i === Math.floor(cutCount) - 1 ? "rgba(245,158,11,0.12)" : "none"} stroke={COL.fg} strokeOpacity={0.7} strokeWidth={2} />
                <Arc d={s.arc} k={t > at(26) ? smooth((t - at(26) - i * 0.25) / 0.4) : 0} />
              </g>
            );
          })}
        </g>

        {/* 第1章：ケプラーの2つの宝 */}
        <g opacity={on(33, 35)}>
          <rect x={560} y={430} width={240} height={140} rx={8} fill={COL.gold} opacity={0.85} />
          <polygon points="1360,400 1450,470 1360,620 1270,470" fill="none" stroke={COL.gold} strokeWidth={5} />
          <polyline points="1270,470 1450,470" stroke={COL.gold} strokeWidth={3} />
        </g>

        {/* 第1章：パルテノン神殿と、測り方しだいの長方形 */}
        <g opacity={on(36, 39)}>
          <Parthenon x={560} y={300} w={800} />
          {[
            { x: 560, y: 300, w: 800, h: 440 },
            { x: 600, y: 410, w: 500, h: 309 },
            { x: 900, y: 300, w: 460, h: 284 },
          ].map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill="none"
              stroke={COL.coral}
              strokeWidth={3}
              strokeDasharray="12 10"
              opacity={ramp(t, at(37, 0.1 + i * 0.25), 0.4)}
            />
          ))}
        </g>

        {/* 第2章：円周率の長方形 */}
        <g opacity={on(43, 53)}>
          <rect x={PI_R.x} y={PI_R.y} width={PI_R.w} height={PI_R.h} fill="none" stroke={COL.fg} strokeWidth={3} />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={PI_R.x + i * PIH}
              y={PI_R.y}
              width={PIH}
              height={PIH}
              fill="rgba(240,244,248,0.06)"
              stroke={COL.fg}
              strokeWidth={2}
              opacity={ramp(t, at(44, 0.15 + i * 0.2), 0.3)}
            />
          ))}
          <g opacity={ramp(t, at(45), 0.5)}>
            <rect x={PI_R.x + 3 * PIH} y={PI_R.y} width={strip} height={PIH} fill="rgba(245,158,11,0.25)" stroke={COL.gold} strokeWidth={2} />
            <path
              d={`M ${PI_R.x + 3 * PIH + strip} ${PI_R.y} L ${INSET.x} ${INSET.y} M ${PI_R.x + 3 * PIH + strip} ${PI_R.y + PIH} L ${INSET.x} ${INSET.y + INSET.h}`}
              stroke={COL.gold}
              strokeOpacity={0.4}
              strokeWidth={1.5}
            />
            <rect x={INSET.x} y={INSET.y} width={INSET.w} height={INSET.h} fill="none" stroke={COL.gold} strokeWidth={2} />
            {Array.from({ length: 7 }, (_, i) => (
              <rect
                key={i}
                x={INSET.x + i * INSET.h}
                y={INSET.y}
                width={INSET.h}
                height={INSET.h}
                fill="rgba(245,158,11,0.12)"
                stroke={COL.gold}
                strokeWidth={2}
                opacity={ramp(t, at(45, 0.2 + i * 0.08), 0.25)}
              />
            ))}
          </g>
        </g>

        {/* 第2章：黄金比の長方形は1つずつ */}
        <g opacity={on(53, 60)}>
          <rect x={GR.x} y={GR.y - 60} width={GR.w} height={GR.h} fill="none" stroke={COL.fg} strokeWidth={3} />
          {cutSquares(GR.x, GR.y - 60, GR.w, GR.h, 9).map((s, i) => {
            const shown = lerp(0, 9, smooth((t - at(54)) / (at(56) - at(54))));
            return (
              <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} fill="rgba(245,158,11,0.10)" stroke={COL.gold} strokeWidth={2} opacity={Math.max(0, Math.min(1, shown - i))} />
            );
          })}
        </g>

        {/* 第3章：正方形を足していく */}
        <g opacity={on(61, 70) + on(76, 81)}>
          {fibSquares.map((s, i) => {
            const kk = t < at(76) ? Math.max(0, Math.min(1, fibShown - i)) : 1;
            const glow = t > at(78) ? ramp(t, at(78, 0.3), 0.6) : 0;
            return (
              <g key={i} opacity={kk}>
                <rect x={s.x} y={s.y} width={s.s} height={s.s} fill="rgba(240,244,248,0.04)" stroke={COL.fg} strokeOpacity={0.8} strokeWidth={2} />
                {s.s >= 2 * U ? (
                  <text x={s.x + s.s / 2} y={s.y + s.s / 2 + 12} textAnchor="middle" fontFamily="KaTeX_Main" fontSize={Math.min(40, s.s * 0.4)} fill={COL.fg} opacity={0.8}>
                    {Math.round(s.s / U)}
                  </text>
                ) : null}
                <Arc d={s.arc} k={glow} width={5} />
              </g>
            );
          })}
          <rect x={FIBR.x} y={FIBR.y} width={FIBR.w} height={FIBR.h} fill="none" stroke={COL.gold} strokeWidth={4} opacity={t > at(78) ? ramp(t, at(78), 0.5) : 0} />
        </g>

        {/* 第3章：割り算のグラフ */}
        <g opacity={on(71, 76)}>
          <line x1={G.x0} x2={G.x1} y1={gy(PHI)} y2={gy(PHI)} stroke={COL.gold} strokeWidth={2.5} strokeDasharray="14 10" />
          <line x1={G.x0} x2={G.x0} y1={G.y0} y2={G.y1} stroke={COL.faint} strokeWidth={2} />
          <polyline
            points={ratios
              .slice(0, Math.max(1, Math.floor(ratioShown) + 1))
              .map((v, i) => `${gx(i)},${gy(v)}`)
              .join(" ")}
            fill="none"
            stroke={COL.fg}
            strokeWidth={2}
            strokeOpacity={0.6}
          />
          {ratios.map((v, i) => (
            <circle key={i} cx={gx(i)} cy={gy(v)} r={10} fill={COL.fg} opacity={Math.max(0, Math.min(1, ratioShown - i + 1))} />
          ))}
          <g opacity={ramp(t, at(75, 0.3), 0.6)}>
            <polyline points={ratios2.map((v, i) => `${gx(i + 1)},${gy(v)}`).join(" ")} fill="none" stroke={COL.emerald} strokeWidth={2.5} />
            {ratios2.map((v, i) => (
              <circle key={i} cx={gx(i + 1)} cy={gy(v)} r={9} fill={COL.emerald} />
            ))}
          </g>
        </g>

        {/* 第4章：ひまわりの角度 */}
        <g opacity={on(82, 92)}>
          <Sunflower cx={760} cy={520} n={sf4N} alpha={sf4Alpha} c={20} r={7} color={() => (t > at(85) && t < at(89) ? COL.coral : COL.gold)} />
          {/* 1周を黄金比で分ける */}
          <g opacity={ramp(t, at(91), 0.5)}>
            <circle cx={1450} cy={520} r={170} fill="none" stroke={COL.faint} strokeWidth={3} />
            {(() => {
              const a = (2 * Math.PI) / (PHI * PHI);
              const p = { x: 1450 + 170 * Math.cos(-Math.PI / 2 + a), y: 520 + 170 * Math.sin(-Math.PI / 2 + a) };
              return (
                <>
                  <path d={`M 1450 520 L 1450 350 A 170 170 0 0 1 ${p.x} ${p.y} Z`} fill="rgba(245,158,11,0.35)" stroke={COL.gold} strokeWidth={3} />
                  <line x1={1450} y1={520} x2={p.x} y2={p.y} stroke={COL.gold} strokeWidth={3} />
                </>
              );
            })()}
          </g>
        </g>

        {/* 第4章：137度と138度 */}
        <g opacity={on(92, 94)}>
          <Sunflower cx={560} cy={520} n={420} alpha={137 / 360} c={17} r={6} color={() => COL.coral} />
          <Sunflower cx={1360} cy={520} n={420} alpha={138 / 360} c={17} r={6} color={() => COL.coral} />
        </g>

        {/* 第4章：渦巻きの本数（21本と34本） */}
        <g opacity={on(94, 97)}>
          <Sunflower
            cx={960}
            cy={520}
            n={700}
            alpha={1 / (PHI * PHI)}
            c={15}
            r={6}
            color={(kk) => {
              const family = t < at(94, 0.5) ? 21 : 34;
              // 同じ渦巻きに乗る種（番号を family で割った余りが同じ）を1本おきに色分けする
              return (kk % family) % 2 === 0 ? (family === 21 ? COL.gold : COL.emerald) : "rgba(240,244,248,0.22)";
            }}
          />
        </g>

        {/* 第4章：油の皿と液滴（ドゥアディとクデール） */}
        <g opacity={on(97, 101)}>
          <ellipse cx={960} cy={520} rx={360} ry={360} fill="none" stroke={COL.faint} strokeWidth={4} />
          <Sunflower
            cx={960}
            cy={520}
            n={lerp(0, 380, smooth((t - at(98)) / (at(100) - at(98))))}
            alpha={1 / (PHI * PHI)}
            c={17}
            r={7}
            color={() => COL.emerald}
          />
        </g>

        {/* 第4章：ひまわりを数えた市民の企画 */}
        <g opacity={on(102, 104)}>
          <rect x={460} y={560} width={1000} height={50} rx={8} fill="rgba(240,244,248,0.12)" />
          <rect x={460} y={560} width={800 * smooth(ramp(t, at(103, 0.3), 1))} height={50} rx={8} fill={COL.gold} />
        </g>

        {/* 第5章：ヒッパソスの伝説 */}
        <g opacity={on(104, 107)}>
          <Star cx={960} cy={440} R={230} k={1} color={COL.fg} width={3} />
          <g opacity={ramp(t, at(106), 0.6)}>
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={Array.from({ length: 41 }, (_, j) => `${j === 0 ? "M" : "L"} ${560 + j * 20} ${760 + i * 26 + 10 * Math.sin(j * 0.6 + t * 1.5 + i)}`).join(" ")}
                fill="none"
                stroke={COL.faint}
                strokeWidth={2}
              />
            ))}
          </g>
        </g>

        {/* 第5章：ペンローズの模様 */}
        <g opacity={on(108, 119) * (t > at(111) ? lerp(1, 0.25, ramp(t, at(111), 1)) : 1)}>
          <Penrose cx={960} cy={480} R={430} k={smooth((t - at(108, 0.3)) / (at(110) - at(108, 0.3)))} />
        </g>

        {/* まとめ：4つの場面 */}
        <g opacity={on(119, 123)}>
          <g opacity={ramp(t, at(119, 0.0), 0.5)}>
            <Star cx={560} cy={300} R={150} k={1} />
          </g>
          <g opacity={ramp(t, at(119, 0.2), 0.5)}>
            {cutSquares(1360 - 150, 300 - 93, 300, 300 / PHI, 7).map((s, i) => (
              <g key={i}>
                <rect x={s.x} y={s.y} width={s.s} height={s.s} fill="none" stroke={COL.fg} strokeOpacity={0.6} strokeWidth={1.5} />
                <Arc d={s.arc} k={1} width={3} />
              </g>
            ))}
          </g>
          <g opacity={ramp(t, at(119, 0.45), 0.5)}>
            <Sunflower cx={560} cy={770} n={260} alpha={1 / (PHI * PHI)} c={9} r={4} />
          </g>
          <g opacity={ramp(t, at(119, 0.7), 0.5)}>
            <Penrose cx={1360} cy={770} R={170} k={1} />
          </g>
          <circle cx={960} cy={535} r={60} fill="none" stroke={COL.gold} strokeWidth={4} opacity={ramp(t, at(120), 0.6) * (0.6 + 0.4 * Math.sin(t * 2))} />
        </g>
      </svg>

      {/* ── 章の見出し（左上） ── */}
      {chapters.map((c, ci) => {
        const next = chapters[ci + 1]?.i ?? n;
        return (
          <Cap key={c.i} x={80} y={50} size={30} color={COL.gold} align="left" opacity={on(c.i, next) * 0.9}>
            {c.title}
          </Cap>
        );
      })}

      {/* ── 導入 ── */}
      <Cap y={900} size={64} color={hookColor} opacity={on(2, 5) * (t < at(3) ? 1 : 0)}>
        <Tex src="137^\circ" />
      </Cap>
      <Cap y={900} size={64} color={COL.coral} opacity={on(3, 5) * (t < at(4) ? 1 : 0)}>
        <Tex src="138^\circ" />
      </Cap>
      <Cap y={900} size={72} color={COL.gold} opacity={on(4, 5)}>
        <Tex src="137.5^\circ" />
      </Cap>
      {FIB.map((v, i) => (
        <Cap key={i} x={360 + i * 150} y={360} size={72} opacity={on(5, 7) * ramp(t, at(5, 0.25 + i * 0.07), 0.3)}>
          <Tex src={`${v}`} />
        </Cap>
      ))}
      {[2, 1.5, 5 / 3, 1.6, 1.625, 21 / 13, 34 / 21].map((v, i) => (
        <Cap key={i} x={435 + (i + 1) * 150} y={520} size={36} color={COL.faint} opacity={on(6, 7) * ramp(t, at(6, 0.1 + i * 0.08), 0.3)}>
          <Tex src={v.toFixed(3)} />
        </Cap>
      ))}
      <Cap y={680} size={96} color={COL.gold} opacity={on(6, 7, 0.65)}>
        <Tex src="1.618\ldots" />
      </Cap>
      <Cap x={1360} y={380} size={60} opacity={on(7, 9)}>
        <Tex src="1,\ 1,\ 2,\ 3,\ 5,\ 8,\ 13" />
      </Cap>
      <Cap x={1360} y={520} size={80} color={COL.gold} opacity={on(7, 9)}>
        <Tex src="1.618\ldots" />
      </Cap>
      <Cap y={880} size={54} opacity={on(8, 9)}>
        なぜ、同じ数が現れるのか
      </Cap>

      {/* ── 黄金比とは ── */}
      <Cap y={250} size={96} color={COL.gold} weight={700} opacity={on(9, 10)}>
        黄金比
      </Cap>
      <Cap x={barX + barW / 2} y={340} size={40} opacity={on(11, 14)}>
        全体
      </Cap>
      <Cap x={barX + (barW * split) / 2} y={560} size={40} color={COL.gold} opacity={on(11, 14)}>
        長い部分
      </Cap>
      <Cap x={barX + barW * split + (barW * (1 - split)) / 2} y={560} size={40} color={COL.emerald} opacity={on(11, 14)}>
        短い部分
      </Cap>
      <Cap y={720} size={52} opacity={on(11, 14)}>
        全体 : <span style={{ color: COL.gold }}>長い</span> ＝ <span style={{ color: COL.gold }}>長い</span> : <span style={{ color: COL.emerald }}>短い</span>
      </Cap>
      <Cap y={830} size={80} color={COL.gold} opacity={on(13, 14)}>
        <Tex src="\approx 1.618" />
      </Cap>
      <Cap y={880} size={44} opacity={on(14, 16)}>
        紀元前6世紀ごろ　ピタゴラスの弟子たち
      </Cap>
      <Cap y={880} size={44} opacity={on(16, 17)}>
        紀元前300年ごろ　エウクレイデス『原論』
      </Cap>
      <Cap y={880} size={52} opacity={on(17, 18)}>
        外中比
      </Cap>
      <Cap y={880} size={44} opacity={on(18, 20)}>
        1835年　「黄金」という呼び名が広まる
      </Cap>

      {/* ── 第1章 ── */}
      <Cap y={880} size={44} opacity={on(21, 22)}>
        縦 : 横 ＝ 1 : 1.618
      </Cap>
      <Cap y={880} size={44} opacity={on(23, 26)}>
        残りも同じ形
      </Cap>
      {[
        { i: 28, src: "1.618^2 = 2.618 = 1.618 + 1" },
        { i: 29, src: "1.618^3 = 4.236 = 1.618 + 2.618" },
        { i: 30, src: "1.618^4 = 6.854 = 2.618 + 4.236" },
      ].map((r, j) => (
        <Cap key={j} y={300 + j * 150} size={64} color={t > at(r.i + 1) ? COL.faint : COL.fg} opacity={on(r.i, 32)}>
          <Tex src={r.src} />
        </Cap>
      ))}
      <Cap y={800} size={52} color={COL.gold} opacity={on(31, 32)}>
        かけ算の中に、足し算の列
      </Cap>
      <Cap y={880} size={44} opacity={on(32, 35)}>
        1600年ごろ　ヨハネス・ケプラー
      </Cap>
      <Cap x={680} y={620} size={40} opacity={on(33, 35)}>
        ピタゴラスの定理
      </Cap>
      <Cap x={1360} y={650} size={40} color={COL.gold} opacity={on(33, 35)}>
        黄金比
      </Cap>
      <Cap y={880} size={44} opacity={on(38, 39)}>
        1992年　数学者マーコウスキー
      </Cap>
      <Cap y={880} size={44} color={COL.coral} opacity={on(37, 38)}>
        測る場所を選べば、たいていの比は作れる
      </Cap>
      <Cap y={460} size={54} opacity={on(40, 41)}>
        なぜ、花や足し算に現れるのか
      </Cap>

      {/* ── 第2章 ── */}
      <Cap x={PI_R.x + PI_R.w / 2} y={170} size={44} opacity={on(43, 53)}>
        縦 1 × 横 3.14…（円周率）
      </Cap>
      {[
        { v: "3", i: 44 },
        { v: "7", i: 45 },
        { v: "15", i: 46 },
        { v: "1", i: 46, f: 0.5 },
        { v: "292", i: 51 },
      ].map((d, j) => (
        <Cap
          key={j}
          x={560 + j * 200}
          y={700}
          size={d.v === "292" ? 84 : 64}
          color={d.v === "292" || (d.v === "15" && t > at(49) && t < at(50)) ? COL.gold : COL.fg}
          opacity={on(d.i, 53, d.f ?? 0.3)}
        >
          <Tex src={d.v} />
        </Cap>
      ))}
      <Cap x={560} y={790} size={30} color={COL.faint} opacity={on(44, 53)}>
        1度に切り取れた数
      </Cap>
      <Cap y={880} size={56} opacity={on(48, 50)}>
        <Tex src="\dfrac{22}{7} = 3.1428\ldots" />　<span style={{ fontSize: 40 }}>差 0.04%</span>
      </Cap>
      <Cap y={880} size={56} opacity={on(50, 52)}>
        <Tex src="\dfrac{355}{113} = 3.1415929\ldots" />　<span style={{ fontSize: 40 }}>差 約1000万分の1</span>
      </Cap>
      <Cap y={880} size={44} opacity={on(52, 53)}>
        5世紀の中国　祖沖之
      </Cap>
      {Array.from({ length: 8 }, (_, j) => (
        <Cap key={j} x={560 + j * 115} y={760} size={60} color={COL.gold} opacity={on(54, 60) * ramp(t, lerp(at(54), at(56), j / 8), 0.3)}>
          {j === 7 ? <Tex src="\cdots" /> : <Tex src="1" />}
        </Cap>
      ))}
      <Cap y={880} size={50} color={COL.gold} opacity={on(56, 57)}>
        分数でいちばん近づきにくい数
      </Cap>
      <Cap y={880} size={44} opacity={on(57, 58)}>
        1891年　アドルフ・フルヴィッツ
      </Cap>
      <Cap y={880} size={54} color={COL.gold} opacity={on(59, 60)}>
        いちばん割り切れない数
      </Cap>

      {/* ── 第3章 ── */}
      <Cap y={860} size={60} opacity={on(64, 66)}>
        <Tex src="1,\ 1,\ 2,\ 3,\ 5,\ 8,\ 13" />
      </Cap>
      <Cap y={940} size={44} color={COL.gold} opacity={on(65, 70)}>
        フィボナッチ数列
      </Cap>
      <Cap y={860} size={44} opacity={on(66, 69)}>
        1202年　ピサのレオナルド『算盤の書』
      </Cap>
      <Cap y={860} size={40} opacity={on(69, 70)}>
        「フィボナッチ」は、600年以上あとにつけられたあだ名
      </Cap>
      {[
        "2 \\div 1 = 2",
        "3 \\div 2 = 1.5",
        "5 \\div 3 = 1.667",
        "8 \\div 5 = 1.6",
        "13 \\div 8 = 1.625",
        "21 \\div 13 = 1.615",
      ].map((s, i) => (
        <Cap key={i} x={gx(i)} y={i % 2 === 0 ? gy(ratios[i]) - 80 : gy(ratios[i]) + 22} size={30} opacity={on(71, 76) * Math.max(0, Math.min(1, ratioShown - i + 1))}>
          <Tex src={s} />
        </Cap>
      ))}
      <Cap x={G.x1 - 10} y={gy(PHI) - 62} size={40} color={COL.gold} align="right" width={400} opacity={on(71, 76)}>
        <Tex src="1.618\ldots" />
      </Cap>
      <Cap y={900} size={44} color={COL.emerald} opacity={on(75, 76)}>
        2, 7, 9, 16, 25, 41 … から始めても
      </Cap>
      <Cap y={900} size={44} opacity={on(77, 78)}>
        切り取れるのは、いつも1つずつ
      </Cap>
      <Cap y={900} size={44} color={COL.gold} opacity={on(78, 80)}>
        1つずつ足すと、黄金比の長方形に育つ
      </Cap>
      <Cap y={900} size={44} opacity={on(80, 81)}>
        1611年　ケプラー
      </Cap>

      {/* ── 第4章 ── */}
      <Cap x={1450} y={300} size={48} opacity={on(84, 91)}>
        1回に回す角度 ＝ 1周 ×
      </Cap>
      <Cap x={1450} y={420} size={96} color={COL.coral} opacity={on(85, 86)}>
        <Tex src="\tfrac{1}{2}" />
      </Cap>
      <Cap x={1450} y={420} size={96} color={COL.coral} opacity={on(86, 89) * (t < at(86, 0.45) ? 1 : 0)}>
        <Tex src="\tfrac{1}{3}" />
      </Cap>
      <Cap x={1450} y={420} size={96} color={COL.coral} opacity={on(86, 89) * (t >= at(86, 0.45) ? 1 : 0)}>
        <Tex src="\tfrac{2}{5}" />
      </Cap>
      <Cap x={1450} y={620} size={44} color={COL.coral} opacity={on(87, 89)}>
        いつか同じ向きに戻る
      </Cap>
      <Cap x={1450} y={760} size={64} color={COL.gold} opacity={on(91, 92)}>
        <Tex src="137.5^\circ" />
      </Cap>
      <Cap y={880} size={50} color={COL.gold} opacity={on(90, 92)}>
        分数でいちばん近づきにくい割合
      </Cap>
      <Cap x={560} y={900} size={52} color={COL.coral} opacity={on(92, 94)}>
        <Tex src="137^\circ" />
      </Cap>
      <Cap x={1360} y={900} size={52} color={COL.coral} opacity={on(92, 94)}>
        <Tex src="138^\circ" />
      </Cap>
      <Cap x={1560} y={460} size={64} color={COL.gold} opacity={on(94, 97) * (t < at(94, 0.5) ? 1 : 0)}>
        21本
      </Cap>
      <Cap x={1560} y={460} size={64} color={COL.emerald} opacity={on(94, 97) * (t >= at(94, 0.5) ? 1 : 0)}>
        34本
      </Cap>
      <Cap y={940} size={44} opacity={on(97, 99)}>
        1992年　ステファン・ドゥアディ、イヴ・クデール
      </Cap>
      <Cap y={940} size={44} color={COL.emerald} opacity={on(100, 101)}>
        前の種から一番離れた場所に置く
      </Cap>
      <Cap y={460} size={52} opacity={on(101, 102)}>
        アラン・チューリング（1912–1954）
      </Cap>
      <Cap y={440} size={44} opacity={on(102, 104)}>
        2012年　イギリスの市民が育てたひまわり　657個
      </Cap>
      <Cap y={650} size={52} color={COL.gold} opacity={on(103, 104, 0.4)}>
        およそ8割がフィボナッチ数の渦巻き
      </Cap>

      {/* ── 第5章 ── */}
      <Cap y={880} size={44} opacity={on(105, 107)}>
        伝説　ヒッパソス
      </Cap>
      <Cap y={960} size={40} opacity={on(108, 110)}>
        1974年　ロジャー・ペンローズ
      </Cap>
      <Cap y={960} size={40} opacity={on(110, 111)}>
        <span style={{ color: COL.gold }}>太いひし形</span> : <span style={{ color: COL.emerald }}>細いひし形</span> → <Tex src="1.618\ldots" />
      </Cap>
      <Cap y={460} size={52} opacity={on(111, 113)}>
        1982年　ダン・シェヒトマン
      </Cap>
      <Cap y={570} size={44} color={COL.gold} opacity={on(112, 113)}>
        準結晶
      </Cap>
      <Cap y={420} size={44} opacity={on(113, 115)}>
        ライナス・ポーリング（ノーベル賞2回）
      </Cap>
      <Cap y={540} size={56} color={COL.coral} opacity={on(114, 115)}>
        「準結晶などない。いるのは準科学者だけだ」
      </Cap>
      <Cap y={500} size={56} color={COL.gold} opacity={on(116, 117)}>
        2011年　ノーベル化学賞
      </Cap>
      <Cap y={500} size={54} opacity={on(117, 119)}>
        {"割り切れないことは、欠点ではなかった"}
      </Cap>

      {/* ── まとめ ── */}
      <Cap y={500} size={56} opacity={on(121, 123)}>
        同じ操作をくり返しても、同じ形に戻らない
      </Cap>
      <Cap y={400} size={46} color={COL.faint} opacity={on(122, 125)}>
        全体と部分が同じ比になる分け方
      </Cap>
      <Cap y={520} size={64} color={COL.gold} weight={700} opacity={on(124, 125)}>
        いちばん割り切れない数
      </Cap>
      <Cap y={640} size={46} opacity={on(124, 125, 0.5)}>
        ずれを残し続ける数
      </Cap>
      <Cap y={420} size={50} opacity={on(126, 128)}>
        0〜9の数字は、同じ割合で現れるのか
      </Cap>
      <Cap y={540} size={40} color={COL.faint} opacity={on(127, 128)}>
        まだ誰も証明していない
      </Cap>
      {/* 最後に流れていく数字 */}
      <div
        style={{
          position: "absolute",
          top: 470,
          left: 0,
          whiteSpace: "nowrap",
          fontFamily: "KaTeX_Main",
          fontSize: 88,
          letterSpacing: "0.12em",
          color: COL.fg,
          opacity: on(128, n + 1) * (1 - ramp(t, end - 2.5, 2)),
          transform: `translateX(${lerp(1300, -1500, (t - at(128)) / Math.max(1, end - at(128)))}px)`,
        }}
      >
        <span style={{ color: COL.gold }}>1.618</span>
        {PHI_DIGITS.slice(5)}
      </div>

      {/* ナレーション */}
      {voices.map((v, i) =>
        v ? (
          <Sequence key={i} from={Math.round(starts[i] * fps)}>
            <Audio src={staticFile(v)} />
          </Sequence>
        ) : null,
      )}
      {bgm ? (
        <Audio
          src={staticFile(`bgm/${bgm}`)}
          volume={(f) =>
            interpolate(f, [0, 60, durationInFrames - 120, durationInFrames], [0, BGM_VOLUME, BGM_VOLUME, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
          loop
        />
      ) : null}

      {/* 極小の字幕（既定はオフ） */}
      {subtitles
        ? lines.map((_, i) => (
            <Cap key={i} y={1010} size={26} color={COL.faint} opacity={on(i, i + 1)}>
              {L(i)}
            </Cap>
          ))
        : null}
    </AbsoluteFill>
  );
};
