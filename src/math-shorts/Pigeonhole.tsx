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

// 鳩の巣原理
// 要素A（ゴールド）: 箱の数（色の種類・髪の本数の種類）… 2通り、15万通り
// 要素B（シアン）  : 入れるものの数（取り出す靴下・東京の人）… 3つ、1400万人

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

const beat = (t: number, start: number, dur: number) => {
  const x = (t - start) / Math.max(dur, 0.3);
  return x <= 0 || x >= 1 ? 1 : 1 + 0.12 * Math.sin(Math.PI * x);
};

// 上が開いた箱
const Box: React.FC<{ x: number; y: number; w: number; h: number; glow?: number; opacity?: number }> = ({
  x,
  y,
  w,
  h,
  glow = 0,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    <polyline points={`${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}`} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={4} />
    <polyline points={`${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}`} fill="none" stroke={C.a} strokeWidth={7} opacity={glow} />
  </g>
);

// 靴下
const Sock: React.FC<{ x: number; y: number; s: number; dark: boolean; glow?: number }> = ({ x, y, s, dark, glow = 0 }) => (
  <g>
    <path
      d={`M ${x - 0.35 * s} ${y - s} L ${x + 0.25 * s} ${y - s} L ${x + 0.25 * s} ${y + 0.25 * s} Q ${x + 0.25 * s} ${y + 0.55 * s} ${x + 0.6 * s} ${y + 0.55 * s} L ${x + 0.75 * s} ${y + 0.55 * s} Q ${x + 0.95 * s} ${y + 0.75 * s} ${x + 0.75 * s} ${y + 0.95 * s} L ${x - 0.1 * s} ${y + 0.95 * s} Q ${x - 0.35 * s} ${y + 0.95 * s} ${x - 0.35 * s} ${y + 0.6 * s} Z`}
      fill={dark ? "#2b2b2b" : "#f2f2f2"}
      stroke={glow > 0 ? C.a : dark ? "#bbb" : "#888"}
      strokeWidth={glow > 0 ? 6 : 3}
      strokeLinejoin="round"
    />
  </g>
);

// 人の点を箱の中に積む（cols 列）
const Pile: React.FC<{ x: number; y: number; w: number; n: number; r: number; color: string; cols: number }> = ({
  x,
  y,
  w,
  n,
  r,
  color,
  cols,
}) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const c = i % cols;
      const row = Math.floor(i / cols);
      return <circle key={i} cx={x + ((c + 0.5) * w) / cols} cy={y - r - row * r * 2.2} r={r} fill={color} />;
    })}
  </g>
);

const Pigeon: React.FC<{ x: number; y: number; s: number; color: string }> = ({ x, y, s, color }) => (
  <g>
    <ellipse cx={x} cy={y} rx={s} ry={s * 0.7} fill={color} />
    <circle cx={x + s * 0.75} cy={y - s * 0.45} r={s * 0.42} fill={color} />
    <polygon points={`${x + s * 1.1},${y - s * 0.5} ${x + s * 1.45},${y - s * 0.38} ${x + s * 1.1},${y - s * 0.28}`} fill="#E2C48E" />
    <circle cx={x + s * 0.85} cy={y - s * 0.55} r={s * 0.08} fill="#111" />
  </g>
);

export const Pigeonhole: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 箱に人が降ってくる（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  const fill1 = smooth((t - at(0, 0.1)) / (durs[0] * 0.85));
  const hl1 = ramp(t, at(1, 0.15), 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));
  const B1 = Array.from({ length: 8 }, (_, i) => ({ x: 90 + (i % 4) * 230, y: i < 4 ? 680 : 980, n: [9, 10, 9, 10, 10, 9, 11, 9][i] }));

  // シーン2: 靴下（2〜6）
  const s2 = sceneOpacity(t, at(2), at(7));
  const slotK = (i: number) => ramp(t, [at(4, 0.05), at(4, 0.45), at(5, 0.1)][i], 0.35);
  const match = ramp(t, at(5, 0.5), 0.3);
  const beat5 = beat(t, at(5) + durs[5], pauseOf(5));
  const boxes6 = ramp(t, at(6, 0.05), 0.4);

  // シーン3: 髪の本数の箱と東京の人（7〜10）
  const s3 = sceneOpacity(t, at(7), at(11));
  const boxK = ramp(t, at(7, 0.1), 0.4);
  const crowdK = ramp(t, at(8, 0.1), 0.4);
  const spread = smooth((t - at(9, 0.05)) / (durs[9] * 0.6));
  const over = ramp(t, at(10, 0.3), 0.3);
  const beat10 = beat(t, at(10) + durs[10], pauseOf(10));
  const HB = [0, 1, 2, 3, 4, 5];

  // シーン4: 定理名（11）
  const s4 = sceneOpacity(t, at(11), at(12));

  // シーン5: 誕生月（12〜）
  const s5 = sceneOpacity(t, at(12), end + 1);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const perMonth = (m: number) => (m < 4 ? 4 : 3);
  const mFill = smooth((t - at(12, 0.05)) / (durs[12] * 0.55));
  const mHl = ramp(t, at(12, 0.6), 0.3);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          {B1.map((b, i) => {
            const n = Math.round(b.n * fill1);
            const g = i === 6 ? hl1 : 0;
            return (
              <g key={i}>
                <Box x={b.x} y={b.y} w={200} h={240} glow={g} />
                <Pile x={b.x + 10} y={b.y + 236} w={180} n={n} r={14} color={g > 0.5 ? C.a : C.b} cols={5} />
              </g>
            );
          })}
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          {/* 引き出し */}
          <g opacity={1 - ramp(t, at(4), 0.3)}>
            <rect x={140} y={700} width={800} height={420} rx={20} fill="#3a2f25" stroke="#7a6550" strokeWidth={4} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <g key={i} transform={`rotate(${(i * 37) % 50 - 25} ${220 + (i % 4) * 190} ${820 + Math.floor(i / 4) * 170})`}>
                <Sock x={220 + (i % 4) * 190} y={820 + Math.floor(i / 4) * 170} s={70} dark={i % 3 !== 1} />
              </g>
            ))}
            <rect x={140} y={700} width={800} height={420} rx={20} fill="#000" opacity={ramp(t, at(3, 0.2), 0.4) * 0.75} />
          </g>
          {/* 取り出した3つ */}
          <g opacity={ramp(t, at(4) - 0.1, 0.3) * (1 - boxes6)}>
            {[0, 1, 2].map((i) => (
              <g key={i} opacity={slotK(i)}>
                <rect x={110 + i * 300} y={720} width={260} height={360} rx={16} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.5} />
                <Sock x={240 + i * 300} y={900} s={110} dark={i !== 1} glow={i !== 1 ? match : 0} />
              </g>
            ))}
          </g>
          {/* 色の箱2つに3つを入れる */}
          <g opacity={boxes6}>
            <Box x={180} y={760} w={300} h={380} glow={1} />
            <Box x={600} y={760} w={300} h={380} />
            <Sock x={290} y={1020} s={80} dark />
            <Sock x={380} y={900} s={80} dark />
            <Sock x={750} y={1020} s={80} dark={false} />
          </g>
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {HB.map((i) => {
            const x = 60 + i * 168;
            const n = Math.round(lerp(0, i === 3 ? 12 : 11, spread));
            return (
              <g key={i} opacity={boxK}>
                <Box x={x} y={840} w={140} h={300} glow={i === 3 ? over : 0} />
                <Pile x={x + 8} y={1136} w={124} n={n} r={11} color={i === 3 && over > 0.5 ? C.a : C.b} cols={4} />
              </g>
            );
          })}
          {/* 東京の人のかたまり */}
          <g opacity={crowdK * (1 - spread)}>
            {Array.from({ length: 140 }, (_, i) => (
              <circle key={i} cx={300 + (i % 20) * 24 + (Math.floor(i / 20) % 2) * 12} cy={640 + Math.floor(i / 20) * 24} r={10} fill={C.b} />
            ))}
          </g>
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
            const x = 200 + (i % 3) * 240;
            const y = 640 + Math.floor(i / 3) * 210;
            return (
              <g key={i}>
                <rect x={x} y={y} width={200} height={180} fill="none" stroke={i === 4 ? C.a : "#fff"} strokeOpacity={i === 4 ? 1 : 0.6} strokeWidth={i === 4 ? 6 : 3} />
                <Pigeon x={x + (i === 4 ? 60 : 90)} y={y + 120} s={34} color={i === 4 ? C.a : "#9fb4c4"} />
                {i === 4 ? <Pigeon x={x + 140} y={y + 120} s={34} color={C.a} /> : null}
              </g>
            );
          })}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          {months.map((m) => {
            const x = 70 + (m % 6) * 160;
            const y = m < 6 ? 700 : 1000;
            const n = Math.round(perMonth(m) * mFill);
            const hl = m < 4 ? mHl : 0;
            return (
              <g key={m}>
                <Box x={x} y={y} w={140} h={200} glow={hl} />
                <Pile x={x + 10} y={y + 196} w={120} n={n} r={17} color={hl > 0.5 ? C.a : C.b} cols={2} />
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={90 + 2 * 230 + 100} y={1280} text="94人以上" size={60} color={C.a} opacity={s1 * hl1} scale={beat1} />
      <Label x={540} y={640} text="髪の本数ごとの箱" size={48} opacity={s1 * (1 - hl1)} />

      <Label x={540} y={1190} text="黒と白の靴下" size={52} opacity={s2 * (1 - ramp(t, at(4), 0.3))} />
      {["1つ目", "2つ目", "3つ目"].map((txt, i) => (
        <Label key={i} x={240 + i * 300} y={1140} text={txt} size={52} opacity={s2 * slotK(i) * (1 - boxes6)} />
      ))}
      <Label x={540} y={1240} text="同じ色" size={64} color={C.a} opacity={s2 * match * (1 - boxes6)} scale={beat5} />
      <Label x={330} y={1200} text="黒" size={52} opacity={s2 * boxes6} />
      <Label x={750} y={1200} text="白" size={52} opacity={s2 * boxes6} />

      {HB.map((i) => (
        <Label
          key={i}
          x={130 + i * 168}
          y={1190}
          text={["0本", "1本", "2本", "…", "…", "15万本"][i]}
          size={48}
          color={C.a}
          opacity={s3 * boxK}
        />
      ))}
      <Label x={540} y={780} text="約15万通りの箱" size={52} color={C.a} opacity={s3 * boxK * (1 - crowdK)} />
      <Label x={800} y={760} text="約1400万人" align="left" size={52} color={C.b} opacity={s3 * crowdK * (1 - spread)} />
      <Label x={540} y={780} text="平均 93人以上" size={56} color={C.b} opacity={s3 * ramp(spread, 0.8, 0.2) * (1 - over)} />
      <Label x={60 + 3 * 168 + 70} y={780} text="94人以上" size={60} color={C.a} opacity={s3 * over} scale={beat10} />

      {months.map((m) => (
        <Label key={m} x={140 + (m % 6) * 160} y={(m < 6 ? 700 : 1000) + 240} text={`${m + 1}月`} size={48} opacity={s5} />
      ))}

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>髪の本数が同じ人</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>東京に必ずいる？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(7))}>黒と白の靴下</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), at(6), at(7))}>何個でそろう？</Line>
      <Line t={t} y={TOP[2]} size={64} life={L(at(6), undefined, at(7))}>種類より1つ多く</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(7), at(8), at(11))}>髪の本数 約15万通り</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.b} life={L(at(8), undefined, at(11))}>東京 約1400万人</Line>

      <Line t={t} y={200} size={86} life={L(at(11), undefined, at(12))}>鳩の巣原理</Line>
      <Line t={t} y={360} size={60} life={L(at(11, 0.2), undefined, at(12))}>鳩より巣が少ないと</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(12))}>40人のクラスなら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.4), undefined, at(1))}>
        ぴったり同じ本数？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.a} life={L(at(1, 0.1), undefined, at(2))}>
        必ずいる
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(4, 0.2), at(5), at(7))}>
        2つ目まで → 黒と白
      </Line>
      <Line t={t} y={BOT[1]} size={64} color={C.a} life={L(at(5, 0.4), at(6), at(7))}>
        3つ目 → 必ずかぶる
      </Line>
      <Line t={t} y={BOT[2]} size={60} life={L(at(6, 0.2), undefined, at(7))}>
        <span style={{ color: C.a }}>色 2種類</span>
        <span style={{ color: C.b }}>取る 3つ</span>
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(9, 0.1), at(10), at(11))}>
        1400万 ÷ 15万 ≒ 93.3
      </Line>
      <Line t={t} y={BOT[1]} size={64} color={C.a} life={L(at(10, 0.4), undefined, at(11))}>
        どこかの箱に 94人以上
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(11, 0.3), undefined, at(12))}>
        入れる数 ＞ 箱の数 → かぶる
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(12, 0.3), at(12, 0.6))}>
        <Tex src="40 \div 12 \approx 3.3" />
      </Line>
      <Line t={t} y={BOT[1]} size={64} color={C.a} life={L(at(12, 0.6))}>
        同じ誕生月が 必ず4人以上
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
