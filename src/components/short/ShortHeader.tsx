import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Episode } from "../../episodes";
import { fontFamily } from "../../theme";
import { SHORT } from "./theme";

// 画面上部: 進行バー・シリーズ名・見出し（動画の最初から最後まで固定）
export const ShortHeader: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const bar = (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 12,
        width: `${progress * 100}%`,
        background: episode.look?.banner ? SHORT.good : SHORT.accent,
      }}
    />
  );
  // 素材キットのタイトル帯（1080×280）を上端に置く
  if (episode.look?.banner) {
    return (
      <>
        <Img
          src={staticFile(episode.look.banner)}
          style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 280 }}
        />
        {bar}
      </>
    );
  }
  return (
    <>
      {bar}
      <div
        style={{
          position: "absolute",
          top: SHORT.headerTop,
          left: SHORT.side,
          right: SHORT.side,
          fontFamily,
        }}
      >
        {episode.series ? (
          <div
            style={{
              display: "inline-block",
              fontWeight: 800,
              fontSize: 30,
              color: "#fff",
              background: SHORT.text,
              borderRadius: 12,
              padding: "6px 20px",
            }}
          >
            {episode.series}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 18,
            fontWeight: 800,
            fontSize: 60,
            lineHeight: 1.25,
            color: SHORT.text,
          }}
        >
          {episode.headline ?? episode.title}
        </div>
      </div>
    </>
  );
};
