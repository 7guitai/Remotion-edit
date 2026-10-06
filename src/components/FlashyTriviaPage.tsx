import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TriviaSlide } from "../episodes";
import { ResolvedSlide } from "../slides";
import { fontFamily } from "../theme";
import { blackRim, charWidth, Sunburst, SunburstColors } from "./ThreadPage";

// ページごとに切り替える集中線の色
const PALETTES: SunburstColors[] = [
  {
    base: "#ff2e63",
    ray1: "#ff6b8b",
    ray2: "#ff2e63",
    center: "rgba(255,240,245,0.9)",
    edge: "rgba(120,0,40,0.6)",
  },
  {
    base: "#1e90ff",
    ray1: "#5cc8ff",
    ray2: "#1e7bff",
    center: "rgba(235,250,255,0.9)",
    edge: "rgba(0,30,110,0.6)",
  },
  {
    base: "#ffb300",
    ray1: "#ffe14d",
    ray2: "#ffa600",
    center: "rgba(255,252,220,0.9)",
    edge: "rgba(170,70,0,0.6)",
  },
  {
    base: "#20c060",
    ray1: "#7cf09a",
    ray2: "#1fb556",
    center: "rgba(240,255,240,0.9)",
    edge: "rgba(0,80,30,0.6)",
  },
  {
    base: "#8a3cff",
    ray1: "#b98bff",
    ray2: "#7a2cff",
    center: "rgba(248,240,255,0.9)",
    edge: "rgba(40,0,100,0.6)",
  },
];

const WIDTH = 1000;
const fit = (text: string, max: number) =>
  Math.min(
    max,
    Math.floor(WIDTH / Math.max(1, ...text.split("\n").map(charWidth))),
  );

// 文字の重ね描き（下に太いフチ、上に塗り）。行ごとに中央揃え
const Stroked: React.FC<{
  text: string;
  size: number;
  fill: string;
  stroke: string;
  strokeRatio: number;
  rim?: boolean;
  style?: React.CSSProperties;
}> = ({ text, size, fill, stroke, strokeRatio, rim, style }) => {
  const base: React.CSSProperties = {
    fontFamily,
    fontWeight: 900,
    fontSize: size,
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
    textAlign: "center",
    whiteSpace: "pre-line",
  };
  const isGradient = fill.includes("gradient");
  return (
    <div style={{ position: "relative", ...style }}>
      <div
        aria-hidden
        style={{
          ...base,
          position: "absolute",
          inset: 0,
          color: stroke,
          WebkitTextStroke: `${size * strokeRatio}px ${stroke}`,
          filter: rim
            ? blackRim(size * 0.06)
            : "drop-shadow(0 8px 0 rgba(0,0,0,0.35))",
        }}
      >
        {text}
      </div>
      <div
        style={{
          ...base,
          position: "relative",
          ...(isGradient
            ? {
                background: fill,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }
            : { color: fill }),
        }}
      >
        {text}
      </div>
    </div>
  );
};

// 答えが出た瞬間の集中線（白い線が外側に走る）
const SpeedLines: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0 || t > 22) {
    return null;
  }
  return (
    <AbsoluteFill
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 50% 62%, rgba(255,255,255,0.9) 0deg 1.2deg, rgba(255,255,255,0) 1.2deg 7deg)",
        WebkitMaskImage:
          "radial-gradient(circle at 50% 62%, transparent 30%, black 65%)",
        maskImage:
          "radial-gradient(circle at 50% 62%, transparent 30%, black 65%)",
        opacity: interpolate(t, [0, 3, 22], [0, 0.9, 0], {
          extrapolateRight: "clamp",
        }),
        transform: `scale(${interpolate(t, [0, 22], [1, 1.25])})`,
      }}
    />
  );
};

// きらきら（答えのまわりで点滅する星）
const Sparkles: React.FC<{ t: number; top: number }> = ({ t, top }) => {
  if (t < 0) {
    return null;
  }
  const stars = [
    [80, -40, 70],
    [940, -20, 60],
    [140, 190, 46],
    [900, 200, 54],
    [520, -90, 40],
  ];
  return (
    <>
      {stars.map(([x, y, s], i) => {
        const tw = 0.6 + 0.4 * Math.sin((t + i * 7) / 4);
        const appear = Math.min(1, Math.max(0, (t - i * 2) / 6));
        return (
          <svg
            key={i}
            width={s}
            height={s}
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              left: x - s / 2,
              top: top + y,
              transform: `scale(${appear * tw}) rotate(${t * 3}deg)`,
              filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9))",
            }}
          >
            <path
              d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z"
              fill="#fffbe0"
            />
          </svg>
        );
      })}
    </>
  );
};

// 派手版の1ページ1雑学：色の変わる集中線、文字の叩きつけ、答えでフラッシュ＋揺れ＋集中線＋きらきら
export const FlashyTriviaPage: React.FC<{
  resolved: ResolvedSlide;
  slide: TriviaSlide;
}> = ({ resolved, slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palette = PALETTES[(resolved.no ?? 0) % PALETTES.length];
  const ans = resolved.answerStart;
  const t = ans === null ? -1 : frame - ans;
  const opener = !slide.answer;

  // 画面の揺れ（答えが出た直後だけ）
  const shake = t >= 0 && t < 14 ? (1 - t / 14) * 22 : 0;
  const shakeX = shake * Math.sin(t * 2.7);
  const shakeY = shake * Math.cos(t * 3.3);
  // ページの入り（少し大きい所から戻る）
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const setupPop = spring({
    frame: frame - 2,
    fps,
    config: { damping: 9, mass: 0.7 },
  });
  const imagePop = spring({ frame: frame - 6, fps, config: { damping: 10 } });
  const answerPop =
    t >= 0 ? spring({ frame: t, fps, config: { damping: 8, mass: 0.6 } }) : 0;
  const imagePunch =
    t >= 0
      ? interpolate(t, [0, 4, 14], [1, 1.12, 1], { extrapolateRight: "clamp" })
      : 1;
  const flash = Math.max(
    interpolate(frame, [0, 6], [0.7, 0], { extrapolateRight: "clamp" }),
    t >= 0
      ? interpolate(t, [0, 7], [0.85, 0], { extrapolateRight: "clamp" })
      : 0,
  );

  const answerTop = 1160;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px) scale(${interpolate(enter, [0, 1], [1.12, 1])})`,
        }}
      >
        <Sunburst colors={palette} speed={0.35} />
        <SpeedLines t={t} />

        {resolved.no !== null ? (
          <div
            style={{
              position: "absolute",
              top: 175,
              left: 46,
              width: 190,
              height: 190,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 30%, #ff6b6b, #d1001f)",
              border: "8px solid #fff",
              boxShadow: "0 8px 0 rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontFamily,
              fontWeight: 900,
              transform: `rotate(-12deg) scale(${interpolate(setupPop, [0, 1], [0, 1])})`,
            }}
          >
            {slide.rank !== undefined ? (
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: 36 }}>第</span>
                <span style={{ fontSize: 88, lineHeight: 1 }}>
                  {slide.rank}
                </span>
                <span style={{ fontSize: 36 }}>位</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 34, lineHeight: 1 }}>雑学</div>
                <div style={{ fontSize: 72, lineHeight: 1 }}>{resolved.no}</div>
              </>
            )}
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            top: opener ? 300 : 360,
            left: 40,
            right: 40,
            transform: `scale(${interpolate(setupPop, [0, 1], [2.2, 1])}) rotate(${interpolate(setupPop, [0, 1], [-8, 0])}deg)`,
            opacity: Math.min(1, setupPop * 3),
          }}
        >
          {opener ? (
            <Stroked
              text={slide.text}
              size={fit(slide.text, 150)}
              fill="linear-gradient(180deg, #fffb7a 0%, #ffd000 50%, #ff8a00 100%)"
              stroke="#000"
              strokeRatio={0.3}
            />
          ) : (
            <Stroked
              text={slide.text}
              size={fit(slide.text, 96)}
              fill="#fff"
              stroke="#000"
              strokeRatio={0.28}
            />
          )}
        </div>

        <div
          style={{
            position: "absolute",
            top: opener ? 820 : 620,
            left: 0,
            right: 0,
            height: opener ? 640 : 520,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transform: `translateY(${Math.sin(frame / 10) * 12}px) scale(${imagePop * imagePunch}) rotate(${interpolate(imagePop, [0, 1], [-20, 0]) + Math.sin(frame / 15) * 2}deg)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 620,
              height: 620,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0) 70%)",
            }}
          />
          {resolved.hasImage ? (
            <Img
              src={staticFile(`illustrations/${slide.image}`)}
              style={{
                position: "relative",
                width: 760,
                height: opener ? 600 : 480,
                objectFit: "contain",
                filter: "drop-shadow(0 12px 0 rgba(0,0,0,0.18))",
              }}
            />
          ) : null}
        </div>

        {slide.answer && t >= 0 ? (
          <div
            style={{
              position: "absolute",
              top: answerTop,
              left: 30,
              right: 30,
              transform: `scale(${interpolate(answerPop, [0, 1], [2.8, 1])}) rotate(-3deg)`,
              opacity: Math.min(1, answerPop * 3),
            }}
          >
            <Stroked
              text={slide.answer}
              size={fit(slide.answer, 120)}
              fill="linear-gradient(180deg, #fffb7a 0%, #ffd000 50%, #ff8a00 100%)"
              stroke="#000"
              strokeRatio={0.3}
            />
            {slide.note ? (
              <Stroked
                text={slide.note}
                size={fit(slide.note, 54)}
                fill="#fff"
                stroke="#000"
                strokeRatio={0.26}
                style={{ marginTop: 18 }}
              />
            ) : null}
          </div>
        ) : null}
        <Sparkles t={t} top={answerTop} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{ background: "#fff", opacity: flash, pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
};
