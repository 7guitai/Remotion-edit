import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes";
import { calculateMetadata, FPS } from "./slides";
import { Video } from "./Video";
import { FPS as SHORT_FPS, HEIGHT, WIDTH } from "./shorts/common/timeline";
import { SHORTS } from "./shorts";

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
      {/* 縦型ショート（ずんだもん＋四国めたんの掛け合い）：src/shorts/index.ts に登録したもの */}
      {SHORTS.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={s.component}
          durationInFrames={s.durationInFrames}
          fps={SHORT_FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </>
  );
};
