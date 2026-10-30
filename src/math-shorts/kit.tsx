import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

// 数学ショート共通の見た目（黒背景・明朝体・KaTeX・点灯／減光）

export const W = 1080;
export const H = 1920;

export const serif = "NotoSerifJP";
loadFont({ family: serif, url: staticFile("fonts/NotoSerifJP-600.ttf"), weight: "600" });
loadFont({ family: serif, url: staticFile("fonts/NotoSerifJP-700.ttf"), weight: "700" });

// KaTeX の数式フォントが読み込まれるまでレンダリングを待つ
const katexFonts = delayRender("KaTeX fonts");
Promise.all(
  ["60px KaTeX_Main", "italic 60px KaTeX_Math", "60px KaTeX_Size1", "60px KaTeX_Size2"].map(
    (f) => document.fonts.load(f),
  ),
).then(() => continueRender(katexFonts));

export const C = {
  bg: "#000000",
  white: "#FFFFFF",
  dim: "#6E6E6E",
  // 要素A（収束・抑える側）と要素B（発散・進める側）
  a: "#E2C48E",
  b: "#5AC8E8",
  card: "rgba(255,255,255,0.45)",
};

// 3ゾーン（Y座標）
export const ZONE = {
  top: [0.08 * H, 0.26 * H],
  mid: [0.28 * H, 0.68 * H],
  bottom: [0.7 * H, 0.9 * H],
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// start から dur 秒かけて 0→1
export const ramp = (t: number, start: number, dur = 0.3) => smooth((t - start) / dur);

// 点灯（白）→ 減光（灰）→ 消える の状態。切り替えは 0.3 秒
export type Life = { on: number; dim?: number; off?: number };
const FADE = 0.3;

const mixHex = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], k))).join(",")})`;
};

export const lifeStyle = (t: number, life: Life, color: string = C.white) => {
  const opacity = ramp(t, life.on, FADE) * (life.off === undefined ? 1 : 1 - ramp(t, life.off, FADE));
  const k = life.dim === undefined ? 0 : ramp(t, life.dim, FADE);
  return { opacity, color: mixHex(color, C.dim, k), dimK: k };
};

export const Tex: React.FC<{ src: string; size?: number }> = ({ src, size }) => (
  <span
    style={{ fontSize: size }}
    dangerouslySetInnerHTML={{ __html: katex.renderToString(src, { throwOnError: false }) }}
  />
);

// 横中央そろえの1行（見出し・数式・ラベル）
export const Line: React.FC<{
  t: number;
  life: Life;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  x?: number;
  width?: number;
  children: React.ReactNode;
}> = ({ t, life, y, size = 64, color, weight = 700, x = 0, width = W, children }) => {
  const s = lifeStyle(t, life, color);
  if (s.opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        width,
        top: y,
        height: size * 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: size * 0.3,
        fontFamily: serif,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: "0.04em",
        color: s.color,
        opacity: s.opacity,
        whiteSpace: "nowrap",
        transform: `translateY(${(1 - ramp(t, life.on, FADE)) * 12}px)`,
      }}
    >
      {children}
    </div>
  );
};

// 立体的な球（放射状グラデーション＋左上の白いハイライト）
export const SphereDefs: React.FC = () => (
  <defs>
    <radialGradient id="sphere-blue" cx="35%" cy="32%" r="70%">
      <stop offset="0%" stopColor="#4FA8D5" />
      <stop offset="100%" stopColor="#0F4C81" />
    </radialGradient>
    <radialGradient id="sphere-gold" cx="35%" cy="32%" r="70%">
      <stop offset="0%" stopColor="#F6E2B8" />
      <stop offset="100%" stopColor="#9C7A3C" />
    </radialGradient>
  </defs>
);

export const Sphere: React.FC<{
  x: number;
  y: number;
  r: number;
  gold?: number;
  opacity?: number;
}> = ({ x, y, r, gold = 0, opacity = 1 }) => (
  <g opacity={opacity}>
    <circle cx={x} cy={y} r={r} fill="url(#sphere-blue)" />
    {gold > 0 ? <circle cx={x} cy={y} r={r} fill="url(#sphere-gold)" opacity={gold} /> : null}
    <ellipse
      cx={x - r * 0.32}
      cy={y - r * 0.38}
      rx={r * 0.36}
      ry={r * 0.22}
      fill="#fff"
      opacity={0.55}
      transform={`rotate(-30 ${x - r * 0.32} ${y - r * 0.38})`}
    />
  </g>
);

// 中央ゾーンの図解の切り替え（0.35 秒でクロスフェード）
export const sceneOpacity = (t: number, start: number, end: number) =>
  ramp(t, start - 0.35, 0.35) * (1 - ramp(t, end - 0.35, 0.35));
