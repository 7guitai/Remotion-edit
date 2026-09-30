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
import { useLayout } from "../layout";
import { fontFamily } from "../theme";

// ショート（縦）と横長で、各パーツの位置と大きさを変える
const LAYOUTS = {
  vertical: {
    textWidth: 1000,
    setup: { top: 250, size: 92 },
    image: { top: 500, height: 620, max: [820, 580] },
    imageOnly: { top: 560, height: 820, max: [820, 760] },
    answer: { top: 1150, bottom: null, size: 88 },
    sub: 56,
  },
  landscape: {
    textWidth: 1760,
    setup: { top: 50, size: 104 },
    image: { top: 200, height: 470, max: [900, 440] },
    imageOnly: { top: 260, height: 700, max: [1000, 640] },
    // 横長は答えのブロックを下端に揃える（答えや解説が2行になってもはみ出さない）
    answer: { top: null, bottom: 34, size: 100 },
    sub: 54,
  },
};

// 全角=1、半角=0.55 として、いちばん長い行が収まる文字サイズを選ぶ
const fitSize = (text: string, max: number, width: number) => {
  const longest = Math.max(
    ...text
      .split("\n")
      .map((line) =>
        [...line].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0),
      ),
  );
  return Math.min(max, Math.floor(width / Math.max(1, longest)));
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

// 答え・解説を読み上げに合わせてポンと出す
const usePop = (start: number | null) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (start === null || frame < start) {
    return 0;
  }
  return spring({
    frame: frame - start,
    fps,
    config: { damping: 14, mass: 0.6 },
  });
};

const popStyle = (pop: number): React.CSSProperties => ({
  transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
  opacity: Math.min(1, pop * 2),
});

// 1ページ1雑学：上に振り、中央にイラスト、答え（と解説）は読み上げに合わせて下に出す
export const TriviaPage: React.FC<{
  resolved: ResolvedSlide;
  slide: TriviaSlide;
}> = ({ resolved, slide }) => {
  const { vertical } = useLayout();
  const L = vertical ? LAYOUTS.vertical : LAYOUTS.landscape;
  const answerPop = usePop(resolved.answerStart);
  const explainPop = usePop(resolved.explainStart);
  const box = slide.answer ? L.image : L.imageOnly;
  // 補足は、ショートでは答えと一緒に、横長では解説の読み上げに合わせて出す
  const sub = slide.explain ?? slide.note;
  const subPop = slide.explain ? explainPop : answerPop;

  return (
    <AbsoluteFill>
      {!vertical && resolved.no !== null ? (
        <Outlined
          text={`No.${resolved.no}`}
          fontSize={44}
          stroke={14}
          style={{ position: "absolute", top: 24, left: 36 }}
        />
      ) : null}

      <Outlined
        text={slide.text}
        fontSize={fitSize(slide.text, L.setup.size, L.textWidth)}
        stroke={22}
        style={{ position: "absolute", top: L.setup.top, left: 40, right: 40 }}
      />

      <div
        style={{
          position: "absolute",
          top: box.top,
          left: 0,
          right: 0,
          height: box.height,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {resolved.hasImage ? (
          // SVG は元の大きさが小さいので、枠いっぱいに広げて縦横比を保つ
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{
              width: box.max[0],
              height: box.max[1],
              objectFit: "contain",
            }}
          />
        ) : (
          <div style={{ fontSize: 360 }}>{resolved.illustration?.emoji}</div>
        )}
      </div>

      {slide.answer && answerPop > 0 ? (
        <div
          style={{
            position: "absolute",
            ...(L.answer.top === null
              ? { bottom: L.answer.bottom }
              : { top: L.answer.top }),
            left: 40,
            right: 40,
            ...popStyle(answerPop),
          }}
        >
          <Outlined
            text={slide.answer}
            fontSize={fitSize(slide.answer, L.answer.size, L.textWidth)}
            stroke={22}
          />
          {sub ? (
            // 解説は読み上げまで透明にして場所だけ確保する（答えの位置がずれないように）
            <Outlined
              text={sub}
              fontSize={fitSize(sub, L.sub, L.textWidth)}
              stroke={16}
              style={{
                marginTop: 14,
                ...(slide.explain ? popStyle(subPop) : {}),
              }}
            />
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
