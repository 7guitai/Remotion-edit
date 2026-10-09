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
import { SleepBackground } from "./components/SleepPage";
import { WhatIfHeadline } from "./components/WhatIfPage";
import { ChapterTag } from "./components/WhatIfCard";
import { IllusionHeaderContext } from "./components/IllusionPage";

export const Video: React.FC<VideoProps> = ({ episodeId, slides }) => {
  const episode = getEpisode(episodeId);
  const { durationInFrames, width, height } = useVideoConfig();
  const landscape = width > height;
  // スライドごとの開始フレーム（BGM の切り替えに使う）
  const starts = slides.reduce<number[]>(
    (acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + slides[i - 1].durationInFrames],
    [],
  );
  // 横長の「もしも」：章の扉（card.no）から次の扉までの間、右上に章の名前を出す
  let chapter: { no: number; tag: string } | null = null;
  const chapters = slides.map((s) => {
    const card = s.slide.type === "whatif" ? s.slide.card : undefined;
    if (card) {
      chapter = card.no !== undefined ? { no: card.no, tag: card.tag ?? card.title.join("") } : null;
      return null;
    }
    return chapter;
  });
  const bgmLevel = episode.bgmVolume ?? BGM_VOLUME;
  const ambientLevel = episode.ambient?.volume ?? 0;
  // BGM は最初と最後だけフェード
  const bgmVolume = (f: number) =>
    interpolate(
      f,
      [0, 15, durationInFrames - 45, durationInFrames],
      [0, bgmLevel, bgmLevel, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

  const accent = {
    accent: episode.accent ?? COLORS.accent,
    marker: episode.marker ?? COLORS.marker,
  };

  return (
    <AccentContext.Provider value={accent}>
      <IllusionHeaderContext.Provider value={{ kicker: episode.kicker, badge: episode.badge }}>
      <AbsoluteFill
        style={{ backgroundColor: episode.background ?? COLORS.background }}
      >
        {episode.style === "sleep" ? <SleepBackground /> : null}
        {episode.style === "whatif" ? (
          <WhatIfHeadline lines={episode.headline ?? [episode.title]} />
        ) : null}
        <Series>
          {slides.map((s, i) => (
            <Series.Sequence key={i} durationInFrames={s.durationInFrames}>
              <Slide resolved={s} />
              {episode.style === "whatif" && landscape && chapters[i] ? (
                <ChapterTag no={chapters[i]!.no} tag={chapters[i]!.tag} total={10} />
              ) : null}
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
              {s.flashy ? (
                <>
                  <Audio src={staticFile("sfx/whoosh.wav")} volume={s.slide.type === "trivia" && s.slide.presentation === "ranking" ? 0.18 : 0.55} />
                  {s.answerStart !== null ? (
                    <Sequence from={s.answerStart}>
                      <Audio src={staticFile("sfx/impact.wav")} volume={s.slide.type === "trivia" && s.slide.presentation === "ranking" ? 0.22 : 0.7} />
                      <Sequence from={4}>
                        <Audio
                          src={staticFile("sfx/sparkle.wav")}
                          volume={s.slide.type === "trivia" && s.slide.presentation === "ranking" ? 0.12 : 0.35}
                        />
                      </Sequence>
                    </Sequence>
                  ) : null}
                </>
              ) : null}
              <QuizSfx resolved={s} />
            </Series.Sequence>
          ))}
        </Series>
        {episode.titleBand === false ? null : (
          <TitleBand title={episode.title} />
        )}
        {episode.pr ? <PrBadge /> : null}
        {episode.bgmPlaylist ? (
          <BgmPlaylist
            tracks={episode.bgmPlaylist}
            starts={starts}
            total={durationInFrames}
            level={bgmLevel}
          />
        ) : episode.bgm ? (
          <Audio
            src={staticFile(`bgm/${episode.bgm.file}`)}
            volume={bgmVolume}
            loop
            loopVolumeCurveBehavior="extend"
          />
        ) : null}
        {episode.ambient ? (
          <Audio
            src={staticFile(`sfx/${episode.ambient.file}`)}
            volume={(f) =>
              interpolate(
                f,
                [0, 60, durationInFrames - 90, durationInFrames],
                [0, ambientLevel, ambientLevel, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )
            }
            loop
            loopVolumeCurveBehavior="extend"
          />
        ) : null}
      </AbsoluteFill>
      </IllusionHeaderContext.Provider>
    </AccentContext.Provider>
  );
};

// 場面ごとの BGM。曲の切り替わりは XF フレームかけてクロスフェード
const XF = 45;
const BgmPlaylist: React.FC<{
  tracks: NonNullable<ReturnType<typeof getEpisode>["bgmPlaylist"]>;
  starts: number[];
  total: number;
  level: number;
}> = ({ tracks, starts, total, level }) => (
  <>
    {tracks.map((t, k) => {
      const from = k === 0 ? 0 : (starts[t.fromSlide] ?? total) - XF;
      const to = k === tracks.length - 1 ? total : (starts[tracks[k + 1].fromSlide] ?? total);
      const len = Math.max(1, to - from);
      const vol = level * (t.volume ?? 1);
      return (
        <Sequence key={k} from={from} durationInFrames={len}>
          <Audio
            src={staticFile(`bgm/${t.file}`)}
            loop
            loopVolumeCurveBehavior="extend"
            volume={(f) =>
              interpolate(
                f,
                [0, k === 0 ? 15 : XF, len - (k === tracks.length - 1 ? 45 : XF), len],
                [0, vol, vol, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )
            }
          />
        </Sequence>
      );
    })}
  </>
);

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
