import birthdayParadox from "./birthday-paradox.json";
import { BirthdayParadox } from "./BirthdayParadox";
import { MathShortProps, Narration } from "./timeline";

// 縦型（9:16）の数学ショート。src/math-shorts/<id>.json がナレーション原稿
export const MATH_SHORTS: {
  id: string;
  title: string;
  component: React.FC<MathShortProps>;
  narration: Narration[];
}[] = [
  {
    id: birthdayParadox.id,
    title: birthdayParadox.title,
    component: BirthdayParadox,
    narration: birthdayParadox.slides,
  },
];
