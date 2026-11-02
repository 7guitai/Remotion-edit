import React from "react";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../theme";
import { AnimalScene } from "./AnimalScene";

// ロング動画「もし人間が、動物の能力を持っていたら？10選」のサムネイル：
// 背景はシャコのパンチでレンガの壁が吹き飛ぶ瞬間、左に大きな文字
const stroke = (px: number, color = "#000"): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: "stroke fill",
});

export const AnimalThumbnail: React.FC<{ offset: number }> = ({ offset }) => (
  <AbsoluteFill style={{ background: "#9fd0f7" }}>
    <AbsoluteFill style={{ left: 300 }}>
      <AnimalScene mode="shrimp" width={980} height={720} offset={offset} speed={0} bare />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(10,8,30,0.92) 0%, rgba(10,8,30,0.72) 40%, rgba(10,8,30,0) 66%)" }} />
    <div style={{ position: "absolute", left: 44, top: 46 }}>
      <div style={{ display: "inline-block", fontFamily, fontWeight: 900, fontSize: 36, color: "#fff", background: "#ff3b30", padding: "4px 22px", borderRadius: 999 }}>
        物理シミュレーションで検証
      </div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 92, lineHeight: 1.1, color: "#fff", marginTop: 18, ...stroke(10) }}>もし人間が</div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 128, lineHeight: 1.05, color: "#ffe600", ...stroke(13), letterSpacing: "-0.02em" }}>動物の能力</div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 92, lineHeight: 1.1, color: "#fff", ...stroke(10) }}>を持ったら？</div>
      <div style={{ display: "inline-block", marginTop: 18, fontFamily, fontWeight: 900, fontSize: 64, color: "#111", background: "#ffe600", padding: "2px 26px", borderRadius: 16, border: "6px solid #111", transform: "rotate(-3deg)" }}>
        10選
      </div>
    </div>
  </AbsoluteFill>
);
