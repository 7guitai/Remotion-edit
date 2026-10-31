/** #rrggbb を明るく(amount>0)/暗く(amount<0) */
export const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};
