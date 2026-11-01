import React, { useMemo } from "react";
import { ArenaFloor, ArenaRail } from "../../components/Arena";
import { Ball, BallShadow } from "../../components/Ball";
import { Defs, shadowFilter } from "../../components/Defs";
import { frameAtSimTime } from "../../data/load-simulation";
import { teamsAt } from "../../data/takeover";
import { TEAMS } from "../../physics/teams";
import type { SimulationResult } from "../../physics/types";
import { useStyle } from "../../styles/context";
import { Spotlight } from "./CollapseWorld";

type Props = { sim: SimulationResult; frame: number };

const POP_FRAMES = 9;

/** TAKEOVER: ぶつかった相手を自分の色に変えていき、最後に1色になったら決着 */
export const TakeoverWorld: React.FC<Props> = ({ sim, frame }) => {
  const style = useStyle();
  const state = sim.frames[frame];
  const T = state.t;
  const won = frame >= sim.winnerFrame;
  const tk = sim.takeover!;
  const team = teamsAt(sim, T);

  // 色が変わった瞬間のフレーム（ボールごとの直近）
  const convFrames = useMemo(() => tk.conversions.map((c) => ({ ...c, frame: frameAtSimTime(sim, c.t) })), [sim, tk]);
  const lastConv = sim.balls.map(() => -Infinity);
  for (const c of convFrames) {
    if (c.frame > frame) break;
    lastConv[c.ball] = c.frame;
  }

  // 巨大化の大きさ
  const g = tk.giant;
  const giantScale = (() => {
    if (!g) return 1;
    const grow = Math.min(1, Math.max(0, (T - g.start) / 0.4));
    const shrink = Math.min(1, Math.max(0, (T - g.end) / 0.4));
    return 1 + (g.scale - 1) * grow * (1 - shrink);
  })();
  const giantActive = g !== null && T >= g.start && T < g.end;

  return (
    <g>
      <Defs />
      <RaceBars sim={sim} team={team} frame={frame} />
      <ArenaFloor layout={sim.layout} />

      <g filter={shadowFilter(style)}>
        {sim.balls.map((b, i) => (
          <BallShadow key={b.id} x={state.b[i * 3]} y={state.b[i * 3 + 1]} radius={b.radius * (g && g.ball === i ? giantScale : 1)} />
        ))}
        {[{ x: sim.layout.arena.cx, y: sim.layout.arena.cy, radius: sim.course.hubRadius }, ...sim.course.bumpers].map((p, k) => (
          <circle key={k} cx={p.x + style.shadow.dx} cy={p.y + style.shadow.dy} r={p.radius} fill={style.shadow.color} />
        ))}
      </g>

      {/* 柱 */}
      {[{ x: sim.layout.arena.cx, y: sim.layout.arena.cy, radius: sim.course.hubRadius }, ...sim.course.bumpers].map((p, k) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r={p.radius} fill="url(#pillar)" stroke={style.pillar.outline} strokeWidth={2} />
          <circle cx={p.x - p.radius * 0.3} cy={p.y - p.radius * 0.35} r={p.radius * 0.26} fill="#fff" opacity={0.7} />
        </g>
      ))}

      {sim.balls.map((b, i) => {
        const x = state.b[i * 3];
        const y = state.b[i * 3 + 1];
        const age = frame - lastConv[i];
        const pop = age >= 0 && age < POP_FRAMES ? 1 + 0.35 * (1 - age / POP_FRAMES) : 1;
        const isGiant = g !== null && g.ball === i;
        const r = b.radius * (isGiant ? giantScale : 1) * pop;
        const color = style.teams[team[i]].color;
        return (
          <g key={b.id}>
            {age >= 0 && age < POP_FRAMES + 4 && (
              <circle cx={x} cy={y} r={b.radius * (1 + age * 0.18)} fill="none" stroke={color} strokeWidth={5 * (1 - age / (POP_FRAMES + 4))} opacity={1 - age / (POP_FRAMES + 4)} />
            )}
            {isGiant && giantActive && <circle cx={x} cy={y} r={r + 14 + Math.sin(frame * 0.6) * 4} fill="none" stroke={style.accent} strokeWidth={6} strokeDasharray="14 10" />}
            <Ball x={x} y={y} radius={r} team={team[i]} winner={won && i === sim.winner.ballIndex} />
          </g>
        );
      })}

      <ArenaRail layout={sim.layout} gate={null} frame={frame} />
      {won && <Spotlight sim={sim} frame={frame} />}
    </g>
  );
};

/** 画面下部: 4色の人数を縦棒で比べるレースチャート */
const RaceBars: React.FC<{ sim: SimulationResult; team: string[]; frame: number }> = ({ sim, team, frame }) => {
  const style = useStyle();
  const dz = sim.layout.dropZone;
  const n = sim.balls.length;
  const w = (dz.right - dz.left - 80) / 4;
  const maxH = dz.floor - dz.top - 110;
  const counts = TEAMS.map((t) => team.filter((x) => x === t.id).length);
  const leader = Math.max(...counts);
  return (
    <g>
      <rect x={dz.left} y={dz.top} width={dz.right - dz.left} height={dz.floor - dz.top} rx={36} fill={style.dropZone.fill} />
      {TEAMS.map((t, k) => {
        const c = counts[k];
        const h = Math.max(6, Math.pow(c / n, 0.7) * maxH);
        const x = dz.left + 40 + k * w + w * 0.18;
        const bw = w * 0.64;
        const y = dz.floor - h;
        const color = style.teams[t.id].color;
        const lead = c === leader && c > 0;
        return (
          <g key={t.id} opacity={c === 0 ? 0.35 : 1}>
            <rect x={x} y={y} width={bw} height={h} rx={14} fill={color} />
            <rect x={x + 8} y={y + 8} width={bw * 0.18} height={Math.max(0, h - 16)} rx={6} fill="#fff" opacity={0.3} />
            <text x={x + bw / 2} y={y - 18} textAnchor="middle" fontFamily={style.font} fontWeight={800} fontSize={lead ? 60 : 48} fill={style.text}>
              {c}
            </text>
            {lead && frame > sim.introFrames && (
              <polygon
                points={[[-30, 0], [-34, -34], [-15, -16], [0, -40], [15, -16], [34, -34], [30, 0]].map(([px, py]) => `${x + bw / 2 + px},${y - 82 + py}`).join(" ")}
                fill="#ffc83a"
                stroke="#fff"
                strokeWidth={4}
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
      <rect x={dz.left} y={dz.floor} width={dz.right - dz.left} height={10} rx={5} fill={style.dropZone.floor} />
    </g>
  );
};
