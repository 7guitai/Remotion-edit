import type { TeamId } from "../physics/teams";

export type StyleId = "studio" | "stairs" | "candy" | "noir" | "comic";

/** 見た目のパターン。物理・ルールには一切影響しない */
export type VisualStyle = {
  id: StyleId;
  label: string;
  /** 画面全体の背景（CSS background） */
  background: string;
  font: string;
  text: string;
  sub: string;
  accent: string;
  /** チームごとの球の色（チームIDは物理側と共通） */
  teams: Record<TeamId, { name: string; color: string }>;
  /** 球の質感 */
  ball: "glossy" | "metal" | "matte" | "flat";
  /** 影。blur=0 ならくっきりした漫画風の影 */
  shadow: { color: string; dx: number; dy: number; blur: number };
  /** アリーナの床 */
  floor:
    | { kind: "disc"; center: string; edge: string; line: string }
    | { kind: "stairs"; tread: [string, string]; under: string; edge: string }
    | { kind: "rings"; colors: string[] }
    | { kind: "spot"; center: string; edge: string; line: string }
    | { kind: "plain"; fill: string; outline: string };
  /** 回転バー */
  spinner: { light: string; mid: string; dark: string; outline: string };
  /** 中央の柱・バンパー・ゲートの支柱 */
  pillar: { light: string; mid: string; dark: string; outline: string };
  /** 外周の手すり */
  rail: { light: string; mid: string; dark: string; outline: string; width: number };
  /** HUDのカード */
  card: { background: string; border: string; shadow: string; radius: number };
  dropZone: { fill: string; text: string; floor: string };
  /** 残り3個以下の周辺減光 */
  vignette: string;
  flash: string;
};
