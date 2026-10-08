import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

// 「もし地球に輪があったら」：地上から見上げた空を横切る輪（夜と昼）
export const RingSky: React.FC<{ day?: boolean }> = ({ day }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // カメラがゆっくり上を見上げる
  const lift = interpolate(frame, [0, durationInFrames], [0, 60]);
  const cx = width * 0.42;
  const cy = height * 1.55 + lift;
  // 輪は何本もの細い楕円の帯でできている（内側から外側へ）
  const bands = Array.from({ length: 60 }, (_, i) => {
    const u = i / 59;
    const n = 0.5 + 0.3 * Math.sin(u * 37.1) + 0.2 * Math.sin(u * 91.3 + 0.4);
    const gap = u > 0.6 && u < 0.67 ? 0.1 : 1;
    return { u, a: Math.max(0, Math.min(1, n)) * gap };
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: day
            ? "linear-gradient(180deg, #2f7fe0 0%, #79b8f2 55%, #d9efff 100%)"
            : "linear-gradient(180deg, #02040f 0%, #0a1438 60%, #1e2f66 100%)",
        }}
      />
      {day
        ? null
        : Array.from({ length: 220 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${random(`rs-x${i}`) * 100}%`,
                top: `${random(`rs-y${i}`) * 85}%`,
                width: 1.5 + random(`rs-r${i}`) * 2.5,
                height: 1.5 + random(`rs-r${i}`) * 2.5,
                borderRadius: "50%",
                background: "#fff",
                opacity: 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(frame / 10 + random(`rs-p${i}`) * 6)),
              }}
            />
          ))}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={day ? 3 : 6} />
          </filter>
        </defs>
        <g filter={day ? undefined : "url(#ringGlow)"} opacity={day ? 0.55 : 0.9}>
          {bands.map(({ u, a }, i) => {
            const rx = width * (1.05 + u * 0.45);
            const ry = height * (1.05 + u * 0.32);
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="none"
                stroke={day ? "#ffffff" : `rgb(${235 - u * 30},${225 - u * 40},${200 - u * 60})`}
                strokeWidth={9}
                opacity={a}
              />
            );
          })}
        </g>
        {/* 地平線の山なみ（シルエット） */}
        <path
          d={`M0 ${height} L0 ${height * 0.86} Q ${width * 0.12} ${height * 0.78} ${width * 0.24} ${height * 0.84} T ${width * 0.5} ${height * 0.8} T ${width * 0.76} ${height * 0.85} T ${width} ${height * 0.79} L ${width} ${height} Z`}
          fill={day ? "#2c5a3a" : "#03060f"}
        />
      </svg>
    </AbsoluteFill>
  );
};
