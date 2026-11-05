import React from "react";
import { Audio, random, Sequence, staticFile } from "remotion";
import { PEN_SPEC } from "./penSpec";
import penVoice from "../voice/cutaway-pen-short.json";
import { PenScene } from "./PenScene";
import { CutawayTheme } from "../theme";

// ボールペンの回：場面と効果音（機構の動きに合わせる）

const PenAudio: React.FC<{ starts: number[]; fps: number }> = ({ starts, fps }) => {
  const f = (s: number) => Math.round(s * fps);
  const items: React.ReactNode[] = [];
  const one = (key: string, at: number, file: string, volume: number, sec = 2) =>
    items.push(
      <Sequence key={key} from={f(at)} durationInFrames={f(sec)}>
        <Audio src={staticFile(`sfx/${file}`)} volume={volume} />
      </Sequence>,
    );
  // インクの流れ（ザーッ）
  for (const [b0, b1] of [
    [1, 3],
    [6, 8],
    [10, 11],
    [15, 16],
  ])
    items.push(
      <Sequence key={`fl${b0}`} from={f(starts[b0])} durationInFrames={f(starts[b1] - starts[b0])}>
        <Audio loop src={staticFile("sfx/cut_flow.wav")} volume={0.1} />
      </Sequence>,
    );
  // 世代の切りかえ
  for (const b of [5, 9, 13]) {
    one(`wh${b}`, starts[b] - 0.1, "cut_whoosh.wav", 0.4, 1);
    one(`cl${b}`, starts[b] + 0.85, "cut_clunk.wav", 0.35, 1);
  }
  one("crust", starts[3] + 0.3, "cut_crust.wav", 0.45, 1.2);
  one("spurt", starts[4] + 0.9, "cut_spurt.wav", 0.5, 1.2);
  for (let k = 0; k < 5; k++) one(`spd${k}`, starts[4] + 1.15 + k * 0.33 + random(`spd${k}`) * 0.15, "cut_drip.wav", 0.3, 0.5);
  one("flip", starts[8] + 1.05, "cut_clunk.wav", 0.3, 1);
  one("bub", starts[8] + 1.3, "cut_bubble.wav", 0.45, 1.5);
  one("spring", starts[10] + 0.05, "cut_spring.wav", 0.4, 1);
  one("squeak", starts[10] + 0.25, "cut_squeak.wav", 0.4, 1);
  // にじみ出したしずくが紙に落ちる音（PenScene の SeepDrops と同じ時刻の計算）
  for (const [seed, t0, period, slide, count] of [
    ["sr", starts[11] + 1.4, 0.85, 0.5, 8],
    ["sl", starts[11] + 1.9, 0.95, 0.55, 7],
  ] as [string, number, number, number, number][])
    for (let k = 0; k < count; k++) {
      const born = t0 + k * period * (0.8 + 0.4 * random(`${seed}${k}`));
      const at = born + period * 0.9 + slide + 0.22;
      if (at < starts[13]) one(`dr${seed}${k}`, at, "cut_drip.wav", 0.35, 0.5);
    }
  one("gelpop", starts[16] + 0.2, "cut_clunk.wav", 0.2, 1);
  one("chime", starts[17] + 0.5, "cut_chime.wav", 0.35, 2.5);
  return <>{items}</>;
};

export const PEN_THEME: CutawayTheme = {
  spec: PEN_SPEC,
  durations: penVoice.durations,
  Scene: ({ t, starts, gen }) => <PenScene t={t} starts={starts} gen={gen} />,
  Sounds: PenAudio,
};
