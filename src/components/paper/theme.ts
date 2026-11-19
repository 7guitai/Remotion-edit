import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// 紙面・レポート風（Editorial Paper）の縦型ショート
// 引き算のデザイン: 枠・丸角の入れ子・影・グラデーション・絵文字は使わず、
// 文字・数字・1px の罫線・単色の棒グラフだけで組む。

export const serif = "NotoSerifJP";
export const sans = "NotoSansJP";

loadFont({ family: serif, url: staticFile("fonts/NotoSerifJP-Bold.ttf"), weight: "700" });
loadFont({ family: sans, url: staticFile("fonts/NotoSansJP-Bold.ttf"), weight: "700" });
loadFont({ family: sans, url: staticFile("fonts/NotoSansJP-Medium.ttf"), weight: "500" });

export const PAPER = {
  // 色
  paper: "#F7F6F2", // 生成り白
  ink: "#1C1C1C", // チャコールインク
  muted: "#6B6B6B", // 補助テキスト・注記・出典
  rule: "#D6D3CD", // 罫線（ヘアライン）
  accent: "#1E5631", // 強調（深緑）: 主役・ランキングの強調だけ
  alert: "#9B2C2C", // 警告（臙脂）: 注意点のカットだけ
  bar: "#D1CEC7", // 強調しない棒グラフ

  // 配置（1080×1920）。右170pxは Shorts の UI アイコン用に空ける
  left: 68,
  right: 170,
  width: 1080 - 68 - 170,
  headerTop: 100,
  mainTop: 290,
  mainBottom: 1280,
  citeTop: 1238,
  captionTop: 1310,
  captionBottom: 1510,
  spriteTop: 1520,
};

export const toneInk = (tone?: "good" | "bad" | "neutral") =>
  tone === "good" ? PAPER.accent : tone === "bad" ? PAPER.alert : PAPER.ink;
