import React from "react";
import { THEME } from "../config/theme";
import type { SimulationResult } from "../physics/types";

type Props = {
  layout: SimulationResult["layout"];
  gate: [number, number] | null;
  /** 0〜1。クライマックスで壁が赤く脈動する */
  danger: number;
  frame: number;
};

const polar = (cx: number, cy: number, r: number, a: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;

/** ゲートを除いた外周の円弧パス */
const wallPath = (cx: number, cy: number, r: number, gate: [number, number] | null) => {
  if (!gate) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
  }
  const [g0, g1] = gate;
  const start = g1;
  const sweep = Math.PI * 2 - (g1 - g0);
  const [x0, y0] = polar(cx, cy, r, start);
  const [x1, y1] = polar(cx, cy, r, start + sweep);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
};

export const Arena: React.FC<Props> = ({ layout, gate, danger, frame }) => {
  const { cx, cy, radius: R, wallThickness: t } = layout.arena;
  const rWall = R + t / 2;
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.45);
  const wallColor = danger > 0 ? mix(THEME.cyan, THEME.red, danger * (0.6 + 0.4 * pulse)) : THEME.cyan;
  const path = wallPath(cx, cy, rWall, gate);

  return (
    <g>
      <defs>
        <radialGradient id="arena-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0b45" stopOpacity={0.9} />
          <stop offset="75%" stopColor="#0b0424" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#24104f" stopOpacity={0.95} />
        </radialGradient>
        <filter id="neon-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* 床 */}
      <circle cx={cx} cy={cy} r={R} fill="url(#arena-floor)" />
      {[0.33, 0.66].map((k) => (
        <circle key={k} cx={cx} cy={cy} r={R * k} fill="none" stroke={THEME.magenta} strokeOpacity={0.12} strokeWidth={2} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const [x0, y0] = polar(cx, cy, R * 0.15, a);
        const [x1, y1] = polar(cx, cy, R * 0.97, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={THEME.cyan} strokeOpacity={0.06} strokeWidth={2} />;
      })}

      {/* 出口の外側に危険表示 */}
      {gate && (
        <path
          d={(() => {
            const [x0, y0] = polar(cx, cy, R + t + 26, gate[0]);
            const [x1, y1] = polar(cx, cy, R + t + 26, gate[1]);
            return `M ${x0} ${y0} A ${R + t + 26} ${R + t + 26} 0 0 1 ${x1} ${y1}`;
          })()}
          fill="none"
          stroke={THEME.yellow}
          strokeOpacity={0.35 + 0.35 * pulse}
          strokeWidth={8}
          strokeDasharray="10 12"
        />
      )}

      {/* 外周壁（発光 + 本体） */}
      <path d={path} fill="none" stroke={wallColor} strokeWidth={t * 2.2} strokeOpacity={0.55} filter="url(#neon-blur)" strokeLinecap="round" />
      <path d={path} fill="none" stroke={wallColor} strokeWidth={t} strokeLinecap="round" />
      <path d={path} fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={t * 0.25} strokeLinecap="round" />

      {/* ゲート端 */}
      {gate &&
        gate.map((a, i) => {
          const [x, y] = polar(cx, cy, rWall, a);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={20} fill={THEME.yellow} opacity={0.5} filter="url(#neon-blur)" />
              <circle cx={x} cy={y} r={11} fill={THEME.yellow} stroke="#fff" strokeWidth={3} />
            </g>
          );
        })}
    </g>
  );
};

/** #rrggbb 同士の線形補間 */
export const mix = (a: string, b: string, p: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (v: number, s: number) => (v >> s) & 255;
  const c = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * Math.max(0, Math.min(1, p)));
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
};
