import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, SHADOW } from "./theme";

// 公式ページのスクリーンショット（scripts/capture_page.js で撮影）を、ブラウザ風の枠に入れて表示する。
// focus の要素へゆっくりズームし、枠で強調する。

export type ShotMeta = { url: string; boxes: Record<string, { x: number; y: number; w: number; h: number }> };

const SHOT_ASPECT = 1280 / 860;

export const ShotFrame: React.FC<{
  src: string; // staticFile のパス
  meta: ShotMeta;
  focus?: string;
  width: number;
  height: number;
  zoomAt?: number;
  highlightAt?: number;
  zoomScale?: number; // 強調する要素の幅に対して、どれだけ広く映すか
  color?: string;
  label?: string;
  labelColor?: string;
}> = ({ src, meta, focus, width, height, zoomAt = 10, highlightAt = 18, zoomScale = 1.6, color = "#ef3a4f", label, labelColor = "#5b4336" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const BAR = 52;
  const box = focus ? meta.boxes[focus] : undefined;
  const innerH = height - BAR;
  const aspect = innerH / width;
  let target = { x: 0, y: 0, w: 1 };
  if (box) {
    const w = Math.min(1, Math.max(box.w * zoomScale, 0.45));
    const visH = w * aspect * SHOT_ASPECT;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    target = {
      x: Math.min(Math.max(cx - w / 2, 0), 1 - w),
      y: Math.min(Math.max(cy - visH / 2, 0), Math.max(0, 1 - visH)),
      w,
    };
  }
  const z = spring({ frame: frame - zoomAt, fps, config: { damping: 200, stiffness: 40 } });
  const vx = interpolate(z, [0, 1], [0, target.x]);
  const vy = interpolate(z, [0, 1], [0, target.y]);
  const vw = interpolate(z, [0, 1], [1, target.w]);
  const imgW = width / vw;
  const imgH = imgW / SHOT_ASPECT;
  const hl = spring({ frame: frame - highlightAt, fps, config: { damping: 14, stiffness: 160 } });
  const host = meta.url.replace(/^https?:\/\//, "").split("/")[0];
  return (
    <div style={{ width, borderRadius: 22, overflow: "hidden", background: "#fff", boxShadow: SHADOW, border: "6px solid #fff" }}>
      <div style={{ height: BAR, background: "#f1f2f5", display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: "2px solid #e3e6ee" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            height: 34,
            borderRadius: 17,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 22,
            color: "#5d6373",
          }}
        >
          {host}
        </div>
        {label ? (
          <div style={{ background: labelColor, color: "#fff", fontFamily: FONT, fontWeight: 900, fontSize: 22, padding: "3px 14px 6px", borderRadius: 9 }}>
            {label}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative", width, height: innerH, overflow: "hidden" }}>
        <Img src={src} style={{ position: "absolute", left: -vx * imgW, top: -vy * imgH, width: imgW, height: imgH }} />
        {box ? (
          <div
            style={{
              position: "absolute",
              left: (box.x - vx) * imgW - 12,
              top: (box.y - vy) * imgH - 10,
              width: box.w * imgW + 24,
              height: box.h * imgH + 20,
              border: `6px solid ${color}`,
              borderRadius: 14,
              opacity: hl,
              transform: `scale(${1.08 - hl * 0.08})`,
              boxShadow: `0 0 0 9999px rgba(15,18,28,${0.22 * hl})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
