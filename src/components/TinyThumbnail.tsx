import React from "react";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "../theme";
import { PhysicsScene } from "./PhysicsScene";

// ロング動画「もし人間が10cmになったら？」のサムネイル：
// 背景は「10cmの世界」の3D（巨大な500円玉・鉛筆・スマホ）、左に大きな文字
const stroke = (px: number, color = "#000"): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: "stroke fill",
});

export const TinyThumbnail: React.FC<{ offset: number }> = ({ offset }) => (
  <AbsoluteFill style={{ background: "#e9d6b8" }}>
    <AbsoluteFill style={{ left: 220 }}>
      <PhysicsScene kind="tworld" width={1060} height={720} offset={offset} bare camera={{ pos: [-1.0, 1.0, 4.6], look: [-0.25, 1.15, -0.4] }} />
    </AbsoluteFill>
    <AbsoluteFill
      style={{ background: "linear-gradient(90deg, rgba(10,8,30,0.92) 0%, rgba(10,8,30,0.75) 38%, rgba(10,8,30,0) 62%)" }}
    />
    <div style={{ position: "absolute", left: 46, top: 52 }}>
      <div
        style={{
          display: "inline-block",
          fontFamily,
          fontWeight: 900,
          fontSize: 36,
          color: "#fff",
          background: "#ff3b30",
          padding: "4px 22px",
          borderRadius: 999,
        }}
      >
        物理シミュレーションで検証
      </div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 104, lineHeight: 1.1, color: "#fff", marginTop: 16, ...stroke(10) }}>
        もし人間が
      </div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 210, lineHeight: 1, color: "#ffe600", ...stroke(14), letterSpacing: "-0.03em" }}>
        10cm
      </div>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 92, lineHeight: 1.1, color: "#fff", ...stroke(10) }}>
        になったら？
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        right: 30,
        bottom: 28,
        display: "flex",
        gap: 14,
      }}
    >
      {["体重12g", "力17.5倍"].map((t) => (
        <div
          key={t}
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: 40,
            color: "#111",
            background: "#ffe600",
            padding: "4px 18px",
            borderRadius: 12,
            border: "5px solid #111",
          }}
        >
          {t}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
