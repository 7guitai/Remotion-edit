import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// 見出し（太くて目立つ）とテロップ（読みやすい極太ゴシック）
export const HEAD_FONT = "DelaGothicOne";
export const BODY_FONT = "MPLUS1pBlack";

loadFont({ family: HEAD_FONT, url: staticFile("fonts/DelaGothicOne-Regular.ttf"), weight: "400" });
loadFont({ family: BODY_FONT, url: staticFile("fonts/MPLUS1p-Black.ttf"), weight: "900" });

export const C = {
  bg: "#0c1130",
  bg2: "#1b2160",
  ink: "#1d2240",
  white: "#ffffff",
  yellow: "#ffd23f",
  red: "#ff4d6d",
  green: "#5bbd3c",
  gray: "#8a90a8",
  card: "#ffffff",
};

export const ASSET = (p: string) => staticFile(`shorts/ai-subscription/${p}`);

export const BGM_VOLUME = 0.13;
