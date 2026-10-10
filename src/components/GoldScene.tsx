import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 「もし地球から金がなくなったら？」の図解（たて動画の映像エリア 1080×1000。字幕にかからないよう y≈620 まで）
// phone：スマホの中の基板と、金めっきのつなぎ目（端子）が光る
// rust：金がないと、つなぎ目がさびて（色が変わって）、電気が通りにくくなる
// test：検査キットの赤い線は、金の小さな粒の色。粒が小さいほど赤く見える
export type GoldMode = "phone" | "rust" | "test";

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

export const GoldScene: React.FC<{ mode: GoldMode; width: number; height: number }> = ({ mode, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  let body: React.ReactNode = null;

  if (mode === "phone" || mode === "rust") {
    const rust = mode === "rust" ? interpolate(p, [0.1, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const shine = 0.5 + 0.5 * Math.sin(t * 4);
    // 端子の色：金色 → さびた茶色・緑
    const pad = (k: number) => {
      const r = Math.min(1, rust * (1.2 + random(`rr${k}`) * 0.6));
      const c0 = [242, 193, 78];
      const c1 = k % 3 === 0 ? [92, 140, 96] : [140, 86, 48];
      const c = c0.map((v, i) => Math.round(v + (c1[i] - v) * r));
      return `rgb(${c.join(",")})`;
    };
    // 電気の流れ（光の点）。さびると途切れる
    const flow = Array.from({ length: 10 }, (_, k) => {
      const ph = (t * 0.7 + k / 10) % 1;
      const ok = random(`fl${k}`) > rust * 0.95;
      return { ph, ok, k };
    });
    body = (
      <>
        {/* スマホの外形と、はずした裏ぶたの中の基板 */}
        <rect x={300} y={130} width={480} height={500} rx={60} fill="#15171c" stroke="#3a3f4a" strokeWidth={8} />
        <rect x={340} y={175} width={400} height={410} rx={22} fill="#1f6b3a" />
        {/* 配線 */}
        {Array.from({ length: 9 }, (_, k) => (
          <path key={k} d={`M ${370 + k * 42} 200 L ${370 + k * 42} ${330 + (k % 3) * 40} L ${450 + (k % 4) * 60} ${430 + (k % 3) * 30}`} fill="none" stroke="#2fa55a" strokeWidth={6} />
        ))}
        {/* チップ */}
        <rect x={470} y={300} width={140} height={110} rx={10} fill="#222" />
        <rect x={420} y={460} width={70} height={50} rx={6} fill="#333" />
        <rect x={600} y={455} width={90} height={60} rx={6} fill="#333" />
        {/* 金めっきの端子（つなぎ目） */}
        {Array.from({ length: 12 }, (_, k) => (
          <rect key={k} x={372 + k * 30} y={540} width={20} height={34} rx={4} fill={pad(k)} stroke={rust < 0.3 ? `rgba(255,240,170,${0.4 + 0.5 * shine})` : "none"} strokeWidth={3} />
        ))}
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={`c${k}`} x={480 + (k % 4) * 30} y={k < 4 ? 285 : 416} width={14} height={14} rx={2} fill={pad(k + 20)} />
        ))}
        {flow.map(({ ph, ok, k }) =>
          ok ? <circle key={k} cx={384 + (k % 12) * 30} cy={540 - ph * 230} r={6} fill="#fff6c0" opacity={1 - ph} /> : null,
        )}
        {mode === "phone" ? (
          <>
            <Label x={540} y={90} size={50} color="#ffe600">スマホ1台に 金 約0.03g</Label>
            <Label x={540} y={630} size={36} color="#ffe9a3">さびない・電気をよく通す</Label>
          </>
        ) : (
          <>
            <Label x={540} y={90} size={50} color="#ffb38a">金がないと…</Label>
            {rust > 0.5 ? <Label x={540} y={630} size={40} color="#ff8a8a">さびて 電気が通りにくい！</Label> : null}
          </>
        )}
      </>
    );
  } else {
    // 検査キット（左）と、金の粒の大きさと色（右）
    const show = interpolate(p, [0.05, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const sizes = [
      { d: 100, color: "#d9a520", label: "大きい粒" },
      { d: 50, color: "#c0503a", label: "" },
      { d: 20, color: "#c2183a", label: "小さい粒" },
    ];
    body = (
      <>
        {/* 検査キット */}
        <rect x={110} y={150} width={240} height={460} rx={40} fill="#f4f6fa" stroke="#c9d1dc" strokeWidth={6} />
        <rect x={170} y={240} width={120} height={230} rx={12} fill="#ffffff" stroke="#c9d1dc" strokeWidth={4} />
        <rect x={180} y={300} width={100} height={14} rx={4} fill="#c2183a" opacity={show} />
        <rect x={180} y={380} width={100} height={14} rx={4} fill="#c2183a" opacity={show * 0.8} />
        <circle cx={230} cy={540} r={34} fill="#e6ebf2" stroke="#c9d1dc" strokeWidth={4} />
        {/* 拡大の円 */}
        <line x1={290} y1={307} x2={470} y2={250} stroke="#ffffff" strokeWidth={4} opacity={0.6} />
        <circle cx={560} cy={250} r={95} fill="#2a0a12" stroke="#ffffff" strokeWidth={5} />
        {Array.from({ length: 40 }, (_, k) => {
          const a = random(`na${k}`) * Math.PI * 2;
          const r = Math.sqrt(random(`nr${k}`)) * 80;
          return <circle key={k} cx={560 + Math.cos(a) * r + Math.sin(t * 3 + k) * 2} cy={250 + Math.sin(a) * r} r={6} fill="#ff3b5c" opacity={0.9} />;
        })}
        <Label x={560} y={385} size={32} color="#ffd1da">金の小さな粒</Label>
        {/* 粒の大きさと色 */}
        {sizes.map((s, k) => (
          <g key={k} opacity={interpolate(p, [0.35 + k * 0.12, 0.45 + k * 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
            <circle cx={700 + k * 130} cy={500} r={22 + s.d * 0.25} fill={s.color} stroke="#fff" strokeWidth={3} />
            <text x={700 + k * 130} y={590} fontFamily={fontFamily} fontWeight={900} fontSize={28} textAnchor="middle" fill="#fff">
              {`${s.d}nm`}
            </text>
          </g>
        ))}
        <Label x={830} y={430} size={30} color="#ffe9a3">小さいほど 赤く見える</Label>
        <Label x={540} y={95} size={48} color="#ffe600">赤い線は「金」の色</Label>
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #3a2a10 0%, #0b0a12 75%)" }}>
      <svg width={width} height={height} viewBox="0 0 1080 1000" preserveAspectRatio="xMidYMin slice" style={{ position: "absolute", inset: 0 }}>
        {body}
      </svg>
    </AbsoluteFill>
  );
};
