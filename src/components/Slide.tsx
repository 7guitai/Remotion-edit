import React from "react";
import {
  AbsoluteFill,
  getRemotionEnvironment,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ResolvedSlide } from "../slides";
import { COLORS, fontFamily } from "../theme";
import { Bars, Points, Table } from "./Charts";

const TELOP_WIDTH = 1520;
const TELOP_MAX_LINES = 2;

// 全角=1、半角=0.55 として、各行の幅から折り返し後の行数を見積もる
const estimateLines = (text: string, fontSize: number) => {
  const perLine = TELOP_WIDTH / (fontSize * 1.03);
  return text.split("\n").reduce((sum, line) => {
    const width = [...line].reduce(
      (w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1),
      0,
    );
    return sum + Math.max(1, Math.ceil(width / perLine));
  }, 0);
};

// 3行以上になりそうなテロップは文字を小さくして2行に収める
const telopFontSize = (text: string) =>
  [68, 62, 56].find((size) => estimateLines(text, size) <= TELOP_MAX_LINES) ??
  56;

// 上部テロップ＋中央のコンテンツ（イラスト / グラフ / 表 / 箇条書き）
export const Slide: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const { slide } = resolved;
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 200,
          right: 200,
          fontFamily,
          fontWeight: 800,
          fontSize: telopFontSize(slide.text),
          lineHeight: 1.4,
          letterSpacing: "0.03em",
          color: COLORS.text,
          textAlign: "center",
          whiteSpace: "pre-line",
          wordBreak: "keep-all",
          overflowWrap: "anywhere",
        }}
      >
        {slide.text}
      </div>

      <div
        style={{
          position: "absolute",
          top: 330,
          left: 0,
          right: 0,
          height: 620,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: appear,
          transform: `scale(${interpolate(appear, [0, 1], [0.96, 1])})`,
        }}
      >
        {slide.type === "bars" ? (
          <Bars slide={slide} />
        ) : slide.type === "table" ? (
          <Table slide={slide} />
        ) : slide.type === "points" ? (
          <Points slide={slide} />
        ) : resolved.hasImage ? (
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{ maxWidth: 900, maxHeight: 560, objectFit: "contain" }}
          />
        ) : (
          <Placeholder resolved={resolved} />
        )}
      </div>
    </AbsoluteFill>
  );
};

// イラスト未配置のときの仮表示
const Placeholder: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const { isStudio } = getRemotionEnvironment();
  const { illustration, slide } = resolved;
  if (!illustration || !("image" in slide)) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div
        style={{
          width: 440,
          height: 440,
          borderRadius: "50%",
          background: COLORS.placeholder,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 260,
        }}
      >
        {illustration.emoji}
      </div>
      {isStudio ? (
        <div
          style={{
            fontFamily,
            fontWeight: 500,
            fontSize: 28,
            color: COLORS.note,
          }}
        >
          いらすとや「{illustration.irasutoya}」→ public/illustrations/
          {slide.image}
        </div>
      ) : null}
    </div>
  );
};
