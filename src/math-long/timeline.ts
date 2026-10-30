import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";

// ロング動画（横型 16:9）。1文＝1音声ファイル。文末ごとに間を空ける
export const LONG_FPS = 30;
const LEAD_IN = 1.0;
const TAIL = 4.0;
// 文と文のあいだ（音声ファイル自体にも前後に約0.15秒の無音がある）
const GAP = 0.45;

export type LongLine = { text: string; pause?: number; chapter?: string };

export type LongProps = {
  id: string;
  lines: LongLine[];
  starts: number[];
  durs: number[];
  voices: (string | null)[];
  bgm: string | null;
  subtitles: boolean;
};

const exists = async (path: string) => {
  try {
    const res = await fetch(staticFile(path), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
};

export const calculateLongMetadata: CalculateMetadataFunction<LongProps> = async ({ props }) => {
  const voices: (string | null)[] = [];
  const durs: number[] = [];
  for (let i = 0; i < props.lines.length; i++) {
    const path = `voice/${props.id}/${String(i).padStart(3, "0")}.wav`;
    const ok = await exists(path);
    voices.push(ok ? path : null);
    durs.push(ok ? await getAudioDurationInSeconds(staticFile(path)) : 0.5 + props.lines[i].text.length / 5);
  }
  const starts: number[] = [];
  let t = LEAD_IN;
  props.lines.forEach((line, i) => {
    starts.push(t);
    t += durs[i] + (line.pause ?? GAP);
  });
  return {
    durationInFrames: Math.ceil((t + TAIL) * LONG_FPS),
    props: {
      ...props,
      starts,
      durs,
      voices,
      bgm: props.bgm && (await exists(`bgm/${props.bgm}`)) ? props.bgm : null,
    },
  };
};
