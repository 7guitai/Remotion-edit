import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WhatIfSlide } from "../episodes";
import { fontFamily } from "../theme";
import { charWidth } from "./ThreadPage";

// 横長の「もしも」動画の章の扉：大きな番号が左から入り、タイトルが左から右へ現れる
export const WhatIfCard: React.FC<{
  card: NonNullable<WhatIfSlide["card"]>;
  total: number;
}> = ({ card, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inNo = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const inTitle = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  const sweep = interpolate(frame, [4, 22], [-0.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hasNo = card.no !== undefined;
  const longest = Math.max(1, ...card.title.map(charWidth));
  const titleSize = Math.min(132, Math.floor((hasNo ? 1150 : 1600) / longest));
  return (
    <AbsoluteFill>
      {/* 後ろの映像を暗くして、文字を目立たせる */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(10,14,40,0.55) 0%, rgba(0,0,0,0.85) 75%)",
        }}
      />
      {/* 光の線が横切る */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${sweep * 100}%`,
          width: 220,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,240,180,0.35) 50%, rgba(255,255,255,0) 100%)",
          transform: "skewX(-18deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: hasNo ? 120 : 0,
          right: hasNo ? undefined : 0,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: hasNo ? "flex-start" : "center",
          gap: 70,
        }}
      >
        {hasNo ? (
          <div
            style={{
              transform: `translateX(${interpolate(inNo, [0, 1], [-500, 0])}px)`,
              opacity: Math.min(1, inNo * 2),
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-block",
                fontFamily,
                fontWeight: 900,
                fontSize: 54,
                color: "#fff",
                background: "#ff3b30",
                padding: "4px 30px",
                borderRadius: 999,
                marginBottom: 6,
              }}
            >
              もしも
            </div>
            <div
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: 330,
                lineHeight: 0.95,
                color: "transparent",
                WebkitTextStroke: "14px #ffe600",
                letterSpacing: "-0.04em",
                textShadow: "0 0 40px rgba(255,230,0,0.35)",
              }}
            >
              {String(card.no).padStart(2, "0")}
            </div>
          </div>
        ) : null}
        <div
          style={{
            // 左から右へ、文字が現れる
            clipPath: `inset(-20% ${interpolate(inTitle, [0, 1], [100, 0])}% -20% 0)`,
            textAlign: hasNo ? "left" : "center",
          }}
        >
          {card.title.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: titleSize,
                lineHeight: 1.18,
                color: i === card.title.length - 1 ? "#ffe600" : "#fff",
                WebkitTextStroke: `${titleSize * 0.06}px #000`,
                paintOrder: "stroke fill",
                textShadow: "0 10px 24px rgba(0,0,0,0.7)",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          ))}
          {card.sub ? (
            <div
              style={{
                marginTop: 22,
                fontFamily,
                fontWeight: 800,
                fontSize: 46,
                color: "#cfe3ff",
                opacity: interpolate(frame, [14, 24], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {card.sub}
            </div>
          ) : null}
        </div>
      </div>
      {hasNo ? (
        // 全体の中の何番目か
        <div
          style={{
            position: "absolute",
            bottom: 70,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 18,
          }}
        >
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              style={{
                width: i + 1 === card.no ? 54 : 18,
                height: 18,
                borderRadius: 9,
                background:
                  i + 1 < card.no! ? "#ffe600" : i + 1 === card.no ? "#ff3b30" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      ) : null}
      <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />
      <Sequence from={7}>
        <Audio src={staticFile("sfx/impact.wav")} volume={0.45} />
      </Sequence>
    </AbsoluteFill>
  );
};

// 章の中で、画面の右上に出す「もしも 03 ○○」
export const ChapterTag: React.FC<{ no: number; tag: string; total: number }> = ({
  no,
  tag,
  total,
}) => (
  <div
    style={{
      position: "absolute",
      top: 34,
      right: 40,
      display: "flex",
      alignItems: "center",
      gap: 14,
      fontFamily,
      fontWeight: 900,
      padding: "8px 24px 8px 10px",
      borderRadius: 999,
      background: "rgba(0,0,0,0.55)",
      border: "3px solid rgba(255,255,255,0.85)",
    }}
  >
    <div
      style={{
        fontSize: 30,
        color: "#111",
        background: "#ffe600",
        borderRadius: 999,
        padding: "2px 16px",
      }}
    >
      {`もしも ${String(no).padStart(2, "0")}`}
    </div>
    <div style={{ fontSize: 34, color: "#fff", whiteSpace: "nowrap" }}>{tag}</div>
    <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: i + 1 <= no ? "#ffe600" : "rgba(255,255,255,0.35)",
          }}
        />
      ))}
    </div>
  </div>
);
