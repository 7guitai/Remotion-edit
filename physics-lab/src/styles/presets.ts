import type { StyleId, VisualStyle } from "./types";

const ROUNDED = "'MPLUS Rounded', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', sans-serif";
const softCard = "0 18px 40px rgba(40,30,20,0.18), 0 4px 10px rgba(40,30,20,0.10)";

/** A: 白いスタジオ（前回のデザイン） */
const studio: VisualStyle = {
  id: "studio",
  label: "A  STUDIO",
  background: "radial-gradient(ellipse at 45% 40%, #f8f6f2 0%, #d9d5ce 100%)",
  font: ROUNDED,
  text: "#2b2e35",
  sub: "#8a8f99",
  accent: "#f09a2a",
  teams: {
    red: { name: "RED", color: "#e3342f" },
    blue: { name: "BLUE", color: "#2563d9" },
    green: { name: "GREEN", color: "#2fae3f" },
    gold: { name: "GOLD", color: "#d9a326" },
  },
  ball: "glossy",
  shadow: { color: "rgba(40,30,20,0.32)", dx: 7, dy: 10, blur: 6 },
  floor: { kind: "disc", center: "#fffdf9", edge: "#e2ddd4", line: "#d8d1c5" },
  spinner: { light: "#fbd9a3", mid: "#f4bd72", dark: "#d38f45", outline: "#c07f3a" },
  pillar: { light: "#e3ecf7", mid: "#9db7d8", dark: "#6e8bb0", outline: "#6e8bb0" },
  rail: { light: "#f4f7fb", mid: "#c8d1dc", dark: "#9aa8b8", outline: "#8e9cad", width: 16 },
  card: { background: "rgba(255,255,255,0.92)", border: "none", shadow: softCard, radius: 44 },
  dropZone: { fill: "#e9e5de", text: "#d6d0c6", floor: "#cfc8bc" },
  vignette: "rgba(40,25,10,0.28)",
  flash: "#ffffff",
};

/** B: らせん階段（参考画像寄り）: 木の段板を放射状に並べた床、金属球、淡いブルーの柱 */
const stairs: VisualStyle = {
  ...studio,
  id: "stairs",
  label: "B  STAIRS",
  background: "radial-gradient(ellipse at 40% 35%, #f2f1ef 0%, #cfcdc9 100%)",
  accent: "#e8892b",
  teams: {
    red: { name: "RED", color: "#d62a24" },
    blue: { name: "BLUE", color: "#1f5fcf" },
    green: { name: "GREEN", color: "#33a83a" },
    gold: { name: "GOLD", color: "#c9a046" },
  },
  ball: "metal",
  shadow: { color: "rgba(30,30,40,0.30)", dx: 9, dy: 12, blur: 7 },
  floor: { kind: "stairs", tread: ["#f6c27e", "#eeb064"], under: "#c9ced6", edge: "#d99a52" },
  spinner: { light: "#eef4fb", mid: "#a9c0dc", dark: "#7591b6", outline: "#6d88ab" },
  pillar: { light: "#eaf1f9", mid: "#a3bcdc", dark: "#6f8db5", outline: "#6987ad" },
  rail: { light: "#ffffff", mid: "#e4e8ee", dark: "#b8c0cc", outline: "#a7b1bf", width: 12 },
  dropZone: { fill: "#e6e4e0", text: "#d2cfc9", floor: "#c4c0b9" },
};

/** C: パステルのおもちゃ: やわらかい色、マットな球 */
const candy: VisualStyle = {
  id: "candy",
  label: "C  CANDY",
  background: "linear-gradient(160deg, #ffe3ec 0%, #e3f4ff 55%, #e2fbef 100%)",
  font: ROUNDED,
  text: "#4a3f63",
  sub: "#a99cc0",
  accent: "#ff6f91",
  teams: {
    red: { name: "PINK", color: "#ff6f91" },
    blue: { name: "SKY", color: "#4fb3ff" },
    green: { name: "MINT", color: "#3fd3a0" },
    gold: { name: "LEMON", color: "#ffc93c" },
  },
  ball: "matte",
  shadow: { color: "rgba(120,90,160,0.22)", dx: 5, dy: 9, blur: 8 },
  floor: { kind: "rings", colors: ["#ffffff", "#fff5f8", "#f4fbff", "#ffffff"] },
  spinner: { light: "#ffd0dc", mid: "#ff9fb8", dark: "#f27a9a", outline: "#ef7395" },
  pillar: { light: "#f3ecff", mid: "#cdb8ff", dark: "#a88ef2", outline: "#a68cf0" },
  rail: { light: "#ffffff", mid: "#ffffff", dark: "#f0e8ff", outline: "#c7b6f5", width: 22 },
  card: { background: "rgba(255,255,255,0.95)", border: "4px solid #f1e7ff", shadow: "0 14px 34px rgba(120,90,160,0.20)", radius: 60 },
  dropZone: { fill: "rgba(255,255,255,0.55)", text: "#eadff7", floor: "#d9c9f5" },
  vignette: "rgba(120,80,160,0.22)",
  flash: "#ffffff",
};

/** D: ダークで高級感: 黒い床にスポットライト、宝石と金属の球、真鍮のバー */
const noir: VisualStyle = {
  id: "noir",
  label: "D  NOIR",
  background: "radial-gradient(ellipse at 50% 42%, #2a2b31 0%, #0b0b0d 70%)",
  font: ROUNDED,
  text: "#f4f1ea",
  sub: "#8b8a86",
  accent: "#e7c06a",
  teams: {
    red: { name: "RUBY", color: "#e0283f" },
    blue: { name: "SAPPHIRE", color: "#2f6df0" },
    green: { name: "EMERALD", color: "#1fbf6a" },
    gold: { name: "GOLD", color: "#e0b04a" },
  },
  ball: "metal",
  shadow: { color: "rgba(0,0,0,0.65)", dx: 6, dy: 10, blur: 8 },
  floor: { kind: "spot", center: "#3a3b42", edge: "#151519", line: "#4a4b53" },
  spinner: { light: "#ffe9b0", mid: "#d6a64b", dark: "#8a6420", outline: "#6e4f18" },
  pillar: { light: "#ffffff", mid: "#b9bdc6", dark: "#5c616c", outline: "#3d414a" },
  rail: { light: "#ffffff", mid: "#b9bdc6", dark: "#4e535e", outline: "#2c2f36", width: 16 },
  card: { background: "rgba(22,22,26,0.82)", border: "2px solid rgba(231,192,106,0.55)", shadow: "0 18px 50px rgba(0,0,0,0.6)", radius: 36 },
  dropZone: { fill: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.07)", floor: "#3a3b42" },
  vignette: "rgba(0,0,0,0.6)",
  flash: "#fff6dd",
};

/** E: コミック調: 太い黒フチ、ベタ塗り、くっきりした影 */
const comic: VisualStyle = {
  id: "comic",
  label: "E  COMIC",
  background: "#ffd23f",
  font: ROUNDED,
  text: "#111111",
  sub: "#5a4a10",
  accent: "#ff3b3b",
  teams: {
    red: { name: "RED", color: "#ff4040" },
    blue: { name: "BLUE", color: "#2f7bff" },
    green: { name: "GREEN", color: "#22c55e" },
    gold: { name: "WHITE", color: "#ffffff" },
  },
  ball: "flat",
  shadow: { color: "#111111", dx: 6, dy: 7, blur: 0 },
  floor: { kind: "plain", fill: "#fff8e6", outline: "#111111" },
  spinner: { light: "#111111", mid: "#111111", dark: "#111111", outline: "#111111" },
  pillar: { light: "#ff8bd0", mid: "#ff5cb8", dark: "#ff5cb8", outline: "#111111" },
  rail: { light: "#111111", mid: "#111111", dark: "#111111", outline: "#111111", width: 16 },
  card: { background: "#ffffff", border: "6px solid #111111", shadow: "10px 12px 0 #111111", radius: 28 },
  dropZone: { fill: "#ffc400", text: "#f0b400", floor: "#111111" },
  vignette: "rgba(255,59,59,0.35)",
  flash: "#ffffff",
};

export const STYLES: Record<StyleId, VisualStyle> = { studio, stairs, candy, noir, comic };
export const STYLE_IDS = Object.keys(STYLES) as StyleId[];
export const DEFAULT_STYLE: StyleId = "studio";
