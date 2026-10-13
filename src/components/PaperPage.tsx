import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 論文で読み解く心理学（横長 1920×1080）。紺の背景・中央に図解・下に字幕。
// visual が前のスライドと同じとき（enter=false）は登場アニメをしない（同じ図のまま話が続く）
export type PaperVisual =
  | { kind: "title"; title: string[]; sub?: string }
  | { kind: "chapter"; no: number; title: string; sub?: string }
  | { kind: "scene"; place: string; left: Person; right: Person; show?: ("left" | "right")[] }
  | { kind: "paper"; authors: string; year: string; journal: string; title: string; points: string[] }
  | { kind: "stat"; value: number; unit?: string; label: string; sub?: string; color?: string }
  | { kind: "bars"; title: string; rows: { label: string; value: number; color?: string }[]; unit?: string; max?: number; note?: string }
  | { kind: "concept"; term: string; en?: string; desc: string }
  | { kind: "versus"; left: { title: string; body: string }; right: { title: string; body: string } }
  | { kind: "rule"; no: number; title: string; body: string }
  | { kind: "list"; title: string; items: string[] };

type Person = { emoji: string; name: string; thought?: string; color: string };

export type PaperSlide = {
  type: "paper";
  text: string;
  speech?: string;
  visual: PaperVisual;
  enter?: boolean;
  tag?: string;
};

const C = {
  bg1: "#0b1222",
  bg2: "#16213a",
  ink: "#f2f5fb",
  sub: "#9fb0cc",
  indigo: "#7c83ff",
  rose: "#ff6b8a",
  amber: "#ffc24b",
  green: "#3fd39a",
  cyan: "#47c8e8",
  card: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.14)",
};

const useIn = (enter: boolean, delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!enter) {
    return 1;
  }
  return spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
};

const Box: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.card, border: `2px solid ${C.line}`, borderRadius: 28, ...style }}>{children}</div>
);

const Visual: React.FC<{ v: PaperVisual; enter: boolean }> = ({ v, enter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useIn(enter);
  const a2 = useIn(enter, 10);
  const a3 = useIn(enter, 20);
  const lift = (p: number) => ({ opacity: p, transform: `translateY(${(1 - p) * 40}px)` });

  switch (v.kind) {
    case "title":
      return (
        <div style={{ textAlign: "center", ...lift(a) }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.amber, letterSpacing: 6, marginBottom: 30 }}>論文で読み解く 恋愛心理学</div>
          {v.title.map((t, i) => (
            <div key={i} style={{ fontSize: 108, fontWeight: 900, color: i === v.title.length - 1 ? C.rose : C.ink, lineHeight: 1.25 }}>{t}</div>
          ))}
          {v.sub ? <div style={{ fontSize: 40, color: C.sub, marginTop: 34, fontWeight: 500, ...lift(a2) }}>{v.sub}</div> : null}
        </div>
      );
    case "chapter":
      return (
        <div style={{ textAlign: "center", ...lift(a) }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: C.amber, letterSpacing: 10 }}>{`CHAPTER ${String(v.no).padStart(2, "0")}`}</div>
          <div style={{ width: 120, height: 5, background: C.amber, margin: "26px auto 34px", borderRadius: 3 }} />
          <div style={{ fontSize: 92, fontWeight: 900, color: C.ink, lineHeight: 1.3, whiteSpace: "pre-line" }}>{v.title}</div>
          {v.sub ? <div style={{ fontSize: 38, color: C.sub, marginTop: 28 }}>{v.sub}</div> : null}
        </div>
      );
    case "scene": {
      const show = v.show ?? ["left", "right"];
      const person = (p: Person, side: "left" | "right", d: number) => {
        const t = enter ? spring({ frame: frame - d, fps, config: { damping: 16 } }) : 1;
        const visible = show.includes(side);
        return (
          <div style={{ width: 720, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ height: 250, display: "flex", alignItems: "flex-end" }}>
              {p.thought && visible ? (
                <div
                  style={{
                    position: "relative",
                    maxWidth: 640,
                    background: "#fff",
                    color: "#1b2236",
                    fontSize: 38,
                    fontWeight: 800,
                    lineHeight: 1.45,
                    padding: "24px 32px",
                    borderRadius: 36,
                    border: `5px solid ${p.color}`,
                    whiteSpace: "pre-line",
                    textAlign: "center",
                    opacity: t,
                    transform: `scale(${0.85 + 0.15 * t})`,
                  }}
                >
                  {p.thought}
                  <div style={{ position: "absolute", bottom: -34, left: "50%", width: 26, height: 26, borderRadius: 13, background: "#fff", border: `4px solid ${p.color}` }} />
                </div>
              ) : null}
            </div>
            <Img src={staticFile(`illustrations/${p.emoji}`)} style={{ width: 230, height: 230, marginTop: 44, opacity: visible ? 1 : 0.35 }} />
            <div style={{ marginTop: 10, fontSize: 40, fontWeight: 900, color: p.color }}>{p.name}</div>
          </div>
        );
      };
      return (
        <div style={{ width: 1700, ...lift(a) }}>
          <div style={{ textAlign: "center", fontSize: 34, color: C.sub, fontWeight: 700, marginBottom: 6 }}>{v.place}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {person(v.left, "left", 8)}
            {person(v.right, "right", 20)}
          </div>
        </div>
      );
    }
    case "paper":
      return (
        <Box style={{ width: 1500, padding: "46px 64px", ...lift(a) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ background: C.amber, color: "#1b1b1b", fontWeight: 900, fontSize: 30, padding: "6px 18px", borderRadius: 12 }}>論文</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: C.ink }}>{`${v.authors}（${v.year}）`}</div>
          </div>
          <div style={{ fontSize: 30, color: C.cyan, marginTop: 18, fontStyle: "italic", lineHeight: 1.4 }}>{v.title}</div>
          <div style={{ fontSize: 26, color: C.sub, marginTop: 8 }}>{v.journal}</div>
          <div style={{ height: 2, background: C.line, margin: "28px 0" }} />
          {v.points.map((p, i) => {
            const t = enter ? spring({ frame: frame - 14 - i * 10, fps, config: { damping: 18 } }) : 1;
            return (
              <div key={i} style={{ display: "flex", gap: 18, fontSize: 40, color: C.ink, fontWeight: 700, marginTop: i ? 16 : 0, opacity: t }}>
                <span style={{ color: C.amber }}>●</span>
                <span>{p}</span>
              </div>
            );
          })}
        </Box>
      );
    case "stat": {
      const shown = enter ? interpolate(frame, [6, 40], [0, v.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : v.value;
      const color = v.color ?? C.rose;
      return (
        <div style={{ textAlign: "center", ...lift(a) }}>
          <div style={{ fontSize: 46, fontWeight: 800, color: C.sub, marginBottom: 6 }}>{v.label}</div>
          <div style={{ fontSize: 260, fontWeight: 900, color, lineHeight: 1.05 }}>
            {Number.isInteger(v.value) ? Math.round(shown) : shown.toFixed(1)}
            <span style={{ fontSize: 110 }}>{v.unit ?? ""}</span>
          </div>
          {v.sub ? <div style={{ fontSize: 40, color: C.ink, marginTop: 10, fontWeight: 700, ...lift(a2) }}>{v.sub}</div> : null}
        </div>
      );
    }
    case "bars": {
      const max = v.max ?? Math.max(...v.rows.map((r) => r.value));
      return (
        <Box style={{ width: 1500, padding: "44px 64px", ...lift(a) }}>
          <div style={{ fontSize: 46, fontWeight: 900, color: C.ink, marginBottom: 30 }}>{v.title}</div>
          {v.rows.map((r, i) => {
            const g = enter ? interpolate(frame, [8 + i * 8, 34 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
            const e = 1 - (1 - g) ** 3;
            return (
              <div key={r.label} style={{ display: "flex", alignItems: "center", marginTop: i ? 22 : 0 }}>
                <div style={{ width: 380, fontSize: 36, fontWeight: 800, color: C.ink }}>{r.label}</div>
                <div style={{ flex: 1, height: 70, background: "rgba(255,255,255,0.05)", borderRadius: 14, position: "relative" }}>
                  <div style={{ width: `${(r.value / max) * 100 * e}%`, height: "100%", background: r.color ?? C.indigo, borderRadius: 14 }} />
                </div>
                <div style={{ width: 170, textAlign: "right", fontSize: 48, fontWeight: 900, color: r.color ?? C.indigo }}>
                  {Math.round(r.value * e)}
                  <span style={{ fontSize: 28 }}>{v.unit ?? "%"}</span>
                </div>
              </div>
            );
          })}
          {v.note ? <div style={{ fontSize: 28, color: C.sub, marginTop: 26, ...lift(a3) }}>{v.note}</div> : null}
        </Box>
      );
    }
    case "concept":
      return (
        <Box style={{ width: 1400, padding: "56px 70px", textAlign: "center", borderColor: C.amber, ...lift(a) }}>
          <div style={{ fontSize: 34, color: C.amber, fontWeight: 800, letterSpacing: 4 }}>KEYWORD</div>
          <div style={{ fontSize: 96, fontWeight: 900, color: C.ink, marginTop: 10 }}>{v.term}</div>
          {v.en ? <div style={{ fontSize: 32, color: C.sub, marginTop: 4, fontStyle: "italic" }}>{v.en}</div> : null}
          <div style={{ fontSize: 40, color: C.ink, marginTop: 30, lineHeight: 1.55, fontWeight: 600, ...lift(a2) }}>{v.desc}</div>
        </Box>
      );
    case "versus":
      return (
        <div style={{ display: "flex", gap: 50, alignItems: "stretch" }}>
          {[
            { s: v.left, c: C.cyan, p: a },
            { s: v.right, c: C.rose, p: a3 },
          ].map(({ s, c, p }, i) => (
            <Box key={i} style={{ width: 720, padding: "44px 48px", borderColor: c, ...lift(p) }}>
              <div style={{ fontSize: 46, fontWeight: 900, color: c }}>{s.title}</div>
              <div style={{ fontSize: 40, color: C.ink, marginTop: 24, lineHeight: 1.55, fontWeight: 700, whiteSpace: "pre-line" }}>{s.body}</div>
            </Box>
          ))}
        </div>
      );
    case "rule":
      return (
        <Box style={{ width: 1450, padding: "56px 70px", borderColor: C.green, display: "flex", gap: 56, alignItems: "center", ...lift(a) }}>
          <div style={{ fontSize: 200, fontWeight: 900, color: C.green, lineHeight: 1 }}>{v.no}</div>
          <div>
            <div style={{ fontSize: 34, color: C.green, fontWeight: 800, letterSpacing: 4 }}>{`RULE ${v.no}`}</div>
            <div style={{ fontSize: 70, fontWeight: 900, color: C.ink, marginTop: 6, lineHeight: 1.25 }}>{v.title}</div>
            <div style={{ fontSize: 38, color: C.sub, marginTop: 20, lineHeight: 1.5, fontWeight: 600, ...lift(a2) }}>{v.body}</div>
          </div>
        </Box>
      );
    case "list":
      return (
        <Box style={{ width: 1450, padding: "50px 70px", ...lift(a) }}>
          <div style={{ fontSize: 50, fontWeight: 900, color: C.amber, marginBottom: 26 }}>{v.title}</div>
          {v.items.map((it, i) => {
            const t = enter ? spring({ frame: frame - 10 - i * 10, fps, config: { damping: 18 } }) : 1;
            return (
              <div key={i} style={{ fontSize: 46, fontWeight: 800, color: C.ink, marginTop: i ? 20 : 0, opacity: t, display: "flex", gap: 20 }}>
                <span style={{ color: C.green }}>{`${i + 1}.`}</span>
                <span>{it}</span>
              </div>
            );
          })}
        </Box>
      );
  }
};

export const PaperPage: React.FC<{ slide: PaperSlide; voiceFrames: number }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const enter = slide.enter !== false;
  const fadeText = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const big = slide.visual.kind === "title" || slide.visual.kind === "chapter";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, ${C.bg2} 0%, ${C.bg1} 70%)`, fontFamily }}>
      {slide.tag ? (
        <div style={{ position: "absolute", left: 50, top: 36, fontSize: 30, fontWeight: 800, color: C.sub, borderLeft: `6px solid ${C.amber}`, paddingLeft: 16 }}>
          {slide.tag}
        </div>
      ) : null}
      <AbsoluteFill style={{ top: big ? 0 : 60, bottom: big ? 120 : 250, alignItems: "center", justifyContent: "center" }}>
        <Visual v={slide.visual} enter={enter} />
      </AbsoluteFill>
      {big ? null : (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            background: "linear-gradient(180deg, rgba(5,9,18,0) 0%, rgba(5,9,18,0.85) 30%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px 120px 0",
          }}
        >
          <div style={{ fontSize: slide.text.length > 40 ? 50 : 56, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.4, opacity: fadeText, textShadow: "0 3px 10px rgba(0,0,0,0.6)" }}>
            {slide.text}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
