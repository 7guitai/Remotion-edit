import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { TEAMS } from "../physics/teams";
import { useStyle } from "../styles/context";
import { Card } from "./Card";
import { TeamBallIcon } from "./TeamBallIcon";

/** 冒頭の「24 → 1」と GO! */
export const Countdown: React.FC<{ frame: number; total: number; introFrames: number }> = ({ frame, total, introFrames }) => {
  const s = useStyle();
  const { fps } = useVideoConfig();
  const inScale = spring({ frame, fps, config: { damping: 13 } });
  const out = interpolate(frame, [introFrames - 8, introFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const goFrame = frame - introFrames;
  const goScale = spring({ frame: goFrame, fps, config: { damping: 9, stiffness: 160 } });
  const goOpacity = interpolate(goFrame, [0, 14, 22], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dark = s.id === "noir";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontFamily: s.font }}>
      {frame < introFrames && (
        <Card style={{ opacity: out, transform: `scale(${inScale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "40px 70px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, fontWeight: 800, fontSize: 170, lineHeight: 1 }}>
            <span>{total}</span>
            <span style={{ fontSize: 110, color: s.sub }}>→</span>
            <span style={{ color: s.accent }}>1</span>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {TEAMS.map((t) => (
              <TeamBallIcon key={t.id} color={s.teams[t.id].color} size={56} />
            ))}
          </div>
        </Card>
      )}
      {goFrame >= 0 && goOpacity > 0 && (
        <div
          style={{
            opacity: goOpacity,
            transform: `scale(${0.6 + goScale * 0.6})`,
            fontWeight: 800,
            fontSize: 210,
            color: dark ? s.accent : "#fff",
            WebkitTextStroke: `10px ${dark ? "#000" : s.text}`,
            paintOrder: "stroke fill",
            textShadow: s.shadow.blur > 0 ? "0 14px 30px rgba(0,0,0,0.3)" : `10px 12px 0 ${s.text}`,
          }}
        >
          GO!
        </div>
      )}
    </div>
  );
};
