import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ShortAudio } from "../common/audio";
import { Character } from "../common/Character";
import { Subtitle } from "../common/Subtitle";
import envelope from "./envelope.json";
import { SCENES } from "./scenes";
import { ASSET, C, FONT, GRAD, GRAD_TEXT, SCRIPT, TIMELINE, TIMING } from "./theme";

// ---------------- 背景：白ベースに、薄い緑のぼかしがゆっくり漂う＋点のグリッド ----------------

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const blob = (color: string, x: number, y: number, r: number, speed: number, phase: number) => (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin(frame / speed + phase) * 120 - r,
        top: y + Math.cos(frame / (speed * 1.3) + phase) * 90 - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        background: color,
        filter: "blur(100px)",
        opacity: 0.2,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.ice} 0%, ${C.bg} 100%)`, overflow: "hidden" }}>
      {blob(C.pink, 200, 500, 360, 70, 0)}
      {blob(C.blue, 880, 800, 380, 85, 2)}
      {blob(C.pink, 400, 1350, 340, 95, 4)}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(46,156,98,0.10) 2px, transparent 2px)",
          backgroundSize: "36px 36px",
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------- ヘッダー：グラデーションの帯＋細い章の進行バー ----------------

const CHAPTERS = [...new Set(SCRIPT.scenes.map((s) => s.chapter))];

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const cur = [...TIMELINE.scenes].reverse().find((sc) => sc.from <= frame) ?? TIMELINE.scenes[0];
  const curIdx = CHAPTERS.indexOf(cur.chapter);
  const inScene = interpolate(frame, [cur.from, cur.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: 112,
        left: 0,
        width: 1080,
        background: "rgba(255,255,255,0.86)",
        boxShadow: "0 6px 24px rgba(31,58,47,0.08)",
        transform: `translateY(${(1 - s) * -40}px)`,
        opacity: s,
      }}
    >
      <div style={{ height: 8, background: GRAD }} />
      <div style={{ padding: "16px 40px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: C.deep, color: C.sky, fontFamily: FONT, fontWeight: 900, fontSize: 24, padding: "3px 12px 6px", borderRadius: 8 }}>NEWS</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, color: C.purple }}>{SCRIPT.header.kicker}</div>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.ink, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          GeminiがMacを<span style={{ background: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>自動操作</span>
        </div>
        {/* 章の進行：細いバー＋今の章の名前 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
          <div style={{ flex: 1, display: "flex", gap: 6 }}>
            {CHAPTERS.map((ch, i) => (
              <div key={ch} style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(31,58,47,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${i < curIdx ? 100 : i === curIdx ? inScene * 100 : 0}%`, height: "100%", background: GRAD }} />
              </div>
            ))}
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 24, color: C.deep, whiteSpace: "nowrap", width: 150, textAlign: "right" }}>
            {curIdx + 1}/{CHAPTERS.length} {cur.chapter}
          </div>
        </div>
      </div>
    </div>
  );
};

// テロップの話者名：グラデーションの縁取りピル
const NameTag = (name: string, color: string) => (
  <div style={{ padding: 3, borderRadius: 14, background: GRAD, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, borderRadius: 11, padding: "3px 18px 6px 12px" }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: color }} />
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: C.ink }}>{name}</div>
    </div>
  </div>
);

export const GeminiMacShort: React.FC = () => (
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
      background="rgba(31,58,47,0.95)"
      highlight={C.sky}
      renderName={NameTag}
      boxStyle={{ borderBottom: `6px solid ${C.purple}` }}
    />
    <Character id="metan" lines={TIMELINE.lines} envelope={envelope as number[][]} />
    <Character id="zundamon" lines={TIMELINE.lines} envelope={envelope as number[][]} />
    <ShortAudio
      lines={TIMELINE.lines}
      total={TIMELINE.total}
      voice={(i) => ASSET(`voice/${String(i).padStart(3, "0")}.wav`)}
      bgmFile={SCRIPT.bgm.file}
      hasVoice={(i) => TIMING[i] !== undefined}
    />
  </AbsoluteFill>
);
