import React from "react";
import { Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import characters from "./characters.json";
import partsJson from "./parts.json";
import { COMMON } from "./theme";
import { CharacterId, lineAt, TimedLine } from "./timeline";

// 坂本アヒルさんの立ち絵 PSD から書き出したパーツ（scripts/export_psd_parts.py）を重ねて、
// 口パク（音量連動）・まばたき・表情／ポーズの切り替えをする

type CharParts = { width: number; height: number; eyeX: number; eyeY: number; files: Record<string, string> };
type FaceSpec = { arms: string[]; eyes: string[]; brow: string; noBlink?: boolean };
type PsdSpec = {
  base: string[];
  under: string[];
  top: string[];
  mouth: { closed: string; half: string; open: string };
  blink: string[];
  faces: Record<string, FaceSpec>;
};

export const CHARACTERS = characters as unknown as Record<CharacterId, { name: string; speaker: number; color: string; psd: PsdSpec }>;

export type CharacterLayout = { x: number; feetY: number; scale: number; flip: boolean };

// 参考動画と同じく、画面下の左右に小さめの全身で立たせる
export const DEFAULT_LAYOUT: Record<CharacterId, CharacterLayout> = {
  metan: { x: 150, feetY: 1985, scale: 0.4, flip: false },
  zundamon: { x: 935, feetY: 1985, scale: 0.43, flip: true },
};

const BLINK_CYCLE: Record<CharacterId, number> = { metan: 127, zundamon: 104 };

// 口パク：声の大きさで 閉じ／半開き／開き を切り替える
const mouthState = (env: number[] | undefined, f: number): "closed" | "half" | "open" => {
  if (!env || f < 0 || f >= env.length) return "closed";
  const v = Math.max(env[f] ?? 0, (env[f - 1] ?? 0) * 0.7);
  if (v > 0.5) return "open";
  if (v > 0.18) return "half";
  return "closed";
};

export const Character: React.FC<{
  id: CharacterId;
  lines: TimedLine[];
  envelope: number[][];
  layout?: CharacterLayout;
  dimInactive?: number; // 話していないときの明るさ（1 で暗くしない）
}> = ({ id, lines, envelope, layout, dimInactive = 0.82 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const psd = CHARACTERS[id].psd;
  const parts = (partsJson as Record<string, CharParts>)[id];
  const line = lineAt(lines, frame);
  const speaking = line.who === id;

  // 直近の自分のセリフの表情
  const mine = lines.filter((l) => l.who === id && l.from <= frame);
  const last = mine[mine.length - 1];
  const face = psd.faces[last?.face ?? "normal"] ?? psd.faces.normal;

  // 話し手の切り替えをなめらかに
  const prev = lines[line.index - 1];
  const changed = !prev || prev.who !== line.who;
  const t = changed ? spring({ frame: frame - line.from, fps, config: { damping: 16 } }) : 1;
  const active = speaking ? t : prev?.who === id && changed ? 1 - t : 0;

  // セリフ頭のぴょこん＋呼吸
  const hop = speaking ? spring({ frame: frame - line.from, fps, config: { damping: 9, stiffness: 260 } }) : 1;
  const bob = Math.sin(hop * Math.PI) * 16;
  const breathe = Math.sin(frame / 18 + (id === "metan" ? 1.5 : 0)) * 3;

  const mouth = speaking ? mouthState(envelope[line.index], frame - line.from) : "closed";
  const blinking = !face.noBlink && (frame + (id === "metan" ? 40 : 0)) % BLINK_CYCLE[id] < 4;

  const stack = [
    ...psd.base,
    ...face.arms,
    ...psd.under,
    psd.mouth[mouth],
    ...(blinking ? psd.blink : face.eyes),
    face.brow,
    ...psd.top,
  ];

  const { x, feetY, scale, flip } = layout ?? DEFAULT_LAYOUT[id];
  const width = parts.width * scale;
  const height = parts.height * scale;
  const eyeX = parts.eyeX * scale;
  const left = flip ? x - (width - eyeX) : x - eyeX;

  // 感情マーク（セリフの頭で頭上にポンと出て、少しして消える）
  const markT = frame - line.from;
  const markS = spring({ frame: markT - 2, fps, config: { damping: 8, stiffness: 280 } });
  const markOpacity = markT < 0 ? 0 : markT > line.duration - 6 ? 0 : 1;
  const headTop = feetY - height - bob + breathe + parts.eyeY * scale * 0.15;
  const mark = speaking && line.mark ? (
    <div
      style={{
        position: "absolute",
        left: flip ? x - 150 : x + 60,
        top: headTop - 30,
        zIndex: 4,
        opacity: markOpacity,
        transform: `scale(${markS}) rotate(${flip ? -12 : 12}deg)`,
        width: 86,
        height: 86,
        borderRadius: 43,
        background: "#fff",
        boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "NotoSansJP",
        fontWeight: 900,
        fontSize: line.mark === "汗" ? 40 : 56,
        color: line.mark === "!" ? "#ef3a4f" : line.mark === "?" ? "#2f6fdf" : "#f2a400",
      }}
    >
      {line.mark === "汗" ? (
        <svg width={46} height={46} viewBox="0 0 24 24">
          <path d="M12 2C9 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3-7-6-12z" fill="#3aa0d8" />
        </svg>
      ) : (
        line.mark
      )}
    </div>
  ) : null;

  return (
    <>
    {mark}
    <div
      style={{
        position: "absolute",
        left,
        top: feetY - height - bob + breathe,
        width,
        height,
        transform: `scaleX(${flip ? -1 : 1})`,
        filter: `brightness(${dimInactive + active * (1 - dimInactive)}) drop-shadow(0 10px 18px rgba(20,24,40,0.25))`,
        zIndex: 3,
      }}
    >
      {stack.map((p, i) => (
        <Img
          key={`${i}-${p}`}
          src={COMMON(`chars/${id}/${parts.files[p]}`)}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
        />
      ))}
    </div>
    </>
  );
};
