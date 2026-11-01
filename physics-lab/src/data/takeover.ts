import type { SimulationResult } from "../physics/types";
import type { TeamId } from "../physics/teams";

/** takeover: シミュレーション時刻 T における各ボールの色 */
export const teamsAt = (sim: SimulationResult, T: number): TeamId[] => {
  const team = sim.balls.map((b) => b.team);
  for (const c of sim.takeover?.conversions ?? []) {
    if (c.t > T) break;
    team[c.ball] = c.team;
  }
  return team;
};

/** takeover: 最後に勝った色 */
export const finalTeam = (sim: SimulationResult): TeamId => teamsAt(sim, Infinity)[sim.winner.ballIndex];
