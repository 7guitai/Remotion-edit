import React from "react";
import { interpolate } from "remotion";
import { fontFamily } from "../theme";

// 中央のシンプル字幕（画面の上から約60%）。白文字＋細い黒の縁取り＋ドロップシャドウ。HUD・帯・タイトルは出さない
export const CenterCaption: React.FC<{ text: string; age: number; sub?: string }> = ({ text, age, sub }) => {
  const a = interpolate(age, [0, 0.18], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(age, [0, 0.25], [14, 0], { extrapolateRight: "clamp" });
  const lines = text.split("\n");
  const longest = Math.max(...lines.map((l) => l.length));
  const size = longest > 16 ? 54 : longest > 13 ? 60 : 66;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: "60%", transform: `translateY(calc(-50% + ${y}px))`, display: "flex", flexDirection: "column", alignItems: "center", opacity: a, pointerEvents: "none" }}>
      {sub ? (
        <div style={{ fontFamily, fontWeight: 700, fontSize: 34, color: "#cbd5e1", letterSpacing: 2, marginBottom: 14, textShadow: "0 2px 8px rgba(0,0,0,0.85)", WebkitTextStroke: "1px rgba(0,0,0,0.7)" }}>{sub}</div>
      ) : null}
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.3,
            color: "#ffffff",
            WebkitTextStroke: "2px #0b0b0b",
            paintOrder: "stroke fill",
            textShadow: "0 4px 14px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.9)",
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};
