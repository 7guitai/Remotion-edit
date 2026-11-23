import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Character } from "../common/Character";
import { Subtitle } from "../common/Subtitle";
import envelope from "./envelope.json";
import { SCENES } from "./scenes";
import { ASSET, BGM_VOLUME, C, FONT, SCRIPT, TIMELINE } from "./theme";

// ---------------- 背景：氷の海（明るいグラデーション＋ゆれる波） ----------------

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const wave = (offset: number, amp: number, len: number, y: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= 1080; x += 20) {
      pts.push(`${x},${y + Math.sin((x + frame * 3 + offset) / len) * amp}`);
    }
    return `M0,1920 L${pts.join(" L")} L1080,1920 Z`;
  };
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.ice} 0%, ${C.bg} 55%, #d4e6f1 100%)` }}>
      <Img
        src={ASSET("media/hero.jpg")}
        style={{
          position: "absolute",
          left: -300,
          top: 300,
          width: 1700,
          filter: "blur(40px) saturate(0.8)",
          opacity: 0.14,
        }}
      />
      {/* 斜めのストライプ（シャチの白黒模様をイメージ） */}
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, rgba(11,34,54,0.03) 0 2px, transparent 2px 28px)",
        }}
      />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={wave(0, 16, 90, 1450)} fill="rgba(0,136,204,0.08)" />
        <path d={wave(200, 22, 120, 1520)} fill="rgba(0,136,204,0.10)" />
        <path d={wave(400, 12, 70, 1600)} fill="rgba(11,34,54,0.10)" />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------- ヘッダー：アイコン＋タイトル＋章の進行 ----------------

const CHAPTERS = [...new Set(SCRIPT.scenes.map((s) => s.chapter))];

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const cur = [...TIMELINE.scenes].reverse().find((sc) => sc.from <= frame) ?? TIMELINE.scenes[0];
  const curIdx = CHAPTERS.indexOf(cur.chapter);
  return (
    <div
      style={{
        position: "absolute",
        top: 112,
        left: 0,
        width: 1080,
        padding: "22px 40px 22px",
        background: "rgba(255,255,255,0.88)",
        boxShadow: "0 6px 24px rgba(11,34,54,0.10)",
        borderBottom: `5px solid ${C.deep}`,
        transform: `translateY(${(1 - s) * -40}px)`,
        opacity: s,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Img src={ASSET("media/icon.png")} style={{ width: 78, height: 78 }} />
        <div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: C.sea, lineHeight: 1.1 }}>AIエージェントを並列で動かす</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, lineHeight: 1.15, whiteSpace: "nowrap" }}>
            Orca<span style={{ fontSize: 44 }}> を1分で解説</span>
          </div>
        </div>
      </div>
      {/* 章の進行（今の章をハイライト） */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {CHAPTERS.map((ch, i) => (
          <div
            key={ch}
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 22,
              padding: "5px 0 7px",
              borderRadius: 10,
              background: i === curIdx ? C.deep : i < curIdx ? "rgba(0,136,204,0.16)" : "rgba(11,34,54,0.06)",
              color: i === curIdx ? C.aqua : i < curIdx ? C.sea : C.gray,
              whiteSpace: "nowrap",
            }}
          >
            {ch}
          </div>
        ))}
      </div>
    </div>
  );
};

// テロップの話者名：タブ型
const NameTab = (name: string, color: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, borderRadius: 12, padding: "4px 18px 7px 8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
    <div style={{ width: 18, height: 30, borderRadius: 6, background: color }} />
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: C.ink }}>{name}</div>
  </div>
);

// ---------------- 全体 ----------------

export const OrcaShort: React.FC = () => {
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
      <Subtitle
        lines={TIMELINE.lines}
        top={1108}
        background="rgba(11,34,54,0.95)"
        renderName={NameTab}
        boxStyle={{ borderLeft: `12px solid ${C.aqua}` }}
      />
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
