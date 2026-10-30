import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes";
import { MATH_SHORTS } from "./math-shorts";
import { calculateMathMetadata, MATH_FPS } from "./math-shorts/timeline";
import { MATH_LONGS } from "./math-long";
import { calculateLongMetadata, LONG_FPS } from "./math-long/timeline";
import { calculateMetadata, FPS } from "./slides";
import { Video } from "./Video";

// src/episodes/*.json の1ファイル＝1本の動画（コンポジションIDはエピソードの id）
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EPISODES.map((ep) => (
        <Composition
          key={ep.id}
          id={ep.id}
          component={Video}
          // 実際の長さは音声ファイルの長さから calculateMetadata で決まる
          durationInFrames={FPS}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ episodeId: ep.id, slides: [] }}
          calculateMetadata={calculateMetadata}
        />
      ))}
      {MATH_SHORTS.map((m) => (
        <Composition
          key={m.id}
          id={m.id}
          component={m.component}
          durationInFrames={MATH_FPS}
          fps={MATH_FPS}
          width={1080}
          height={1920}
          defaultProps={{
            id: m.id,
            narration: m.narration,
            starts: [],
            durs: [],
            voices: [],
            subtitles: false,
            bgm: m.bgm,
          }}
          calculateMetadata={calculateMathMetadata}
        />
      ))}
      {MATH_LONGS.map((m) => (
        <Composition
          key={m.id}
          id={m.id}
          component={m.component}
          durationInFrames={LONG_FPS}
          fps={LONG_FPS}
          width={1920}
          height={1080}
          defaultProps={{ id: m.id, lines: m.lines, starts: [], durs: [], voices: [], bgm: m.bgm, subtitles: false }}
          calculateMetadata={calculateLongMetadata}
        />
      ))}
    </>
  );
};
