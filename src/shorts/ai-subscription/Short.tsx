import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  interpolateColors,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import envelope from "./envelope.json";
import { Outlined, textWidth } from "./parts";
import { SCENES } from "./scenes";
import { ASSET, BGM_VOLUME, BODY_FONT, C, HEAD_FONT } from "./theme";
import { CharacterId, SCRIPT, TIMELINE, TimedLine } from "./timeline";

// シーンごとの差し色（背景のグラデーションに使う）
const sceneAccent = (type: string, pick?: string) => {
  if (type === "pick" && pick) return SCRIPT.picks[pick].color;
  return (
    { hook: "#7a5cff", pain: "#ff4d6d", intro: "#ffb020", budget: "#4f7ef0", who: "#3fae5a", summary: "#ffb020" } as Record<
      string,
      string
    >
  )[type];
};

const currentLine = (frame: number): TimedLine => {
  const { lines } = TIMELINE;
  let cur = lines[0];
  for (const l of lines) {
    if (l.from <= frame) cur = l;
  }
  return cur;
};

// ---------------- 背景 ----------------

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { scenes } = TIMELINE;
  const stops = scenes.map((s) => s.from);
  const colors = scenes.map((s) => sceneAccent(s.type, s.pick));
  const accent =
    stops.length > 1
      ? interpolateColors(
          frame,
          stops.flatMap((s, i) => (i === 0 ? [s] : [s - 1, s + 8])),
          colors.flatMap((c, i) => (i === 0 ? [c] : [colors[i - 1], c])),
        )
      : colors[0];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, ${accent}aa 0%, ${accent}33 38%, transparent 70%), linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 60%, #070a1e 100%)`,
        }}
      />
      {/* ゆっくり流れるグリッド */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.06) 2px, transparent 2px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `0px ${(frame * 1.2) % 90}px`,
          maskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 70%, transparent 100%)",
        }}
      />
      {/* 回る光の輪 */}
      <div
        style={{
          position: "absolute",
          left: 540 - 520,
          top: 700 - 520,
          width: 1040,
          height: 1040,
          borderRadius: "50%",
          background: `conic-gradient(from ${frame * 0.8}deg, transparent 0deg, ${accent}55 40deg, transparent 90deg, transparent 180deg, ${accent}44 220deg, transparent 270deg)`,
          filter: "blur(30px)",
        }}
      />
      {/* 浮かぶ粒 */}
      {new Array(18).fill(0).map((_, i) => {
        const x = (i * 197) % 1080;
        const speed = 0.6 + ((i * 37) % 10) / 10;
        const y = 1920 - ((frame * speed * 2 + i * 233) % 2100);
        const r = 4 + ((i * 13) % 8);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r,
              height: r,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.35)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- ヘッダーと進行バー ----------------

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12 } });
  const progress = frame / (durationInFrames - 1);
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 12, background: "rgba(255,255,255,0.15)" }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${C.yellow}, #ff8a3d)`,
            boxShadow: `0 0 16px ${C.yellow}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 0,
          width: 1080,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${(1 - s) * -200}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            background: "rgba(7,10,30,0.72)",
            border: `4px solid ${C.yellow}`,
            borderRadius: 30,
            padding: "14px 36px 18px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontFamily: HEAD_FONT, fontSize: 62, color: C.white }}>
            いま契約すべき<span style={{ color: C.yellow }}>AI</span>
          </span>
        </div>
      </div>
    </>
  );
};

// ---------------- キャラクター ----------------

// 画像ごとの「頭の中心」の横位置（0〜1）。立ち絵の頭をそろえるために使う
const HEAD_X: Record<string, number> = {
  zunmon030: 0.4,
  zunmon031: 0.43,
  zunmon033: 0.44,
  met007: 0.55,
  met011: 0.5,
};
const IMG_ASPECT: Record<string, number> = {
  zunmon030: 913 / 2400,
  zunmon031: 943 / 2400,
  zunmon033: 966 / 2400,
  met007: 1206 / 2400,
  met011: 963 / 2400,
};

const CHAR_LAYOUT: Record<CharacterId, { x: number; flip: boolean }> = {
  metan: { x: 250, flip: false },
  zundamon: { x: 835, flip: true },
};

const Character: React.FC<{ id: CharacterId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ch = SCRIPT.characters[id];
  const line = currentLine(frame);
  const speaking = line.who === id;

  // 直近の自分のセリフの表情
  const mine = TIMELINE.lines.filter((l) => l.who === id && l.from <= frame);
  const last = mine[mine.length - 1];
  const face = ch.images[last?.face ?? "normal"] ?? ch.images.normal;

  // 話し手の切り替えをなめらかに
  const prev = TIMELINE.lines[line.index - 1];
  const changed = !prev || prev.who !== line.who;
  const t = changed ? spring({ frame: frame - line.from, fps, config: { damping: 16 } }) : 1;
  const active = speaking ? t : prev?.who === id && changed ? 1 - t : 0;

  // セリフ頭のぴょこん＋声の大きさで上下
  const hop = speaking ? spring({ frame: frame - line.from, fps, config: { damping: 8, stiffness: 260 } }) : 1;
  const env = speaking ? ((envelope as number[][])[line.index]?.[frame - line.from] ?? 0) : 0;
  const bob = Math.sin(hop * Math.PI) * 26 + env * 10;
  const breathe = Math.sin(frame / 18 + (id === "metan" ? 1.5 : 0)) * 4;

  const height = 1560;
  const width = height * (IMG_ASPECT[face] ?? 0.4);
  const headX = (HEAD_X[face] ?? 0.45) * width;
  const { x, flip } = CHAR_LAYOUT[id];
  const left = flip ? x - (width - headX) : x - headX;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 1290 + (1 - active) * 50 - bob + breathe,
        width,
        height,
        transform: `scaleX(${flip ? -1 : 1}) scale(${0.94 + active * 0.06})`,
        transformOrigin: "50% 30%",
        filter: `brightness(${0.55 + active * 0.45}) saturate(${0.7 + active * 0.3}) drop-shadow(0 0 ${active * 18}px ${ch.color}aa)`,
        zIndex: speaking ? 2 : 1,
      }}
    >
      <Img src={ASSET(`chars/${face}.png`)} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

// ---------------- テロップ ----------------

const Subtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = currentLine(frame);
  const ch = SCRIPT.characters[line.who];
  const s = spring({ frame: frame - line.from, fps, config: { damping: 13, stiffness: 240 } });
  const rows = line.text.split("\n");
  const longest = Math.max(...rows.map(textWidth));
  const size = Math.min(76, Math.floor(960 / longest));
  const fadeOut = interpolate(frame, [line.end - 2, line.end], [1, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: 1095,
        left: 0,
        width: 1080,
        height: 260,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 900,
          fontSize: 30,
          color: C.white,
          background: ch.color,
          borderRadius: 30,
          padding: "4px 22px 6px",
          marginBottom: 8,
          transform: `scale(${s})`,
          alignSelf: line.who === "metan" ? "flex-start" : "flex-end",
          marginLeft: line.who === "metan" ? 60 : 0,
          marginRight: line.who === "metan" ? 0 : 60,
        }}
      >
        {ch.name}
      </div>
      <div style={{ transform: `scale(${0.85 + s * 0.15}) translateY(${(1 - s) * 20}px)`, opacity: Math.min(1, s * 2) }}>
        {rows.map((r, i) => (
          <Outlined
            key={i}
            size={size}
            font={BODY_FONT}
            stroke={C.ink}
            strokeWidth={Math.round(size * 0.26)}
            style={{
              lineHeight: 1.25,
              textShadow: `0 0 0 ${ch.color}`,
              filter: `drop-shadow(0 0 0 ${ch.color}) drop-shadow(5px 6px 0 ${ch.color})`,
            }}
          >
            {r}
          </Outlined>
        ))}
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
      <Character id="metan" />
      <Character id="zundamon" />
      {/* キャラの下側をなじませる */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1080,
          height: 260,
          background: "linear-gradient(180deg, transparent, rgba(7,10,30,0.85))",
          zIndex: 3,
        }}
      />
      <Subtitle />

      {TIMELINE.lines.map((l) => (
        <Sequence key={l.index} from={l.from} durationInFrames={l.duration + 6} layout="none">
          <Audio src={ASSET(`voice/${String(l.index).padStart(3, "0")}.wav`)} />
        </Sequence>
      ))}
      <Audio src={staticFile(`bgm/${SCRIPT.bgm.file}`)} volume={bgmVolume} loop />
    </AbsoluteFill>
  );
};
