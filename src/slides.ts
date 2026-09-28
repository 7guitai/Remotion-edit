import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { getEpisode, Illustration, ScriptSlide } from "./episodes";

export const FPS = 30;
// ナレーションの前後に入れる間（フレーム）
const LEAD_IN = 6;
const TAIL = 12;
// クイズの出題後、考える時間として入れるカウントダウン（フレーム）
export const COUNTDOWN = 3 * FPS;

export type ResolvedSlide = {
  slide: ScriptSlide;
  illustration: Illustration | null;
  hasImage: boolean;
  voice: string | null;
  voiceStart: number;
  // 読み上げが終わってからカウントダウンが始まるまで（クイズ出題のみ）
  countdownStart: number | null;
  // 画面左上に出す「雑学 No.○ / 全○」
  no: number | null;
  total: number;
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
  // no は次の chapter まで引き継ぐ（エンディングなど no のない章で消える）
  const numbers: (number | null)[] = [];
  episode.slides.forEach((slide, i) => {
    const prev = i > 0 ? numbers[i - 1] : null;
    numbers.push(slide.no ?? (slide.chapter ? null : prev));
  });
  const total = Math.max(0, ...episode.slides.map((s) => s.no ?? 0));
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
      const voiceFrames = Math.ceil(seconds * FPS);
      const isQuestion = slide.type === "quiz" && slide.answer === undefined;
      return {
        slide,
        illustration,
        hasImage: image ? await exists(`illustrations/${image}`) : false,
        voice: hasVoice ? voicePath : null,
        voiceStart: LEAD_IN,
        countdownStart: isQuestion ? LEAD_IN + voiceFrames : null,
        no: numbers[i],
        total,
        durationInFrames:
          LEAD_IN + voiceFrames + TAIL + (isQuestion ? COUNTDOWN : 0),
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
