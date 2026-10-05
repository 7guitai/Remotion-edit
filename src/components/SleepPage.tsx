import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SleepSlide } from "../episodes";
import { fontFamily } from "../theme";

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: random(`sx${i}`) * 1920,
  y: random(`sy${i}`) * 620,
  r: 1 + random(`sr${i}`) * 2.2,
  phase: random(`sp${i}`) * Math.PI * 2,
}));

const DROPS = Array.from({ length: 90 }, (_, i) => ({
  x: random(`dx${i}`) * 2200 - 140,
  offset: random(`do${i}`),
  len: 40 + random(`dl${i}`) * 50,
  speed: 0.55 + random(`ds${i}`) * 0.45,
}));

// 夜空（星・月）と雨のすじ、眠っている犬。動画全体で共通の背景
export const SleepBackground: React.FC<{ showDog?: boolean }> = ({
  showDog = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #070b1d 0%, #101a3a 55%, #1a2448 100%)",
        overflow: "hidden",
      }}
    >
      {/* 月 */}
      <div
        style={{
          position: "absolute",
          right: 170,
          top: 90,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 40% 40%, #fff8dc, #e8dca8 70%)",
          boxShadow: "0 0 80px 30px rgba(255,240,190,0.18)",
          opacity: 0.85,
        }}
      />
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.6 + s.phase)),
          }}
        />
      ))}
      {/* ゆっくり降る雨（細く、うすく） */}
      {DROPS.map((d, i) => {
        const p = (t * d.speed * 0.35 + d.offset) % 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x + p * 160,
              top: p * (height + 200) - 150,
              width: 2,
              height: d.len,
              background:
                "linear-gradient(180deg, rgba(180,200,255,0), rgba(180,200,255,0.28))",
              transform: "rotate(10deg)",
            }}
          />
        );
      })}
      {/* 眠っている犬と Zzz */}
      {showDog ? (
        <>
          <Img
            src={staticFile("illustrations/sleep_animal_dog.png")}
            style={{
              position: "absolute",
              left: 90,
              bottom: 70,
              width: 430,
              filter: "brightness(0.72) saturate(0.85)",
              transform: `translateY(${Math.sin(t * 0.9) * 4}px)`,
            }}
          />
          {[0, 1, 2].map((k) => {
            const p = (t * 0.25 + k / 3) % 1;
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: 400 + p * 90,
                  bottom: 400 + p * 170,
                  fontFamily,
                  fontWeight: 800,
                  fontSize: 40 + k * 14,
                  color: "#c9c3ff",
                  opacity: interpolate(p, [0, 0.2, 0.8, 1], [0, 0.6, 0.6, 0]),
                }}
              >
                Z
              </div>
            );
          })}
        </>
      ) : null}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// 雑学の文字：最初にふわっと出て、最後にふわっと消える
export const SleepPage: React.FC<{ slide: SleepSlide }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fade = interpolate(
    frame,
    [0, fps * 1.2, durationInFrames - fps * 1.5, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glow = "0 0 18px rgba(150,170,255,0.35), 0 2px 4px rgba(0,0,0,0.6)";
  const heading = !slide.answer;
  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        transform: `translateY(${(1 - fade) * 12}px)`,
        justifyContent: "center",
        alignItems: heading ? "center" : "flex-start",
        paddingLeft: heading ? 0 : 700,
        paddingRight: heading ? 0 : 140,
        fontFamily,
        color: "#eef0ff",
        textShadow: glow,
      }}
    >
      {heading ? (
        <div
          style={{
            fontWeight: 800,
            fontSize: 76,
            lineHeight: 1.5,
            textAlign: "center",
            whiteSpace: "pre-line",
            marginTop: -120,
          }}
        >
          {slide.text}
        </div>
      ) : (
        <div style={{ marginTop: -60 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: 52,
              opacity: 0.85,
              whiteSpace: "pre-line",
            }}
          >
            {slide.text}
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 76,
              color: "#ffe9a8",
              marginTop: 18,
              lineHeight: 1.3,
              whiteSpace: "pre-line",
            }}
          >
            {slide.answer}
          </div>
          {slide.explain ? (
            <div
              style={{
                fontWeight: 500,
                fontSize: 40,
                marginTop: 34,
                lineHeight: 1.6,
                opacity: 0.75,
                whiteSpace: "pre-line",
              }}
            >
              {slide.explain}
            </div>
          ) : null}
        </div>
      )}
    </AbsoluteFill>
  );
};
