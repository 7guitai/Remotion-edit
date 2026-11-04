import { TimelineSpec } from "./timeline";

// 「指数関数エスカレーション」動画1本ぶんの設定。
// 物理量は t（シミュレーション内の秒）の関数で、HUD・字幕・場面の切り替えはすべて t で指定する。

export type Caption = {
  // 表示を始める t（シミュレーション内の秒）
  t: number;
  // 下の実況テロップ（2〜3行）
  text: string;
  // 読み上げ（省略時は text の改行を取ったもの）。"-" で読み上げなし
  speech?: string;
};

export type SfxCue = {
  t: number;
  file: string;
  volume?: number;
  // 実時間で何秒鳴らすか（ループ音など）
  seconds?: number;
};

// 場面（カメラ）の切り替え。scene は 3D の描き方、t からその場面
export type ShotKind = "closeup" | "plaza" | "street" | "front" | "back" | "rooftop" | "region" | "space" | "spin";
export type Shot = { t: number; kind: ShotKind };

export type EscalationSpec = {
  id: string;
  title: string;
  // カウントダウン中に下に出すテーマ
  theme: string;
  themeSpeech: string;
  timeline: TimelineSpec;
  // HUD 2行目（メイン物理量の名前）と 3行目（値）
  label: string;
  value: (t: number) => string;
  // HUD 4行目（サブ指標）
  sub: (t: number) => string;
  // HUD 5行目のバッジ（なければ null）
  badge: (t: number) => { text: string; red?: boolean } | null;
  captions: Caption[];
  sfx: SfxCue[];
  shots: Shot[];
  // 最後に小さく出す注釈
  note: { t: number; text: string };
  // 声（VOICEVOX の話者と速さ）
  voice: { speaker: number; speed: number; name: string };
  // 群衆の「うわっ」などの声（t, ファイル）
  shouts: { t: number; file: string }[];
  bgm?: { file: string; title: string; credit: string; page: string; opentracks: number; volume: number };
};
