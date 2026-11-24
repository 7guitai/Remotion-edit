import React from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { TimedLine } from "./timeline";

// BGM は小さめ（0.07）にし、セリフの間はさらに下げる（ダッキング）。
// 「BGM がうるさい」というフィードバックを受けて、全ショート共通の既定値にしている。
export const BGM_BASE = 0.07;
export const BGM_DUCK = 0.045;

export const bgmVolumeAt = (f: number, lines: TimedLine[], total: number, base = BGM_BASE, duck = BGM_DUCK) => {
  // 話している区間は duck、セリフとセリフの間・シーンの切り替えでは base に戻す（8 フレームでなめらかに）
  let v = base;
  for (const l of lines) {
    const start = l.from - 4;
    const end = l.from + l.duration + 4;
    if (f >= start - 8 && f <= end + 8) {
      const inRamp = interpolate(f, [start - 8, start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const outRamp = interpolate(f, [end, end + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      v = Math.min(v, base - (base - duck) * Math.min(inRamp, outRamp));
    }
  }
  const fade = interpolate(f, [0, 10, total - 40, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return v * fade;
};

// セリフ音声＋BGM をまとめて鳴らす
export const ShortAudio: React.FC<{
  lines: TimedLine[];
  total: number;
  voice: (index: number) => string; // セリフ音声の staticFile
  bgmFile: string;
  hasVoice?: (index: number) => boolean;
  base?: number;
  duck?: number;
}> = ({ lines, total, voice, bgmFile, hasVoice = () => true, base, duck }) => (
  <>
    {lines
      .filter((l) => hasVoice(l.index))
      .map((l) => (
        <Sequence key={l.index} from={l.from} durationInFrames={l.duration + 6} layout="none">
          <Audio src={voice(l.index)} />
        </Sequence>
      ))}
    <Audio src={staticFile(`bgm/${bgmFile}`)} volume={(f) => bgmVolumeAt(f, lines, total, base, duck)} loop />
  </>
);
