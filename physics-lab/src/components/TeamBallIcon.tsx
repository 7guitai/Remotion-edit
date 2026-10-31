import React from "react";
import { shade } from "../config/theme";
import { useStyle } from "../styles/context";

/** HTML側で使う球のアイコン（スタイルの質感に合わせる） */
export const TeamBallIcon: React.FC<{ color: string; size: number; dim?: boolean }> = ({ color, size, dim = false }) => {
  const style = useStyle();
  const c = dim ? "#9a9a9a" : color;
  let background: string;
  switch (style.ball) {
    case "metal":
      background = `radial-gradient(circle at 32% 28%, #fff 0%, ${shade(c, 0.4)} 12%, ${c} 42%, ${shade(c, -0.45)} 74%, ${shade(c, 0.05)} 90%, ${shade(c, -0.5)})`;
      break;
    case "matte":
      background = `radial-gradient(circle at 34% 30%, ${shade(c, 0.4)}, ${c} 60%, ${shade(c, -0.18)})`;
      break;
    case "flat":
      background = `radial-gradient(circle at 30% 28%, #fff 0 ${size * 0.11}px, ${c} ${size * 0.12}px)`;
      break;
    default:
      background = `radial-gradient(circle at 34% 30%, ${shade(c, 0.65)}, ${shade(c, 0.1)} 30%, ${c} 68%, ${shade(c, -0.45)})`;
  }
  const sh = style.shadow;
  const k = size / 60;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background,
        border: style.ball === "flat" ? `${Math.max(3, size * 0.06)}px solid #111` : undefined,
        boxSizing: "border-box",
        boxShadow: `${sh.dx * k * 0.7}px ${sh.dy * k * 0.7}px ${sh.blur * k}px ${sh.color}`,
        flexShrink: 0,
      }}
    />
  );
};
