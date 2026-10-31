import React from "react";
import { interpolate } from "remotion";
import { Arena } from "../components/Arena";
import { Ball } from "../components/Ball";
import { Obstacles } from "../components/Obstacle";
import { THEME } from "../config/theme";
import type { SimulationResult } from "../physics/types";

type Props = {
  sim: SimulationResult;
  frame: number;
  /** ボールごとの脱落フレーム（勝者は Infinity） */
  deadFrame: number[];
  elimFrames: number[];
  danger: number;
};

const TRAIL = [2, 4, 6];

/** アリーナ・障害物・ボール・脱落エフェクト（ワールド座標 = 動画ピクセル） */
export const MainAction: React.FC<Props> = ({ sim, frame, deadFrame, elimFrames, danger }) => {
  const state = sim.frames[frame];
  const { layout, balls, winner, winnerFrame } = sim;
  const won = frame >= winnerFrame;
  const othersFade = won ? interpolate(frame - winnerFrame, [0, 20], [1, 0.35], { extrapolateRight: "clamp" }) : 1;
  const pos = (f: number, i: number) => {
    const b = sim.frames[f].b;
    return { x: b[i * 3], y: b[i * 3 + 1], a: b[i * 3 + 2] };
  };

  // 勝者を最前面に描く
  const order = balls.map((_, i) => i).sort((a, b) => (a === winner.ballIndex ? 1 : 0) - (b === winner.ballIndex ? 1 : 0));

  return (
    <g>
      <DropZone layout={layout} />
      <Arena layout={layout} gate={state.gate} danger={danger} frame={frame} />
      <Obstacles course={sim.course} layout={layout} spinnerAngle={state.spinnerAngle} />

      {/* 残像 */}
      {frame > sim.introFrames &&
        balls.map((ball, i) =>
          frame < deadFrame[i]
            ? TRAIL.map((k) => {
                const f = frame - k;
                if (f < sim.introFrames) return null;
                const p = pos(f, i);
                return <circle key={`${i}-${k}`} cx={p.x} cy={p.y} r={ball.radius * (1 - k / 14)} fill={ball.color} opacity={0.16 * (1 - k / 8) * othersFade} />;
              })
            : null,
        )}

      {order.map((i) => {
        const ball = balls[i];
        const p = pos(frame, i);
        const isWinner = i === winner.ballIndex;
        const dead = frame >= deadFrame[i];
        return (
          <Ball
            key={ball.id}
            x={p.x}
            y={p.y}
            angle={p.a}
            radius={ball.radius}
            color={ball.color}
            number={ball.number}
            state={dead ? "dead" : isWinner && won ? "winner" : "alive"}
            fade={isWinner ? 1 : othersFade}
          />
        );
      })}

      {/* 脱落した瞬間の衝撃波 */}
      {sim.eliminations.map((e, k) => {
        const age = frame - elimFrames[k];
        if (age < 0 || age > 18) return null;
        const color = balls[e.ballIndex].color;
        return (
          <g key={k}>
            <circle cx={e.x} cy={e.y} r={20 + age * 5} fill="none" stroke={color} strokeWidth={8 * (1 - age / 18)} opacity={1 - age / 18} />
            <circle cx={e.x} cy={e.y} r={12 + age * 2.5} fill={color} opacity={0.5 * (1 - age / 10)} />
          </g>
        );
      })}

      {won && <WinnerSpotlight sim={sim} frame={frame} />}
    </g>
  );
};

const DropZone: React.FC<{ layout: SimulationResult["layout"] }> = ({ layout }) => {
  const dz = layout.dropZone;
  const stripes = Math.ceil((dz.right - dz.left) / 40);
  return (
    <g>
      <rect x={dz.left} y={dz.top} width={dz.right - dz.left} height={dz.floor - dz.top} rx={24} fill="rgba(255,51,85,0.05)" stroke={THEME.red} strokeOpacity={0.25} strokeWidth={3} strokeDasharray="14 10" />
      <text x={540} y={dz.floor - 150} textAnchor="middle" fontFamily={THEME.font} fontWeight={900} fontSize={120} fill={THEME.red} opacity={0.1}>
        OUT
      </text>
      <clipPath id="floor-clip">
        <rect x={dz.left} y={dz.floor} width={dz.right - dz.left} height={14} />
      </clipPath>
      <g clipPath="url(#floor-clip)">
        {Array.from({ length: stripes }, (_, i) => (
          <polygon
            key={i}
            points={`${dz.left + i * 40},${dz.floor + 14} ${dz.left + i * 40 + 20},${dz.floor} ${dz.left + i * 40 + 40},${dz.floor} ${dz.left + i * 40 + 20},${dz.floor + 14}`}
            fill={THEME.yellow}
            opacity={0.8}
          />
        ))}
      </g>
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
  const grow = interpolate(age, [0, 12], [6, 2.4], { extrapolateRight: "clamp" });
  return (
    <g>
      <circle cx={x} cy={y} r={r * grow} fill="none" stroke={THEME.yellow} strokeWidth={6} strokeDasharray="18 12" transform={`rotate(${age * 4} ${x} ${y})`} />
      <circle cx={x} cy={y} r={r * (grow + 0.9)} fill="none" stroke={THEME.yellow} strokeOpacity={0.4} strokeWidth={3} />
    </g>
  );
};
