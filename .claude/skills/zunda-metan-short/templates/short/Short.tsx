import React from "react";
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ShortAudio } from "../common/audio";
import { Character } from "../common/Character";
import { Subtitle } from "../common/Subtitle";
import { SceneWipes } from "../common/Transition";
import envelope from "./envelope.json";
import { SCENES } from "./scenes";
import { ASSET, C, FONT, SCRIPT, TIMELINE, TIMING } from "./theme";

// ---------------- 背景（明るいグラデーション。公式画面をぼかして敷くなど動画ごとに変える） ----------------

const Background: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.ice} 0%, ${C.bg} 60%, ${C.bg} 100%)` }} />
);

// ---------------- ヘッダー：タイトル＋ラベル＋章の進行 ----------------

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
        padding: "22px 40px",
        background: "rgba(255,255,255,0.88)",
        boxShadow: "0 6px 24px rgba(20,24,40,0.10)",
        transform: `translateY(${(1 - s) * -40}px)`,
        opacity: s,
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, color: C.accent }}>{SCRIPT.header.kicker}</div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 60, color: C.ink, lineHeight: 1.15, whiteSpace: "nowrap" }}>{SCRIPT.header.title}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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
              background: i === curIdx ? C.deep : "rgba(20,24,40,0.06)",
              color: i === curIdx ? C.accent2 : C.gray,
            }}
          >
            {ch}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------- 全体 ----------------

export const __Component__: React.FC = () => (
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
    {/* テロップの { } で囲んだ部分は highlight の色になる */}
    <Subtitle lines={TIMELINE.lines} top={1108} background={C.deep} highlight={C.accent2} />
    <Character id="metan" lines={TIMELINE.lines} envelope={envelope as number[][]} />
    <Character id="zundamon" lines={TIMELINE.lines} envelope={envelope as number[][]} />
    {/* シーンの切り替わりのワイプ */}
    <SceneWipes starts={TIMELINE.scenes.map((s) => s.from)} colors={[C.accent, C.deep]} />
    {/* セリフ音声＋BGM（BGM は小さめ＋セリフ中はさらに下げる。音声が無いセリフは鳴らさない） */}
    <ShortAudio
      lines={TIMELINE.lines}
      total={TIMELINE.total}
      voice={(i) => ASSET(`voice/${String(i).padStart(3, "0")}.wav`)}
      bgmFile={SCRIPT.bgm.file}
      hasVoice={(i) => TIMING[i] !== undefined}
    />
  </AbsoluteFill>
);
