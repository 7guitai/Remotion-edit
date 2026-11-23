import React from "react";
import { Img, interpolate, OffthreadVideo, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ASSET, C, FONT, SHADOW } from "./theme";

// Orca アプリ風の暗いウィンドウ枠。中に公式デモ動画（または画像）を入れ、ゆっくり寄っていく
export const AppWindow: React.FC<{
  width: number;
  height: number;
  video?: string;
  image?: string;
  startFrom?: number; // 動画の再生開始位置（フレーム）
  zoom?: { x: number; y: number; w: number }; // 最終的に映す範囲（素材に対する割合）
  zoomAt?: number;
  title?: string;
  badge?: string;
}> = ({ width, height, video, image, startFrom = 0, zoom, zoomAt = 15, title = "Orca", badge = "実際の画面" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const BAR = 48;
  const innerH = height - BAR;
  const aspect = image ? 1998 / 1250 : 800 / 500; // 素材の縦横比
  const z = spring({ frame: frame - zoomAt, fps, config: { damping: 200, stiffness: 30 } });
  // 最初は全体を横幅いっぱい（上寄せ）、そこから zoom の範囲へ
  const target = zoom ?? { x: 0, y: 0, w: 1 };
  const vw = interpolate(z, [0, 1], [1, target.w]);
  const vx = interpolate(z, [0, 1], [0, target.x]);
  const vy = interpolate(z, [0, 1], [0, target.y]);
  const mediaW = width / vw;
  const mediaH = mediaW / aspect;
  // 下に余白が出ないように
  const top = Math.min(-vy * mediaH, 0);
  const clampedTop = Math.max(top, innerH - mediaH);

  return (
    <div style={{ width, height, borderRadius: 22, overflow: "hidden", background: "#111418", boxShadow: SHADOW, border: "2px solid rgba(255,255,255,0.6)" }}>
      <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", background: "#1b1f26" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />
        ))}
        <div style={{ marginLeft: 12, flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 24, color: "#aab4c0" }}>{title}</div>
        {badge ? (
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 22,
              color: C.ink,
              background: C.aqua,
              borderRadius: 8,
              padding: "3px 14px 5px",
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative", width, height: innerH, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -vx * mediaW, top: clampedTop, width: mediaW, height: mediaH }}>
          {video ? (
            <OffthreadVideo src={ASSET(`media/${video}.mp4`)} startFrom={startFrom} muted style={{ width: "100%", height: "100%" }} />
          ) : image ? (
            <Img src={ASSET(`media/${image}`)} style={{ width: "100%", height: "100%" }} />
          ) : null}
        </div>
      </div>
    </div>
  );
};
