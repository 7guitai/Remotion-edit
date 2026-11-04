import React from "react";
import { EscalationSpec, Shot } from "./types";
import { makeTimeline } from "./timeline";

// テーマごとの「世界」（3D の場面と環境音）。EscalationVideo は HUD・字幕・ナレーション・効果音など共通の部分を受けもつ
export type Timeline = ReturnType<typeof makeTimeline>;
export type WorldProps = {
  t: number; // シミュレーション内の時刻
  r: number; // 実時間（秒）
  rate: number; // いまの早送りの倍率
  frame: number;
  fps: number;
  width: number;
  height: number;
  shot: Shot;
  u: number; // 場面の中の進み具合 0〜1
  shake: number;
};
export type VoiceInfo = { theme: number; captions: number[]; shouts: number[] };
export type Theme = {
  spec: EscalationSpec;
  voice: VoiceInfo;
  World: React.FC<WorldProps>;
  // 環境音（風・うなりなど）。Sequence を並べて返す
  Ambience: React.FC<{ tl: Timeline; fps: number }>;
  // 画面の揺れ [t, 大きさ, 長さ]、白いフラッシュの t
  shakes: [number, number, number][];
  flashes: number[];
  // 宇宙の場面などで揺れを弱める
  shakeScale?: (kind: string) => number;
};
