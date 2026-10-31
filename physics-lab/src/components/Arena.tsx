import React from "react";
import { THEME } from "../config/theme";
import type { SimulationResult } from "../physics/types";
import { SHADOW } from "./Defs";

type Props = {
  layout: SimulationResult["layout"];
  gate: [number, number] | null;
  frame: number;
};

const polar = (cx: number, cy: number, r: number, a: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;

/** ゲートを除いた外周の円弧パス */
const arcPath = (cx: number, cy: number, r: number, gate: [number, number] | null) => {
  if (!gate) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
  }
  const [g0, g1] = gate;
  const sweep = Math.PI * 2 - (g1 - g0);
  const [x0, y0] = polar(cx, cy, r, g1);
  const [x1, y1] = polar(cx, cy, r, g1 + sweep);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
};

/** 床（円形ステージ）。ボールより下に描く */
export const ArenaFloor: React.FC<{ layout: SimulationResult["layout"] }> = ({ layout }) => {
  const { cx, cy, radius: R, wallThickness: t } = layout.arena;
  return (
    <g>
      <circle cx={cx + SHADOW.dx * 1.5} cy={cy + SHADOW.dy * 1.5} r={R + t} fill={THEME.shadow} opacity={0.5} filter="url(#soft-shadow-lg)" />
      <circle cx={cx} cy={cy} r={R + t / 2} fill="url(#arena-floor)" />
      {/* 床の目地（放射状の板張り） */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const [x0, y0] = polar(cx, cy, 70, a);
        const [x1, y1] = polar(cx, cy, R, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#d8d1c5" strokeOpacity={0.5} strokeWidth={2} />;
      })}
      <circle cx={cx} cy={cy} r={R * 0.5} fill="none" stroke="#d8d1c5" strokeOpacity={0.45} strokeWidth={2} />
    </g>
  );
};

/** 外周の手すり（金属レール）とゲートの支柱。ボールより上に描く */
export const ArenaRail: React.FC<Props> = ({ layout, gate, frame }) => {
  const { cx, cy, radius: R, wallThickness: t } = layout.arena;
  const rWall = R + t / 2;
  const path = arcPath(cx, cy, rWall, gate);
  const blink = 0.55 + 0.45 * Math.sin(frame * 0.35);
  return (
    <g>
      <path d={path} transform={`translate(${SHADOW.dx} ${SHADOW.dy})`} fill="none" stroke={THEME.shadow} strokeWidth={t} strokeLinecap="round" filter="url(#soft-shadow)" />
      <path d={path} fill="none" stroke="#8e9cad" strokeWidth={t + 4} strokeLinecap="round" />
      <path d={path} fill="none" stroke="url(#rail)" strokeWidth={t} strokeLinecap="round" />
      <path d={path} fill="none" stroke="#ffffff" strokeOpacity={0.9} strokeWidth={t * 0.22} strokeLinecap="round" transform={`translate(-2 -2)`} />

      {gate && (
        <>
          {/* 出口の外側に点線の矢印ガイド */}
          <path
            d={(() => {
              const rr = R + t + 22;
              const [x0, y0] = polar(cx, cy, rr, gate[0]);
              const [x1, y1] = polar(cx, cy, rr, gate[1]);
              return `M ${x0} ${y0} A ${rr} ${rr} 0 0 1 ${x1} ${y1}`;
            })()}
            fill="none"
            stroke={THEME.accent}
            strokeOpacity={blink}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray="2 14"
          />
          {gate.map((a, i) => {
            const [x, y] = polar(cx, cy, rWall, a);
            return (
              <g key={i}>
                <circle cx={x + SHADOW.dx} cy={y + SHADOW.dy} r={15} fill={THEME.shadow} filter="url(#soft-shadow)" />
                <circle cx={x} cy={y} r={15} fill="url(#pillar)" stroke={THEME.steelDark} strokeWidth={2} />
                <circle cx={x - 4} cy={y - 5} r={4} fill="#fff" opacity={0.8} />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
};
