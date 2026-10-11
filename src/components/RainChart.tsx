import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { RAIN } from "../sim/scenes";
import { fontFamily } from "../theme";

// 雨の検証の図解（たて動画の映像エリア 1080×1000。字幕にかからないよう y≈620 まで）
// bars：ぬれた雨粒の内訳（上から・前から）を、歩く・走るで比べる
// why：上から当たる雨は「外にいる時間」、前から当たる雨は「進んだ距離」で決まる
export type RainChartMode = "bars" | "why";

const Label: React.FC<{ x: number; y: number; size?: number; color?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({
  x,
  y,
  size = 40,
  color = "#fff",
  anchor = "middle",
  children,
}) => (
  <text x={x} y={y} fontFamily={fontFamily} fontWeight={900} fontSize={size} textAnchor={anchor} fill={color} stroke="#0b1020" strokeWidth={size * 0.18} paintOrder="stroke">
    {children}
  </text>
);

// 計算（scenes.ts の rwalk / rrun と同じ式）
const parts = (v: number) => {
  const time = 0.6 + RAIN.dist / v;
  return { top: RAIN.n * RAIN.fall * RAIN.top * time, front: RAIN.n * RAIN.front * RAIN.dist };
};

export const RainChart: React.FC<{ mode: RainChartMode; width: number; height: number }> = ({ mode, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  let body: React.ReactNode;

  if (mode === "bars") {
    const rows = [
      { name: "歩く", color: "#ff4a3d", ...parts(RAIN.walk) },
      { name: "走る", color: "#2f8bff", ...parts(RAIN.run) },
    ];
    const max = rows[0].top + rows[0].front;
    const grow = interpolate(p, [0.05, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const W = 700;
    body = (
      <>
        <Label x={540} y={110} size={52} color="#ffe600">ぬれた雨粒の内訳</Label>
        {rows.map((r, i) => {
          const y = 210 + i * 190;
          const wf = (r.front / max) * W * grow;
          const wt = (r.top / max) * W * grow;
          return (
            <g key={r.name}>
              <Label x={110} y={y + 62} size={46} color={r.color}>{r.name}</Label>
              <rect x={190} y={y} width={wf} height={100} fill="#3a6fb5" />
              <rect x={190 + wf} y={y} width={wt} height={100} fill="#9fd3ff" />
              {grow > 0.9 ? (
                <>
                  <Label x={190 + wf / 2} y={y + 64} size={34}>{`前から ${Math.round(r.front).toLocaleString()}`}</Label>
                  <Label x={190 + wf + wt / 2} y={y + 64} size={28} color="#0b2a4a">{wt > 120 ? `上から ${Math.round(r.top).toLocaleString()}` : ""}</Label>
                  <Label x={190 + wf + wt + 12} y={y + 64} size={36} anchor="start">{`${Math.round(r.top + r.front).toLocaleString()}`}</Label>
                </>
              ) : null}
            </g>
          );
        })}
        {p > 0.5 ? <Label x={540} y={600} size={40} color="#9fd3ff">減ったのは「上から」の分だけ！</Label> : null}
      </>
    );
  } else {
    // 左：上から落ちる雨（時間）、右：前からぶつかる雨（距離）
    const walkerX = 160 + ((t * 120) % 300);
    body = (
      <>
        <Label x={540} y={100} size={50} color="#ffe600">ぬれ方は2種類</Label>
        <rect x={60} y={150} width={460} height={430} rx={26} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
        <rect x={560} y={150} width={460} height={430} rx={26} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
        {/* 左：上からの雨が頭に当たる */}
        {Array.from({ length: 26 }, (_, i) => {
          const x = 90 + random(`ux${i}`) * 400;
          const y = 170 + ((random(`uy${i}`) * 300 + t * 260) % 300);
          return <line key={i} x1={x} y1={y} x2={x} y2={y + 24} stroke="#9fd3ff" strokeWidth={4} />;
        })}
        <circle cx={290} cy={420} r={34} fill="#f1c7a0" />
        <rect x={250} y={455} width={80} height={110} rx={20} fill="#ff4a3d" />
        <Label x={290} y={200} size={38} color="#9fd3ff">上から</Label>
        <Label x={290} y={630} size={32} color="#fff">外にいる時間で決まる</Label>
        {/* 右：進むと、前の空中にある雨粒にぶつかる */}
        {Array.from({ length: 30 }, (_, i) => {
          const x = 590 + random(`fx${i}`) * 400;
          const y = 190 + random(`fy${i}`) * 360;
          const hit = x < walkerX + 470 && x > walkerX + 410;
          return <circle key={i} cx={x} cy={y} r={hit ? 9 : 6} fill={hit ? "#ffffff" : "#9fd3ff"} />;
        })}
        <g transform={`translate(${walkerX + 410 - 160} 0)`}>
          <circle cx={170} cy={400} r={34} fill="#f1c7a0" />
          <rect x={130} y={435} width={80} height={120} rx={20} fill="#2f8bff" />
        </g>
        <Label x={790} y={200} size={38} color="#9fd3ff">前から</Label>
        <Label x={790} y={630} size={32} color="#fff">進んだ距離で決まる</Label>
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #1d3a66 0%, #0b1020 75%)" }}>
      <svg width={width} height={height} viewBox="0 0 1080 1000" preserveAspectRatio="xMidYMin slice" style={{ position: "absolute", inset: 0 }}>
        {body}
      </svg>
    </AbsoluteFill>
  );
};
