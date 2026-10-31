import React, { useMemo } from "react";
import { interpolate } from "remotion";
import { WinnerDisplay } from "../components/WinnerDisplay";
import { SeededRandom } from "../physics/seeded-random";
import { TEAMS, teamById } from "../physics/teams";
import { THEME } from "../config/theme";
import type { SimulationResult } from "../physics/types";

/** 勝者確定後: フラッシュ、紙吹雪、勝者カード */
export const Result: React.FC<{ sim: SimulationResult; frame: number }> = ({ sim, frame }) => {
  const age = frame - sim.winnerFrame;
  const w = sim.balls[sim.winner.ballIndex];
  const confetti = useMemo(() => {
    const rng = new SeededRandom(sim.config.seed ^ 0x5eed);
    const palette = [w.color, w.color, ...TEAMS.map((t) => t.color), THEME.wood, THEME.steel];
    return Array.from({ length: 90 }, () => ({
      x: rng.range(80, 1000),
      vx: rng.range(-4, 4),
      vy: rng.range(-55, -36),
      rot: rng.range(0, 360),
      vr: rng.range(-12, 12),
      size: rng.range(10, 22),
      color: rng.pick(palette),
      delay: rng.int(0, 10),
    }));
  }, [sim.config.seed, w.color]);

  if (age < 0) return null;
  const flash = interpolate(age, [0, 10], [0.7, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {confetti.map((c, i) => {
          const t = age - c.delay;
          if (t < 0) return null;
          const x = c.x + c.vx * t;
          const y = 1920 + c.vy * t + 0.5 * 0.9 * t * t;
          if (y > 1940) return null;
          return (
            <rect key={i} x={x} y={y} width={c.size} height={c.size * 0.5} fill={c.color} transform={`rotate(${c.rot + c.vr * t} ${x} ${y})`} opacity={0.9} />
          );
        })}
      </svg>
      <WinnerDisplay framesSinceWin={age} color={w.color} teamName={teamById(w.team).name} number={w.number} total={sim.balls.length} timeout={sim.winner.decidedBy === "timeout"} />
    </div>
  );
};
