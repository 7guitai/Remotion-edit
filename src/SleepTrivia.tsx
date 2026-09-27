import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { NightSky } from "./components/NightSky";
import { Opening } from "./components/Opening";
import { TriviaScene } from "./components/TriviaScene";
import { Ending } from "./components/Ending";
import {
  ENDING_FRAMES,
  OPENING_FRAMES,
  TRANSITION_FRAMES,
  TRIVIA,
  TRIVIA_FRAMES,
} from "./data";
import { COLORS, useScale } from "./theme";

const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { s } = useScale();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        height: 10 * s,
        width: `${(frame / (durationInFrames - 1)) * 100}%`,
        background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.pink})`,
      }}
    />
  );
};

export const SleepTrivia: React.FC = () => {
  return (
    <AbsoluteFill>
      <NightSky />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={OPENING_FRAMES}>
          <Opening />
        </TransitionSeries.Sequence>
        {TRIVIA.map((item, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Transition
              presentation={
                i === 0 ? fade() : slide({ direction: "from-right" })
              }
              timing={timing}
            />
            <TransitionSeries.Sequence durationInFrames={TRIVIA_FRAMES}>
              <TriviaScene item={item} index={i} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={ENDING_FRAMES}>
          <Ending />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <ProgressBar />
    </AbsoluteFill>
  );
};
