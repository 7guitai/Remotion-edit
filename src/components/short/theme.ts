import React from "react";

// 縦型ショート（1080×1920）の配色と配置
// YouTube Shorts の UI（右側のボタン・下部の説明欄）に重ならないよう、要素は上〜中央に寄せる
//
// 文字や面の色は CSS 変数にして、明るい（light）／暗い（dark）テーマを切り替えられるようにしている。
// 強調色（good / bad / accent など）は両テーマ共通。
export const SHORT = {
  width: 1080,
  height: 1920,
  side: 56,
  headerTop: 70,
  cardTop: 300,
  cardHeight: 940,
  captionTop: 1290,
  citeTop: 1600,

  background: "var(--s-background)",
  card: "var(--s-card)",
  cardBorder: "var(--s-card-border)",
  panel: "var(--s-panel)",
  text: "var(--s-text)",
  sub: "var(--s-sub)",
  note: "var(--s-note)",

  accent: "#2f6fdd",
  zunda: "#6dbb4c",
  good: "#2fa36b",
  bad: "#e0524d",
  neutral: "#8f9aab",
};

export type ShortTheme = "light" | "dark";

const VARS: Record<ShortTheme, Record<string, string>> = {
  light: {
    "--s-background": "#eef3f9",
    "--s-card": "#ffffff",
    "--s-card-border": "transparent",
    "--s-panel": "#f2f5fa",
    "--s-text": "#24303f",
    "--s-sub": "#5b6878",
    "--s-note": "#8a95a3",
  },
  dark: {
    "--s-background": "#0d1422",
    "--s-card": "rgba(22, 31, 50, 0.92)",
    "--s-card-border": "rgba(120, 160, 220, 0.22)",
    "--s-panel": "rgba(255, 255, 255, 0.07)",
    "--s-text": "#f1f5fb",
    "--s-sub": "#b4c0d0",
    "--s-note": "#8d9bb0",
  },
};

export const themeVars = (theme: ShortTheme = "light") => VARS[theme] as React.CSSProperties;

// 配置。"kit" は素材キットのセーフゾーン（タイトル帯 Y=80..280、図解 X=40..930 / Y=290..1320、
// 字幕 Y=1340..1540、キャラクター Y=1540〜、右150pxと下250pxは UI 用に空ける）に合わせたもの
export type ShortLayout = {
  cardTop: number;
  cardLeft: number;
  cardRight: number;
  cardHeight: number;
  captionTop: number;
};

export const LAYOUTS: Record<"default" | "kit", ShortLayout> = {
  default: { cardTop: 300, cardLeft: 56, cardRight: 56, cardHeight: 940, captionTop: 1290 },
  kit: { cardTop: 290, cardLeft: 40, cardRight: 150, cardHeight: 1030, captionTop: 1345 },
};

export type Tone = "good" | "bad" | "neutral";

export const toneColor = (tone?: Tone) =>
  tone === "good" ? SHORT.good : tone === "bad" ? SHORT.bad : tone === "neutral" ? SHORT.neutral : SHORT.accent;
