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

// 72の法則（複利）
// 要素A（ゴールド）: 足し算の増え方（増えた分を引き出す）… 毎年 +7万円で一定
// 要素B（シアン）  : 掛け算の増え方（増えた分も預ける）… 増える額が 7万円 → 約13万円と大きくなる

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

const Card: React.FC<{ x: number; y: number; w: number; h: number; strong?: number }> = ({
  x,
  y,
  w,
  h,
  strong = 0,
}) => (
  <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke="#fff" strokeWidth={1.5} opacity={lerp(0.45, 0.95, strong)} />
);

// 間（pause）のあいだ、強調する数字を少し大きくしてから戻す
const beat = (t: number, start: number, dur: number) => {
  const x = (t - start) / Math.max(dur, 0.3);
  return x <= 0 || x >= 1 ? 1 : 1 + 0.12 * Math.sin(Math.PI * x);
};

const YEARS = Array.from({ length: 11 }, (_, y) => y);
const simple = (y: number) => 100 + 7 * y;
const compound = (y: number) => 100 * 1.07 ** y;

// グラフ（年 0〜10、金額 0〜220万円）
const gx = (y: number) => 170 + y * 76;
const BASE = 1200;
const gy = (man: number) => BASE - man * 2.45;

export const RuleOf72: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  // フレーズ p のあとの間（音声が終わってから次のフレーズまで）
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 100万円が年ごとに増える（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  const yr1 = 10 * smooth((t - at(0, 0.35)) / (durs[0] * 0.6 + 0.6));
  const ans = ramp(t, at(1, 0.1), 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));

  // シーン2: 足すと70%（2）
  const s2 = sceneOpacity(t, at(2), at(3));
  const k2 = ramp(t, at(2, 0.4), 0.4);

  // シーン3: 引き出す／預けたまま（3〜6）
  const s3 = sceneOpacity(t, at(3), at(7));
  const goldBar = (y: number) => ramp(t, at(3, 0.1) + y * 0.32, 0.25);
  const cyanBar = (y: number) => ramp(t, at(4, 0.2) + y * 0.3, 0.25);
  const incHl = ramp(t, at(5), 0.3) * (1 - ramp(t, at(6), 0.3));
  const beat6 = beat(t, at(6) + durs[6], pauseOf(6));

  // シーン4: 増える額の比べ（7）
  const s4 = sceneOpacity(t, at(7), at(8));
  const incK = (y: number) => ramp(t, at(7, 0.05) + y * 0.25, 0.25);
  const iy = (man: number) => 1200 - man * 36;

  // シーン5: 72 ÷ 利率（8〜9）／ 定理名（10）
  const s5 = sceneOpacity(t, at(8), at(11));
  const beat9 = beat(t, at(9) + durs[9], pauseOf(9));

  // シーン6: 物価が年2%（11〜）
  const s6 = sceneOpacity(t, at(11), end + 1);
  const yr6 = 35 * smooth((t - at(11, 0.3)) / (durs[11] * 0.7 + durs[12] * 0.6));
  const price = 100 * 1.02 ** yr6;

  const Axis = () => (
    <g>
      <line x1={130} x2={990} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
      <line x1={130} x2={990} y1={gy(200)} y2={gy(200)} stroke="#fff" strokeOpacity={0.45} strokeWidth={2} strokeDasharray="10 10" />
      <line x1={130} x2={990} y1={gy(100)} y2={gy(100)} stroke="#fff" strokeOpacity={0.25} strokeWidth={1.5} strokeDasharray="6 8" />
    </g>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          <Axis />
          {YEARS.map((y) => {
            const k = smooth(yr1 - y + 1);
            if (k <= 0) return null;
            const v = compound(y);
            return <rect key={y} x={gx(y) - 24} y={BASE - (BASE - gy(v)) * k} width={48} height={(BASE - gy(v)) * k} fill={C.b} rx={4} />;
          })}
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <Card x={50} y={660} w={470} h={560} />
          <Card x={560} y={660} w={470} h={560} strong={k2} />
          <rect x={210} y={1120 - 170 * 1.6} width={150} height={170 * 1.6} fill={C.a} rx={6} />
          <rect x={720} y={1120 - 197 * 1.6 * k2} width={150} height={197 * 1.6 * k2} fill={C.b} rx={6} />
          <line x1={80} x2={1000} y1={1120 - 200 * 1.6} y2={1120 - 200 * 1.6} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <Axis />
          {YEARS.map((y) => {
            const g = goldBar(y);
            const c = cyanBar(y);
            const hs = (BASE - gy(simple(y))) * g;
            const hc = (BASE - gy(compound(y))) * c;
            const inc = y === 0 ? 0 : compound(y) - compound(y - 1);
            return (
              <g key={y}>
                <rect x={gx(y) - 30} y={BASE - hs} width={28} height={hs} fill={C.a} rx={3} />
                <rect x={gx(y) + 2} y={BASE - hc} width={28} height={hc} fill={C.b} rx={3} opacity={lerp(1, 0.45, incHl)} />
                {/* その年に増えた分 */}
                {y > 0 ? (
                  <rect x={gx(y) + 2} y={gy(compound(y))} width={28} height={inc * 2.45} fill="#fff" opacity={incHl * c} rx={2} />
                ) : null}
              </g>
            );
          })}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <line x1={130} x2={990} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {YEARS.slice(1).map((y) => {
            const k = incK(y);
            const ic = compound(y) - compound(y - 1);
            return (
              <g key={y}>
                <rect x={gx(y) - 30} y={iy(7 * k)} width={28} height={1200 - iy(7 * k)} fill={C.a} rx={3} />
                <rect x={gx(y) + 2} y={iy(ic * k)} width={28} height={1200 - iy(ic * k)} fill={C.b} rx={3} />
              </g>
            );
          })}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <Card x={140} y={660} w={800} h={250} strong={1 - ramp(t, at(9), 0.3) * 0.5} />
          <Card x={50} y={960} w={470} h={270} strong={ramp(t, at(9, 0.05), 0.3)} />
          <Card x={560} y={960} w={470} h={270} strong={ramp(t, at(9, 0.5), 0.3)} />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <path
            d="M 300 760 L 700 760 L 820 900 L 700 1040 L 300 1040 Z"
            fill="none"
            stroke={C.b}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <circle cx={710} cy={900} r={18} fill="none" stroke={C.b} strokeWidth={4} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={gx(0)} y={gy(100) - 40} text="100万円" size={48} opacity={s1} />
      <Label x={gx(10) - 10} y={gy(200) - 40} text="2倍" align="right" size={52} opacity={s1} />
      <Label x={540} y={1250} text={`${Math.min(10, Math.floor(yr1))}年後`} size={52} opacity={s1} />
      <Label x={540} y={1420} text="約10年" size={110} color={C.b} opacity={s1 * ans} scale={beat1} />

      <Label x={285} y={720} text="7% × 10回" size={50} color={C.a} opacity={s2} />
      <Label x={795} y={720} text="実際" size={50} color={C.b} opacity={s2 * k2} />
      <Label x={285} y={1175} text="+70%" size={52} color={C.a} opacity={s2} />
      <Label x={795} y={1175} text="ほぼ2倍" size={52} color={C.b} opacity={s2 * k2} />

      <Label x={130} y={610} text={<>引き出す{goldBar(10) > 0.5 ? " → 170万" : ""}</>} align="left" size={50} color={C.a} opacity={s3} />
      <Label x={590} y={610} text={<>預けたまま{t > at(6) ? " → 197万" : ""}</>} align="left" size={50} color={C.b} opacity={s3 * ramp(t, at(4), 0.3)} scale={beat6} />
      <Label x={gx(1) + 16} y={gy(107) - 40} text="+7万" size={48} opacity={s3 * incHl} />
      <Label x={gx(10) + 16} y={gy(197) - 35} text="+13万" size={48} opacity={s3 * incHl} />
      <Label x={540} y={1250} text="1年目 → 10年目" size={48} opacity={s3} />

      <Label x={130} y={680} text="毎年増える額" align="left" size={50} opacity={s4} />
      <Label x={gx(10) + 16} y={iy(12.87) - 40} text="約13万" size={48} color={C.b} opacity={s4 * incK(10)} />
      <Label x={gx(1) - 16} y={iy(7) - 40} text="7万" size={48} color={C.a} opacity={s4 * incK(1)} />
      <Label x={540} y={1250} text="1年目 → 10年目" size={48} opacity={s4} />

      <Label x={540} y={785} text={<Tex src="72 \div 7 \approx 10" />} size={84} opacity={s5} />
      <Label x={285} y={1040} text="年7%" size={52} opacity={s5 * ramp(t, at(9, 0.05), 0.3)} />
      <Label x={285} y={1150} text="約10年" size={60} color={C.b} opacity={s5 * ramp(t, at(9, 0.1), 0.3)} />
      <Label x={795} y={1040} text="年8%" size={52} opacity={s5 * ramp(t, at(9, 0.5), 0.3)} />
      <Label x={795} y={1150} text="9年" size={60} color={C.b} opacity={s5 * ramp(t, at(9, 0.55), 0.3)} scale={beat9} />

      <Label x={500} y={900} text={`${Math.round(price)}円`} size={110} color={price > 199 ? C.b : C.white} opacity={s6} />
      <Label x={540} y={1150} text={`${Math.floor(yr6)}年後`} size={56} opacity={s6} />
      <Label x={540} y={690} text="物価 年2%" size={52} opacity={s6} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>100万円を年7%で</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.35), at(1), at(2))}>2倍になるのは？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), undefined, at(3))}>足すと70%なのに</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(3), at(4), at(7))}>増えた分を引き出す</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.b} life={L(at(4), undefined, at(7))}>増えた分も預ける</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(8))}>増え方の違い</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(10))}>72 ÷ 利率</Line>

      <Line t={t} y={200} size={86} life={L(at(10), at(11))}>72の法則</Line>
      <Line t={t} y={360} size={72} life={L(at(11))}>物価が年2%なら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.3), undefined, at(1))}>
        何年で 200万円？
      </Line>
      <Line t={t} y={BOT[1] + 60} size={60} life={L(at(1, 0.3), undefined, at(2))}>
        10年後 約197万円
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.2), undefined, at(3))}>
        <Tex src="7\% \times 10 = 70\%" />
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(3, 0.3), at(4), at(7))}>
        毎年 +7万円 → 170万円
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(4, 0.4), at(5), at(7))}>
        増えた分にも 7%
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(5, 0.2), at(6), at(7))}>
        増える額 7万 → 約13万
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(7, 0.1), undefined, at(8))}>
        足し算
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(7, 0.15), undefined, at(8))}>
        → 一定
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(7, 0.45), undefined, at(8))}>
        掛け算
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(7, 0.5), undefined, at(8))}>
        ↑ 大きくなる
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(8, 0.3), undefined, at(10))}>
        2倍になる年数 ≒ 72 ÷ 利率
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.b} life={L(at(12, 0.2))}>
        約35年で 値段が2倍
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
