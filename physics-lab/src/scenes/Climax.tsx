import React from "react";
import { interpolate } from "remotion";
import { THEME, neonText } from "../config/theme";

type Props = { frame: number; alive: number; speed: number; framesSinceChange: number };

/** 残り3個以下: 「FINAL n」バナー、赤いビネット、スロー時のシネマバー */
export const Climax: React.FC<Props> = ({ frame, alive, speed, framesSinceChange }) => {
  const slow = speed > 0 && speed < 1 ? (1 - speed) / 0.65 : 0;
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.4);
  const bannerIn = interpolate(framesSinceChange, [0, 6], [0.6, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${180 + 80 * pulse}px rgba(255,30,70,${0.35 + 0.2 * pulse})` }} />
      {alive > 1 && (
        <div style={{ position: "absolute", top: 1338, left: 0, right: 0, textAlign: "center", transform: `scale(${bannerIn})` }}>
          <span style={{ fontFamily: THEME.font, fontWeight: 900, fontSize: 92, color: THEME.red, textShadow: neonText(THEME.red), letterSpacing: 6 }}>
            FINAL {alive}
          </span>
        </div>
      )}
      {slow > 0 && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 48 * slow, background: "#000" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 48 * slow, background: "#000" }} />
        </>
      )}
    </div>
  );
};
