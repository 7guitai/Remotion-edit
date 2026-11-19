import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Slide } from "./components/Slide";
import { ShortHeader } from "./components/short/ShortHeader";
import { ShortSlide } from "./components/short/ShortSlide";
import { SHORT, themeVars } from "./components/short/theme";
import { getEpisode } from "./episodes";
import { VideoProps } from "./slides";
import { BGM_VOLUME, COLORS, fontFamily, SE_VOLUME } from "./theme";

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

  const isShort = episode.format === "short";

  return (
    <AbsoluteFill
      style={{
        ...(isShort ? themeVars(episode.look?.theme) : {}),
        backgroundColor: isShort ? SHORT.background : COLORS.background,
      }}
    >
      {isShort && episode.look?.background ? (
        <Img
          src={staticFile(episode.look.background)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      ) : null}
      <Series>
        {slides.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.durationInFrames}>
            {isShort ? <ShortSlide resolved={s} look={episode.look} character={episode.character} /> : <Slide resolved={s} />}
            {s.voice ? (
              <Sequence from={s.voiceStart}>
                <Audio src={staticFile(s.voice)} />
              </Sequence>
            ) : null}
            {s.slide.se && episode.sounds?.[s.slide.se] ? (
              <Audio src={staticFile(episode.sounds[s.slide.se].file)} volume={SE_VOLUME} />
            ) : null}
          </Series.Sequence>
        ))}
      </Series>
      {isShort ? <ShortHeader episode={episode} /> : null}
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
