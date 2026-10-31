import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";
import { SlimeScene } from "./SlimeScene";
import { JengaScene } from "./JengaScene";

// 3DCGシミュレーション（画面いっぱい・ナレーションなし）の1場面。上に大きな文字（例：「ねばり気 5%」）
export type CGSlide = {
  type: "cg";
  // 画面上の大きな文字
  text: string;
  speech?: string;
  // 場面の種類（省略でスライム）。jenga は文字などを場面の中で出す
  scene?: "slime" | "jenga";
  // スライムのねばり気（0〜1）
  visc?: number;
  simStart?: number;
};

export const CGPage: React.FC<{ slide: CGSlide }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const pop = interpolate(frame, [0, 8], [0.85, 1], { extrapolateRight: "clamp" });
  if (slide.scene === "jenga") {
    return <JengaScene width={width} height={height} />;
  }
  return (
    <AbsoluteFill>
      <SlimeScene visc={slide.visc ?? 0.5} width={width} height={height} offset={Math.round((slide.simStart ?? 0) * fps)} />
      <div
        style={{
          position: "absolute",
          top: 230,
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontWeight: 900,
          fontSize: 118,
          color: "#ffffff",
          letterSpacing: 2,
          textShadow: "0 6px 18px rgba(0,0,0,0.35), 0 2px 0 rgba(0,0,0,0.25)",
          transform: `scale(${pop})`,
        }}
      >
        {slide.text}
      </div>
    </AbsoluteFill>
  );
};
