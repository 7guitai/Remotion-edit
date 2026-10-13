import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { fontFamily } from "../theme";

// 寝落ち雑学（relax）のサムネイル 1280×720。左に白地の大きな文字、右に大きな写真、下に小さな写真を並べる
export type RelaxThumbnailProps = {
  kicker: string;
  title: string;
  minutes: string;
  sub: string;
  main: string;
  strip: string[];
};

export const RelaxThumbnail: React.FC<RelaxThumbnailProps> = ({ kicker, title, minutes, sub, main, strip }) => {
  const stroke = "0 0 10px #fff, 0 0 10px #fff, 0 0 4px #fff";
  return (
    <AbsoluteFill style={{ background: "#fbf8f2", fontFamily }}>
      {/* 右の大きな写真（左端を白にぼかしてつなぐ） */}
      <div style={{ position: "absolute", right: 0, top: 0, width: 760, height: 540, overflow: "hidden" }}>
        <Img src={staticFile(`photos/${main}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #fbf8f2 0%, rgba(251,248,242,0) 38%)" }} />
      </div>
      {/* 下の写真の帯 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, display: "flex", gap: 6, background: "#fbf8f2", paddingTop: 6 }}>
        {strip.map((p) => (
          <Img key={p} src={staticFile(`photos/${p}`)} style={{ flex: 1, height: "100%", objectFit: "cover", minWidth: 0 }} />
        ))}
      </div>
      {/* 文字 */}
      <div style={{ position: "absolute", left: 50, top: 40, width: 640 }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: "#6b5a3e", textShadow: stroke }}>{kicker}</div>
        <div style={{ fontSize: 132, fontWeight: 900, lineHeight: 1.08, color: "#1f2a44", whiteSpace: "pre-line", marginTop: 6, textShadow: stroke }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 18 }}>
          <div style={{ background: "#1f2a44", color: "#ffe9a8", fontSize: 58, fontWeight: 900, padding: "4px 26px", borderRadius: 16 }}>{minutes}</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "#1f2a44", lineHeight: 1.25, whiteSpace: "pre-line", textShadow: stroke }}>{sub}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
