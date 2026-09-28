import React from "react";
import { useLayout } from "../layout";
import { fontFamily, useAccent } from "../theme";

// ショートの上部に出し続ける動画タイトル（途中から見た人にも何の動画か分かるように）
export const TitleBand: React.FC<{ title: string }> = ({ title }) => {
  const layout = useLayout();
  const { accent } = useAccent();
  if (!layout.titleBand) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: layout.titleBand.top,
        height: layout.titleBand.height,
        left: 60,
        right: 60,
        borderRadius: 28,
        background: accent,
        color: "#ffffff",
        fontFamily,
        fontWeight: 800,
        fontSize: 64,
        letterSpacing: "0.06em",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {title}
    </div>
  );
};
