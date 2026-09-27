import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TRIVIA } from "../data";
import { COLORS, headingFont, outline, roundedFont, useScale } from "../theme";

export const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { s, vertical } = useScale();

  const pop = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 11, mass: 0.7 } });

  const kicker = pop(0);
  const title = pop(10);
  const count = pop(24);
  const wobble = Math.sin(frame / 8) * 3;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 30 * s,
      }}
    >
      <div
        style={{
          fontFamily: roundedFont,
          fontWeight: 800,
          fontSize: 64 * s,
          color: COLORS.skyTop,
          background: COLORS.cyan,
          padding: `${10 * s}px ${40 * s}px`,
          borderRadius: 999,
          transform: `scale(${kicker})`,
        }}
      >
        知らないと損する！？
      </div>

      <div
        style={{
          fontFamily: headingFont,
          fontSize: (vertical ? 150 : 190) * s,
          color: COLORS.yellow,
          textShadow: outline("#2b1a66", 12 * s),
          lineHeight: 1.1,
          textAlign: "center",
          transform: `scale(${title}) rotate(${wobble * (1 - Math.min(1, frame / 60))}deg)`,
        }}
      >
        睡眠の雑学
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10 * s,
          transform: `translateY(${interpolate(count, [0, 1], [80 * s, 0])}px)`,
          opacity: count,
        }}
      >
        <span
          style={{
            fontFamily: headingFont,
            fontSize: 170 * s,
            color: COLORS.pink,
            textShadow: outline("#fff", 10 * s),
          }}
        >
          {TRIVIA.length}
        </span>
        <span
          style={{
            fontFamily: headingFont,
            fontSize: 100 * s,
            color: "#fff",
            textShadow: outline(COLORS.pink, 8 * s),
          }}
        >
          選
        </span>
      </div>
    </AbsoluteFill>
  );
};
