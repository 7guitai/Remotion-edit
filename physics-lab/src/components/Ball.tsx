import React from "react";
import type { TeamId } from "../physics/teams";

type Props = {
  x: number;
  y: number;
  radius: number;
  team: TeamId;
  color: string;
  winner?: boolean;
  /** 0〜1。結果画面で勝者以外を薄くする */
  fade?: number;
};

/** つやのある球（影は BallShadow で別レイヤーに描く） */
export const Ball: React.FC<Props> = ({ x, y, radius: r, team, color, winner = false, fade = 1 }) => (
  <g opacity={fade}>
    {winner && <circle cx={x} cy={y} r={r * 2.1} fill={color} opacity={0.18} />}
    <circle cx={x} cy={y} r={r} fill={`url(#ball-${team})`} />
    <ellipse cx={x - r * 0.33} cy={y - r * 0.38} rx={r * 0.3} ry={r * 0.22} fill="#fff" opacity={0.85} transform={`rotate(-30 ${x - r * 0.33} ${y - r * 0.38})`} />
    <circle cx={x + r * 0.42} cy={y + r * 0.45} r={r * 0.12} fill="#fff" opacity={0.25} />
  </g>
);

export const BallShadow: React.FC<{ x: number; y: number; radius: number; opacity?: number }> = ({ x, y, radius: r, opacity = 1 }) => (
  <ellipse cx={x + 6} cy={y + 9} rx={r * 1.02} ry={r * 0.92} fill="rgba(40,30,20,0.32)" opacity={opacity} />
);
