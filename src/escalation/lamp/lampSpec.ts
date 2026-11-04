import { EscalationSpec } from "../types";
import { formatJaSig, formatPowerJa } from "../format";
import { lumen, lux, power, surfaceTemp, flux, sunsAt, L_SUN, L_GALAXY } from "./lampPhysics";

// もしもシリーズ：夜の街灯の明るさが、1秒ごとに2倍になったら？（エスカレーション型の2本め）
// 字幕の t は lampPhysics.ts の式から逆算した値（scripts で確認：オフィス4.3、くもり8.7、真夏11.97、…、銀河118.5）
const NOTE_T = 121;
const tSun = Math.log2(L_SUN / power(0));

export const LAMP_SPEC: EscalationSpec = {
  id: "escalate-lamp-short",
  title: "もし夜の街灯の明るさが、1秒ごとに2倍になったら？",
  theme: "夜の街灯が\n1秒ごとに2倍明るくなったら",
  themeSpeech: "もし、夜の街灯の明るさが、1秒ごとに2倍になったら？",
  timeline: {
    countdown: 3,
    segments: [
      { from: 0, to: 18, rate: 1 },
      { from: 18, to: 26, rate: 2 },
      { from: 26, to: 34, rate: 1.6 },
      // ビルが押し飛ばされる所は、ほぼふつうの速さ
      { from: 34, to: 41, rate: 1.15 },
      { from: 41, to: 82, rate: 10 },
      { from: 82, to: 96, rate: 3.5 },
      { from: 96, to: 106, rate: 2.5 },
      { from: 106, to: 116, rate: 5 },
      { from: 116, to: 124, rate: 1 },
    ],
  },
  label: "街灯の明るさ",
  value: (t) => `${formatJaSig(lumen(t))} ルーメン`,
  sub: (t) => {
    if (t < 20) return `足もとの明るさ ${formatJaSig(lux(t, 4))} ルクス`;
    if (t < 41) {
      const c = surfaceTemp(flux(t, 10)) - 273;
      return `向かいのビルの壁 約${c < 1000 ? Math.round(c / 10) * 10 : formatJaSig(Math.round(c / 100) * 100)}℃`;
    }
    return `光のエネルギー 毎秒 ${formatPowerJa(power(t))}`;
  },
  badge: (t) => {
    if (t >= 41 && t < tSun) return { text: `◎ 太陽をこえるまで あと${Math.ceil(tSun - t)}回の2倍` };
    if (t >= tSun) {
      const s = sunsAt(t);
      if (power(t) >= L_GALAXY) return { text: `◎ 天の川銀河より明るい（太陽${formatJaSig(s)}個ぶん）`, red: true };
      return { text: `◎ 太陽 ${formatJaSig(s)}個ぶんの明るさ`, red: s > 1e6 };
    }
    return null;
  },
  captions: [
    { t: 0.1, text: "ふつうの街灯\n（約5000ルーメン）", speech: "はじめは、ふつうの街灯。" },
    { t: 4.33, text: "足もとがオフィスくらいの\n明るさに", speech: "4秒で、オフィスくらいの明るさ。" },
    { t: 8.65, text: "くもりの日の昼の明るさ\n夜なのに、昼みたい", speech: "夜なのに、昼みたい。" },
    { t: 11.97, text: "真夏の昼の日ざしと同じ明るさ\nまぶしくて目を開けられない", speech: "じゅうにびょう。真夏の日ざしの明るさ。まぶしい！" },
    { t: 14.56, text: "光の熱で、はだがヒリヒリ\nみんな逃げだす", speech: "光の熱で、はだがヒリヒリ。みんな逃げだした！" },
    { t: 18.52, text: "熱で窓ガラスがひび割れる", speech: "窓ガラスが、熱でひび割れる。" },
    { t: 19.79, text: "部屋のカーテンが燃えだす", speech: "カーテンが燃えだす。" },
    { t: 22.85, text: "コンクリートの壁が\n赤く光りだす（約900℃）", speech: "壁が、赤く光りだした。" },
    { t: 26.17, text: "壁が白く光って、とけはじめる\n（約1800℃）", speech: "白く光って、とけはじめる。" },
    { t: 29.5, text: "街灯のまわりは\n太陽の表面と同じ明るさ", speech: "街灯のまわりは、太陽の表面と同じ明るさ。" },
    { t: 35.4, text: "表面が蒸発する反動で\nビルが押し飛ばされる\n（街灯は魔法でこわれない）", speech: "蒸発する反動で、ビルが押し飛ばされる。街灯は、魔法でこわれない。" },
    { t: 41, text: "ここから早送り", speech: "ここから早送り。" },
    { t: 60.91, text: "1秒ぶんの光で\n日本で使う電気の約10年ぶん", speech: "1秒の光で、にほんの電気の10年ぶん。" },
    { t: 84.25, text: "太陽より明るくなった\n（空に太陽が2つ）", speech: "ついに、太陽より明るくなった。" },
    { t: 87.98, text: "地面が吸った熱で\n海がぜんぶ蒸発するほど", speech: "海が、ぜんぶ蒸発するほどの熱。" },
    { t: 91.48, text: "地球の表面の岩が\nとけるほどの熱", speech: "地球の岩も、とけていく。" },
    { t: 104.03, text: "本当なら、地球がバラバラになる熱\n（今回は魔法でこわれない）", speech: "本当なら、地球がバラバラになる。" },
    { t: 118.47, text: "天の川銀河の星\nぜんぶより明るい", speech: "とうとう、天の川銀河の星、ぜんぶより明るい。" },
    { t: NOTE_T, text: "夜道を照らす街灯は\nちょうどいい明るさがいちばん", speech: "街灯は、ちょうどいい明るさが、いちばんだね。" },
  ],
  note: {
    t: NOTE_T + 0.6,
    text: `※${NOTE_T}秒で、街灯は太陽 約${formatJaSig(sunsAt(NOTE_T))}個ぶんの明るさ。\n光1W＝300ルーメンで計算。宇宙の距離は縮めています。`,
  },
  sfx: [
    { t: 18.52, file: "sfx/esc_crack.wav", volume: 0.5 },
    { t: 19.79, file: "sfx/esc_ignite.wav", volume: 0.45 },
    { t: 35.5, file: "sfx/esc_boom.wav", volume: 0.5 },
    { t: 35.6, file: "sfx/esc_rumble.wav", volume: 0.6 },
    { t: 84.25, file: "sfx/esc_flare.wav", volume: 0.45 },
    { t: 104.03, file: "sfx/esc_boom.wav", volume: 0.35 },
    { t: 118.47, file: "sfx/esc_flare.wav", volume: 0.55 },
  ],
  shots: [
    { t: 0, kind: "lampClose" },
    { t: 2, kind: "lampPlaza" },
    { t: 10.5, kind: "lampLow" },
    { t: 16.5, kind: "lampFront" },
    { t: 24, kind: "lampOrbit" },
    { t: 32.5, kind: "lampWide" },
    { t: 38.3, kind: "lampRise" },
    { t: 41, kind: "night" },
    { t: 52, kind: "nightSpace" },
    { t: 82.6, kind: "solar" },
    { t: 87.2, kind: "boil" },
    { t: 108.5, kind: "galaxy" },
  ],
  voice: { speaker: 8, speed: 1.2, name: "春日部つむぎ" },
  bgm: { file: "owaru_yoru.mp3", title: "全てが終わる夜に", credit: "しゃろう", page: "https://opentracks.com/bgm/detail/7578", opentracks: 7578, volume: 0.1 },
  shouts: [
    { t: 12.3, file: "shout0", speaker: 13, word: "まぶしっ！" },
    { t: 14.4, file: "shout1", speaker: 2, word: "あつい！" },
    { t: 14.8, file: "shout2", speaker: 11, word: "にげろー！" },
  ],
};
