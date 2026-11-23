import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Pill } from "../common/parts";
import shots from "./shots.json";
import { ASSET, C, FONT, SHADOW } from "./theme";

export { AppIcon, Logo, Pill, Sfx, textWidth, useRise, useSpring } from "../common/parts";

export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 28, boxShadow: SHADOW, ...style }}>{children}</div>
);

// ---- 公式ページのスクリーンショット（枠付き・ズーム・強調枠） ----

type Box = { x: number; y: number; w: number; h: number };
const SHOT_ASPECT = 1280 / 860;

export const ShotFrame: React.FC<{
  shot: "chatgpt" | "claude" | "google";
  focus?: string;
  width: number;
  height: number;
  zoomAt?: number; // ズームを始めるフレーム
  highlightAt?: number;
  color?: string;
  label?: string;
}> = ({ shot, focus, width, height, zoomAt = 10, highlightAt = 18, color = C.red, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const meta = (shots as Record<string, { url: string; boxes: Record<string, Box> }>)[shot];
  const box = focus ? meta.boxes[focus] : undefined;

  // 表示範囲（画像に対する割合）。最初は横幅いっぱい → 強調するカードへ寄る
  const aspect = height / width; // 枠の縦横比
  const fullView = { x: 0, y: 0, w: 1 };
  let target = fullView;
  if (box) {
    const w = Math.min(1, box.w * 2.5);
    const visH = w * aspect * SHOT_ASPECT; // 表示できる高さ（画像比）
    const cx = box.x + box.w / 2;
    const x = Math.min(Math.max(cx - w / 2, 0), 1 - w);
    // カードの上端が少し下に見える位置
    const y = Math.min(Math.max(box.y - visH * 0.08, 0), Math.max(0, 1 - visH));
    target = { x, y, w };
  }
  const z = spring({ frame: frame - zoomAt, fps, config: { damping: 200, stiffness: 40 } });
  const view = {
    x: interpolate(z, [0, 1], [fullView.x, target.x]),
    y: interpolate(z, [0, 1], [fullView.y, target.y]),
    w: interpolate(z, [0, 1], [fullView.w, target.w]),
  };
  const imgW = width / view.w;
  const imgH = imgW / SHOT_ASPECT;
  const hl = spring({ frame: frame - highlightAt, fps, config: { damping: 14, stiffness: 160 } });
  const host = meta.url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <div
      style={{
        width,
        borderRadius: 22,
        overflow: "hidden",
        background: C.white,
        boxShadow: SHADOW,
        border: `6px solid ${C.white}`,
      }}
    >
      {/* ブラウザ風のアドレスバー */}
      <div
        style={{
          height: 52,
          background: "#f1f2f5",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            height: 34,
            borderRadius: 17,
            background: C.white,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 22,
            color: C.sub,
          }}
        >
          {host}
        </div>
        {label ? (
          <Pill bg={C.brown} size={22}>
            {label}
          </Pill>
        ) : null}
      </div>
      <div style={{ position: "relative", width, height: height - 52, overflow: "hidden" }}>
        <Img
          src={ASSET(`shots/${shot}.png`)}
          style={{ position: "absolute", left: -view.x * imgW, top: -view.y * imgH, width: imgW, height: imgH }}
        />
        {box ? (
          <div
            style={{
              position: "absolute",
              left: (box.x - view.x) * imgW - 6,
              top: (box.y - view.y) * imgH - 6,
              width: box.w * imgW + 12,
              height: Math.min(box.h * imgH + 12, height),
              border: `7px solid ${color}`,
              borderRadius: 18,
              opacity: hl,
              transform: `scale(${1.06 - hl * 0.06})`,
              boxShadow: `0 0 0 9999px rgba(15,18,28,${0.28 * hl})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
