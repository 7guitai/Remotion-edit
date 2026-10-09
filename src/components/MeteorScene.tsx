import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 流れ星の断面図（たて動画の映像エリア 1080×1000 を想定。下の字幕にかからないよう、地面は y=600）
// burn：宇宙の石が高度100kmあたりで空気にぶつかって光り、70kmあたりで燃えつきる（＝流れ星）
// hit：空気抵抗がないと、光らず・燃えつきず、秒速20kmのまま地面にぶつかる
export type MeteorMode = "burn" | "hit";

const GROUND = 600;
const KM = 4.5; // 1km あたりの高さ（px）
const yOf = (km: number) => GROUND - km * KM;

// 石の通り道：右上から左下へ（高度が下がるほど左へ）
const path = (s: number, x0: number) => {
  const y = -60 + s * (GROUND + 60);
  const x = x0 - (y + 60) * 0.75;
  return { x, y };
};

const Label: React.FC<{ x: number; y: number; size?: number; color?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({
  x,
  y,
  size = 40,
  color = "#fff",
  anchor = "middle",
  children,
}) => (
  <text x={x} y={y} fontFamily={fontFamily} fontWeight={900} fontSize={size} textAnchor={anchor} fill={color} stroke="#050814" strokeWidth={size * 0.2} paintOrder="stroke">
    {children}
  </text>
);

export const MeteorScene: React.FC<{ mode: MeteorMode; width: number; height: number }> = ({ mode, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const burn = mode === "burn";
  // 石が通る時間（秒）。3つの石が少しずつずれて落ちてくる
  const starts = burn ? [0.3, 1.5, 2.6] : [0.6];
  const dur = burn ? 1.6 : 1.4;
  const x0s = burn ? [1020, 900, 1080] : [1000];
  let impact = -1;
  const rocks = starts.map((st, i) => {
    const s = (t - st) / dur;
    const p = path(Math.min(1, Math.max(0, s)), x0s[i]);
    const km = (GROUND - p.y) / KM;
    // burn：100km で光り始め、70km で燃えつきる
    const glow = burn ? interpolate(km, [70, 78, 100, 108], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const gone = burn ? km < 70 : s >= 1;
    if (!burn && s >= 1) {
      impact = st + dur;
    }
    return { s, p, glow, gone, i };
  });
  const since = impact < 0 ? -1 : t - impact;
  const shake = since >= 0 && since < 0.5 ? Math.sin(since * 80) * 14 * (1 - since / 0.5) : 0;
  const flash = since >= 0 ? interpolate(since, [0, 0.08, 0.6], [0, 0.9, 0], { extrapolateRight: "clamp" }) : 0;
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.04]);

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #02030a 0%, #070b24 40%, #16284f 58%, #2b4a7a 62%)" }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 1080 1000"
        preserveAspectRatio="xMidYMin slice"
        style={{ position: "absolute", inset: 0, transform: `translate(${shake}px, ${shake * 0.5}px) scale(${zoom})`, transformOrigin: "50% 40%" }}
      >
        <defs>
          <linearGradient id="atm" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3a7bd5" stopOpacity="0" />
            <stop offset="1" stopColor="#5fa8ff" stopOpacity="0.45" />
          </linearGradient>
          <radialGradient id="head">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor="#fff2a8" />
            <stop offset="1" stopColor="#ff9a2e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="boom">
            <stop offset="0" stopColor="#fff8d8" />
            <stop offset="0.4" stopColor="#ffb347" />
            <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 星 */}
        {Array.from({ length: 110 }, (_, i) => (
          <circle key={i} cx={random(`ms-x${i}`) * 1080} cy={random(`ms-y${i}`) * 420} r={0.8 + random(`ms-r${i}`) * 1.8} fill="#fff" opacity={0.3 + 0.6 * random(`ms-o${i}`)} />
        ))}
        {/* 空気の層（高さ100kmより下は、空気がだんだん濃くなる） */}
        <rect x={0} y={yOf(100)} width={1080} height={GROUND - yOf(100)} fill="url(#atm)" />
        {/* 高さの目盛り */}
        {[100, 70, 40].map((km) => (
          <g key={km}>
            <line x1={0} x2={1080} y1={yOf(km)} y2={yOf(km)} stroke="#9fc4ff" strokeWidth={2} strokeDasharray="10 12" opacity={0.55} />
            <Label x={1060} y={yOf(km) - 10} size={30} color="#bcd6ff" anchor="end">
              {`高度${km}km`}
            </Label>
          </g>
        ))}
        {/* 石 */}
        {rocks.map(({ s, p, glow, gone, i }) => {
          if (s <= 0 || gone) {
            return null;
          }
          const dir = { x: -0.6, y: 0.8 };
          const tailLen = 40 + glow * 260;
          return (
            <g key={i}>
              {glow > 0
                ? Array.from({ length: 8 }, (_, k) => {
                    // 尾：頭から通り道を逆にたどって、だんだん細く・うすく
                    const a = (k / 8) * tailLen;
                    const b = ((k + 1) / 8) * tailLen;
                    return (
                      <line
                        key={k}
                        x1={p.x - dir.x * a}
                        y1={p.y - dir.y * a}
                        x2={p.x - dir.x * b}
                        y2={p.y - dir.y * b}
                        stroke={k < 2 ? "#fffbe8" : "#ffd58a"}
                        strokeWidth={(12 - k * 1.3) * glow}
                        strokeLinecap="round"
                        opacity={(1 - k / 8) * glow}
                      />
                    );
                  })
                : null}
              {glow > 0 ? <circle cx={p.x} cy={p.y} r={30 * glow} fill="url(#head)" /> : null}
              <circle cx={p.x} cy={p.y} r={burn ? 6 : 9} fill={burn ? "#fff" : "#8a7a6a"} stroke={burn ? "none" : "#d8cbb8"} strokeWidth={2} />
            </g>
          );
        })}
        {/* 地面（山と町の明かり） */}
        <path
          d={`M 0 ${GROUND} L 120 ${GROUND - 50} L 230 ${GROUND - 10} L 360 ${GROUND - 70} L 470 ${GROUND - 15} L 600 ${GROUND - 40} L 720 ${GROUND - 5} L 860 ${GROUND - 60} L 1080 ${GROUND - 20} L 1080 1000 L 0 1000 Z`}
          fill="#0a0f1c"
        />
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={random(`cl-x${i}`) * 1080} cy={GROUND + 10 + random(`cl-y${i}`) * 50} r={1.5 + random(`cl-r${i}`) * 2} fill="#ffd27a" opacity={0.5 + 0.5 * random(`cl-o${i}`)} />
        ))}
        {/* ぶつかった！ */}
        {since >= 0 ? (
          <g>
            <circle cx={path(1, x0s[0]).x} cy={GROUND} r={interpolate(since, [0, 0.4], [10, 160], { extrapolateRight: "clamp" })} fill="url(#boom)" opacity={interpolate(since, [0, 1.6], [1, 0], { extrapolateRight: "clamp" })} />
            <ellipse cx={path(1, x0s[0]).x} cy={GROUND - 10} rx={interpolate(since, [0, 1.5], [20, 330], { extrapolateRight: "clamp" })} ry={interpolate(since, [0, 1.5], [10, 90], { extrapolateRight: "clamp" })} fill="#b59a7a" opacity={interpolate(since, [0, 0.2, 2.5], [0, 0.6, 0.15], { extrapolateRight: "clamp" })} />
          </g>
        ) : null}
        {/* 説明 */}
        {burn ? (
          <>
            <Label x={300} y={yOf(100) + 60} size={38} color="#fff2a8">空気にぶつかって光る</Label>
            <Label x={300} y={yOf(70) + 60} size={38} color="#ffb38a">ここで燃えつきる</Label>
          </>
        ) : (
          <>
            <Label x={300} y={yOf(100) + 60} size={38} color="#cfd8e6">光らない・燃えない</Label>
            {since >= 0 ? <Label x={540} y={yOf(40) + 70} size={52} color="#ff5a5a">秒速20kmで地面へ！</Label> : null}
          </>
        )}
      </svg>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};
