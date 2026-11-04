import { EscalationSpec } from "./types";
import { formatDuration, formatJaBig, formatPressure, formatSpeed, formatTiny } from "./format";
import { dayLength, dayShorter, equatorBeta, pressure, sunsAt, windSpeed } from "./fanPhysics";

// もしもシリーズ：扇風機の風が1秒ごとに2倍になったら？（指数関数エスカレーション型の1本め）
// 数値は fanPhysics.ts の式から出る（字幕の数字も、その式で確かめた値）
const NOTE_T = 111;

export const FAN_SPEC: EscalationSpec = {
  id: "escalate-fan-short",
  title: "もし扇風機の風が、1秒ごとに2倍になったら？",
  theme: "扇風機の風が\n1秒ごとに2倍になったら",
  themeSpeech: "もし、扇風機の風が、1秒ごとに2倍になったら？",
  timeline: {
    countdown: 3,
    segments: [
      { from: 0, to: 28, rate: 1 },
      { from: 28, to: 86, rate: 8 },
      // 地球がこわれる所は、少しゆっくり（まだ早送り）
      { from: 86, to: 96, rate: 3 },
      { from: 96, to: 104, rate: 8 },
      // クライマックスは ふつうの速さ
      { from: 104, to: 116, rate: 1 },
    ],
  },
  label: "風の圧力",
  value: (t) => formatPressure(pressure(t)),
  sub: (t) => (t < 26 ? `風の速さ ${formatSpeed(windSpeed(t))}` : `1日の長さ ${formatDuration(dayLength(t))}`),
  badge: (t) => {
    if (t >= 30 && t < 84) return { text: `◎ 1日が ${formatTiny(dayShorter(t))} 短く` };
    if (t >= 100) {
      const b = equatorBeta(t);
      const pct = b > 0.9999 ? "99.99…" : (b * 100).toFixed(b > 0.99 ? 2 : 1);
      return { text: `◎ 赤道の速さ：光速の${pct}%`, red: b > 0.5 };
    }
    return null;
  },
  captions: [
    { t: 0.1, text: "そよ風くらい\n（風速4m）", speech: "はじめは、そよ風くらい。" },
    { t: 3, text: "帽子が飛ぶ強い風\n（風速11m）", speech: "3秒で、帽子が飛ぶ強い風。" },
    { t: 5.5, text: "台風なみの風（風速27m）\nみんな逃げだす", speech: "5秒で台風なみ。みんな逃げだした！" },
    { t: 8.5, text: "猛烈な台風をこえる風（風速76m）\n窓ガラスが割れる", speech: "8秒。窓ガラスが割れる。" },
    { t: 12.8, text: "音速をこえた（秒速340m）\n壁に穴があく", speech: "13秒で音速をこえて、壁に穴があく。" },
    { t: 16.9, text: "押す力 約30トン\n向かいの建物が吹き飛ぶ", speech: "押す力は30トン。建物が吹き飛ぶ。" },
    { t: 19.3, text: "反動 約160トン\nうしろの建物がくずれる\n（扇風機は魔法で固定）", speech: "反動で、うしろの建物もくずれる。扇風機は、魔法で固定。" },
    { t: 22.9, text: "秒速11.2km（第二宇宙速度）\n風が宇宙へぬけていく", speech: "23秒。風は、宇宙までぬけていく。" },
    { t: 28, text: "ここから早送り\n風は光の柱のように", speech: "ここから早送り。" },
    { t: 51, text: "風の速さが光速の半分をこえた\n地球の自転が少しずつ速くなる", speech: "風は光の半分の速さ。地球の回転が、速くなっていく。" },
    { t: 88, text: "1日の長さが\n半分以下に", speech: "1日が、半分以下に。" },
    { t: 91.7, text: "1日が84分に\n本当なら、ここで地球がこわれる\n（今回は魔法でこわれない）", speech: "本当なら、ここで地球がこわれる。" },
    { t: 104.3, text: "地球が1秒に1回転\n風が光のうずをえがく", speech: "地球が1秒に1回転。風が、光のうずをえがく。" },
    { t: 107.5, text: "赤道の速さは光速の手前で\nもう速くならない", speech: "赤道の速さは、光の手前で頭打ち。" },
    { t: NOTE_T, text: "扇風機の強さには\n気をつけようね", speech: "扇風機の強さには、気をつけようね。" },
  ],
  note: {
    t: NOTE_T + 0.6,
    text: `※${NOTE_T}秒の時点で、風のエネルギーは太陽の約${formatJaBig(sunsAt(NOTE_T))}個ぶん。\n本当なら、とっくに地球はこわれています。`,
  },
  sfx: [
    { t: 8.6, file: "sfx/esc_glass.wav", volume: 0.5 },
    { t: 12.9, file: "sfx/esc_boom.wav", volume: 0.5 },
    { t: 17.0, file: "sfx/esc_rumble.wav", volume: 0.7 },
    { t: 19.4, file: "sfx/esc_rumble.wav", volume: 0.6 },
    { t: 91.8, file: "sfx/esc_boom.wav", volume: 0.4 },
  ],
  shots: [
    { t: 0, kind: "closeup" },
    { t: 2, kind: "plaza" },
    { t: 8, kind: "street" },
    { t: 15.5, kind: "front" },
    { t: 19.0, kind: "back" },
    { t: 21.2, kind: "rooftop" },
    { t: 24.6, kind: "region" },
    { t: 26.6, kind: "space" },
    { t: 86, kind: "spin" },
  ],
  voice: { speaker: 3, speed: 1.25, name: "ずんだもん" },
  bgm: { file: "dominus_deus.mp3", title: "全てを創造する者「Dominus Deus」", credit: "KK", page: "https://opentracks.com/bgm/detail/5588", opentracks: 5588, volume: 0.1 },
  shouts: [
    { t: 5.0, file: "shout0" },
    { t: 5.3, file: "shout1" },
  ],
};
