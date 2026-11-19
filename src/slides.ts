import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { getEpisode, Illustration, ScriptSlide } from "./episodes";

export const FPS = 30;
// ナレーションの前後に入れる間（フレーム）。ショートはテンポ重視で短くする
const LEAD_IN = 6;
const TAIL = 12;
const SHORT_LEAD_IN = 3;
const SHORT_TAIL = 6;

// 字幕の1まとまり（音声の頭からの秒数）
export type CaptionChunk = { text: string; start: number; end: number };

export type ResolvedSlide = {
  slide: ScriptSlide;
  illustration: Illustration | null;
  hasImage: boolean;
  voice: string | null;
  voiceStart: number;
  durationInFrames: number;
  // 発話に合わせて切り替える字幕（scripts/generate_voice.py が書き出す captions.json）
  captions: CaptionChunk[] | null;
};

export type VideoProps = {
  episodeId: string;
  slides: ResolvedSlide[];
};

const exists = async (path: string) => {
  try {
    const res = await fetch(staticFile(path), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
};

// public/ にある音声・イラストを調べて、各スライドの長さを決める。
// 音声がないスライドは文字数から長さを見積もる。
const loadCaptions = async (episodeId: string): Promise<CaptionChunk[][] | null> => {
  const path = `voice/${episodeId}/captions.json`;
  if (!(await exists(path))) {
    return null;
  }
  const res = await fetch(staticFile(path));
  return (await res.json()) as CaptionChunk[][];
};

const resolveSlides = async (episodeId: string): Promise<ResolvedSlide[]> => {
  const episode = getEpisode(episodeId);
  const isShort = episode.format === "short";
  const lead = isShort ? SHORT_LEAD_IN : LEAD_IN;
  const tail = isShort ? SHORT_TAIL : TAIL;
  const captions = isShort ? await loadCaptions(episode.id) : null;
  return Promise.all(
    episode.slides.map(async (slide, i) => {
      const voicePath = `voice/${episode.id}/${String(i).padStart(3, "0")}.wav`;
      const hasVoice = await exists(voicePath);
      const seconds = hasVoice
        ? await getAudioDurationInSeconds(staticFile(voicePath))
        : 1 + (slide.speech ?? slide.text).length * 0.13;
      const image = slide.type === undefined || slide.type === "illust" ? slide.image : null;
      const illustration = image
        ? (episode.illustrations[image] ?? { emoji: "💤", irasutoya: image })
        : null;
      return {
        slide,
        illustration,
        hasImage: image ? await exists(`illustrations/${image}`) : false,
        voice: hasVoice ? voicePath : null,
        voiceStart: lead,
        durationInFrames: lead + Math.ceil(seconds * FPS) + tail,
        captions: hasVoice ? (captions?.[i] ?? null) : null,
      };
    }),
  );
};

export const calculateMetadata: CalculateMetadataFunction<VideoProps> = async ({
  props,
}) => {
  const slides = await resolveSlides(props.episodeId);
  return {
    durationInFrames: slides.reduce((sum, s) => sum + s.durationInFrames, 0),
    props: { ...props, slides },
  };
};
