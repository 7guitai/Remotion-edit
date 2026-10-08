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
import { IllusionSlide } from "../episodes";
import { ResolvedSlide } from "../slides";
import { fontFamily } from "../theme";
import { charWidth } from "./ThreadPage";

// 目の錯覚クイズ（たて動画）：上に見出し、真ん中に白い板の図、下に問題・答え・解説

const PANEL = { x: 50, y: 430, size: 980 };
const COUNT = 90;

const clamp = (x: number) => Math.min(1, Math.max(0, x));

// ---- 図（viewBox 0 0 1000 1000）。r は種明かしの進み具合（0→1）----

const Muller: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const fin = 1 - 0.8 * clamp(r * 2);
  const guide = clamp(r * 1.6 - 0.3);
  const line = (y: number, out: boolean) => {
    const d = out ? 80 : -80;
    return (
      <g stroke="#111" strokeWidth={16} strokeLinecap="round">
        <line x1={250} y1={y} x2={750} y2={y} />
        <g opacity={fin}>
          <line x1={250} y1={y} x2={250 + d} y2={y - 80} />
          <line x1={250} y1={y} x2={250 + d} y2={y + 80} />
          <line x1={750} y1={y} x2={750 - d} y2={y - 80} />
          <line x1={750} y1={y} x2={750 - d} y2={y + 80} />
        </g>
      </g>
    );
  };
  return (
    <>
      {line(320, true)}
      {line(680, false)}
      {[250, 750].map((x) => (
        <line
          key={x}
          x1={x}
          y1={170}
          x2={x}
          y2={170 + 660 * guide}
          stroke="#ff2d2d"
          strokeWidth={8}
          strokeDasharray="22 14"
        />
      ))}
      <Labels labels={labels} at={[[50, 343], [50, 703]]} />
    </>
  );
};

const Ebbinghaus: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const fade = 1 - 0.85 * clamp(r * 2);
  // 右の円のコピーが、左の円にぴったり重なるまで動く
  const move = clamp((r - 0.35) / 0.65);
  const ease = move * move * (3 - 2 * move);
  const big = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);
  const small = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  return (
    <>
      <g opacity={fade} fill="#9aa4b4">
        {big.map((a, i) => (
          <circle key={i} cx={270 + Math.cos(a) * 175} cy={500 + Math.sin(a) * 175} r={86} />
        ))}
        {small.map((a, i) => (
          <circle key={i} cx={770 + Math.cos(a) * 100} cy={500 + Math.sin(a) * 100} r={26} />
        ))}
      </g>
      <circle cx={270} cy={500} r={60} fill="#ff8a00" />
      <circle cx={770} cy={500} r={60} fill="#ff8a00" />
      {move > 0 ? (
        <circle
          cx={770 + (270 - 770) * ease}
          cy={500}
          r={60}
          fill="none"
          stroke="#ff2d2d"
          strokeWidth={8}
          strokeDasharray="16 10"
        />
      ) : null}
      <Labels labels={labels} at={[[270, 860], [770, 860]]} center />
    </>
  );
};

const Contrast: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  // 背景のグラデーションが消えて、帯だけが残る
  const bg = 1 - clamp(r * 1.4);
  return (
    <>
      <defs>
        <linearGradient id="cg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1000} height={1000} fill="#d9d9d9" />
      <rect x={0} y={0} width={1000} height={1000} fill="url(#cg)" opacity={bg} />
      <rect x={70} y={430} width={860} height={140} fill="#808080" />
      <Labels labels={labels} at={[[170, 680], [830, 680]]} center light={bg > 0.5} />
    </>
  );
};

const Cafe: React.FC<{ r: number }> = ({ r }) => {
  const tile = 100;
  const rowH = 100;
  const mortar = 6;
  // 行ごとに 1/4 枚ずつずらし、また戻す（いちばん傾いて見える並べ方）
  const shifts = [0, 25, 50, 75, 50, 25, 0, 25, 50];
  const top = 14;
  const fade = 1 - 0.65 * clamp(r * 2);
  const draw = clamp(r * 1.5 - 0.2);
  return (
    <>
      <rect x={0} y={0} width={1000} height={1000} fill="#fff" />
      <g opacity={fade}>
        {shifts.map((sh, row) => {
          const y = top + row * (rowH + mortar);
          return (
            <g key={row}>
              {Array.from({ length: 12 }, (_, k) => {
                const x = -tile + sh + k * tile * 2;
                return <rect key={k} x={x} y={y} width={tile} height={rowH} fill="#111" />;
              })}
            </g>
          );
        })}
        {shifts.slice(0, -1).map((_, row) => (
          <rect
            key={row}
            x={0}
            y={top + row * (rowH + mortar) + rowH}
            width={1000}
            height={mortar}
            fill="#8a8a8a"
          />
        ))}
      </g>
      {shifts.slice(0, -1).map((_, row) => (
        <line
          key={row}
          x1={0}
          y1={top + row * (rowH + mortar) + rowH + mortar / 2}
          x2={1000 * draw}
          y2={top + row * (rowH + mortar) + rowH + mortar / 2}
          stroke="#ff2d2d"
          strokeWidth={7}
        />
      ))}
    </>
  );
};

const Ponzo: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const fade = 1 - 0.85 * clamp(r * 2);
  const move = clamp((r - 0.3) / 0.7);
  const ease = move * move * (3 - 2 * move);
  // 線路のまくら木（遠いほど間がつまる）。レールの間の半分の幅は、上（遠く）で70、下（手前）で300
  const sleepers = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const y = 1000 * (1 - t) ** 1.6;
    return { y, half: 70 + (230 * y) / 1000 };
  });
  const bar = (y: number, opacity = 1, dashed = false) => (
    <rect
      x={370}
      y={y - 22}
      width={260}
      height={44}
      rx={8}
      fill={dashed ? "none" : "#ffd21a"}
      stroke={dashed ? "#ff2d2d" : "#111"}
      strokeWidth={dashed ? 8 : 6}
      strokeDasharray={dashed ? "18 10" : undefined}
      opacity={opacity}
    />
  );
  return (
    <>
      <rect x={0} y={0} width={1000} height={1000} fill="#f3efe6" />
      <g opacity={fade} stroke="#5a4a3a" strokeLinecap="round">
        {sleepers.map((s, i) => (
          <line key={i} x1={500 - s.half - 24} y1={s.y} x2={500 + s.half + 24} y2={s.y} strokeWidth={10} />
        ))}
        <line x1={200} y1={1000} x2={430} y2={0} strokeWidth={16} stroke="#333" />
        <line x1={800} y1={1000} x2={570} y2={0} strokeWidth={16} stroke="#333" />
      </g>
      {bar(280)}
      {bar(780)}
      {/* 下の棒のコピーが、上の棒のすぐ下まで上がってくる */}
      {move > 0 ? bar(780 + (340 - 780) * ease, 1, true) : null}
      <Labels labels={labels} at={[[230, 295], [230, 795]]} />
    </>
  );
};

const Labels: React.FC<{
  labels?: [string, string];
  at: [[number, number], [number, number]];
  center?: boolean;
  light?: boolean;
}> = ({ labels, at, center, light }) =>
  labels ? (
    <>
      {labels.map((l, i) => (
        <text
          key={i}
          x={at[i][0]}
          y={at[i][1]}
          fontFamily={fontFamily}
          fontWeight={900}
          fontSize={64}
          textAnchor={center ? "middle" : "start"}
          fill={i === 0 ? "#ff2d2d" : "#1f6fff"}
          stroke={light ? "#000" : "#fff"}
          strokeWidth={8}
          paintOrder="stroke"
        >
          {l}
        </text>
      ))}
    </>
  ) : null;

// ---- 背景：ゆっくり回る同心円（催眠っぽい雰囲気） ----
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #3b1b7a 0%, #170a3a 55%, #07031a 100%)" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
        <g transform={`rotate(${frame * 0.4} 540 960)`}>
          {Array.from({ length: 16 }, (_, i) => (
            <circle
              key={i}
              cx={540}
              cy={960}
              r={80 + i * 90}
              fill="none"
              stroke={i % 2 ? "#ff5ad1" : "#5ad1ff"}
              strokeWidth={22}
              strokeDasharray="60 40"
            />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const Header: React.FC<{ no: number | null; total: number }> = ({ no, total }) => (
  <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center" }}>
    <div
      style={{
        display: "inline-block",
        fontFamily,
        fontWeight: 900,
        fontSize: 48,
        color: "#fff",
        background: "#ff2d6f",
        padding: "4px 30px",
        borderRadius: 999,
      }}
    >
      あなたの脳はだまされる？
    </div>
    <div
      style={{
        fontFamily,
        fontWeight: 900,
        fontSize: 148,
        lineHeight: 1.1,
        color: "#ffe600",
        WebkitTextStroke: "14px #2a0a55",
        paintOrder: "stroke fill",
        textShadow: "0 10px 0 rgba(0,0,0,0.5)",
        letterSpacing: "-0.02em",
      }}
    >
      目の錯覚クイズ
    </div>
    {no !== null ? (
      <div
        style={{
          position: "absolute",
          right: 50,
          top: -20,
          fontFamily,
          fontWeight: 900,
          fontSize: 52,
          color: "#2a0a55",
          background: "#fff",
          borderRadius: 20,
          padding: "2px 22px",
          transform: "rotate(6deg)",
        }}
      >
        {`Q${no}`}
        <span style={{ fontSize: 34 }}>{`/${total}`}</span>
      </div>
    ) : null}
  </div>
);

export const IllusionPage: React.FC<{ resolved: ResolvedSlide; slide: IllusionSlide }> = ({
  resolved,
  slide,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { answerStart, explainStart, no, total } = resolved;
  const quizNo = no;
  const countStart = answerStart === null ? null : answerStart - COUNT;
  const r =
    answerStart === null
      ? 0
      : interpolate(frame, [answerStart, answerStart + 45], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const answered = answerStart !== null && frame >= answerStart;
  const ansPop = answerStart === null ? 0 : spring({ frame: frame - answerStart, fps, config: { damping: 9 } });
  const exPop = explainStart === null ? 0 : spring({ frame: frame - explainStart, fps, config: { damping: 14 } });

  if (slide.kind === "intro" || slide.kind === "outro") {
    const lines = slide.text.split(/(?<=[！？。])/).filter((l) => l.trim());
    return (
      <AbsoluteFill>
        <Background />
        <Header no={null} total={total} />
        <div
          style={{
            position: "absolute",
            top: 620,
            left: 60,
            right: 60,
            textAlign: "center",
            transform: `scale(${interpolate(enter, [0, 1], [0.6, 1])})`,
            opacity: enter,
          }}
        >
          <Img
            src={staticFile(`illustrations/${slide.kind === "intro" ? "fe_eyes.svg" : "fe_brain.svg"}`)}
            style={{ width: 300, height: 300 }}
          />
          {lines.map((l, i) => {
            const size = Math.min(120, Math.floor(940 / Math.max(1, charWidth(l))));
            return (
              <div
                key={i}
                style={{
                  marginTop: 40,
                  fontFamily,
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1.15,
                  color: i === lines.length - 1 ? "#ffe600" : "#fff",
                  WebkitTextStroke: `${size * 0.08}px #2a0a55`,
                  paintOrder: "stroke fill",
                }}
              >
                {l.replace(/。$/, "")}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  const Fig = { muller: Muller, ebbinghaus: Ebbinghaus, contrast: Contrast, cafe: Cafe, ponzo: Ponzo }[
    slide.kind
  ];
  const sec = countStart !== null && frame >= countStart && !answered ? 3 - Math.floor((frame - countStart) / fps) : null;
  const ring = countStart !== null ? clamp((frame - countStart) / COUNT) : 0;
  const qSize = Math.min(104, Math.floor(960 / Math.max(1, charWidth(slide.text))));
  return (
    <AbsoluteFill>
      <Background />
      <Header no={quizNo} total={total} />
      {/* 図の白い板 */}
      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.size,
          height: PANEL.size,
          borderRadius: 36,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: "10px solid #fff",
          transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
          opacity: enter,
        }}
      >
        <svg viewBox="0 0 1000 1000" width="100%" height="100%">
          <Fig r={r} labels={slide.labels} />
        </svg>
      </div>
      {/* カウントダウン */}
      {sec !== null ? (
        <div style={{ position: "absolute", right: 40, top: PANEL.y - 70, width: 190, height: 190 }}>
          <svg width={190} height={190}>
            <circle cx={95} cy={95} r={84} fill="#2a0a55" stroke="#fff" strokeWidth={8} />
            <circle
              cx={95}
              cy={95}
              r={84}
              fill="none"
              stroke="#ffe600"
              strokeWidth={12}
              strokeDasharray={`${2 * Math.PI * 84 * (1 - ring)} 1000`}
              transform="rotate(-90 95 95)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily,
              fontWeight: 900,
              fontSize: 110,
              color: "#fff",
            }}
          >
            {sec}
          </div>
        </div>
      ) : null}
      {/* 問題 → 答え */}
      <div style={{ position: "absolute", top: PANEL.y + PANEL.size + 40, left: 40, right: 40, textAlign: "center" }}>
        {!answered ? (
          <div
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: qSize,
              color: "#fff",
              WebkitTextStroke: `${qSize * 0.09}px #2a0a55`,
              paintOrder: "stroke fill",
              lineHeight: 1.2,
            }}
          >
            {slide.text}
          </div>
        ) : (
          <div
            style={{
              display: "inline-block",
              transform: `scale(${interpolate(ansPop, [0, 1], [2, 1])}) rotate(-3deg)`,
              opacity: clamp(ansPop * 3),
              fontFamily,
              fontWeight: 900,
              fontSize: Math.min(120, Math.floor(900 / Math.max(1, charWidth(slide.answer ?? "")))),
              color: "#fff",
              background: "#ff2d4f",
              padding: "8px 40px",
              borderRadius: 24,
              border: "8px solid #fff",
              boxShadow: "0 12px 0 rgba(0,0,0,0.4)",
            }}
          >
            {slide.answer}
          </div>
        )}
        {slide.explain && explainStart !== null && frame >= explainStart ? (
          <div
            style={{
              marginTop: 34,
              opacity: exPop,
              transform: `translateY(${interpolate(exPop, [0, 1], [30, 0])}px)`,
              fontFamily,
              fontWeight: 800,
              fontSize: 54,
              lineHeight: 1.35,
              color: "#fff",
              background: "rgba(0,0,0,0.45)",
              borderRadius: 24,
              padding: "16px 28px",
            }}
          >
            {slide.explain}
          </div>
        ) : null}
      </div>
      {/* 効果音：カウントダウンの「コッ」×3、答えの「ピンポーン」 */}
      {countStart !== null
        ? [0, 1, 2].map((k) => (
            <Sequence key={k} from={countStart + k * fps} durationInFrames={fps}>
              <Audio src={staticFile("sfx/tick.wav")} volume={0.6} />
            </Sequence>
          ))
        : null}
      {answerStart !== null ? (
        <Sequence from={answerStart}>
          <Audio src={staticFile("sfx/correct.wav")} volume={0.5} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
