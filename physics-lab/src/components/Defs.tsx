import React from "react";
import { THEME, shade } from "../config/theme";
import { TEAMS } from "../physics/teams";

/** SVG共通のグラデーション・フィルタ（光源は左上） */
export const Defs: React.FC = () => (
  <defs>
    {TEAMS.map((t) => (
      <radialGradient key={t.id} id={`ball-${t.id}`} cx="36%" cy="32%" r="68%" fx="30%" fy="26%">
        <stop offset="0%" stopColor={shade(t.color, t.id === "gold" ? 0.75 : 0.6)} />
        <stop offset="28%" stopColor={shade(t.color, 0.12)} />
        <stop offset="70%" stopColor={t.color} />
        <stop offset="100%" stopColor={shade(t.color, -0.45)} />
      </radialGradient>
    ))}
    <radialGradient id="pillar" cx="38%" cy="34%" r="70%">
      <stop offset="0%" stopColor={THEME.steelLight} />
      <stop offset="55%" stopColor={THEME.steel} />
      <stop offset="100%" stopColor={THEME.steelDark} />
    </radialGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={THEME.woodLight} />
      <stop offset="45%" stopColor={THEME.wood} />
      <stop offset="100%" stopColor={THEME.woodDark} />
    </linearGradient>
    <linearGradient id="rail" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#f4f7fb" />
      <stop offset="50%" stopColor={THEME.rail} />
      <stop offset="100%" stopColor="#9aa8b8" />
    </linearGradient>
    <radialGradient id="arena-floor" cx="45%" cy="40%" r="65%">
      <stop offset="0%" stopColor="#fffdf9" />
      <stop offset="80%" stopColor="#f1ede6" />
      <stop offset="100%" stopColor="#e2ddd4" />
    </radialGradient>
    <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
    <filter id="soft-shadow-lg" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
  </defs>
);

/** 影のオフセット（光源が左上なので右下に落ちる） */
export const SHADOW = { dx: 7, dy: 10 } as const;
