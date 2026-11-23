import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// 見出しもテロップも Noto Sans JP（Black / Bold）で統一して、落ち着いた情報系の見た目にする
export const FONT = "NotoSansJP";

loadFont({ family: FONT, url: staticFile("fonts/NotoSansJP-900.ttf"), weight: "900" });
loadFont({ family: FONT, url: staticFile("fonts/NotoSansJP-700.ttf"), weight: "700" });

export const C = {
  bg: "#e8eaef",
  ink: "#1d212c",
  sub: "#5d6373",
  line: "#e3e6ee",
  white: "#ffffff",
  panel: "rgba(255,255,255,0.86)",
  dark: "rgba(27,30,41,0.94)",
  brown: "#5b4336",
  red: "#ef3a4f",
  yellow: "#ffd54a",
  green: "#3aa655",
  gray: "#8b91a1",
};

export const SHADOW = "0 18px 48px rgba(20,24,40,0.18), 0 3px 10px rgba(20,24,40,0.10)";

export const ASSET = (p: string) => staticFile(`shorts/ai-subscription/${p}`);

export const BGM_VOLUME = 0.12;
