import { staticFile } from "remotion";
import { ShotMeta } from "../common/ShotFrame";
import { buildTimeline, Line } from "../common/timeline";
import script from "./script.json";
import shots from "./shots.json";
import timing from "./timing.json";

export { FONT, SHADOW, text } from "../common/theme";

// 白ベース＋薄い緑の、さわやかで落ち着いた配色（ユーザーの希望：白・薄い緑）
// ※ キー名は以前の配色のまま（blue/purple/pink/sky）だが、中身はすべて緑系
export const C = {
  bg: "#f5faf6",
  ice: "#ffffff",
  ink: "#1c2a23",
  sub: "#5b6d63",
  line: "#e2eee6",
  white: "#ffffff",
  deep: "#1f3a2f", // テロップ枠・暗色パネル（深い緑）
  blue: "#43b07c", // 緑
  purple: "#2e9c62", // メインの緑
  pink: "#8fd6a8", // 薄い緑（ミント）
  sky: "#b4f0c9", // 暗色の上での強調（明るい緑）
  red: "#e5484d",
  green: "#2f9e6b",
  gray: "#8c9a92",
};
// 帯・バー用（明るめ）と、文字用（白背景で読める濃さ）のグラデーション
export const GRAD = `linear-gradient(90deg, ${C.purple}, ${C.blue} 55%, ${C.pink})`;
export const GRAD_TEXT = "linear-gradient(90deg, #23885a, #3aa66b)";

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
