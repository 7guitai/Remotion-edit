import { staticFile } from "remotion";
import { ShotMeta } from "../common/ShotFrame";
import { buildTimeline, Line } from "../common/timeline";
import script from "./script.json";
import shots from "./shots.json";
import timing from "./timing.json";

export { FONT, SHADOW, text } from "../common/theme";

// Gemini の「青→紫→ピンク」のグラデーションを主役にした、夜明けのオーロラ配色
export const C = {
  bg: "#efeef9",
  ice: "#f8f7fd",
  ink: "#191a33",
  sub: "#5f6180",
  line: "#e6e4f2",
  white: "#ffffff",
  deep: "#1b1a38",
  blue: "#4f7ef0",
  purple: "#9168f0",
  pink: "#e46aa6",
  sky: "#8fd3ff",
  red: "#e5484d",
  green: "#2f9e6b",
  gray: "#8d8fa8",
};
export const GRAD = `linear-gradient(90deg, ${C.blue}, ${C.purple} 55%, ${C.pink})`;

export const ASSET = (p: string) => staticFile(`shorts/gemini-mac/${p}`);

export type Scene = {
  type: "hook" | "pain" | "news" | "demo" | "examples" | "safety" | "caveat" | "prepare" | "summary";
  chapter: string;
  examples?: { title: string; body: string }[];
  lines: Line[];
};

export const SCRIPT = script as unknown as {
  id: string;
  title: string;
  header: { kicker: string; title: string; badge: string };
  bgm: { file: string; title: string; credit: string; url: string };
  scenes: Scene[];
};

export const SHOTS = shots as Record<string, ShotMeta>;
export const TIMING = timing as number[];
export const TIMELINE = buildTimeline(SCRIPT.scenes, TIMING);
