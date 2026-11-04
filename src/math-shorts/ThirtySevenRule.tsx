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
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, W } from "./kit";
import { MathShortProps } from "./timeline";

// 37%ルール（秘書問題）
// 要素A（ゴールド）: 見送りすぎの失敗（一番いい部屋を見送る）… 見送る数に比例して増える
// 要素B（シアン）  : 決めるのが早すぎる失敗 … 見送る数が少ないほど増える

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

// 10軒の点数（10が一番いい部屋）。最初の3軒の最高は8、そのあと最初に8を超えるのが10
const SCORES = [6, 3, 8, 2, 5, 10, 4, 9, 1, 7];
// 見送る数 r ごとの、成功・見送りすぎ・早すぎの確率（Python で計算）
const PROB = [
  { ok: 0.1, skip: 0, early: 0.9 },
  { ok: 0.283, skip: 0.1, early: 0.617 },
  { ok: 0.366, skip: 0.2, early: 0.434 },
  { ok: 0.399, skip: 0.3, early: 0.301 },
  { ok: 0.398, skip: 0.4, early: 0.202 },
  { ok: 0.373, skip: 0.5, early: 0.127 },
  { ok: 0.327, skip: 0.6, early: 0.073 },
  { ok: 0.265, skip: 0.7, early: 0.035 },
  { ok: 0.189, skip: 0.8, early: 0.011 },
  { ok: 0.1, skip: 0.9, early: 0 },
];

// 部屋カード（家の形と点数）
const Room: React.FC<{ x: number; y: number; score: number; shown: number; dim: number; pick: number; skip: number }> = ({
  x,
  y,
  score,
  shown,
  dim,
  pick,
  skip,
}) => (
  <g opacity={lerp(1, 0.35, dim)}>
    <rect x={x} y={y} width={170} height={200} rx={14} fill="#151515" stroke={pick > 0.5 ? C.b : skip > 0.5 ? C.a : "#fff"} strokeOpacity={pick > 0.5 || skip > 0.5 ? 1 : 0.5} strokeWidth={pick > 0.5 ? 7 : 3} />
    <polygon points={`${x + 45},${y + 80} ${x + 85},${y + 40} ${x + 125},${y + 80}`} fill="#ddd" />
    <rect x={x + 55} y={y + 80} width={60} height={40} fill="#ddd" />
    <text x={x + 85} y={y + 175} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={50} fill={pick > 0.5 ? C.b : "#fff"}>
      {shown > 0.5 ? `${score}点` : "？"}
    </text>
  </g>
);

export const ThirtySevenRule: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  const pos = (i: number) => ({ x: 70 + (i % 5) * 190, y: i < 5 ? 640 : 900 });

  // シーン1〜2: 10軒（0〜2）
  const s1 = sceneOpacity(t, at(0), at(3));
  const cardIn = (i: number) => ramp(t, at(0, 0.1) + i * 0.15, 0.3);
  const shown = (i: number) => (i < 3 ? ramp(t, at(1, 0.1) + i * 0.3, 0.2) : ramp(t, at(2, 0.05) + (i - 3) * 0.6, 0.2));
  const skipK = ramp(t, at(1, 0.2), 0.3);
  const pickK = ramp(t, at(2, 0.65), 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));

  // シーン3: 40% と 10%（3〜4）
  const s3 = sceneOpacity(t, at(3), at(5));
  const b40 = ramp(t, at(3, 0.3), 0.5);
  const b10 = ramp(t, at(4, 0.05), 0.5);
  const beat4 = beat(t, at(4) + durs[4], pauseOf(4));

  // シーン4: 見送る数ごとの失敗（5〜7）
  const s4 = sceneOpacity(t, at(5), at(8));
  const gx = (r: number) => 120 + r * 88;
  const gy = (v: number) => 1220 - v * 520;
  const goldK = ramp(t, at(5, 0.1), 0.6);
  const cyanK = ramp(t, at(6, 0.1), 0.6);
  const okK = ramp(t, at(7, 0.1), 0.5);
  const hl3 = ramp(t, at(7, 0.4), 0.3);

  // シーン5: 100軒・1000軒（8）／ 定理名（9）
  const s5 = sceneOpacity(t, at(8), at(10));
  const row = (i: number) => ramp(t, at(8, 0.05) + i * 0.4, 0.3);
  const beat8 = beat(t, at(8) + durs[8], pauseOf(8));

  // シーン6: 下見（10〜）
  const s6 = sceneOpacity(t, at(10), end + 1);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1〜2 */}
        <g opacity={s1}>
          {SCORES.map((sc, i) => (
            <g key={i} opacity={cardIn(i)}>
              <Room {...pos(i)} score={sc} shown={shown(i)} dim={i >= 6 ? pickK : 0} pick={i === 5 ? pickK : 0} skip={i < 3 ? skipK : 0} />
            </g>
          ))}
          {/* 最初の3軒のかっこ */}
          <polyline points={`70,620 70,605 620,605 620,620`} fill="none" stroke={C.a} strokeWidth={5} opacity={skipK} />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <rect x={140} y={760} width={800 * 0.4 * 2 * b40} height={110} fill={C.b} rx={10} />
          <rect x={140} y={1020} width={800 * 0.1 * 2 * b10} height={110} fill="#888" rx={10} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <line x1={90} x2={1000} y1={gy(0)} y2={gy(0)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {PROB.map((p, r) => {
            const x = gx(r);
            const hs = p.skip * 520 * goldK;
            const he = p.early * 520 * cyanK;
            const ho = p.ok * 520 * okK;
            return (
              <g key={r} opacity={r === 3 ? 1 : lerp(1, 0.5, hl3)}>
                <rect x={x} y={gy(0) - hs} width={70} height={hs} fill={C.a} />
                <rect x={x} y={gy(0) - hs - he} width={70} height={he} fill={C.b} opacity={0.85} />
                <rect x={x} y={gy(0) - hs - he - ho} width={70} height={ho} fill="#fff" opacity={0.85} />
              </g>
            );
          })}
          <rect x={gx(3) - 6} y={gy(1) - 6} width={82} height={532} fill="none" stroke="#fff" strokeWidth={4} opacity={hl3} rx={6} />
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={60} y={660 + i * 190} width={960} height={160} rx={16} fill="none" stroke="#fff" strokeOpacity={0.45 * row(i)} strokeWidth={1.5} />
          ))}
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          {SCORES.map((sc, i) => (
            <Room key={i} {...pos(i)} score={sc} shown={0} dim={0} pick={0} skip={i < 3 ? 1 : 0} />
          ))}
          <polyline points={`70,620 70,605 620,605 620,620`} fill="none" stroke={C.a} strokeWidth={5} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={345} y={570} text="最初の3軒は見送る" size={50} color={C.a} opacity={s1 * skipK} scale={beat1} />
      <Label x={540} y={1190} text={pickK > 0.5 ? "それまでの最高 8点を超えた → 決定" : "それまでの最高 8点"} size={48} color={pickK > 0.5 ? C.b : C.a} opacity={s1 * ramp(t, at(2, 0.05), 0.3)} />

      <Label x={140} y={725} text="このやり方" align="left" size={52} color={C.b} opacity={s3} />
      <Label x={140 + 640 * b40 + 20} y={815} text="約40%" align="left" size={64} color={C.b} opacity={s3 * b40} />
      <Label x={140} y={985} text="でたらめに選ぶ" align="left" size={52} opacity={s3 * b10} />
      <Label x={140 + 160 * b10 + 20} y={1075} text="10%" align="left" size={64} opacity={s3 * b10} />
      <Label x={540} y={1230} text="4倍" size={80} color={C.b} opacity={s3 * ramp(t, at(4, 0.4), 0.3)} scale={beat4} />

      {PROB.map((_, r) => (
        <Label key={r} x={gx(r) + 35} y={gy(0) + 40} text={`${r}`} size={48} opacity={s4} />
      ))}
      <Label x={90} y={620} text="見送りすぎの失敗" align="left" size={48} color={C.a} opacity={s4 * goldK} />
      <Label x={560} y={620} text="早すぎの失敗" align="left" size={48} color={C.b} opacity={s4 * cyanK} />
      <Label x={990} y={620} text="成功" align="right" size={48} opacity={s4 * okK} />

      {[
        { a: "10軒", b: "3軒 見送る", c: "約40%" },
        { a: "100軒", b: "37軒 見送る", c: "約37%" },
        { a: "1000軒", b: "368軒 見送る", c: "約37%" },
      ].map((rw, i) => (
        <React.Fragment key={i}>
          <Label x={100} y={740 + i * 190} text={rw.a} align="left" size={56} opacity={s5 * row(i)} />
          <Label x={300} y={740 + i * 190} text={rw.b} align="left" size={56} color={C.a} opacity={s5 * row(i)} />
          <Label x={990} y={740 + i * 190} text={rw.c} align="right" size={60} color={C.b} opacity={s5 * row(i)} scale={i === 2 ? beat8 : 1} />
        </React.Fragment>
      ))}

      <Label x={345} y={570} text="下見" size={56} color={C.a} opacity={s6} />
      <Label x={540} y={1190} text="4軒目から 本番" size={56} color={C.b} opacity={s6} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(3))}>10軒の部屋探し</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(3))}>一番いい部屋は？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(3), undefined, at(5))}>一番を選べる確率</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(5), at(7), at(8))}>見送る数と失敗</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(7), undefined, at(8))}>つり合うのは3軒</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(9))}>何軒あっても</Line>
      <Line t={t} y={200} size={86} life={L(at(9), undefined, at(10))}>37%ルール</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10))}>内見が10軒なら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.5), undefined, at(1))}>
        見たらすぐ決める
      </Line>
      <Line t={t} y={BOT[0]} size={72} color={C.a} life={L(at(1, 0.1), undefined, at(2))}>
        最初の3軒は見送り
      </Line>
      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(2, 0.1), undefined, at(3))}>
        それまでの一番を超えたら 決定
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(4, 0.3), undefined, at(5))}>
        40% ÷ 10% ＝ 4倍
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(5, 0.2), undefined, at(8))}>
        見送る数を増やす
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(5, 0.3), undefined, at(8))}>
        ↑ 見送りすぎ
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(6, 0.2), undefined, at(8))}>
        見送る数を減らす
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(6, 0.3), undefined, at(8))}>
        ↑ 早すぎ
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(8, 0.3), undefined, at(10))}>
        最初の37%を見送る
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(10, 0.3))}>
        最初の3軒は 下見
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
