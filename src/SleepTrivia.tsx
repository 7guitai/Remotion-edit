import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Slide } from "./components/Slide";
import script from "./script.json";
import { VideoProps } from "./slides";
import { BGM_VOLUME, COLORS } from "./theme";

export const SleepTrivia: React.FC<VideoProps> = ({ slides }) => {
  const { durationInFrames } = useVideoConfig();
  // BGM は最初と最後だけフェード
  const bgmVolume = (f: number) =>
    interpolate(
      f,
      [0, 15, durationInFrames - 45, durationInFrames],
      [0, BGM_VOLUME, BGM_VOLUME, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Series>
        {slides.map((slide, i) => (
          <Series.Sequence key={i} durationInFrames={slide.durationInFrames}>
            <Slide slide={slide} />
            {slide.voice ? (
              <Sequence from={slide.voiceStart}>
                <Audio src={staticFile(slide.voice)} />
              </Sequence>
            ) : null}
          </Series.Sequence>
        ))}
      </Series>
      <Audio
        src={staticFile(`bgm/${script.bgm.file}`)}
        volume={bgmVolume}
        loop
        loopVolumeCurveBehavior="extend"
      />
    </AbsoluteFill>
  );
};
