import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { fontFamily } from "../theme";
import { PaperVisual, setPaperSkin, Visual } from "./PaperPage";
import { TalkCharacter, TalkFace, TalkWho } from "./TalkCharacter";

// 掛け合い解説（ゆっくり解説のような雰囲気）横長 1920×1080。
// 左上に番組名、真ん中のホワイトボードに図解、右下にキャラクター2人、下に話した人の色でふちどった字幕
export type TalkSlide = {
  type: "talk";
  text: string;
  speech?: string;
  who: TalkWho;
  face?: TalkFace;
  // 聞いている側の表情
  other?: TalkFace;
  visual: PaperVisual;
  enter?: boolean;
  tag?: string;
  series?: string;
  // 読み上げの声（generate_voice.py が使う）
  speaker?: number;
  speed?: number;
};

export const TALK_COLORS: Record<TalkWho, string> = { sora: "#3d6fd1", komugi: "#ee8a1f" };
export const TALK_NAMES: Record<TalkWho, string> = { sora: "ソラ", komugi: "コムギ" };

const outline = (color: string, w: number) =>
  Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `${(Math.cos(a) * w).toFixed(1)}px ${(Math.sin(a) * w).toFixed(1)}px 0 ${color}`;
  }).join(", ");

const TalkBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.4) % 80;
  return (
    <AbsoluteFill style={{ background: "#fff6e3" }}>
      {/* ななめのしま（ゆっくり流れる） */}
      <div
        style={{
          position: "absolute",
          inset: -100,
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,214,150,0.35) 0 40px, rgba(255,255,255,0) 40px 80px)",
          transform: `translateX(${shift}px)`,
        }}
      />
      {/* 水玉 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,170,120,0.22) 7px, transparent 8px)",
          backgroundSize: "64px 64px",
        }}
      />
    </AbsoluteFill>
  );
};

export const TalkPage: React.FC<{ slide: TalkSlide }> = ({ slide }) => {
  setPaperSkin("pop");
  const frame = useCurrentFrame();
  const enter = slide.enter !== false;
  const big = slide.visual.kind === "title" || slide.visual.kind === "chapter";
  const color = TALK_COLORS[slide.who];
  const pop = interpolate(frame, [0, 6], [0.9, 1], { extrapolateRight: "clamp" });
  const faceOf = (w: TalkWho): TalkFace => (w === slide.who ? (slide.face ?? "normal") : (slide.other ?? "normal"));
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <TalkBackground />
      {/* 番組名と章 */}
      <div style={{ position: "absolute", left: 40, top: 22, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ background: "#ff6f61", color: "#fff", fontWeight: 900, fontSize: 34, padding: "6px 26px", borderRadius: 999, boxShadow: "0 5px 0 #c94c40" }}>
          {slide.series ?? "ソラとコムギの なるほど科学"}
        </div>
        {slide.tag ? (
          <div style={{ background: "#fff", color: "#5a3a2a", fontWeight: 900, fontSize: 30, padding: "6px 22px", borderRadius: 999, border: "4px solid #5a3a2a" }}>{slide.tag}</div>
        ) : null}
      </div>
      {/* ホワイトボード */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 92,
          width: 1360,
          height: 700,
          background: big ? "#fffdf6" : "#ffffff",
          border: "8px solid #5a3a2a",
          borderRadius: 34,
          boxShadow: "0 12px 0 rgba(90,58,42,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${big ? 0.92 : 0.8})` }}>
            <Visual v={slide.visual} enter={enter} />
          </div>
        </div>
      </div>
      {/* キャラクター */}
      {(["sora", "komugi"] as TalkWho[]).map((w, i) => (
        <div key={w} style={{ position: "absolute", left: 1390 + i * 230, top: i === 0 ? 390 : 520 }}>
          <TalkCharacter who={w} face={faceOf(w)} talking={w === slide.who && frame > 4} frame={frame} size={300} dim={w !== slide.who} />
        </div>
      ))}
      {/* 字幕 */}
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 820,
          height: 226,
          background: "rgba(255,255,255,0.92)",
          border: `8px solid ${color}`,
          borderRadius: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 60px 10px",
        }}
      >
        <div style={{ position: "absolute", left: 40, top: -34, background: color, color: "#fff", fontWeight: 900, fontSize: 36, padding: "4px 28px", borderRadius: 999 }}>
          {TALK_NAMES[slide.who]}
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: slide.text.length > 42 ? 54 : 62,
            lineHeight: 1.35,
            color: "#fff",
            textShadow: outline(color, 6),
            textAlign: "center",
            transform: `scale(${pop})`,
          }}
        >
          {slide.text}
        </div>
      </div>
      {/* 図が切りかわるときの効果音（小さめ） */}
      {enter ? (
        <Sequence from={0} durationInFrames={20}>
          <Audio src={staticFile("sfx/pop.wav")} volume={0.18} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
