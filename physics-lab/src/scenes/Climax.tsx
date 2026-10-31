import React from "react";
import { interpolate } from "remotion";
import { THEME, cardShadow } from "../config/theme";

type Props = { alive: number; framesSinceChange: number };

/** 残り3個以下: 「FINAL n」表示と周辺減光 */
export const Climax: React.FC<Props> = ({ alive, framesSinceChange }) => {
  const bannerIn = interpolate(framesSinceChange, [0, 6], [0.7, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 220px rgba(40,25,10,0.28)" }} />
      {alive > 1 && (
        <div style={{ position: "absolute", top: 1380, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${bannerIn})` }}>
          <div style={{ padding: "14px 48px", borderRadius: 999, background: THEME.text, boxShadow: cardShadow, fontFamily: THEME.font, fontWeight: 800, fontSize: 72, letterSpacing: 4, color: "#fff" }}>
            FINAL <span style={{ color: THEME.accent }}>{alive}</span>
          </div>
        </div>
      )}
    </div>
  );
};
