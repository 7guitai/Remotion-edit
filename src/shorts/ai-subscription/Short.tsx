import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import envelope from "./envelope.json";
import partsJson from "./parts.json";
import { textWidth } from "./parts";
import { SCENES } from "./scenes";
import { ASSET, BGM_VOLUME, C, FONT } from "./theme";
import { CharacterId, SCRIPT, TIMELINE, TimedLine } from "./timeline";

const currentLine = (frame: number): TimedLine => {
  let cur = TIMELINE.lines[0];
  for (const l of TIMELINE.lines) {
    if (l.from <= frame) cur = l;
  }
  return cur;
};

// ---------------- 背景 ----------------

// シーンごとに、中で映している公式ページを大きくぼかして敷く（参考動画と同じ手法）
const sceneShot = (type: string, pick?: string) => {
  if (type === "pick" && pick) return (SCRIPT.picks[pick] as { shot?: string }).shot ?? "google";
  return ({ hook: "chatgpt", pain: "claude", intro: "google", budget: "google", who: "claude", summary: "chatgpt" } as Record<string, string>)[
    type
  ];
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {TIMELINE.scenes.map((s, i) => {
        const fadeIn = interpolate(frame, [s.from, s.from + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const visible = frame >= s.from - 1 && frame < s.end + 12;
        if (!visible) return null;
        const drift = (frame - s.from) * 0.15;
        return (
          <AbsoluteFill key={i} style={{ opacity: i === 0 ? 1 : fadeIn }}>
            <Img
              src={ASSET(`shots/${sceneShot(s.type, s.pick)}.png`)}
              style={{
                position: "absolute",
                left: -400 - drift,
                top: 0,
                height: 1920,
                width: 1920 * (1280 / 860),
                objectFit: "cover",
                filter: "blur(36px) saturate(1.1)",
                opacity: 0.75,
              }}
            />
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(232,234,239,0.55) 0%, rgba(232,234,239,0.25) 45%, rgba(232,234,239,0.6) 100%)" }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- ヘッダー ----------------

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const progress = frame / (durationInFrames - 1);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 118,
          left: 0,
          width: 1080,
          padding: "26px 44px 30px",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 6px 24px rgba(20,24,40,0.10)",
          transform: `translateY(${(1 - s) * -40}px)`,
          opacity: s,
        }}
      >
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 66, color: C.ink, lineHeight: 1.15, whiteSpace: "nowrap" }}>
          いま契約すべきAI<span style={{ color: C.red }}>【目的別3選】</span>
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 14,
            background: C.brown,
            color: C.white,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 30,
            padding: "6px 22px 9px",
            borderRadius: 12,
          }}
        >
          公式料金ページで比較（2026年11月時点）
        </div>
        {/* 進行バー */}
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, height: 6, background: "rgba(0,0,0,0.06)" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: C.red }} />
        </div>
      </div>
    </>
  );
};

// ---------------- キャラクター ----------------

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

// 参考動画と同じく、画面下の左右に小さめの全身で立たせる
const CHAR_LAYOUT: Record<CharacterId, { x: number; flip: boolean; blinkCycle: number; scale: number }> = {
  metan: { x: 150, flip: false, blinkCycle: 127, scale: 0.4 },
  zundamon: { x: 935, flip: true, blinkCycle: 104, scale: 0.43 },
};
// 立ち絵の足元の位置（少し画面外に出す）
const FEET_Y = 1985;

// 口パク：声の大きさで 閉じ／半開き／開き を切り替える
const mouthState = (env: number[] | undefined, f: number): "closed" | "half" | "open" => {
  if (!env || f < 0 || f >= env.length) return "closed";
  const v = Math.max(env[f] ?? 0, (env[f - 1] ?? 0) * 0.7);
  if (v > 0.5) return "open";
  if (v > 0.18) return "half";
  return "closed";
};

const Character: React.FC<{ id: CharacterId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ch = SCRIPT.characters[id];
  const psd = (ch as unknown as { psd: PsdSpec }).psd;
  const parts = (partsJson as Record<string, CharParts>)[id];
  const line = currentLine(frame);
  const speaking = line.who === id;

  // 直近の自分のセリフの表情
  const mine = TIMELINE.lines.filter((l) => l.who === id && l.from <= frame);
  const last = mine[mine.length - 1];
  const face = psd.faces[last?.face ?? "normal"] ?? psd.faces.normal;

  // 話し手の切り替えをなめらかに
  const prev = TIMELINE.lines[line.index - 1];
  const changed = !prev || prev.who !== line.who;
  const t = changed ? spring({ frame: frame - line.from, fps, config: { damping: 16 } }) : 1;
  const active = speaking ? t : prev?.who === id && changed ? 1 - t : 0;

  // セリフ頭のぴょこん
  const hop = speaking ? spring({ frame: frame - line.from, fps, config: { damping: 9, stiffness: 260 } }) : 1;
  const envs = (envelope as number[][])[line.index];
  const bob = Math.sin(hop * Math.PI) * 16;
  const breathe = Math.sin(frame / 18 + (id === "metan" ? 1.5 : 0)) * 3;

  const mouth = speaking ? mouthState(envs, frame - line.from) : "closed";
  const { x, flip, blinkCycle, scale } = CHAR_LAYOUT[id];
  const blinking = !face.noBlink && (frame + (id === "metan" ? 40 : 0)) % blinkCycle < 4;

  const stack = [
    ...psd.base,
    ...face.arms,
    ...psd.under,
    psd.mouth[mouth],
    ...(blinking ? psd.blink : face.eyes),
    face.brow,
    ...psd.top,
  ];

  const width = parts.width * scale;
  const height = parts.height * scale;
  const eyeX = parts.eyeX * scale;
  const left = flip ? x - (width - eyeX) : x - eyeX;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: FEET_Y - height - bob + breathe,
        width,
        height,
        transform: `scaleX(${flip ? -1 : 1})`,
        filter: `brightness(${0.82 + active * 0.18}) drop-shadow(0 10px 18px rgba(20,24,40,0.25))`,
        zIndex: 3,
      }}
    >
      {stack.map((p, i) => (
        <Img
          key={`${i}-${p}`}
          src={ASSET(`chars/${id}/${parts.files[p]}`)}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
        />
      ))}
    </div>
  );
};

// ---------------- テロップ ----------------

const Subtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = currentLine(frame);
  const ch = SCRIPT.characters[line.who];
  const s = spring({ frame: frame - line.from, fps, config: { damping: 20, stiffness: 260 } });
  const rows = line.text.split("\n");
  const longest = Math.max(...rows.map(textWidth));
  const size = Math.min(68, Math.floor(940 / longest));
  return (
    <div style={{ position: "absolute", top: 1100, left: 24, width: 1032, zIndex: 5 }}>
      <div
        style={{
          position: "relative",
          background: C.dark,
          borderRadius: 30,
          padding: "46px 36px 40px",
          boxShadow: "0 16px 40px rgba(10,12,20,0.35)",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -26,
            left: 26,
            background: ch.color,
            color: C.white,
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
        <div style={{ opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 10}px)` }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1.32,
                color: C.white,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------- 全体 ----------------

export const AiSubscriptionShort: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const bgmVolume = (f: number) =>
    interpolate(f, [0, 10, durationInFrames - 40, durationInFrames], [0, BGM_VOLUME, BGM_VOLUME, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Background />
      {TIMELINE.scenes.map((scene, i) => {
        const Scene = SCENES[scene.type];
        return (
          <Sequence key={i} from={scene.from} durationInFrames={scene.end - scene.from} layout="none">
            <Scene scene={scene} />
          </Sequence>
        );
      })}
      <Header />
      <Subtitle />
      <Character id="metan" />
      <Character id="zundamon" />

      {TIMELINE.lines.map((l) => (
        <Sequence key={l.index} from={l.from} durationInFrames={l.duration + 6} layout="none">
          <Audio src={ASSET(`voice/${String(l.index).padStart(3, "0")}.wav`)} />
        </Sequence>
      ))}
      <Audio src={staticFile(`bgm/${SCRIPT.bgm.file}`)} volume={bgmVolume} loop />
    </AbsoluteFill>
  );
};
