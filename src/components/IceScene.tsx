import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 「もし氷が水に沈んだら？」の図解（たて動画の映像エリア 1080×1000。下の字幕にかからないよう y≈620 まで）
// molecules：水（液体）と氷（すき間の多い六角形）の分子
// others：ほとんどの物質（固体のほうがぎっしり）
// lake_now / lake_sink：冬の湖の断面（12月→3月）。いまの世界 / 氷が沈む世界
// summer_sink：氷が沈む世界の夏（底の氷がとけ残る）
export type IceMode = "molecules" | "others" | "lake_now" | "lake_sink" | "summer_sink";

const Label: React.FC<{ x: number; y: number; size?: number; color?: string; children: React.ReactNode }> = ({
  x,
  y,
  size = 42,
  color = "#fff",
  children,
}) => (
  <text x={x} y={y} fontFamily={fontFamily} fontWeight={900} fontSize={size} textAnchor="middle" fill={color} stroke="#0b1020" strokeWidth={size * 0.18} paintOrder="stroke">
    {children}
  </text>
);

// 水の分子（赤い酸素と、白い水素2つ。角度104.5°）
const Water: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    {[-52, 52].map((a) => (
      <circle key={a} cx={Math.sin((a * Math.PI) / 180) * 21} cy={Math.cos((a * Math.PI) / 180) * 21} r={9.5} fill="#f4f6fb" stroke="#9aa6b8" strokeWidth={2} />
    ))}
    <circle cx={0} cy={0} r={15} fill="#ff4d4d" stroke="#b51f1f" strokeWidth={2} />
  </g>
);

const Fish: React.FC<{ x: number; y: number; dir: number; color?: string }> = ({ x, y, dir, color = "#ff9a3c" }) => (
  <g transform={`translate(${x} ${y}) scale(${dir} 1)`}>
    <path d="M -26 0 L -40 -12 L -40 12 Z" fill={color} />
    <ellipse cx={0} cy={0} rx={28} ry={14} fill={color} />
    <circle cx={14} cy={-3} r={3} fill="#111" />
  </g>
);

const MONTHS = ["12月", "1月", "2月", "3月"];

export const IceScene: React.FC<{ mode: IceMode; width: number; height: number }> = ({ mode, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  let body: React.ReactNode = null;
  let bg = "radial-gradient(circle at 50% 40%, #1d3a66 0%, #0b1020 75%)";

  if (mode === "molecules" || mode === "others") {
    const water = mode === "molecules";
    // 左：液体（ばらばらに動く）
    // 液体の水は、氷よりぎっしり（だから氷が浮く）
    const liquid = Array.from({ length: water ? 34 : 30 }, (_, i) => {
      const bx = 95 + (i % 6) * 66 + random(`lx${i}`) * 30;
      const by = 230 + Math.floor(i / 6) * 60 + random(`ly${i}`) * 25;
      const x = bx + Math.sin(t * (1.3 + random(`lvx${i}`)) + i) * 26;
      const y = by + Math.cos(t * (1.1 + random(`lvy${i}`)) + i * 2) * 22;
      return water ? (
        <Water key={i} x={x} y={y} rot={t * 90 * (random(`lr${i}`) - 0.5) + i * 40} />
      ) : (
        <circle key={i} cx={x} cy={y} r={22} fill="#8f7ad8" stroke="#4b3a8f" strokeWidth={3} />
      );
    });
    // 右：固体
    const solid: React.ReactNode[] = [];
    if (water) {
      // 六角形のすき間の多い並び（ハチの巣の頂点に酸素。水素結合は点線）
      const R = 62;
      const verts: [number, number][] = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          const cx = 680 + c * R * Math.sqrt(3) + (r % 2) * ((R * Math.sqrt(3)) / 2);
          const cy = 250 + r * R * 1.5;
          for (let k = 0; k < 6; k++) {
            const a = ((30 + 60 * k) * Math.PI) / 180;
            const v: [number, number] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
            if (v[0] > 600 && v[0] < 1005 && v[1] > 205 && v[1] < 580 && !verts.some((u) => Math.hypot(u[0] - v[0], u[1] - v[1]) < 4)) {
              verts.push(v);
            }
          }
        }
      }
      const jig = (i: number) => [Math.sin(t * 9 + i) * 2, Math.cos(t * 8 + i * 1.7) * 2];
      const nb = verts.map((v) => verts.map((u, j) => [u, j] as const).filter(([u]) => Math.abs(Math.hypot(u[0] - v[0], u[1] - v[1]) - R) < 3));
      verts.forEach(([x1, y1], i) => {
        nb[i].forEach(([[x2, y2], j]) => {
          if (j > i) {
            solid.push(<line key={`b${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9fd3ff" strokeWidth={3} strokeDasharray="7 7" opacity={0.75} />);
          }
        });
      });
      verts.forEach(([x, y], i) => {
        const [dx, dy] = jig(i);
        // 水素2つは、となりの酸素のほうを向く
        const hs = nb[i].slice(0, 2).map(([[ux, uy]]) => {
          const d = Math.hypot(ux - x, uy - y);
          return [x + dx + ((ux - x) / d) * 22, y + dy + ((uy - y) / d) * 22];
        });
        solid.push(
          <g key={`w${i}`}>
            {hs.map(([hx, hy], k) => (
              <circle key={k} cx={hx} cy={hy} r={9} fill="#f4f6fb" stroke="#9aa6b8" strokeWidth={2} />
            ))}
            <circle cx={x + dx} cy={y + dy} r={14} fill="#ff4d4d" stroke="#b51f1f" strokeWidth={2} />
          </g>,
        );
      });
      // 六角形のまん中の「すき間」を光らせる
      const glow = 0.35 + 0.25 * Math.sin(t * 3);
      solid.push(<circle key="gap" cx={680 + R * Math.sqrt(3) + (R * Math.sqrt(3)) / 2} cy={250 + R * 1.5} r={34} fill="#ffe600" opacity={glow} />);
    } else {
      // ぎっしり（三角の並び）
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 8; c++) {
          const x = 620 + c * 46 + (r % 2) * 23 + Math.sin(t * 9 + r + c) * 2;
          const y = 250 + r * 40 + Math.cos(t * 8 + r * c) * 2;
          solid.push(<circle key={`s${r}-${c}`} cx={x} cy={y} r={22} fill="#8f7ad8" stroke="#4b3a8f" strokeWidth={3} />);
        }
      }
    }
    body = (
      <>
        <rect x={60} y={190} width={440} height={400} rx={30} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
        <rect x={580} y={190} width={440} height={400} rx={30} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
        {liquid}
        {solid}
        <Label x={540} y={120} size={56} color="#ffe600">{water ? "水の分子 H₂O" : "ほとんどの物質"}</Label>
        <Label x={280} y={175} size={40}>液体</Label>
        <Label x={800} y={175} size={40}>{water ? "氷（固体）" : "固体"}</Label>
        <Label x={800} y={630} size={36} color={water ? "#9fd3ff" : "#cbb8ff"}>{water ? "すき間が多い → 軽い" : "ぎっしり → 重い"}</Label>
      </>
    );
  } else {
    // 湖の断面
    const summer = mode === "summer_sink";
    const sink = mode !== "lake_now";
    const SURF = 280;
    const BOT = 600;
    const basin = `M 90 ${SURF} C 160 ${BOT + 20}, 920 ${BOT + 20}, 990 ${SURF} Z`;
    const month = summer ? "7月" : MONTHS[Math.min(3, Math.floor(p * 4))];
    const temp = summer ? 25 : Math.round(interpolate(p, [0, 0.5, 1], [0, -10, -6]));
    // いまの世界：上から氷が厚くなる（最大 45px）。氷が沈む世界：底に氷がたまり、上へ増えていく
    const topIce = !sink ? interpolate(p, [0.05, 0.8], [0, 45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const pile = summer ? 230 : sink ? interpolate(p, [0.1, 0.95], [0, 270], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const pileTop = BOT - pile;
    // 魚の泳げる範囲（氷のない水）
    const fishTop = SURF + topIce + 25;
    const fishBot = Math.max(fishTop + 10, pileTop - 30);
    bg = summer ? "linear-gradient(180deg, #5fb0ff 0%, #bfe3ff 30%, #0b1020 30%)" : "linear-gradient(180deg, #8aa3c2 0%, #d8e3ef 28%, #0b1020 28%)";
    body = (
      <>
        {/* 空と地面 */}
        <rect x={0} y={SURF - 10} width={1080} height={720} fill="#5a4630" />
        {summer ? <circle cx={900} cy={110} r={60} fill="#ffd34d" /> : null}
        {!summer
          ? Array.from({ length: 40 }, (_, i) => (
              <circle key={i} cx={random(`sn${i}`) * 1080} cy={((random(`sy${i}`) * 260 + t * 40 * (0.6 + random(`ss${i}`))) % 260)} r={3 + random(`sr${i}`) * 3} fill="#fff" opacity={0.8} />
            ))
          : null}
        <clipPath id="lake">
          <path d={basin} />
        </clipPath>
        <path d={basin} fill={summer ? "#2b7fd6" : "#1f5fa8"} />
        <g clipPath="url(#lake)">
          {/* 夏の、温まった表面の水 */}
          {summer ? <rect x={0} y={SURF} width={1080} height={70} fill="#45a3ff" /> : null}
          {/* 表面の氷のふた */}
          {topIce > 0 ? <rect x={0} y={SURF} width={1080} height={topIce} fill="#e6f6ff" opacity={0.95} /> : null}
          {/* 底にたまった氷 */}
          {pile > 0 ? <rect x={0} y={pileTop} width={1080} height={pile + 40} fill="#dff3ff" opacity={0.95} /> : null}
          {pile > 0
            ? Array.from({ length: 30 }, (_, i) => (
                <path key={i} d={`M ${random(`ix${i}`) * 1080} ${pileTop + 10 + random(`iy${i}`) * Math.max(10, pile - 10)} l 10 -14 l 10 14 l -10 14 Z`} fill="#b8e2ff" opacity={0.6} />
              ))
            : null}
          {/* 水面でできて、沈んでいく氷のかけら */}
          {sink && !summer
            ? Array.from({ length: 18 }, (_, i) => {
                const period = 2.2;
                const ph = ((t + random(`cp${i}`) * period) % period) / period;
                const y = SURF + 5 + ph * (pileTop - SURF - 5);
                return <path key={i} d={`M ${140 + random(`cx${i}`) * 800} ${y} l 9 -12 l 9 12 l -9 12 Z`} fill="#eaf8ff" opacity={0.9} />;
              })
            : null}
          {/* 4℃の水（いまの世界） */}
          {!sink ? <Label x={540} y={BOT - 60} size={38} color="#9fd3ff">底は 4℃の水</Label> : null}
          {/* 魚 */}
          {(fishBot - fishTop > 20 ? [0, 1, 2] : []).map((k) => {
            const sp = 0.35 + k * 0.12;
            const ph = (t * sp + k * 0.33) % 2;
            const dir = ph < 1 ? 1 : -1;
            const x = 250 + (ph < 1 ? ph : 2 - ph) * 580;
            const y = fishTop + ((k + 0.5) / 3) * (fishBot - fishTop) + Math.sin(t * 2 + k) * 6;
            return <Fish key={k} x={x} y={y} dir={dir} color={["#ff9a3c", "#ffd23c", "#ff6b8a"][k]} />;
          })}
        </g>
        {/* 説明 */}
        {!sink && topIce > 20 ? <Label x={540} y={SURF - 22} size={38} color="#e6f6ff">氷のふた</Label> : null}
        {sink && !summer && pile > 120 ? <Label x={540} y={pileTop + 70} size={40} color="#0b3b6f">底から凍っていく</Label> : null}
        {summer ? <Label x={540} y={pileTop + 70} size={40} color="#0b3b6f">底の氷は とけ残る</Label> : null}
        {/* 月と気温 */}
        <g>
          <rect x={40} y={36} width={300} height={110} rx={20} fill="rgba(0,0,0,0.55)" />
          <text x={190} y={88} fontFamily={fontFamily} fontWeight={900} fontSize={44} textAnchor="middle" fill="#fff">
            {month}
          </text>
          <text x={190} y={132} fontFamily={fontFamily} fontWeight={900} fontSize={34} textAnchor="middle" fill={temp < 0 ? "#9fd3ff" : "#ffb347"}>
            {`気温 ${temp}℃`}
          </text>
        </g>
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: bg }}>
      <svg width={width} height={height} viewBox="0 0 1080 1000" preserveAspectRatio="xMidYMin slice" style={{ position: "absolute", inset: 0 }}>
        {body}
      </svg>
    </AbsoluteFill>
  );
};
