import React from "react";
import type { TeamId } from "../physics/teams";
import { useStyle } from "../styles/context";

type Props = {
  x: number;
  y: number;
  radius: number;
  team: TeamId;
  winner?: boolean;
  /** 0〜1。結果画面で勝者以外を薄くする */
  fade?: number;
};

/** 球（影は BallShadow で別レイヤーに描く） */
export const Ball: React.FC<Props> = ({ x, y, radius: r, team, winner = false, fade = 1 }) => {
  const style = useStyle();
  const color = style.teams[team].color;
  const flat = style.ball === "flat";
  const hx = x - r * 0.33;
  const hy = y - r * 0.38;
  return (
    <g opacity={fade}>
      {winner && <circle cx={x} cy={y} r={r * 2.1} fill={color} opacity={0.22} />}
      <circle cx={x} cy={y} r={r} fill={`url(#ball-${team})`} stroke={flat ? "#111" : undefined} strokeWidth={flat ? 4 : 0} />
      {style.ball === "glossy" && (
        <ellipse cx={hx} cy={hy} rx={r * 0.3} ry={r * 0.22} fill="#fff" opacity={0.85} transform={`rotate(-30 ${hx} ${hy})`} />
      )}
      {style.ball === "metal" && (
        <>
          <ellipse cx={hx} cy={hy} rx={r * 0.22} ry={r * 0.15} fill="#fff" opacity={0.95} transform={`rotate(-30 ${hx} ${hy})`} />
          <circle cx={x + r * 0.4} cy={y + r * 0.45} r={r * 0.14} fill="#fff" opacity={0.35} />
        </>
      )}
      {style.ball === "matte" && <circle cx={hx} cy={hy} r={r * 0.2} fill="#fff" opacity={0.45} />}
      {flat && <circle cx={hx} cy={hy} r={r * 0.22} fill="#fff" opacity={color === "#ffffff" ? 0 : 0.9} />}
    </g>
  );
};

export const BallShadow: React.FC<{ x: number; y: number; radius: number; opacity?: number }> = ({ x, y, radius: r, opacity = 1 }) => {
  const sh = useStyle().shadow;
  return <ellipse cx={x + sh.dx} cy={y + sh.dy} rx={r * 1.02} ry={r * 0.95} fill={sh.color} opacity={opacity} />;
};
