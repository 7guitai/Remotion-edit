import chargerPowerSplit from "./charger-power-split.json";
import sleepTrivia from "./sleep-trivia.json";

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

// chapter を付けたスライドの開始時刻が、概要欄のチャプターになる
export type ScriptSlide = (IllustSlide | BarsSlide | TableSlide | PointsSlide) & {
  chapter?: string;
};

export type Episode = {
  id: string;
  title: string;
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
];

export const getEpisode = (id: string): Episode => {
  const ep = EPISODES.find((e) => e.id === id);
  if (!ep) {
    throw new Error(`Unknown episode: ${id}`);
  }
  return ep;
};
