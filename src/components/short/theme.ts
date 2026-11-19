// 縦型ショート（1080×1920）の配色と配置
// YouTube Shorts の UI（右側のボタン・下部の説明欄）に重ならないよう、要素は上〜中央に寄せる
export const SHORT = {
  width: 1080,
  height: 1920,
  side: 56,
  headerTop: 70,
  cardTop: 300,
  cardHeight: 940,
  captionTop: 1290,
  citeTop: 1600,

  background: "#eef3f9",
  card: "#ffffff",
  panel: "#f2f5fa",
  text: "#24303f",
  sub: "#5b6878",
  note: "#8a95a3",
  accent: "#2f6fdd",
  zunda: "#6dbb4c",
  good: "#2fa36b",
  bad: "#e0524d",
  neutral: "#aab4c2",
};

export type Tone = "good" | "bad" | "neutral";

export const toneColor = (tone?: Tone) =>
  tone === "good" ? SHORT.good : tone === "bad" ? SHORT.bad : tone === "neutral" ? SHORT.neutral : SHORT.accent;
