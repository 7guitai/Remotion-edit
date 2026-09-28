import autumnTrivia from "./autumn-trivia.json";
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

// 三択などのクイズ。answer がなければ出題（読み上げ後にカウントダウン）、
// あれば正解発表（answer 番目の選択肢を強調）
export type QuizSlide = {
  type: "quiz";
  text: string;
  speech?: string;
  choices: string[];
  answer?: number;
};

// chapter を付けたスライドの開始時刻が、概要欄のチャプターになる。
// no を付けたスライドから次の chapter まで、画面左上に「雑学 No.○」を表示する。
// テロップの **〜** は強調表示（読み上げでは記号を除く）
export type ScriptSlide = (
  | IllustSlide
  | BarsSlide
  | TableSlide
  | PointsSlide
  | QuizSlide
) & {
  chapter?: string;
  no?: number;
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
  autumnTrivia as Episode,
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
