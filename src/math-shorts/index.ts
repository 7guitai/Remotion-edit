import birthdayParadox from "./birthday-paradox.json";
import { BirthdayParadox } from "./BirthdayParadox";
import earthRope from "./20261030-pm-earth-rope.json";
import { EarthRope } from "./EarthRope";
import { MathShortProps, Narration } from "./timeline";

// 縦型（9:16）の数学ショート。src/math-shorts/<id>.json がナレーション原稿
export const MATH_SHORTS: {
  id: string;
  title: string;
  component: React.FC<MathShortProps>;
  narration: Narration[];
  bgm: string | null;
}[] = [
  {
    id: birthdayParadox.id,
    title: birthdayParadox.title,
    component: BirthdayParadox,
    narration: birthdayParadox.slides,
    bgm: birthdayParadox.bgm.file,
  },
  {
    id: earthRope.id,
    title: earthRope.title,
    component: EarthRope,
    narration: earthRope.slides,
    bgm: earthRope.bgm.file,
  },
];
