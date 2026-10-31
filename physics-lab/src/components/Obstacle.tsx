import React from "react";
import { useStyle } from "../styles/context";
import type { CourseSpec, SimulationResult } from "../physics/types";
import { shadowFilter } from "./Defs";

type Props = {
  course: CourseSpec;
  layout: SimulationResult["layout"];
  spinnerAngle: number;
};

/** 回転バー、中央の柱、周囲の小さな柱（バンパー）。物理と同じ寸法で描く */
export const Obstacles: React.FC<Props> = ({ course, layout, spinnerAngle }) => {
  const style = useStyle();
  const { cx, cy } = layout.arena;
  const s = course.spinner;
  const sh = style.shadow;
  const flat = style.ball === "flat";
  const deg = (spinnerAngle * 180) / Math.PI;
  const arms = (fill: string, stroke?: string) =>
    Array.from({ length: s.arms }, (_, k) => (
      <g key={k} transform={`rotate(${(k / s.arms) * 360} ${cx} ${cy})`}>
        <rect x={cx} y={cy - s.thickness / 2} width={s.length} height={s.thickness} rx={s.thickness / 2} fill={fill} stroke={stroke} strokeWidth={stroke ? (flat ? 4 : 2) : 0} />
      </g>
    ));
  const pillar = (x: number, y: number, r: number, key: string) => (
    <g key={key}>
      <circle cx={x} cy={y} r={r} fill="url(#pillar)" stroke={style.pillar.outline} strokeWidth={flat ? 5 : 2} />
      {!flat && <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.26} fill="#fff" opacity={0.7} />}
    </g>
  );
  return (
    <g>
      <g filter={shadowFilter(style)}>
        <g transform={`translate(${sh.dx} ${sh.dy}) rotate(${deg} ${cx} ${cy})`}>{arms(sh.color)}</g>
        {course.bumpers.map((b, i) => (
          <circle key={i} cx={b.x + sh.dx} cy={b.y + sh.dy} r={b.radius} fill={sh.color} />
        ))}
        <circle cx={cx + sh.dx * 1.4} cy={cy + sh.dy * 1.4} r={course.hubRadius} fill={sh.color} />
      </g>

      <g transform={`rotate(${deg} ${cx} ${cy})`}>
        {arms("url(#spinner)", style.spinner.outline)}
        {!flat &&
          Array.from({ length: s.arms }, (_, k) => (
            <g key={k} transform={`rotate(${(k / s.arms) * 360} ${cx} ${cy})`}>
              <rect x={cx + 10} y={cy - s.thickness / 2 + 3} width={s.length - 20} height={3} rx={1.5} fill="#fff" opacity={0.55} />
            </g>
          ))}
      </g>

      {course.bumpers.map((b, i) => pillar(b.x, b.y, b.radius, `b${i}`))}
      {pillar(cx, cy, course.hubRadius, "hub")}
      {!flat && <circle cx={cx} cy={cy} r={course.hubRadius * 0.62} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={3} />}
    </g>
  );
};
