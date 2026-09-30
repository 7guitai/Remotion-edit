import animalTriviaLong from "./animal-trivia-long.json";
import autumnTrivia from "./autumn-trivia.json";
import loveTriviaShort from "./love-trivia-short.json";
import moneyTriviaShort from "./money-trivia-short.json";
import chargerPowerSplit from "./charger-power-split.json";
import sleepTrivia from "./sleep-trivia.json";

export type Illustration = {
  emoji: string;
  // 素材の名前（いらすとや以外も含む）
  irasutoya: string;
  url?: string;
  // 素材の配布元（概要欄のクレジット。省略時は「いらすとや」）
  credit?: string;
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

// 1ページ1雑学（ショート向け）。text（上の振り）を読んだあと、
// 少し間をあけて answer（下の答え）を表示して読み上げる。note は読み上げない補足
export type TriviaSlide = {
  type: "trivia";
  text: string;
  speech?: string;
  image: string;
  answer?: string;
  answerSpeech?: string;
  note?: string;
  // 答えのあとに読み上げる解説（画面には答えの下に小さく出す）
  explain?: string;
  explainSpeech?: string;
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
  | TriviaSlide
) & {
  chapter?: string;
  no?: number;
};

export type Episode = {
  id: string;
  title: string;
  // アフィリエイト等を含む動画は画面に「PR」を表示する（ステマ規制対応）
  pr: boolean;
  // "short" で縦型（1080×1920）の YouTube ショート
  format?: "landscape" | "short";
  // ショートの上部のタイトル帯（省略時は表示）
  titleBand?: boolean;
  // 背景色（省略時は白）
  background?: string;
  // 読み上げの声（省略時はずんだもん・1.2倍）。name は概要欄のクレジットに使う
  voice?: { speaker: number; speed: number; name: string };
  // 強調色（省略時は theme.ts の COLORS.accent / marker）
  accent?: string;
  marker?: string;
  source?: { name: string; url: string };
  // url の代わりに opentracks（OpenTracks の曲番号）でも取得できる
  bgm: {
    file: string;
    title: string;
    credit: string;
    url?: string;
    opentracks?: number;
  };
  readings?: Record<string, string>;
  illustrations: Record<string, Illustration>;
  slides: ScriptSlide[];
};

export const EPISODES: Episode[] = [
  animalTriviaLong as Episode,
  moneyTriviaShort as Episode,
  loveTriviaShort as Episode,
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
