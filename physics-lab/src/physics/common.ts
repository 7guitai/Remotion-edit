import { SeededRandom } from "./seeded-random";
import { TEAMS, type Team } from "./teams";
import type { BallInfo } from "./types";

export const GENERATOR_VERSION = "1.1.0";

/** BGM（120BPM）の1拍 */
export const BEAT_SECONDS = 0.5;

export const round = (v: number, digits: number) => {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
};

/** 4色のチーム（赤・青・緑・金）に均等に割り当てる。割り当て順はseedで変わる */
export const ballTeams = (count: number, rng: SeededRandom): Team[] =>
  rng.shuffle(Array.from({ length: count }, (_, i) => TEAMS[i % TEAMS.length]));

export const makeBallInfo = (teams: Team[], radius: number): BallInfo[] =>
  teams.map((t, i) => ({ id: `ball_${String(i + 1).padStart(3, "0")}`, number: i + 1, team: t.id, color: t.color, radius }));

/** 残数の目標: start秒まで count、そこから finish秒で1。序盤はゆっくり、終盤に一気に減るカーブ */
export const PACE_CURVE = 0.65;
export const paceTarget = (t: number, count: number, start: number, finish: number) => {
  if (t <= start) return count;
  const p = Math.min(1, (t - start) / (finish - start));
  return 1 + (count - 1) * Math.pow(1 - p, PACE_CURVE);
};

/** 後半のイベント（展開を変える仕掛け）の時刻: 目標決着時刻に対する割合 */
export const EVENT_AT = [0.5, 0.78] as const;
export const eventTimes = (finish: number) => EVENT_AT.map((k) => round(k * finish, 2));
