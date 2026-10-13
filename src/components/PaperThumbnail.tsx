import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { minchoFamily } from "../theme";
import { WA, WashiBackground } from "./PaperPage";

// 「論文で読み解く心理学」のサムネイル 1280×720（和モダン）。
// 左に大きな明朝の見出し（最後の行は朱）、右に いらすとや の人物と、上から当たるスポットライト
export type PaperThumbnailProps = {
  kicker: string;
  lines: string[];
  badge: string;
  person: string;
  thought?: string;
};

export const PaperThumbnail: React.FC<PaperThumbnailProps> = ({ kicker, lines, badge, person, thought }) => {
  const stroke = "0 0 8px #fffaf0, 0 0 8px #fffaf0, 0 0 3px #fffaf0";
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 和紙の地（1920×1080 を縮めて使う） */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "0 0" }}>
        <WashiBackground />
      </div>
      {/* スポットライト（上から人物に当たる光） */}
      <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3c4" stopOpacity="0.15" />
            <stop offset="1" stopColor="#ffe08a" stopOpacity="0.75" />
          </linearGradient>
          <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe08a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon points="960,0 1010,0 1210,640 760,640" fill="url(#beam)" />
        <ellipse cx={985} cy={640} rx={250} ry={50} fill="url(#pool)" />
      </svg>
      <Img src={staticFile(`illustrations/${person}`)} style={{ position: "absolute", left: 830, top: 250, height: 400, objectFit: "contain" }} />
      {thought ? (
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 70,
            background: "#fff",
            border: `4px solid ${WA.ai2}`,
            borderRadius: 50,
            padding: "14px 30px",
            fontFamily: minchoFamily,
            fontWeight: 800,
            fontSize: 38,
            color: WA.sumi,
            lineHeight: 1.35,
            whiteSpace: "pre-line",
            textAlign: "center",
            boxShadow: "0 8px 20px rgba(60,40,10,0.2)",
          }}
        >
          {thought}
        </div>
      ) : null}
      {/* 文字 */}
      <div style={{ position: "absolute", left: 64, top: 60, width: 760 }}>
        <div style={{ display: "inline-block", fontFamily: minchoFamily, fontWeight: 800, fontSize: 36, color: "#fffaf0", background: WA.ai, padding: "6px 22px", letterSpacing: 4 }}>{kicker}</div>
        {lines.map((t, i) => (
          <div
            key={i}
            style={{
              fontFamily: minchoFamily,
              fontWeight: 800,
              fontSize: i === lines.length - 1 ? 132 : 92,
              lineHeight: 1.15,
              marginTop: i === 0 ? 26 : 6,
              color: i === lines.length - 1 ? WA.shu : WA.ai,
              textShadow: stroke,
              whiteSpace: "nowrap",
            }}
          >
            {t}
          </div>
        ))}
        <div
          style={{
            display: "inline-block",
            marginTop: 30,
            fontFamily: minchoFamily,
            fontWeight: 800,
            fontSize: 44,
            color: WA.shu,
            border: `5px solid ${WA.shu}`,
            borderRadius: 8,
            padding: "4px 22px",
            transform: "rotate(-3deg)",
            background: "rgba(255,250,240,0.85)",
          }}
        >
          {badge}
        </div>
      </div>
    </AbsoluteFill>
  );
};
