import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 地球の断面（地殻・マントル・外核・内核）と、中心を通る穴。穴の中を「あなた」の点が動く。
// 中身が均一な地球なら、穴の中の動きはばねと同じ単振動になる：
//   位置 x = R cos(πt)、速さ v = v_max sin(πt)（t は片道を 1 としたときの時間）
//   片道 約42分、中心での速さ 約7.9km/s（時速 約2万8000km）

export type CutMode = "intro" | "fall" | "center" | "cross" | "oscillate" | "chord" | "core";

const R_KM = 6371;
const ONE_WAY_MIN = 42;
const VMAX_KMH = 28000;

// 各層の外側の半径（地球の半径に対する割合）
const LAYERS = [
  { r: 1.0, color: "#6b4a2b", name: "地殻" },
  { r: 0.985, color: "#e0703a", name: "マントル" },
  { r: 0.546, color: "#f2a33a", name: "外核" },
  { r: 0.19, color: "#ffe27a", name: "内核" },
];

const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export const EarthCut: React.FC<{ mode: CutMode; width: number; height: number }> = ({
  mode,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const cx = width / 2;
  // 下の字幕にかからないよう、少し上に小さめに置く
  const cy = height * 0.37;
  const R = Math.min(width, height) * 0.3;

  // 片道を 1 としたときの時間 t（場面ごとに、どこからどこまで見せるか）
  let t = 0;
  if (mode === "fall") t = 0.5 * smoothstep(p * 1.15);
  if (mode === "center") t = 0.5;
  if (mode === "cross") t = smoothstep(p * 1.1);
  if (mode === "oscillate") t = 3 * p; // 1.5往復
  if (mode === "chord") t = smoothstep(p * 1.1);
  const tunnelX = mode === "chord" ? 0 : 0;
  // 穴の向き：ふつうは上（日本）から下（反対側）へ。chord は地表近くの弦（東京→大阪のイメージ）
  const chordY = R * 0.3;
  const chordHalf = Math.sqrt(R * R - chordY * chordY);
  const pos =
    mode === "chord"
      ? { x: cx - chordHalf * Math.cos(Math.PI * t), y: cy + chordY }
      : { x: cx + tunnelX, y: cy - R * Math.cos(Math.PI * t) };
  const speed = VMAX_KMH * Math.abs(Math.sin(Math.PI * t));
  const minutes = (mode === "oscillate" ? t : t) * ONE_WAY_MIN;
  const depth = mode === "chord" ? 0 : R_KM * (1 - Math.cos(Math.PI * t));
  const zoom = mode === "core" ? interpolate(p, [0, 1], [1.4, 2.0]) : mode === "intro" ? interpolate(p, [0, 1], [0.9, 1]) : 1;
  const glow = 0.5 + 0.5 * Math.sin(frame / 6);
  const showDot = mode !== "core" && mode !== "intro";
  const trail = Array.from({ length: 10 }, (_, k) => {
    const tt = Math.max(0, t - (k + 1) * 0.012);
    return mode === "chord"
      ? { x: cx - chordHalf * Math.cos(Math.PI * tt), y: cy + chordY }
      : { x: cx, y: cy - R * Math.cos(Math.PI * tt) };
  });

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #10183c 0%, #04060f 70%)" }}>
      {Array.from({ length: 120 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${random(`ec-x${i}`) * 100}%`,
            top: `${random(`ec-y${i}`) * 100}%`,
            width: 2,
            height: 2,
            borderRadius: 1,
            background: "#fff",
            opacity: 0.3 + 0.5 * random(`ec-o${i}`),
          }}
        />
      ))}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${cx}px ${cy}px` }}
      >
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0" stopColor="#fffbe0" />
            <stop offset="0.6" stopColor="#ffd34d" />
            <stop offset="1" stopColor="#ff9d2e" />
          </radialGradient>
        </defs>
        {/* 大気のうすい光 */}
        <circle cx={cx} cy={cy} r={R * 1.04} fill="#5fb0ff" opacity={0.18} />
        {LAYERS.map((l, i) => (
          <circle
            key={l.name}
            cx={cx}
            cy={cy}
            r={R * l.r}
            fill={i === LAYERS.length - 1 ? "url(#coreGlow)" : l.color}
          />
        ))}
        {/* 地表（海と陸のうすい皮） */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2f7fe0" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={R * 0.19 * (1.05 + 0.05 * glow)} fill="#fff4b0" opacity={0.25} />
        {/* 層の名前 */}
        {mode === "intro" || mode === "core"
          ? LAYERS.slice(1).map((l, i) => (
              <text
                key={l.name}
                x={cx + R * (i === 0 ? 0.62 : i === 1 ? 0.3 : 0)}
                y={cy + (i === 2 ? 8 : -R * (i === 0 ? 0.55 : 0.18))}
                fontFamily={fontFamily}
                fontWeight={900}
                fontSize={i === 2 ? 30 : 38}
                textAnchor="middle"
                fill="#2a1200"
                opacity={0.85}
              >
                {l.name}
              </text>
            ))
          : null}
        {/* 穴 */}
        {mode === "chord" ? (
          <line x1={cx - chordHalf} y1={cy + chordY} x2={cx + chordHalf} y2={cy + chordY} stroke="#0b0b14" strokeWidth={20} strokeLinecap="round" />
        ) : mode === "core" ? null : (
          <line x1={cx} y1={cy - R - 10} x2={cx} y2={cy + R + 10} stroke="#0b0b14" strokeWidth={20} />
        )}
        {mode !== "core" ? (
          <>
            <text x={mode === "chord" ? cx - chordHalf : cx} y={(mode === "chord" ? cy + chordY : cy - R) - 34} fontFamily={fontFamily} fontWeight={900} fontSize={40} textAnchor="middle" fill="#fff" stroke="#000" strokeWidth={8} paintOrder="stroke">
              {mode === "chord" ? "東京" : "日本"}
            </text>
            <text x={mode === "chord" ? cx + chordHalf : cx + 36} y={mode === "chord" ? cy + chordY - 34 : cy + R - 4} fontFamily={fontFamily} fontWeight={900} fontSize={40} textAnchor={mode === "chord" ? "middle" : "start"} fill="#fff" stroke="#000" strokeWidth={8} paintOrder="stroke">
              {mode === "chord" ? "大阪" : "反対側（ブラジル沖）"}
            </text>
          </>
        ) : null}
        {/* 点の軌跡と「あなた」 */}
        {showDot
          ? trail.map((q, k) => <circle key={k} cx={q.x} cy={q.y} r={14 - k} fill="#ff3b5c" opacity={0.5 - k * 0.045} />)
          : null}
        {showDot ? (
          <g>
            <circle cx={pos.x} cy={pos.y} r={20} fill="#ff3b5c" stroke="#fff" strokeWidth={6} />
            <text x={pos.x + 34} y={pos.y + 12} fontFamily={fontFamily} fontWeight={900} fontSize={34} fill="#fff" stroke="#000" strokeWidth={7} paintOrder="stroke">
              あなた
            </text>
          </g>
        ) : null}
      </svg>
      {/* メーター */}
      {showDot ? (
        <div style={{ position: "absolute", left: 30, top: 30, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["時速", `${Math.round(speed).toLocaleString()} km`],
            ["経過", `${Math.floor(minutes)}分`],
            ...(mode === "chord" ? [] : [["距離", `${Math.round(Math.min(depth, 2 * R_KM)).toLocaleString()} km`]]),
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: 40,
                color: "#7dff9a",
                background: "rgba(0,0,0,0.65)",
                border: "3px solid rgba(125,255,154,0.6)",
                borderRadius: 14,
                padding: "2px 18px",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#fff", fontSize: 30, marginRight: 12 }}>{k}</span>
              {v}
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
