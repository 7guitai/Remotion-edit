import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { fontFamily } from "../theme";
import { SleepBackground } from "./SleepPage";
import { blackRim } from "./ThreadPage";

export type SleepThumbnailProps = {
  kicker: string;
  catchCopy: string;
  hours: string;
  tag: string;
};

const outline = (
  size: number,
  color: string,
  gradient?: string,
): React.CSSProperties => ({
  fontFamily,
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
  whiteSpace: "pre-line",
  ...(gradient
    ? {
        background: gradient,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }
    : { color }),
});

// 文字の下に白フチ＋黒フチを重ねる
const Rimmed: React.FC<{
  text: string;
  size: number;
  color?: string;
  gradient?: string;
  style?: React.CSSProperties;
}> = ({ text, size, color = "#fff", gradient, style }) => (
  <div style={{ position: "relative", ...style }}>
    <div
      aria-hidden
      style={{
        ...outline(size, "#fff"),
        position: "absolute",
        inset: 0,
        // 白い文字は濃紺のフチ、グラデーションの文字は白フチ＋黒フチ
        color: gradient ? "#fff" : "#141638",
        WebkitTextStroke: gradient
          ? `${size * 0.16}px #fff`
          : `${size * 0.2}px #141638`,
        filter: gradient
          ? blackRim(size * 0.05)
          : "drop-shadow(0 6px 10px rgba(0,0,0,0.6))",
      }}
    >
      {text}
    </div>
    <div style={{ ...outline(size, color, gradient), position: "relative" }}>
      {text}
    </div>
  </div>
);

// 睡眠用動画のサムネイル（1280×720）
export const SleepThumbnail: React.FC<SleepThumbnailProps> = ({
  kicker,
  catchCopy,
  hours,
  tag,
}) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <AbsoluteFill
      style={{
        transform: "scale(0.6667)",
        transformOrigin: "0 0",
        width: 1920,
        height: 1080,
      }}
    >
      <SleepBackground showDog={false} />
    </AbsoluteFill>
    <Img
      src={staticFile("illustrations/sleep_animal_dog.png")}
      style={{
        position: "absolute",
        right: 30,
        bottom: 40,
        width: 470,
        filter: "brightness(0.95)",
      }}
    />
    {["Z", "z", "Z"].map((z, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          right: 120 - i * 40,
          top: 160 + i * 70,
          fontFamily,
          fontWeight: 900,
          fontSize: 90 - i * 18,
          color: "#c9b8ff",
          textShadow: "0 0 18px rgba(170,150,255,0.8)",
          transform: "rotate(-12deg)",
        }}
      >
        {z}
      </div>
    ))}
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        padding: "8px 40px 10px 60px",
        background: "linear-gradient(90deg, #2340ff, #3b6bff)",
        clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)",
        fontFamily,
        fontWeight: 900,
        fontSize: 44,
        color: "#fff",
      }}
    >
      {tag}
    </div>
    <Rimmed
      text={kicker}
      size={96}
      style={{ position: "absolute", left: 40, top: 26 }}
    />
    <Rimmed
      text={catchCopy}
      size={128}
      gradient="linear-gradient(180deg, #8ff4ff 0%, #3aa8ff 55%, #2f5cff 100%)"
      style={{ position: "absolute", left: 44, top: 160 }}
    />
    <div
      style={{
        position: "absolute",
        left: 40,
        bottom: 26,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <Rimmed text="雑学" size={120} />
      <Rimmed text={hours} size={150} style={{ marginLeft: 10 }} />
      <Rimmed
        text="時間"
        size={70}
        style={{ marginLeft: 6, marginBottom: 14 }}
      />
    </div>
    <AbsoluteFill style={{ border: "10px solid #fff", borderRadius: 26 }} />
  </AbsoluteFill>
);
