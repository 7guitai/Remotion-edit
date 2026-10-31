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
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, smooth, Tex, W } from "./kit";
import { MathShortProps } from "./timeline";

// 偽陽性の落とし穴（精度99%の検査で陽性でも、本当に病気なのは50%）
// 要素A（ゴールド）: 本当に病気で陽性の人 … 病気の人の数に比例して減る（99人 → 約10人）
// 要素B（シアン）  : 健康なのに陽性の人 … 健康な人の1%、ほぼ変わらない（99人 → 約100人）

const BGM_VOLUME = 0.06;
const GRAY = "#5a5a5a";

const Label: React.FC<{
  x: number;
  y: number;
  text: React.ReactNode;
  color?: string;
  size?: number;
  opacity?: number;
  align?: "left" | "center" | "right";
}> = ({ x, y, text, color = C.white, size = 50, opacity = 1, align = "center" }) =>
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
      }}
    >
      {text}
    </div>
  );

const Card: React.FC<{ x: number; y: number; w: number; h: number; strong?: number }> = ({
  x,
  y,
  w,
  h,
  strong = 0,
}) => (
  <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke="#fff" strokeWidth={1.5} opacity={lerp(0.45, 0.95, strong)} />
);

// 1万人の点（100×100）
const GN = 100;
const PITCH = 6.4;
const GX = 540 - (GN * PITCH) / 2;
const GY = 585;
const cell = (i: number) => ({ x: GX + (i % GN) * PITCH, y: GY + Math.floor(i / GN) * PITCH });

// 毎回同じ並びで選ぶ
const pick = (count: number, exclude: Set<number>, seed: number) => {
  const out: number[] = [];
  let s = seed;
  while (out.length < count) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const i = s % (GN * GN);
    if (!exclude.has(i)) {
      exclude.add(i);
      out.push(i);
    }
  }
  return out;
};
const used = new Set<number>();
const SICK = pick(100, used, 11); // SICK[0] は見逃される1人
const FALSE_POS = pick(99, used, 29);

// 99人分の四角のかたまり（9×11）
const Block: React.FC<{ x: number; y: number; n: number; color: string; size?: number; shown?: number }> = ({
  x,
  y,
  n,
  color,
  size = 26,
  shown = 99,
}) => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <rect
        key={i}
        x={x + (i % 9) * (size + 4)}
        y={y - Math.floor(i / 9) * (size + 4)}
        width={size}
        height={size}
        rx={4}
        fill={color}
        opacity={i < shown ? 1 : 0.12}
      />
    ))}
  </g>
);

export const FalsePositive: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 1万人の点（0〜5）
  const s1 = sceneOpacity(t, at(0), at(6));
  const gridIn = ramp(t, at(0, 0.05), 0.8);
  // 冒頭で答えを先に見せる（陽性の198人が光る）→ 2で一度戻す
  const preview = ramp(t, at(0, 0.6), 0.4) * (1 - ramp(t, at(2), 0.3));
  const sickK = ramp(t, at(2, 0.45), 0.4);
  const tpK = ramp(t, at(3, 0.35), 0.4);
  const fpK = (j: number) => ramp(t, lerp(at(4, 0.35), at(5, 0.6), j / 98), 0.15);
  const fpCount = FALSE_POS.filter((_, j) => fpK(j) > 0.5).length;

  // シーン2: 陽性の198人を2つに分ける（6）
  const s2 = sceneOpacity(t, at(6), at(7));
  const split = ramp(t, at(6, 0.35), 0.4);

  // シーン3: 病気が少ないと（7〜8）
  const s3 = sceneOpacity(t, at(7), at(9));
  const goldDrop = smooth((t - at(7, 0.2)) / (durs[7] * 0.6));
  const tpBar = lerp(99, 9.9, goldDrop);
  const fpBar = lerp(99, 99.9, ramp(t, at(8, 0.2), 0.6));
  const barH = (v: number) => (v / 100) * 440;

  // シーン4: 1000人に1人なら約9%（9）
  const s4 = sceneOpacity(t, at(9), at(10));
  const fill4 = ramp(t, at(9, 0.15), 0.6);

  // シーン5: 定理名（10）
  const s5 = sceneOpacity(t, at(10), at(11));

  // シーン6: もう一度検査（11〜）
  const s6 = sceneOpacity(t, at(11), end + 1);
  const retest = smooth((t - at(11, 0.3)) / (durs[11] * 0.6));
  const goldShown = Math.round(lerp(99, 98, retest));
  const cyanShown = Math.round(lerp(99, 1, retest));

  // 点の色
  const dots: React.ReactNode[] = [];
  SICK.forEach((i, j) => {
    const p = cell(i);
    const positive = j > 0;
    const k = Math.max(positive ? preview : 0, sickK * (positive ? lerp(0.6, 1, tpK) : lerp(0.6, 0.3, tpK)));
    if (k > 0) dots.push(<rect key={`s${i}`} x={p.x - 1} y={p.y - 1} width={6.4} height={6.4} fill={C.a} opacity={k} />);
  });
  FALSE_POS.forEach((i, j) => {
    const p = cell(i);
    const k = Math.max(preview, fpK(j));
    if (k > 0) dots.push(<rect key={`f${i}`} x={p.x - 1} y={p.y - 1} width={6.4} height={6.4} fill={C.b} opacity={k} />);
  });
  const baseDim = lerp(1, 0.55, Math.max(preview, sickK));

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <pattern id="people" x={GX} y={GY} width={PITCH} height={PITCH} patternUnits="userSpaceOnUse">
            <rect x={0} y={0} width={4} height={4} fill={GRAY} />
          </pattern>
        </defs>

        {/* シーン1 */}
        <g opacity={s1}>
          <rect x={GX} y={GY} width={GN * PITCH} height={GN * PITCH} fill="url(#people)" opacity={gridIn * baseDim} />
          {dots}
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <Block x={lerp(400, 90, split)} y={1150} n={99} color={C.a} />
          <Block x={lerp(410, 720, split) - 0} y={1150} n={99} color={C.b} />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <line x1={150} x2={930} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <rect x={240} y={1200 - barH(tpBar)} width={180} height={barH(tpBar)} fill={C.a} rx={4} />
          <rect x={660} y={1200 - barH(fpBar)} width={180} height={barH(fpBar)} fill={C.b} rx={4} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <Card x={90} y={760} w={900} h={160} />
          <rect x={100} y={770} width={880 * (9.9 / 109.8) * fill4} height={140} fill={C.a} rx={10} />
          <rect x={100 + 880 * (9.9 / 109.8)} y={770} width={880 * (99.9 / 109.8) * fill4} height={140} fill={C.b} rx={10} opacity={0.85} />
        </g>

        {/* シーン5 */}
        <g opacity={s5 * 0.4}>
          <rect x={GX} y={GY} width={GN * PITCH} height={GN * PITCH} fill="url(#people)" />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <Block x={90} y={1150} n={99} color={C.a} shown={goldShown} />
          <Block x={720} y={1150} n={99} color={C.b} shown={cyanShown} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300、数字を添える） ── */}
      <Label x={540} y={1290} text="1万人" size={50} opacity={s1 * gridIn * (1 - ramp(t, at(3), 0.3))} />
      <Label x={540} y={1290} text={<><span style={{ color: C.a }}>陽性 99人</span>{"　"}<span style={{ color: C.b, opacity: ramp(t, at(4, 0.35), 0.3) }}>陽性 {fpCount || 99}人</span></>} size={50} opacity={s1 * tpK} />

      <Label x={210} y={700} text="本当に病気" size={50} color={C.a} opacity={s2 * split} />
      <Label x={850} y={700} text="病気ではない" size={50} color={C.b} opacity={s2 * split} />
      <Label x={210} y={1220} text="99人" size={54} color={C.a} opacity={s2} />
      <Label x={850} y={1220} text="99人" size={54} color={C.b} opacity={s2 * split} />

      <Label x={330} y={660} text="正しい陽性" size={50} color={C.a} opacity={s3} />
      <Label x={750} y={660} text="間違いの陽性" size={50} color={C.b} opacity={s3} />
      <Label x={330} y={1200 - barH(tpBar) - 45} text={`${tpBar < 50 ? "約" : ""}${Math.round(tpBar)}人`} size={52} opacity={s3} />
      <Label x={750} y={1200 - barH(fpBar) - 45} text={`${fpBar > 99.5 ? "約100" : Math.round(fpBar)}人`} size={52} opacity={s3} />
      <Label x={540} y={1260} text={goldDrop > 0.5 ? "1000人に1人" : "100人に1人"} size={50} opacity={s3} />

      <Label x={540} y={700} text="陽性 約110人" size={52} opacity={s4} />
      <Label x={100} y={980} text="病気 約10人" align="left" size={50} color={C.a} opacity={s4 * fill4} />
      <Label x={980} y={980} text="病気ではない 約100人" align="right" size={50} color={C.b} opacity={s4 * fill4} />
      <Label x={540} y={1150} text="約9%" size={110} color={C.a} opacity={s4 * ramp(t, at(9, 0.6), 0.3)} />

      <Label x={210} y={700} text="本当に病気" size={50} color={C.a} opacity={s6} />
      <Label x={850} y={700} text="病気ではない" size={50} color={C.b} opacity={s6} />
      <Label x={210} y={1220} text={`${goldShown}人`} size={54} color={C.a} opacity={s6} />
      <Label x={850} y={1220} text={`${cyanShown}人`} size={54} color={C.b} opacity={s6} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>精度99%の検査で</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.3), at(1), at(2))}>陽性が出たら？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(6))}>1万人で数える</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.a} life={L(at(3), at(4), at(6))}>病気の100人</Line>
      <Line t={t} y={TOP[2]} size={72} color={C.b} life={L(at(4), undefined, at(6))}>健康な9900人</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(6), undefined, at(7))}>陽性は198人</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(9))}>病気が少ないと</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(10))}>1000人に1人なら</Line>

      <Line t={t} y={200} size={86} life={L(at(10), at(11), at(11))}>偽陽性の落とし穴</Line>
      <Line t={t} y={360} size={64} life={L(at(10, 0.2), at(11), at(11))}>＝間違いの陽性</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(11))}>もう一度検査</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.3), undefined, at(1))}>
        本当に病気の確率は？
      </Line>
      <Line t={t} y={BOT[0] + 10} size={110} color={C.a} life={L(at(1, 0.1), undefined, at(2))}>
        50%
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.45), at(3), at(6))}>
        病気 100人に1人
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(3, 0.35), at(4), at(6))}>
        100人中 99人が陽性
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(4, 0.4), undefined, at(6))}>
        9900人の1% ＝ 99人
      </Line>

      <Line t={t} y={BOT[0] + 20} size={64} life={L(at(6, 0.5), undefined, at(7))}>
        <Tex src="99 \div 198 = 50\%" />
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={64} color={C.a} life={L(at(7, 0.4), undefined, at(9))}>
        ↓ 減る
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={64} color={C.b} life={L(at(8, 0.3), undefined, at(9))}>
        → ほぼ同じ
      </Line>

      <Line t={t} y={BOT[0] + 20} size={64} life={L(at(9, 0.6), undefined, at(10))}>
        <Tex src="10 \div 110 \approx 9\%" />
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(11, 0.3), at(12), undefined)}>
        2回目も陽性 98人と1人
      </Line>
      <Line t={t} y={BOT[1]} size={80} color={C.a} life={L(at(12, 0.3))}>
        病気の確率 99%
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
