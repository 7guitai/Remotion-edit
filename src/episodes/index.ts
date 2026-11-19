import chargerPowerSplit from "./charger-power-split.json";
import sleepTrivia from "./sleep-trivia.json";
import aiHallucination from "./ai-hallucination.json";
import gemini4Neon from "./gemini4-neon.json";

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
  sub?: string;
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
  // 項目ごとの数値（例: 1タスク費用 / 処理時間）。paper では表のように並べる
  metrics?: { label: string; value: string }[];
  tone?: "good" | "bad" | "neutral";
};
export type VersusSlide = {
  type: "versus";
  text: string;
  speech?: string;
  left: VersusSide;
  right: VersusSide;
  note?: string;
  // 比較の上に置く見出しと1行の補足（注意点のカットなど）
  lead?: string;
  leadNote?: string;
  leadTone?: "good" | "bad" | "neutral";
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

// 横棒ランキング（スコアの比較。highlight を付けた行を強調）
export type RankingSlide = {
  type: "ranking";
  text: string;
  speech?: string;
  title?: string;
  unit?: string;
  max?: number;
  rows: { label: string; sub?: string; value: number; highlight?: boolean }[];
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
// expression は立ち絵の表情（character.images のキー）、se は切り替え時の効果音（sounds のキー）
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
  | RankingSlide
  | EmphasisSlide
) & {
  chapter?: string;
  cite?: string;
  expression?: string;
  se?: string;
  // このスライドだけ話速を変える（冒頭のフックを速くするなど）
  voiceSpeed?: number;
};

export type Episode = {
  id: string;
  title: string;
  // "short" は縦型ショート（1080×1920）。省略時は横型（1920×1080）
  format?: "wide" | "short";
  // ショートの画面上部に出すシリーズ名と見出し
  series?: string;
  headline?: string;
  // ショートの見た目。素材キットの背景・タイトル帯を使うときは layout: "kit"
  look?: {
    theme?: "light" | "dark" | "paper";
    layout?: "default" | "kit" | "paper";
    label?: string; // paper: ヘッダー上段の小さなラベル
    background?: string; // public/ からのパス
    banner?: string; // public/ からのパス（1080×280、上端に置く）
  };
  // アフィリエイト等を含む動画は画面に「PR」を表示する（ステマ規制対応）
  pr: boolean;
  source?: { name: string; url: string };
  // 立ち絵（ショートのキャラクター欄に表示）。画像は public/characters/ に npm run assets で取得
  character?: {
    name: string;
    credit: string;
    page: string;
    // talk は口を開けた差分（あれば話している間に交互に表示する）。url があれば npm run assets で取得
    images: Record<string, { file: string; url?: string; talk?: string; note?: string }>;
    // 紙面レイアウトでの立ち絵の高さ（px）
    spriteHeight?: number;
    // 画像を取得する方法（URL で取れない素材の案内）
    howto?: string;
  };
  // 効果音。public/se/ に npm run assets で取得
  sounds?: Record<string, { file: string; url: string; title: string }>;
  soundCredit?: { name: string; page: string };
  // 複数の一次資料（概要欄に一覧で出す）
  sources?: { label: string; url: string }[];
  bgm: { file: string; title: string; credit: string; url: string };
  // BGM の音量（省略時は theme.ts の BGM_VOLUME）
  bgmVolume?: number;
  // 読み上げの設定（話速・前後の無音秒数）と VOICEVOX ユーザー辞書
  voice?: { speed?: number; pre?: number; post?: number };
  voiceDict?: { surface: string; pronunciation: string; accent_type?: number }[];
  readings?: Record<string, string>;
  illustrations: Record<string, Illustration>;
  slides: ScriptSlide[];
};

export const EPISODES: Episode[] = [
  sleepTrivia as Episode,
  chargerPowerSplit as Episode,
  aiHallucination as Episode,
  gemini4Neon as Episode,
];

export const getEpisode = (id: string): Episode => {
  const ep = EPISODES.find((e) => e.id === id);
  if (!ep) {
    throw new Error(`Unknown episode: ${id}`);
  }
  return ep;
};
