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

// ハチの巣が六角形の理由（ハニカム予想）
// 要素A（ゴールド）: 部屋の広さ … どれも同じ1
// 要素B（シアン）  : まわりの長さ（ろうの量）… 三角形4.56、四角形4、六角形3.72

const BGM_VOLUME = 0.06;
const WAX = "#e3b54a";

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

// 正多角形（中心 cx, cy、外接円の半径 r、n 角形、回転 rot 度）
const poly = (cx: number, cy: number, r: number, n: number, rot: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((rot + (360 * k) / n) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

// 面積1にそろえたときの外接円の半径（面積の単位 U px²）
const U = 165 * 165;
const R3 = Math.sqrt((4 / Math.sqrt(3)) * U) / Math.sqrt(3); // 三角形：一辺 s、外接円 s/√3
const R4 = Math.sqrt(U) / Math.SQRT2; // 正方形：一辺 s、外接円 s/√2
const R6 = Math.sqrt((2 / (3 * Math.sqrt(3))) * U); // 六角形：一辺＝外接円

// 六角形のしきつめ（とがった方が上）
const hexGrid = (cx: number, cy: number, r: number, cols: number, rows: number) => {
  const out: { x: number; y: number }[] = [];
  const w = Math.sqrt(3) * r;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) out.push({ x: cx + (i - (cols - 1) / 2) * w + (j % 2 ? w / 2 : 0), y: cy + (j - (rows - 1) / 2) * 1.5 * r });
  return out;
};

const Bee: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g>
    <ellipse cx={x - s * 0.2} cy={y - s * 0.75} rx={s * 0.45} ry={s * 0.3} fill="#dff3fb" opacity={0.75} />
    <ellipse cx={x + s * 0.3} cy={y - s * 0.75} rx={s * 0.45} ry={s * 0.3} fill="#dff3fb" opacity={0.75} />
    <ellipse cx={x} cy={y} rx={s} ry={s * 0.6} fill={WAX} />
    {[-0.35, 0.05, 0.45].map((k) => (
      <rect key={k} x={x + k * s - s * 0.1} y={y - s * 0.58} width={s * 0.2} height={s * 1.16} fill="#222" />
    ))}
    <circle cx={x + s * 1.05} cy={y - s * 0.1} r={s * 0.38} fill="#222" />
  </g>
);

export const Honeycomb: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 巣（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  const HG = hexGrid(540, 900, 70, 7, 5);
  const cellK = (i: number) => ramp(t, at(0, 0.05) + (i % 7) * 0.12 + Math.floor(i / 7) * 0.18, 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));

  // シーン2: 3つの形（2〜6）
  const s2 = sceneOpacity(t, at(2), at(7));
  const SX = [200, 540, 880];
  const tileK = ramp(t, at(2, 0.2), 0.4) * (1 - ramp(t, at(4), 0.3));
  const oneK = ramp(t, at(4, 0.1), 0.4);
  const periK = (i: number) => ramp(t, at(5, 0.1) + i * durs[5] * 0.28, 0.3);
  const barsK = ramp(t, at(6, 0.05), 0.5);
  const beat6 = beat(t, at(6) + durs[6], pauseOf(6));

  // シーン3: 円はすき間ができる（7〜8）
  const s3 = sceneOpacity(t, at(7), at(9));
  const gapK = ramp(t, at(7, 0.5), 0.4);
  const hexK = ramp(t, at(8, 0.1), 0.4);
  const beat8 = beat(t, at(8) + durs[8], pauseOf(8));

  // シーン4: 定理名と締め（9〜）
  const s4 = sceneOpacity(t, at(9), end + 1);
  const beeX = lerp(120, 760, ramp(t, at(10, 0.05), durs[10] * 0.8));

  const PER = [4.56, 4.0, 3.72];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          {HG.map((p, i) => (
            <polygon key={i} points={poly(p.x, p.y, 68, 6, 30)} fill={WAX} fillOpacity={0.85 * cellK(i)} stroke="#fff3c4" strokeWidth={4} opacity={cellK(i)} />
          ))}
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          {/* しきつめの見本 */}
          <g opacity={tileK}>
            {[0, 1].map((r) =>
              [0, 1, 2, 3, 4].map((k) => {
                const sd = 64;
                const h = (sd * Math.sqrt(3)) / 2;
                const x = SX[0] + (k - 2) * (sd / 2);
                const y = 870 + r * h;
                const upward = (k + r) % 2 === 0;
                const pts = upward
                  ? `${x - sd / 2},${y + h / 2} ${x + sd / 2},${y + h / 2} ${x},${y - h / 2}`
                  : `${x - sd / 2},${y - h / 2} ${x + sd / 2},${y - h / 2} ${x},${y + h / 2}`;
                return <polygon key={`t${r}${k}`} points={pts} fill="none" stroke={C.b} strokeWidth={3} />;
              }),
            )}
            {[-1, 0, 1].map((k) =>
              [-1, 0, 1].map((r) => (
                <rect key={`s${k}${r}`} x={SX[1] - 30 + k * 60 - 30} y={930 + r * 60 - 30 - 30} width={60} height={60} fill="none" stroke={C.b} strokeWidth={3} />
              )),
            )}
            {hexGrid(SX[2], 930, 40, 3, 3).map((p, i) => (
              <polygon key={`h${i}`} points={poly(p.x, p.y, 40, 6, 30)} fill="none" stroke={C.b} strokeWidth={3} />
            ))}
          </g>
          {/* 面積1の形 */}
          <g opacity={oneK}>
            <polygon points={poly(SX[0], 900, R3, 3, -90)} fill={C.a} fillOpacity={0.85} stroke={C.b} strokeWidth={7} strokeOpacity={periK(0)} />
            <polygon points={poly(SX[1], 880, R4, 4, 45)} fill={C.a} fillOpacity={0.85} stroke={C.b} strokeWidth={7} strokeOpacity={periK(1)} />
            <polygon points={poly(SX[2], 880, R6, 6, 30)} fill={C.a} fillOpacity={0.85} stroke={C.b} strokeWidth={7} strokeOpacity={periK(2)} />
          </g>
          {/* まわりの長さの棒 */}
          <g opacity={barsK}>
            {PER.map((v, i) => (
              <rect key={i} x={SX[i] - 50} y={1240 - (v - 3) * 90 * barsK} width={100} height={(v - 3) * 90 * barsK} fill={C.b} rx={6} />
            ))}
          </g>
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {/* 円を並べるとすき間 */}
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((k) => (
              <circle key={`${r}${k}`} cx={160 + k * 120 + (r % 2 ? 60 : 0)} cy={780 + r * 104} r={60} fill={C.a} fillOpacity={0.85} stroke={C.b} strokeWidth={4} />
            )),
          )}
          {/* すき間の印 */}
          {[0, 1].map((r) =>
            [0, 1, 2].map((k) => (
              <circle key={`g${r}${k}`} cx={160 + k * 120 + (r % 2 ? 0 : 60)} cy={780 + r * 104 + 35} r={12} fill="#fff" opacity={gapK} />
            )),
          )}
          {/* 六角形はすき間なし */}
          <g opacity={hexK}>
            {hexGrid(800, 885, 62, 3, 3).map((p, i) => (
              <polygon key={i} points={poly(p.x, p.y, 62, 6, 30)} fill={C.a} fillOpacity={0.85} stroke={C.b} strokeWidth={4} />
            ))}
          </g>
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {hexGrid(540, 960, 64, 7, 5).map((p, i) => (
            <polygon key={i} points={poly(p.x, p.y, 62, 6, 30)} fill={WAX} fillOpacity={0.8} stroke="#fff3c4" strokeWidth={4} />
          ))}
          <g opacity={ramp(t, at(10), 0.3)}>
            <Bee x={beeX} y={700} s={50} />
          </g>
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={540} y={1260} text="一番少ないろうで、すき間なく" size={52} color={C.b} opacity={s1 * ramp(t, at(1, 0.1), 0.3)} scale={beat1} />

      {["三角形", "四角形", "六角形"].map((n, i) => (
        <React.Fragment key={n}>
          <Label x={SX[i]} y={700} text={n} size={52} opacity={s2} />
          <Label x={SX[i]} y={1060} text="広さ 1" size={48} color={C.a} opacity={s2 * oneK * (1 - barsK)} />
          <Label
            x={SX[i]}
            y={barsK > 0.1 ? 1240 - (PER[i] - 3) * 90 - 35 : 1150}
            text={`${PER[i] === 4 ? "4" : "約" + PER[i].toFixed(2)}`}
            size={56}
            color={C.b}
            opacity={s2 * periK(i)}
            scale={i === 2 ? beat6 : 1}
          />
        </React.Fragment>
      ))}

      <Label x={340} y={650} text="円 約3.54" size={52} color={C.b} opacity={s3} />
      <Label x={340} y={1150} text="すき間ができる" size={52} opacity={s3 * gapK} />
      <Label x={800} y={650} text="六角形 約3.72" size={52} color={C.b} opacity={s3 * hexK} />
      <Label x={800} y={1150} text="すき間なし" size={56} color={C.a} opacity={s3 * hexK} scale={beat8} />

      <Label x={540} y={1250} text="1999年に証明" size={52} opacity={s4 * (1 - ramp(t, at(10), 0.3))} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>ハチの巣は六角形</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>なぜ四角じゃない？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(4), at(7))}>すき間なく並ぶ形</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.a} life={L(at(4), at(5), at(7))}>広さは同じ 1</Line>
      <Line t={t} y={TOP[2]} size={72} color={C.b} life={L(at(5), undefined, at(7))}>まわりの長さは？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(9))}>円ではだめ？</Line>

      <Line t={t} y={200} size={86} life={L(at(9), at(10))}>ハニカム予想</Line>
      <Line t={t} y={360} size={72} life={L(at(10, 0.1))}>ハチは知っている</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.4), undefined, at(1))}>
        四角でも 三角でもなく
      </Line>
      <Line t={t} y={BOT[0]} size={64} color={C.b} life={L(at(1, 0.15), undefined, at(2))}>
        ろうが一番少ない
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(3, 0.2), undefined, at(4))}>
        3つとも すき間なく並ぶ
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(4, 0.2), undefined, at(7))}>
        広さ
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(4, 0.25), undefined, at(7))}>
        どれも 1
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(5, 0.1), undefined, at(7))}>
        まわり（ろう）
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(6, 0.1), undefined, at(7))}>
        ↓ 六角形 7%少ない
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(8, 0.2), undefined, at(9))}>
        すき間なく並ぶ形で 一番
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(10, 0.4))}>
        一番むだのない形
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
