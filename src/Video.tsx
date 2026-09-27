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
import { getEpisode } from "./episodes";
import { VideoProps } from "./slides";
import { BGM_VOLUME, COLORS, fontFamily } from "./theme";

export const Video: React.FC<VideoProps> = ({ episodeId, slides }) => {
  const episode = getEpisode(episodeId);
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
        {slides.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.durationInFrames}>
            <Slide resolved={s} />
            {s.voice ? (
              <Sequence from={s.voiceStart}>
                <Audio src={staticFile(s.voice)} />
              </Sequence>
            ) : null}
          </Series.Sequence>
        ))}
      </Series>
      {episode.pr ? <PrBadge /> : null}
      <Audio
        src={staticFile(`bgm/${episode.bgm.file}`)}
        volume={bgmVolume}
        loop
        loopVolumeCurveBehavior="extend"
      />
    </AbsoluteFill>
  );
};

const PrBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 32,
      left: 40,
      fontFamily,
      fontWeight: 800,
      fontSize: 26,
      color: COLORS.note,
      border: `3px solid ${COLORS.note}`,
      borderRadius: 8,
      padding: "2px 14px",
    }}
  >
    PR
  </div>
);
