import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, smooth, W } from "./kit";
import { MathShortProps } from "./timeline";

// 酔っ歩き（ランダムウォーク）
// 要素A（ゴールド）: 歩いた回数 … 100 → 400 → 1万（×4、×100）
// 要素B（シアン）  : 離れる距離 … 10 → 20 → 100（×2、×10）

const BGM_VOLUME = 0.06;

const Label: React.FC<{
  x: number;
  y: number;
  text: React.ReactNode;
  color?: string;
  size?: number;
  opacity?: number;
  align?: "left" | "center" | "right";
  scale?: number;
}> = ({ x, y, text, color = C.white, size = 50, opacity = 1, align = "center", scale = 1 }) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: align === "left" ? x : align === "right" ? x - 600 : x - 300,
        width: 600,
        top: y - size * 0.75,
        textAlign: align,
        fontFamily: serif,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.5,
        color,
        opacity,
        whiteSpace: "nowrap",
        transform: `scale(${scale})`,
        transformOrigin: align === "left" ? "left center" : align === "right" ? "right center" : "center center",
      }}
    >
      {text}
    </div>
  );

// 間のあいだ、強調する数字を少し大きくしてから戻す
const beat = (t: number, start: number, dur: number) => {
  const x = (t - start) / Math.max(dur, 0.3);
  return x <= 0 || x >= 1 ? 1 : 1 + 0.12 * Math.sin(Math.PI * x);
};

// 毎回同じ乱数
const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
};
const walk = (n: number, seed: number) => {
  const r = rng(seed);
  const out = [0];
  for (let i = 0; i < n; i++) out.push(out[i] + (r() < 0.5 ? 1 : -1));
  return out;
};

// 1人目（冒頭）は最後に −8 で止まる並びを使う
const HERO = walk(100, 20261119);
const CROWD = Array.from({ length: 300 }, (_, i) => walk(100, 1000 + i * 7));
const CROWD400 = Array.from({ length: 80 }, (_, i) => walk(400, 5000 + i * 13));
// 1000人の最後の位置
const FINAL = Array.from({ length: 1000 }, (_, i) => walk(100, 90000 + i * 3)[100]);
const within10 = FINAL.filter((v) => Math.abs(v) <= 10).length;

// グラフ（横＝位置、縦＝回数）
const CX = 540;
const SX = 13; // 1歩あたり px
const Y0 = 600;
const SY = 6.2; // 1回あたり px（100回で 620px）
const px = (pos: number) => CX + pos * SX;
const py = (k: number) => Y0 + k * SY;

const path = (w: number[], upto: number, sy = SY, sx = SX) =>
  w
    .slice(0, Math.max(1, Math.floor(upto) + 1))
    .map((v, k) => `${(CX + v * sx).toFixed(1)},${(Y0 + k * sy).toFixed(1)}`)
    .join(" ");

// 2次元の散歩（締め）
const WALK2 = (() => {
  const r = rng(777);
  const pts: [number, number][] = [[0, 0]];
  for (let i = 0; i < 600; i++) {
    const a = r() * Math.PI * 2;
    const [x, y] = pts[i];
    pts.push([x + Math.cos(a), y + Math.sin(a)]);
  }
  return pts;
})();

export const RandomWalk: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 1人が100回歩く（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  const k1 = 100 * smooth((t - at(0, 0.05)) / (durs[0] * 0.95));
  const heroPos = HERO[Math.floor(k1)];
  const band = ramp(t, at(1, 0.1), 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));

  // シーン2: 1000人（2〜3）
  const s2 = sceneOpacity(t, at(2), at(4));
  const crowdK = 100 * smooth((t - at(2, 0.05)) / (durs[2] * 0.6));
  const band2 = ramp(t, at(2, 0.65), 0.3);
  const tail = ramp(t, at(3, 0.2), 0.3);
  // 最後の位置のヒストグラム（2歩ごと）
  const hist = new Map<number, number>();
  FINAL.forEach((v) => hist.set(v, (hist.get(v) ?? 0) + 1));

  // シーン3: 歩いた数と離れた距離（4）
  const s3 = sceneOpacity(t, at(4), at(5));
  const barK = ramp(t, at(4, 0.1), 0.5);

  // シーン4: 打ち消し合う（5）
  const s4 = sceneOpacity(t, at(5), at(6));
  const ARROWS = [1, -1, 1, 1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, -1, 1];
  // 隣り合う → と ← を消していく
  const cancelK = ramp(t, at(5, 0.35), 0.5);
  const cancelled = (() => {
    const gone = new Set<number>();
    const stack: number[] = [];
    ARROWS.forEach((a, i) => {
      const top = stack[stack.length - 1];
      if (top !== undefined && ARROWS[top] === -a) {
        gone.add(top);
        gone.add(i);
        stack.pop();
      } else stack.push(i);
    });
    return gone;
  })();

  // シーン5: 100 → 400 → 1万（6〜8）
  const s5 = sceneOpacity(t, at(6), at(9));
  const row = (i: number) => ramp(t, [at(6, 0.05), at(6, 0.1), at(8, 0.05)][i], 0.3);
  const rowD = (i: number) => ramp(t, [at(6, 0.1), at(7, 0.1), at(8, 0.5)][i], 0.3);
  const beat7 = beat(t, at(7) + durs[7], pauseOf(7));

  // シーン6: 400回の広がり（9）
  const s6 = sceneOpacity(t, at(9), at(11));
  const k6 = 400 * smooth((t - at(9, 0.05)) / (durs[9] * 0.8));
  const SY6 = 620 / 400;
  const SX6 = 6;
  const env = Array.from({ length: 81 }, (_, i) => i * 5).filter((k) => k <= k6);

  // シーン7: 家のまわり（11〜）
  const s7 = sceneOpacity(t, at(11), end + 1);
  const k7 = 600 * smooth((t - at(11, 0.05)) / (durs[11] + pauseOf(11) + durs[12] * 0.7));
  const S7 = 7;
  const R100 = 24.5 * S7; // 600歩の目安（√600 ≈ 24.5）を「100歩」の円として図示

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          <line x1={CX} x2={CX} y1={Y0 - 20} y2={py(100) + 10} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
          <rect x={px(-10)} y={Y0 - 20} width={20 * SX} height={py(100) - Y0 + 30} fill={C.b} opacity={0.18 * band} />
          <line x1={px(-10)} x2={px(-10)} y1={Y0 - 20} y2={py(100) + 10} stroke={C.b} strokeWidth={2} opacity={band} />
          <line x1={px(10)} x2={px(10)} y1={Y0 - 20} y2={py(100) + 10} stroke={C.b} strokeWidth={2} opacity={band} />
          <polyline points={path(HERO, k1)} fill="none" stroke={C.a} strokeWidth={4} strokeLinejoin="round" />
          <circle cx={px(heroPos)} cy={py(Math.floor(k1))} r={14} fill={C.a} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <rect x={px(-10)} y={Y0 - 20} width={20 * SX} height={py(100) - Y0 + 30} fill={C.b} opacity={0.18 * band2} />
          {CROWD.map((w, i) => (
            <polyline key={i} points={path(w, crowdK)} fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={2} />
          ))}
          {[...hist.entries()].map(([v, c]) => {
            const out20 = Math.abs(v) > 20;
            const in10 = Math.abs(v) <= 10;
            const color = out20 ? "#fff" : in10 ? C.b : "#4a6b78";
            const k = ramp(crowdK, 95, 5);
            return (
              <rect
                key={v}
                x={px(v) - SX * 0.9}
                y={1250 - c * 2.2 * k}
                width={SX * 1.8}
                height={c * 2.2 * k}
                fill={color}
                opacity={out20 ? lerp(0.4, 1, tail) : 1}
              />
            );
          })}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <rect x={140} y={760} width={800 * barK} height={110} fill={C.a} rx={8} />
          <rect x={140} y={1010} width={80 * barK} height={110} fill={C.b} rx={8} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {ARROWS.map((a, i) => {
            const x = 110 + (i % 8) * 110;
            const gone = cancelled.has(i) ? 1 - cancelK : 1;
            const y = i < 8 ? 820 : 960;
            return (
              <g key={i} opacity={lerp(0.12, 1, gone)}>
                <line x1={x} x2={x + 70} y1={y} y2={y} stroke={a > 0 ? C.a : "#ccc"} strokeWidth={9} />
                <polyline
                  points={a > 0 ? `${x + 50},${y - 20} ${x + 72},${y} ${x + 50},${y + 20}` : `${x + 22},${y - 20} ${x},${y} ${x + 22},${y + 20}`}
                  fill="none"
                  stroke={a > 0 ? C.a : "#ccc"}
                  strokeWidth={9}
                />
              </g>
            );
          })}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={60} y={680 + i * 190} width={960} height={160} rx={16} fill="none" stroke="#fff" strokeOpacity={0.45 * row(i)} strokeWidth={1.5} />
          ))}
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <line x1={CX} x2={CX} y1={Y0 - 20} y2={Y0 + 630} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
          {CROWD400.map((w, i) => (
            <polyline key={i} points={path(w, k6, SY6, SX6)} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} />
          ))}
          {[-1, 1].map((sgn) => (
            <polyline
              key={sgn}
              points={env.map((k) => `${CX + sgn * Math.sqrt(k) * SX6},${Y0 + k * SY6}`).join(" ")}
              fill="none"
              stroke={C.b}
              strokeWidth={6}
            />
          ))}
        </g>

        {/* シーン7 */}
        <g opacity={s7}>
          <circle cx={CX} cy={930} r={R100} fill={C.b} fillOpacity={0.12} stroke={C.b} strokeWidth={3} strokeDasharray="12 10" />
          <polyline
            points={WALK2.slice(0, Math.floor(k7) + 1)
              .map(([x, y]) => `${CX + x * S7},${930 + y * S7}`)
              .join(" ")}
            fill="none"
            stroke={C.a}
            strokeWidth={2.5}
            strokeOpacity={0.8}
          />
          {/* 家 */}
          <polygon points={`${CX - 34},${930} ${CX},${896} ${CX + 34},${930}`} fill="#fff" />
          <rect x={CX - 26} y={930} width={52} height={36} fill="#fff" />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={CX} y={py(100) + 50} text={`${Math.floor(k1)}回`} size={52} opacity={s1} />
      <Label x={px(heroPos) + 30} y={py(Math.floor(k1)) - 10} text={`${heroPos > 0 ? "+" : ""}${heroPos}歩`} align="left" size={50} color={C.a} opacity={s1 * ramp(k1, 99, 1)} />
      <Label x={px(10) + 20} y={Y0 + 20} text="10歩" align="left" size={52} color={C.b} opacity={s1 * band} scale={beat1} />
      <Label x={CX} y={Y0 - 50} text="スタート" size={48} opacity={s1} />

      <Label x={CX} y={Y0 - 50} text="1000人" size={52} opacity={s2} />
      <Label x={px(-10) - 20} y={1170} text={`約${Math.round((within10 / 10) / 10) * 10}%`} align="right" size={56} color={C.b} opacity={s2 * band2} />
      <Label x={px(20) + 20} y={1170} text="約30人に1人" align="left" size={48} opacity={s2 * tail} />

      <Label x={140} y={720} text="歩いた回数 100回" align="left" size={52} color={C.a} opacity={s3} />
      <Label x={140} y={970} text="離れた距離 約10歩" align="left" size={52} color={C.b} opacity={s3 * barK} />

      <Label x={540} y={1110} text="打ち消し合って、残りはわずか" size={50} opacity={s4 * cancelK} />

      {[
        { n: "100回", d: "約10歩", x: "" },
        { n: "400回", d: "約20歩", x: "×4 → ×2" },
        { n: "1万回", d: "約100歩", x: "×100 → ×10" },
      ].map((r, i) => (
        <React.Fragment key={i}>
          <Label x={110} y={760 + i * 190} text={r.n} align="left" size={60} color={C.a} opacity={s5 * row(i)} />
          <Label x={430} y={760 + i * 190} text={`→ ${r.d}`} size={60} color={C.b} opacity={s5 * rowD(i)} scale={i === 1 ? beat7 : 1} />
          <Label x={990} y={760 + i * 190} text={r.x} align="right" size={48} opacity={s5 * rowD(i)} />
        </React.Fragment>
      ))}

      <Label x={CX - 160} y={Y0 + 600} text="400回" align="right" size={52} color={C.a} opacity={s6} />
      <Label x={CX + Math.sqrt(400) * SX6 + 20} y={Y0 + 560} text="20歩" align="left" size={52} color={C.b} opacity={s6 * ramp(k6, 390, 10)} />
      <Label x={CX + Math.sqrt(100) * SX6 + 20} y={Y0 + 100 * SY6} text="10歩" align="left" size={48} color={C.b} opacity={s6 * ramp(k6, 100, 10)} />

      <Label x={CX} y={1020} text="家" size={52} opacity={s7} />
      <Label x={CX + R100 + 20} y={930 - R100 * 0.7} text="約100歩" align="left" size={52} color={C.b} opacity={s7} />
      <Label x={CX} y={1250} text="1日 1万歩" size={52} color={C.a} opacity={s7} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>表で前、裏で戻る</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.5), at(1), at(2))}>100回でどこまで？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(4))}>1000人で試す</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(4), undefined, at(5))}>100歩も歩いたのに</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(5), undefined, at(6))}>前と後ろが打ち消す</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(6), undefined, at(9))}>回数を増やすと</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(10))}>距離はゆっくり</Line>

      <Line t={t} y={200} size={86} life={L(at(10), undefined, at(11))}>酔っ歩き</Line>
      <Line t={t} y={360} size={64} life={L(at(10, 0.2), undefined, at(11))}>ランダムウォーク</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(11, 0.05))}>1日1万歩なら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.4), undefined, at(1))}>
        100回 → どこまで？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.b} life={L(at(1, 0.15), undefined, at(2))}>
        だいたい10歩
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(2, 0.65), at(3), at(4))}>
        約7割が 10歩以内
      </Line>
      <Line t={t} y={BOT[1]} size={60} life={L(at(3, 0.2), undefined, at(4))}>
        20歩より遠く 約30人に1人
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(4, 0.3), undefined, at(5))}>
        100歩 歩いて 10歩
      </Line>
      <Line t={t} y={BOT[0]} size={60} life={L(at(5, 0.4), undefined, at(6))}>
        → と ← が打ち消し合う
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(9, 0.1), undefined, at(10))}>
        歩く回数
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(9, 0.15), undefined, at(10))}>
        ×4、×100
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(9, 0.45), undefined, at(10))}>
        離れる距離
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(9, 0.5), undefined, at(10))}>
        ×2、×10だけ
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.b} life={L(at(12, 0.3))}>
        家から 約100歩
      </Line>

      {voices.map((v, i) =>
        v ? (
          <Sequence key={i} from={Math.round(starts[i] * fps)}>
            <Audio src={staticFile(v)} />
          </Sequence>
        ) : null,
      )}

      {bgm ? (
        <Audio
          src={staticFile(`bgm/${bgm}`)}
          volume={(f) =>
            interpolate(f, [0, 20, durationInFrames - 45, durationInFrames], [0, BGM_VOLUME, BGM_VOLUME, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
          loop
        />
      ) : null}

      {subtitles
        ? narration.map((n, i) => (
            <Line key={i} t={t} y={1760} size={34} weight={600} life={L(at(i), undefined, at(i) + durs[i])}>
              {n.text}
            </Line>
          ))
        : null}
    </AbsoluteFill>
  );
};
