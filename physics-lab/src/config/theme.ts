/** 明るいスタジオ撮影風（白い床・つやのある球・木の板・淡いブルーの金属）のテーマ */
export const THEME = {
  bgCenter: "#f8f6f2",
  bgEdge: "#d9d5ce",
  floor: "#f3f1ed",
  text: "#2b2e35",
  sub: "#8a8f99",
  card: "rgba(255,255,255,0.92)",
  wood: "#f4bd72",
  woodLight: "#fbd9a3",
  woodDark: "#d38f45",
  steel: "#9db7d8",
  steelLight: "#e3ecf7",
  steelDark: "#6e8bb0",
  rail: "#c8d1dc",
  accent: "#f09a2a",
  shadow: "rgba(40,30,20,0.28)",
  font: "'MPLUS Rounded', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', sans-serif",
} as const;

/** カードの柔らかい影 */
export const cardShadow = "0 18px 40px rgba(40,30,20,0.18), 0 4px 10px rgba(40,30,20,0.10)";

/** #rrggbb を明るく(amount>0)/暗く(amount<0) */
export const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};
