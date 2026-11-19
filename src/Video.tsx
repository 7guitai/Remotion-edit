import React, { useMemo } from "react";
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
import { PaperHeader } from "./components/paper/PaperHeader";
import { PaperSlide } from "./components/paper/PaperSlide";
import { PAPER } from "./components/paper/theme";
import { ShortHeader } from "./components/short/ShortHeader";
import { ShortSlide } from "./components/short/ShortSlide";
import { SHORT, themeVars } from "./components/short/theme";
import { getEpisode } from "./episodes";
import { ResolvedSlide, VideoProps } from "./slides";
import { BGM_VOLUME, COLORS, fontFamily, SE_VOLUME } from "./theme";

export const Video: React.FC<VideoProps> = ({ episodeId, slides }) => {
  const episode = getEpisode(episodeId);
  const { durationInFrames } = useVideoConfig();
  const bgm = episode.bgmVolume ?? BGM_VOLUME;
  // ナレーション中は BGM を下げる（ダッキング）。字幕のまとまり＝話している区間
  const duck = useMemo(() => duckingCurve(slides, durationInFrames, episode.bgmDucking), [
    slides,
    durationInFrames,
    episode.bgmDucking,
  ]);
  // BGM は最初と最後だけフェード
  const bgmVolume = (f: number) =>
    interpolate(
      f,
      [0, 15, durationInFrames - 45, durationInFrames],
      [0, bgm, bgm, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ) * (duck[Math.min(Math.max(Math.round(f), 0), duck.length - 1)] ?? 1);

  const isShort = episode.format === "short";
  // 紙面・レポート風（Editorial Paper）
  const isPaper = isShort && episode.look?.layout === "paper";
  const theme = episode.look?.theme === "paper" ? "light" : episode.look?.theme;

  return (
    <AbsoluteFill
      style={{
        ...(isShort ? themeVars(theme) : {}),
        backgroundColor: isPaper ? PAPER.paper : isShort ? SHORT.background : COLORS.background,
      }}
    >
      {isShort && !isPaper && episode.look?.background ? (
        <Img
          src={staticFile(episode.look.background)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      ) : null}
      <Series>
        {slides.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.durationInFrames}>
            {isPaper ? (
              <PaperSlide resolved={s} episode={episode} />
            ) : isShort ? (
              <ShortSlide resolved={s} look={episode.look} character={episode.character} />
            ) : (
              <Slide resolved={s} />
            )}
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
      {isPaper ? (
        <PaperHeader episode={episode} slides={slides} />
      ) : isShort ? (
        <ShortHeader episode={episode} />
      ) : null}
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

// フレームごとの BGM 倍率。話している区間は depth まで下げ、前後 RAMP フレームでなめらかに戻す
const RAMP = 8;
const duckingCurve = (slides: ResolvedSlide[], total: number, depth = 1) => {
  const speaking = new Array<number>(total).fill(0);
  let offset = 0;
  for (const s of slides) {
    for (const c of s.captions ?? []) {
      const from = offset + s.voiceStart + Math.floor(c.start * 30);
      const to = offset + s.voiceStart + Math.ceil(c.end * 30);
      for (let f = Math.max(0, from); f < Math.min(total, to); f++) {
        speaking[f] = 1;
      }
    }
    offset += s.durationInFrames;
  }
  // 移動平均でなめらかにする
  const curve = new Array<number>(total).fill(1);
  for (let f = 0; f < total; f++) {
    let sum = 0;
    let n = 0;
    for (let k = f - RAMP; k <= f + RAMP; k++) {
      if (k >= 0 && k < total) {
        sum += speaking[k];
        n++;
      }
    }
    curve[f] = 1 - (1 - depth) * (sum / n);
  }
  return curve;
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
