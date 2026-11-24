import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CHARACTERS } from "./Character";
import { textWidth } from "./parts";
import { FONT } from "./theme";
import { lineAt, TimedLine } from "./timeline";

// 暗色の角丸枠＋左上に話者名ラベルのテロップ
export const Subtitle: React.FC<{
  lines: TimedLine[];
  top?: number;
  background?: string;
  textColor?: string;
  // 話者名ラベルの形（短編ごとに見た目を変えられる）
  renderName?: (name: string, color: string) => React.ReactNode;
  boxStyle?: React.CSSProperties;
  // { } で囲んだ強調部分の色
  highlight?: string;
}> = ({ lines, top = 1100, background = "rgba(27,30,41,0.94)", textColor = "#fff", renderName, boxStyle, highlight = "#ffd54a" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = lineAt(lines, frame);
  const ch = CHARACTERS[line.who];
  const s = spring({ frame: frame - line.from, fps, config: { damping: 20, stiffness: 260 } });
  const rows = line.text.split("\n");
  const longest = Math.max(...rows.map((r) => textWidth(r.replace(/[{}]/g, ""))));
  const size = Math.min(68, Math.floor(940 / longest));
  return (
    <div style={{ position: "absolute", top, left: 24, width: 1032, zIndex: 5 }}>
      <div
        style={{
          position: "relative",
          background,
          borderRadius: 30,
          padding: "46px 36px 40px",
          boxShadow: "0 16px 40px rgba(10,12,20,0.35)",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          ...boxStyle,
        }}
      >
        <div style={{ position: "absolute", top: -26, left: 26 }}>
          {renderName ? (
            renderName(ch.name, ch.color)
          ) : (
            <div
              style={{
                background: ch.color,
                color: "#fff",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 34,
                padding: "4px 24px 8px",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {ch.name}
            </div>
          )}
        </div>
        <div style={{ opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 10}px)` }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1.32,
                color: textColor,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {renderEmphasis(r, highlight, frame - line.from, fps)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// "{強調}" を色付きの span にする。強調部分はセリフ頭から少し遅れて「ポン」と大きくなる
const renderEmphasis = (row: string, color: string, f: number, fps: number) =>
  row.split(/(\{[^}]*\})/).map((part, i) => {
    if (!part.startsWith("{")) return <React.Fragment key={i}>{part}</React.Fragment>;
    const pop = spring({ frame: f - 4 - i, fps, config: { damping: 9, stiffness: 300 } });
    return (
      <span
        key={i}
        style={{
          color,
          display: "inline-block",
          transform: `scale(${0.8 + pop * 0.2})`,
          background: `linear-gradient(transparent 70%, ${color}33 70%)`,
          padding: "0 2px",
        }}
      >
        {part.slice(1, -1)}
      </span>
    );
  });
