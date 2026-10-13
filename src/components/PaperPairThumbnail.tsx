import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { minchoFamily } from "../theme";
import { WA, WashiBackground } from "./PaperPage";

// 「論文で読み解く心理学」2人の回のサムネイル 1280×720（和モダン）。
// 左に大きな明朝の見出し、右に いらすとや の2人と心の声。2人の間は「届かない」点線のハート
export type PaperPairThumbnailProps = {
  kicker: string;
  lines: string[];
  badge: string;
  left: { image: string; thought: string; color: string };
  right: { image: string; thought: string; color: string };
};

const Bubble: React.FC<{ text: string; color: string; style: React.CSSProperties }> = ({ text, color, style }) => (
  <div
    style={{
      position: "absolute",
      background: "#fff",
      border: `4px solid ${color}`,
      borderRadius: 40,
      padding: "12px 22px",
      fontFamily: minchoFamily,
      fontWeight: 800,
      fontSize: 30,
      lineHeight: 1.35,
      color: WA.sumi,
      whiteSpace: "pre-line",
      textAlign: "center",
      boxShadow: "0 8px 18px rgba(60,40,10,0.18)",
      ...style,
    }}
  >
    {text}
  </div>
);

export const PaperPairThumbnail: React.FC<PaperPairThumbnailProps> = ({ kicker, lines, badge, left, right }) => {
  const stroke = "0 0 8px #fffaf0, 0 0 8px #fffaf0, 0 0 3px #fffaf0";
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "0 0" }}>
        <WashiBackground />
      </div>
      {/* 2人のうしろの淡い円 */}
      <div style={{ position: "absolute", left: 660, top: 250, width: 300, height: 300, borderRadius: "50%", background: "rgba(47,93,138,0.13)" }} />
      <div style={{ position: "absolute", left: 930, top: 250, width: 300, height: 300, borderRadius: "50%", background: "rgba(208,96,122,0.15)" }} />
      {/* 届かない気持ち：点線のハートが2つに割れている */}
      <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(945,300)">
          <path d="M0 18 C -8 -6, -44 -6, -44 20 C -44 44, -12 60, 0 76 Z" fill="none" stroke={WA.shu} strokeWidth={5} strokeDasharray="9 7" transform="translate(-8,0) rotate(-8)" />
          <path d="M0 18 C 8 -6, 44 -6, 44 20 C 44 44, 12 60, 0 76 Z" fill="none" stroke={WA.shu} strokeWidth={5} strokeDasharray="9 7" transform="translate(8,0) rotate(8)" />
        </g>
      </svg>
      <Img src={staticFile(`illustrations/${left.image}`)} style={{ position: "absolute", left: 670, top: 300, height: 380, objectFit: "contain" }} />
      <Img src={staticFile(`illustrations/${right.image}`)} style={{ position: "absolute", left: 960, top: 300, height: 380, objectFit: "contain" }} />
      <Bubble text={left.thought} color={left.color} style={{ left: 640, top: 150 }} />
      <Bubble text={right.thought} color={right.color} style={{ right: 40, top: 150 }} />
      {/* 見出し */}
      <div style={{ position: "absolute", left: 60, top: 56, width: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 3, background: WA.kin }} />
          <div style={{ fontFamily: minchoFamily, fontWeight: 800, fontSize: 32, color: WA.kin, letterSpacing: 4 }}>{kicker}</div>
        </div>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: minchoFamily,
              fontWeight: 800,
              fontSize: i === lines.length - 1 ? 100 : 82,
              lineHeight: 1.22,
              color: i === lines.length - 1 ? WA.shu : WA.ai,
              marginTop: i === 0 ? 18 : 0,
              textShadow: stroke,
              whiteSpace: "nowrap",
            }}
          >
            {l}
          </div>
        ))}
        <div
          style={{
            display: "inline-block",
            marginTop: 26,
            padding: "8px 26px",
            border: `4px solid ${WA.shu}`,
            color: WA.shu,
            background: "rgba(255,250,240,0.9)",
            fontFamily: minchoFamily,
            fontWeight: 800,
            fontSize: 40,
            transform: "rotate(-3deg)",
          }}
        >
          {badge}
        </div>
      </div>
    </AbsoluteFill>
  );
};
