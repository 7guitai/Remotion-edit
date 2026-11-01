import React from "react";
import { interpolate } from "remotion";
import { ArenaFloor, ArenaRail } from "../components/Arena";
import { Ball, BallShadow } from "../components/Ball";
import { Defs, shadowFilter } from "../components/Defs";
import { Obstacles } from "../components/Obstacle";
import { useStyle } from "../styles/context";
import type { SimulationResult } from "../physics/types";

type Props = {
  sim: SimulationResult;
  frame: number;
  /** 衝撃波パルスの動画フレーム */
  pulseFrames: number[];
  /** ボールごとの脱落フレーム（勝者は Infinity） */
  deadFrame: number[];
  elimFrames: number[];
};

/** 床・アリーナ・障害物・ボール・脱落エフェクト（ワールド座標 = 動画ピクセル） */
export const MainAction: React.FC<Props> = ({ sim, frame, pulseFrames, deadFrame, elimFrames }) => {
  const style = useStyle();
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
      <PulseWaves sim={sim} frame={frame} pulseFrames={pulseFrames} />

      <g filter={shadowFilter(style)}>
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
            winner={isWinner && won}
            fade={isWinner ? 1 : frame >= deadFrame[i] ? Math.min(othersFade, 0.92) : othersFade}
          />
        );
      })}

      <ArenaRail layout={layout} gate={state.gate} gate2={state.gate2} frame={frame} />
      {!won && Math.abs(state.tilt ?? 0) > 0.01 && <GravityArrow sim={sim} tilt={state.tilt} />}

      {/* 脱落した瞬間の波紋 */}
      {sim.eliminations.map((e, k) => {
        const age = frame - elimFrames[k];
        if (age < 0 || age > 16) return null;
        return (
          <circle key={k} cx={e.x} cy={e.y} r={22 + age * 4.5} fill="none" stroke={style.teams[balls[e.ballIndex].team].color === "#ffffff" ? style.text : style.teams[balls[e.ballIndex].team].color} strokeWidth={6 * (1 - age / 16)} opacity={0.8 * (1 - age / 16)} />
        );
      })}

      {won && <WinnerSpotlight sim={sim} frame={frame} />}
    </g>
  );
};

/** 終盤の重力の向き（中央の柱から伸びる矢印） */
const GravityArrow: React.FC<{ sim: SimulationResult; tilt: number }> = ({ sim, tilt }) => {
  const style = useStyle();
  const { cx, cy } = sim.layout.arena;
  const hub = sim.course.hubRadius;
  const deg = (-tilt * 180) / Math.PI;
  const len = 120;
  return (
    <g transform={`rotate(${deg} ${cx} ${cy})`}>
      <line x1={cx} y1={cy + hub + 6} x2={cx} y2={cy + hub + len - 26} stroke={style.accent} strokeWidth={14} strokeLinecap="round" />
      <polygon points={`${cx - 26},${cy + hub + len - 34} ${cx + 26},${cy + hub + len - 34} ${cx},${cy + hub + len}`} fill={style.accent} stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
};

/** 衝撃波: 中心から外周へ広がるリング */
const PulseWaves: React.FC<{ sim: SimulationResult; frame: number; pulseFrames: number[] }> = ({ sim, frame, pulseFrames }) => {
  const style = useStyle();
  const { cx, cy, radius: R } = sim.layout.arena;
  const hub = sim.course.hubRadius;
  return (
    <g>
      {pulseFrames.map((pf, k) => {
        const age = frame - pf;
        if (age < 0 || age > 14) return null;
        const p = age / 14;
        const rr = hub + (R - hub) * (1 - Math.pow(1 - p, 2));
        return (
          <g key={k}>
            <circle cx={cx} cy={cy} r={rr} fill="none" stroke={style.accent} strokeWidth={22 * (1 - p) + 4} opacity={0.55 * (1 - p)} />
            <circle cx={cx} cy={cy} r={rr} fill="none" stroke="#ffffff" strokeWidth={4} opacity={0.7 * (1 - p)} />
          </g>
        );
      })}
    </g>
  );
};

/** 脱落ボールが散らばる床 */
const DropZone: React.FC<{ layout: SimulationResult["layout"] }> = ({ layout }) => {
  const style = useStyle();
  const dz = layout.dropZone;
  return (
    <g>
      <rect x={dz.left} y={dz.top} width={dz.right - dz.left} height={dz.floor - dz.top} rx={36} fill={style.dropZone.fill} stroke={style.ball === "flat" ? "#111" : undefined} strokeWidth={5} />
      <text x={540} y={dz.floor - 130} textAnchor="middle" fontFamily={style.font} fontWeight={800} fontSize={150} letterSpacing={20} fill={style.dropZone.text}>
        OUT
      </text>
      <rect x={dz.left} y={dz.floor} width={dz.right - dz.left} height={10} rx={5} fill={style.dropZone.floor} />
    </g>
  );
};

const WinnerSpotlight: React.FC<{ sim: SimulationResult; frame: number }> = ({ sim, frame }) => {
  const style = useStyle();
  const i = sim.winner.ballIndex;
  const b = sim.frames[frame].b;
  const x = b[i * 3];
  const y = b[i * 3 + 1];
  const age = frame - sim.winnerFrame;
  const r = sim.balls[i].radius;
  const grow = interpolate(age, [0, 12], [6, 2.3], { extrapolateRight: "clamp" });
  return (
    <g>
      <circle cx={x} cy={y} r={r * grow} fill="none" stroke={style.text} strokeWidth={5} strokeDasharray="16 12" transform={`rotate(${age * 4} ${x} ${y})`} />
      <circle cx={x} cy={y} r={r * (grow + 0.8)} fill="none" stroke={style.accent} strokeOpacity={0.6} strokeWidth={4} />
    </g>
  );
};
