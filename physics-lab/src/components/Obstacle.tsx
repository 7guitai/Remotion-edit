import React from "react";
import { THEME } from "../config/theme";
import type { CourseSpec, SimulationResult } from "../physics/types";

type Props = {
  course: CourseSpec;
  layout: SimulationResult["layout"];
  spinnerAngle: number;
};

export const Obstacles: React.FC<Props> = ({ course, layout, spinnerAngle }) => {
  const { cx, cy } = layout.arena;
  const s = course.spinner;
  const deg = (spinnerAngle * 180) / Math.PI;
  return (
    <g>
      {/* 回転バー */}
      <g transform={`rotate(${deg} ${cx} ${cy})`}>
        {Array.from({ length: s.arms }, (_, k) => {
          const a = (k / s.arms) * 360;
          // 物理側と同じく、中心から放射状に伸びる腕
          const x = cx;
          const w = s.length;
          return (
            <g key={k} transform={`rotate(${a} ${cx} ${cy})`}>
              <rect x={x} y={cy - s.thickness} width={w} height={s.thickness * 2} rx={s.thickness} fill={THEME.magenta} opacity={0.35} filter="url(#neon-blur)" />
              <rect x={x} y={cy - s.thickness / 2} width={w} height={s.thickness} rx={s.thickness / 2} fill="#2a0630" stroke={THEME.magenta} strokeWidth={5} />
              <rect x={x + 8} y={cy - 2} width={w - 16} height={4} rx={2} fill="#ffd1f7" opacity={0.8} />
            </g>
          );
        })}
      </g>
      {/* 中心ハブ */}
      <circle cx={cx} cy={cy} r={course.hubRadius + 10} fill={THEME.magenta} opacity={0.35} filter="url(#neon-blur)" />
      <circle cx={cx} cy={cy} r={course.hubRadius} fill="#1d0533" stroke={THEME.magenta} strokeWidth={6} />
      <circle cx={cx} cy={cy} r={course.hubRadius * 0.45} fill={THEME.magenta} opacity={0.8} />
      {/* バンパー */}
      {course.bumpers.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={b.radius + 8} fill={THEME.yellow} opacity={0.3} filter="url(#neon-blur)" />
          <circle cx={b.x} cy={b.y} r={b.radius} fill="#2b2205" stroke={THEME.yellow} strokeWidth={6} />
          <circle cx={b.x} cy={b.y} r={b.radius * 0.35} fill={THEME.yellow} />
        </g>
      ))}
    </g>
  );
};
