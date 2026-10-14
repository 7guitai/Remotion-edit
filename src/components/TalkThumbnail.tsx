import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { fontFamily } from "../theme";
import { TalkCharacter, TalkFace, TalkWho } from "./TalkCharacter";
import { TALK_COLORS } from "./TalkPage";

// 掛け合い解説（talk スタイル）のサムネイル 1280×720。
// 左に太いふちどり文字の見出し、右下にソラとコムギ、中央にいらすとやの絵
export type TalkThumbnailProps = {
  kicker: string;
  lines: { text: string; color: string }[];
  badge: string;
  image: string;
  faces: Record<TalkWho, TalkFace>;
  bubble: string;
};

const outline = (color: string, w: number) =>
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `${(Math.cos(a) * w).toFixed(1)}px ${(Math.sin(a) * w).toFixed(1)}px 0 ${color}`;
  }).join(", ");

export const TalkThumbnail: React.FC<TalkThumbnailProps> = ({ kicker, lines, badge, image, faces, bubble }) => (
  <AbsoluteFill style={{ fontFamily, background: "#fff6e3", overflow: "hidden" }}>
    <AbsoluteFill
      style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,214,150,0.45) 0 40px, rgba(255,255,255,0) 40px 80px)" }}
    />
    {/* 集中線っぽい放射 */}
    <AbsoluteFill
      style={{
        background: "repeating-conic-gradient(from 0deg at 78% 55%, rgba(255,200,90,0.28) 0deg 6deg, rgba(255,255,255,0) 6deg 14deg)",
      }}
    />
    <div style={{ position: "absolute", left: 36, top: 30, background: "#ff6f61", color: "#fff", fontWeight: 900, fontSize: 34, padding: "6px 26px", borderRadius: 999, boxShadow: "0 5px 0 #c94c40" }}>
      {kicker}
    </div>
    <div style={{ position: "absolute", left: 40, top: 120, display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontWeight: 900, fontSize: i === 0 ? 108 : 132, lineHeight: 1.1, color: l.color, textShadow: `${outline("#fff", 10)}, 0 12px 0 rgba(90,58,42,0.35)`, whiteSpace: "nowrap" }}>
          {l.text}
        </div>
      ))}
    </div>
    <div
      style={{
        position: "absolute",
        left: 48,
        bottom: 46,
        background: "#ffd23a",
        color: "#5a3a2a",
        fontWeight: 900,
        fontSize: 46,
        padding: "10px 30px",
        borderRadius: 20,
        border: "6px solid #5a3a2a",
        transform: "rotate(-3deg)",
      }}
    >
      {badge}
    </div>
    <Img src={staticFile(`illustrations/${image}`)} style={{ position: "absolute", left: 470, top: 410, height: 250, objectFit: "contain", transform: "rotate(-8deg)" }} />
    {/* 吹き出し */}
    <div
      style={{
        position: "absolute",
        right: 40,
        top: 70,
        background: "#fff",
        border: `6px solid ${TALK_COLORS.komugi}`,
        borderRadius: 30,
        padding: "10px 24px",
        fontWeight: 900,
        fontSize: 40,
        color: "#5a3a2a",
        transform: "rotate(4deg)",
      }}
    >
      {bubble}
    </div>
    <div style={{ position: "absolute", right: 250, top: 380 }}>
      <TalkCharacter who="sora" face={faces.sora} talking={false} frame={10} size={330} />
    </div>
    <div style={{ position: "absolute", right: 10, top: 330 }}>
      <TalkCharacter who="komugi" face={faces.komugi} talking={false} frame={10} size={330} />
    </div>
  </AbsoluteFill>
);
