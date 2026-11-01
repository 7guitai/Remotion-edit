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

// 本の積み上げ問題
// 要素A（ゴールド）: 1冊ごとのずらし幅 … 10cm, 5cm, 3.3cm, 2.5cm… と小さくなる
// 要素B（シアン）  : 合計のはみ出し … 足し続けるといくらでも大きくなる

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

// 横の寸法線
const DimH: React.FC<{ x1: number; x2: number; y: number; color?: string; opacity?: number }> = ({
  x1,
  x2,
  y,
  color = C.white,
  opacity = 1,
}) => {
  if (opacity <= 0 || Math.abs(x2 - x1) < 4) return null;
  const hd = Math.min(12, Math.abs(x2 - x1) / 3);
  return (
    <g opacity={opacity} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <polyline points={`${x1 + hd},${y - hd * 0.7} ${x1},${y} ${x1 + hd},${y + hd * 0.7}`} />
      <polyline points={`${x2 - hd},${y - hd * 0.7} ${x2},${y} ${x2 - hd},${y + hd * 0.7}`} />
    </g>
  );
};

// 1冊の本（横から見た図）
const Book: React.FC<{ x: number; y: number; w: number; h: number; glow?: number; opacity?: number }> = ({
  x,
  y,
  w,
  h,
  glow = 0,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={Math.min(6, h * 0.15)} fill="#1F5A8A" />
    <rect x={x + w * 0.04} y={y + h * 0.22} width={w * 0.92} height={h * 0.56} fill="#EDEDED" opacity={0.85} />
    <rect x={x} y={y} width={w} height={h} rx={Math.min(6, h * 0.15)} fill="none" stroke={C.a} strokeWidth={4} opacity={glow} />
  </g>
);

// 机
const TABLE_EDGE = 330;
const TABLE_Y = 1180;
const Table: React.FC = () => (
  <g>
    <rect x={-20} y={TABLE_Y} width={TABLE_EDGE + 20} height={34} fill="#6b5640" />
    <rect x={TABLE_EDGE - 70} y={TABLE_Y + 34} width={34} height={100} fill="#4f3f2f" />
  </g>
);

// 長さ20cmの本。上から k 冊目のずらし幅は 20/(2k) cm
const S = 20; // 1cm あたりの px
const BOOK_CM = 20;
const BW = BOOK_CM * S;
const BH = 80;
// 下から b 冊目（0〜3）の右端の、机の端からのはみ出し（cm）
const RIGHT = [2.5, 2.5 + 10 / 3, 2.5 + 10 / 3 + 5, 2.5 + 10 / 3 + 5 + 10];

const H31 = (() => {
  // 31冊の積み上げ（上から k 冊目のずらし幅 = 1/(2k) 冊分）
  const n = 31;
  const shifts = Array.from({ length: n }, (_, i) => 1 / (2 * (i + 1)));
  const right: number[] = [];
  let acc = 0;
  for (let b = 0; b < n; b++) {
    acc += shifts[n - 1 - b];
    right.push(acc);
  }
  return right; // 下から b 冊目の右端のはみ出し（冊分）
})();

export const BookStack: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 4冊の塔（0〜1）。冒頭から積んで、答えを先に見せる
  const s1 = sceneOpacity(t, at(0), at(2));
  const drop = (b: number) => ramp(t, at(0, 0.15) + b * 0.45, 0.35);
  const outK = ramp(t, at(1, 0.4), 0.4);

  // シーン2: ずらし幅を1冊ずつ（2〜6）
  const s2 = sceneOpacity(t, at(2), at(7));
  // 上から順に光らせる（上から k 冊目＝下から 3-k+1）
  const hl = (k: number) => {
    const on = [at(3), at(5), at(6), at(6, 0.5)][k];
    const off = [at(5), at(6), at(6, 0.5), at(7)][k];
    return ramp(t, on, 0.3) * (1 - ramp(t, off, 0.3));
  };
  const dimShown = (k: number) => ramp(t, [at(3, 0.3), at(5, 0.4), at(6, 0.1), at(6, 0.6)][k], 0.3);
  const comK = ramp(t, at(4, 0.2), 0.3) * (1 - ramp(t, at(5), 0.3));

  // シーン3: ずらし幅の棒（7）と合計（8）
  const s3 = sceneOpacity(t, at(7), at(9));
  const nBar = 8;
  const barK = (i: number) => ramp(t, at(7, 0.05) + i * 0.25, 0.25);
  const sumK = (i: number) => ramp(t, at(8, 0.05) + i * 0.6, 0.35);
  const shiftsAll = Array.from({ length: nBar }, (_, i) => BOOK_CM / (2 * (i + 1)));
  const sums = shiftsAll.map((_, i) => shiftsAll.slice(0, i + 1).reduce((a, b) => a + b, 0));

  // シーン4: 足し続けると（9）
  const s4 = sceneOpacity(t, at(9), at(10));
  const curveK = smooth((t - at(9, 0.05)) / (durs[9] * 0.8));
  const NMAX = 250;
  const gx = (n: number) => lerp(160, 940, n / NMAX);
  const gy = (books: number) => lerp(1220, 680, books / 3.2);
  let hs = 0;
  const curve: string[] = [];
  for (let n = 1; n <= NMAX * curveK; n++) {
    hs += 1 / (2 * n);
    curve.push(`${gx(n)},${gy(hs)}`);
  }

  // シーン5: 31冊（10）
  const s5 = sceneOpacity(t, at(10), at(11));
  const n31 = Math.round(lerp(1, 31, smooth((t - at(10, 0.05)) / (durs[10] * 0.5))));

  // シーン6: 定理名（11）／ シーン7: 回収（12〜）
  const s6 = sceneOpacity(t, at(11), end + 1);

  // 4冊の塔
  const stack = (glow: (k: number) => number, opacity: (b: number) => number = () => 1) =>
    [0, 1, 2, 3].map((b) => {
      const right = TABLE_EDGE + RIGHT[b] * S;
      return <Book key={b} x={right - BW} y={TABLE_Y - (b + 1) * BH} w={BW} h={BH} glow={glow(3 - b)} opacity={opacity(b)} />;
    });

  const SB = 8; // 31冊の図の 1cm あたり px
  const B31W = BOOK_CM * SB;
  const B31H = 14;
  const EDGE31 = 330;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          <Table />
          {[0, 1, 2, 3].map((b) => {
            const right = TABLE_EDGE + RIGHT[b] * S;
            const k = drop(b);
            return <Book key={b} x={right - BW} y={TABLE_Y - (b + 1) * BH - (1 - k) * 60} w={BW} h={BH} opacity={k} glow={b === 3 ? outK : 0} />;
          })}
          <line x1={TABLE_EDGE} x2={TABLE_EDGE} y1={TABLE_Y} y2={620} stroke="#fff" strokeWidth={2} strokeDasharray="10 10" opacity={outK} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <Table />
          <line x1={TABLE_EDGE} x2={TABLE_EDGE} y1={TABLE_Y} y2={640} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          {stack(hl)}
          <DimH x1={TABLE_EDGE + RIGHT[3] * S - BW} x2={TABLE_EDGE + RIGHT[3] * S} y={TABLE_Y - 4 * BH - 30} opacity={ramp(t, at(2, 0.2), 0.3) * (1 - ramp(t, at(3), 0.3))} />
          {[0, 1, 2, 3].map((k) => {
            const b = 3 - k;
            const right = TABLE_EDGE + RIGHT[b] * S;
            const below = b === 0 ? TABLE_EDGE : TABLE_EDGE + RIGHT[b - 1] * S;
            return <DimH key={k} x1={below} x2={right} y={TABLE_Y - (b + 1) * BH + BH / 2} color={C.a} opacity={dimShown(k)} />;
          })}
          {/* 重心（一番上の本の真ん中が、下の本の右端の真上） */}
          <g opacity={comK}>
            <circle cx={TABLE_EDGE + RIGHT[3] * S - BW / 2} cy={TABLE_Y - 3.5 * BH} r={12} fill="#fff" />
            <line
              x1={TABLE_EDGE + RIGHT[2] * S}
              x2={TABLE_EDGE + RIGHT[2] * S}
              y1={TABLE_Y - 3.5 * BH}
              y2={TABLE_Y - 3 * BH + 30}
              stroke="#fff"
              strokeWidth={3}
            />
          </g>
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <line x1={120} x2={960} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={120} x2={960} y1={1200 - 20 * 22} y2={1200 - 20 * 22} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          {shiftsAll.map((v, i) => {
            const x = 150 + i * 100;
            const hb = v * 22 * barK(i);
            const hsum = i < 4 ? sums[i] * 22 * sumK(i) : 0;
            return (
              <g key={i}>
                <rect x={x} y={1200 - hsum} width={70} height={hsum} fill={C.b} opacity={0.85} rx={4} />
                <rect x={x + 18} y={1200 - hb} width={34} height={hb} fill={C.a} rx={4} />
              </g>
            );
          })}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <line x1={gx(0)} x2={gx(NMAX)} y1={gy(0)} y2={gy(0)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(0)} y1={gy(0)} y2={gy(3.3)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {[1, 2, 3].map((k) => (
            <line key={k} x1={gx(0)} x2={gx(NMAX)} y1={gy(k)} y2={gy(k)} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="8 8" />
          ))}
          <polyline points={curve.join(" ")} fill="none" stroke={C.b} strokeWidth={6} strokeLinejoin="round" />
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <rect x={-20} y={1200} width={EDGE31 + 20} height={26} fill="#6b5640" />
          <line x1={EDGE31} x2={EDGE31} y1={1200} y2={700} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          {H31.slice(0, n31).map((r, b) => (
            <rect
              key={b}
              x={EDGE31 + r * B31W - B31W}
              y={1200 - (b + 1) * B31H}
              width={B31W}
              height={B31H - 2}
              fill={b === 30 ? C.a : "#1F5A8A"}
              rx={2}
            />
          ))}
          <DimH x1={EDGE31} x2={EDGE31 + H31[30] * B31W} y={1200 - 31 * B31H - 40} color={C.b} opacity={n31 >= 31 ? 1 : 0} />
        </g>

        {/* シーン6・7 */}
        <g opacity={s6}>
          <Table />
          <line x1={TABLE_EDGE} x2={TABLE_EDGE} y1={TABLE_Y} y2={640} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          {stack((k) => (k === 0 ? ramp(t, at(12, 0.3), 0.3) : 0))}
          <DimH x1={TABLE_EDGE} x2={TABLE_EDGE + RIGHT[3] * S} y={TABLE_Y - 4 * BH - 40} color={C.b} opacity={ramp(t, at(12, 0.4), 0.3)} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300、数字を添える） ── */}
      <Label x={TABLE_EDGE - 20} y={TABLE_Y + 70} text="机の端" align="right" size={48} opacity={s1 * outK} />
      <Label x={TABLE_EDGE + RIGHT[3] * S - BW / 2} y={TABLE_Y - 4 * BH - 60} text="机の外" size={54} color={C.a} opacity={s1 * outK} />

      <Label x={TABLE_EDGE + RIGHT[3] * S - BW / 2} y={TABLE_Y - 4 * BH - 80} text="20cm" size={52} opacity={s2 * ramp(t, at(2, 0.2), 0.3) * (1 - ramp(t, at(3), 0.3))} />
      {[0, 1, 2, 3].map((k) => {
        const b = 3 - k;
        const right = TABLE_EDGE + RIGHT[b] * S;
        const txt = ["10cm", "5cm", "3.3cm", "2.5cm"][k];
        return (
          <Label key={k} x={right + 20} y={TABLE_Y - (b + 1) * BH + BH / 2} text={txt} align="left" size={48} color={C.a} opacity={s2 * dimShown(k)} />
        );
      })}
      <Label x={TABLE_EDGE + RIGHT[3] * S - BW / 2} y={TABLE_Y - 4 * BH - 70} text="重心" size={54} opacity={s2 * comK} />

      <Label x={150} y={650} text="1冊ごとのずらし幅" align="left" size={50} color={C.a} opacity={s3 * (1 - ramp(t, at(8), 0.3))} />
      <Label x={150} y={650} text="合計のはみ出し" align="left" size={50} color={C.b} opacity={s3 * ramp(t, at(8), 0.3)} />
      <Label x={950} y={1200 - 20 * 22 - 35} text="本1冊 20cm" align="right" size={48} opacity={s3 * ramp(t, at(8), 0.3)} />
      {shiftsAll.slice(0, 4).map((v, i) => (
        <Label key={i} x={185 + i * 100} y={1240} text={`${i + 1}冊`} size={48} opacity={s3} />
      ))}
      {sums.slice(0, 4).map((v, i) => (
        <Label
          key={i}
          x={185 + i * 100}
          y={1200 - v * 22 - 35}
          text={v.toFixed(1).replace(".0", "")}
          size={44}
          color={C.b}
          opacity={s3 * sumK(i)}
        />
      ))}

      <Label x={gx(NMAX)} y={gy(0) + 45} text="冊数" align="right" size={48} opacity={s4} />
      {[1, 2, 3].map((k) => (
        <Label key={k} x={gx(0) - 15} y={gy(k)} text={`${k}冊分`} align="right" size={44} opacity={s4} />
      ))}
      <Label x={gx(31)} y={gy(2) - 45} text="31冊" size={48} color={C.b} opacity={s4 * ramp(curveK, 0.2, 0.1)} />
      <Label x={gx(227)} y={gy(3) - 45} text="227冊" size={48} color={C.b} opacity={s4 * ramp(curveK, 0.95, 0.05)} />

      <Label x={780} y={760} text={`${n31}冊`} size={60} opacity={s5} />
      <Label x={EDGE31 + H31[30] * B31W / 2} y={1200 - 31 * B31H - 85} text="2冊分" size={52} color={C.b} opacity={s5 * (n31 >= 31 ? 1 : 0)} />

      <Label x={TABLE_EDGE + (RIGHT[3] * S) / 2} y={TABLE_Y - 4 * BH - 90} text="約20.8cm" size={52} color={C.b} opacity={s6 * ramp(t, at(12, 0.4), 0.3)} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>本をずらして積むと</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.35), at(1), at(2))}>どこまで出せる？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(7))}>長さ20cmの本</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), at(4), at(7))}>上から順にずらす</Line>
      <Line t={t} y={TOP[2]} size={64} life={L(at(4), undefined, at(5))}>重心が支えの上なら</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), at(8), at(9))}>ずらし幅は小さく</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.b} life={L(at(8), undefined, at(9))}>でも合計は？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(10))}>足し続けると</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10), undefined, at(11))}>2冊分なら31冊</Line>

      <Line t={t} y={200} size={86} life={L(at(11), at(12))}>本の積み上げ問題</Line>
      <Line t={t} y={360} size={64} life={L(at(12, 0.1))}>教科書4冊で机の外へ</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.3), undefined, at(1))}>
        どこまで はみ出せる？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.b} life={L(at(1, 0.05), undefined, at(2))}>
        いくらでも
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(1, 0.4), undefined, at(2))}>
        4冊で 一番上が机の外
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(3, 0.3), at(5), at(7))}>
        1冊目 10cm
      </Line>
      <Line t={t} y={BOT[1]} size={56} life={L(at(4, 0.2), undefined, at(5))}>
        重心＝つり合いの点
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(5, 0.4), at(6), at(7))}>
        2冊目 5cm
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.a} life={L(at(6, 0.1), undefined, at(7))}>
        3冊目 3.3cm、4冊目 2.5cm
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(7, 0.3), at(8), at(9))}>
        10 → 5 → 3.3 → 2.5 → …
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(8, 0.4), undefined, at(9))}>
        10+5+3.3+2.5 ≒ 20.8cm
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(9, 0.1), undefined, at(10))}>
        1冊ごと
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(9, 0.15), undefined, at(10))}>
        ↓ 小さくなる
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(9, 0.4), undefined, at(10))}>
        合計
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(9, 0.45), undefined, at(10))}>
        ↑ いくらでも
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(10, 0.1), at(10, 0.6), at(11))}>
        2冊分 → 31冊
      </Line>
      <Line t={t} y={BOT[1]} size={60} life={L(at(10, 0.6), undefined, at(11))}>
        3冊分 → 227冊
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(12, 0.5))}>
        はみ出し 約20.8cm
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
