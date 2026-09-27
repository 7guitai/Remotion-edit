import React from "react";
import { Composition } from "remotion";
import { SleepTrivia } from "./SleepTrivia";
import { FPS, TOTAL_FRAMES } from "./data";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 通常動画 (16:9) */}
      <Composition
        id="SleepTrivia"
        component={SleepTrivia}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* YouTube ショート用 (9:16) */}
      <Composition
        id="SleepTriviaShorts"
        component={SleepTrivia}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
