import React from "react";
import { shade } from "../config/theme";
import { TEAMS } from "../physics/teams";
import { useStyle } from "../styles/context";
import type { VisualStyle } from "../styles/types";

const ballStops = (style: VisualStyle, color: string): [string, string][] => {
  switch (style.ball) {
    case "metal":
      return [
        ["0%", shade(color, 0.9)],
        ["14%", shade(color, 0.35)],
        ["42%", color],
        ["74%", shade(color, -0.42)],
        ["90%", shade(color, 0.08)],
        ["100%", shade(color, -0.5)],
      ];
    case "matte":
      return [
        ["0%", shade(color, 0.4)],
        ["60%", color],
        ["100%", shade(color, -0.18)],
      ];
    case "flat":
      return [
        ["0%", color],
        ["100%", color],
      ];
    default:
      return [
        ["0%", shade(color, 0.6)],
        ["28%", shade(color, 0.12)],
        ["70%", color],
        ["100%", shade(color, -0.45)],
      ];
  }
};

/** SVG共通のグラデーション・フィルタ（光源は左上） */
export const Defs: React.FC = () => {
  const style = useStyle();
  const p = style.pillar;
  const s = style.spinner;
  const r = style.rail;
  return (
    <defs>
      {TEAMS.map((t) => (
        <radialGradient key={t.id} id={`ball-${t.id}`} cx="36%" cy="32%" r="68%" fx="30%" fy="26%">
          {ballStops(style, style.teams[t.id].color).map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </radialGradient>
      ))}
      <radialGradient id="pillar" cx="38%" cy="34%" r="70%">
        <stop offset="0%" stopColor={p.light} />
        <stop offset="55%" stopColor={p.mid} />
        <stop offset="100%" stopColor={p.dark} />
      </radialGradient>
      <linearGradient id="spinner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={s.light} />
        <stop offset="45%" stopColor={s.mid} />
        <stop offset="100%" stopColor={s.dark} />
      </linearGradient>
      <linearGradient id="rail" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={r.light} />
        <stop offset="50%" stopColor={r.mid} />
        <stop offset="100%" stopColor={r.dark} />
      </linearGradient>
      <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={style.shadow.blur} />
      </filter>
      <filter id="soft-shadow-lg" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={Math.max(style.shadow.blur * 2.2, 0.01)} />
      </filter>
    </defs>
  );
};

/** 影用の filter 属性（blur=0 の漫画風スタイルではぼかさない） */
export const shadowFilter = (style: VisualStyle, large = false) =>
  style.shadow.blur > 0 ? `url(#${large ? "soft-shadow-lg" : "soft-shadow"})` : undefined;
