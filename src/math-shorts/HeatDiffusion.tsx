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

// 熱の拡散（厚さ半分で火が通る時間は4分の1）
// 要素A（ゴールド）: 厚さ（中心までの距離）… ×1/2、×2
// 要素B（シアン）  : 火が通る時間 … ×1/4、×4

const BGM_VOLUME = 0.06;
const RAW = "#c4505a";
const COOKED = "#8a5a3a";

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

// 肉の断面。上下の面から cooked（0〜1：中心までの割合）だけ火が通る
const Slab: React.FC<{ x: number; y: number; w: number; h: number; cooked: number; done?: number }> = ({ x, y, w, h, cooked, done = 0 }) => {
  const d = Math.min(1, cooked) * (h / 2);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={RAW} />
      <rect x={x} y={y} width={w} height={d} rx={Math.min(16, d)} fill={COOKED} />
      <rect x={x} y={y + h - d} width={w} height={d} rx={Math.min(16, d)} fill={COOKED} />
      {/* 火の通りかけ（境目） */}
      <rect x={x} y={y + d - 6} width={w} height={12} fill="#d98a55" opacity={cooked < 1 && cooked > 0 ? 0.8 : 0} />
      <rect x={x} y={y + h - d - 6} width={w} height={12} fill="#d98a55" opacity={cooked < 1 && cooked > 0 ? 0.8 : 0} />
      <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke={C.b} strokeWidth={6} opacity={done} />
    </g>
  );
};

// ふらふら進む熱のつぶ（毎回同じ乱数）
const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const r = rng(101 + i * 17);
  const pts: [number, number][] = [[0, 0]];
  for (let k = 0; k < 160; k++) {
    const [x, y] = pts[k];
    pts.push([x + (r() - 0.5) * 2, Math.max(0, y + (r() < 0.53 ? 1 : -1))]);
  }
  return pts;
});

export const HeatDiffusion: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 4cm と 2cm の肉（0〜2）。時計は 0〜20分
  const s1 = sceneOpacity(t, at(0), at(3));
  const minutes = 20 * smooth((t - at(0, 0.1)) / (durs[0] * 0.85));
  // 火が通った深さ（cm）は時間の平方根に比例。4cm の中心（2cm）まで 20分
  const depth = 2 * Math.sqrt(minutes / 20);
  const thickCooked = depth / 2;
  const thinCooked = depth / 1;
  const thinDone = ramp(thinCooked, 0.98, 0.02);
  const thickDone = ramp(thickCooked, 0.98, 0.02);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));
  const SCALE = 60; // 1cm = 60px

  // シーン2: 熱のつぶ（3〜4）
  const s2 = sceneOpacity(t, at(3), at(5));
  const steps = 160 * smooth((t - at(3, 0.1)) / (durs[3] + durs[4] * 0.9));

  // シーン3: ふらふら歩き（5〜6）
  const s3 = sceneOpacity(t, at(5), at(7));
  const row = (i: number) => ramp(t, at(6, 0.05) + i * 0.6, 0.3);
  const beat6 = beat(t, at(6) + durs[6], pauseOf(6));

  // シーン4: 厚さと時間（7〜8）
  const s4 = sceneOpacity(t, at(7), at(9));
  const items = [
    { cm: 2, min: 5, on: at(7, 0.2) },
    { cm: 4, min: 20, on: at(7, 0.05) },
    { cm: 8, min: 80, on: at(8, 0.3) },
  ];
  const beat8 = beat(t, at(8) + durs[8], pauseOf(8));

  // シーン5: 定理名（9）／ シーン6: 切って焼く（10〜）
  const s5 = sceneOpacity(t, at(9), at(10));
  const s6 = sceneOpacity(t, at(10), end + 1);
  const cut = ramp(t, at(10, 0.15), 0.5);
  const cook6 = smooth((t - at(10, 0.45)) / (durs[10] * 0.5));

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          <Slab x={90} y={760} w={420} h={4 * SCALE} cooked={thickCooked} done={thickDone} />
          <Slab x={590} y={820} w={400} h={2 * SCALE} cooked={thinCooked} done={thinDone} />
          {/* 厚さの寸法 */}
          <g stroke={C.a} strokeWidth={4}>
            <line x1={60} x2={60} y1={760} y2={760 + 4 * SCALE} />
            <line x1={1010} x2={1010} y1={820} y2={820 + 2 * SCALE} />
          </g>
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <rect x={140} y={700} width={800} height={480} rx={20} fill={RAW} opacity={0.55} />
          <rect x={140} y={700} width={800} height={14} fill="#ffb066" />
          <line x1={140} x2={940} y1={940} y2={940} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          {PARTICLES.map((pts, i) => {
            const n = Math.floor(steps);
            const shown = pts.slice(0, n + 1);
            const X = (x: number) => 200 + i * 52 + x * 6;
            const Y = (y: number) => 714 + y * 6;
            const last = shown[shown.length - 1];
            return (
              <g key={i}>
                <polyline points={shown.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")} fill="none" stroke="#ffd08a" strokeOpacity={0.45} strokeWidth={2} />
                <circle cx={X(last[0])} cy={Y(last[1])} r={9} fill="#ffb066" />
              </g>
            );
          })}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {[0, 1].map((i) => (
            <rect key={i} x={80} y={760 + i * 220} width={920} height={180} rx={16} fill="none" stroke="#fff" strokeOpacity={0.45 * row(i)} strokeWidth={1.5} />
          ))}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <line x1={80} x2={1000} y1={1220} y2={1220} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {items.map((it, i) => {
            const k = ramp(t, it.on, 0.5);
            const x = 110 + i * 315;
            return (
              <g key={i} opacity={k}>
                <rect x={x} y={1220 - it.cm * 40 * k} width={115} height={it.cm * 40 * k} fill={C.a} rx={4} />
                <rect x={x + 135} y={1220 - it.min * 6.2 * k} width={115} height={it.min * 6.2 * k} fill={C.b} rx={4} />
              </g>
            );
          })}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <Slab x={190} y={760} w={700} h={360} cooked={0.55} />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          {[0, 1].map((ix) =>
            [0, 1].map((iy) => {
              const w = 300;
              const h = 180;
              const x = 240 + ix * (w + 40 * cut);
              const y = 760 + iy * (h + 40 * cut);
              return <Slab key={`${ix}${iy}`} x={x - 20 * cut} y={y - 20 * cut} w={w} h={h} cooked={cook6} done={ramp(cook6, 0.98, 0.02)} />;
            }),
          )}
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={300} y={700} text="厚さ 4cm" size={52} color={C.a} opacity={s1} />
      <Label x={790} y={760} text="厚さ 2cm" size={52} color={C.a} opacity={s1} />
      <Label x={540} y={1150} text={`${Math.floor(minutes)}分`} size={64} opacity={s1 * ramp(t, at(0, 0.1), 0.3)} />
      <Label x={790} y={1010} text="5分で完成" size={56} color={C.b} opacity={s1 * thinDone * ramp(t, at(1, 0.05), 0.3)} scale={beat1} />
      <Label x={300} y={1070} text="20分で完成" size={52} color={C.b} opacity={s1 * thickDone} />

      <Label x={540} y={660} text="表面（熱い）" size={50} color="#ffb066" opacity={s2} />
      <Label x={540} y={1230} text="中心" size={50} opacity={s2} />

      <Label x={540} y={700} text="ふらふら歩き（酔っ歩き）" size={52} opacity={s3} />
      {[
        { a: "100回", b: "10歩" },
        { a: "400回", b: "20歩" },
      ].map((r, i) => (
        <React.Fragment key={i}>
          <Label x={130} y={850 + i * 220} text={`時間 ${r.a}`} align="left" size={60} color={C.b} opacity={s3 * row(i)} />
          <Label x={950} y={850 + i * 220} text={`距離 ${r.b}`} align="right" size={60} color={C.a} opacity={s3 * row(i)} scale={i === 1 ? beat6 : 1} />
        </React.Fragment>
      ))}

      {items.map((it, i) => {
        const k = ramp(t, it.on, 0.5);
        const x = 110 + i * 315;
        return (
          <React.Fragment key={i}>
            <Label x={x + 57} y={1220 - it.cm * 40 - 40} text={`${it.cm}cm`} size={48} color={C.a} opacity={s4 * k} />
            <Label x={x + 192} y={1220 - it.min * 6.2 - 40} text={`${it.min}分`} size={52} color={C.b} opacity={s4 * k} scale={i === 2 ? beat8 : 1} />
          </React.Fragment>
        );
      })}
      <Label x={540} y={1265} text="厚さ　と　時間" size={48} opacity={s4} />

      <Label x={540} y={1180} text="じわじわ広がる" size={52} opacity={s5} />

      <Label x={540} y={1250} text="切ると 早く火が通る" size={52} color={C.b} opacity={s6 * ramp(cook6, 0.98, 0.02)} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(3))}>4cmの肉で20分</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.5), at(1), at(3))}>2cmなら何分？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(3), at(4), at(5))}>熱はじわじわ進む</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(4), undefined, at(5))}>行ったり来たり</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(5), undefined, at(7))}>距離2倍に時間4倍</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(9))}>厚さと時間</Line>

      <Line t={t} y={200} size={86} life={L(at(9), undefined, at(10))}>熱の拡散</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10))}>大きな肉や野菜は</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.5), undefined, at(1))}>
        厚さ半分なら 10分？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.b} life={L(at(1, 0.15), undefined, at(3))}>
        約5分
      </Line>
      <Line t={t} y={BOT[1]} size={60} life={L(at(2, 0.1), undefined, at(3))}>
        <span style={{ color: C.a }}>厚さ ×1/2</span> → <span style={{ color: C.b }}>時間 ×1/4</span>
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(4, 0.3), undefined, at(5))}>
        まっすぐではなく、ふらふら
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(5, 0.3), undefined, at(7))}>
        <span style={{ color: C.a }}>距離 ×2</span> → <span style={{ color: C.b }}>時間 ×4</span>
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(7, 0.2), undefined, at(9))}>
        厚さ
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(7, 0.25), undefined, at(9))}>
        ×1/2、×2
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(7, 0.4), undefined, at(9))}>
        時間
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(7, 0.45), undefined, at(9))}>
        ×1/4、×4
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(9, 0.3), undefined, at(10))}>
        厚さの2回かけ算で 時間が増える
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(10, 0.3))}>
        切ってから焼く
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
