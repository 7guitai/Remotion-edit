import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { RelaxSlide } from "../episodes";
import { fontFamily } from "../theme";

// 寝落ち用の「聞くだけ雑学」。白い背景に、上に黒い太字の字幕、真ん中に写真（またはイラスト）を1枚。
// 場面の切り替えは短いフェードだけ。写真はごくゆっくり寄る
export const RelaxPage: React.FC<{ slide: RelaxSlide }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fade = Math.round(fps * 0.35);
  const appear = interpolate(frame, [0, fade], [0, 1], { extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.035]);

  if (slide.card) {
    // 章の扉：大きめの文字だけ
    return (
      <AbsoluteFill style={{ background: "#fff", alignItems: "center", justifyContent: "center", opacity: appear }}>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 92, color: "#222", letterSpacing: 4, textAlign: "center", lineHeight: 1.4, whiteSpace: "pre-line" }}>
          {slide.card}
        </div>
        <div style={{ width: 160, height: 6, borderRadius: 3, background: "#d9c7a3", marginTop: 36 }} />
      </AbsoluteFill>
    );
  }

  const lines = slide.text.split("\n");
  // 字幕の行数に合わせて、写真の位置と大きさを決める（字幕と写真が重ならないように）
  const fontSize = lines.length >= 3 ? 50 : lines.some((l) => l.length > 24) ? 54 : 60;
  const imgTop = Math.round(36 + lines.length * fontSize * 1.42 + 26);
  const imgH = 1080 - imgTop - 34;
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 60,
          right: 60,
          textAlign: "center",
          fontFamily,
          fontWeight: 900,
          fontSize,
          lineHeight: 1.42,
          color: "#1d1d1d",
          WebkitTextStroke: "0px",
          textShadow: "0 0 6px #fff, 0 0 6px #fff",
          opacity: appear,
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      {slide.photo ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: imgTop,
            width: Math.round(imgH * 1.55),
            height: imgH,
            transform: "translateX(-50%)",
            overflow: "hidden",
            opacity: appear,
          }}
        >
          <Img
            src={staticFile(`photos/${slide.photo}`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: slide.focus ?? "50% 50%",
              transform: `scale(${zoom})`,
            }}
          />
        </div>
      ) : slide.image ? (
        <AbsoluteFill style={{ top: imgTop, height: imgH, alignItems: "center", justifyContent: "center", opacity: appear }}>
          <Img
            src={staticFile(`illustrations/${slide.image}`)}
            style={{ maxWidth: 900, maxHeight: imgH - 40, objectFit: "contain", transform: `scale(${zoom})` }}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
