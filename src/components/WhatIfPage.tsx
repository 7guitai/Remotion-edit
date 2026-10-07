import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WhatIfSlide } from "../episodes";
import { fontFamily } from "../theme";
import { charWidth } from "./ThreadPage";
import { Globe } from "./Globe";
import { PhysicsScene } from "./PhysicsScene";

// 画面の配置（1080×1920）：上の黒帯にタイトル、真ん中が映像、下は黒
export const VIEW = { top: 520, height: 1000 };

// 上の黒帯に出し続ける2行のタイトル（1行目は黄色、2行目は赤）
export const WhatIfHeadline: React.FC<{ lines: string[] }> = ({ lines }) => (
  <div style={{ position: "absolute", top: 150, left: 0, right: 0 }}>
    {lines.map((line, i) => {
      const size = Math.min(
        150,
        Math.floor(980 / Math.max(1, charWidth(line))),
      );
      return (
        <div
          key={i}
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.12,
            textAlign: "center",
            letterSpacing: "-0.03em",
            color: i === 0 ? "#fff200" : "#ff1f1f",
            textShadow: "0 6px 0 rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.8)",
          }}
        >
          {line}
        </div>
      );
    })}
  </div>
);

const STARS = Array.from({ length: 160 }, (_, i) => ({
  x: random(`wx${i}`),
  y: random(`wy${i}`),
  r: 0.8 + random(`wr${i}`) * 2.2,
  p: random(`wp${i}`) * Math.PI * 2,
}));

const Background: React.FC<{ kind: WhatIfSlide["bg"] }> = ({
  kind = "space",
}) => {
  const frame = useCurrentFrame();
  if (kind === "sky") {
    return (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #3d8bff 0%, #9fd3ff 70%, #e8f6ff 100%)",
        }}
      />
    );
  }
  if (kind === "sea") {
    return (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #7fc8ff 0%, #1f6fd1 45%, #0a3a7a 100%)",
        }}
      />
    );
  }
  return (
    <AbsoluteFill
      style={{
        background:
          kind === "night"
            ? "radial-gradient(circle at 50% 40%, #0b1030 0%, #000 80%)"
            : "radial-gradient(circle at 60% 30%, #1c1450 0%, #070718 55%, #000 100%)",
      }}
    >
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${((s.x * 100 + frame * 0.02) % 100).toFixed(3)}%`,
            top: `${s.y * 100}%`,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(frame / 9 + s.p)),
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// 黄色い矢印（中央を指す）
const Arrows: React.FC = () => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 4) * 14;
  return (
    <>
      {[-60, -30, 0, 30, 60].map((deg, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `rotate(${deg}deg) translateY(${-400 + bob}px)`,
            transformOrigin: "0 0",
          }}
        >
          <svg
            width="90"
            height="120"
            viewBox="0 0 90 120"
            style={{ marginLeft: -45 }}
          >
            <path
              d="M30 0 H60 V70 H90 L45 120 L0 70 H30 Z"
              fill="#ffe600"
              stroke="#7a5b00"
              strokeWidth="4"
            />
          </svg>
        </div>
      ))}
    </>
  );
};

// 横に流れる白い線（暴風）
const Wind: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 40 }, (_, i) => {
        const y = random(`wy2${i}`) * 100;
        const speed = 40 + random(`ws${i}`) * 50;
        const x = ((random(`wx2${i}`) * 1400 + frame * speed) % 1600) - 300;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: `${y}%`,
              width: 180 + random(`wl${i}`) * 220,
              height: 5,
              borderRadius: 3,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85))",
            }}
          />
        );
      })}
    </>
  );
};

// 下から上がってくる水
const Flood: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const level = interpolate(frame, [0, durationInFrames], [0.1, 0.65], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: -50,
        right: -50,
        bottom: 0,
        height: `${level * 100}%`,
        background:
          "linear-gradient(180deg, rgba(60,160,255,0.85), rgba(10,60,160,0.95))",
        borderTop: "10px solid rgba(220,245,255,0.9)",
        transform: `translateY(${Math.sin(frame / 5) * 10}px) skewY(${Math.sin(frame / 8) * 2}deg)`,
      }}
    />
  );
};

// 長い字幕は、真ん中に近い助詞のあとで2行に分ける（文字を大きく見せるため）
const splitCaption = (text: string): string[] => {
  if (text.length <= 10) {
    return [text];
  }
  const mid = text.length / 2;
  let best = Math.round(mid);
  let bestDist = Infinity;
  // 「」の中では区切らない
  let depth = 0;
  [...text].forEach((ch, i) => {
    if (ch === "「") depth++;
    if (ch === "」") depth--;
    if (
      depth === 0 &&
      i > 2 &&
      i < text.length - 2 &&
      "はがをにでともへやのて」".includes(ch)
    ) {
      const d = Math.abs(i + 1 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i + 1;
      }
    }
  });
  // 数字や英字のかたまりの途中では区切らない（「1700」などが割れないように）
  const ascii = /[0-9A-Za-z.,]/;
  while (best > 1 && ascii.test(text[best - 1]) && ascii.test(text[best])) {
    best--;
  }
  return [text.slice(0, best), text.slice(best)];
};

// 字幕：読み上げの文字数に合わせて、句読点ごとに切り替える
const Caption: React.FC<{
  text: string;
  voiceStart: number;
  voiceFrames: number;
}> = ({ text, voiceStart, voiceFrames }) => {
  const frame = useCurrentFrame();
  const chunks = text
    .split(/(?<=[、。！？])/)
    .map((c) => c.replace(/[、。]$/, ""))
    .filter((c) => c.trim());
  const total = chunks.reduce((s, c) => s + c.length, 0);
  let acc = 0;
  let current = chunks[0] ?? "";
  for (const c of chunks) {
    const start = voiceStart + (acc / total) * voiceFrames;
    if (frame >= start) {
      current = c;
    }
    acc += c.length;
  }
  const lines = splitCaption(current);
  const size = Math.min(
    110,
    Math.floor(1000 / Math.max(1, ...lines.map(charWidth))),
  );
  return (
    <div
      style={{
        position: "absolute",
        top: VIEW.top + VIEW.height - 330,
        left: 30,
        right: 30,
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.15,
        color: "#fff",
        WebkitTextStroke: `${size * 0.09}px #111`,
        paintOrder: "stroke fill",
        textShadow: "0 8px 12px rgba(0,0,0,0.7)",
        whiteSpace: "pre-line",
      }}
    >
      {lines.join("\n")}
    </div>
  );
};

// 「もしも」動画の1場面：真ん中の映像エリアに背景・イラスト・演出、下に字幕
export const WhatIfPage: React.FC<{
  slide: WhatIfSlide;
  voiceStart: number;
  voiceFrames: number;
}> = ({ slide, voiceStart, voiceFrames }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const effect = slide.effect ?? "zoom";
  const pop = spring({ frame, fps, config: { damping: 12 } });
  // カメラのゆっくりズーム（場面の最初は少し強めに寄る）
  let scale =
    interpolate(frame, [0, durationInFrames], [1, 1.12]) *
    interpolate(pop, [0, 1], [effect === "zoom" ? 1.6 : 0.85, 1]);
  let rotate = 0;
  if (effect === "spin") {
    rotate = frame * 3;
  } else if (effect === "stop") {
    // 回っていた地球が急ブレーキで止まる
    const stopAt = Math.min(durationInFrames * 0.35, 25);
    rotate =
      frame < stopAt
        ? frame * 6
        : stopAt * 6 +
          Math.sin((frame - stopAt) * 1.5) *
            8 *
            Math.exp(-(frame - stopAt) / 8);
  } else if (effect === "flip") {
    scale *= 1;
    rotate = interpolate(frame, [0, durationInFrames], [0, 25]);
  }
  const shakeAmp =
    effect === "shake" || effect === "wind" || (effect === "stop" && frame > 20)
      ? 14
      : 0;
  const shakeX = shakeAmp * Math.sin(frame * 2.3);
  const shakeY = shakeAmp * Math.cos(frame * 3.1);
  const dark =
    effect === "dark"
      ? interpolate(frame, [0, durationInFrames * 0.6], [0, 0.75], {
          extrapolateRight: "clamp",
        })
      : 0;
  // vanish：場面の途中で強く光ってから、まっ暗に消える
  const vanishAt = durationInFrames * 0.55;
  const vanishFlash =
    effect === "vanish"
      ? interpolate(
          frame,
          [vanishAt - 4, vanishAt, vanishAt + 6],
          [0, 0.95, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        )
      : 0;
  const vanishDark =
    effect === "vanish"
      ? interpolate(frame, [vanishAt, vanishAt + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const flash = interpolate(frame, [0, 5], [0.6, 0], {
    extrapolateRight: "clamp",
  });
  const bigPop = spring({ frame: frame - 8, fps, config: { damping: 9 } });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: VIEW.top,
          left: 0,
          right: 0,
          height: VIEW.height,
          overflow: "hidden",
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        <Background kind={slide.bg} />
        {effect === "half" ? (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(90deg, rgba(255,230,140,0.35) 0%, rgba(255,230,140,0.35) 50%, rgba(0,0,30,0.75) 50%)",
            }}
          />
        ) : null}
        {slide.footage ? (
          <AbsoluteFill
            style={{
              transform: `scale(${(slide.footage.zoom ?? 1) * interpolate(frame, [0, durationInFrames], [1, 1.06])})`,
              transformOrigin: `${(slide.footage.focus ?? [0.5, 0.5])[0] * 100}% ${(slide.footage.focus ?? [0.5, 0.5])[1] * 100}%`,
            }}
          >
            <OffthreadVideo
              src={staticFile(`footage/${slide.footage.file}`)}
              startFrom={Math.round((slide.footage.start ?? 0) * fps)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        ) : null}
        {slide.photo ? (
          <AbsoluteFill
            style={{
              transform: `scale(${(slide.photo.zoom ?? 1) * interpolate(frame, [0, durationInFrames], [1, 1.15])})`,
              transformOrigin: `${(slide.photo.focus ?? [0.5, 0.5])[0] * 100}% ${(slide.photo.focus ?? [0.5, 0.5])[1] * 100}%`,
            }}
          >
            <Img
              src={staticFile(`footage/${slide.photo.file}`)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        ) : null}
        {slide.sim ? (
          <PhysicsScene kind={slide.sim} width={1080} height={VIEW.height} />
        ) : null}
        {slide.globe ? (
          <AbsoluteFill
            style={{ transform: `translate(0, -60px) scale(${scale})` }}
          >
            <Globe {...slide.globe} width={1080} height={VIEW.height} />
          </AbsoluteFill>
        ) : null}
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}
        >
          {slide.image ? (
            <Img
              src={staticFile(`illustrations/${slide.image}`)}
              style={{
                width: slide.imageSize ?? 640,
                height: slide.imageSize ?? 640,
                objectFit: "contain",
                transform: `scale(${scale}) rotate(${rotate}deg)`,
                filter: "drop-shadow(0 0 40px rgba(120,180,255,0.35))",
                marginTop: -120,
              }}
            />
          ) : null}
        </AbsoluteFill>
        {effect === "wind" ? <Wind /> : null}
        {effect === "flood" ? <Flood /> : null}
        {effect === "arrows" ? <Arrows /> : null}
        <AbsoluteFill
          style={{ background: "#000", opacity: Math.max(dark, vanishDark) }}
        />
        <AbsoluteFill style={{ background: "#fff", opacity: vanishFlash }} />
        {slide.big ? (
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              transform: `scale(${interpolate(bigPop, [0, 1], [2.5, 1])}) rotate(-4deg)`,
              opacity: Math.min(1, Math.max(0, bigPop) * 3),
            }}
          >
            <div
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: 96,
                color: "#111",
                background: "#ffe600",
                padding: "6px 34px",
                borderRadius: 18,
                border: "8px solid #111",
                boxShadow: "0 10px 0 rgba(0,0,0,0.5)",
              }}
            >
              {slide.big}
            </div>
          </div>
        ) : null}
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      </div>
      <Caption
        text={slide.text}
        voiceStart={voiceStart}
        voiceFrames={voiceFrames}
      />
    </AbsoluteFill>
  );
};
