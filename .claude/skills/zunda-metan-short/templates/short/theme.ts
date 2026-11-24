import { staticFile } from "remotion";
import { buildTimeline, Line } from "../common/timeline";
import script from "./script.json";
import timing from "./timing.json";

export { FONT, SHADOW, text } from "../common/theme";

// ★ 白ベース＋淡い色が基本（ユーザーの好み：白・薄い緑）。動画ごとにアクセント色を変えてオリジナリティを出す
export const C = {
  bg: "#f5faf6", // 背景（ほぼ白）
  ice: "#ffffff", // 背景グラデーションの上側
  ink: "#1c2a23", // 文字
  sub: "#5b6d63", // 補足文字
  line: "#e2eee6", // 区切り線
  white: "#ffffff",
  deep: "#1f3a2f", // 暗色パネル・テロップ枠（真っ黒にしない）
  accent: "#2e9c62", // 強調色（タイトルの強調・番号など）
  accent2: "#b4f0c9", // 2つ目の強調色（暗色パネル上の強調）
  good: "#2f9e6b",
  gray: "#8c9a92",
};

export const ASSET = (p: string) => staticFile(`shorts/__ID__/${p}`);

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
