import { CamKey } from "./camera";

// 「断面図×工学の進化」1本ぶんの台本。1文＝1ビート（字幕1枚・ナレーション1つ）。
// ビートの長さはナレーションの長さで決まる。カメラはビートの始まりに次の目標へ動きはじめる。
export type Beat = {
  text: string; // 字幕（1〜2行）
  speech?: string; // 読み上げ（省略時は text の改行を取ったもの）
  sub?: string; // 字幕の上の小さな見出し（世代名など）
  gen: number; // 0〜3：どの世代の模型を見せるか
  cam: Omit<CamKey, "t">;
  // 「でも」＝弱点（超マクロズーム）／「そこで」＝転換（引き）
  role?: "weak" | "turn";
  sfx?: { file: string; at?: number; volume?: number }[];
};

export type CutawaySpec = {
  id: string;
  title: string;
  beats: Beat[];
  voice: { speaker: number; speed: number; name: string };
  bgm?: { file: string; title: string; credit: string; page: string; opentracks: number; volume: number };
  lead: number; // 最初の間（秒）
  gap: number; // 文と文の間
  tail: number; // 最後の余韻
};

export const beatStarts = (spec: CutawaySpec, durations: number[]) => {
  const starts: number[] = [];
  let t = spec.lead;
  spec.beats.forEach((_, i) => {
    starts.push(t);
    t += (durations[i] || 1.5) + spec.gap;
  });
  return { starts, total: t + spec.tail };
};

// いまのビートと、その中の経過時間
export const beatAt = (starts: number[], t: number) => {
  let i = 0;
  for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k;
  return { i, age: t - starts[i] };
};
