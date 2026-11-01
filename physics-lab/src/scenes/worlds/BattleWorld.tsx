import React, { useMemo } from "react";
import { interpolate } from "remotion";
import { ArenaFloor, ArenaRail } from "../../components/Arena";
import { Ball, BallShadow } from "../../components/Ball";
import { Defs, shadowFilter } from "../../components/Defs";
import { Graveyard } from "../../components/Graveyard";
import { frameAtSimTime } from "../../data/load-simulation";
import type { SimulationResult } from "../../physics/types";
import { useStyle } from "../../styles/context";
import { Spotlight } from "./CollapseWorld";

type Props = { sim: SimulationResult; frame: number; deadFrame: number[]; elimFrames: number[] };

const FENCE = "#ff3b3b";
const POP_FRAMES = 10;

/** BATTLE: HPを持つボールがぶつかり合い、縮む電気柵の中で最後の1個を決める */
export const BattleWorld: React.FC<Props> = ({ sim, frame, deadFrame, elimFrames }) => {
  const style = useStyle();
  const state = sim.frames[frame];
  const T = state.t;
  const { cx, cy, radius: R, wallThickness: wt } = sim.layout.arena;
  const hpInfo = sim.hp ?? { max: 1, events: [], zoneStart: Infinity };
  const zone = state.zone ?? R;
  const fenceOn = T >= hpInfo.zoneStart;
  const won = frame >= sim.winnerFrame;

  // ボールごとのHP変化（時刻順）と、ダメージ表示用のフレーム
  const { perBall, popups } = useMemo(() => {
    const perBall = sim.balls.map(() => [] as { t: number; hp: number }[]);
    const popups: { frame: number; ball: number; dmg: number }[] = [];
    const last = sim.balls.map(() => hpInfo.max);
    for (const e of hpInfo.events) {
      perBall[e.ball].push({ t: e.t, hp: e.hp });
      if (e.hp < last[e.ball]) popups.push({ frame: frameAtSimTime(sim, e.t), ball: e.ball, dmg: last[e.ball] - e.hp });
      last[e.ball] = e.hp;
    }
    return { perBall, popups };
  }, [sim, hpInfo]);

  const hpAt = (i: number) => {
    let hp = hpInfo.max;
    let lastT = -Infinity;
    for (const e of perBall[i]) {
      if (e.t > T) break;
      hp = e.hp;
      lastT = e.t;
    }
    return { hp, lastT };
  };

  return (
    <g>
      <Defs />
      <Graveyard sim={sim} frame={frame} elimFrames={elimFrames} delay={POP_FRAMES} />
      <ArenaFloor layout={sim.layout} />

      {/* 安全地帯の外（危険区域） */}
      {zone < R - 1 && (
        <path
          d={`M ${cx - R - wt / 2} ${cy} a ${R + wt / 2} ${R + wt / 2} 0 1 0 ${(R + wt / 2) * 2} 0 a ${R + wt / 2} ${R + wt / 2} 0 1 0 ${-(R + wt / 2) * 2} 0 Z M ${cx - zone} ${cy} a ${zone} ${zone} 0 1 1 ${zone * 2} 0 a ${zone} ${zone} 0 1 1 ${-zone * 2} 0 Z`}
          fill="rgba(60,10,20,0.55)"
          fillRule="evenodd"
        />
      )}

      <SpikeStar sim={sim} angle={state.spinnerAngle} />

      <g filter={shadowFilter(style)}>
        {sim.balls.map((b, i) => (frame < deadFrame[i] ? <BallShadow key={b.id} x={state.b[i * 3]} y={state.b[i * 3 + 1]} radius={b.radius} /> : null))}
      </g>

      {sim.balls.map((b, i) => {
        const x = state.b[i * 3];
        const y = state.b[i * 3 + 1];
        const r = b.radius;
        const color = style.teams[b.team].color;
        if (frame >= deadFrame[i]) {
          // はじけて消える
          const age = frame - deadFrame[i];
          if (age > POP_FRAMES + 6) return null;
          const p = Math.min(1, age / POP_FRAMES);
          return (
            <g key={b.id}>
              <circle cx={x} cy={y} r={r * (1 + p * 1.6)} fill="none" stroke={color} strokeWidth={8 * (1 - p)} opacity={1 - p} />
              {Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2 + i;
                const d = r * (0.6 + p * 2.4);
                return <circle key={k} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} r={7 * (1 - p)} fill={color} />;
              })}
            </g>
          );
        }
        const { hp, lastT } = hpAt(i);
        const flash = T - lastT < 0.12 ? 1 - (T - lastT) / 0.12 : 0;
        const frac = hp / hpInfo.max;
        const arc = 2 * Math.PI * (r + 7);
        return (
          <g key={b.id}>
            <Ball x={x} y={y} radius={r} team={b.team} winner={won && i === sim.winner.ballIndex} />
            {flash > 0 && <circle cx={x} cy={y} r={r} fill="#ffffff" opacity={flash * 0.85} />}
            <circle cx={x} cy={y} r={r + 7} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={6} />
            <circle
              cx={x}
              cy={y}
              r={r + 7}
              fill="none"
              stroke={frac > 0.5 ? "#3ddc68" : frac > 0.25 ? "#ffc23a" : "#ff3b3b"}
              strokeWidth={6}
              strokeDasharray={`${arc * frac} ${arc}`}
              transform={`rotate(-90 ${x} ${y})`}
              strokeLinecap="round"
            />
            <text x={x} y={y + r * 0.36} textAnchor="middle" fontFamily={style.font} fontWeight={800} fontSize={r * 1.0} fill="#fff" stroke="rgba(0,0,0,0.55)" strokeWidth={4} paintOrder="stroke">
              {hp}
            </text>
          </g>
        );
      })}

      {/* ダメージ表示 */}
      {popups.map((p, k) => {
        const age = frame - p.frame;
        if (age < 0 || age > 16) return null;
        const x = state.b[p.ball * 3];
        const y = state.b[p.ball * 3 + 1] - sim.balls[p.ball].radius - 18 - age * 2.5;
        return (
          <text key={k} x={x} y={y} textAnchor="middle" fontFamily={style.font} fontWeight={800} fontSize={p.dmg >= 2 ? 40 : 32} fill={p.dmg >= 2 ? "#ff3b3b" : "#ffffff"} stroke="rgba(0,0,0,0.6)" strokeWidth={5} paintOrder="stroke" opacity={1 - age / 16}>
            -{p.dmg}
          </text>
        );
      })}

      {/* 外周: 開始前は手すり、その後は縮む電気柵 */}
      {fenceOn ? (
        <g>
          <circle cx={cx} cy={cy} r={zone} fill="none" stroke={FENCE} strokeWidth={22} opacity={0.35} filter={shadowFilter(style, true)} />
          <circle cx={cx} cy={cy} r={zone} fill="none" stroke={FENCE} strokeWidth={10} />
          <circle cx={cx} cy={cy} r={zone} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="18 22" strokeDashoffset={-frame * 6} />
        </g>
      ) : (
        <ArenaRail layout={sim.layout} gate={null} frame={frame} />
      )}

      {won && <Spotlight sim={sim} frame={frame} />}
    </g>
  );
};

/** 中央の回転トゲ */
const SpikeStar: React.FC<{ sim: SimulationResult; angle: number }> = ({ sim, angle }) => {
  const style = useStyle();
  const { cx, cy } = sim.layout.arena;
  const s = sim.course.spinner;
  const hub = sim.course.hubRadius;
  const deg = (angle * 180) / Math.PI;
  const metal = "#5d6470";
  const spike = (x: number, y: number, a: number, size: number, key: string) => {
    const tx = x + Math.cos(a) * size;
    const ty = y + Math.sin(a) * size;
    const px = Math.cos(a + Math.PI / 2) * size * 0.45;
    const py = Math.sin(a + Math.PI / 2) * size * 0.45;
    return <polygon key={key} points={`${x + px},${y + py} ${tx},${ty} ${x - px},${y - py}`} fill="#d9dde3" stroke={metal} strokeWidth={2} strokeLinejoin="round" />;
  };
  return (
    <g>
      <g filter={shadowFilter(style)} transform={`translate(${style.shadow.dx} ${style.shadow.dy})`}>
        <circle cx={cx} cy={cy} r={hub + 8} fill={style.shadow.color} />
        <g transform={`rotate(${deg} ${cx} ${cy})`}>
          {Array.from({ length: s.arms }, (_, k) => (
            <rect key={k} x={cx} y={cy - s.thickness / 2} width={s.length} height={s.thickness} rx={s.thickness / 2} fill={style.shadow.color} transform={`rotate(${(k / s.arms) * 360} ${cx} ${cy})`} />
          ))}
        </g>
      </g>
      <g transform={`rotate(${deg} ${cx} ${cy})`}>
        {Array.from({ length: s.arms }, (_, k) => (
          <g key={k} transform={`rotate(${(k / s.arms) * 360} ${cx} ${cy})`}>
            {[0.35, 0.6, 0.85].flatMap((f, j) => [
              spike(cx + s.length * f, cy - s.thickness / 2 + 2, -Math.PI / 2, 16, `u${j}`),
              spike(cx + s.length * f, cy + s.thickness / 2 - 2, Math.PI / 2, 16, `d${j}`),
            ])}
            {spike(cx + s.length - 6, cy, 0, 22, "tip")}
            <rect x={cx} y={cy - s.thickness / 2} width={s.length} height={s.thickness} rx={s.thickness / 2} fill="url(#pillar)" stroke={metal} strokeWidth={2} />
          </g>
        ))}
      </g>
      <circle cx={cx} cy={cy} r={hub} fill="#3d434d" stroke="#d9dde3" strokeWidth={4} />
      {Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2 + angle;
        return spike(cx + Math.cos(a) * (hub - 4), cy + Math.sin(a) * (hub - 4), a, 14, `h${k}`);
      })}
      <circle cx={cx} cy={cy} r={hub * 0.45} fill="#ff3b3b" />
    </g>
  );
};
