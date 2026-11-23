import { staticFile } from "remotion";
import { buildTimeline, Line } from "../common/timeline";
import script from "./script.json";
import timing from "./timing.json";

export { FONT, SHADOW, text } from "../common/theme";

// ★ 動画ごとにここの色を変えて、オリジナリティを出す（明るい背景＋白カード＋暗色テロップ枠は共通）
export const C = {
  bg: "#e9ecf2", // 背景
  ice: "#f6f8fb", // 背景グラデーションの上側
  ink: "#1b2030", // 文字
  sub: "#5e6678", // 補足文字
  line: "#e2e6ee", // 区切り線
  white: "#ffffff",
  deep: "#1c2233", // 暗色パネル・テロップ枠
  accent: "#e8484f", // 強調色（タイトルの強調・番号など）
  accent2: "#ffcf4a", // 2つ目の強調色（暗色パネル上の強調）
  good: "#2f9e5b",
  gray: "#8c93a4",
};

export const ASSET = (p: string) => staticFile(`shorts/__ID__/${p}`);
export const BGM_VOLUME = 0.12;

export type Scene = {
  type: "hook" | "points" | "compare" | "summary";
  chapter: string;
  question?: string;
  answer?: string;
  no?: number;
  title?: string;
  points?: string[];
  left?: { title: string; items: string[] };
  right?: { title: string; items: string[] };
  message?: string;
  lines: Line[];
};

export const SCRIPT = script as unknown as {
  id: string;
  title: string;
  header: { kicker: string; title: string; badge: string };
  bgm: { file: string; title: string; credit: string; url: string };
  scenes: Scene[];
};

export const TIMING = timing as number[];
export const TIMELINE = buildTimeline(SCRIPT.scenes, TIMING);
