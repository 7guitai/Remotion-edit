export type Trivia = {
  emoji: string;
  // 見出し（大きく表示するテロップ）
  title: string;
  // 補足説明（吹き出しで表示）
  body: string;
  // 画面上に大きく強調する数字・キーワード
  highlight: string;
};

export const TRIVIA: Trivia[] = [
  {
    emoji: "🛌",
    title: "人生の約3分の1は\n眠っている",
    body: "1日8時間眠ると、90歳まで生きた場合\nおよそ30年をベッドの上で過ごす計算に。",
    highlight: "約30年",
  },
  {
    emoji: "🐬",
    title: "イルカは脳を\n半分ずつ眠らせる",
    body: "「半球睡眠」と呼ばれ、片方の脳が休む間も\nもう片方で呼吸や周囲の警戒を続けている。",
    highlight: "半球睡眠",
  },
  {
    emoji: "⏰",
    title: "断眠の最長記録は\n約11日間",
    body: "1964年、アメリカの高校生が264時間起き続けた。\n健康被害の危険から、現在は記録の認定自体が行われていない。",
    highlight: "264時間",
  },
  {
    emoji: "💭",
    title: "夢は毎晩\n見ている",
    body: "一晩にレム睡眠は4〜5回訪れ、そのたびに夢を見ている。\n「夢を見なかった」のは、覚えていないだけ。",
    highlight: "一晩4〜5回",
  },
  {
    emoji: "⚡",
    title: "寝入りばなの「ビクッ」\nには名前がある",
    body: "「ジャーキング（入眠時ぴくつき）」と呼ばれ、\n多くの人が経験するごく普通の現象。",
    highlight: "ジャーキング",
  },
  {
    emoji: "📱",
    title: "寝る前のスマホは\n眠気を遠ざける",
    body: "画面の光が、眠りを促すホルモン「メラトニン」\nの分泌を抑えてしまうため。",
    highlight: "メラトニン",
  },
  {
    emoji: "🍔",
    title: "寝不足だと\n太りやすくなる",
    body: "食欲を高める「グレリン」が増え、満腹を伝える\n「レプチン」が減ることがわかっている。",
    highlight: "食欲UP",
  },
  {
    emoji: "📉",
    title: "「寝だめ」は\nできない",
    body: "たまった睡眠不足（睡眠負債）は週末だけでは返しきれない。\n毎日の睡眠リズムを整えるのが近道。",
    highlight: "睡眠負債",
  },
  {
    emoji: "🐨",
    title: "コアラは1日\n約20時間眠る",
    body: "主食のユーカリは栄養が少なく消化も大変。\nエネルギーを節約するためによく眠る。",
    highlight: "約20時間",
  },
  {
    emoji: "🛁",
    title: "お風呂は寝る\n1〜2時間前がベスト",
    body: "上がった体温が下がっていくタイミングで\n自然な眠気が訪れやすくなる。",
    highlight: "1〜2時間前",
  },
];

export const FPS = 30;
export const OPENING_FRAMES = 150;
export const TRIVIA_FRAMES = 270;
export const ENDING_FRAMES = 180;
export const TRANSITION_FRAMES = 15;

export const TOTAL_FRAMES =
  OPENING_FRAMES +
  TRIVIA.length * TRIVIA_FRAMES +
  ENDING_FRAMES -
  (TRIVIA.length + 1) * TRANSITION_FRAMES;
