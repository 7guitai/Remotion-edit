import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { THEME, neonText } from "../config/theme";

/** 冒頭の「24 → 1」と GO! */
export const Countdown: React.FC<{ frame: number; total: number; introFrames: number }> = ({ frame, total, introFrames }) => {
  const { fps } = useVideoConfig();
  const inScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOut = interpolate(frame, [introFrames - 8, introFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const goFrame = frame - introFrames;
  const goScale = spring({ frame: goFrame, fps, config: { damping: 9, stiffness: 160 } });
  const goOpacity = interpolate(goFrame, [0, 14, 22], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      {frame < introFrames && (
        <div style={{ opacity: titleOut, transform: `scale(${inScale})`, display: "flex", alignItems: "center", gap: 36, padding: "36px 60px", borderRadius: 40, background: "rgba(4,1,13,0.72)", border: `4px solid ${THEME.cyan}`, boxShadow: `0 0 60px ${THEME.cyan}` }}>
          <span style={{ fontFamily: THEME.font, fontWeight: 900, fontSize: 190, color: THEME.white, textShadow: neonText(THEME.cyan) }}>{total}</span>
          <span style={{ fontFamily: THEME.font, fontWeight: 900, fontSize: 120, color: THEME.magenta, textShadow: neonText(THEME.magenta) }}>→</span>
          <span style={{ fontFamily: THEME.font, fontWeight: 900, fontSize: 190, color: THEME.yellow, textShadow: neonText(THEME.yellow) }}>1</span>
        </div>
      )}
      {goFrame >= 0 && goOpacity > 0 && (
        <div style={{ opacity: goOpacity, transform: `scale(${0.6 + goScale * 0.6})`, fontFamily: THEME.font, fontWeight: 900, fontSize: 220, color: THEME.yellow, textShadow: neonText(THEME.yellow, 1.3) }}>
          GO!
        </div>
      )}
    </div>
  );
};
