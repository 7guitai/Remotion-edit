import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { getEpisode, Illustration, ScriptSlide } from "./episodes";

export const FPS = 30;
// ナレーションの前後に入れる間（フレーム）
const LEAD_IN = 6;
const TAIL = 12;

export type ResolvedSlide = {
  slide: ScriptSlide;
  illustration: Illustration | null;
  hasImage: boolean;
  voice: string | null;
  voiceStart: number;
  durationInFrames: number;
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
const resolveSlides = async (episodeId: string): Promise<ResolvedSlide[]> => {
  const episode = getEpisode(episodeId);
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
        voiceStart: LEAD_IN,
        durationInFrames: LEAD_IN + Math.ceil(seconds * FPS) + TAIL,
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
