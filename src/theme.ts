import { loadFont } from "@remotion/fonts";
import { staticFile, useVideoConfig } from "remotion";

// フォントは public/fonts に同梱（ネットワーク不要でレンダリングできる）
export const roundedFont = "MPLUSRounded";
export const headingFont = "Dela Gothic One";

loadFont({
  family: roundedFont,
  url: staticFile("fonts/MPLUSRounded1c-Medium.ttf"),
  weight: "500",
});
loadFont({
  family: roundedFont,
  url: staticFile("fonts/MPLUSRounded1c-ExtraBold.ttf"),
  weight: "800",
});
loadFont({
  family: headingFont,
  url: staticFile("fonts/DelaGothicOne-Regular.ttf"),
});

export const COLORS = {
  skyTop: "#0b1033",
  skyBottom: "#2a1f5c",
  moon: "#fff4c7",
  yellow: "#ffe45c",
  pink: "#ff8fc7",
  cyan: "#7fe3ff",
  text: "#ffffff",
  bubble: "rgba(255,255,255,0.95)",
  bubbleText: "#1d1a3a",
};

// 横長・縦長どちらでも同じ見た目になるよう、短辺1080pxを基準にスケールする
export const useScale = () => {
  const { width, height } = useVideoConfig();
  return {
    s: Math.min(width, height) / 1080,
    vertical: height > width,
  };
};

// テレビのバラエティ風の縁取り文字
export const outline = (color: string, px: number) => {
  const steps = 16;
  const shadows: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    shadows.push(
      `${(Math.cos(a) * px).toFixed(1)}px ${(Math.sin(a) * px).toFixed(1)}px 0 ${color}`,
    );
  }
  return shadows.join(",");
};
