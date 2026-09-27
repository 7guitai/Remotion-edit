import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, roundedFont, useScale } from "../theme";

const STAR_COUNT = 90;

// 星空・月・ふわふわ浮かぶ「Z」の背景（動画全体で共通）
export const NightSky: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { s } = useScale();

  const stars = useMemo(
    () =>
      new Array(STAR_COUNT).fill(0).map((_, i) => ({
        x: random(`x${i}`) * width,
        y: random(`y${i}`) * height,
        r: 1 + random(`r${i}`) * 2.5,
        phase: random(`p${i}`) * Math.PI * 2,
        speed: 0.03 + random(`s${i}`) * 0.06,
      })),
    [width, height],
  );

  const moonFloat = Math.sin(frame / 40) * 8 * s;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.skyTop} 0%, ${COLORS.skyBottom} 100%)`,
        overflow: "hidden",
      }}
    >
      {stars.map((st, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: st.x,
            top: st.y,
            width: st.r * 2 * s,
            height: st.r * 2 * s,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.35 + 0.65 * Math.abs(Math.sin(frame * st.speed + st.phase)),
            boxShadow: `0 0 ${6 * s}px rgba(255,255,255,0.8)`,
          }}
        />
      ))}

      {/* 月 */}
      <div
        style={{
          position: "absolute",
          right: 110 * s,
          top: 70 * s + moonFloat,
          width: 170 * s,
          height: 170 * s,
          borderRadius: "50%",
          background: COLORS.moon,
          boxShadow: `0 0 ${80 * s}px ${20 * s}px rgba(255,244,199,0.35)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 48 * s,
            top: -18 * s,
            width: 170 * s,
            height: 170 * s,
            borderRadius: "50%",
            background: COLORS.skyTop,
          }}
        />
      </div>

      {/* ふわふわ上っていく Z */}
      {new Array(6).fill(0).map((_, i) => {
        const cycle = 240;
        const t = ((frame + i * 40) % cycle) / cycle;
        const baseX = random(`zx${i}`) * width;
        return (
          <div
            key={`z${i}`}
            style={{
              position: "absolute",
              left: baseX + Math.sin(t * Math.PI * 4) * 30 * s,
              top: height * (1.05 - t * 1.1),
              fontFamily: roundedFont,
              fontWeight: 800,
              fontSize: (40 + random(`zs${i}`) * 40) * s,
              color: "rgba(255,255,255,0.18)",
              opacity: interpolate(t, [0, 0.15, 0.8, 1], [0, 1, 1, 0]),
              transform: `rotate(${-15 + t * 30}deg)`,
            }}
          >
            Z
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
