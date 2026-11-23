import { buildTimeline, Line, TimedScene as BaseTimedScene } from "../common/timeline";
import script from "./script.json";
import timing from "./timing.json";

export { FPS, HEIGHT, WIDTH } from "../common/timeline";
export type { CharacterId, TimedLine } from "../common/timeline";

export type SceneType = "hook" | "pain" | "intro" | "pick" | "budget" | "who" | "summary";

export type Pick = {
  rank: number;
  name: string;
  maker: string;
  icon: string;
  color: string;
  price: string;
  priceSub: string;
  badge: string;
  tags: string[];
};

type SceneSpec = { type: SceneType; pick?: string; lines: Line[] };
export type TimedScene = BaseTimedScene<SceneSpec>;

export const SCRIPT = script as unknown as {
  id: string;
  title: string;
  note: string;
  bgm: { file: string; title: string; credit: string; url: string };
  scenes: SceneSpec[];
  picks: Record<string, Pick>;
};

export const TIMELINE = buildTimeline(SCRIPT.scenes, timing as number[]);
