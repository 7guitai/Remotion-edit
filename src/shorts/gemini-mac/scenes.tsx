import React from "react";
import { interpolate, OffthreadVideo, useCurrentFrame } from "remotion";
import { Pill, Sfx, useProgress, useRise, useSpring } from "../common/parts";
import { ShotFrame } from "../common/ShotFrame";
import { TimedScene } from "../common/timeline";
import { ASSET, C, GRAD, GRAD_TEXT, Scene, SHADOW, SHOTS, text } from "./theme";

type S = TimedScene<Scene>;

// 中央のステージ（ヘッダーとテロップの間）
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

// グラデーション文字
const GradText: React.FC<{ children: React.ReactNode; size: number; style?: React.CSSProperties }> = ({ children, size, style }) => (
  <span
    style={{
      ...text(size, C.ink),
      background: GRAD_TEXT,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);

// 「イメージ」ラベル（説明用の図であることを明示）
const ImageTag: React.FC = () => (
  <div style={{ position: "absolute", right: 14, top: 12, ...text(20, C.sub, 700), background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 10px 4px" }}>
    イメージ
  </div>
);

// Mac のウィンドウ枠（明るいテーマ）
const MacWindow: React.FC<{ width: number; height: number; title: string; children: React.ReactNode; dark?: boolean; badge?: string }> = ({
  width,
  height,
  title,
  children,
  dark,
  badge,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: 20,
      overflow: "hidden",
      background: dark ? "#111" : C.white,
      boxShadow: SHADOW,
      border: `1px solid ${dark ? "#333" : "#dcdbe8"}`,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        height: 46,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 16px",
        background: dark ? "#1d1d22" : "#f3f2f8",
        borderBottom: `1px solid ${dark ? "#333" : "#e3e1ee"}`,
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
      ))}
      <div style={{ flex: 1, textAlign: "center", ...text(22, dark ? "#aaa" : C.sub, 700), marginRight: 60 }}>{title}</div>
      {badge ? <Pill bg={C.purple} size={20}>{badge}</Pill> : null}
    </div>
    <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>{children}</div>
  </div>
);

// 公式デモ動画（Google 公式ブログ）を Mac 風の枠に入れる
const DemoVideo: React.FC<{ width: number; height: number; startSec: number; zoom?: number; originX?: number; originY?: number }> = ({
  width,
  height,
  startSec,
  zoom = 1,
  originX = 50,
  originY = 50,
}) => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, 120], [1, zoom], { extrapolateRight: "clamp" });
  return (
    <MacWindow width={width} height={height} title="Gemini（公式デモ動画）" dark badge="公式">
      <div style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: `${originX}% ${originY}%` }}>
        <OffthreadVideo src={ASSET("media/butterfly.mp4")} startFrom={Math.round(startSec * 30)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </MacWindow>
  );
};

// マウスカーソル
const Cursor: React.FC<{ x: number; y: number; click?: number }> = ({ x, y, click = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 5 }}>
    {click > 0 ? (
      <div
        style={{
          position: "absolute",
          left: -22,
          top: -22,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: `4px solid ${C.purple}`,
          opacity: 1 - click,
          transform: `scale(${0.5 + click})`,
        }}
      />
    ) : null}
    <svg width={34} height={34} viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}>
      <path d="M4 2l15 9.5-6.6 1.3L16 20l-2.8 1.3-3.6-7.2L4 18.5z" fill="#111" stroke="#fff" strokeWidth="1.4" />
    </svg>
  </div>
);

// ---------------- 1. つかみ：公式デモ → 一言で ----------------

export const HookScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const ansAt = scene.lines[1].from;
  const v = useRise(0, 60);
  const q = useSpring(8, { damping: 13 });
  const a = useSpring(ansAt + 2, { damping: 13 });
  return (
    <Stage>
      <Center top={0} style={v}>
        <DemoVideo width={W} height={560} startSec={19} zoom={1.15} />
      </Center>
      {frame < ansAt + 4 ? (
        <Center top={400} style={{ opacity: q * interpolate(frame, [ansAt, ansAt + 4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Card style={{ padding: "26px 46px 30px", transform: `scale(${0.9 + q * 0.1})` }}>
            <div style={{ ...text(66, C.ink), whiteSpace: "nowrap" }}>
              毎日の作業、<GradText size={66}>AIに任せたい</GradText>？
            </div>
          </Card>
        </Center>
      ) : null}
      {frame >= ansAt ? (
        <Center top={380} style={{ opacity: a, transform: `translateY(${(1 - a) * 50}px) scale(${0.92 + a * 0.08})` }}>
          <div style={{ background: C.deep, borderRadius: 30, padding: "26px 52px 32px", boxShadow: SHADOW, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: GRAD }} />
            <div style={{ ...text(30, C.sky, 700), textAlign: "center" }}>Gemini の新機能「computer use」</div>
            <div style={{ ...text(84, C.white), whiteSpace: "nowrap", textAlign: "center" }}>
              AIが<GradText size={84}>Macを操作</GradText>
            </div>
          </div>
        </Center>
      ) : null}
      <Sfx at={8} name="pop" volume={0.25} />
      <Sfx at={ansAt + 6} name="ding" volume={0.3} />
    </Stage>
  );
};

// ---------------- 2. 悩み：PDF → フォームへの手入力（イメージ） ----------------

const FIELDS = [
  { label: "住所", value: "東京都渋谷区…" },
  { label: "重さ", value: "2.4 kg" },
  { label: "サイズ", value: "40×30×20 cm" },
];

export const PainScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const r = useRise(0, 60);
  // カーソルが PDF とフォームを行ったり来たり
  const cycle = 34;
  const k = Math.floor(frame / cycle);
  const t = (frame % cycle) / cycle;
  const field = k % FIELDS.length;
  const goingRight = t < 0.5;
  const tt = goingRight ? t * 2 : (t - 0.5) * 2;
  const pdfPt = { x: 230, y: 160 + field * 92 };
  const formPt = { x: 720, y: 170 + field * 92 };
  const ease = (x: number) => x * x * (3 - 2 * x);
  const cx = goingRight ? pdfPt.x + (formPt.x - pdfPt.x) * ease(tt) : formPt.x + (pdfPt.x - formPt.x) * ease(tt);
  const cy = goingRight ? pdfPt.y + (formPt.y - pdfPt.y) * ease(tt) : formPt.y + (pdfPt.y - formPt.y) * ease(tt);
  const count = 12 + k;
  const tiredAt = scene.lines[1].from;
  const tired = useSpring(tiredAt, { damping: 12 });
  return (
    <Stage>
      <Center top={10} style={r}>
        <MacWindow width={W} height={540} title="見積もり作業（手作業）">
          <ImageTag />
          {/* PDF */}
          <div style={{ position: "absolute", left: 40, top: 40, width: 400, height: 420, background: "#fbfaff", border: `2px solid ${C.line}`, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ ...text(26, C.red), marginBottom: 10 }}>PDF　出荷情報.pdf</div>
            {FIELDS.map((f, i) => (
              <div key={f.label} style={{ padding: "14px 0", borderBottom: `2px solid ${C.line}`, background: i === field ? "rgba(145,104,240,0.12)" : undefined }}>
                <div style={text(20, C.sub, 700)}>{f.label}</div>
                <div style={text(28, C.ink)}>{f.value}</div>
              </div>
            ))}
          </div>
          {/* フォーム */}
          <div style={{ position: "absolute", left: 520, top: 40, width: 440, height: 420, background: C.white, border: `2px solid ${C.line}`, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ ...text(26, C.blue), marginBottom: 10 }}>見積もりフォーム</div>
            {FIELDS.map((f, i) => {
              const filled = i < field || (i === field && !goingRight);
              return (
                <div key={f.label} style={{ padding: "10px 0" }}>
                  <div style={text(20, C.sub, 700)}>{f.label}</div>
                  <div style={{ height: 46, border: `2px solid ${i === field ? C.purple : C.line}`, borderRadius: 10, padding: "6px 12px", ...text(24, C.ink, 700) }}>
                    {filled ? f.value.slice(0, i === field ? Math.ceil(f.value.length * tt) : undefined) : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <Cursor x={cx} y={cy} />
        </MacWindow>
      </Center>
      <div style={{ position: "absolute", right: 50, top: -16, transform: `rotate(4deg) scale(${frame >= tiredAt ? 1 + (1 - tired) * 0.3 : 1})` }}>
        <Pill bg={C.red} size={40} style={{ boxShadow: SHADOW }}>
          コピペ {count}回目…
        </Pill>
      </div>
      {[0, 34, 68, 102, 136].map((f) => (
        <Sfx key={f} at={f + 17} name="pop" volume={0.12} />
      ))}
    </Stage>
  );
};

// ---------------- 3. ニュース：公式ブログ ----------------

export const NewsScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const r = useRise(0, 60);
  const nameAt = scene.lines[1].from + 30;
  const n = useSpring(nameAt, { damping: 12 });
  return (
    <Stage>
      <Center top={10} style={r}>
        <ShotFrame
          src={ASSET("shots/blog.png")}
          meta={SHOTS.blog}
          focus={frame < scene.lines[1].from ? "Let Gemini tackle repetitive chores on your Mac" : "Nov 19, 2026"}
          // 日付を強調するときも、タイトルが見える範囲のまま（寄りすぎない）
          width={W}
          height={470}
          zoomAt={6}
          highlightAt={frame < scene.lines[1].from ? 14 : scene.lines[1].from + 4}
          zoomScale={frame < scene.lines[1].from ? 1.5 : 12}
          color={C.purple}
          label="公式ブログ"
          labelColor={C.deep}
        />
      </Center>
      {frame >= nameAt ? (
        <Center top={520} style={{ opacity: n, transform: `translateY(${(1 - n) * 40}px)` }}>
          <Card style={{ display: "flex", alignItems: "center", gap: 22, padding: "18px 36px" }}>
            <Pill bg={C.deep} color={C.sky} size={30}>
              2026/11/19 発表
            </Pill>
            <GradText size={60} style={{ whiteSpace: "nowrap" }}>computer use</GradText>
            <div style={{ ...text(28, C.sub, 700), whiteSpace: "nowrap" }}>（Mac版Gemini）</div>
          </Card>
        </Center>
      ) : null}
      <Sfx at={nameAt} name="ding" volume={0.3} />
    </Stage>
  );
};

// ---------------- 4. 使い方：公式デモ → 裏ウィンドウで動く（イメージ） ----------------

const BackgroundWorkMock: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame() - from;
  const typed = "来週の会議の資料をまとめる。売上は前年比で".slice(0, Math.max(0, Math.floor(frame / 2.2)));
  // 裏ウィンドウ（Gemini）の中のカーソル
  const pts = [
    { x: 60, y: 70 },
    { x: 220, y: 120 },
    { x: 120, y: 190 },
    { x: 260, y: 220 },
  ];
  const seg = Math.floor(frame / 20) % pts.length;
  const tt = (frame % 20) / 20;
  const a = pts[seg];
  const b = pts[(seg + 1) % pts.length];
  const cx = a.x + (b.x - a.x) * tt;
  const cy = a.y + (b.y - a.y) * tt;
  const rows = Math.min(4, 1 + Math.floor(frame / 25));
  return (
    <MacWindow width={W} height={580} title="あなたのMac">
      <ImageTag />
      {/* 自分の作業 */}
      <div style={{ position: "absolute", left: 30, top: 30, width: 560, height: 470, background: "#fbfbfe", borderRadius: 14, border: `2px solid ${C.line}`, padding: 24 }}>
        <div style={text(24, C.sub, 700)}>自分の作業（ふつうに使える）</div>
        <div style={{ ...text(30, C.ink, 700), marginTop: 18, lineHeight: 1.6 }}>
          {typed}
          <span style={{ color: C.purple }}>{frame % 16 < 8 ? "｜" : " "}</span>
        </div>
      </div>
      {/* Gemini の裏ウィンドウ（ライブプレビュー） */}
      <div style={{ position: "absolute", left: 620, top: 30, width: 350, height: 470, borderRadius: 16, background: C.deep, padding: 16, boxShadow: "0 10px 30px rgba(31,58,47,0.30)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: frame % 20 < 10 ? C.pink : C.purple }} />
          <div style={text(22, C.white, 700)}>Gemini が作業中</div>
        </div>
        <div style={{ position: "relative", marginTop: 14, height: 300, background: "#fff", borderRadius: 10, overflow: "hidden" }}>
          {new Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ margin: "14px 16px 0", height: 40, borderRadius: 8, border: `2px solid ${C.line}`, background: i < rows ? "rgba(79,126,240,0.12)" : "#fff" }} />
          ))}
          <div style={{ transform: "scale(0.8)", transformOrigin: "0 0", position: "absolute", left: 0, top: 0 }}>
            <Cursor x={cx} y={cy} click={(frame % 20) / 20} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <Pill bg="rgba(255,255,255,0.12)" color={C.white} size={22}>
            ▶ ライブ表示
          </Pill>
          <Pill bg="rgba(255,255,255,0.12)" color={C.white} size={22}>
            ❚❚ 一時停止
          </Pill>
        </div>
      </div>
    </MacWindow>
  );
};

export const DemoScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const l1 = scene.lines[1].from;
  const l2 = scene.lines[2].from;
  const r = useRise(0, 60);
  const mock = useSpring(l2, { damping: 18 });
  return (
    <Stage>
      {frame < l2 ? (
        <Center top={0} style={r}>
          {frame < l1 ? (
            // 「@Computer use」と打ち込む場面
            <DemoVideo width={W} height={580} startSec={11} zoom={1.25} originX={30} originY={40} />
          ) : (
            // Blender で蝶をモデリングしていく場面
            <DemoVideo width={W} height={580} startSec={21.5} zoom={1.1} />
          )}
        </Center>
      ) : (
        <Center top={0} style={{ opacity: mock, transform: `translateY(${(1 - mock) * 60}px)` }}>
          <BackgroundWorkMock from={l2} />
        </Center>
      )}
      <Center top={600}>
        <Pill bg={C.deep} color={C.white} size={34} style={{ boxShadow: SHADOW }}>
          {frame < l1 ? (
            <>
              書き方：やりたいこと ＋ <span style={{ color: C.sky }}>@Computer use</span>
            </>
          ) : frame < l2 ? (
            "子どもの絵 → Blender で3Dモデル化（公式デモ）"
          ) : (
            <>
              裏のウィンドウで動くので <span style={{ color: C.sky }}>自分の作業は止まらない</span>
            </>
          )}
        </Pill>
      </Center>
      <Sfx at={l1} name="pop" volume={0.25} />
    </Stage>
  );
};

// ---------------- 5. できること 4つ ----------------

const ICONS: React.ReactNode[] = [
  // フォーム
  <svg key="f" width={56} height={56} viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="#fff" strokeWidth="2" /><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>,
  // 写真
  <svg key="p" width={56} height={56} viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="9" cy="10" r="2" fill="#fff" /><path d="M4 18l5-5 4 4 3-3 4 4" stroke="#fff" strokeWidth="2" fill="none" /></svg>,
  // スライド
  <svg key="s" width={56} height={56} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="#fff" strokeWidth="2" /><path d="M12 16v4M8 20h8M7 12l3-3 3 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>,
  // タグ
  <svg key="t" width={56} height={56} viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /><circle cx="7.5" cy="8.5" r="1.6" fill="#fff" /></svg>,
];
const ICON_BG = [C.blue, C.purple, "#5fbf8f", "#3a8f6a"];

export const ExamplesScene: React.FC<{ scene: S }> = ({ scene }) => {
  const items = scene.examples ?? [];
  const span = scene.lines[0].duration;
  // セリフの読み上げ順に合わせる（フォーム → 写真 → スライド → 出品）
  const at = [4, span * 0.5, scene.lines[1].from + 2, scene.lines[1].from + 18];
  return (
    <Stage>
      <Center top={0}>
        <div style={{ ...text(56, C.ink), whiteSpace: "nowrap" }}>
          公式ブログの<GradText size={56}>活用例</GradText>
        </div>
      </Center>
      <div style={{ position: "absolute", top: 100, left: 40, width: W, display: "flex", flexWrap: "wrap", gap: 20 }}>
        {items.map((e, i) => {
          const s = useSpring(at[i], { damping: 13 });
          return (
            <Card key={e.title} style={{ width: 490, padding: "26px 26px 28px", opacity: s, transform: `translateY(${(1 - s) * 40}px) scale(${0.92 + s * 0.08})` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ width: 84, height: 84, borderRadius: 22, background: ICON_BG[i], display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ICONS[i]}
                </div>
                <div style={{ ...text(40, C.ink), whiteSpace: "nowrap" }}>{e.title}</div>
              </div>
              <div style={{ ...text(28, C.sub, 700), marginTop: 16, whiteSpace: "pre-line", lineHeight: 1.45 }}>{e.body}</div>
            </Card>
          );
        })}
      </div>
      {at.map((f, i) => (
        <Sfx key={i} at={f} name="pop" volume={0.22} />
      ))}
    </Stage>
  );
};

// ---------------- 6. 安全性：3つのしくみ ----------------

const Toggle: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ width: 70, height: 40, borderRadius: 20, background: on > 0.5 ? C.green : "#cfd0dc", position: "relative" }}>
    <div style={{ position: "absolute", top: 4, left: 4 + on * 30, width: 32, height: 32, borderRadius: 16, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
  </div>
);

export const SafetyScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const at = scene.lines[1].from;
  const dur = scene.lines[1].duration;
  // カードは最初から薄く見せておき、説明に合わせてくっきりさせる
  const s1 = useSpring(at + 2);
  const s2 = useSpring(at + dur * 0.45);
  const base = useSpring(2);
  const c1: React.CSSProperties = { opacity: base * (0.3 + s1 * 0.7), transform: `translateY(${(1 - base) * 40}px) scale(${0.97 + s1 * 0.03})` };
  const c2: React.CSSProperties = { opacity: base * (0.3 + s2 * 0.7), transform: `translateY(${(1 - base) * 40}px) scale(${0.97 + s2 * 0.03})` };
  const t1 = useProgress(at + 14, at + 20);
  const t2 = useProgress(at + 22, at + 28);
  const press = useSpring(at + dur * 0.45 + 30, { damping: 10 });
  const pressed = frame >= at + dur * 0.45 + 30;
  return (
    <Stage>
      <Center top={0}>
        <div style={{ ...text(56, C.ink), whiteSpace: "nowrap" }}>
          勝手には動かない<GradText size={56}>しくみ</GradText>
        </div>
      </Center>
      <div style={{ position: "absolute", top: 100, left: 40, width: W, ...c1 }}>
        <Card style={{ padding: "24px 34px" }}>
          <div style={{ ...text(36, C.ink), marginBottom: 12 }}>
            <span style={{ color: C.purple }}>①</span> 使っていいアプリを選ぶ
          </div>
          {[
            { name: "Google スライド", on: t1 },
            { name: "写真アプリ", on: t2 },
            { name: "メール", on: 0 },
          ].map((a) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div style={text(32, C.ink, 700)}>{a.name}</div>
              <Toggle on={a.on} />
            </div>
          ))}
        </Card>
      </div>
      <div style={{ position: "absolute", top: 410, left: 40, width: W, display: "flex", gap: 20, ...c2 }}>
        <Card style={{ flex: 1, padding: "22px 28px" }}>
          <div style={text(34, C.ink)}>
            <span style={{ color: C.purple }}>②</span> 全部ライブで見える
          </div>
          <div style={{ ...text(26, C.sub, 700), marginTop: 8 }}>いつでも一時停止できる</div>
        </Card>
        <Card style={{ flex: 1, padding: "22px 28px" }}>
          <div style={text(34, C.ink)}>
            <span style={{ color: C.purple }}>③</span> 大事な操作は承認
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <Pill bg={pressed ? C.green : C.blue} size={28} style={{ transform: `scale(${pressed ? 0.92 + press * 0.08 : 1})` }}>
              {pressed ? "✓ 許可しました" : "許可する"}
            </Pill>
            <Pill bg={C.line} color={C.sub} size={28}>
              やめる
            </Pill>
          </div>
        </Card>
      </div>
      <Sfx at={at + 2} name="pop" volume={0.22} />
      <Sfx at={at + 14} name="pop" volume={0.18} />
      <Sfx at={at + 22} name="pop" volume={0.18} />
      <Sfx at={at + dur * 0.45} name="pop" volume={0.22} />
      <Sfx at={at + dur * 0.45 + 30} name="ding" volume={0.3} />
    </Stage>
  );
};

// ---------------- 7. 注意点：使える条件 ----------------

const REQS = [
  { label: "地域・言語", value: "米国・英語のみ", bad: true },
  { label: "プラン", value: "Google AI Plus / Pro / Ultra", bad: false },
  { label: "Mac", value: "Apple シリコン・macOS 15 以降", bad: false },
  { label: "アカウント", value: "個人の Google アカウント・18歳以上", bad: false },
];

export const CaveatScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const at = scene.lines[1].from;
  const r = useRise(0, 50);
  const jp = useSpring(at + scene.lines[1].duration * 0.35, { damping: 11 });
  return (
    <Stage>
      <Center top={0} style={r}>
        <ShotFrame
          src={ASSET("shots/blog_req.png")}
          meta={SHOTS.blog_req}
          focus={frame < at ? "Computer use is rolling out in English in the U.S." : "Requires an Apple Silicon Mac"}
          width={W}
          height={300}
          zoomAt={4}
          highlightAt={frame < at ? 10 : at + 4}
          zoomScale={1.3}
          color={C.red}
          label="公式ブログ"
          labelColor={C.deep}
        />
      </Center>
      <div style={{ position: "absolute", top: 320, left: 40, width: W }}>
        <Card style={{ padding: "8px 30px" }}>
          {REQS.map((q, i) => {
            const s = useSpring(at + 2 + i * 7);
            return (
              <div
                key={q.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "12px 0",
                  borderBottom: i < REQS.length - 1 ? `2px solid ${C.line}` : undefined,
                  opacity: 0.25 + s * 0.75,
                  transform: `translateX(${(1 - s) * 20}px)`,
                }}
              >
                <div style={{ ...text(26, C.sub, 700), width: 150 }}>{q.label}</div>
                <div style={{ ...text(32, q.bad ? C.red : C.ink), whiteSpace: "nowrap" }}>{q.value}</div>
              </div>
            );
          })}
        </Card>
      </div>
      {frame >= at + scene.lines[1].duration * 0.35 ? (
        <div style={{ position: "absolute", right: 34, top: 300, transform: `scale(${jp}) rotate(-4deg)` }}>
          <Pill bg={C.red} size={34} style={{ boxShadow: SHADOW }}>
            日本はまだ（11/24時点）
          </Pill>
        </div>
      ) : null}
      {REQS.map((_, i) => (
        <Sfx key={i} at={at + 2 + i * 7} name="pop" volume={0.18} />
      ))}
    </Stage>
  );
};

// ---------------- 8. 今やっておくこと ----------------

const TODO = [
  { title: "Apple シリコンの Mac か確認", sub: "「このMacについて」で M1 以降ならOK" },
  { title: "macOS を Sequoia 15 以降に", sub: "システム設定 → ソフトウェアアップデート" },
  { title: "公式ブログで続報をチェック", sub: "日本・日本語への対応を待つ" },
];

export const PrepareScene: React.FC<{ scene: S }> = ({ scene }) => {
  const at = scene.lines[1].from;
  const span = scene.lines[1].duration;
  const head = useRise(0, 30);
  return (
    <Stage>
      <Center top={0} style={head}>
        <div style={{ ...text(56, C.ink), whiteSpace: "nowrap" }}>
          日本に来る前に<GradText size={56}>やっておくこと</GradText>
        </div>
      </Center>
      <div style={{ position: "absolute", top: 110, left: 40, width: W }}>
        {TODO.map((t, i) => {
          const r = useRise(at + 4 + (span * 0.7 * i) / TODO.length, 40);
          return (
            <Card key={t.title} style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 30px", marginBottom: 18, ...r }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  background: GRAD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...text(36, C.white),
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ ...text(40, C.ink), whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ ...text(26, C.sub, 700), whiteSpace: "nowrap" }}>{t.sub}</div>
              </div>
            </Card>
          );
        })}
      </div>
      {TODO.map((_, i) => (
        <Sfx key={i} at={at + 4 + (span * 0.7 * i) / TODO.length} name="pop" volume={0.22} />
      ))}
    </Stage>
  );
};

// ---------------- 9. まとめ ----------------

export const SummaryScene: React.FC<{ scene: S }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const head = useSpring(2, { damping: 12 });
  const saveAt = scene.lines[1].from;
  const save = useSpring(saveAt + 2, { damping: 13 });
  return (
    <Stage>
      <Center top={60} style={{ opacity: head, transform: `scale(${0.9 + head * 0.1})` }}>
        <div style={{ textAlign: "center" }}>
          <div style={text(40, C.sub)}>AIは「答える」から</div>
          <div style={{ marginTop: 6 }}>
            <GradText size={120} style={{ lineHeight: 1.1 }}>
              「操作する」へ
            </GradText>
          </div>
        </div>
      </Center>
      {frame >= saveAt ? (
        <Center top={400} style={{ opacity: save, transform: `translateY(${(1 - save) * 40}px) scale(${0.9 + save * 0.1})` }}>
          <div style={{ background: C.deep, borderRadius: 26, padding: "22px 46px 26px", boxShadow: SHADOW, display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: GRAD }} />
            <svg width={52} height={52} viewBox="0 0 24 24">
              <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1z" fill={C.sky} />
            </svg>
            <div style={text(52, C.white)}>保存して、続報を待とう</div>
          </div>
        </Center>
      ) : null}
      <Sfx at={2} name="ding" volume={0.3} />
      <Sfx at={saveAt + 2} name="pop" volume={0.3} />
    </Stage>
  );
};

export const SCENES: Record<Scene["type"], React.FC<{ scene: S }>> = {
  hook: HookScene,
  pain: PainScene,
  news: NewsScene,
  demo: DemoScene,
  examples: ExamplesScene,
  safety: SafetyScene,
  caveat: CaveatScene,
  prepare: PrepareScene,
  summary: SummaryScene,
};


