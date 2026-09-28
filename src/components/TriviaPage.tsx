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
import { TriviaSlide } from "../episodes";
import { ResolvedSlide } from "../slides";
import { fontFamily } from "../theme";

const TEXT_WIDTH = 1000;

// 全角=1、半角=0.55 として、いちばん長い行が収まる文字サイズを選ぶ
const fitSize = (text: string, max: number) => {
  const longest = Math.max(
    ...text.split("\n").map((line) =>
      [...line].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0),
    ),
  );
  return Math.min(max, Math.floor(TEXT_WIDTH / Math.max(1, longest)));
};

// 黒い極太文字＋白いフチ（フチ用に同じ文字を下に重ねる）
const Outlined: React.FC<{
  text: string;
  fontSize: number;
  stroke: number;
  style?: React.CSSProperties;
}> = ({ text, fontSize, stroke, style }) => {
  const base: React.CSSProperties = {
    fontFamily,
    fontWeight: 900,
    fontSize,
    lineHeight: 1.18,
    letterSpacing: "-0.02em",
    textAlign: "center",
    whiteSpace: "pre-line",
  };
  return (
    <div style={{ position: "relative", ...style }}>
      <div
        aria-hidden
        style={{
          ...base,
          position: "absolute",
          inset: 0,
          color: "#ffffff",
          WebkitTextStroke: `${stroke}px #ffffff`,
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.18))",
        }}
      >
        {text}
      </div>
      <div style={{ ...base, position: "relative", color: "#111111" }}>
        {text}
      </div>
    </div>
  );
};

// 1ページ1雑学：上に振り、中央にイラスト、答えは読み上げに合わせて下に出す
export const TriviaPage: React.FC<{
  resolved: ResolvedSlide;
  slide: TriviaSlide;
}> = ({ resolved, slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = resolved.answerStart;
  const pop =
    start === null
      ? 0
      : spring({ frame: frame - start, fps, config: { damping: 14, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <Outlined
        text={slide.text}
        fontSize={fitSize(slide.text, 92)}
        stroke={22}
        style={{ position: "absolute", top: 250, left: 40, right: 40 }}
      />

      <div
        style={{
          position: "absolute",
          top: slide.answer ? 500 : 560,
          left: 0,
          right: 0,
          height: slide.answer ? 620 : 820,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {resolved.hasImage ? (
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{
              maxWidth: 820,
              maxHeight: slide.answer ? 580 : 760,
              objectFit: "contain",
            }}
          />
        ) : (
          <div style={{ fontSize: 360 }}>{resolved.illustration?.emoji}</div>
        )}
      </div>

      {slide.answer && start !== null && frame >= start ? (
        <div
          style={{
            position: "absolute",
            top: 1150,
            left: 40,
            right: 40,
            transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
            opacity: Math.min(1, pop * 2),
          }}
        >
          <Outlined
            text={slide.answer}
            fontSize={fitSize(slide.answer, 88)}
            stroke={22}
          />
          {slide.note ? (
            <Outlined
              text={slide.note}
              fontSize={56}
              stroke={16}
              style={{ marginTop: 14 }}
            />
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
