import { loadFont } from "@remotion/fonts";
import { createContext, useContext } from "react";
import { staticFile } from "remotion";

// フォントは public/fonts に同梱（ネットワーク不要でレンダリングできる）
export const fontFamily = "MPLUSRounded";

loadFont({
  family: fontFamily,
  url: staticFile("fonts/MPLUSRounded1c-Medium.ttf"),
  weight: "500",
});
loadFont({
  family: fontFamily,
  url: staticFile("fonts/MPLUSRounded1c-ExtraBold.ttf"),
  weight: "800",
});
loadFont({
  family: fontFamily,
  url: staticFile("fonts/MPLUSRounded1c-Black.ttf"),
  weight: "900",
});

export const COLORS = {
  background: "#ffffff",
  text: "#3a3a3a",
  placeholder: "#f3f3f3",
  note: "#9a9a9a",
  border: "#dddddd",
  panel: "#f6f6f6",
  // グラフの2系列（PC / スマホ）
  primary: "#3d7cc9",
  secondary: "#f0a53a",
  // テロップの **強調** と、その下に引くマーカー
  accent: "#e0602b",
  marker: "#ffe08a",
  // クイズの正解
  correct: "#e8453c",
};

// BGM の音量（ナレーションは 1.0）
export const BGM_VOLUME = 0.12;

// エピソードごとに差し替えられる強調色（テロップの強調・番号・カウントダウン）
export type Accent = { accent: string; marker: string };
export const AccentContext = createContext<Accent>({
  accent: COLORS.accent,
  marker: COLORS.marker,
});
export const useAccent = () => useContext(AccentContext);
