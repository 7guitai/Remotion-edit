import goldenRatio from "./golden-ratio-long.json";
import { GoldenRatioLong } from "./GoldenRatioLong";
import { LongLine, LongProps } from "./timeline";

// 横型（16:9）の数学ロング動画。src/math-long/<id>.json がナレーション原稿（slides＝1文ずつ）
export const MATH_LONGS: {
  id: string;
  component: React.FC<LongProps>;
  lines: LongLine[];
  bgm: string | null;
}[] = [
  {
    id: goldenRatio.id,
    component: GoldenRatioLong,
    lines: goldenRatio.slides,
    bgm: goldenRatio.bgm.file,
  },
];
