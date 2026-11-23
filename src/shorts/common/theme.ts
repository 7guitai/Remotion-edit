import type React from "react";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// 見出しもテロップも Noto Sans JP（Black / Bold）で統一する
export const FONT = "NotoSansJP";

loadFont({ family: FONT, url: staticFile("fonts/NotoSansJP-900.ttf"), weight: "900" });
loadFont({ family: FONT, url: staticFile("fonts/NotoSansJP-700.ttf"), weight: "700" });

// 短編どうしで共有する素材（立ち絵・効果音・ロゴ）
export const COMMON = (p: string) => staticFile(`shorts/common/${p}`);

export const SHADOW = "0 18px 48px rgba(20,24,40,0.18), 0 3px 10px rgba(20,24,40,0.10)";

export const text = (size: number, color: string, weight = 900): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  color,
  lineHeight: 1.25,
});
