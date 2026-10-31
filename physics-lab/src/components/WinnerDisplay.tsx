import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { THEME, neonText } from "../config/theme";

type Props = {
  framesSinceWin: number;
  color: string;
  number: number;
  total: number;
  timeout: boolean;
};

/** 勝者カード（画面下寄りの中央。アリーナ内の勝者自体はハイライトで別途強調） */
export const WinnerDisplay: React.FC<Props> = ({ framesSinceWin, color, number, total, timeout }) => {
  const { fps } = useVideoConfig();
  const f = framesSinceWin - 18;
  if (f < 0) return null;
  const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 120 } });
  const shine = interpolate(f % 40, [0, 20, 40], [0.7, 1, 0.7]);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1330, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          transform: `scale(${s})`,
          display: "flex",
          alignItems: "center",
          gap: 40,
          padding: "34px 56px",
          borderRadius: 48,
          background: "rgba(4,1,13,0.86)",
          border: `5px solid ${THEME.yellow}`,
          boxShadow: `0 0 ${70 * shine}px ${THEME.yellow}`,
        }}
      >
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 95,
            background: color,
            border: "6px solid #fff",
            boxShadow: `0 0 70px ${color}, inset -18px -22px 0 rgba(0,0,0,0.22)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: THEME.font,
            fontWeight: 900,
            fontSize: 100,
            color: "#05010f",
          }}
        >
          {number}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: THEME.font, fontWeight: 900, fontSize: 104, color: THEME.yellow, textShadow: neonText(THEME.yellow), lineHeight: 1 }}>
            WINNER
          </div>
          <div style={{ fontFamily: THEME.font, fontWeight: 700, fontSize: 50, color: THEME.white, lineHeight: 1.2 }}>
            #{number} · 1 / {total}
            {timeout ? " · TIME UP" : ""}
          </div>
        </div>
      </div>
    </div>
  );
};
