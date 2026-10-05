import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreadSlide } from "../episodes";
import { ResolvedSlide } from "../slides";
import { fontFamily } from "../theme";

const WIDTH = 1000;
// レスの文字色（指定がなければ順番に使う）
const REPLY_COLORS = ["#5b3a17", "#1d9a2c", "#1f5fc4", "#d0271d"];

export const charWidth = (line: string) =>
  [...line].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.58 : 1), 0);

export type SunburstColors = {
  base: string;
  ray1: string;
  ray2: string;
  // 中心の明るさと、外側の暗さ
  center: string;
  edge: string;
};

const YELLOW: SunburstColors = {
  base: "#ffb300",
  ray1: "#ffd84a",
  ray2: "#ffae00",
  center: "rgba(255,250,210,0.85)",
  edge: "rgba(200,90,0,0.55)",
};

// 集中線（ゆっくり回す）。色を指定しなければ黄色〜オレンジ
export const Sunburst: React.FC<{
  colors?: SunburstColors;
  speed?: number;
}> = ({ colors = YELLOW, speed = 0.08 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: colors.base }}>
      <div
        style={{
          position: "absolute",
          left: -900,
          top: -700,
          width: 2880,
          height: 3320,
          background: `repeating-conic-gradient(from 0deg at 50% 50%, ${colors.ray1} 0deg 6deg, ${colors.ray2} 6deg 12deg)`,
          transform: `rotate(${frame * speed}deg)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${colors.center} 0%, rgba(255,255,255,0.15) 30%, rgba(0,0,0,0) 60%, ${colors.edge} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const blackRim = (w: number) =>
  [
    [w, 0],
    [-w, 0],
    [0, w],
    [0, -w],
    [w * 0.7, w * 0.7],
    [-w * 0.7, w * 0.7],
    [w * 0.7, -w * 0.7],
    [-w * 0.7, -w * 0.7],
  ]
    .map(([x, y]) => `drop-shadow(${x}px ${y}px 0 #000)`)
    .join(" ") + ` drop-shadow(0 0 ${w * 1.5}px rgba(0,0,0,0.7))`;

// 赤いグラデーションの文字＋白フチ＋黒いぼかしフチ（行ごとに横幅いっぱいの大きさにする）
const Headline: React.FC<{ text: string; maxSize: number; top: number }> = ({
  text,
  maxSize,
  top,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const lines = text.split("\n");
  const layer = (line: string, size: number, style: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: "-0.03em",
        textAlign: "center",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {line}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
      }}
    >
      {lines.map((line, i) => {
        const size = Math.min(
          maxSize,
          Math.floor(WIDTH / Math.max(1, charWidth(line))),
        );
        return (
          <div key={i} style={{ position: "relative", height: size * 1.16 }}>
            {layer(line, size, {
              color: "#fff",
              WebkitTextStroke: `${size * 0.26}px #fff`,
              // 白フチの外側だけに黒フチ（8方向にずらした影＋ぼかし）
              filter: blackRim(size * 0.06),
            })}
            {layer(line, size, {
              background:
                "linear-gradient(180deg, #ff3b2f 0%, #c4100f 45%, #6d0000 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            })}
          </div>
        );
      })}
    </div>
  );
};

// レス：白い角丸の枠に色付きの太字
const Reply: React.FC<{
  text: string;
  color: string;
  start: number;
}> = ({ text, color, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) {
    return null;
  }
  const pop = spring({
    frame: frame - start,
    fps,
    config: { damping: 13, mass: 0.6 },
  });
  const longest = Math.max(...text.split("\n").map(charWidth));
  const size = Math.min(96, Math.floor(860 / Math.max(1, longest)));
  return (
    <div
      style={{
        background: "#ffffff",
        border: "8px solid #111",
        borderRadius: 42,
        padding: "30px 40px",
        boxShadow: "0 14px 0 rgba(0,0,0,0.25)",
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.18,
        color,
        whiteSpace: "pre-line",
        transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
        opacity: Math.min(1, pop * 2),
      }}
    >
      {text}
    </div>
  );
};

// 2ch風：集中線の背景に大きな見出し、イラストの上にレスが順番に出る
export const ThreadPage: React.FC<{
  resolved: ResolvedSlide;
  slide: ThreadSlide;
}> = ({ resolved, slide }) => {
  const lines = slide.text.split("\n").length;
  // レスのない「スレタイ」ページは見出しを大きく、イラストを下に
  const opener = (slide.replies ?? []).length === 0;
  const headTop = opener ? 230 : 190;
  const maxSize = opener ? 190 : lines >= 3 ? 170 : 190;
  return (
    <AbsoluteFill>
      <Sunburst />
      {resolved.hasImage ? (
        <div
          style={{
            position: "absolute",
            top: opener ? 1060 : 880,
            left: 0,
            right: 0,
            height: opener ? 520 : 660,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{
              width: 900,
              height: opener ? 500 : 640,
              objectFit: "contain",
            }}
          />
        </div>
      ) : null}
      <Headline text={slide.text} maxSize={maxSize} top={headTop} />
      <div
        style={{
          position: "absolute",
          top: 880,
          left: 36,
          right: 36,
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        {(slide.replies ?? []).map((r, i) => (
          <Reply
            key={i}
            text={r.text}
            color={r.color ?? REPLY_COLORS[i % REPLY_COLORS.length]}
            start={resolved.replies[i]?.start ?? 0}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
