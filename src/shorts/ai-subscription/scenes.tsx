import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { AppIcon, Panel, Pill, Sfx, ShotFrame, useRise, useSpring } from "./parts";
import { C, FONT, SHADOW } from "./theme";
import { Pick, SCRIPT, TimedScene } from "./timeline";

// 中央のステージ（ヘッダーとテロップの間）
export const STAGE_TOP = 350;
export const STAGE_HEIGHT = 710;
const W = 1000; // ステージ内の要素の幅

type ShotPick = Pick & { shot: "chatgpt" | "claude" | "google"; focus: string };

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", top: STAGE_TOP, left: 0, width: 1080, height: STAGE_HEIGHT }}>{children}</div>
);

const Center: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", top, left: 0, width: 1080, display: "flex", justifyContent: "center", ...style }}>
    {children}
  </div>
);

const text = (size: number, color: string = C.ink, weight = 900): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  color,
  lineHeight: 1.25,
});

// ---------------- 1. つかみ ----------------

export const HookScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const answerAt = scene.lines[2].from;
  const shots = ["google", "claude", "chatgpt"] as const;
  const q = useRise(20);
  const ans = useSpring(answerAt + 2, { damping: 16 });
  const dim = interpolate(frame, [answerAt, answerAt + 8], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Stage>
      {shots.map((s, i) => {
        const p = useSpring(2 + i * 6, { damping: 16 });
        const rot = [-5, 4, -1][i];
        const dx = [-40, 40, 0][i];
        const dy = [0, 50, 110][i];
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: 40 + dx,
              top: dy,
              opacity: p * dim,
              transform: `translateY(${(1 - p) * 80}px) rotate(${rot}deg) scale(${0.86 + p * 0.04})`,
            }}
          >
            <ShotFrame shot={s} width={W} height={500} zoomAt={9999} highlightAt={9999} />
          </div>
        );
      })}
      {[2, 8, 14].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.25} />
      ))}

      <Center top={470} style={{ ...q, opacity: (q.opacity as number) * (frame >= answerAt ? dim : 1) }}>
        <Panel style={{ padding: "26px 54px 32px" }}>
          <div style={{ ...text(64), textAlign: "center", whiteSpace: "nowrap" }}>
            AIサブスク、<span style={{ color: C.red }}>どれ</span>を契約する？
          </div>
        </Panel>
      </Center>

      {frame >= answerAt ? (
        <Center top={190} style={{ opacity: ans, transform: `translateY(${(1 - ans) * 60}px) scale(${0.95 + ans * 0.05})` }}>
          <div style={{ background: C.dark, borderRadius: 32, padding: "38px 64px 46px", boxShadow: SHADOW, textAlign: "center" }}>
            <Pill bg={C.yellow} color={C.ink} size={38}>
              結論
            </Pill>
            <div style={{ ...text(104, C.white), marginTop: 18, whiteSpace: "nowrap" }}>
              目的別に<span style={{ color: C.yellow }}>1つ</span>でOK
            </div>
          </div>
        </Center>
      ) : null}
      <Sfx at={answerAt + 2} name="ding" volume={0.35} />
    </Stage>
  );
};

// ---------------- 2. 全部入れると高い ----------------

const RECEIPT = [
  { icon: "openai", color: "#10a37f", name: "ChatGPT Plus", price: 3000 },
  { icon: "claude", color: "#d97757", name: "Claude Pro", price: 3300 },
  { icon: "googlegemini", color: "#4f7ef0", name: "Google AI Pro", price: 2900 },
];

export const PainScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const card = useRise(0, 80);
  const totalAt = scene.lines[1].from;
  const tagAt = scene.lines[2].from + 2;
  const total = Math.round(
    interpolate(frame, [totalAt, totalAt + 20], [0, 9200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const tag = useSpring(tagAt, { damping: 12, stiffness: 220 });

  return (
    <Stage>
      <Center top={40} style={card}>
        <Panel style={{ width: 920, padding: "40px 56px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={text(48)}>3つ全部契約すると…</div>
            <div style={text(26, C.sub, 700)}>月額・税込の目安</div>
          </div>
          <div style={{ height: 3, background: C.line, margin: "22px 0 8px" }} />
          {RECEIPT.map((r, i) => {
            const s = useSpring(6 + i * 6);
            return (
              <div
                key={r.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "16px 0",
                  borderBottom: `2px solid ${C.line}`,
                  opacity: s,
                  transform: `translateX(${(1 - s) * 60}px)`,
                }}
              >
                <AppIcon icon={r.icon} color={r.color} size={66} />
                <div style={{ ...text(44), flex: 1 }}>{r.name}</div>
                <div style={text(48)}>¥{r.price.toLocaleString()}</div>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 20 }}>
            <div style={text(46)}>合計</div>
            <div style={{ ...text(110, frame >= totalAt ? C.red : C.line), letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              ¥{total.toLocaleString()}
              <span style={text(44, C.ink)}>/月</span>
            </div>
          </div>
        </Panel>
      </Center>
      {[6, 12, 18].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.25} />
      ))}
      <Sfx at={totalAt + 20} name="register" volume={0.45} />

      {frame >= tagAt ? (
        <div style={{ position: "absolute", right: 50, top: 0, transform: `scale(${tag}) rotate(3deg)` }}>
          <Pill bg={C.red} size={46} style={{ boxShadow: SHADOW, padding: "12px 32px 16px" }}>
            機能がかぶって もったいない
          </Pill>
        </div>
      ) : null}
      <Sfx at={tagAt} name="pop" volume={0.4} />
    </Stage>
  );
};

// ---------------- 3. 目的別3選 ----------------

export const IntroScene: React.FC<{ scene: TimedScene }> = () => {
  const title = useRise(0);
  const picks = Object.values(SCRIPT.picks);
  return (
    <Stage>
      <Center top={30} style={title}>
        <div style={{ textAlign: "center" }}>
          <Pill bg={C.brown} size={38}>
            2026年11月版
          </Pill>
          <div style={{ ...text(112), marginTop: 16, whiteSpace: "nowrap" }}>
            目的別 <span style={{ color: C.red }}>おすすめ3選</span>
          </div>
        </div>
      </Center>
      <Center top={320} style={{ gap: 26 }}>
        {picks.map((p, i) => {
          const r = useRise(14 + i * 6, 60);
          return (
            <Panel key={p.name} style={{ width: 316, padding: "30px 0 34px", textAlign: "center", ...r }}>
              <div style={text(34, p.color)}>{i + 1}つ目</div>
              <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 20px" }}>
                <AppIcon icon={p.icon} color={p.color} size={130} />
              </div>
              <div style={{ ...text(p.name.length > 11 ? 34 : 38), whiteSpace: "nowrap" }}>{p.name}</div>
            </Panel>
          );
        })}
      </Center>
      <Sfx at={0} name="whoosh" volume={0.3} />
      {[14, 20, 26].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.25} />
      ))}
    </Stage>
  );
};

// ---------------- 4〜6. おすすめ紹介（公式ページ＋情報カード） ----------------

const InfoStrip: React.FC<{ p: Pick; tagsAt: number; tagWindow: number }> = ({ p, tagsAt, tagWindow }) => {
  const r = useRise(6, 50);
  return (
    <Panel style={{ width: W, padding: "20px 32px 22px", ...r }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <AppIcon icon={p.icon} color={p.color} size={100} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={text(26, C.sub, 700)}>{p.maker}</div>
          <div style={{ ...text(p.name.length > 11 ? 50 : 56), whiteSpace: "nowrap" }}>{p.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...text(84, p.color), letterSpacing: "-0.02em", lineHeight: 1 }}>{p.price}</div>
          <div style={{ ...text(26, C.sub, 700), marginTop: 6, whiteSpace: "nowrap" }}>{p.priceSub}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        {p.tags.map((t, i) => {
          // セリフで読み上げるのに合わせて順に出す
          const at = tagsAt + 2 + (tagWindow * 0.7 * i) / p.tags.length;
          const s = useSpring(at, { damping: 14, stiffness: 220 });
          return (
            <div key={t} style={{ opacity: s, transform: `scale(${0.85 + s * 0.15})` }}>
              <Pill bg={`${p.color}18`} color={p.color} size={30} style={{ border: `3px solid ${p.color}` }}>
                ✓ {t}
              </Pill>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export const PickScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const p = SCRIPT.picks[scene.pick!] as ShotPick;
  const frame = useCurrentFrame();
  const enter = useSpring(0, { damping: 20 });
  const tagsAt = scene.lines[1].from;
  const badgeAt = scene.lines[2].from + 2;
  const badge = useSpring(badgeAt, { damping: 12, stiffness: 220 });

  return (
    <Stage>
      <Center top={0} style={{ opacity: enter, transform: `translateX(${(1 - enter) * 160}px)` }}>
        <div style={{ position: "relative" }}>
          <ShotFrame shot={p.shot} focus={p.focus} width={W} height={480} zoomAt={8} highlightAt={20} color={p.color} label="公式ページ" />
          <div style={{ position: "absolute", left: -12, top: -26 }}>
            <Pill bg={p.color} size={40} style={{ boxShadow: SHADOW }}>
              {p.rank}つ目
            </Pill>
          </div>
        </div>
      </Center>
      <Center top={496}>
        <InfoStrip p={p} tagsAt={tagsAt} tagWindow={scene.lines[1].duration} />
      </Center>
      {frame >= badgeAt ? (
        <div style={{ position: "absolute", right: 24, top: 440, transform: `scale(${badge}) rotate(-3deg)` }}>
          <Pill bg={C.dark} color={C.yellow} size={42} style={{ boxShadow: SHADOW, padding: "10px 30px 14px" }}>
            ★ {p.badge}
          </Pill>
        </div>
      ) : null}
      <Sfx at={0} name="whoosh" volume={0.35} />
      <Sfx at={20} name="pop" volume={0.3} />
      {p.tags.map((_, i) => (
        <Sfx key={i} at={tagsAt + 2 + (scene.lines[1].duration * 0.7 * i) / p.tags.length} name="pop" volume={0.25} />
      ))}
      <Sfx at={badgeAt} name="ding" volume={0.3} />
    </Stage>
  );
};

// ---------------- 7. 安く試すなら ----------------

export const BudgetScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const at = scene.lines[1].from;
  const frame = useCurrentFrame();
  const r = useRise(0, 60);
  const price = useSpring(at + 4, { damping: 12, stiffness: 200 });
  return (
    <Stage>
      <Center top={0} style={r}>
        <ShotFrame shot="google" focus="Google AI Plus" width={W} height={480} zoomAt={6} highlightAt={at + 2} color="#4f7ef0" label="公式ページ" />
      </Center>
      <Center top={496} style={r}>
        <Panel style={{ width: W, padding: "24px 36px", display: "flex", alignItems: "center", gap: 24 }}>
          <AppIcon icon="googlegemini" color="#4f7ef0" size={100} />
          <div style={{ flex: 1 }}>
            <div style={text(28, C.sub, 700)}>まず安く試すなら</div>
            <div style={{ ...text(54), whiteSpace: "nowrap" }}>Google AI Plus</div>
          </div>
          <div style={{ textAlign: "right", opacity: frame >= at ? 1 : 0, transform: `scale(${0.7 + price * 0.3})` }}>
            <div style={{ ...text(96, "#4f7ef0"), lineHeight: 1, letterSpacing: "-0.02em" }}>¥725</div>
            <div style={{ ...text(24, C.sub, 700), whiteSpace: "nowrap" }}>/月・400GBストレージ付き</div>
          </div>
        </Panel>
      </Center>
      <Sfx at={0} name="whoosh" volume={0.3} />
      <Sfx at={at + 4} name="ding" volume={0.35} />
    </Stage>
  );
};

// ---------------- 8. 向いている人・いない人 ----------------

const WHO = [
  { title: "契約すべき人", color: C.green, mark: "◎", items: ["毎日使う", "仕事で使う", "資料・長文を作る"] },
  { title: "無料で十分な人", color: C.gray, mark: "△", items: ["週に数回だけ", "ちょっと聞くだけ", "まずは試したい"] },
];

export const WhoScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const at = scene.lines[1].from;
  const dur = scene.lines[1].duration;
  return (
    <Stage>
      <Center top={10} style={{ gap: 28, alignItems: "flex-start" }}>
        {WHO.map((col, ci) => {
          const r = useRise(ci * 5, 60);
          return (
            <Panel key={col.title} style={{ width: 486, overflow: "hidden", ...r }}>
              <div style={{ background: col.color, ...text(46, C.white), textAlign: "center", padding: "22px 0 26px" }}>
                {col.title}
              </div>
              <div style={{ padding: "12px 34px 24px", minHeight: 400 }}>
                {col.items.map((item, i) => {
                  // 左の列はセリフの前半、右の列は後半に合わせて出す
                  const t = at + 2 + (ci === 0 ? i * 6 : dur * 0.5 + i * 6);
                  const p = useSpring(t);
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 18,
                        padding: "26px 0",
                        borderBottom: i < col.items.length - 1 ? `2px solid ${C.line}` : undefined,
                        opacity: p,
                        transform: `translateX(${(1 - p) * 50}px)`,
                      }}
                    >
                      <span style={text(46, col.color)}>{col.mark}</span>
                      <span style={{ ...text(42), whiteSpace: "nowrap" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </Center>
      <Sfx at={0} name="whoosh" volume={0.3} />
      {[0, 6, 12].map((d) => (
        <Sfx key={`l${d}`} at={at + 2 + d} name="pop" volume={0.22} />
      ))}
      {[0, 6, 12].map((d) => (
        <Sfx key={`r${d}`} at={at + 2 + dur * 0.5 + d} name="pop" volume={0.22} />
      ))}
    </Stage>
  );
};

// ---------------- 9. まとめ ----------------

const SUMMARY = [
  { when: "迷ったら", pick: "chatgpt" },
  { when: "仕事の文章", pick: "claude" },
  { when: "Google派", pick: "gemini" },
];

export const SummaryScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const head = useRise(0);
  const dur = scene.lines[0].duration;
  const saveAt = scene.lines[2].from;
  const save = useSpring(saveAt + 2, { damping: 14, stiffness: 200 });
  return (
    <Stage>
      <Center top={0} style={head}>
        <div style={{ ...text(80), whiteSpace: "nowrap" }}>
          <span style={{ color: C.red }}>まとめ</span>：目的で選ぶ
        </div>
      </Center>
      {SUMMARY.map((row, i) => {
        const p = SCRIPT.picks[row.pick];
        const r = useRise(4 + (dur * i) / 3, 50);
        return (
          <div key={row.pick} style={{ position: "absolute", top: 140 + i * 160, left: 40, ...r }}>
            <Panel style={{ width: W, height: 136, display: "flex", alignItems: "center", overflow: "hidden" }}>
              <div style={{ width: 14, alignSelf: "stretch", background: p.color }} />
              <div style={{ width: 290, paddingLeft: 34, ...text(44), whiteSpace: "nowrap" }}>{row.when}</div>
              <div style={{ ...text(40, C.gray), marginRight: 26 }}>→</div>
              <AppIcon icon={p.icon} color={p.color} size={84} />
              <div style={{ ...text(p.name.length > 11 ? 48 : 52), marginLeft: 22, whiteSpace: "nowrap" }}>{p.name}</div>
            </Panel>
          </div>
        );
      })}
      {SUMMARY.map((_, i) => (
        <Sfx key={i} at={4 + (dur * i) / 3} name="pop" volume={0.25} />
      ))}

      {frame >= saveAt ? (
        <Center top={620} style={{ opacity: save, transform: `translateY(${(1 - save) * 40}px)` }}>
          <Pill bg={C.dark} color={C.white} size={46} style={{ boxShadow: SHADOW, padding: "14px 40px 18px" }}>
            <BookmarkIcon size={46} />
            保存して、契約前に見返そう
          </Pill>
        </Center>
      ) : null}
      <Sfx at={saveAt + 2} name="ding" volume={0.35} />
    </Stage>
  );
};

const BookmarkIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1z" fill={C.yellow} />
  </svg>
);

export const SCENES: Record<string, React.FC<{ scene: TimedScene }>> = {
  hook: HookScene,
  pain: PainScene,
  intro: IntroScene,
  pick: PickScene,
  budget: BudgetScene,
  who: WhoScene,
  summary: SummaryScene,
};
