import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Chip, LogoBubble, Outlined, Sfx, useSlam, useSpring } from "./parts";
import { BODY_FONT, C, HEAD_FONT } from "./theme";
import { SCRIPT, TimedScene } from "./timeline";

// 中央のステージ（ヘッダーとテロップの間）
export const STAGE_TOP = 330;
export const STAGE_HEIGHT = 760;

const Stage: React.FC<{ children: React.ReactNode; shake?: number }> = ({ children, shake = 0 }) => (
  <div
    style={{
      position: "absolute",
      top: STAGE_TOP,
      left: 0,
      width: 1080,
      height: STAGE_HEIGHT,
      transform: `translate(${shake}px, ${shake * 0.6}px)`,
    }}
  >
    {children}
  </div>
);

const center: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const PriceNote: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: -52,
      width: "100%",
      textAlign: "center",
      fontFamily: BODY_FONT,
      fontWeight: 900,
      fontSize: 24,
      color: "rgba(255,255,255,0.6)",
    }}
  >
    ※{SCRIPT.note}
  </div>
);

// ---------------- 1. つかみ ----------------

const HOOK_LOGOS = [
  { icon: "openai", color: "#10a37f", x: 170, y: 120, size: 170 },
  { icon: "claude", color: "#d97757", x: 900, y: 150, size: 160 },
  { icon: "googlegemini", color: "#4f7ef0", x: 140, y: 560, size: 150 },
  { icon: "perplexity", color: "#20808d", x: 920, y: 560, size: 140 },
];

export const HookScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const answerAt = scene.lines[2].from;
  const title = useSpring(4, { damping: 10 });
  const slam = useSlam(answerAt + 2);
  const away = interpolate(frame, [answerAt - 4, answerAt + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Stage shake={slam.shake}>
      {HOOK_LOGOS.map((l, i) => {
        const s = useSpring(2 + i * 5, { damping: 9 });
        const float = Math.sin((frame + i * 20) / 14) * 12;
        const dx = (l.x - 540) * away * 0.6;
        return (
          <div
            key={l.icon}
            style={{
              position: "absolute",
              left: l.x - l.size / 2 + dx,
              top: l.y - l.size / 2 + float,
              transform: `scale(${s * (1 - away * 0.35)}) rotate(${(i % 2 ? 1 : -1) * 8}deg)`,
              opacity: 1 - away * 0.6,
            }}
          >
            <LogoBubble icon={l.icon} color={l.color} size={l.size} />
          </div>
        );
      })}
      {/* はてなマーク */}
      {[
        { x: 330, y: 80, r: -14, d: 16 },
        { x: 760, y: 640, r: 12, d: 20 },
        { x: 560, y: 30, r: 6, d: 24 },
      ].map((q, i) => {
        const s = useSpring(q.d, { damping: 8 });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: q.x,
              top: q.y + Math.sin((frame + i * 9) / 10) * 8,
              transform: `scale(${s}) rotate(${q.r}deg)`,
              opacity: 1 - away,
            }}
          >
            <Outlined size={110} color={C.yellow}>
              ?
            </Outlined>
          </div>
        );
      })}
      <Sfx at={2} name="pop" volume={0.35} />
      <Sfx at={7} name="pop" volume={0.35} />
      <Sfx at={12} name="pop" volume={0.35} />
      <Sfx at={17} name="pop" volume={0.35} />

      {/* 問いかけ */}
      <div
        style={{
          ...center,
          top: 210,
          flexDirection: "column",
          transform: `scale(${title * (1 - away)})`,
          opacity: 1 - away,
        }}
      >
        <Outlined size={124}>AIサブスク</Outlined>
        <Outlined size={112} color={C.yellow} style={{ marginTop: 10 }}>
          どれ契約する？
        </Outlined>
      </div>

      {/* 答え：スタンプ */}
      {slam.visible ? (
        <div style={{ ...center, top: 170, opacity: slam.opacity, transform: `scale(${slam.scale}) rotate(-6deg)` }}>
          <div
            style={{
              background: C.red,
              border: `10px solid ${C.white}`,
              borderRadius: 40,
              padding: "36px 56px 44px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}
          >
            <Outlined size={84} stroke="#9d1530" style={{ lineHeight: 1.25 }}>
              {"目的別に"}
            </Outlined>
            <Outlined size={132} color={C.yellow} stroke="#9d1530" style={{ marginTop: 6 }}>
              1つでOK!
            </Outlined>
          </div>
        </div>
      ) : null}
      <Sfx at={answerAt + 4} name="stamp" volume={0.7} />
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
  const card = useSpring(0, { damping: 15 });
  const totalAt = scene.lines[1].from;
  const stampAt = scene.lines[2].from + 4;
  const total = Math.round(
    interpolate(frame, [totalAt, totalAt + 22], [0, 9200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const totalPop = useSpring(totalAt + 22, { damping: 8, stiffness: 300 });
  const slam = useSlam(stampAt);

  return (
    <Stage shake={slam.shake}>
      <div style={{ ...center, top: 20 }}>
        <div
          style={{
            width: 820,
            background: "#fffdf6",
            borderRadius: 28,
            padding: "40px 56px 44px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            transform: `translateY(${(1 - card) * 500}px) rotate(${-2 + card * 0}deg)`,
          }}
        >
          <div style={{ fontFamily: HEAD_FONT, fontSize: 52, color: C.ink, textAlign: "center", letterSpacing: "0.1em" }}>
            AIサブスク 明細
          </div>
          <div style={{ borderTop: `4px dashed #c9c4b2`, margin: "24px 0 12px" }} />
          {RECEIPT.map((r, i) => {
            const s = useSpring(6 + i * 7, { damping: 16 });
            return (
              <div
                key={r.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "16px 0",
                  opacity: s,
                  transform: `translateX(${(1 - s) * 120}px)`,
                }}
              >
                <LogoBubble icon={r.icon} color={r.color} size={78} filled />
                <div style={{ flex: 1, fontFamily: BODY_FONT, fontWeight: 900, fontSize: 46, color: C.ink }}>{r.name}</div>
                <div style={{ fontFamily: HEAD_FONT, fontSize: 52, color: C.ink }}>¥{r.price.toLocaleString()}</div>
              </div>
            );
          })}
          <div style={{ borderTop: `4px dashed #c9c4b2`, margin: "14px 0 18px" }} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontFamily: BODY_FONT, fontWeight: 900, fontSize: 50, color: C.ink }}>合計</div>
            <div
              style={{
                fontFamily: HEAD_FONT,
                fontSize: 104,
                color: frame >= totalAt ? "#e0243f" : "#c9c4b2",
                transform: `scale(${1 + (frame >= totalAt + 22 ? (1 - totalPop) * 0.25 : 0)})`,
                transformOrigin: "right center",
              }}
            >
              ¥{total.toLocaleString()}
              <span style={{ fontSize: 46 }}>/月</span>
            </div>
          </div>
        </div>
      </div>
      {[6, 13, 20].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.35} />
      ))}
      <Sfx at={totalAt + 22} name="register" volume={0.55} />

      {slam.visible ? (
        <div style={{ ...center, top: 170, opacity: slam.opacity, transform: `scale(${slam.scale}) rotate(-8deg)` }}>
          <div
            style={{
              border: `12px solid ${C.red}`,
              borderRadius: 24,
              padding: "6px 40px 14px",
              background: "rgba(255,240,243,0.9)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
            }}
          >
            <Outlined size={96} color={C.red} stroke={C.white} strokeWidth={6}>
              もったいない!
            </Outlined>
          </div>
        </div>
      ) : null}
      <Sfx at={stampAt + 2} name="stamp" volume={0.7} />
      <PriceNote />
    </Stage>
  );
};

// ---------------- 3. 目的別3選 ----------------

export const IntroScene: React.FC<{ scene: TimedScene }> = () => {
  const frame = useCurrentFrame();
  const a = useSpring(0, { damping: 10 });
  const b = useSlam(8);
  const picks = Object.values(SCRIPT.picks);
  return (
    <Stage shake={b.shake}>
      <div style={{ ...center, top: 40, transform: `scale(${a})` }}>
        <Chip bg={C.yellow} color={C.ink} size={60}>
          2026年11月版
        </Chip>
      </div>
      <div style={{ ...center, top: 150 }}>
        <Outlined size={130} style={{ transform: `translateX(${(1 - a) * -600}px)` }}>
          目的別
        </Outlined>
        {b.visible ? (
          <div style={{ transform: `scale(${b.scale})`, opacity: b.opacity, marginLeft: 20 }}>
            <Outlined
              size={250}
              color={C.yellow}
              style={{ filter: `drop-shadow(0 0 ${30 + Math.sin(frame / 5) * 10}px rgba(255,210,63,0.7))` }}
            >
              3選
            </Outlined>
          </div>
        ) : null}
      </div>
      <div style={{ ...center, top: 480, gap: 70 }}>
        {picks.map((p, i) => {
          const s = useSpring(20 + i * 6, { damping: 9 });
          return (
            <div key={p.name} style={{ transform: `scale(${s}) translateY(${Math.sin((frame + i * 12) / 12) * 8}px)`, position: "relative" }}>
              <LogoBubble icon={p.icon} color={p.color} size={190} />
              <div
                style={{
                  position: "absolute",
                  top: -26,
                  left: -26,
                  width: 82,
                  height: 82,
                  borderRadius: "50%",
                  background: p.color,
                  border: `6px solid ${C.white}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: HEAD_FONT,
                  fontSize: 46,
                  color: C.white,
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={10} name="stamp" volume={0.6} />
      {[20, 26, 32].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.35} />
      ))}
    </Stage>
  );
};

// ---------------- 4〜6. おすすめ紹介 ----------------

export const PickScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const p = SCRIPT.picks[scene.pick!];
  const enter = useSpring(0, { damping: 15, stiffness: 160 });
  const logo = useSpring(6, { damping: 8 });
  const price = useSpring(12, { damping: 10 });
  const tagsAt = scene.lines[1].from;
  const badge = useSlam(scene.lines[2].from + 2);
  const tagWindow = scene.lines[1].duration;

  return (
    <Stage shake={badge.shake}>
      {/* 背景の大きな順位 */}
      <div
        style={{
          position: "absolute",
          right: 30,
          top: -60,
          fontFamily: HEAD_FONT,
          fontSize: 420,
          color: "rgba(255,255,255,0.07)",
          transform: `translateX(${(1 - enter) * 300}px)`,
        }}
      >
        {p.rank}
      </div>
      <div style={{ ...center, top: 0, transform: `translateX(${(1 - enter) * 1100}px)` }}>
        <Chip bg={p.color} size={52} style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
          {p.rank}つ目
        </Chip>
      </div>
      <div style={{ ...center, top: 100, transform: `translateX(${(1 - enter) * 1100}px) rotate(${(1 - enter) * 8}deg)` }}>
        <div
          style={{
            width: 900,
            background: C.card,
            borderRadius: 48,
            overflow: "hidden",
            boxShadow: `0 30px 90px rgba(0,0,0,0.5), 0 0 0 8px ${p.color}`,
          }}
        >
          <div style={{ height: 22, background: p.color }} />
          <div style={{ display: "flex", alignItems: "center", gap: 34, padding: "36px 50px 10px" }}>
            <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -90}deg)` }}>
              <LogoBubble icon={p.icon} color={p.color} size={170} filled />
            </div>
            <div>
              <div style={{ fontFamily: BODY_FONT, fontWeight: 900, fontSize: 34, color: C.gray }}>{p.maker}</div>
              <div style={{ fontFamily: HEAD_FONT, fontSize: p.name.length > 11 ? 70 : 84, color: C.ink, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                {p.name}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              padding: "6px 0 4px",
              transform: `scale(${price})`,
            }}
          >
            <span style={{ fontFamily: HEAD_FONT, fontSize: 136, color: p.color, letterSpacing: "-0.02em" }}>{p.price}</span>
            <span style={{ fontFamily: BODY_FONT, fontWeight: 900, fontSize: 42, color: C.ink, marginLeft: 10 }}>{p.priceSub}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, padding: "6px 30px 40px", minHeight: 90 }}>
            {p.tags.map((t, i) => {
              // セリフで読み上げるのに合わせて順に出す
              const at = tagsAt + 2 + (tagWindow * 0.75 * i) / p.tags.length;
              const s = useSpring(at, { damping: 10 });
              return (
                <div key={t} style={{ transform: `scale(${s})`, opacity: Math.min(1, s * 2) }}>
                  <Chip bg={`${p.color}1f`} color={p.color} size={36} style={{ border: `4px solid ${p.color}` }}>
                    ✓ {t}
                  </Chip>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {badge.visible ? (
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 60,
            opacity: badge.opacity,
            transform: `scale(${badge.scale}) rotate(10deg)`,
          }}
        >
          <Chip
            bg={C.yellow}
            color={C.ink}
            size={50}
            style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.4)", border: `6px solid ${C.white}` }}
          >
            {p.badge}
          </Chip>
        </div>
      ) : null}
      <Sfx at={0} name="whoosh" volume={0.45} />
      <Sfx at={12} name="ding" volume={0.3} />
      {p.tags.map((_, i) => (
        <Sfx key={i} at={tagsAt + 2 + (tagWindow * 0.75 * i) / p.tags.length} name="pop" volume={0.35} />
      ))}
      <Sfx at={scene.lines[2].from + 4} name="stamp" volume={0.6} />
      <PriceNote />
    </Stage>
  );
};

// ---------------- 7. 安く試すなら ----------------

export const BudgetScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(0, { damping: 14 });
  const at = scene.lines[1].from;
  const price = Math.round(
    interpolate(frame, [at + 4, at + 22], [2900, 725], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const done = useSpring(at + 22, { damping: 7, stiffness: 300 });
  const reveal = frame >= at;
  return (
    <Stage>
      <div style={{ ...center, top: 10, transform: `scale(${enter})` }}>
        <Outlined size={96}>もっと安く試すなら？</Outlined>
      </div>
      <div style={{ ...center, top: 190, transform: `translateY(${(1 - enter) * 600}px)` }}>
        <div
          style={{
            width: 900,
            background: C.card,
            borderRadius: 48,
            padding: "40px 40px 46px",
            boxShadow: "0 30px 90px rgba(0,0,0,0.5), 0 0 0 8px #4f7ef0",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
            <LogoBubble icon="googlegemini" color="#4f7ef0" size={120} filled />
            <div style={{ fontFamily: HEAD_FONT, fontSize: 66, color: C.ink, whiteSpace: "nowrap" }}>Google AI Plus</div>
          </div>
          <div style={{ marginTop: 10, opacity: reveal ? 1 : 0.15, whiteSpace: "nowrap" }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: HEAD_FONT,
                fontSize: 150,
                color: "#4f7ef0",
                transform: `scale(${1 + (frame >= at + 22 ? (1 - done) * 0.3 : 0)})`,
              }}
            >
              ¥{price.toLocaleString()}
            </span>
            <span style={{ fontFamily: BODY_FONT, fontWeight: 900, fontSize: 52, color: C.ink }}>/月</span>
          </div>
          <Chip bg={C.yellow} color={C.ink} size={46} style={{ opacity: frame >= at + 22 ? 1 : 0 }}>
            いちばん安い有料プラン
          </Chip>
        </div>
      </div>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={at + 22} name="ding" volume={0.45} />
      <PriceNote />
    </Stage>
  );
};

// ---------------- 8. 向いている人・いない人 ----------------

const WHO = [
  { title: "契約すべき人", color: C.green, mark: "◎", items: ["毎日使う", "仕事で使う", "資料・長文を作る"] },
  { title: "無料で十分な人", color: "#8a90a8", mark: "△", items: ["週に数回だけ", "ちょっと聞くだけ", "まずは試したい"] },
];

export const WhoScene: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const at = scene.lines[1].from;
  const dur = scene.lines[1].duration;
  return (
    <Stage>
      <div style={{ ...center, top: 30, gap: 36, alignItems: "flex-start" }}>
        {WHO.map((col, ci) => {
          const s = useSpring(ci * 6, { damping: 13 });
          return (
            <div
              key={col.title}
              style={{
                width: 495,
                borderRadius: 40,
                background: C.card,
                overflow: "hidden",
                boxShadow: `0 24px 70px rgba(0,0,0,0.45), 0 0 0 7px ${col.color}`,
                transform: `translateY(${(1 - s) * 700}px)`,
              }}
            >
              <div
                style={{
                  background: col.color,
                  color: C.white,
                  fontFamily: HEAD_FONT,
                  fontSize: 50,
                  textAlign: "center",
                  padding: "22px 0 26px",
                }}
              >
                {col.title}
              </div>
              <div style={{ padding: "26px 30px 34px", minHeight: 420 }}>
                {col.items.map((item, i) => {
                  // 左の列はセリフの前半、右の列は後半に合わせて出す
                  const t = at + 2 + (ci === 0 ? i * 6 : dur * 0.5 + i * 6);
                  const p = useSpring(t, { damping: 11 });
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "18px 0",
                        borderBottom: i < col.items.length - 1 ? "3px solid #eceef5" : undefined,
                        opacity: p,
                        transform: `translateX(${(1 - p) * 80}px)`,
                      }}
                    >
                      <span style={{ fontFamily: HEAD_FONT, fontSize: 52, color: col.color }}>{col.mark}</span>
                      <span style={{ fontFamily: BODY_FONT, fontWeight: 900, fontSize: 40, color: C.ink, whiteSpace: "nowrap" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Sfx at={0} name="whoosh" volume={0.4} />
      {[0, 6, 12].map((d) => (
        <Sfx key={`l${d}`} at={at + 2 + d} name="pop" volume={0.3} />
      ))}
      {[0, 6, 12].map((d) => (
        <Sfx key={`r${d}`} at={at + 2 + dur * 0.5 + d} name="pop" volume={0.3} />
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
  const head = useSpring(0, { damping: 12 });
  const dur = scene.lines[0].duration;
  const saveAt = scene.lines[2].from;
  const save = useSlam(saveAt + 2);
  return (
    <Stage shake={save.shake}>
      <div style={{ ...center, top: 0, transform: `scale(${head})` }}>
        <Chip bg={C.yellow} color={C.ink} size={64} style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
          まとめ
        </Chip>
      </div>
      {SUMMARY.map((row, i) => {
        const p = SCRIPT.picks[row.pick];
        const s = useSpring(4 + (dur * i) / 3, { damping: 13 });
        return (
          <div
            key={row.pick}
            style={{
              position: "absolute",
              top: 140 + i * 175,
              left: 50,
              width: 980,
              height: 150,
              display: "flex",
              alignItems: "center",
              borderRadius: 34,
              background: C.card,
              boxShadow: `0 18px 50px rgba(0,0,0,0.4), inset 14px 0 0 ${p.color}`,
              opacity: s,
              transform: `translateX(${(1 - s) * 900}px)`,
            }}
          >
            <div style={{ width: 310, paddingLeft: 44, fontFamily: BODY_FONT, fontWeight: 900, fontSize: 46, color: C.ink, whiteSpace: "nowrap" }}>
              {row.when}
            </div>
            <div style={{ fontFamily: HEAD_FONT, fontSize: 56, color: p.color, marginRight: 24 }}>▶</div>
            <LogoBubble icon={p.icon} color={p.color} size={96} filled />
            <div style={{ fontFamily: HEAD_FONT, fontSize: p.name.length > 11 ? 50 : 56, color: C.ink, marginLeft: 18, whiteSpace: "nowrap" }}>
              {p.name}
            </div>
          </div>
        );
      })}
      {SUMMARY.map((_, i) => (
        <Sfx key={i} at={4 + (dur * i) / 3} name="pop" volume={0.35} />
      ))}

      {save.visible ? (
        <div
          style={{
            ...center,
            top: 230,
            opacity: save.opacity,
            transform: `scale(${save.scale * (1 + Math.sin((frame - saveAt) / 4) * 0.02)}) rotate(-5deg)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              background: C.yellow,
              border: `10px solid ${C.white}`,
              borderRadius: 40,
              padding: "28px 50px",
              boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
            }}
          >
            <BookmarkIcon size={130} />
            <div>
              <div style={{ fontFamily: HEAD_FONT, fontSize: 104, color: C.ink, lineHeight: 1.1 }}>保存して</div>
              <div style={{ fontFamily: HEAD_FONT, fontSize: 72, color: C.ink, lineHeight: 1.2 }}>見返そう!</div>
            </div>
          </div>
        </div>
      ) : null}
      <Sfx at={saveAt + 4} name="stamp" volume={0.6} />
      <PriceNote />
    </Stage>
  );
};

const BookmarkIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1z" fill={C.ink} />
    <path d="M9 8.5l2 2 4-4" stroke={C.yellow} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

