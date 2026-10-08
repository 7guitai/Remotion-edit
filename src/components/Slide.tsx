import React from "react";
import {
  AbsoluteFill,
  getRemotionEnvironment,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ResolvedSlide } from "../slides";
import { Layout, useLayout } from "../layout";
import { COLORS, fontFamily, useAccent } from "../theme";
import { Bars, Points, Table } from "./Charts";
import { Quiz } from "./Quiz";
import { FlashyTriviaPage } from "./FlashyTriviaPage";
import { SleepPage } from "./SleepPage";
import { WhatIfPage } from "./WhatIfPage";
import { IllusionPage } from "./IllusionPage";
import { ThreadPage } from "./ThreadPage";
import { TriviaPage } from "./TriviaPage";

// 全角=1、半角=0.55 として、各行の幅から折り返し後の行数を見積もる
const estimateLines = (text: string, fontSize: number, telopWidth: number) => {
  const perLine = telopWidth / (fontSize * 1.03);
  return text.split("\n").reduce((sum, line) => {
    const width = [...line].reduce(
      (w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1),
      0,
    );
    return sum + Math.max(1, Math.ceil(width / perLine));
  }, 0);
};

// 行数が多くなりそうなテロップは文字を小さくして収める（横長は2行、ショートは3行まで）
const telopFontSize = (text: string, layout: Layout, width: number) => {
  const { sizes, maxLines, side } = layout.telop;
  return (
    sizes.find(
      (size) => estimateLines(text, size, width - side * 2) <= maxLines,
    ) ?? sizes[sizes.length - 1]
  );
};

// **〜** で囲んだ部分を色付き＋マーカーで強調し、少し遅れてポンと出す
const Telop: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 10 } });
  const { accent, marker } = useAccent();
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/).map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : (
          <span
            key={i}
            style={{
              color: accent,
              display: "inline-block",
              transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
              background: `linear-gradient(transparent 62%, ${marker} 62%)`,
              backgroundSize: `${Math.min(1, pop) * 100}% 100%`,
              backgroundRepeat: "no-repeat",
            }}
          >
            {part}
          </span>
        ),
      )}
    </>
  );
};

// 左上の「雑学 No.3」と、全体のうち何本目かを示すドット
const Counter: React.FC<{ no: number; total: number }> = ({ no, total }) => {
  const { counter } = useLayout();
  const { accent } = useAccent();
  return (
    <div
      style={{
        position: "absolute",
        top: counter.top,
        // left がなければ中央（ショート）
        ...(counter.left === null
          ? { left: 0, right: 0 }
          : { left: counter.left }),
        fontFamily,
        fontWeight: 800,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 34,
          color: "#ffffff",
          background: accent,
          borderRadius: 999,
          padding: "4px 26px",
        }}
      >
        雑学 No.{no}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: i < no ? accent : COLORS.border,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 上部テロップ＋中央のコンテンツ（イラスト / グラフ / 表 / 箇条書き）
export const Slide: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const { slide } = resolved;
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const layout = useLayout();
  const appear = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (slide.type === "illusion") {
    return <IllusionPage resolved={resolved} slide={slide} />;
  }
  if (slide.type === "whatif") {
    return (
      <WhatIfPage
        slide={slide}
        voiceStart={resolved.voiceStart}
        voiceFrames={resolved.voiceFrames}
      />
    );
  }
  if (slide.type === "sleep") {
    return <SleepPage slide={slide} />;
  }
  if (slide.type === "thread") {
    return <ThreadPage resolved={resolved} slide={slide} />;
  }
  if (slide.type === "trivia" && resolved.flashy) {
    return <FlashyTriviaPage resolved={resolved} slide={slide} />;
  }
  if (slide.type === "trivia") {
    return <TriviaPage resolved={resolved} slide={slide} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <div
        style={{
          position: "absolute",
          top: layout.telop.top,
          left: layout.telop.side,
          right: layout.telop.side,
          fontFamily,
          fontWeight: 800,
          fontSize: telopFontSize(
            slide.text.replace(/\*\*/g, ""),
            layout,
            width,
          ),
          lineHeight: 1.4,
          letterSpacing: "0.03em",
          color: COLORS.text,
          textAlign: "center",
          whiteSpace: "pre-line",
          wordBreak: "keep-all",
          overflowWrap: "anywhere",
        }}
      >
        <Telop text={slide.text} />
      </div>
      {resolved.no !== null ? (
        <Counter no={resolved.no} total={resolved.total} />
      ) : null}

      <div
        style={{
          position: "absolute",
          top: layout.content.top,
          left: 0,
          right: 0,
          height: layout.content.height,
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
        ) : slide.type === "quiz" ? (
          <Quiz slide={slide} countdownStart={resolved.countdownStart} />
        ) : resolved.hasImage ? (
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{ ...layout.image, objectFit: "contain" }}
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
