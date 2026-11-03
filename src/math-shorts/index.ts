import birthdayParadox from "./birthday-paradox.json";
import { BirthdayParadox } from "./BirthdayParadox";
import earthRope from "./20261030-pm-earth-rope.json";
import { EarthRope } from "./EarthRope";
import paperMoon from "./20261031-am-paper-moon.json";
import { PaperMoon } from "./PaperMoon";
import squareCube from "./20261031-pm-square-cube.json";
import { SquareCube } from "./SquareCube";
import falsePositive from "./20261101-am-false-positive.json";
import { FalsePositive } from "./FalsePositive";
import bookStack from "./20261101-pm-book-stack.json";
import { BookStack } from "./BookStack";
import kochSnowflake from "./20261102-am-koch-snowflake.json";
import { KochSnowflake } from "./KochSnowflake";
import ruleOf72 from "./20261102-pm-rule-of-72.json";
import { RuleOf72 } from "./RuleOf72";
import randomWalk from "./20261103-am-random-walk.json";
import { RandomWalk } from "./RandomWalk";
import raindrop from "./20261103-pm-raindrop.json";
import { Raindrop } from "./Raindrop";
import pigeonhole from "./20261104-am-pigeonhole.json";
import { Pigeonhole } from "./Pigeonhole";
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
  {
    id: paperMoon.id,
    title: paperMoon.title,
    component: PaperMoon,
    narration: paperMoon.slides,
    bgm: paperMoon.bgm.file,
  },
  {
    id: squareCube.id,
    title: squareCube.title,
    component: SquareCube,
    narration: squareCube.slides,
    bgm: squareCube.bgm.file,
  },
  {
    id: falsePositive.id,
    title: falsePositive.title,
    component: FalsePositive,
    narration: falsePositive.slides,
    bgm: falsePositive.bgm.file,
  },
  {
    id: bookStack.id,
    title: bookStack.title,
    component: BookStack,
    narration: bookStack.slides,
    bgm: bookStack.bgm.file,
  },
  {
    id: kochSnowflake.id,
    title: kochSnowflake.title,
    component: KochSnowflake,
    narration: kochSnowflake.slides,
    bgm: kochSnowflake.bgm.file,
  },
  {
    id: ruleOf72.id,
    title: ruleOf72.title,
    component: RuleOf72,
    narration: ruleOf72.slides,
    bgm: ruleOf72.bgm.file,
  },
  {
    id: randomWalk.id,
    title: randomWalk.title,
    component: RandomWalk,
    narration: randomWalk.slides,
    bgm: randomWalk.bgm.file,
  },
  {
    id: raindrop.id,
    title: raindrop.title,
    component: Raindrop,
    narration: raindrop.slides,
    bgm: raindrop.bgm.file,
  },
  {
    id: pigeonhole.id,
    title: pigeonhole.title,
    component: Pigeonhole,
    narration: pigeonhole.slides,
    bgm: pigeonhole.bgm.file,
  },
];
