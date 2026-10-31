import React from "react";
import { shade } from "../config/theme";

/** HTML側で使う、つやのある球のアイコン */
export const TeamBallIcon: React.FC<{ color: string; size: number; dim?: boolean; children?: React.ReactNode }> = ({ color, size, dim = false, children }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: dim
        ? "radial-gradient(circle at 34% 30%, #ffffff, #c9c9c9 35%, #9a9a9a 75%, #6f6f6f)"
        : `radial-gradient(circle at 34% 30%, ${shade(color, 0.65)}, ${shade(color, 0.1)} 30%, ${color} 68%, ${shade(color, -0.45)})`,
      boxShadow: `${size * 0.08}px ${size * 0.12}px ${size * 0.18}px rgba(40,30,20,0.3)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {children}
  </div>
);
