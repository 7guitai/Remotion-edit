import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily, minchoFamily } from "../theme";
import { SemiScene } from "./SemiScene";

// 論文で読み解く心理学（横長 1920×1080）。和モダンのデザイン：
// 和紙の地に、青海波（せいがいは）の模様、金の二重の枠。色は 藍・朱・金・桜。見出しと字幕は明朝体。
// visual が前のスライドと同じとき（enter=false）は登場アニメをしない（同じ図のまま話が続く）
export type PaperVisual =
  | { kind: "title"; title: string[]; sub?: string; kicker?: string }
  | { kind: "chapter"; no: number; title: string; sub?: string }
  | { kind: "scene"; place: string; left: Person; right: Person; show?: ("left" | "right")[] }
  | { kind: "paper"; authors: string; year: string; journal: string; title: string; points: string[] }
  | { kind: "stat"; value: number; unit?: string; label: string; sub?: string; color?: string }
  | { kind: "bars"; title: string; rows: { label: string; value: number; color?: string }[]; unit?: string; max?: number; note?: string }
  | { kind: "concept"; term: string; en?: string; desc: string; label?: string }
  | { kind: "versus"; left: { title: string; body: string }; right: { title: string; body: string } }
  | { kind: "rule"; no: number; title: string; body: string }
  | { kind: "list"; title: string; items: string[] }
  // 図解パネル（半導体のアニメーション SemiScene を、金の枠の中に）
  | { kind: "semi"; mode: import("./SemiScene").SemiMode; title?: string }
  // 年表（左から順に出てくる）
  // いらすとや などのイラスト（public/illustrations/）。caption はイラストの下の短い説明
  | { kind: "image"; src: string; caption?: string; src2?: string; caption2?: string }
  | { kind: "timeline"; items: { year: string; title: string; sub?: string; color?: string }[] };

// emoji は public/illustrations/ の画像（いらすとやの表情など）
type Person = { emoji: string; name: string; thought?: string; color: string };

export type PaperSlide = {
  type: "paper";
  text: string;
  speech?: string;
  visual: PaperVisual;
  enter?: boolean;
  tag?: string;
};

export const WA = {
  paper: "#f5eddc",
  paper2: "#ece0c8",
  ai: "#1f3a5f",
  ai2: "#2f5d8a",
  shu: "#c8442f",
  kin: "#b08d3c",
  sakura: "#d0607a",
  sumi: "#2b2622",
  wakatake: "#4f8a6b",
  card: "#fffaf0",
};
const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

// 青海波（重なった半円の波）の模様
const Seigaiha: React.FC<{ id: string; color: string; size?: number }> = ({ id, color, size = 56 }) => (
  <pattern id={id} width={size} height={size / 2} patternUnits="userSpaceOnUse">
    {[0, 1].map((row) =>
      [0, 1, 2].map((col) => {
        const cx = col * size - (row ? size / 2 : 0) + size / 2;
        const cy = row * (size / 4) + size / 2;
        return [0.5, 0.38, 0.26, 0.14].map((r, k) => (
          <circle key={`${row}-${col}-${k}`} cx={cx - size / 2} cy={cy - size / 4} r={size * r} fill={k === 0 ? WA.paper : "none"} stroke={color} strokeWidth={1.6} />
        ));
      }),
    )}
  </pattern>
);

export const WashiBackground: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #faf4e6 0%, ${WA.paper} 55%, ${WA.paper2} 100%)` }}>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        {/* 和紙の繊維のざらつき */}
        <filter id="washi">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={7} />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0.10 0" />
        </filter>
        <filter id="fiber">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves={2} seed={3} />
          <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0.07 0" />
        </filter>
        <Seigaiha id="sg" color="rgba(31,58,95,0.22)" />
        <radialGradient id="fadeTL" cx="0" cy="0" r="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fadeBR" cx="1" cy="1" r="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="mTL">
          <rect width={720} height={480} fill="url(#fadeTL)" />
        </mask>
        <mask id="mBR">
          <rect x={1200} y={600} width={720} height={480} fill="url(#fadeBR)" transform="translate(0,0)" />
        </mask>
      </defs>
      <rect width={1920} height={1080} filter="url(#fiber)" />
      <rect width={1920} height={1080} filter="url(#washi)" />
      <rect width={720} height={480} fill="url(#sg)" mask="url(#mTL)" />
      <rect x={1200} y={600} width={720} height={480} fill="url(#sg)" mask="url(#mBR)" />
      {/* 金の二重の枠 */}
      <rect x={22} y={22} width={1876} height={1036} fill="none" stroke={WA.kin} strokeWidth={3} />
      <rect x={32} y={32} width={1856} height={1016} fill="none" stroke={WA.kin} strokeWidth={1} opacity={0.7} />
      {/* 四すみの飾り */}
      {[
        [22, 22, 1, 1],
        [1898, 22, -1, 1],
        [22, 1058, 1, -1],
        [1898, 1058, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${sx},${sy})`}>
          <path d="M0 60 L0 0 L60 0" fill="none" stroke={WA.kin} strokeWidth={6} />
          <rect x={14} y={14} width={14} height={14} fill={WA.shu} transform="rotate(45 21 21)" />
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);

// 見た目の切りかえ：wa＝和モダン（明朝・和紙のカード）、pop＝掛け合い解説（丸ゴシック・白いカード）
// 1本の動画の中では同じスタイルしか使わないので、ページ（PaperPage / TalkPage）が描く前に設定する
let SKIN: "wa" | "pop" = "wa";
export const setPaperSkin = (s: "wa" | "pop") => {
  SKIN = s;
};

const mincho = (size: number, color: string = WA.sumi, weight = 800): React.CSSProperties => ({
  fontFamily: SKIN === "pop" ? fontFamily : minchoFamily,
  fontWeight: weight,
  fontSize: size,
  color,
});

// 和紙のカード（藍の線と、内側に金の細線）
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; line?: string }> = ({ children, style, line = WA.ai }) =>
  SKIN === "pop" ? (
    <div style={{ background: "#fff", border: `6px solid ${line}`, borderRadius: 28, boxShadow: "0 10px 0 rgba(0,0,0,0.12)", ...style }}>{children}</div>
  ) : (
  <div
    style={{
      background: WA.card,
      border: `3px solid ${line}`,
      outline: `1px solid ${WA.kin}`,
      outlineOffset: -12,
      borderRadius: 6,
      boxShadow: "0 18px 40px rgba(60,40,10,0.18)",
      ...style,
    }}
  >
    {children}
  </div>
);

// 朱色の判子（はんこ）
const Seal: React.FC<{ children: React.ReactNode; size?: number; round?: boolean }> = ({ children, size = 44, round }) =>
  SKIN === "pop" ? (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: round ? 0 : "6px 22px",
        width: round ? size * 2.6 : undefined,
        height: round ? size * 2.6 : undefined,
        borderRadius: 999,
        background: "#ff6f61",
        color: "#fff",
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.1,
        boxShadow: "0 5px 0 #c94c40",
      }}
    >
      {children}
    </div>
  ) : (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: round ? 0 : "4px 14px",
      width: round ? size * 2.6 : undefined,
      height: round ? size * 2.6 : undefined,
      borderRadius: round ? "50%" : 6,
      border: `4px solid ${WA.shu}`,
      color: WA.shu,
      ...mincho(size, WA.shu),
      lineHeight: 1.1,
      transform: "rotate(-4deg)",
      background: "rgba(200,68,47,0.06)",
    }}
  >
    {children}
  </div>
);

export const Visual: React.FC<{ v: PaperVisual; enter: boolean }> = ({ v, enter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = (delay: number) => (enter ? spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } }) : 1);
  const a = sp(0);
  const a2 = sp(10);
  const a3 = sp(20);
  const lift = (p: number) => ({ opacity: p, transform: `translateY(${(1 - p) * 36}px)` });

  switch (v.kind) {
    case "title":
      return (
        <div style={{ textAlign: "center", ...lift(a) }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 34 }}>
            <div style={{ width: 120, height: 2, background: WA.kin }} />
            <div style={{ ...mincho(40, WA.kin, 700), letterSpacing: 8 }}>{v.kicker ?? "論文で読み解く 恋愛心理学"}</div>
            <div style={{ width: 120, height: 2, background: WA.kin }} />
          </div>
          {v.title.map((t, i) => (
            <div key={i} style={{ ...mincho(i === v.title.length - 1 ? 120 : 96, i === v.title.length - 1 ? WA.shu : WA.ai), lineHeight: 1.3, letterSpacing: 4 }}>
              {t}
            </div>
          ))}
          {v.sub ? <div style={{ ...mincho(40, WA.sumi, 700), marginTop: 36, ...lift(a2) }}>{v.sub}</div> : null}
        </div>
      );
    case "chapter":
      return (
        <div style={{ textAlign: "center", ...lift(a) }}>
          <Seal size={70} round>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.05 }}>
              <span style={{ fontSize: 40 }}>第</span>
              <span>{KANJI[v.no] ?? v.no}</span>
              <span style={{ fontSize: 40 }}>章</span>
            </div>
          </Seal>
          <div style={{ ...mincho(92, WA.ai), marginTop: 40, lineHeight: 1.35, whiteSpace: "pre-line", letterSpacing: 4, ...lift(a2) }}>{v.title}</div>
          {v.sub ? <div style={{ ...mincho(40, WA.kin, 700), marginTop: 26, ...lift(a3) }}>{v.sub}</div> : null}
        </div>
      );
    case "scene": {
      const show = v.show ?? ["left", "right"];
      const person = (p: Person, side: "left" | "right", d: number) => {
        const t = sp(d);
        const visible = show.includes(side);
        const tint = side === "left" ? "rgba(47,93,138,0.13)" : "rgba(208,96,122,0.14)";
        return (
          <div style={{ width: 760, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ height: 190, display: "flex", alignItems: "flex-end" }}>
              {p.thought && visible ? (
                <div
                  style={{
                    position: "relative",
                    background: "#fff",
                    ...mincho(40, WA.sumi),
                    lineHeight: 1.5,
                    padding: "22px 40px",
                    borderRadius: 60,
                    border: `3px solid ${p.color}`,
                    boxShadow: "0 10px 24px rgba(60,40,10,0.15)",
                    whiteSpace: "pre-line",
                    textAlign: "center",
                    opacity: t,
                    transform: `scale(${0.85 + 0.15 * t})`,
                  }}
                >
                  {p.thought}
                  <div style={{ position: "absolute", bottom: -30, left: "50%", width: 22, height: 22, borderRadius: 11, background: "#fff", border: `3px solid ${p.color}` }} />
                  <div style={{ position: "absolute", bottom: -52, left: "calc(50% + 14px)", width: 12, height: 12, borderRadius: 6, background: "#fff", border: `3px solid ${p.color}` }} />
                </div>
              ) : null}
            </div>
            <div style={{ position: "relative", width: 300, height: 290, marginTop: 44, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div style={{ position: "absolute", left: 20, right: 20, top: 30, bottom: 0, borderRadius: "50%", background: tint }} />
              <Img src={staticFile(`illustrations/${p.emoji}`)} style={{ position: "relative", height: 280, objectFit: "contain", opacity: visible ? 1 : 0.4, filter: visible ? "none" : "grayscale(0.6)" }} />
            </div>
            <div style={{ marginTop: 4, ...mincho(34, "#fff"), background: p.color, padding: "2px 28px", borderRadius: 4, letterSpacing: 6 }}>{p.name}</div>
          </div>
        );
      };
      return (
        <div style={{ width: 1720, opacity: a, transform: `translateY(${(1 - a) * 36}px)` }}>
          <div style={{ textAlign: "center", ...mincho(32, WA.kin, 700), letterSpacing: 6 }}>{`― ${v.place} ―`}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {person(v.left, "left", 8)}
            {person(v.right, "right", 20)}
          </div>
        </div>
      );
    }
    case "paper":
      return (
        <Card style={{ width: 1500, padding: "50px 72px", ...lift(a) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Seal size={34}>論文</Seal>
            <div style={{ ...mincho(50, WA.ai) }}>{`${v.authors}（${v.year}）`}</div>
          </div>
          <div style={{ fontFamily: minchoFamily, fontWeight: 700, fontSize: 32, color: WA.kin, marginTop: 20, fontStyle: "italic", lineHeight: 1.4 }}>{v.title}</div>
          <div style={{ fontFamily, fontWeight: 500, fontSize: 26, color: "#7a6a52", marginTop: 6 }}>{v.journal}</div>
          <div style={{ height: 0, borderTop: `2px dashed ${WA.kin}`, margin: "28px 0" }} />
          {v.points.map((p, i) => {
            const t = sp(14 + i * 10);
            return (
              <div key={i} style={{ display: "flex", gap: 18, ...mincho(40, WA.sumi, 700), marginTop: i ? 18 : 0, opacity: t, lineHeight: 1.45 }}>
                <span style={{ color: WA.shu }}>◆</span>
                <span>{p}</span>
              </div>
            );
          })}
        </Card>
      );
    case "stat": {
      const shown = enter ? interpolate(frame, [6, 40], [0, v.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : v.value;
      return (
        <div style={{ textAlign: "center", ...lift(a) }}>
          <div style={{ ...mincho(48, WA.ai), letterSpacing: 4 }}>{v.label}</div>
          <div style={{ ...mincho(270, v.color ?? WA.shu), lineHeight: 1.1 }}>
            {Math.round(shown)}
            <span style={{ fontSize: 110 }}>{v.unit ?? ""}</span>
          </div>
          <div style={{ width: 420, height: 3, background: WA.kin, margin: "0 auto" }} />
          {v.sub ? <div style={{ ...mincho(40, WA.sumi, 700), marginTop: 18, ...lift(a2) }}>{v.sub}</div> : null}
        </div>
      );
    }
    case "bars": {
      const max = v.max ?? Math.max(...v.rows.map((r) => r.value));
      return (
        <Card style={{ width: 1500, padding: "46px 70px", ...lift(a) }}>
          <div style={{ ...mincho(48, WA.ai), marginBottom: 34, display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ width: 14, height: 44, background: WA.shu, display: "inline-block" }} />
            {v.title}
          </div>
          {v.rows.map((r, i) => {
            const g = enter ? interpolate(frame, [8 + i * 8, 34 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
            const e = 1 - (1 - g) ** 3;
            const c = r.color ?? WA.ai2;
            return (
              <div key={r.label} style={{ display: "flex", alignItems: "center", marginTop: i ? 22 : 0 }}>
                <div style={{ width: 400, ...mincho(36, WA.sumi) }}>{r.label}</div>
                <div style={{ flex: 1, height: 64, background: "#efe4cd", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                  <div style={{ width: `${(r.value / max) * 100 * e}%`, height: "100%", background: c, borderRadius: 4 }} />
                </div>
                <div style={{ width: 180, textAlign: "right", ...mincho(52, c) }}>
                  {Number.isInteger(r.value) ? Math.round(r.value * e) : (r.value * e).toFixed(1)}
                  <span style={{ fontSize: 28 }}>{v.unit ?? "%"}</span>
                </div>
              </div>
            );
          })}
          {v.note ? <div style={{ fontFamily, fontSize: 26, color: "#7a6a52", marginTop: 28, ...lift(a3) }}>{v.note}</div> : null}
        </Card>
      );
    }
    case "concept":
      return (
        <Card style={{ width: 1420, padding: "40px 80px 44px", textAlign: "center", ...lift(a) }} line={WA.shu}>
          <Seal size={30}>{v.label ?? "心理用語"}</Seal>
          <div style={{ ...mincho(92, WA.ai), marginTop: 14, letterSpacing: 6 }}>{v.term}</div>
          {v.en ? <div style={{ fontFamily: minchoFamily, fontWeight: 700, fontSize: 32, color: WA.kin, fontStyle: "italic" }}>{v.en}</div> : null}
          <div style={{ width: 300, height: 2, background: WA.kin, margin: "18px auto" }} />
          <div style={{ ...mincho(40, WA.sumi, 700), lineHeight: 1.55, whiteSpace: "pre-line", ...lift(a2) }}>{v.desc}</div>
        </Card>
      );
    case "versus":
      return (
        <div style={{ display: "flex", gap: 56, alignItems: "stretch" }}>
          {[
            { s: v.left, c: WA.ai2, p: a },
            { s: v.right, c: WA.sakura, p: a3 },
          ].map(({ s, c, p }, i) => (
            <Card key={i} style={{ width: 720, padding: 0, overflow: "hidden", ...lift(p) }} line={c}>
              <div style={{ background: c, ...mincho(46, "#fff"), padding: "22px 40px", letterSpacing: 4 }}>{s.title}</div>
              <div style={{ ...mincho(s.body.length > 30 ? 36 : 42, WA.sumi, 700), padding: "34px 44px 40px", lineHeight: 1.6, whiteSpace: "pre-line" }}>{s.body}</div>
            </Card>
          ))}
        </div>
      );
    case "rule":
      return (
        <Card style={{ width: 1480, padding: "56px 76px", display: "flex", gap: 60, alignItems: "center", ...lift(a) }} line={WA.wakatake}>
          <Seal size={64} round>{KANJI[v.no]}</Seal>
          <div>
            <div style={{ ...mincho(34, WA.wakatake), letterSpacing: 8 }}>{`其の${KANJI[v.no]}`}</div>
            <div style={{ ...mincho(70, WA.ai), marginTop: 8, lineHeight: 1.3, whiteSpace: "pre-line" }}>{v.title}</div>
            <div style={{ ...mincho(38, WA.sumi, 700), marginTop: 22, lineHeight: 1.5, ...lift(a2) }}>{v.body}</div>
          </div>
        </Card>
      );
    case "semi":
      return (
        <div style={{ ...lift(a), display: "flex", flexDirection: "column", alignItems: "center" }}>
          {v.title ? <div style={{ ...mincho(40, WA.ai), marginBottom: 12, letterSpacing: 4 }}>{v.title}</div> : null}
          <div
            style={{
              width: 1080 * 0.92,
              height: 640 * 0.92,
              border: `4px solid ${WA.kin}`,
              outline: `2px solid ${WA.ai}`,
              outlineOffset: 6,
              borderRadius: 8,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 18px 40px rgba(60,40,10,0.25)",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 640, transform: "scale(0.92)", transformOrigin: "0 0" }}>
              <SemiScene mode={v.mode} width={1080} height={640} />
            </div>
          </div>
        </div>
      );
    case "image": {
      const one = (src: string, cap: string | undefined, d: number) => {
        const t = sp(d);
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: t, transform: `scale(${0.8 + 0.2 * t})` }}>
            <Img src={staticFile(`illustrations/${src}`)} style={{ height: v.src2 ? 420 : 520, maxWidth: 760, objectFit: "contain" }} />
            {cap ? <div style={{ ...mincho(48, WA.ai), marginTop: 14 }}>{cap}</div> : null}
          </div>
        );
      };
      return (
        <div style={{ display: "flex", gap: 120, alignItems: "flex-end" }}>
          {one(v.src, v.caption, 0)}
          {v.src2 ? one(v.src2, v.caption2, 12) : null}
        </div>
      );
    }
    case "timeline": {
      const n = v.items.length;
      const w = 1560;
      return (
        <div style={{ width: w, position: "relative", height: 470, ...lift(a) }}>
          <div style={{ position: "absolute", left: 40, right: 40, top: 190, height: 6, background: WA.kin, borderRadius: 3 }} />
          {v.items.map((it, i) => {
            const t = sp(8 + i * 14);
            const x = 40 + ((w - 80) * (i + 0.5)) / n;
            const c = it.color ?? WA.ai;
            return (
              <div key={i} style={{ position: "absolute", left: x - 180, width: 360, top: 0, textAlign: "center", opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
                <div style={{ ...mincho(64, c), lineHeight: 1.1 }}>{it.year}</div>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: `5px solid ${WA.card}`, margin: "96px auto 0", boxShadow: `0 0 0 3px ${c}` }} />
                <div style={{ ...mincho(38, WA.sumi), marginTop: 26, lineHeight: 1.35, whiteSpace: "pre-line" }}>{it.title}</div>
                {it.sub ? <div style={{ ...mincho(32, c, 700), marginTop: 10, whiteSpace: "pre-line" }}>{it.sub}</div> : null}
              </div>
            );
          })}
        </div>
      );
    }
    case "list":
      return (
        <Card style={{ width: 1460, padding: v.items.length > 4 ? "36px 76px" : "50px 76px", ...lift(a) }}>
          <div style={{ ...mincho(v.items.length > 4 ? 44 : 50, WA.shu), marginBottom: v.items.length > 4 ? 18 : 28, letterSpacing: 4 }}>{v.title}</div>
          {v.items.map((it, i) => {
            const t = sp(10 + i * 10);
            return (
              <div key={i} style={{ ...mincho(v.items.length > 4 ? 38 : 44, WA.sumi), marginTop: i ? (v.items.length > 4 ? 12 : 18) : 0, opacity: t, display: "flex", gap: 22, alignItems: "center" }}>
                <span
                  style={{ width: 54, height: 54, borderRadius: "50%", background: WA.ai, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, flex: "none" }}
                >
                  {KANJI[i + 1]}
                </span>
                <span>{it}</span>
              </div>
            );
          })}
        </Card>
      );
  }
};

export const PaperPage: React.FC<{ slide: PaperSlide; voiceFrames: number }> = ({ slide }) => {
  setPaperSkin("wa");
  const frame = useCurrentFrame();
  const enter = slide.enter !== false;
  const fadeText = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const big = slide.visual.kind === "title" || slide.visual.kind === "chapter";
  return (
    <AbsoluteFill>
      <WashiBackground />
      {slide.tag ? (
        <div style={{ position: "absolute", left: 70, top: 60, display: "flex", alignItems: "center", gap: 14, ...mincho(30, WA.ai) }}>
          <span style={{ width: 16, height: 16, background: WA.shu, transform: "rotate(45deg)", display: "inline-block" }} />
          {slide.tag}
        </div>
      ) : null}
      <AbsoluteFill style={{ top: big ? 0 : 70, height: big ? 1020 : 720, alignItems: "center", justifyContent: "center" }}>
        <Visual v={slide.visual} enter={enter} />
      </AbsoluteFill>
      {big ? null : (
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            bottom: 56,
            minHeight: 150,
            background: "rgba(31,58,95,0.93)",
            borderTop: `3px solid ${WA.kin}`,
            borderBottom: `3px solid ${WA.kin}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 70px",
          }}
        >
          <div style={{ ...mincho(slide.text.length > 40 ? 50 : 56, "#fffaf0"), textAlign: "center", lineHeight: 1.45, opacity: fadeText, letterSpacing: 1 }}>{slide.text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
