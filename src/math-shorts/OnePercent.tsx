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

// 1.01の法則
// 要素A（ゴールド）: 足し算の増え方（毎日 最初の1%ずつ）… 1年で約4.7倍
// 要素B（シアン）  : 掛け算の増え方（増えたぶんにも1%）… 1年で約38倍

const BGM_VOLUME = 0.06;
const GRAY = "#9a9a9a";

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

const beat = (t: number, start: number, dur: number) => {
  const x = (t - start) / Math.max(dur, 0.3);
  return x <= 0 || x >= 1 ? 1 : 1 + 0.12 * Math.sin(Math.PI * x);
};

const up = (d: number) => 1.01 ** d;
const add = (d: number) => 1 + 0.01 * d;
const down = (d: number) => 0.99 ** d;

// グラフ（日数 0〜365、倍率 0〜40）
const gx = (d: number) => 150 + (d / 365) * 790;
const BASE = 1220;
const gy = (v: number) => BASE - (v / 40) * 560;

const curve = (f: (d: number) => number, upto: number, y: (v: number) => number = gy) =>
  Array.from({ length: 74 }, (_, i) => i * 5)
    .filter((d) => d <= upto)
    .concat(upto > 0 && upto < 365 ? [upto] : upto >= 365 ? [365] : [])
    .map((d) => `${gx(d).toFixed(1)},${y(f(d)).toFixed(1)}`)
    .join(" ");

export const OnePercent: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 1年のグラフ（0〜3、5〜6）
  const s1 = sceneOpacity(t, at(0), at(4)) + sceneOpacity(t, at(5), at(7));
  const day = 365 * smooth((t - at(0, 0.15)) / (durs[0] * 0.8));
  const ans = ramp(t, at(1, 0.05), 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));
  const goldK = ramp(t, at(2, 0.3), 0.5);
  const marks = [70, 140, 210];
  const markK = (i: number) => ramp(t, at(5, 0.05) + i * durs[5] * 0.3, 0.3);
  const beat5 = beat(t, at(5) + durs[5], pauseOf(5));

  // シーン2: 毎日増える量（3〜4）は シーン1 と重ねず、4 で切り替え
  const s2 = sceneOpacity(t, at(4), at(5));
  const days2 = [1, 60, 120, 180, 240, 300, 365];
  const incK = (i: number) => ramp(t, at(4, 0.1) + i * 0.3, 0.3);

  // シーン3: 0.99（7）
  const s3 = sceneOpacity(t, at(7), at(8));
  const day3 = 365 * smooth((t - at(7, 0.1)) / (durs[7] * 0.7));
  const gy3 = (v: number) => BASE - v * 520;
  const beat7 = beat(t, at(7) + durs[7], pauseOf(7));

  // シーン4: 1500倍の差（8）／ 定理名（9）
  const s4 = sceneOpacity(t, at(8), at(10));
  const barK = ramp(t, at(8, 0.15), 0.6);
  const beat8 = beat(t, at(8) + durs[8], pauseOf(8));

  // シーン5: 締め（10〜）
  const s5 = sceneOpacity(t, at(10), end + 1);
  const day5 = 365 * smooth((t - at(10, 0.05)) / (durs[10] * 0.8));
  const gyLog = (v: number) => 940 - (Math.log10(v) / Math.log10(40)) * 300;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={Math.min(1, s1)}>
          <line x1={gx(0)} x2={gx(365)} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(0)} y1={BASE} y2={gy(40)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <polyline points={curve(add, 365 * goldK)} fill="none" stroke={C.a} strokeWidth={7} strokeLinejoin="round" />
          <polyline points={curve(up, day)} fill="none" stroke={C.b} strokeWidth={7} strokeLinejoin="round" />
          {marks.map((d, i) => (
            <g key={d} opacity={markK(i)}>
              <line x1={gx(d)} x2={gx(d)} y1={BASE} y2={gy(up(d))} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 8" />
              <circle cx={gx(d)} cy={gy(up(d))} r={12} fill={C.b} />
            </g>
          ))}
          <circle cx={gx(Math.min(day, 365))} cy={gy(up(Math.min(day, 365)))} r={14} fill={C.b} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <line x1={110} x2={990} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {days2.map((d, i) => {
            const k = incK(i);
            const x = 140 + i * 122;
            const hc = up(d - 1) * 0.01 * 1300 * k;
            const hg = 0.01 * 1300 * k;
            return (
              <g key={d}>
                <rect x={x} y={BASE - hg} width={44} height={hg} fill={C.a} rx={3} />
                <rect x={x + 50} y={BASE - hc} width={44} height={hc} fill={C.b} rx={3} />
              </g>
            );
          })}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <line x1={gx(0)} x2={gx(365)} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(0)} y1={BASE} y2={gy3(1.05)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(365)} y1={gy3(1)} y2={gy3(1)} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
          <polyline points={curve(down, day3, gy3)} fill="none" stroke={GRAY} strokeWidth={7} strokeLinejoin="round" />
          <circle cx={gx(day3)} cy={gy3(down(day3))} r={14} fill={GRAY} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <rect x={250} y={BASE - 560 * barK} width={200} height={560 * barK} fill={C.b} rx={8} />
          <rect x={630} y={BASE - Math.max(4, 560 * (0.0255 / 37.78)) * barK} width={200} height={Math.max(4, 560 * (0.0255 / 37.78)) * barK} fill={GRAY} rx={2} />
          <line x1={150} x2={930} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <line x1={gx(0)} x2={gx(365)} y1={940} y2={940} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 8" />
          <polyline points={curve(up, day5, gyLog)} fill="none" stroke={C.b} strokeWidth={8} strokeLinejoin="round" />
          <polyline points={curve(down, day5, gyLog)} fill="none" stroke={GRAY} strokeWidth={8} strokeLinejoin="round" />
          <circle cx={gx(0)} cy={940} r={14} fill="#fff" />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={gx(0)} y={BASE + 45} text="今日" size={48} opacity={Math.min(1, s1)} />
      <Label x={gx(365)} y={BASE + 45} text="1年後" align="right" size={48} opacity={Math.min(1, s1)} />
      <Label x={gx(Math.min(day, 365)) - 20} y={gy(up(Math.min(day, 365))) - 10} text={`${Math.floor(Math.min(day, 365))}日目`} align="right" size={48} opacity={s1 * (1 - ans)} />
      <Label x={gx(365) - 30} y={gy(up(365))} text="約38倍" align="right" size={72} color={C.b} opacity={Math.min(1, s1) * ans} scale={beat1} />
      <Label x={gx(365)} y={gy(add(365)) + 40} text="足し算 約4.7倍" align="right" size={52} color={C.a} opacity={Math.min(1, s1) * goldK} />
      {marks.map((d, i) => (
        <Label key={d} x={gx(d)} y={gy(up(d)) - 50} text={`${[2, 4, 8][i]}倍`} size={48} color={C.b} opacity={s1 * markK(i)} scale={i === 2 ? beat5 : 1} />
      ))}

      <Label x={110} y={640} text="毎日増える量" align="left" size={50} opacity={s2} />
      <Label x={162} y={BASE - 13 - 40} text="1%" size={48} color={C.a} opacity={s2 * incK(0)} />
      <Label x={140 + 6 * 122 + 72} y={BASE - up(364) * 13 - 40} text="約37%" size={52} color={C.b} opacity={s2 * incK(6)} />
      <Label x={540} y={BASE + 45} text="1日目 → 365日目" size={48} opacity={s2} />

      <Label x={gx(0) + 20} y={gy3(1) - 40} text="今日 1" align="left" size={48} opacity={s3} />
      <Label x={gx(365)} y={gy3(down(365)) - 60} text="約40分の1" align="right" size={64} color="#ddd" opacity={s3 * ramp(day3, 360, 5)} scale={beat7} />

      <Label x={350} y={BASE - 560 - 45} text="1.01 → 約38倍" size={52} color={C.b} opacity={s4 * barK} />
      <Label x={730} y={BASE - 60} text="0.99 → 約0.03倍" size={52} color="#ddd" opacity={s4 * barK} />
      <Label x={730} y={760} text="約1500倍の差" size={64} opacity={s4 * ramp(t, at(8, 0.6), 0.3)} scale={beat8} />

      <Label x={gx(365)} y={gyLog(up(Math.min(day5, 365))) - 45} text="毎日 +1%" align="right" size={52} color={C.b} opacity={s5 * ramp(day5, 300, 30)} />
      <Label x={gx(365)} y={gyLog(down(Math.min(day5, 365))) + 50} text="毎日 −1%" align="right" size={52} color="#ddd" opacity={s5 * ramp(day5, 300, 30)} />
      <Label x={gx(0) + 20} y={890} text="今日" align="left" size={48} opacity={s5} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>毎日1%の成長</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>1年後は何倍？</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(2), undefined, at(4) - 0.3)}>足すだけなら4.7倍</Line>
      <Line t={t} y={TOP[0]} size={72} color={C.b} life={L(at(4), undefined, at(5))}>増えたぶんにも1%</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(5), undefined, at(7))}>倍々に増える</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(8))}>毎日1%減ると</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(9))}>1.01と0.99</Line>
      <Line t={t} y={200} size={86} life={L(at(9), undefined, at(10))}>1.01の法則</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(10))}>小さな差も1年で</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.4), undefined, at(1))}>
        1年後 → 何倍？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.b} life={L(at(1, 0.1), undefined, at(2))}>
        約38倍
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.3), at(3), at(5))}>
        1 + 0.01 × 365 ≒ 4.7倍
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(3, 0.2), at(4), at(5))}>
        足し算 → 毎日 最初の1%
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(4, 0.2), undefined, at(5))}>
        掛け算 → 増えたぶんにも1%
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(5, 0.2), at(6), at(7))}>
        70日ごとに 2倍
      </Line>
      <Line t={t} y={BOT[1]} size={52} color={C.b} life={L(at(6, 0.3), undefined, at(7))}>
        1.01 × 1.01 × …（365回）≒ 37.8
      </Line>

      <Line t={t} y={BOT[0]} size={52} life={L(at(7, 0.3), undefined, at(8))}>
        0.99 × 0.99 × …（365回）≒ 0.026
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(8, 0.2), undefined, at(10))}>
        毎日 +1%
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(8, 0.25), undefined, at(10))}>
        ↑ 約38倍
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color="#ddd" life={L(at(8, 0.35), undefined, at(10))}>
        毎日 −1%
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color="#ddd" life={L(at(8, 0.4), undefined, at(10))}>
        ↓ 約40分の1
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.b} life={L(at(10, 0.4))}>
        毎日の小さな差が 大きな差に
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
