import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { getEpisode, Illustration, ScriptSlide } from "./episodes";

export const FPS = 30;
// ナレーションの前後に入れる間（フレーム）
const LEAD_IN = 6;
const TAIL = 12;
// 1ページ1雑学：振りを読み終えてから答えを出すまでの間と、答えのあとの余韻
const ANSWER_PAUSE = 30;
const ANSWER_TAIL = 24;
// 2ch風：見出しのあと最初のレスまで、レスとレスの間
const REPLY_GAP = 10;
// 答えを読み終えてから解説を読み始めるまで
const EXPLAIN_PAUSE = 12;
// クイズの出題後、考える時間として入れるカウントダウン（フレーム）
export const COUNTDOWN = 3 * FPS;

export type ResolvedSlide = {
  slide: ScriptSlide;
  illustration: Illustration | null;
  hasImage: boolean;
  voice: string | null;
  voiceStart: number;
  // 1ページ1雑学の答え（表示と読み上げを始めるフレーム）
  answerVoice: string | null;
  answerStart: number | null;
  explainVoice: string | null;
  explainStart: number | null;
  // 2ch風のレス（表示と読み上げを始めるフレーム）
  replies: { voice: string | null; start: number }[];
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
      const image =
        slide.type === undefined ||
        slide.type === "illust" ||
        slide.type === "trivia" ||
        slide.type === "thread"
          ? slide.image
          : null;
      const illustration = image
        ? (episode.illustrations[image] ?? { emoji: "💤", irasutoya: image })
        : null;
      const voiceFrames = Math.ceil(seconds * FPS);
      const isQuestion = slide.type === "quiz" && slide.answer === undefined;
      const common = {
        slide,
        illustration,
        hasImage: image ? await exists(`illustrations/${image}`) : false,
        voice: hasVoice ? voicePath : null,
        voiceStart: LEAD_IN,
        no: numbers[i],
        total,
        replies: [] as { voice: string | null; start: number }[],
      };
      if (slide.type === "thread") {
        let cursor = LEAD_IN + voiceFrames;
        const replies = [];
        for (const [k, reply] of (slide.replies ?? []).entries()) {
          const path = voicePath.replace(".wav", `-r${k}.wav`);
          const has = await exists(path);
          const secs = has
            ? await getAudioDurationInSeconds(staticFile(path))
            : 1 + (reply.speech ?? reply.text).length * 0.13;
          const start = cursor + REPLY_GAP;
          replies.push({ voice: has ? path : null, start });
          cursor = start + Math.ceil(secs * FPS);
        }
        return {
          ...common,
          replies,
          answerVoice: null,
          answerStart: null,
          explainVoice: null,
          explainStart: null,
          countdownStart: null,
          durationInFrames: cursor + ANSWER_TAIL,
        };
      }
      if (slide.type === "trivia" && slide.answer) {
        const answerPath = voicePath.replace(".wav", "-answer.wav");
        const hasAnswer = await exists(answerPath);
        const answerSeconds = hasAnswer
          ? await getAudioDurationInSeconds(staticFile(answerPath))
          : 1 + (slide.answerSpeech ?? slide.answer).length * 0.13;
        const answerStart = LEAD_IN + voiceFrames + ANSWER_PAUSE;
        const answerEnd = answerStart + Math.ceil(answerSeconds * FPS);
        const explainPath = voicePath.replace(".wav", "-explain.wav");
        const hasExplain = slide.explain ? await exists(explainPath) : false;
        const explainSeconds = !slide.explain
          ? 0
          : hasExplain
            ? await getAudioDurationInSeconds(staticFile(explainPath))
            : 1 + (slide.explainSpeech ?? slide.explain).length * 0.13;
        const explainStart = slide.explain ? answerEnd + EXPLAIN_PAUSE : null;
        return {
          ...common,
          answerVoice: hasAnswer ? answerPath : null,
          answerStart,
          explainVoice: hasExplain ? explainPath : null,
          explainStart,
          countdownStart: null,
          durationInFrames:
            (explainStart === null
              ? answerEnd
              : explainStart + Math.ceil(explainSeconds * FPS)) + ANSWER_TAIL,
        };
      }
      return {
        slide,
        illustration,
        hasImage: image ? await exists(`illustrations/${image}`) : false,
        voice: hasVoice ? voicePath : null,
        voiceStart: LEAD_IN,
        replies: [],
        answerVoice: null,
        answerStart: null,
        explainVoice: null,
        explainStart: null,
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
