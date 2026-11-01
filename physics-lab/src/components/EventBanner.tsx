import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { useStyle } from "../styles/context";

/** 後半のイベント（DOUBLE EXIT / SUDDEN DEATH など）を知らせる大きなバナー */
export const EventBanner: React.FC<{ label: string; age: number }> = ({ label, age }) => {
  const s = useStyle();
  const { fps } = useVideoConfig();
  if (age < 0 || age > 50) return null;
  const sc = spring({ frame: age, fps, config: { damping: 9, stiffness: 180 } });
  const out = interpolate(age, [40, 50], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = age < 10 ? Math.sin(age * 3) * (10 - age) : 0;
  return (
    <div style={{ position: "absolute", top: 1040, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", opacity: out }}>
      <div
        style={{
          transform: `translateX(${shake}px) scale(${0.4 + sc * 0.6}) rotate(-3deg)`,
          padding: "22px 56px",
          borderRadius: 26,
          background: s.accent,
          border: "6px solid #fff",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          fontFamily: s.font,
          fontWeight: 800,
          fontSize: 96,
          letterSpacing: 4,
          color: "#fff",
          textShadow: "0 4px 0 rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        {label}!
      </div>
    </div>
  );
};
