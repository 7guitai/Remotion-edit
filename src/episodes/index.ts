import animalTriviaLong from "./animal-trivia-long.json";
import autumnTrivia from "./autumn-trivia.json";
import bodyTriviaShort from "./body-trivia-short.json";
import loveTriviaShort from "./love-trivia-short.json";
import moneyTriviaShort from "./money-trivia-short.json";
import savings2chShort from "./savings-2ch-short.json";
import sleepTrivia1h from "./sleep-trivia-1h.json";
import thingsRankingShort from "./things-ranking-short.json";
import whatifRotationShort from "./whatif-rotation-short.json";
import whatifMoonShort from "./whatif-moon-short.json";
import illusionQuizShort from "./illusion-quiz-short.json";
import illusionQuiz2Short from "./illusion-quiz2-short.json";
import whatifEarthLong from "./whatif-earth-long.json";
import whatifFrictionShort from "./whatif-friction-short.json";
import whatifGravity2Short from "./whatif-gravity2-short.json";
import whatifGravityShort from "./whatif-gravity-short.json";
import thermoPrShort from "./thermo-pr-short.json";
import whatifSunShort from "./whatif-sun-short.json";
import whatifTunnelShort from "./whatif-tunnel-short.json";
import foodRankingShort from "./food-ranking-short.json";
import bodyRankingShort from "./body-ranking-short.json";
import konbiniRankingShort from "./konbini-ranking-short.json";
import chargerPowerSplit from "./charger-power-split.json";
import coffeeTriviaShort from "./coffee-trivia-short.json";
import japanTriviaShort from "./japan-trivia-short.json";
import moneyTriviaLong from "./money-trivia-long.json";
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
  // ランキングの順位（派手版で「第○位」のステッカーを出す）
  rank?: number;
  // 答えのあとに読み上げる解説（画面には答えの下に小さく出す）
  explain?: string;
  explainSpeech?: string;
};

// 目の錯覚クイズ：図を見せて問題を読み、カウントダウンのあと答え合わせ（図が動いて種明かし）→ 解説
export type IllusionSlide = {
  type: "illusion";
  // 図の種類（intro/outro はタイトルとしめくくり）
  kind:
    | "muller"
    | "ebbinghaus"
    | "contrast"
    | "cafe"
    | "ponzo"
    | "poggendorff"
    | "jastrow"
    | "munker"
    | "cornsweet"
    | "shepard"
    | "intro"
    | "outro";
  text: string;
  speech?: string;
  answer?: string;
  answerSpeech?: string;
  explain?: string;
  explainSpeech?: string;
  // 図の中に出す選択肢（A/B など）
  labels?: [string, string];
};

// 2ch風ショート：集中線の背景に大きな見出し（スレタイや要点）、イラストの上にレスが順番に出る。
// 見出し（NNN.wav）とレス（NNN-rK.wav）を別の声で読み上げる
export type ThreadSlide = {
  type: "thread";
  text: string;
  speech?: string;
  image: string;
  replies?: { text: string; speech?: string; color?: string }[];
};

// 睡眠用：夜空の背景に雑学の文字をふわっと出し、speech をひと続きで読み上げる
export type SleepSlide = {
  type: "sleep";
  text: string;
  answer?: string;
  explain?: string;
  speech: string;
};

// 「もしも」動画の1場面：text を読み上げ（speech があればそちら）、字幕は句読点ごとに切り替える
export type WhatIfSlide = {
  type: "whatif";
  text: string;
  speech?: string;
  image?: string;
  imageSize?: number;
  // 背景（space=宇宙 / night=夜 / sky=空 / sea=海）
  bg?: "space" | "night" | "sky" | "sea";
  // 演出（zoom=寄る / spin=回る / stop=急に止まる / shake=揺れる / wind=暴風 / flood=水が上がる / dark=暗くなる / arrows=矢印 / half=昼と夜 / flip=傾く）
  effect?: "none" | "vanish" | "zoom" | "spin" | "stop" | "shake" | "wind" | "flood" | "dark" | "arrows" | "half" | "flip";
  // 映像の上に出す黄色いラベル（数字など）
  big?: string;
  // 本物の写真の回る地球・月（NASA の地図画像を3Dの球に貼る）
  globe?: import("../components/Globe").GlobeProps;
  // NASA などの動画（public/footage/）。start は使い始める秒、zoom と focus で切り抜く
  footage?: { file: string; start?: number; zoom?: number; focus?: [number, number] };
  // NASA などの写真（public/footage/）。ゆっくり寄りながら見せる
  photo?: { file: string; zoom?: number; focus?: [number, number] };
  // 物理エンジンのシミュレーション（人が出る場面はこれで描く）
  sim?: import("../sim/scenes").SimKind;
  // 重力くらべの右（奥）の世界の重力（1G に対する倍率。ふつうは 0.5）
  simG?: number;
  // 左右（手前・奥）の世界の名前を変えるとき
  simLabels?: [string, string];
  // シミュレーションの途中（秒）から見せる（オープニングの見どころ集など）
  simStart?: number;
  // 章の扉（大きな番号とタイトル）。この場面は字幕を出さない
  card?: { no?: number; title: string[]; sub?: string; tag?: string };
  // 読み上げのあとに、そのまま映像を見せる時間（秒）。エンドカード用など
  hold?: number;
  // 特別な背景（ringsky＝地上から見上げた輪のある夜空、ringsky_day＝昼の空）
  scene?: "ringsky" | "ringsky_day";
  // 地球の断面と、中心を通る穴（地球を貫く穴に飛び込んだら）
  cut?: import("../components/EarthCut").CutMode;
  // 真空断熱のしくみの図解（商品紹介の科学解説）と、商品カードの中身
  thermo?: import("../components/ThermoScene").ThermoMode;
  product?: { name: string; points: string[] };
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
  | ThreadSlide
  | SleepSlide
  | WhatIfSlide
  | IllusionSlide
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
  // "flashy" で1ページ1雑学を派手な編集にする（集中線・叩きつけ文字・フラッシュ・揺れ・効果音）
  style?: "flashy" | "sleep" | "whatif" | "illusion";
  // 目の錯覚クイズの見出し：上の小さな文字と、タイトル横の札（例：上級編）
  kicker?: string;
  badge?: string;
  // 「もしも」動画の上の黒帯に出し続けるタイトル（2行）
  headline?: string[];
  // フレームレート（省略時は 30）。動きの少ない長時間動画は下げると書き出しが速い
  fps?: number;
  // 各スライドの読み上げのあとに入れる間（フレーム。省略時は 12）
  slideGap?: number;
  // ずっと流す環境音（雨の音など）
  ambient?: { file: string; volume: number; name: string };
  // 1ページ1雑学で、振りを読み終えてから答えを出すまでの間（フレーム。省略時は 30）
  answerPause?: number;
  // BGM の音量（省略時は theme.ts の BGM_VOLUME）
  bgmVolume?: number;
  // 背景色（省略時は白）
  background?: string;
  // 読み上げの声（省略時はずんだもん・1.2倍）。name は概要欄のクレジットに使う
  voice?: {
    speaker: number;
    speed: number;
    name: string;
    // 抑揚（1.0 が標準。下げると落ち着いた読み方）と声の高さ（0 が標準）
    intonation?: number;
    pitch?: number;
  };
  // 2ch風のレスを読む声（レスの順番で交互に使う）
  replyVoices?: { speaker: number; speed: number; name: string }[];
  // 強調色（省略時は theme.ts の COLORS.accent / marker）
  accent?: string;
  marker?: string;
  source?: { name: string; url: string };
  // url の代わりに opentracks（OpenTracks の曲番号）でも取得できる
  bgm?: {
    file: string;
    title: string;
    credit: string;
    url?: string;
    opentracks?: number;
    // OpenTracks の別バージョン（Track2 など）
    track?: number;
  };
  // 場面ごとに BGM を切り替える（fromSlide 番目のスライドから。前の曲とはクロスフェード）
  bgmPlaylist?: (NonNullable<Episode["bgm"]> & { fromSlide: number; volume?: number })[];
  readings?: Record<string, string>;
  illustrations: Record<string, Illustration>;
  slides: ScriptSlide[];
};

export const EPISODES: Episode[] = [
  thermoPrShort as Episode,
  whatifTunnelShort as Episode,
  illusionQuiz2Short as Episode,
  whatifGravity2Short as Episode,
  illusionQuizShort as Episode,
  whatifEarthLong as Episode,
  whatifFrictionShort as Episode,
  whatifGravityShort as Episode,
  whatifSunShort as Episode,
  whatifRotationShort as Episode,
  whatifMoonShort as Episode,
  foodRankingShort as Episode,
  bodyRankingShort as Episode,
  konbiniRankingShort as Episode,
  thingsRankingShort as Episode,
  sleepTrivia1h as Episode,
  moneyTriviaLong as Episode,
  japanTriviaShort as Episode,
  bodyTriviaShort as Episode,
  coffeeTriviaShort as Episode,
  savings2chShort as Episode,
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
