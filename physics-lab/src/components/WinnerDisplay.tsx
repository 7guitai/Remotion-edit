import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { THEME, cardShadow } from "../config/theme";
import { TeamBallIcon } from "./TeamBallIcon";

type Props = {
  framesSinceWin: number;
  color: string;
  teamName: string;
  number: number;
  total: number;
  timeout: boolean;
};

/** 勝者カード */
export const WinnerDisplay: React.FC<Props> = ({ framesSinceWin, color, teamName, number, total, timeout }) => {
  const { fps } = useVideoConfig();
  const f = framesSinceWin - 18;
  if (f < 0) return null;
  const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 120 } });
  const bob = interpolate(Math.sin(f * 0.12), [-1, 1], [-6, 6]);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", justifyContent: "center", pointerEvents: "none", fontFamily: THEME.font }}>
      <div style={{ transform: `scale(${s})`, display: "flex", alignItems: "center", gap: 40, padding: "34px 60px 34px 44px", borderRadius: 52, background: THEME.card, boxShadow: cardShadow, borderBottom: `10px solid ${color}` }}>
        <div style={{ transform: `translateY(${bob}px)` }}>
          <TeamBallIcon color={color} size={190} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 100, lineHeight: 1, color: THEME.text }}>WINNER</div>
          <div style={{ fontWeight: 800, fontSize: 52, lineHeight: 1.15, color }}>
            {teamName} <span style={{ color: THEME.sub, fontSize: 40 }}>#{number} · 1/{total}{timeout ? " · TIME UP" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
