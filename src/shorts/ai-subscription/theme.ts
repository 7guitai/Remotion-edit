import { staticFile } from "remotion";

export { FONT, SHADOW } from "../common/theme";

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

export const ASSET = (p: string) => staticFile(`shorts/ai-subscription/${p}`);

export const BGM_VOLUME = 0.12;
