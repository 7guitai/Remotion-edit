import React from "react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { AppIcon, Pill, Sfx, useProgress, useRise, useSpring } from "../common/parts";
import { TimedScene } from "../common/timeline";
import { AppWindow } from "./AppWindow";
import { ASSET, C, FONT, OrcaScene, SHADOW, text } from "./theme";

type Scene = TimedScene<OrcaScene>;

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

// 機能の見出し：大きな番号（白抜き）＋機能名
const FeatureHead: React.FC<{ no: number; title: string }> = ({ no, title }) => {
  const r = useRise(0, 30);
  const s = useSpring(2, { damping: 12 });
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18, ...r }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 120,
          lineHeight: 0.9,
          color: "transparent",
          WebkitTextStroke: `4px ${C.sea}`,
          transform: `scale(${s})`,
          transformOrigin: "left bottom",
        }}
      >
        {String(no).padStart(2, "0")}
      </div>
      <div style={{ paddingBottom: 6 }}>
        <div style={text(26, C.sea)}>FEATURE {no}</div>
        <div style={{ ...text(64, C.ink), lineHeight: 1.1, whiteSpace: "nowrap" }}>{title}</div>
      </div>
    </div>
  );
};

// チェック付きの要点（セリフに合わせて順に出す）
const Points: React.FC<{ items: string[]; from: number; span: number; width?: number; side?: boolean }> = ({
  items,
  from,
  span,
  width = W,
  side = false,
}) => (
  <Card style={{ width, padding: side ? "14px 26px" : "12px 34px" }}>
    {items.map((p, i) => {
      const at = from + (span * i) / items.length;
      const s = useSpring(at);
      return (
        <div
          key={p}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "9px 0",
            borderBottom: i < items.length - 1 ? `2px solid ${C.line}` : undefined,
            opacity: s,
            transform: `translateX(${(1 - s) * 40}px)`,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: C.sea,
              color: C.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...text(26, C.white),
            }}
          >
            ✓
          </div>
          <div style={{ ...text(side ? 34 : 36, C.ink), whiteSpace: side ? "normal" : "nowrap" }}>{p}</div>
        </div>
      );
    })}
  </Card>
);

// ---------------- 1. つかみ ----------------

export const HookScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const ansAt = scene.lines[1].from;
  const win = useRise(0, 60);
  const q = useSpring(10, { damping: 14 });
  const a = useSpring(ansAt + 2, { damping: 14 });
  // 「待ってる」感：砂時計の点滅
  const dots = ".".repeat(1 + (Math.floor(frame / 8) % 3));
  return (
    <Stage>
      <Center top={10} style={win}>
        <AppWindow width={W} height={600} image="hero.jpg" zoom={{ x: 0.05, y: 0.02, w: 0.8 }} zoomAt={ansAt} />
      </Center>
      {frame < ansAt + 6 ? (
        <Center top={250} style={{ opacity: q * interpolate(frame, [ansAt, ansAt + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Card style={{ padding: "30px 48px", transform: `scale(${0.9 + q * 0.1})`, textAlign: "center" }}>
            <div style={text(30, C.sub, 700)}>エージェント 1体ずつ…</div>
            <div style={{ ...text(84, C.ink), whiteSpace: "nowrap" }}>
              待ち時間{dots}
            </div>
          </Card>
        </Center>
      ) : null}
      {frame >= ansAt ? (
        <Center top={420} style={{ opacity: a, transform: `translateY(${(1 - a) * 50}px)` }}>
          <div
            style={{
              background: C.deep,
              borderRadius: 28,
              padding: "26px 50px 32px",
              boxShadow: SHADOW,
              display: "flex",
              alignItems: "center",
              gap: 26,
              borderBottom: `8px solid ${C.aqua}`,
            }}
          >
            <Img src={ASSET("media/icon.png")} style={{ width: 110, height: 110 }} />
            <div style={{ ...text(76, C.white), whiteSpace: "nowrap" }}>
              <span style={{ color: C.aqua }}>同時に</span>何体も
            </div>
          </div>
        </Center>
      ) : null}
      <Sfx at={10} name="pop" volume={0.25} />
      <Sfx at={ansAt + 2} name="whoosh" volume={0.35} />
      <Sfx at={ansAt + 8} name="ding" volume={0.3} />
    </Stage>
  );
};

// ---------------- 2. 悩み：1つずつだと時間がかかる ----------------

const TASKS = ["バグ修正", "テスト追加", "リファクタ"];

export const PainScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const card = useRise(0, 60);
  const messAt = scene.lines[1].from;
  return (
    <Stage>
      <Center top={20} style={card}>
        <Card style={{ width: W, padding: "34px 40px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={text(46, C.ink)}>1つずつ頼むと…</div>
            <div style={text(24, C.sub, 700)}>イメージ</div>
          </div>
          <div style={{ marginTop: 26 }}>
            {TASKS.map((t, i) => {
              // 前のタスクが終わってから次が始まる
              const p = interpolate(frame, [8 + i * 14, 8 + (i + 1) * 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
                  <div style={{ ...text(34, C.ink), width: 190 }}>{t}</div>
                  <div style={{ flex: 1, height: 46, background: C.ice, borderRadius: 12, position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: `${i * 33.3}%`,
                        width: `${33.3 * p}%`,
                        height: "100%",
                        borderRadius: 12,
                        background: C.gray,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <Pill bg={C.coral} size={32}>
                待ち時間が積み重なる
              </Pill>
            </div>
          </div>
        </Card>
      </Center>
      {/* ターミナルが散らかる */}
      {["claude", "codex", "claude", "codex", "claude"].map((n, i) => {
        const s = useSpring(messAt + 2 + i * 4, { damping: 11 });
        const pos = [
          [60, 400, -6],
          [560, 380, 5],
          [300, 450, -2],
          [80, 540, 4],
          [600, 520, -4],
        ][i];
        if (frame < messAt) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos[0],
              top: pos[1],
              width: 420,
              transform: `scale(${s}) rotate(${pos[2]}deg)`,
              background: "#14181f",
              borderRadius: 14,
              boxShadow: SHADOW,
              padding: "12px 18px 16px",
              fontFamily: "monospace",
              fontSize: 26,
              color: "#cfd8e3",
            }}
          >
            <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />
              ))}
            </div>
            $ {n} <span style={{ color: C.aqua }}>{frame % 20 < 10 ? "█" : " "}</span>
            <div style={{ color: "#7b8794", fontSize: 22 }}>どれが何の作業…？</div>
          </div>
        );
      })}
      {[8, 22, 36].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.2} />
      ))}
      {[0, 4, 8, 12, 16].map((d) => (
        <Sfx key={`m${d}`} at={messAt + 2 + d} name="pop" volume={0.18} />
      ))}
    </Stage>
  );
};

// ---------------- 3. Orca とは ----------------

const FACTS = [
  { label: "無料・オープンソース", sub: "MIT License" },
  { label: "Mac / Windows / Linux", sub: "スマホアプリもあり" },
  { label: "34種類以上のエージェント", sub: "Claude Code・Codex など" },
];

export const IntroScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const icon = useSpring(0, { damping: 10 });
  const name = useRise(6);
  const factsAt = scene.lines[1].from;
  return (
    <Stage>
      <Center top={0} style={{ alignItems: "center", gap: 30 }}>
        <div style={{ transform: `scale(${icon}) rotate(${(1 - icon) * -30}deg)` }}>
          <Img src={ASSET("media/icon.png")} style={{ width: 200, height: 200, filter: "drop-shadow(0 16px 30px rgba(11,34,54,0.35))" }} />
        </div>
        <div style={name}>
          <div style={{ ...text(124, C.ink), lineHeight: 1 }}>Orca</div>
          <div style={{ ...text(38, C.sea), marginTop: 10 }}>AIエージェントの司令塔</div>
        </div>
      </Center>
      <div style={{ position: "absolute", top: 250, left: 40, width: W }}>
        {FACTS.map((f, i) => {
          const r = useRise(factsAt + 2 + i * 8, 40);
          return (
            <Card
              key={f.label}
              style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 34px", marginBottom: 18, ...r }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: C.deep,
                  color: C.aqua,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...text(34, C.aqua),
                }}
              >
                {i + 1}
              </div>
              <div style={{ ...text(46, C.ink), flex: 1, whiteSpace: "nowrap" }}>{f.label}</div>
              <div style={{ ...text(26, C.sub, 700), whiteSpace: "nowrap" }}>{f.sub}</div>
            </Card>
          );
        })}
        <div style={{ ...text(24, C.sub, 700), textAlign: "right", opacity: useSpring(factsAt + 30) }}>
          ※ Claude Code などエージェント本体の利用料は別途必要
        </div>
      </div>
      <Sfx at={0} name="whoosh" volume={0.3} />
      {[0, 8, 16].map((d) => (
        <Sfx key={d} at={factsAt + 2 + d} name="pop" volume={0.25} />
      ))}
    </Stage>
  );
};

// ---------------- 4. 機能紹介（実機デモ＋要点） ----------------

export const FeatureScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const win = useRise(4, 60);
  const last = scene.lines[scene.lines.length - 1];
  const pointsFrom = scene.lines[0].from + 10;
  const span = Math.max(30, last.end - pointsFrom - 20);
  const side = scene.layout === "side";
  return (
    <Stage>
      <div style={{ position: "absolute", left: 40, top: -10 }}>
        <FeatureHead no={scene.no!} title={scene.title!} />
      </div>
      {side ? (
        // 縦長の素材（スマホ）は、左に画面・右に要点
        <>
          <div style={{ position: "absolute", left: 40, top: 125, ...win }}>
            <AppWindow width={540} height={560} video={scene.video} zoom={scene.zoom} zoomAt={20} />
          </div>
          <div style={{ position: "absolute", left: 600, top: 125 }}>
            <Points items={scene.points ?? []} from={pointsFrom} span={span} width={440} side />
          </div>
        </>
      ) : (
        <>
          <Center top={125} style={win}>
            <AppWindow width={W} height={360} video={scene.video} zoom={scene.zoom} zoomAt={20} />
          </Center>
          <Center top={500}>
            <Points items={scene.points ?? []} from={pointsFrom} span={span} />
          </Center>
        </>
      )}
      <Sfx at={0} name="whoosh" volume={0.3} />
      {(scene.points ?? []).map((_, i) => (
        <Sfx key={i} at={pointsFrom + (span * i) / (scene.points ?? []).length} name="pop" volume={0.22} />
      ))}
    </Stage>
  );
};

// ---------------- 5. オーケストレーション（図解 → 実機） ----------------

const WORKERS = [
  { icon: "claude", color: "#d97757", name: "Claude Code", task: "税計算を修正" },
  { icon: "openai", color: "#10a37f", name: "Codex", task: "テストを追加" },
  { icon: "googlegemini", color: "#4f7ef0", name: "Antigravity", task: "画面を確認" },
];

export const OrchestrateScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const reportAt = scene.lines[2].from;
  const showVideo = frame >= reportAt - 2;
  const lead = useSpring(10, { damping: 12 });
  const v = useSpring(reportAt, { damping: 18 });
  const NODE_Y = 300;
  const xs = [190, 540, 890];
  return (
    <Stage>
      <div style={{ position: "absolute", left: 40, top: -10 }}>
        <FeatureHead no={scene.no!} title={scene.title!} />
      </div>
      <div style={{ opacity: showVideo ? 1 - v : 1 }}>
        {/* まとめ役 */}
        <Center top={150} style={{ transform: `scale(${lead})` }}>
          <div
            style={{
              background: C.deep,
              borderRadius: 24,
              padding: "16px 30px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              boxShadow: SHADOW,
            }}
          >
            <Img src={ASSET("media/icon.png")} style={{ width: 64, height: 64 }} />
            <div style={text(40, C.white)}>まとめ役のエージェント</div>
          </div>
        </Center>
        {/* 線：上から下へ仕事が配られる */}
        <svg width={1080} height={200} style={{ position: "absolute", top: 240, left: 0 }}>
          {xs.map((x, i) => {
            const p = interpolate(frame, [20 + i * 5, 40 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const back = interpolate(frame, [reportAt - 40, reportAt - 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const path = `M540 0 C540 40, ${x} 30, ${x} ${NODE_Y - 240 - 10}`;
            return (
              <g key={i}>
                <path d={path} stroke={C.sea} strokeWidth={6} fill="none" strokeDasharray="10 10" strokeDashoffset={-frame * 2} opacity={p} />
                {/* 仕事の小包（下へ） */}
                <circle
                  cx={interpolate(p, [0, 1], [540, x])}
                  cy={interpolate(p, [0, 1], [0, NODE_Y - 250])}
                  r={12}
                  fill={C.aqua}
                  opacity={p < 1 ? 1 : 0}
                />
                {/* 結果（上へ） */}
                <circle
                  cx={interpolate(back, [0, 1], [x, 540])}
                  cy={interpolate(back, [0, 1], [NODE_Y - 250, 0])}
                  r={12}
                  fill={C.green}
                  opacity={back > 0 && back < 1 ? 1 : 0}
                />
              </g>
            );
          })}
        </svg>
        {WORKERS.map((w, i) => {
          const s = useSpring(36 + i * 5, { damping: 11 });
          const done = frame >= reportAt - 40 + i * 6;
          return (
            <div
              key={w.name}
              style={{
                position: "absolute",
                left: xs[i] - 150,
                top: NODE_Y + 40,
                width: 300,
                transform: `scale(${s})`,
              }}
            >
              <Card style={{ padding: "22px 18px 24px", textAlign: "center", border: `4px solid ${done ? C.green : C.white}` }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <AppIcon icon={w.icon} color={w.color} size={84} />
                </div>
                <div style={{ ...text(32, C.ink), marginTop: 12, whiteSpace: "nowrap" }}>{w.name}</div>
                <div style={{ ...text(26, C.sub, 700), whiteSpace: "nowrap" }}>{w.task}</div>
                <div style={{ marginTop: 12 }}>
                  <Pill bg={done ? C.green : C.ice} color={done ? C.white : C.sea} size={24}>
                    {done ? "✓ 完了" : `作業中${".".repeat(1 + (Math.floor(frame / 8) % 3))}`}
                  </Pill>
                </div>
              </Card>
            </div>
          );
        })}
        <div style={{ position: "absolute", top: 620, left: 0, width: 1080, textAlign: "center", ...text(24, C.sub, 700) }}>
          ※ 図はイメージ。エージェントの組み合わせは自由
        </div>
      </div>
      {showVideo ? (
        <Center top={130} style={{ opacity: v, transform: `translateY(${(1 - v) * 60}px)` }}>
          <AppWindow width={W} height={560} video="orchestration" startFrom={7 * 30} zoom={{ x: 0.42, y: 0.0, w: 0.58 }} zoomAt={reportAt + 5} />
        </Center>
      ) : null}
      <Sfx at={10} name="pop" volume={0.25} />
      {[36, 41, 46].map((f) => (
        <Sfx key={f} at={f} name="pop" volume={0.22} />
      ))}
      <Sfx at={reportAt - 30} name="ding" volume={0.3} />
      <Sfx at={reportAt} name="whoosh" volume={0.3} />
    </Stage>
  );
};

// ---------------- 6. 対応エージェント ----------------

const AGENTS = [
  { icon: "claude", color: "#d97757", name: "Claude Code" },
  { icon: "openai", color: "#10a37f", name: "Codex" },
  { icon: "cursor", color: "#1f1f1f", name: "Cursor" },
  { icon: "githubcopilot", color: "#24292f", name: "Copilot" },
  { icon: "google", color: "#4285f4", name: "Antigravity" },
  { icon: "mistralai", color: "#fa520f", name: "Mistral Vibe" },
  { icon: "qwen", color: "#615ced", name: "Qwen Code" },
];

export const AgentsScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const span = scene.lines[0].duration;
  return (
    <Stage>
      <div style={{ position: "absolute", left: 40, top: -10 }}>
        <FeatureHead no={scene.no!} title={scene.title!} />
      </div>
      <div style={{ position: "absolute", top: 150, left: 40, width: W, display: "flex", flexWrap: "wrap", gap: 20 }}>
        {AGENTS.map((a, i) => {
          const s = useSpring(6 + (span * 0.6 * i) / AGENTS.length, { damping: 12 });
          return (
            <Card key={a.name} style={{ width: 235, padding: "24px 0 22px", textAlign: "center", transform: `scale(${s})`, opacity: s }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <AppIcon icon={a.icon} color={a.color} size={92} />
              </div>
              <div style={{ ...text(28, C.ink), marginTop: 12, whiteSpace: "nowrap" }}>{a.name}</div>
            </Card>
          );
        })}
        {(() => {
          const s = useSpring(6 + span * 0.6, { damping: 10 });
          return (
            <div
              style={{
                width: 235,
                borderRadius: 26,
                background: C.deep,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${s})`,
                boxShadow: SHADOW,
              }}
            >
              <div style={{ ...text(60, C.aqua), lineHeight: 1 }}>+27</div>
              <div style={{ ...text(24, C.white, 700), marginTop: 8 }}>どんなCLIでも</div>
            </div>
          );
        })()}
      </div>
      <Center top={560}>
        <Pill bg={C.white} color={C.ink} size={40} style={{ boxShadow: SHADOW, padding: "14px 34px 18px" }}>
          ターミナルで動けば <span style={{ color: C.sea }}>Orcaで動く</span>
        </Pill>
      </Center>
      {AGENTS.map((_, i) => (
        <Sfx key={i} at={6 + (span * 0.6 * i) / AGENTS.length} name="pop" volume={0.2} />
      ))}
    </Stage>
  );
};

// ---------------- 7. 向き不向き ----------------

const WHO = [
  { title: "使うべき人", color: C.sea, mark: "◎", items: ["毎日エージェントを使う", "作業を並行して進めたい", "外出先でも進めたい"] },
  { title: "今のままでOK", color: C.gray, mark: "△", items: ["たまに1つ頼むだけ", "ターミナル1つで足りる"] },
];

export const WhoScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const at = scene.lines[1].from;
  const dur = scene.lines[1].duration;
  return (
    <Stage>
      {WHO.map((col, ci) => {
        const r = useRise(ci * 6, 60);
        return (
          <div key={col.title} style={{ position: "absolute", left: 40, top: ci === 0 ? 10 : 400, width: W, ...r }}>
            <Card style={{ overflow: "hidden", display: "flex" }}>
              <div
                style={{
                  width: 230,
                  background: col.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...text(38, C.white),
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  padding: "0 12px",
                }}
              >
                {col.title}
              </div>
              <div style={{ flex: 1, padding: "10px 30px" }}>
                {col.items.map((item, i) => {
                  const t = at + 2 + (ci === 0 ? i * 7 : dur * 0.55 + i * 7);
                  const p = useSpring(t);
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "20px 0",
                        borderBottom: i < col.items.length - 1 ? `2px solid ${C.line}` : undefined,
                        opacity: p,
                        transform: `translateX(${(1 - p) * 40}px)`,
                      }}
                    >
                      <span style={text(40, col.color)}>{col.mark}</span>
                      <span style={{ ...text(40, C.ink), whiteSpace: "nowrap" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        );
      })}
      <Sfx at={0} name="whoosh" volume={0.3} />
      {[0, 7, 14].map((d) => (
        <Sfx key={`a${d}`} at={at + 2 + d} name="pop" volume={0.2} />
      ))}
      {[0, 7].map((d) => (
        <Sfx key={`b${d}`} at={at + 2 + dur * 0.55 + d} name="pop" volume={0.2} />
      ))}
    </Stage>
  );
};

// ---------------- 8. まとめ（インストール） ----------------

const CMD = "brew install --cask stablyai/orca/orca";

export const SummaryScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const head = useRise(0);
  const typed = Math.floor(useProgress(10, 10 + CMD.length * 1.2) * CMD.length);
  const saveAt = scene.lines[1].from;
  const save = useSpring(saveAt + 2, { damping: 13 });
  return (
    <Stage>
      <Center top={0} style={head}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Img src={ASSET("media/icon.png")} style={{ width: 96, height: 96 }} />
          <div style={text(72, C.ink)}>
            まずは<span style={{ color: C.sea }}>無料で</span>試そう
          </div>
        </div>
      </Center>
      <Center top={140} style={head}>
        <div style={{ width: W, background: "#14181f", borderRadius: 24, boxShadow: SHADOW, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 9, padding: "16px 20px", background: "#1b1f26" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
            ))}
            <div style={{ ...text(22, "#8b96a3", 700), marginLeft: 12 }}>Mac（Homebrew）の場合</div>
          </div>
          <div style={{ padding: "26px 30px 30px", fontFamily: "monospace", fontSize: 34, color: "#e6edf3", whiteSpace: "nowrap" }}>
            <span style={{ color: C.aqua }}>$ </span>
            {CMD.slice(0, typed)}
            <span style={{ color: C.aqua }}>{frame % 20 < 10 ? "▌" : " "}</span>
          </div>
        </div>
      </Center>
      <Center top={330} style={{ gap: 14, opacity: useSpring(30) }}>
        {["orca.dev から", "Mac", "Windows", "Linux", "iOS", "Android"].map((t, i) => (
          <Pill key={t} bg={i === 0 ? C.deep : C.white} color={i === 0 ? C.aqua : C.ink} size={30} style={{ boxShadow: SHADOW }}>
            {t}
          </Pill>
        ))}
      </Center>
      {frame >= saveAt ? (
        <Center top={460} style={{ opacity: save, transform: `translateY(${(1 - save) * 40}px) scale(${0.9 + save * 0.1})` }}>
          <div
            style={{
              background: C.sea,
              borderRadius: 26,
              padding: "22px 46px 26px",
              boxShadow: SHADOW,
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <svg width={52} height={52} viewBox="0 0 24 24">
              <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1z" fill={C.white} />
            </svg>
            <div style={text(52, C.white)}>保存して、あとで試そう</div>
          </div>
        </Center>
      ) : null}
      <Sfx at={0} name="whoosh" volume={0.3} />
      <Sfx at={saveAt + 2} name="ding" volume={0.35} />
    </Stage>
  );
};

export const SCENES: Record<OrcaScene["type"], React.FC<{ scene: Scene }>> = {
  hook: HookScene,
  pain: PainScene,
  intro: IntroScene,
  feature: FeatureScene,
  orchestrate: OrchestrateScene,
  agents: AgentsScene,
  who: WhoScene,
  summary: SummaryScene,
};
