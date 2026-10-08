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


// ---- 上級編 ----

// ポッゲンドルフ錯視：棒の後ろを通る斜めの線。本当につながっているのは B（下の線）
const Poggendorff: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const y = (x: number) => 250 + 0.6 * (x - 100);
  const bar = 1 - 0.75 * clamp(r * 2);
  const draw = clamp(r * 1.4 - 0.2);
  return (
    <>
      <g stroke="#111" strokeWidth={12} strokeLinecap="round">
        <line x1={100} y1={y(100)} x2={420} y2={y(420)} />
        {/* A：本当の線より少し上にずらした線 */}
        <line x1={580} y1={y(580) - 75} x2={900} y2={y(900) - 75} />
        {/* B：本当の続き */}
        <line x1={580} y1={y(580)} x2={900} y2={y(900)} />
      </g>
      <rect x={400} y={60} width={200} height={880} fill="#8f9bb0" opacity={bar} />
      <line
        x1={100}
        y1={y(100)}
        x2={100 + 800 * draw}
        y2={y(100 + 800 * draw)}
        stroke="#ff2d2d"
        strokeWidth={8}
        strokeDasharray="20 12"
      />
      <Labels labels={labels} at={[[915, y(900) - 60], [915, y(900) + 22]]} />
    </>
  );
};

// ジャストロー錯視：同じ形の扇形を上下に並べる。下の図形が上へ動いて重なる
const sector = (cy: number) => {
  const r1 = 420;
  const r2 = 620;
  const a1 = (-120 * Math.PI) / 180;
  const a2 = (-60 * Math.PI) / 180;
  const p = (r: number, a: number) => `${500 + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  return `M ${p(r2, a1)} A ${r2} ${r2} 0 0 1 ${p(r2, a2)} L ${p(r1, a2)} A ${r1} ${r1} 0 0 0 ${p(r1, a1)} Z`;
};
const Jastrow: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const move = clamp((r - 0.15) / 0.85);
  const ease = move * move * (3 - 2 * move);
  return (
    <>
      <rect x={0} y={0} width={1000} height={1000} fill="#fbf7ee" />
      <path d={sector(840)} fill="#3a8dff" />
      <path d={sector(1150)} fill="#ff4a4a" />
      {move > 0 ? (
        <path
          d={sector(1150 - 310 * ease)}
          fill="none"
          stroke="#111"
          strokeWidth={8}
          strokeDasharray="18 10"
        />
      ) : null}
      <Labels labels={labels} at={[[60, 330], [60, 640]]} />
    </>
  );
};

// ムンカー錯視：同じ色の玉に、左は赤、右は青のしまを重ねる
const Munker: React.FC<{ r: number }> = ({ r }) => {
  const stripes = 1 - clamp(r * 1.5);
  const balls = [230, 500, 770];
  return (
    <>
      <rect x={0} y={0} width={1000} height={1000} fill="#fff" />
      {balls.map((y) => (
        <g key={y}>
          <circle cx={260} cy={y} r={110} fill="#c9a66b" />
          <circle cx={740} cy={y} r={110} fill="#c9a66b" />
        </g>
      ))}
      <g opacity={stripes}>
        {Array.from({ length: 42 }, (_, i) => (
          <g key={i}>
            <rect x={0} y={i * 24} width={498} height={12} fill="#ff1e3c" />
            <rect x={502} y={i * 24} width={498} height={12} fill="#1e5bff" />
          </g>
        ))}
      </g>
    </>
  );
};

// コーンスウィート錯視：境目のすぐ近くだけ明るさが変わっている。境目をかくすと左右は同じ
const Cornsweet: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const cover = clamp(r * 1.6);
  return (
    <>
      <defs>
        <linearGradient id="cw" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#808080" />
          <stop offset="0.3" stopColor="#808080" />
          <stop offset="0.4999" stopColor="#5c5c5c" />
          <stop offset="0.5001" stopColor="#a4a4a4" />
          <stop offset="0.7" stopColor="#808080" />
          <stop offset="1" stopColor="#808080" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1000} height={1000} fill="url(#cw)" />
      {/* 種明かし：上から黒い板がおりてきて、境目をかくす */}
      <rect x={290} y={0} width={420} height={1000 * cover} fill="#111" />
      <Labels labels={labels} at={[[150, 930], [850, 930]]} center />
    </>
  );
};

// シェパードのテーブル：左の天板を90度回すと、右の天板にぴったり重なる
const Shepard: React.FC<{ r: number; labels?: [string, string] }> = ({ r, labels }) => {
  const u: [number, number] = [70, -340];
  const v: [number, number] = [140, 46];
  const rot = (p: [number, number], deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  };
  const quad = (c: [number, number], deg: number) => {
    const uu = rot(u, deg);
    const vv = rot(v, deg);
    const o: [number, number] = [c[0] - (uu[0] + vv[0]) / 2, c[1] - (uu[1] + vv[1]) / 2];
    return [o, [o[0] + uu[0], o[1] + uu[1]], [o[0] + uu[0] + vv[0], o[1] + uu[1] + vv[1]], [o[0] + vv[0], o[1] + vv[1]]] as [number, number][];
  };
  const pts = (q: [number, number][], dy = 0) => q.map(([x, y]) => `${x},${y + dy}`).join(" ");
  const table = (c: [number, number], deg: number) => {
    const q = quad(c, deg);
    // 下側の3つの角から脚をのばす（いちばん上の角以外）
    const top = q.reduce((m, p, i) => (p[1] < q[m][1] ? i : m), 0);
    return (
      <g>
        {q.map((p, i) =>
          i === top ? null : (
            <line key={i} x1={p[0]} y1={p[1] + 20} x2={p[0]} y2={p[1] + 190} stroke="#6b4423" strokeWidth={16} strokeLinecap="round" />
          ),
        )}
        <polygon points={pts(q, 22)} fill="#7a4b22" />
        <polygon points={pts(q)} fill="#d39a5c" stroke="#6b4423" strokeWidth={4} />
      </g>
    );
  };
  const A: [number, number] = [290, 470];
  const B: [number, number] = [700, 470];
  const move = clamp((r - 0.1) / 0.9);
  const ease = move * move * (3 - 2 * move);
  const c: [number, number] = [A[0] + (B[0] - A[0]) * ease, A[1] + (B[1] - A[1]) * ease];
  return (
    <>
      <rect x={0} y={0} width={1000} height={1000} fill="#f4efe6" />
      {table(A, 0)}
      {table(B, 90)}
      {move > 0 ? (
        <polygon points={pts(quad(c, 90 * ease))} fill="none" stroke="#ff2d2d" strokeWidth={8} strokeDasharray="18 10" />
      ) : null}
      <Labels labels={labels} at={[[290, 900], [700, 900]]} center />
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

// 見出しの上の小さな文字と、タイトル横の札（エピソードの kicker / badge）
export const IllusionHeaderContext = React.createContext<{ kicker?: string; badge?: string }>({});

const Header: React.FC<{ no: number | null; total: number }> = ({ no, total }) => {
  const { kicker, badge } = React.useContext(IllusionHeaderContext);
  return (
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
      {kicker ?? "あなたの脳はだまされる？"}
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
      {badge ? (
        <span
          style={{
            display: "inline-block",
            marginLeft: 14,
            verticalAlign: "middle",
            fontSize: 56,
            color: "#fff",
            background: "#111",
            WebkitTextStroke: "0px",
            padding: "6px 18px",
            borderRadius: 14,
            border: "5px solid #ffe600",
            transform: "rotate(-6deg) translateY(-14px)",
            letterSpacing: 0,
          }}
        >
          {badge}
        </span>
      ) : null}
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
};

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

  const Fig = {
    muller: Muller,
    ebbinghaus: Ebbinghaus,
    contrast: Contrast,
    cafe: Cafe,
    ponzo: Ponzo,
    poggendorff: Poggendorff,
    jastrow: Jastrow,
    munker: Munker,
    cornsweet: Cornsweet,
    shepard: Shepard,
  }[
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
