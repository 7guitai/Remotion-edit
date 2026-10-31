import React from "react";
import { interpolate } from "remotion";
import { THEME, neonText } from "../config/theme";

type Props = {
  alive: number;
  total: number;
  /** 直近で残数が減ってからのフレーム数（ポップ演出用） */
  framesSinceChange: number;
  danger: boolean;
};

/** 画面上部の残数カウンター */
export const Counter: React.FC<Props> = ({ alive, total, framesSinceChange, danger }) => {
  const pop = interpolate(framesSinceChange, [0, 4, 12], [1.35, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = danger ? THEME.red : alive <= 1 ? THEME.yellow : THEME.white;
  const glow = danger ? THEME.red : THEME.cyan;
  return (
    <div style={{ position: "absolute", top: 160, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 28 }}>
      <div style={{ width: 70, height: 70, borderRadius: 35, background: `radial-gradient(circle at 35% 35%, #fff, ${glow} 45%, #001a22)`, boxShadow: `0 0 30px ${glow}` }} />
      <div style={{ fontFamily: THEME.font, fontWeight: 900, fontSize: 132, lineHeight: 1, color, textShadow: neonText(glow, 0.9), transform: `scale(${pop})`, minWidth: 190, textAlign: "center" }}>
        {alive}
      </div>
      <div style={{ fontFamily: THEME.font, fontWeight: 700, fontSize: 52, color: THEME.dim }}>/ {total}</div>
    </div>
  );
};
