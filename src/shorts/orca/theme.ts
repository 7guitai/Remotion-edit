import { staticFile } from "remotion";
import { buildTimeline, Line } from "../common/timeline";
import script from "./script.json";
import timing from "./timing.json";

export { FONT, SHADOW, text } from "../common/theme";

// Orca（シャチ）にちなんだ「氷の海」パレット：白黒のコントラスト＋深い海の青＋Orca のアクセント色（#0088CC）
export const C = {
  bg: "#e7eff5",
  ice: "#f5f9fc",
  ink: "#0c1a2a",
  sub: "#5a6b7d",
  line: "#dbe6ef",
  white: "#ffffff",
  deep: "#0b2236",
  sea: "#0088cc",
  aqua: "#38c6e8",
  coral: "#ff6b5a",
  green: "#21a675",
  gray: "#8996a6",
};

export const ASSET = (p: string) => staticFile(`shorts/orca/${p}`);
export const BGM_VOLUME = 0.11;

export type OrcaScene = {
  type: "hook" | "pain" | "intro" | "feature" | "orchestrate" | "agents" | "who" | "summary";
  chapter: string;
  no?: number;
  title?: string;
  video?: string;
  zoom?: { x: number; y: number; w: number };
  layout?: "side";
  points?: string[];
  lines: Line[];
};

export const SCRIPT = script as unknown as {
  id: string;
  title: string;
  bgm: { file: string; title: string; credit: string; url: string };
  scenes: OrcaScene[];
};

export const TIMELINE = buildTimeline(SCRIPT.scenes, timing as number[]);
