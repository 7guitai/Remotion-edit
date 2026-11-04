// 「指数関数エスカレーション」動画の時間の進め方。
// 実時間 r（動画の秒）→ シミュレーション内時間 t（秒）。カウントダウンのあと、区間ごとに進む速さ（rate）を変える。
// rate > 1 の区間は「▶▶ 早送り」と表示する。

export type Segment = { from: number; to: number; rate: number };

export type TimelineSpec = {
  // 最初のカウントダウン（実時間・秒）。この間 t = 0
  countdown: number;
  // シミュレーション内時間の区間（from → to を rate 倍速で進める）。区間はすき間なく並べる
  segments: Segment[];
};

export type Timeline = TimelineSpec & {
  // 各区間が始まる実時間
  starts: number[];
  // 動画全体の長さ（実時間・秒）
  total: number;
  // t の最後
  end: number;
};

export const makeTimeline = (spec: TimelineSpec): Timeline => {
  const starts: number[] = [];
  let r = spec.countdown;
  for (const s of spec.segments) {
    starts.push(r);
    r += (s.to - s.from) / s.rate;
  }
  return { ...spec, starts, total: r, end: spec.segments[spec.segments.length - 1].to };
};

// 実時間 → シミュレーション内時間
export const simTime = (tl: Timeline, r: number): number => {
  if (r <= tl.countdown) return 0;
  for (let i = tl.segments.length - 1; i >= 0; i--) {
    if (r >= tl.starts[i]) {
      const s = tl.segments[i];
      return Math.min(s.to, s.from + (r - tl.starts[i]) * s.rate);
    }
  }
  return 0;
};

// シミュレーション内時間 → 実時間（字幕やナレーションを t で指定するため）
export const realTime = (tl: Timeline, t: number): number => {
  if (t <= 0) return tl.countdown;
  for (let i = 0; i < tl.segments.length; i++) {
    const s = tl.segments[i];
    if (t <= s.to) return tl.starts[i] + (t - s.from) / s.rate;
  }
  return tl.total;
};

// その実時間での進む速さ（1 = ふつう）
export const rateAt = (tl: Timeline, r: number): number => {
  if (r <= tl.countdown) return 0;
  for (let i = tl.segments.length - 1; i >= 0; i--) if (r >= tl.starts[i]) return tl.segments[i].rate;
  return 1;
};
