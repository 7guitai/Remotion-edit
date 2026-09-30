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
import { COUNTDOWN, ResolvedSlide, VideoProps } from "./slides";
import { AccentContext, BGM_VOLUME, COLORS, fontFamily } from "./theme";
import { TitleBand } from "./components/TitleBand";

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

  const accent = {
    accent: episode.accent ?? COLORS.accent,
    marker: episode.marker ?? COLORS.marker,
  };

  return (
    <AccentContext.Provider value={accent}>
      <AbsoluteFill
        style={{ backgroundColor: episode.background ?? COLORS.background }}
      >
        <Series>
          {slides.map((s, i) => (
            <Series.Sequence key={i} durationInFrames={s.durationInFrames}>
              <Slide resolved={s} />
              {s.voice ? (
                <Sequence from={s.voiceStart}>
                  <Audio src={staticFile(s.voice)} />
                </Sequence>
              ) : null}
              {s.answerVoice && s.answerStart !== null ? (
                <Sequence from={s.answerStart}>
                  <Audio src={staticFile(s.answerVoice)} />
                </Sequence>
              ) : null}
              {s.explainVoice && s.explainStart !== null ? (
                <Sequence from={s.explainStart}>
                  <Audio src={staticFile(s.explainVoice)} />
                </Sequence>
              ) : null}
              {s.replies.map((r, k) => (
                <Sequence key={k} from={r.start}>
                  <Audio src={staticFile("sfx/pop.wav")} volume={0.5} />
                  {r.voice ? <Audio src={staticFile(r.voice)} /> : null}
                </Sequence>
              ))}
              <QuizSfx resolved={s} />
            </Series.Sequence>
          ))}
        </Series>
        {episode.titleBand === false ? null : (
          <TitleBand title={episode.title} />
        )}
        {episode.pr ? <PrBadge /> : null}
        <Audio
          src={staticFile(`bgm/${episode.bgm.file}`)}
          volume={bgmVolume}
          loop
          loopVolumeCurveBehavior="extend"
        />
      </AbsoluteFill>
    </AccentContext.Provider>
  );
};

// クイズの効果音（カウントダウンの「コッ」と正解の「ピンポーン」）
const QuizSfx: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const { fps } = useVideoConfig();
  const { slide, countdownStart } = resolved;
  if (slide.type !== "quiz") {
    return null;
  }
  if (countdownStart === null) {
    return (
      <Sequence from={2}>
        <Audio src={staticFile("sfx/correct.wav")} volume={0.6} />
      </Sequence>
    );
  }
  return (
    <>
      {Array.from({ length: COUNTDOWN / fps }, (_, i) => (
        <Sequence
          key={i}
          from={countdownStart + i * fps}
          durationInFrames={fps}
        >
          <Audio src={staticFile("sfx/tick.wav")} volume={0.7} />
        </Sequence>
      ))}
    </>
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
