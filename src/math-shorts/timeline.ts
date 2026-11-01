import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";

export const MATH_FPS = 30;
// 最初の音声までの間と、最後の余韻（秒）
const LEAD_IN = 0.2;
const TAIL = 1.4;

// pause: このフレーズのあとに入れる無音（秒）。強調したい言葉の前後で間をつくる
export type Narration = { text: string; speech?: string; pause?: number };

export type MathShortProps = {
  id: string;
  narration: Narration[];
  // 各フレーズの開始時刻と長さ（秒）。calculateMetadata が音声ファイルから決める
  starts: number[];
  durs: number[];
  voices: (string | null)[];
  subtitles: boolean;
  // public/bgm/ のファイル名（なければ BGM なし）
  bgm: string | null;
};

const exists = async (path: string) => {
  try {
    const res = await fetch(staticFile(path), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
};

// public/voice/<id>/NNN.wav の長さを並べてタイムラインを作る。
// 音声がないフレーズは文字数から長さを見積もる（1秒あたり約5.5文字）。
export const calculateMathMetadata: CalculateMetadataFunction<MathShortProps> = async ({
  props,
}) => {
  const voices: (string | null)[] = [];
  const durs: number[] = [];
  for (let i = 0; i < props.narration.length; i++) {
    const path = `voice/${props.id}/${String(i).padStart(3, "0")}.wav`;
    const ok = await exists(path);
    voices.push(ok ? path : null);
    durs.push(
      ok
        ? await getAudioDurationInSeconds(staticFile(path))
        : 0.5 + props.narration[i].text.length / 5.5,
    );
  }
  const starts: number[] = [];
  let t = LEAD_IN;
  durs.forEach((d, i) => {
    starts.push(t);
    t += d + (props.narration[i].pause ?? 0);
  });
  return {
    durationInFrames: Math.ceil((t + TAIL) * MATH_FPS),
    // BGM は Git 管理外なので、置いていなければ BGM なしで書き出す
    props: {
      ...props,
      starts,
      durs,
      voices,
      bgm: props.bgm && (await exists(`bgm/${props.bgm}`)) ? props.bgm : null,
    },
  };
};
