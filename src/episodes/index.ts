import chargerPowerSplit from "./charger-power-split.json";
import sleepTrivia from "./sleep-trivia.json";
import aiHallucination from "./ai-hallucination.json";

export type Illustration = {
  emoji: string;
  irasutoya: string;
  url?: string;
};

// テロップ＋イラスト
export type IllustSlide = {
  type?: "illust";
  text: string;
  speech?: string;
  image: string;
};

// 横棒グラフ（PC とスマホへの電力配分など、2項目の積み上げ）
export type BarsSlide = {
  type: "bars";
  text: string;
  speech?: string;
  bars: { label: string; sub?: string; pc: number; phone: number }[];
  note?: string;
};

// 比較表
export type TableSlide = {
  type: "table";
  text: string;
  speech?: string;
  columns: string[];
  rows: string[][];
  note?: string;
};

// 箇条書き（結論・チェックポイント）
export type PointsSlide = {
  type: "points";
  text: string;
  speech?: string;
  items: { label: string; body: string }[];
};

// ---- ショート（縦型）用の図解スライド ----

// 冒頭の問いかけ（大きな文字）
export type HookSlide = {
  type: "hook";
  text: string;
  speech?: string;
  headline: string;
  emoji?: string;
};

// 引用する資料の紹介カード
export type SourceSlide = {
  type: "source";
  text: string;
  speech?: string;
  org: string;
  date: string;
  title: string;
  titleJa?: string;
  summary?: string;
};

// 2つを並べて比べる（A vs B）
export type VersusSide = {
  label: string;
  value?: string;
  lines?: string[];
  tone?: "good" | "bad" | "neutral";
};
export type VersusSlide = {
  type: "versus";
  text: string;
  speech?: string;
  left: VersusSide;
  right: VersusSide;
  note?: string;
};

// 矢印でつなぐ流れ図
export type FlowSlide = {
  type: "flow";
  text: string;
  speech?: string;
  steps: { label: string; sub?: string; emoji?: string; tone?: "good" | "bad" | "neutral" }[];
  note?: string;
};

// 100% 積み上げ横棒（内訳の比較）
export type StackedSlide = {
  type: "stacked";
  text: string;
  speech?: string;
  series: { label: string; tone: "good" | "bad" | "neutral" }[];
  rows: { label: string; values: number[] }[];
  note?: string;
};

// 大きな数字や一言で強調
export type EmphasisSlide = {
  type: "emphasis";
  text: string;
  speech?: string;
  big: string;
  sub?: string;
};

// chapter を付けたスライドの開始時刻が、概要欄のチャプターになる
// cite を付けると、ショートでは画面下に出典として表示する
export type ScriptSlide = (
  | IllustSlide
  | BarsSlide
  | TableSlide
  | PointsSlide
  | HookSlide
  | SourceSlide
  | VersusSlide
  | FlowSlide
  | StackedSlide
  | EmphasisSlide
) & {
  chapter?: string;
  cite?: string;
};

export type Episode = {
  id: string;
  title: string;
  // "short" は縦型ショート（1080×1920）。省略時は横型（1920×1080）
  format?: "wide" | "short";
  // ショートの画面上部に出すシリーズ名と見出し
  series?: string;
  headline?: string;
  // アフィリエイト等を含む動画は画面に「PR」を表示する（ステマ規制対応）
  pr: boolean;
  source?: { name: string; url: string };
  bgm: { file: string; title: string; credit: string; url: string };
  readings?: Record<string, string>;
  illustrations: Record<string, Illustration>;
  slides: ScriptSlide[];
};

export const EPISODES: Episode[] = [
  sleepTrivia as Episode,
  chargerPowerSplit as Episode,
  aiHallucination as Episode,
];

export const getEpisode = (id: string): Episode => {
  const ep = EPISODES.find((e) => e.id === id);
  if (!ep) {
    throw new Error(`Unknown episode: ${id}`);
  }
  return ep;
};
