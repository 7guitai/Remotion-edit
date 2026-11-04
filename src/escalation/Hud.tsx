import React from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { fontFamily } from "../theme";

// 9:16 フルスクリーン用の文字（白文字＋黒の太い縁取り、重要な数値は黄色）
const outline = (px: number): React.CSSProperties => ({
  WebkitTextStroke: `${px}px #000`,
  paintOrder: "stroke fill",
});
const YELLOW = "#ffe600";

// 左上のリアルタイム HUD（経過時間・物理量の名前・値・サブ指標・バッジ）
export const Hud: React.FC<{
  seconds: string;
  label: string;
  value: string;
  sub: string;
  badge: { text: string; red?: boolean } | null;
}> = ({ seconds, label, value, sub, badge }) => (
  <div style={{ position: "absolute", left: 44, top: 120, fontFamily, fontWeight: 900, color: "#fff", lineHeight: 1.12 }}>
    <div style={{ fontSize: 76, ...outline(12) }}>{seconds}</div>
    <div style={{ fontSize: 40, marginTop: 6, ...outline(9) }}>{label}</div>
    <div style={{ fontSize: 92, color: YELLOW, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", ...outline(14) }}>{value}</div>
    <div style={{ fontSize: 46, marginTop: 4, ...outline(10) }}>{sub}</div>
    {badge ? (
      <div
        style={{
          display: "inline-block",
          marginTop: 14,
          padding: "8px 26px",
          borderRadius: 999,
          fontSize: 38,
          background: badge.red ? "rgba(214,32,32,0.88)" : "rgba(0,0,0,0.6)",
          border: "3px solid rgba(255,255,255,0.75)",
        }}
      >
        {badge.text}
      </div>
    ) : null}
  </div>
);

// 右上の「▶▶ 早送り」／「▶ ふつうの速さ」
export const SpeedTag: React.FC<{ fast: boolean; sinceNormal: number }> = ({ fast, sinceNormal }) => {
  if (!fast && (sinceNormal < 0 || sinceNormal > 1.6)) return null;
  return (
    <div style={{ position: "absolute", right: 44, top: 132, fontFamily, fontWeight: 900, fontSize: 58, color: YELLOW, ...outline(11) }}>
      {fast ? "▶▶ 早送り" : "▶ ふつうの速さ"}
    </div>
  );
};

// 上中央のカウントダウン「3 → 2 → 1」（frame はカウントダウン開始からのフレーム）
export const Countdown: React.FC<{ frame: number; fps: number; seconds: number }> = ({ frame, fps, seconds }) => {
  if (frame >= seconds * fps) return null;
  const n = seconds - Math.floor(frame / fps);
  const local = frame % fps;
  const s = spring({ frame: local, fps, config: { damping: 9, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 330,
        width: "100%",
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: 330,
        color: YELLOW,
        transform: `scale(${0.4 + 0.6 * s})`,
        opacity: interpolate(local, [fps * 0.8, fps], [1, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        ...outline(26),
      }}
    >
      {n}
    </div>
  );
};

// 下の実況テロップ（Shorts の UI にかからない、下から約27%の高さ）
export const Caption: React.FC<{ text: string; age: number; size?: number }> = ({ text, age, size = 62 }) => {
  const pop = interpolate(age, [0, 0.12, 0.22], [0.75, 1.06, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 500, pointerEvents: "none" }}>
      <div
        style={{
          fontFamily,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.28,
          color: "#fff",
          textAlign: "center",
          whiteSpace: "pre-line",
          padding: "0 40px",
          transform: `scale(${pop})`,
          ...outline(13),
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// 最後の小さな注釈
export const Note: React.FC<{ text: string; age: number }> = ({ text, age }) => (
  <div
    style={{
      position: "absolute",
      bottom: 300,
      width: "100%",
      textAlign: "center",
      fontFamily,
      fontWeight: 800,
      fontSize: 34,
      lineHeight: 1.4,
      color: "#fff",
      whiteSpace: "pre-line",
      opacity: interpolate(age, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
      ...outline(7),
    }}
  >
    {text}
  </div>
);
