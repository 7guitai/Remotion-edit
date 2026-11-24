import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

// シーンの切り替わりに、斜めの帯がサッと横切るワイプ（2色）。各シーンの先頭で 14 フレーム
export const SceneWipes: React.FC<{ starts: number[]; colors: [string, string] }> = ({ starts, colors }) => {
  const frame = useCurrentFrame();
  const s = starts.find((st) => st > 0 && frame >= st - 7 && frame < st + 7);
  if (s === undefined) return null;
  const t = interpolate(frame, [s - 7, s + 7], [0, 1]);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 8, pointerEvents: "none" }}>
      {colors.map((c, i) => {
        const x = interpolate(t, [0, 1], [-1600 - i * 160, 1400 - i * 160]);
        return (
          <div
            key={c}
            style={{
              position: "absolute",
              top: -400,
              left: x,
              width: 420 - i * 140,
              height: 2800,
              background: c,
              transform: "rotate(18deg)",
              opacity: 0.92,
            }}
          />
        );
      })}
    </div>
  );
};
