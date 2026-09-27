import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, headingFont, outline, roundedFont, useScale } from "../theme";

export const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { s } = useScale();

  const main = spring({ frame, fps, config: { damping: 14 } });
  const sub = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 40 * s,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: headingFont,
          fontSize: 140 * s,
          color: COLORS.moon,
          textShadow: outline("#2b1a66", 10 * s),
          transform: `scale(${main})`,
        }}
      >
        おやすみなさい
      </div>
      <div
        style={{
          fontFamily: roundedFont,
          fontWeight: 800,
          fontSize: 50 * s,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.6,
          opacity: sub,
          transform: `translateY(${interpolate(sub, [0, 1], [40 * s, 0])}px)`,
        }}
      >
        今夜はぐっすり眠れますように 🌙
        <br />
        <span
          style={{
            display: "inline-block",
            marginTop: 20 * s,
            background: "#ff3b3b",
            padding: `${10 * s}px ${40 * s}px`,
            borderRadius: 14 * s,
          }}
        >
          高評価・チャンネル登録よろしくね！
        </span>
      </div>
    </AbsoluteFill>
  );
};
