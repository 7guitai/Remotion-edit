import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Trivia, TRIVIA } from "../data";
import { COLORS, headingFont, outline, roundedFont, useScale } from "../theme";

type Props = {
  item: Trivia;
  index: number;
};

// 1つの雑学シーン
// 0f〜: 番号バッジ + 絵文字 + 見出し
// 70f〜: キーワード強調
// 110f〜: 補足説明の吹き出し
export const TriviaScene: React.FC<Props> = ({ item, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { s, vertical } = useScale();

  const pop = (delay: number, damping = 12) =>
    spring({ frame: frame - delay, fps, config: { damping, mass: 0.6 } });

  const badge = pop(0);
  const emoji = pop(8, 8);
  const title = pop(18);
  const highlight = pop(70, 7);
  const bubble = pop(110, 14);

  const emojiFloat = Math.sin(frame / 12) * 10 * s;
  const num = String(index + 1).padStart(2, "0");

  return (
    <AbsoluteFill>
      {/* 左上の番号バッジ */}
      <div
        style={{
          position: "absolute",
          left: 60 * s,
          top: 50 * s,
          display: "flex",
          alignItems: "center",
          gap: 16 * s,
          transform: `translateX(${interpolate(badge, [0, 1], [-400 * s, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: roundedFont,
            fontWeight: 800,
            fontSize: 40 * s,
            color: COLORS.skyTop,
            background: COLORS.yellow,
            padding: `${8 * s}px ${28 * s}px`,
            borderRadius: 16 * s,
          }}
        >
          雑学 <span style={{ fontSize: 56 * s }}>{num}</span>
        </div>
        <div
          style={{
            fontFamily: roundedFont,
            fontWeight: 500,
            fontSize: 30 * s,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          / {String(TRIVIA.length).padStart(2, "0")}
        </div>
      </div>

      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column" : "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 70 * s,
          padding: `${150 * s}px ${80 * s}px ${220 * s}px`,
        }}
      >
        {/* 絵文字アイコン */}
        <div
          style={{
            position: "relative",
            width: 300 * s,
            height: 300 * s,
            flexShrink: 0,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            border: `${6 * s}px solid rgba(255,255,255,0.35)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 170 * s,
            transform: `scale(${emoji}) translateY(${emojiFloat}px)`,
          }}
        >
          {item.emoji}
          {/* キーワードのスタンプ */}
          <div
            style={{
              position: "absolute",
              bottom: -30 * s,
              left: "50%",
              whiteSpace: "nowrap",
              fontFamily: headingFont,
              fontSize: 54 * s,
              color: "#fff",
              background: COLORS.pink,
              padding: `${6 * s}px ${26 * s}px`,
              borderRadius: 14 * s,
              boxShadow: `0 ${8 * s}px 0 #b8457f`,
              transform: `translateX(-50%) rotate(-6deg) scale(${interpolate(
                highlight,
                [0, 1],
                [2.5, 1],
              )})`,
              opacity: Math.min(1, highlight * 2),
            }}
          >
            {item.highlight}
          </div>
        </div>

        {/* 見出しテロップ */}
        <div
          style={{
            fontFamily: headingFont,
            fontSize: (vertical ? 92 : 100) * s,
            lineHeight: 1.3,
            color: "#fff",
            textShadow: outline("#3b2a86", 10 * s),
            whiteSpace: "pre-line",
            textAlign: vertical ? "center" : "left",
            opacity: title,
            transform: `translateY(${interpolate(title, [0, 1], [60 * s, 0])}px)`,
          }}
        >
          {item.title}
        </div>
      </AbsoluteFill>

      {/* 補足説明の吹き出し */}
      <div
        style={{
          position: "absolute",
          left: 80 * s,
          right: 80 * s,
          bottom: 70 * s,
          display: "flex",
          justifyContent: "center",
          opacity: bubble,
          transform: `translateY(${interpolate(bubble, [0, 1], [120 * s, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: roundedFont,
            fontWeight: 800,
            fontSize: (vertical ? 38 : 42) * s,
            lineHeight: 1.55,
            color: COLORS.bubbleText,
            background: COLORS.bubble,
            borderRadius: 30 * s,
            padding: `${24 * s}px ${44 * s}px`,
            whiteSpace: "pre-line",
            textAlign: "center",
            boxShadow: `0 ${10 * s}px 0 rgba(0,0,0,0.25)`,
          }}
        >
          {item.body}
        </div>
      </div>
    </AbsoluteFill>
  );
};
