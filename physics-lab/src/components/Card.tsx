import React from "react";
import { useStyle } from "../styles/context";

/** スタイルに合わせたHUDカード */
export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style: extra, children }) => {
  const s = useStyle();
  return (
    <div style={{ background: s.card.background, border: s.card.border, boxShadow: s.card.shadow, borderRadius: s.card.radius, fontFamily: s.font, color: s.text, ...extra }}>
      {children}
    </div>
  );
};
