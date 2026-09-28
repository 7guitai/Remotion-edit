import { loadFont } from "@remotion/fonts";
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
