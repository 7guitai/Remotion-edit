import React from "react";
import { THEME } from "../config/theme";
import type { CourseSpec, SimulationResult } from "../physics/types";
import { SHADOW } from "./Defs";

type Props = {
  course: CourseSpec;
  layout: SimulationResult["layout"];
  spinnerAngle: number;
};

/** 回転する木の板（腕）、中央の柱、周囲の小さな柱（バンパー） */
export const Obstacles: React.FC<Props> = ({ course, layout, spinnerAngle }) => {
  const { cx, cy } = layout.arena;
  const s = course.spinner;
  const deg = (spinnerAngle * 180) / Math.PI;
  // 物理と同じ寸法で描く
  const arms = (fill: string, stroke?: string) =>
    Array.from({ length: s.arms }, (_, k) => (
      <g key={k} transform={`rotate(${(k / s.arms) * 360} ${cx} ${cy})`}>
        <rect x={cx} y={cy - s.thickness / 2} width={s.length} height={s.thickness} rx={s.thickness / 2} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : 0} />
      </g>
    ));
  return (
    <g>
      {/* 影 */}
      <g transform={`translate(${SHADOW.dx} ${SHADOW.dy}) rotate(${deg} ${cx} ${cy})`} filter="url(#soft-shadow)" opacity={0.9}>
        {arms(THEME.shadow)}
      </g>
      {course.bumpers.map((b, i) => (
        <circle key={`bs${i}`} cx={b.x + SHADOW.dx} cy={b.y + SHADOW.dy} r={b.radius} fill={THEME.shadow} filter="url(#soft-shadow)" />
      ))}
      <circle cx={cx + SHADOW.dx * 1.4} cy={cy + SHADOW.dy * 1.4} r={course.hubRadius} fill={THEME.shadow} filter="url(#soft-shadow)" />

      {/* 木の板 */}
      <g transform={`rotate(${deg} ${cx} ${cy})`}>
        {arms("url(#wood)", THEME.woodDark)}
        {Array.from({ length: s.arms }, (_, k) => (
          <g key={k} transform={`rotate(${(k / s.arms) * 360} ${cx} ${cy})`}>
            <rect x={cx + 10} y={cy - s.thickness / 2 + 3} width={s.length - 20} height={3} rx={1.5} fill="#fff" opacity={0.55} />
          </g>
        ))}
      </g>

      {/* バンパー（小さな金属の柱） */}
      {course.bumpers.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={b.radius} fill="url(#pillar)" stroke={THEME.steelDark} strokeWidth={2} />
          <circle cx={b.x - b.radius * 0.3} cy={b.y - b.radius * 0.35} r={b.radius * 0.28} fill="#fff" opacity={0.7} />
        </g>
      ))}

      {/* 中央の柱 */}
      <circle cx={cx} cy={cy} r={course.hubRadius} fill="url(#pillar)" stroke={THEME.steelDark} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={course.hubRadius * 0.62} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={3} />
      <circle cx={cx - course.hubRadius * 0.3} cy={cy - course.hubRadius * 0.35} r={course.hubRadius * 0.22} fill="#fff" opacity={0.75} />
    </g>
  );
};
