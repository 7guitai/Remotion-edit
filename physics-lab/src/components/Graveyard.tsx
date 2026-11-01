import React from "react";
import { interpolate } from "remotion";
import type { SimulationResult } from "../physics/types";
import { useStyle } from "../styles/context";
import { Ball } from "./Ball";

/** 画面下部: 脱落したボールを脱落順に積み上げて並べる（gate 以外のモード用） */
export const Graveyard: React.FC<{ sim: SimulationResult; frame: number; elimFrames: number[]; delay: number }> = ({ sim, frame, elimFrames, delay }) => {
  const style = useStyle();
  const dz = sim.layout.dropZone;
  const n = sim.balls.length;
  const cols = n > 30 ? 12 : 8;
  const width = dz.right - dz.left - 40;
  const spacing = width / cols;
  const r = Math.min(26, spacing * 0.4);
  return (
    <g>
      <rect x={dz.left} y={dz.top} width={dz.right - dz.left} height={dz.floor - dz.top} rx={36} fill={style.dropZone.fill} />
      <text x={540} y={dz.floor - 130} textAnchor="middle" fontFamily={style.font} fontWeight={800} fontSize={150} letterSpacing={20} fill={style.dropZone.text}>
        OUT
      </text>
      <rect x={dz.left} y={dz.floor} width={dz.right - dz.left} height={10} rx={5} fill={style.dropZone.floor} />
      {sim.eliminations.map((e, k) => {
        const age = frame - (elimFrames[k] + delay);
        if (age < 0) return null;
        const row = Math.floor(k / cols);
        const col = row % 2 === 0 ? k % cols : cols - 1 - (k % cols);
        const x = dz.left + 20 + spacing * (col + 0.5);
        const y = dz.floor - r - 6 - row * (r * 2 + 8);
        const drop = interpolate(age, [0, 8], [-120, 0], { extrapolateRight: "clamp" });
        const b = sim.balls[e.ballIndex];
        return <Ball key={k} x={x} y={y + drop} radius={r} team={b.team} />;
      })}
    </g>
  );
};
