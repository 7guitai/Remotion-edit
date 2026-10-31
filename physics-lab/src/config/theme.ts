export const THEME = {
  bg: "#04010d",
  bg2: "#0d0426",
  cyan: "#00f0ff",
  magenta: "#ff2bd6",
  yellow: "#ffe14d",
  red: "#ff3355",
  white: "#f4f7ff",
  dim: "rgba(255,255,255,0.45)",
  font: "Orbitron, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** ネオンの発光（text-shadow） */
export const neonText = (color: string, strength = 1) =>
  [
    `0 0 ${6 * strength}px ${color}`,
    `0 0 ${18 * strength}px ${color}`,
    `0 0 ${42 * strength}px ${color}`,
  ].join(", ");
