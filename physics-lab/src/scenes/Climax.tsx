import React from "react";
import { interpolate } from "remotion";
import { useStyle } from "../styles/context";

type Props = { alive: number; framesSinceChange: number };

/** 残り3個以下: 「FINAL n」表示と周辺減光 */
export const Climax: React.FC<Props> = ({ alive, framesSinceChange }) => {
  const s = useStyle();
  const bannerIn = interpolate(framesSinceChange, [0, 6], [0.7, 1], { extrapolateRight: "clamp" });
  const pillBg = s.id === "noir" ? s.accent : s.text;
  const pillText = s.id === "noir" ? "#111" : "#fff";
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 220px ${s.vignette}` }} />
      {alive > 1 && (
        <div style={{ position: "absolute", top: 1380, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${bannerIn})` }}>
          <div style={{ padding: "14px 48px", borderRadius: 999, background: pillBg, boxShadow: s.card.shadow, fontFamily: s.font, fontWeight: 800, fontSize: 72, letterSpacing: 4, color: pillText }}>
            FINAL <span style={{ color: s.id === "noir" ? "#111" : s.accent }}>{alive}</span>
          </div>
        </div>
      )}
    </div>
  );
};
