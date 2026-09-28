import { useVideoConfig } from "remotion";

// 横長（1920×1080）とショート（1080×1920）で変わる配置
export type Layout = {
  vertical: boolean;
  // ショートでは画面上部に動画タイトルの帯を出し続ける
  titleBand: { top: number; height: number } | null;
  counter: { top: number; left: number | null };
  telop: { top: number; side: number; maxLines: number; sizes: number[] };
  content: { top: number; height: number };
  image: { maxWidth: number; maxHeight: number };
  quizWidth: number;
};

const LANDSCAPE: Layout = {
  vertical: false,
  titleBand: null,
  counter: { top: 30, left: 40 },
  telop: { top: 90, side: 200, maxLines: 2, sizes: [68, 62, 56] },
  content: { top: 330, height: 620 },
  image: { maxWidth: 900, maxHeight: 560 },
  quizWidth: 1180,
};

// YouTube ショートは上下と右端にボタンや説明が重なるので、中央寄りに収める
const SHORT: Layout = {
  vertical: true,
  titleBand: { top: 170, height: 120 },
  counter: { top: 320, left: null },
  telop: { top: 420, side: 70, maxLines: 3, sizes: [76, 70, 64, 58] },
  content: { top: 780, height: 760 },
  image: { maxWidth: 860, maxHeight: 700 },
  quizWidth: 900,
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return height > width ? SHORT : LANDSCAPE;
};
