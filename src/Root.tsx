import React from "react";
import { Composition } from "remotion";
import { SleepTrivia } from "./SleepTrivia";
import { calculateMetadata, FPS, VideoProps } from "./slides";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SleepTrivia"
      component={SleepTrivia}
      // 実際の長さは音声ファイルの長さから calculateMetadata で決まる
      durationInFrames={FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ slides: [] } satisfies VideoProps}
      calculateMetadata={calculateMetadata}
    />
  );
};
