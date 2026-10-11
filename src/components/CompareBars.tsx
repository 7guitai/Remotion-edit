import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 検証動画の「結果くらべ」の横棒グラフ（たて動画の映像エリア 1080×1000。字幕にかからないよう y≈620 まで）
// 棒は順番に伸び、数字はカウントアップする
export type CompareSpec = {
  title: string;
  rows: { label: string; value: number; unit?: string; color?: string }[];
  note?: string;
  max?: number;
};

const COLORS = ["#ff4a3d", "#2f8bff", "#1f8f4e", "#ff8a00"];

export const CompareBars: React.FC<{ spec: CompareSpec; width: number; height: number }> = ({ spec, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const max = spec.max ?? Math.max(...spec.rows.map((r) => r.value));
  const W = 640;
  const rowH = Math.min(150, 380 / spec.rows.length);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #1d3a66 0%, #0b1020 75%)" }}>
      <svg width={width} height={height} viewBox="0 0 1080 1000" preserveAspectRatio="xMidYMin slice" style={{ position: "absolute", inset: 0 }}>
        <text x={540} y={120} fontFamily={fontFamily} fontWeight={900} fontSize={54} textAnchor="middle" fill="#ffe600" stroke="#0b1020" strokeWidth={10} paintOrder="stroke">
          {spec.title}
        </text>
        {spec.rows.map((r, i) => {
          const g = interpolate(t, [0.2 + i * 0.5, 1.0 + i * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const ease = 1 - (1 - g) ** 3;
          const y = 170 + i * (rowH + 20);
          const w = (r.value / max) * W * ease;
          const color = r.color ?? COLORS[i % COLORS.length];
          return (
            <g key={r.label}>
              <text x={60} y={y - 10} fontFamily={fontFamily} fontWeight={900} fontSize={40} fill="#fff" stroke="#0b1020" strokeWidth={7} paintOrder="stroke">
                {r.label}
              </text>
              <rect x={60} y={y} width={Math.max(4, w)} height={rowH * 0.62} rx={14} fill={color} />
              <text x={60 + w + 18} y={y + rowH * 0.45} fontFamily={fontFamily} fontWeight={900} fontSize={52} fill="#fff" stroke="#0b1020" strokeWidth={9} paintOrder="stroke">
                {`${Math.round(r.value * ease).toLocaleString()}`}
                <tspan fontSize={32}>{r.unit ?? ""}</tspan>
              </text>
            </g>
          );
        })}
        {spec.note && t > 0.6 + spec.rows.length * 0.5 ? (
          <text x={540} y={622} fontFamily={fontFamily} fontWeight={900} fontSize={40} textAnchor="middle" fill="#9fd3ff" stroke="#0b1020" strokeWidth={8} paintOrder="stroke">
            {spec.note}
          </text>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};
