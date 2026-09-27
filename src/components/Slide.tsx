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

// テロップ（上）＋イラスト（中央）の1枚
export const Slide: React.FC<{ slide: ResolvedSlide }> = ({ slide }) => {
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
          fontSize: 68,
          lineHeight: 1.4,
          letterSpacing: "0.03em",
          color: COLORS.text,
          textAlign: "center",
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
          height: 560,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: appear,
          transform: `scale(${interpolate(appear, [0, 1], [0.96, 1])})`,
        }}
      >
        {slide.hasImage ? (
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{ maxWidth: 900, maxHeight: 560, objectFit: "contain" }}
          />
        ) : (
          <Placeholder slide={slide} />
        )}
      </div>
    </AbsoluteFill>
  );
};

// イラスト未配置のときの仮表示
const Placeholder: React.FC<{ slide: ResolvedSlide }> = ({ slide }) => {
  const { isStudio } = getRemotionEnvironment();
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
        {slide.illustration.emoji}
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
          いらすとや「{slide.illustration.irasutoya}」→ public/illustrations/
          {slide.image}
        </div>
      ) : null}
    </div>
  );
};
