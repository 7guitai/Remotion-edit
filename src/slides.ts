import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import script from "./script.json";

export const FPS = 30;
// ナレーションの前後に入れる間（フレーム）
const LEAD_IN = 6;
const TAIL = 12;

export type Illustration = {
  emoji: string;
  irasutoya: string;
  url?: string;
};

export type ResolvedSlide = {
  text: string;
  image: string;
  illustration: Illustration;
  hasImage: boolean;
  voice: string | null;
  voiceStart: number;
  durationInFrames: number;
};

export type VideoProps = {
  slides: ResolvedSlide[];
};

const ILLUSTRATIONS: Record<string, Illustration> = script.illustrations;

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
export const resolveSlides = async (): Promise<ResolvedSlide[]> => {
  return Promise.all(
    script.slides.map(async (slide, i) => {
      const voicePath = `voice/${String(i).padStart(3, "0")}.wav`;
      const hasVoice = await exists(voicePath);
      const seconds = hasVoice
        ? await getAudioDurationInSeconds(staticFile(voicePath))
        : 1 + slide.text.length * 0.13;
      const illustration = ILLUSTRATIONS[slide.image] ?? {
        emoji: "💤",
        irasutoya: slide.image,
      };
      return {
        text: slide.text,
        image: slide.image,
        illustration,
        hasImage: await exists(`illustrations/${slide.image}`),
        voice: hasVoice ? voicePath : null,
        voiceStart: LEAD_IN,
        durationInFrames: LEAD_IN + Math.ceil(seconds * FPS) + TAIL,
      };
    }),
  );
};

export const calculateMetadata: CalculateMetadataFunction<VideoProps> =
  async () => {
    const slides = await resolveSlides();
    return {
      durationInFrames: slides.reduce((sum, s) => sum + s.durationInFrames, 0),
      props: { slides },
    };
  };
