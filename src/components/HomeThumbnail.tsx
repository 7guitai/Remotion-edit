import React from "react";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../theme";
import { HomeScene } from "./HomeScene";

// ロング動画「家の中の事故 物理エンジンで検証10選」のサムネイル：
// 背景は地震でタンスが倒れる瞬間（左：固定なし／右：L字金具）、左に大きな文字
const stroke = (px: number, color = "#000"): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: "stroke fill",
});

export const HomeThumbnail: React.FC<{ offset: number }> = ({ offset }) => (
  <AbsoluteFill style={{ background: "#f3ead9" }}>
    <AbsoluteFill style={{ left: 380 }}>
      <HomeScene mode="furniture" width={950} height={720} offset={offset} speed={0} bare only={0} />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(10,8,30,0.92) 0%, rgba(10,8,30,0.7) 34%, rgba(10,8,30,0) 52%)" }} />
    <div style={{ position: "absolute", left: 44, top: 50 }}>
      <div style={{ display: "inline-block", fontFamily, fontWeight: 900, fontSize: 36, color: "#fff", background: "#ff3b30", padding: "4px 22px", borderRadius: 999 }}>
        物理エンジンで検証
      </div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 96, lineHeight: 1.1, color: "#fff", marginTop: 18, ...stroke(10) }}>家の中の</div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 150, lineHeight: 1.05, color: "#ffe600", ...stroke(13), letterSpacing: "-0.02em" }}>事故</div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 72, lineHeight: 1.15, color: "#fff", ...stroke(9) }}>防げるのはどっち？</div>
      <div style={{ display: "inline-block", marginTop: 18, fontFamily, fontWeight: 900, fontSize: 64, color: "#111", background: "#ffe600", padding: "2px 26px", borderRadius: 16, border: "6px solid #111", transform: "rotate(-3deg)" }}>
        10選
      </div>
    </div>
  </AbsoluteFill>
);
