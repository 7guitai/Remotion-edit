import React from "react";
import { THEME } from "../config/theme";

type Props = {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  number: number;
  /** "alive" | "dead"（ドロップゾーン）| "winner" */
  state: "alive" | "dead" | "winner";
  /** 0〜1。結果画面で勝者以外を暗くする */
  fade?: number;
};

export const Ball: React.FC<Props> = ({ x, y, angle, radius: r, color, number, state, fade = 1 }) => {
  const dead = state === "dead";
  const opacity = (dead ? 0.42 : 1) * fade;
  const deg = (angle * 180) / Math.PI;
  return (
    <g opacity={opacity}>
      {!dead && <circle cx={x} cy={y} r={r * (state === "winner" ? 2.4 : 1.7)} fill={color} opacity={state === "winner" ? 0.45 : 0.28} />}
      <circle cx={x} cy={y} r={r} fill={dead ? "#1a1a2a" : color} stroke={dead ? color : "#ffffff"} strokeWidth={dead ? 3 : 2.5} />
      {/* 回転が分かるストライプ */}
      <g transform={`rotate(${deg} ${x} ${y})`}>
        <rect x={x - r * 0.75} y={y - r * 0.12} width={r * 1.5} height={r * 0.24} rx={r * 0.12} fill="#000" opacity={dead ? 0.15 : 0.22} />
      </g>
      {!dead && <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.28} fill="#fff" opacity={0.65} />}
      <text
        x={x}
        y={y + r * 0.36}
        textAnchor="middle"
        fontFamily={THEME.font}
        fontWeight={900}
        fontSize={r * (number >= 10 ? 0.95 : 1.1)}
        fill={dead ? color : "#05010f"}
      >
        {number}
      </text>
    </g>
  );
};
