import React from "react";
import { AbsoluteFill, random } from "remotion";
import { fontFamily } from "../theme";
import { Globe } from "./Globe";

// ロング動画「地球の“もしも”10選」のサムネイル：左に大きな文字、右に輪のある「海がなくなった地球」
export const WhatIfThumbnail: React.FC<{
  kicker: string;
  title: string[];
  big: string;
  badge: string;
}> = ({ kicker, title, big, badge }) => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle at 70% 45%, #22205a 0%, #0a0a24 55%, #000 100%)",
    }}
  >
    {Array.from({ length: 120 }, (_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${random(`tx${i}`) * 100}%`,
          top: `${random(`ty${i}`) * 100}%`,
          width: 1 + random(`tr${i}`) * 2.5,
          height: 1 + random(`tr${i}`) * 2.5,
          borderRadius: "50%",
          background: "#fff",
          opacity: 0.4 + random(`to${i}`) * 0.5,
        }}
      />
    ))}
    <AbsoluteFill style={{ left: 360 }}>
      <Globe texture="earth_dry" rings size={0.68} speed={0} tilt={-18} width={920} height={720} />
    </AbsoluteFill>
    <div style={{ position: "absolute", left: 50, top: 60, width: 640 }}>
      <div
        style={{
          display: "inline-block",
          fontFamily,
          fontWeight: 900,
          fontSize: 40,
          color: "#fff",
          background: "#ff3b30",
          padding: "4px 22px",
          borderRadius: 999,
        }}
      >
        {kicker}
      </div>
      {title.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: 112,
            lineHeight: 1.08,
            color: i === 0 ? "#fff" : "#ffe600",
            WebkitTextStroke: "10px #000",
            paintOrder: "stroke fill",
            textShadow: "0 8px 0 rgba(0,0,0,0.6)",
            whiteSpace: "nowrap",
            marginTop: i === 0 ? 14 : 0,
          }}
        >
          {line}
        </div>
      ))}
      <div
        style={{
          fontFamily,
          fontWeight: 900,
          fontSize: 230,
          lineHeight: 1,
          color: "#ff2d2d",
          WebkitTextStroke: "14px #fff",
          paintOrder: "stroke fill",
          textShadow: "0 10px 0 rgba(0,0,0,0.7)",
          letterSpacing: "-0.03em",
        }}
      >
        {big}
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        right: 34,
        bottom: 30,
        fontFamily,
        fontWeight: 900,
        fontSize: 34,
        color: "#111",
        background: "#ffe600",
        padding: "6px 20px",
        borderRadius: 12,
        border: "5px solid #111",
      }}
    >
      {badge}
    </div>
  </AbsoluteFill>
);
