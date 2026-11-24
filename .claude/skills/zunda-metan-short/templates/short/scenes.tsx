import React from "react";
import { useCurrentFrame } from "remotion";
import { Pill, Sfx, useRise, useSpring } from "../common/parts";
import { TimedScene } from "../common/timeline";
import { C, FONT, Scene, SHADOW, text } from "./theme";

// シーンの部品。動画ごとに自由に足したり作り替えたりする（ai-subscription / orca が実例）
type S = TimedScene<Scene>;

// 中央のステージ（ヘッダーとテロップの間：y=360〜1060）
const STAGE_TOP = 360;
const STAGE_H = 700;
const W = 1000;

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", top: STAGE_TOP, left: 0, width: 1080, height: STAGE_H }}>{children}</div>
);

const Center: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", top, left: 0, width: 1080, display: "flex", justifyContent: "center", ...style }}>
    {children}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 26, boxShadow: SHADOW, ...style }}>{children}</div>
);

// ---------------- つかみ：問いかけ → 答え ----------------

export const HookScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const ansAt = scene.lines[1]?.from ?? 60;
  const q = useRise(4, 50);
  const a = useSpring(ansAt + 2, { damping: 14 });
  return (
    <Stage>
      <Center top={140} style={{ ...q, opacity: frame < ansAt ? 1 : 0.35 }}>
        <Card style={{ padding: "34px 54px", textAlign: "center" }}>
          <div style={{ ...text(76, C.ink), whiteSpace: "nowrap" }}>{scene.question}</div>
        </Card>
      </Center>
      {frame >= ansAt ? (
        <Center top={330} style={{ opacity: a, transform: `translateY(${(1 - a) * 50}px)` }}>
          <div style={{ background: C.deep, borderRadius: 30, padding: "30px 60px 38px", boxShadow: SHADOW, textAlign: "center" }}>
            <Pill bg={C.accent2} color={C.ink} size={36}>
              結論
            </Pill>
            <div style={{ ...text(96, C.white), marginTop: 14, whiteSpace: "nowrap" }}>{scene.answer}</div>
          </div>
        </Center>
      ) : null}
      <Sfx at={4} name="pop" volume={0.25} />
      <Sfx at={ansAt + 2} name="ding" volume={0.35} />
    </Stage>
  );
};

// ---------------- ポイント：番号つき見出し＋要点リスト ----------------

export const PointsScene: React.FC<{ scene: S }> = ({ scene }) => {
  const head = useRise(0, 30);
  const items = scene.points ?? [];
  const from = 12;
  const last = scene.lines[scene.lines.length - 1];
  const span = Math.max(30, last.end - from - 20);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 40, top: 0, display: "flex", alignItems: "flex-end", gap: 18, ...head }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 120, lineHeight: 0.9, color: "transparent", WebkitTextStroke: `4px ${C.accent}` }}>
          {String(scene.no ?? 1).padStart(2, "0")}
        </div>
        <div style={{ ...text(64, C.ink), paddingBottom: 6, whiteSpace: "nowrap" }}>{scene.title}</div>
      </div>
      <Center top={170}>
        <Card style={{ width: W, padding: "16px 36px" }}>
          {items.map((p, i) => {
            const s = useSpring(from + (span * i) / items.length);
            return (
              <div
                key={p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "22px 0",
                  borderBottom: i < items.length - 1 ? `2px solid ${C.line}` : undefined,
                  opacity: s,
                  transform: `translateX(${(1 - s) * 40}px)`,
                }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 23, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", ...text(28, C.white) }}>
                  ✓
                </div>
                <div style={{ ...text(46, C.ink), whiteSpace: "nowrap" }}>{p}</div>
              </div>
            );
          })}
        </Card>
      </Center>
      {items.map((_, i) => (
        <Sfx key={i} at={from + (span * i) / items.length} name="pop" volume={0.22} />
      ))}
    </Stage>
  );
};

// ---------------- 比較：向いてる人／今のままでOK ----------------

export const CompareScene: React.FC<{ scene: S }> = ({ scene }) => {
  const at = scene.lines[1]?.from ?? 30;
  const dur = scene.lines[1]?.duration ?? 60;
  const cols = [
    { ...scene.left!, color: C.good, mark: "◎" },
    { ...scene.right!, color: C.gray, mark: "△" },
  ];
  return (
    <Stage>
      <Center top={10} style={{ gap: 28, alignItems: "flex-start" }}>
        {cols.map((col, ci) => {
          const r = useRise(ci * 5, 60);
          return (
            <Card key={col.title} style={{ width: 486, overflow: "hidden", ...r }}>
              <div style={{ background: col.color, ...text(44, C.white), textAlign: "center", padding: "20px 0 24px" }}>{col.title}</div>
              <div style={{ padding: "10px 32px 22px", minHeight: 360 }}>
                {col.items.map((item, i) => {
                  const p = useSpring(at + 2 + (ci === 0 ? i * 6 : dur * 0.5 + i * 6));
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "24px 0",
                        borderBottom: i < col.items.length - 1 ? `2px solid ${C.line}` : undefined,
                        opacity: p,
                        transform: `translateX(${(1 - p) * 40}px)`,
                      }}
                    >
                      <span style={text(44, col.color)}>{col.mark}</span>
                      <span style={{ ...text(40, C.ink), whiteSpace: "nowrap" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </Center>
    </Stage>
  );
};

// ---------------- まとめ：メッセージ＋保存の呼びかけ ----------------

export const SummaryScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const head = useRise(0);
  const saveAt = scene.lines[scene.lines.length - 1].from;
  const save = useSpring(saveAt + 2, { damping: 13 });
  return (
    <Stage>
      <Center top={120} style={head}>
        <div style={{ ...text(92, C.ink), whiteSpace: "nowrap" }}>{scene.message}</div>
      </Center>
      {frame >= saveAt ? (
        <Center top={360} style={{ opacity: save, transform: `translateY(${(1 - save) * 40}px) scale(${0.9 + save * 0.1})` }}>
          <div style={{ background: C.deep, borderRadius: 26, padding: "22px 46px 26px", boxShadow: SHADOW, display: "flex", alignItems: "center", gap: 20 }}>
            <svg width={52} height={52} viewBox="0 0 24 24">
              <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1z" fill={C.accent2} />
            </svg>
            <div style={text(52, C.white)}>保存して、あとで見返そう</div>
          </div>
        </Center>
      ) : null}
      <Sfx at={saveAt + 2} name="ding" volume={0.35} />
    </Stage>
  );
};

export const SCENES: Record<Scene["type"], React.FC<{ scene: S }>> = {
  hook: HookScene,
  points: PointsScene,
  compare: CompareScene,
  summary: SummaryScene,
};
