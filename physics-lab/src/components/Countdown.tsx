import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { THEME, cardShadow } from "../config/theme";
import { TEAMS } from "../physics/teams";
import { TeamBallIcon } from "./TeamBallIcon";

/** 冒頭の「24 → 1」と GO! */
export const Countdown: React.FC<{ frame: number; total: number; introFrames: number }> = ({ frame, total, introFrames }) => {
  const { fps } = useVideoConfig();
  const inScale = spring({ frame, fps, config: { damping: 13 } });
  const out = interpolate(frame, [introFrames - 8, introFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const goFrame = frame - introFrames;
  const goScale = spring({ frame: goFrame, fps, config: { damping: 9, stiffness: 160 } });
  const goOpacity = interpolate(goFrame, [0, 14, 22], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontFamily: THEME.font }}>
      {frame < introFrames && (
        <div style={{ opacity: out, transform: `scale(${inScale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "40px 70px", borderRadius: 48, background: THEME.card, boxShadow: cardShadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, fontWeight: 800, fontSize: 170, lineHeight: 1, color: THEME.text }}>
            <span>{total}</span>
            <span style={{ fontSize: 110, color: THEME.sub }}>→</span>
            <span style={{ color: THEME.accent }}>1</span>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {TEAMS.map((t) => (
              <TeamBallIcon key={t.id} color={t.color} size={56} />
            ))}
          </div>
        </div>
      )}
      {goFrame >= 0 && goOpacity > 0 && (
        <div style={{ opacity: goOpacity, transform: `scale(${0.6 + goScale * 0.6})`, fontWeight: 800, fontSize: 210, color: "#fff", WebkitTextStroke: `10px ${THEME.text}`, paintOrder: "stroke fill", textShadow: "0 14px 30px rgba(40,30,20,0.3)" }}>
          GO!
        </div>
      )}
    </div>
  );
};
