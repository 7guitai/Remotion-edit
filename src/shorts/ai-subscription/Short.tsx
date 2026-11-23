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
import { Character } from "../common/Character";
import { Subtitle } from "../common/Subtitle";
import envelope from "./envelope.json";
import { SCENES } from "./scenes";
import { ASSET, BGM_VOLUME, C, FONT } from "./theme";
import { SCRIPT, TIMELINE } from "./timeline";

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
      <Subtitle lines={TIMELINE.lines} />
      <Character id="metan" lines={TIMELINE.lines} envelope={envelope as number[][]} />
      <Character id="zundamon" lines={TIMELINE.lines} envelope={envelope as number[][]} />

      {TIMELINE.lines.map((l) => (
        <Sequence key={l.index} from={l.from} durationInFrames={l.duration + 6} layout="none">
          <Audio src={ASSET(`voice/${String(l.index).padStart(3, "0")}.wav`)} />
        </Sequence>
      ))}
      <Audio src={staticFile(`bgm/${SCRIPT.bgm.file}`)} volume={bgmVolume} loop />
    </AbsoluteFill>
  );
};
