import React from "react";
import { interpolate } from "remotion";
import { ArenaFloor, ArenaRail } from "../components/Arena";
import { Ball, BallShadow } from "../components/Ball";
import { Defs } from "../components/Defs";
import { Obstacles } from "../components/Obstacle";
import { THEME } from "../config/theme";
import type { SimulationResult } from "../physics/types";

type Props = {
  sim: SimulationResult;
  frame: number;
  /** ボールごとの脱落フレーム（勝者は Infinity） */
  deadFrame: number[];
  elimFrames: number[];
};

/** 床・アリーナ・障害物・ボール・脱落エフェクト（ワールド座標 = 動画ピクセル） */
export const MainAction: React.FC<Props> = ({ sim, frame, deadFrame, elimFrames }) => {
  const state = sim.frames[frame];
  const { layout, balls, winner, winnerFrame } = sim;
  const won = frame >= winnerFrame;
  const othersFade = won ? interpolate(frame - winnerFrame, [0, 20], [1, 0.55], { extrapolateRight: "clamp" }) : 1;
  const pos = (i: number) => ({ x: state.b[i * 3], y: state.b[i * 3 + 1] });

  // 勝者を最前面に描く
  const order = balls.map((_, i) => i).sort((a, b) => (a === winner.ballIndex ? 1 : 0) - (b === winner.ballIndex ? 1 : 0));

  return (
    <g>
      <Defs />
      <DropZone layout={layout} />
      <ArenaFloor layout={layout} />

      <g filter="url(#soft-shadow)">
        {balls.map((ball, i) => {
          const p = pos(i);
          return <BallShadow key={ball.id} x={p.x} y={p.y} radius={ball.radius} opacity={i === winner.ballIndex ? 1 : othersFade} />;
        })}
      </g>

      <Obstacles course={sim.course} layout={layout} spinnerAngle={state.spinnerAngle} />

      {order.map((i) => {
        const ball = balls[i];
        const p = pos(i);
        const isWinner = i === winner.ballIndex;
        return (
          <Ball
            key={ball.id}
            x={p.x}
            y={p.y}
            radius={ball.radius}
            team={ball.team}
            color={ball.color}
            winner={isWinner && won}
            fade={isWinner ? 1 : frame >= deadFrame[i] ? Math.min(othersFade, 0.92) : othersFade}
          />
        );
      })}

      <ArenaRail layout={layout} gate={state.gate} frame={frame} />

      {/* 脱落した瞬間の波紋 */}
      {sim.eliminations.map((e, k) => {
        const age = frame - elimFrames[k];
        if (age < 0 || age > 16) return null;
        return (
          <circle key={k} cx={e.x} cy={e.y} r={22 + age * 4.5} fill="none" stroke={balls[e.ballIndex].color} strokeWidth={6 * (1 - age / 16)} opacity={0.8 * (1 - age / 16)} />
        );
      })}

      {won && <WinnerSpotlight sim={sim} frame={frame} />}
    </g>
  );
};

/** 脱落ボールが散らばる床 */
const DropZone: React.FC<{ layout: SimulationResult["layout"] }> = ({ layout }) => {
  const dz = layout.dropZone;
  return (
    <g>
      <rect x={dz.left} y={dz.top} width={dz.right - dz.left} height={dz.floor - dz.top} rx={36} fill="#e9e5de" />
      <text x={540} y={dz.floor - 130} textAnchor="middle" fontFamily={THEME.font} fontWeight={800} fontSize={150} letterSpacing={20} fill="#d6d0c6">
        OUT
      </text>
      <rect x={dz.left} y={dz.floor} width={dz.right - dz.left} height={10} rx={5} fill="#cfc8bc" />
    </g>
  );
};

const WinnerSpotlight: React.FC<{ sim: SimulationResult; frame: number }> = ({ sim, frame }) => {
  const i = sim.winner.ballIndex;
  const b = sim.frames[frame].b;
  const x = b[i * 3];
  const y = b[i * 3 + 1];
  const age = frame - sim.winnerFrame;
  const r = sim.balls[i].radius;
  const grow = interpolate(age, [0, 12], [6, 2.3], { extrapolateRight: "clamp" });
  return (
    <g>
      <circle cx={x} cy={y} r={r * grow} fill="none" stroke={THEME.text} strokeWidth={5} strokeDasharray="16 12" transform={`rotate(${age * 4} ${x} ${y})`} />
      <circle cx={x} cy={y} r={r * (grow + 0.8)} fill="none" stroke={sim.balls[i].color} strokeOpacity={0.6} strokeWidth={4} />
    </g>
  );
};
