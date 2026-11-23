import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes";
import { calculateMetadata, FPS } from "./slides";
import { Video } from "./Video";
import { AiSubscriptionShort } from "./shorts/ai-subscription/Short";
import { FPS as SHORT_FPS, HEIGHT, TIMELINE, WIDTH } from "./shorts/ai-subscription/timeline";

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
      {/* 縦型ショート（掛け合い形式） */}
      <Composition
        id="ai-subscription-short"
        component={AiSubscriptionShort}
        durationInFrames={TIMELINE.total}
        fps={SHORT_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
