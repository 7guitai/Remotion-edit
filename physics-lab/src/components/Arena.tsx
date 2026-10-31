import React from "react";
import { useStyle } from "../styles/context";
import type { SimulationResult } from "../physics/types";
import { shadowFilter } from "./Defs";

type Layout = SimulationResult["layout"];

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

const wedge = (cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r0, a0);
  const [x1, y1] = polar(cx, cy, r1, a0);
  const [x2, y2] = polar(cx, cy, r1, a1);
  const [x3, y3] = polar(cx, cy, r0, a1);
  return `M ${x0} ${y0} L ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 0 0 ${x0} ${y0} Z`;
};

/** 床（円形ステージ）。ボールより下に描く */
export const ArenaFloor: React.FC<{ layout: Layout }> = ({ layout }) => {
  const style = useStyle();
  const { cx, cy, radius: R, wallThickness: t } = layout.arena;
  const Rf = R + t / 2;
  const sh = style.shadow;
  const floor = style.floor;

  let body: React.ReactNode;
  switch (floor.kind) {
    case "stairs": {
      const n = 20;
      const gap = 0.022;
      body = (
        <g>
          <circle cx={cx} cy={cy} r={Rf} fill={floor.under} />
          {Array.from({ length: n }, (_, i) => {
            const a0 = (i / n) * Math.PI * 2 + gap;
            const a1 = ((i + 1) / n) * Math.PI * 2 - gap;
            const [ex, ey] = polar(cx, cy, Rf, a1);
            const [ix, iy] = polar(cx, cy, 40, a1);
            return (
              <g key={i}>
                <path d={wedge(cx, cy, 40, Rf - 2, a0, a1)} fill={floor.tread[i % 2]} />
                <line x1={ix} y1={iy} x2={ex} y2={ey} stroke={floor.edge} strokeWidth={6} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      );
      break;
    }
    case "rings":
      body = (
        <g>
          {floor.colors.map((c, i) => (
            <circle key={i} cx={cx} cy={cy} r={Rf * (1 - i * 0.22)} fill={c} />
          ))}
          {Array.from({ length: 36 }, (_, i) => {
            const [x, y] = polar(cx, cy, R * 0.9, (i / 36) * Math.PI * 2);
            return <circle key={i} cx={x} cy={y} r={4} fill={style.pillar.mid} opacity={0.35} />;
          })}
        </g>
      );
      break;
    case "plain":
      body = <circle cx={cx} cy={cy} r={Rf} fill={floor.fill} />;
      break;
    default: {
      const id = `floor-${floor.kind}`;
      body = (
        <g>
          <radialGradient id={id} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor={floor.center} />
            <stop offset="100%" stopColor={floor.edge} />
          </radialGradient>
          <circle cx={cx} cy={cy} r={Rf} fill={`url(#${id})`} />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const [x0, y0] = polar(cx, cy, 70, a);
            const [x1, y1] = polar(cx, cy, R, a);
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={floor.line} strokeOpacity={0.5} strokeWidth={2} />;
          })}
          <circle cx={cx} cy={cy} r={R * 0.5} fill="none" stroke={floor.line} strokeOpacity={0.45} strokeWidth={2} />
        </g>
      );
    }
  }

  return (
    <g>
      <circle cx={cx + sh.dx * 1.5} cy={cy + sh.dy * 1.5} r={R + t} fill={sh.color} opacity={sh.blur > 0 ? 0.5 : 1} filter={shadowFilter(style, true)} />
      {body}
    </g>
  );
};

/** 外周の手すりとゲートの支柱。ボールより上に描く */
export const ArenaRail: React.FC<{ layout: Layout; gate: [number, number] | null; frame: number }> = ({ layout, gate, frame }) => {
  const style = useStyle();
  const { cx, cy, radius: R, wallThickness: t } = layout.arena;
  const rWall = R + t / 2;
  const w = style.rail.width;
  const path = arcPath(cx, cy, rWall, gate);
  const blink = 0.55 + 0.45 * Math.sin(frame * 0.35);
  const flat = style.ball === "flat";
  const sh = style.shadow;
  return (
    <g>
      <path d={path} transform={`translate(${sh.dx} ${sh.dy})`} fill="none" stroke={sh.color} strokeWidth={w} strokeLinecap="round" filter={shadowFilter(style)} />
      <path d={path} fill="none" stroke={style.rail.outline} strokeWidth={w + 4} strokeLinecap="round" />
      <path d={path} fill="none" stroke="url(#rail)" strokeWidth={w} strokeLinecap="round" />
      {!flat && <path d={path} fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={w * 0.22} strokeLinecap="round" transform="translate(-2 -2)" />}

      {gate && (
        <>
          <path
            d={(() => {
              const rr = R + t + 22;
              const [x0, y0] = polar(cx, cy, rr, gate[0]);
              const [x1, y1] = polar(cx, cy, rr, gate[1]);
              return `M ${x0} ${y0} A ${rr} ${rr} 0 0 1 ${x1} ${y1}`;
            })()}
            fill="none"
            stroke={style.accent}
            strokeOpacity={blink}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray="2 14"
          />
          {gate.map((a, i) => {
            const [x, y] = polar(cx, cy, rWall, a);
            return (
              <g key={i}>
                <circle cx={x + sh.dx} cy={y + sh.dy} r={15} fill={sh.color} filter={shadowFilter(style)} />
                <circle cx={x} cy={y} r={15} fill="url(#pillar)" stroke={style.pillar.outline} strokeWidth={flat ? 4 : 2} />
                {!flat && <circle cx={x - 4} cy={y - 5} r={4} fill="#fff" opacity={0.8} />}
              </g>
            );
          })}
        </>
      )}
    </g>
  );
};
