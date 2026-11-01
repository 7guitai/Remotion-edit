import React from "react";
import { interpolate } from "remotion";
import { ArenaRail } from "../../components/Arena";
import { Ball, BallShadow } from "../../components/Ball";
import { Defs, shadowFilter } from "../../components/Defs";
import { Graveyard } from "../../components/Graveyard";
import { Obstacles } from "../../components/Obstacle";
import { shade } from "../../config/theme";
import type { SimulationResult, Tile } from "../../physics/types";
import { useStyle } from "../../styles/context";

type Props = { sim: SimulationResult; frame: number; deadFrame: number[]; elimFrames: number[] };

const FALL_FRAMES = 14;
const BALL_FALL_FRAMES = 16;

const polar = (cx: number, cy: number, r: number, a: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
const wedge = (cx: number, cy: number, t: Tile, inset = 3) => {
  const a0 = t.a0 + inset / t.r1;
  const a1 = t.a1 - inset / t.r1;
  const r0 = t.r0 + inset;
  const r1 = t.r1 - inset;
  const [x0, y0] = polar(cx, cy, r0, a0);
  const [x1, y1] = polar(cx, cy, r1, a0);
  const [x2, y2] = polar(cx, cy, r1, a1);
  const [x3, y3] = polar(cx, cy, r0, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} L ${x1} ${y1} A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 ${large} 0 ${x0} ${y0} Z`;
};

/** COLLAPSE: 扇形の床が予告の点滅のあと落ち、上にいたボールが穴に落ちる */
export const CollapseWorld: React.FC<Props> = ({ sim, frame, deadFrame, elimFrames }) => {
  const style = useStyle();
  const state = sim.frames[frame];
  const T = state.t;
  const { cx, cy, radius: R, wallThickness: wt } = sim.layout.arena;
  const tiles = sim.tiles ?? [];
  const won = frame >= sim.winnerFrame;
  const tread = style.floor.kind === "stairs" ? style.floor.tread : [shade(style.spinner.light, 0), shade(style.spinner.mid, 0)];
  const fps = sim.fps;
  // 勝者確定後、落ちた床が順にせり上がって元に戻る
  const restoreStart = sim.winnerFrame + 14;

  return (
    <g>
      <Defs />
      <Graveyard sim={sim} frame={frame} elimFrames={elimFrames} delay={BALL_FALL_FRAMES} />

      <g transform={(() => {
        const ev = sim.events?.[0];
        const quake = ev && T >= ev.t && !won;
        return quake ? `translate(${Math.sin(frame * 2.9) * 5} ${Math.cos(frame * 2.3) * 4})` : "";
      })()}>
      {/* 穴（奈落） */}
      <radialGradient id="void" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3a332b" />
        <stop offset="100%" stopColor="#0d0b09" />
      </radialGradient>
      <circle cx={cx} cy={cy} r={R + wt / 2} fill="url(#void)" />

      {/* 床タイル */}
      {tiles.map((t, i) => {
        const color = tread[i % 2];
        let scale = 1;
        let opacity = 1;
        let dx = 0;
        let dy = 0;
        let warn = 0;
        if (t.fallAt !== null && T >= t.fallAt) {
          const age = (T - t.fallAt) * fps;
          const p = Math.min(1, age / FALL_FRAMES);
          scale = 1 - 0.45 * p;
          opacity = 1 - p;
          if (frame >= restoreStart) {
            const q = interpolate(frame - restoreStart - (i % 8) * 1.5, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            scale = 0.55 + 0.45 * q;
            opacity = q;
          }
        } else if (t.warnAt !== null && T >= t.warnAt) {
          dx = Math.sin(frame * 2.7 + i) * 3;
          dy = Math.cos(frame * 2.1 + i) * 3;
          warn = 0.45 + 0.35 * Math.sin(frame * 1.2);
        }
        if (opacity <= 0.01) return null;
        const am = (t.a0 + t.a1) / 2;
        const [mx, my] = polar(cx, cy, (t.r0 + t.r1) / 2, am);
        const tf = `translate(${dx} ${dy}) translate(${mx} ${my}) scale(${scale}) translate(${-mx} ${-my})`;
        const d = wedge(cx, cy, t);
        return (
          <g key={i} transform={tf} opacity={opacity}>
            {/* 板の厚み */}
            <path d={d} transform="translate(0 9)" fill={shade(color.startsWith("#") ? color : "#e0a050", -0.35)} />
            <path d={d} fill={color} />
            <path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2} />
            {warn > 0 && <path d={d} fill="#ff3b30" opacity={warn} />}
          </g>
        );
      })}

      {/* 床の傾きの向き */}
      {!won && <SlopeArrow cx={cx} cy={cy} hub={sim.course.hubRadius} tilt={state.tilt} color={style.accent} />}

      <g filter={shadowFilter(style)}>
        {sim.balls.map((b, i) =>
          frame < deadFrame[i] ? <BallShadow key={b.id} x={state.b[i * 3]} y={state.b[i * 3 + 1]} radius={b.radius} /> : null,
        )}
      </g>
      <Obstacles course={sim.course} layout={sim.layout} spinnerAngle={state.spinnerAngle} />

      {sim.balls.map((b, i) => {
        const x = state.b[i * 3];
        const y = state.b[i * 3 + 1];
        if (frame < deadFrame[i]) return <Ball key={b.id} x={x} y={y} radius={b.radius} team={b.team} winner={won && i === sim.winner.ballIndex} />;
        // 穴に落ちていく（小さく・暗くなる）
        const age = frame - deadFrame[i];
        if (age > BALL_FALL_FRAMES) return null;
        const p = age / BALL_FALL_FRAMES;
        return (
          <g key={b.id} opacity={1 - p}>
            <Ball x={x} y={y + p * 10} radius={b.radius * (1 - 0.7 * p)} team={b.team} />
            <circle cx={x} cy={y + p * 10} r={b.radius * (1 - 0.7 * p)} fill="#000" opacity={p * 0.6} />
          </g>
        );
      })}

      <ArenaRail layout={sim.layout} gate={null} frame={frame} />
      </g>
      {won && <Spotlight sim={sim} frame={frame} />}
    </g>
  );
};

const SlopeArrow: React.FC<{ cx: number; cy: number; hub: number; tilt: number; color: string }> = ({ cx, cy, hub, tilt, color }) => {
  const deg = (tilt * 180) / Math.PI;
  return (
    <g transform={`rotate(${deg} ${cx} ${cy})`} opacity={0.9}>
      <line x1={cx + hub + 8} y1={cy} x2={cx + hub + 64} y2={cy} stroke={color} strokeWidth={12} strokeLinecap="round" />
      <polygon points={`${cx + hub + 60},${cy - 20} ${cx + hub + 60},${cy + 20} ${cx + hub + 92},${cy}`} fill={color} stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
};

export const Spotlight: React.FC<{ sim: SimulationResult; frame: number }> = ({ sim, frame }) => {
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
