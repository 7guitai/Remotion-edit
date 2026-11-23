// 縦型ショート共通：セリフの長さ（timing.json）から、セリフとシーンの開始フレームを決める

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

export type TimedLine = Line & {
  index: number;
  from: number;
  duration: number; // 音声の長さ（フレーム）
  end: number; // 次のセリフの開始
};

// シーンは type と lines 以外に、短編ごとに自由なキーを持てる
export type SceneSpec = { type: string; lines: Line[] } & Record<string, unknown>;

export type TimedScene<S extends SceneSpec = SceneSpec> = Omit<S, "lines"> & {
  from: number;
  end: number;
  lines: TimedLine[]; // from はシーン先頭からの相対値
};

export type Timeline<S extends SceneSpec = SceneSpec> = {
  lines: TimedLine[];
  scenes: TimedScene<S>[];
  total: number;
};

export const buildTimeline = <S extends SceneSpec>(scenesIn: S[], timing: number[]): Timeline<S> => {
  const lines: TimedLine[] = [];
  const scenes: TimedScene<S>[] = [];
  let f = HEAD;
  let n = 0;
  scenesIn.forEach((scene, si) => {
    if (si > 0) f += SCENE_GAP;
    const sceneFrom = si === 0 ? 0 : f;
    const sceneLines: TimedLine[] = [];
    scene.lines.forEach((line) => {
      const seconds = timing[n] ?? 1 + line.text.length * 0.1;
      const duration = Math.ceil(seconds * FPS);
      const tl: TimedLine = { ...line, index: n, from: f, duration, end: f + duration + GAP };
      lines.push(tl);
      sceneLines.push({ ...tl, from: tl.from - sceneFrom, end: tl.end - sceneFrom });
      f = tl.end;
      n++;
    });
    scenes.push({ ...scene, from: sceneFrom, end: f, lines: sceneLines } as TimedScene<S>);
  });
  const total = f + TAIL;
  // シーンは次のシーンの開始まで表示し続ける（切り替え時に空白を作らない）
  scenes.forEach((s, i) => {
    s.end = i + 1 < scenes.length ? scenes[i + 1].from : total;
  });
  return { lines, scenes, total };
};

export const lineAt = (lines: TimedLine[], frame: number): TimedLine => {
  let cur = lines[0];
  for (const l of lines) {
    if (l.from <= frame) cur = l;
  }
  return cur;
};
