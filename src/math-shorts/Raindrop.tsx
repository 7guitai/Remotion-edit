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

// 雨粒の終端速度
// 要素A（ゴールド）: 空気の抵抗 … 速く落ちるほど強くなる
// 要素B（シアン）  : 雨粒の重さ … ずっと同じ。つり合うと速さが止まる

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

// しずくの形（中心 x, y、大きさ s）
const Drop: React.FC<{ x: number; y: number; s: number; opacity?: number }> = ({ x, y, s, opacity = 1 }) => (
  <path
    d={`M ${x} ${y - 1.5 * s} C ${x + 0.55 * s} ${y - 0.6 * s} ${x + s} ${y - 0.1 * s} ${x + s} ${y + 0.35 * s} A ${s} ${s} 0 1 1 ${x - s} ${y + 0.35 * s} C ${x - s} ${y - 0.1 * s} ${x - 0.55 * s} ${y - 0.6 * s} ${x} ${y - 1.5 * s} Z`}
    fill="url(#drop-grad)"
    opacity={opacity}
  />
);

// 太い矢印（上向き dir=-1、下向き dir=1）
const Arrow: React.FC<{ x: number; y: number; len: number; dir: 1 | -1; color: string; opacity?: number }> = ({
  x,
  y,
  len,
  dir,
  color,
  opacity = 1,
}) => {
  if (len < 4) return null;
  const tip = y + dir * len;
  const head = Math.min(36, len * 0.5);
  return (
    <g opacity={opacity}>
      <line x1={x} y1={y} x2={x} y2={tip - dir * head * 0.6} stroke={color} strokeWidth={16} strokeLinecap="round" />
      <polygon points={`${x - 28},${tip - dir * head} ${x + 28},${tip - dir * head} ${x},${tip}`} fill={color} />
    </g>
  );
};

const Cloud: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g fill="#d8d8d8">
    <ellipse cx={x} cy={y} rx={110} ry={46} />
    <ellipse cx={x - 70} cy={y + 10} rx={60} ry={36} />
    <ellipse cx={x + 72} cy={y + 8} rx={66} ry={38} />
    <ellipse cx={x + 10} cy={y - 32} rx={62} ry={40} />
  </g>
);

// 直径2mmの雨粒の速さ（時速km）。終端速度 6.49m/s、時定数 = 終端速度 / g
const VT2 = 6.49;
const TAU = VT2 / 9.8;
const vKmh = (sec: number) => VT2 * Math.tanh(sec / TAU) * 3.6;

export const Raindrop: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });
  const GROUND = 1240;

  // シーン1: 空気がない落下（0）
  const s1 = sceneOpacity(t, at(0), at(1));
  const fall = smooth((t - at(0, 0.1)) / (durs[0] * 0.8));
  // 落ちた距離は時間の2乗（等加速度）
  const dropY = lerp(700, GROUND - 50, fall * fall);
  const speed1 = Math.round(504 * fall);

  // シーン2: 速さの比べ（1〜2）
  const s2 = sceneOpacity(t, at(1), at(3));
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));
  const bars = [
    { name: "空気なしの雨", v: 504, color: C.b, on: at(1, 0.1) },
    { name: "新幹線", v: 320, color: "#bbb", on: at(1, 0.5) },
    { name: "本当の雨", v: 23, color: C.a, on: at(2, 0.3) },
    { name: "自転車", v: 20, color: "#bbb", on: at(2, 0.75) },
  ];

  // シーン3: 力のつり合い（3〜6）
  const s3 = sceneOpacity(t, at(3), at(7));
  // 4 で速さが上がるにつれて抵抗が伸び、6 で重さと同じ長さになる
  const fK = smooth((t - at(4, 0.1)) / (durs[4] + durs[5] + durs[6] * 0.5));
  const dragLen = 220 * fK * fK;
  const weightK = ramp(t, at(3, 0.2), 0.4);
  const dragShow = ramp(t, at(3, 0.3), 0.4);
  const weightHl = ramp(t, at(5), 0.3) * (1 - ramp(t, at(6), 0.3));
  const balance = ramp(t, at(6, 0.5), 0.3);
  const beat6 = beat(t, at(6) + durs[6], pauseOf(6));
  const speed3 = Math.round(23 * fK);

  // シーン4: 速さのグラフ（7）
  const s4 = sceneOpacity(t, at(7), at(8));
  const gk = smooth((t - at(7, 0.05)) / (durs[7] * 0.7));
  const gx = (sec: number) => lerp(170, 940, sec / 3);
  const gy = (kmh: number) => lerp(1200, 700, kmh / 30);
  const curve = Array.from({ length: 61 }, (_, i) => (i / 60) * 3)
    .filter((s) => s <= gk * 3)
    .map((s) => `${gx(s)},${gy(vKmh(s))}`)
    .join(" ");

  // シーン5: 大きさと速さ（8〜9）
  const s5 = sceneOpacity(t, at(8), at(10));
  const sizes = [
    { d: 1, kmh: 14, x: 230 },
    { d: 2, kmh: 23, x: 540 },
    { d: 4, kmh: 32, x: 850 },
  ];
  const showSize = (i: number) => ramp(t, [at(9, 0.05), at(8, 0.1), at(9, 0.5)][i], 0.3);
  const beat9 = beat(t, at(9) + durs[9], pauseOf(9));

  // シーン6: 定理名（10）／ シーン7: 傘（11〜）
  const s6 = sceneOpacity(t, at(10), at(11));
  const s7 = sceneOpacity(t, at(11), end + 1);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="drop-grad" cx="38%" cy="55%" r="70%">
            <stop offset="0%" stopColor="#9fe3f5" />
            <stop offset="100%" stopColor="#1b7fa8" />
          </radialGradient>
        </defs>

        {/* シーン1 */}
        <g opacity={s1}>
          <Cloud x={300} y={620} />
          <line x1={80} x2={1000} y1={GROUND} y2={GROUND} stroke="#fff" strokeOpacity={0.6} strokeWidth={3} />
          <line x1={300} x2={300} y1={700} y2={dropY} stroke={C.b} strokeOpacity={0.35} strokeWidth={4} strokeDasharray="6 10" />
          <Drop x={300} y={dropY} s={26} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          {bars.map((b, i) => {
            const k = ramp(t, b.on, 0.5);
            return <rect key={i} x={140} y={700 + i * 140} width={(b.v / 504) * 780 * k + 6} height={60} fill={b.color} rx={8} opacity={k} />;
          })}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <Drop x={540} y={930} s={95} />
          <Arrow x={540} y={1070} len={190} dir={1} color={C.b} opacity={weightK * lerp(1, 1, weightHl)} />
          <Arrow x={540} y={760} len={dragLen} dir={-1} color={C.a} opacity={dragShow} />
          {/* 空気の流れ */}
          {[-1, 1].map((sgn) =>
            [0, 1, 2].map((j) => (
              <line
                key={`${sgn}${j}`}
                x1={540 + sgn * (160 + j * 50)}
                x2={540 + sgn * (160 + j * 50)}
                y1={1150 - ((t * 400 * (0.2 + fK)) % 500)}
                y2={1150 - ((t * 400 * (0.2 + fK)) % 500) - 60 - 120 * fK}
                stroke="#fff"
                strokeOpacity={0.35}
                strokeWidth={3}
                strokeLinecap="round"
              />
            )),
          )}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <line x1={gx(0)} x2={gx(3)} y1={gy(0)} y2={gy(0)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(0)} y1={gy(0)} y2={gy(30)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(3)} y1={gy(23.4)} y2={gy(23.4)} stroke="#fff" strokeOpacity={0.45} strokeWidth={2} strokeDasharray="10 10" />
          <polyline points={curve} fill="none" stroke={C.b} strokeWidth={6} strokeLinejoin="round" />
          <line x1={gx(1)} x2={gx(1)} y1={gy(0)} y2={gy(vKmh(1))} stroke={C.a} strokeWidth={3} strokeDasharray="8 8" opacity={ramp(gk, 0.4, 0.1)} />
          <circle cx={gx(1)} cy={gy(vKmh(1))} r={12} fill={C.a} opacity={ramp(gk, 0.4, 0.1)} />
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <line x1={80} x2={1000} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {sizes.map((z, i) => {
            const k = showSize(i);
            return (
              <g key={i} opacity={k}>
                <Drop x={z.x} y={690} s={14 * z.d} />
                <rect x={z.x - 60} y={1200 - z.kmh * 8 * k} width={120} height={z.kmh * 8 * k} fill={C.b} rx={6} />
              </g>
            );
          })}
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <Drop x={540} y={930} s={95} />
          <Arrow x={540} y={1070} len={190} dir={1} color={C.b} />
          <Arrow x={540} y={760} len={190} dir={-1} color={C.a} />
        </g>

        {/* シーン7 */}
        <g opacity={s7}>
          {Array.from({ length: 26 }, (_, i) => {
            const x = 90 + ((i * 137) % 900);
            const y0 = 560 + ((i * 263) % 700);
            const y = 560 + ((y0 - 560 + (t - at(11)) * 260) % 700);
            return <line key={i} x1={x} x2={x - 6} y1={y} y2={y + 34} stroke={C.b} strokeWidth={4} strokeLinecap="round" opacity={y < 860 || x < 300 || x > 780 ? 0.8 : 0} />;
          })}
          {/* 傘 */}
          <path d="M 300 900 Q 540 640 780 900 Q 720 870 660 900 Q 600 870 540 900 Q 480 870 420 900 Q 360 870 300 900 Z" fill={C.a} />
          <line x1={540} x2={540} y1={760} y2={1120} stroke="#ddd" strokeWidth={8} />
          <path d="M 540 1120 Q 540 1160 505 1160 Q 475 1160 475 1130" fill="none" stroke="#ddd" strokeWidth={8} strokeLinecap="round" />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={450} y={620} text="高さ1000m" align="left" size={52} opacity={s1} />
      <Label x={360} y={dropY} text={`時速 ${speed1}km`} align="left" size={60} color={C.b} opacity={s1 * ramp(t, at(0, 0.15), 0.3)} />

      {bars.map((b, i) => (
        <React.Fragment key={i}>
          <Label x={140} y={672 + i * 140 - 18} text={b.name} align="left" size={48} color={b.color === "#bbb" ? "#ddd" : b.color} opacity={s2 * ramp(t, b.on, 0.3)} />
          <Label
            x={940}
            y={672 + i * 140 - 18}
            text={`${b.v}km`}
            align="right"
            size={52}
            color={b.color === "#bbb" ? "#ddd" : b.color}
            opacity={s2 * ramp(t, b.on + 0.3, 0.3)}
            scale={i === 0 ? beat1 : 1}
          />
        </React.Fragment>
      ))}

      <Label x={640} y={1170} text="重さ" align="left" size={56} color={C.b} opacity={s3 * weightK} scale={1 + 0.1 * weightHl} />
      <Label x={640} y={700} text="空気の抵抗" align="left" size={56} color={C.a} opacity={s3 * dragShow} />
      <Label x={260} y={930} text={`時速${speed3}km`} size={56} opacity={s3 * ramp(t, at(4), 0.3)} scale={beat6} />
      <Label x={820} y={930} text="つり合い" size={56} opacity={s3 * balance} />

      <Label x={gx(3)} y={gy(0) + 45} text="秒" align="right" size={48} opacity={s4} />
      {[1, 2, 3].map((s) => (
        <Label key={s} x={gx(s)} y={gy(0) + 45} text={`${s}`} size={48} opacity={s4} />
      ))}
      <Label x={gx(3)} y={gy(23.4) - 40} text="時速23km" align="right" size={52} color={C.b} opacity={s4} />
      <Label x={gx(1) + 25} y={gy(vKmh(1)) + 50} text="約1秒・5m" align="left" size={52} color={C.a} opacity={s4 * ramp(gk, 0.45, 0.1)} />

      {sizes.map((z, i) => (
        <React.Fragment key={i}>
          <Label x={z.x} y={820} text={`${z.d}mm`} size={50} opacity={s5 * showSize(i)} />
          <Label x={z.x} y={1200 - z.kmh * 8 - 40} text={`${z.kmh}km`} size={52} color={C.b} opacity={s5 * showSize(i)} scale={i === 2 ? beat9 : 1} />
        </React.Fragment>
      ))}
      <Label x={540} y={1250} text="直径　→　時速" size={48} opacity={s5} />

      <Label x={720} y={700} text="抵抗" align="left" size={52} color={C.a} opacity={s6} />
      <Label x={720} y={1170} text="重さ" align="left" size={52} color={C.b} opacity={s6} />
      <Label x={230} y={930} text="抵抗 ＝ 重さ" size={56} opacity={s6} />

      <Label x={540} y={1240} text="時速 約23km" size={56} color={C.b} opacity={s7} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>空気がなかったら</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>雨はどれだけ速い？</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(2), undefined, at(3))}>本当の雨は</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(3), at(4), at(7))}>ブレーキは空気</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.a} life={L(at(4), at(5), at(7))}>速いほど抵抗↑</Line>
      <Line t={t} y={TOP[2]} size={72} color={C.b} life={L(at(5), undefined, at(7))}>重さはずっと同じ</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(8))}>あっという間に</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(10))}>大きい粒ほど速い</Line>

      <Line t={t} y={200} size={86} life={L(at(10), undefined, at(11))}>終端速度</Line>
      <Line t={t} y={360} size={60} life={L(at(10, 0.3), undefined, at(11))}>もう速くならない速さ</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(11))}>雨が痛くないのは</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.5), undefined, at(1))}>
        地面での速さは？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.b} life={L(at(1, 0.1), undefined, at(2))}>
        時速 約500km
      </Line>
      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(2, 0.3), undefined, at(3))}>
        直径2mm → 時速 約23km
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(4, 0.2), at(5), at(7))}>
        抵抗 → 速さとともに強く
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(5, 0.2), at(6), at(7))}>
        重さ → ずっと同じ
      </Line>
      <Line t={t} y={BOT[2]} size={64} life={L(at(6, 0.4), undefined, at(7))}>
        抵抗 ＝ 重さ で一定
      </Line>

      <Line t={t} y={BOT[0]} size={64} life={L(at(7, 0.3), undefined, at(8))}>
        約1秒・5mで ほぼ最高速
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(8, 0.3), undefined, at(10))}>
        重い粒ほど 速く落ちる
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(11, 0.3))}>
        空気がブレーキ
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
