import script from "./script.json";
import timing from "./timing.json";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
// セリフとセリフの間（フレーム）
const GAP = 4;
// 最初のセリフまでの間・最後のセリフ後の余韻
const HEAD = 6;
const TAIL = 30;
// シーンの切り替わりに入れる追加の間
const SCENE_GAP = 4;

export type CharacterId = "zundamon" | "metan";

export type Line = {
  who: CharacterId;
  face: string;
  text: string;
  speech?: string;
};

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

export type TimedLine = Line & {
  index: number;
  from: number;
  duration: number; // 音声の長さ（フレーム）
  end: number; // 次のセリフの開始
};

export type TimedScene = {
  type: SceneType;
  pick?: string;
  from: number;
  end: number;
  lines: TimedLine[]; // from はシーン先頭からの相対値
};

export const SCRIPT = script as unknown as {
  id: string;
  title: string;
  note: string;
  bgm: { file: string; title: string; credit: string; url: string };
  characters: Record<
    CharacterId,
    { name: string; speaker: number; color: string; images: Record<string, string> }
  >;
  scenes: { type: SceneType; pick?: string; lines: Line[] }[];
  picks: Record<string, Pick>;
};

const build = () => {
  const lines: TimedLine[] = [];
  const scenes: TimedScene[] = [];
  let f = HEAD;
  let n = 0;
  SCRIPT.scenes.forEach((scene, si) => {
    if (si > 0) f += SCENE_GAP;
    const sceneFrom = si === 0 ? 0 : f;
    const sceneLines: TimedLine[] = [];
    scene.lines.forEach((line) => {
      const seconds = (timing as number[])[n] ?? 1 + line.text.length * 0.1;
      const duration = Math.ceil(seconds * FPS);
      const tl: TimedLine = { ...line, index: n, from: f, duration, end: f + duration + GAP };
      lines.push(tl);
      sceneLines.push({ ...tl, from: tl.from - sceneFrom, end: tl.end - sceneFrom });
      f = tl.end;
      n++;
    });
    scenes.push({ type: scene.type, pick: scene.pick, from: sceneFrom, end: f, lines: sceneLines });
  });
  const total = f + TAIL;
  // シーンは次のシーンの開始まで表示し続ける（切り替え時に空白を作らない）
  scenes.forEach((s, i) => {
    s.end = i + 1 < scenes.length ? scenes[i + 1].from : total;
  });
  return { lines, scenes, total };
};

export const TIMELINE = build();
