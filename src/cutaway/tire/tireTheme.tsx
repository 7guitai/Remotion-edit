import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { TIRE_SPEC } from "./tireSpec";
import tireVoice from "../voice/cutaway-tire-short.json";
import { TireScene, rolled, bumpAt } from "./TireScene";
import { CutawayTheme } from "../theme";

// タイヤの回：場面と効果音（転がる音・段差・パンク・空気が抜ける音）
const FIRST = [0, 4, 9, 14];
const genAt = (t: number, starts: number[]) => FIRST.reduce((g, b, i) => (t >= starts[b] ? i : g), 0);

const TireAudio: React.FC<{ starts: number[]; fps: number }> = ({ starts, fps }) => {
  const f = (s: number) => Math.round(s * fps);
  const items: React.ReactNode[] = [];
  const one = (key: string, at: number, file: string, volume: number, sec = 2) =>
    items.push(
      <Sequence key={key} from={f(at)} durationInFrames={f(sec)}>
        <Audio src={staticFile(`sfx/${file}`)} volume={volume} />
      </Sequence>,
    );
  // 段差をこえた瞬間（デコボコの頂上が真下に来た時）：ゴムのかたまりは大きく、空気入り以降は小さく
  const end = starts[starts.length - 1] + 3;
  let prev = 0;
  for (let t = 0; t < end; t += 1 / 60) {
    const g = genAt(t, starts);
    const h = bumpAt(0, rolled(g, t, starts));
    if (h > 2.3 && prev <= 2.3) one(`b${t.toFixed(2)}`, t, "cut_thump.wav", g === 0 ? 0.55 : 0.18, 0.6);
    prev = h;
  }
  for (const b of [4, 9, 14]) {
    one(`wh${b}`, starts[b] - 0.1, "cut_whoosh.wav", 0.4, 1);
  }
  one("nail", starts[7] + 0.7, "cut_pop.wav", 0.5, 0.6);
  one("hiss", starts[8] + 0.1, "cut_hiss.wav", 0.45, 2.6);
  one("thorn", starts[10] + 0.5, "cut_pop.wav", 0.4, 0.6);
  one("hiss2", starts[10] + 0.5, "cut_hiss.wav", 0.25, 1.2);
  one("plug", starts[11] + 0.4, "cut_drip.wav", 0.4, 0.5);
  one("slash", starts[12] + 0.5, "cut_spurt.wav", 0.45, 1.2);
  one("hiss3", starts[12] + 0.5, "cut_hiss.wav", 0.35, 2.6);
  one("nail4", starts[16] + 0.8, "cut_clunk.wav", 0.3, 0.8);
  one("chime", starts[17] + 0.5, "cut_chime.wav", 0.35, 2.5);
  return <>{items}</>;
};

export const TIRE_THEME: CutawayTheme = {
  spec: TIRE_SPEC,
  durations: tireVoice.durations,
  Scene: ({ t, starts, gen }) => <TireScene t={t} starts={starts} gen={gen} />,
  Sounds: TireAudio,
};
