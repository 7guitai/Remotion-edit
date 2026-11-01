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

// コッホ雪片
// 要素A（ゴールド）: 面積 … 増える量は毎回小さくなり、最初の三角形の1.6倍で止まる
// 要素B（シアン）  : まわりの長さ … 毎回4/3倍で、いくらでも伸びる

const BGM_VOLUME = 0.06;

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

type P = [number, number];

// 三角形（外接円の半径 r、中心 cx, cy、頂点が上）
const triangle = (cx: number, cy: number, r: number): P[] =>
  [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

// 各辺の真ん中に外向きの三角形を立てる。h（0〜1）は立てる高さの割合
const kochStep = (pts: P[], h = 1): P[] => {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const dx = (bx - ax) / 3;
    const dy = (by - ay) / 3;
    const p1: P = [ax + dx, ay + dy];
    const p2: P = [ax + 2 * dx, ay + 2 * dy];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    // 時計回りの頂点列なので、外向きは (dy, -dx) 方向
    const k = (Math.sqrt(3) / 2) * h;
    out.push(pts[i], p1, [mx + dy * k * 1, my - dx * k * 1], p2);
  }
  return out;
};

// level は小数も可（端数は次の段の三角形が立ち上がる途中）
const koch = (cx: number, cy: number, r: number, level: number): P[] => {
  let pts = triangle(cx, cy, r);
  const full = Math.floor(level);
  for (let i = 0; i < full; i++) pts = kochStep(pts);
  const frac = level - full;
  if (frac > 0) pts = kochStep(pts, smooth(frac));
  return pts;
};

const poly = (pts: P[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

const CX = 540;
const CY = 940;
const R = 290;

export const KochSnowflake: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 完成した雪片と円（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  const trace = smooth((t - at(0, 0.05)) / (durs[0] * 0.8));
  const circleK = ramp(t, at(1, 0.15), 0.4);

  // シーン2: 三角形から作る（2〜6）
  const s2 = sceneOpacity(t, at(2), at(7));
  const lvl = (() => {
    if (t < at(3, 0.3)) return 0;
    if (t < at(5)) return smooth((t - at(3, 0.3)) / 0.8);
    return 1 + 3 * smooth((t - at(5, 0.05)) / (durs[5] * 0.9));
  })();
  // 3 で1辺を取り出して見せる
  const sideK = ramp(t, at(4), 0.3) * (1 - ramp(t, at(5), 0.3));
  const side4 = ramp(t, at(4, 0.3), 0.6);
  // 1辺の拡大図を出すあいだは、図形を小さく上へ
  const r2 = lerp(R, 200, sideK);
  const cy2 = lerp(CY, 840, sideK);

  // シーン3: 面積の増え方（7）
  const s3 = sceneOpacity(t, at(7), at(8));
  const incs = [1 / 3, 4 / 27, 16 / 243, 64 / 2187, 256 / 19683, 1024 / 177147];
  const barK = (i: number) => ramp(t, at(7, 0.1) + i * 0.35, 0.3);

  // シーン4: 9分の1（8）
  const s4 = sceneOpacity(t, at(8), at(9));
  const oneK = ramp(t, at(8, 0.35), 0.4);

  // シーン5: 面積は1.6倍で止まる（9）／ 定理名（10）
  const s5 = sceneOpacity(t, at(9), at(11));
  const fillK = ramp(t, at(9, 0.1), 0.5);

  // シーン6: 50回で約480km（11〜）
  const s6 = sceneOpacity(t, at(11), end + 1);
  const unroll = smooth((t - at(11, 0.2)) / (durs[11] * 0.8 + 0.5));

  const flake5 = koch(CX, CY, R, 5);
  const tri0 = triangle(CX, CY, R);

  // 9 個の小さな三角形（1辺 1/3）で大きな三角形を敷き詰める
  const T9 = (() => {
    const big = triangle(540, 960, 300);
    const [A, B, Cc] = [big[0], big[1], big[2]];
    const pt = (i: number, j: number): P => [
      A[0] + ((B[0] - A[0]) * i) / 3 + ((Cc[0] - B[0]) * j) / 3,
      A[1] + ((B[1] - A[1]) * i) / 3 + ((Cc[1] - B[1]) * j) / 3,
    ];
    const tris: P[][] = [];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j <= i; j++) {
        tris.push([pt(i, j), pt(i + 1, j), pt(i + 1, j + 1)]);
        if (j < i) tris.push([pt(i, j), pt(i + 1, j + 1), pt(i, j + 1)]);
      }
    return tris;
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          <polygon points={poly(flake5)} fill={C.a} opacity={0.18 * trace} />
          <polyline
            points={poly([...flake5, flake5[0]])}
            fill="none"
            stroke={C.b}
            strokeWidth={3}
            strokeDasharray={`${trace * 9000} 9000`}
            pathLength={9000}
          />
          <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="12 10" opacity={circleK} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <circle cx={CX} cy={cy2} r={r2 + 2} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="12 10" />
          <polygon points={poly(koch(CX, cy2, r2, lvl))} fill={C.a} fillOpacity={0.15} stroke={C.b} strokeWidth={lvl > 3 ? 3 : 5} strokeLinejoin="round" />
          {/* 1辺を取り出して拡大（3cm → 1cm × 4） */}
          <g opacity={sideK}>
            <rect x={90} y={1100} width={900} height={190} rx={16} fill="#000" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.5} />
            <polyline
              points={(() => {
                const ax = 290;
                const bx = 790;
                const y = 1265;
                const d = (bx - ax) / 3;
                const hh = d * (Math.sqrt(3) / 2) * side4 * 0.9;
                return `${ax},${y} ${ax + d},${y} ${ax + 1.5 * d},${y - hh} ${ax + 2 * d},${y} ${bx},${y}`;
              })()}
              fill="none"
              stroke={C.b}
              strokeWidth={6}
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <line x1={140} x2={950} y1={1180} y2={1180} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {incs.map((v, i) => {
            const hb = v * 1300 * barK(i);
            return <rect key={i} x={170 + i * 130} y={1180 - Math.max(hb, 3 * barK(i))} width={90} height={Math.max(hb, 3 * barK(i))} fill={C.a} rx={4} />;
          })}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {T9.map((tr, i) => (
            <polygon key={i} points={poly(tr)} fill={i === 0 ? C.a : "none"} fillOpacity={i === 0 ? oneK : 0} stroke="#fff" strokeOpacity={0.7} strokeWidth={2} />
          ))}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="12 10" opacity={0.8} />
          <polygon points={poly(flake5)} fill={C.a} fillOpacity={0.55 * fillK} stroke={C.b} strokeWidth={3} />
          <polygon points={poly(tri0)} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="8 8" opacity={fillK * (1 - ramp(t, at(10), 0.3))} />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <polygon points={poly(koch(270, 820, 110, 4))} fill={C.a} fillOpacity={0.25} stroke={C.b} strokeWidth={2} />
          <line x1={120} x2={lerp(120, 960, unroll)} y1={1130} y2={1130} stroke={C.b} strokeWidth={8} strokeLinecap="round" />
          <circle cx={120} cy={1130} r={14} fill="#fff" />
          <circle cx={960} cy={1130} r={14} fill="#fff" opacity={ramp(unroll, 0.95, 0.05)} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={CX + R * 0.75} y={CY - R * 0.95} text="この円" align="left" size={52} opacity={s1 * circleK} />

      <Label x={CX} y={CY + R * 0.5 + 60} text="9cm" size={52} opacity={s2 * ramp(t, at(2, 0.3), 0.3) * (1 - ramp(t, at(3), 0.3))} />
      <Label x={120} y={1145} text="3cm" align="left" size={48} opacity={s2 * sideK * (1 - side4)} />
      <Label x={120} y={1145} text="1cm × 4本" size={48} color={C.b} opacity={s2 * sideK * ramp(side4, 0.8, 0.2)} align="left" />
      <Label x={850} y={680} align="left" text={`${Math.min(4, Math.round(lvl))}回`} size={56} opacity={s2 * ramp(t, at(5), 0.3)} />

      {incs.slice(0, 4).map((v, i) => (
        <Label key={i} x={215 + i * 130} y={1180 - v * 1300 - 40} text={`+${v.toFixed(2)}`} size={48} opacity={s3 * barK(i)} />
      ))}
      <Label x={140} y={660} text="増える面積（三角形＝1）" align="left" size={50} color={C.a} opacity={s3} />
      <Label x={545} y={1230} text="1回目 → 6回目" size={48} opacity={s3} />

      <Label x={630} y={720} text="9分の1" align="left" size={56} color={C.a} opacity={s4 * oneK} />

      <Label x={CX} y={CY + 30} text="1.6倍" size={80} opacity={s5 * fillK * (1 - ramp(t, at(10), 0.3))} />

      <Label x={270} y={1010} text="手のひらサイズ" size={48} opacity={s6} />
      <Label x={120} y={1195} text="東京" size={52} opacity={s6} />
      <Label x={960} y={1195} text="大阪" size={52} opacity={s6 * ramp(unroll, 0.95, 0.05)} />
      <Label x={540} y={1195} text="約480km" size={56} color={C.b} opacity={s6 * ramp(unroll, 0.6, 0.2)} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} color={C.b} life={L(at(0), at(1), at(2))}>まわりは無限</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.a} life={L(at(0, 0.45), at(1), at(2))}>面積は有限</Line>
      <Line t={t} y={TOP[2]} size={72} life={L(at(1), undefined, at(2))}>この円の中だけ</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(5))}>1辺9cmの三角形</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), undefined, at(5))}>真ん中に三角形</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.b} life={L(at(5), undefined, at(7))}>まわりは毎回4/3倍</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(7), at(8), at(9))}>増える面積は</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.a} life={L(at(8), undefined, at(9))}>前の9分の1</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(10))}>面積は1.6倍で止まる</Line>

      <Line t={t} y={200} size={86} life={L(at(10), at(11))}>コッホ雪片</Line>
      <Line t={t} y={360} size={72} life={L(at(11))}>50回描けたら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(0, 0.3), undefined, at(2))}>
        まわりの長さ → 無限
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(0, 0.6), undefined, at(2))}>
        面積 → 円の中に収まる
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(2, 0.5), at(3), at(5))}>
        まわり 9 × 3 ＝ 27cm
      </Line>
      <Line t={t} y={BOT[1]} size={60} life={L(at(3, 0.2), at(4), at(5))}>
        各辺を3つに分ける
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(4, 0.55), undefined, at(5))}>
        まわり 27cm → 36cm
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(5, 0.2), at(6), at(7))}>
        27 → 36 → 48 → 64 → …
      </Line>
      <Line t={t} y={BOT[1]} size={64} color={C.b} life={L(at(6, 0.05), at(6, 0.55), at(7))}>
        10回 約4.8m
      </Line>
      <Line t={t} y={BOT[2]} size={64} color={C.b} life={L(at(6, 0.55), undefined, at(7))}>
        20回 約85m
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(7, 0.3), undefined, at(8))}>
        0.33 → 0.15 → 0.07 → …
      </Line>
      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(8, 0.4), undefined, at(9))}>
        新しい三角形は 9分の1
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(9, 0.2), undefined, at(10))}>
        面積
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(9, 0.25), undefined, at(10))}>
        1.6倍で止まる
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(9, 0.5), undefined, at(10))}>
        まわり
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(9, 0.55), undefined, at(10))}>
        ↑ いくらでも
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.b} life={L(at(11, 0.4), at(12), undefined)}>
        50回 → 約480km
      </Line>
      <Line t={t} y={BOT[1]} size={64} life={L(at(12, 0.3))}>
        東京から大阪ほど
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
