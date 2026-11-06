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

// トランプの並べ方（階乗）
// 要素A（ゴールド）: 枚数・切った回数 … 1枚ずつ増える／28桁
// 要素B（シアン）  : 並べ方の数 … かけ算で一気に増える／68桁

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

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const red = (s: string) => s === "♥" || s === "♦";

// トランプ1枚（中心 x, y、幅 w、角度 rot）
const Card: React.FC<{ x: number; y: number; w: number; label: string; rot?: number; glow?: number; opacity?: number }> = ({
  x,
  y,
  w,
  label,
  rot = 0,
  glow = 0,
  opacity = 1,
}) => {
  const h = w * 1.45;
  const suit = label.slice(-1);
  return (
    <g transform={`rotate(${rot} ${x} ${y})`} opacity={opacity}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={w * 0.1} fill="#f6f6f6" stroke={glow > 0 ? C.a : "#888"} strokeWidth={glow > 0 ? 6 : 2} />
      <text x={x} y={y + w * 0.18} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={w * 0.42} fill={red(suit) ? "#c0392b" : "#111"}>
        {label}
      </text>
    </g>
  );
};

// 52! と 80億人×宇宙の年齢（秒）
const FACT52 = "80658175170943878571660636856403766975289505440883277824000000000000";
const SHUFFLES = "3484000000000000000000000000"; // 約3.484×10^27（28桁）

// 毎回同じ並びで混ぜる
const shuffled = (seed: number) => {
  const deck = SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}`));
  let x = seed;
  for (let i = deck.length - 1; i > 0; i--) {
    x = (x * 16807) % 2147483647;
    const j = x % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const CardShuffle: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 切って広げる（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  // 切るたびに並びが変わる（0.4秒ごと）
  const shuffleN = Math.min(8, Math.floor(Math.max(0, t - at(0, 0.1)) / 0.45));
  const deck1 = shuffled(7 + shuffleN * 101).slice(0, 11);
  const fan = ramp(t, at(0, 0.75), 0.4);
  const glow1 = ramp(t, at(1, 0.1), 0.3);
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));

  // シーン2: 3枚の並べ方（2〜3）
  const s2 = sceneOpacity(t, at(2), at(4));
  const PERMS = ["A♠ 2♥ 3♣", "A♠ 3♣ 2♥", "2♥ A♠ 3♣", "2♥ 3♣ A♠", "3♣ A♠ 2♥", "3♣ 2♥ A♠"];
  const permK = (i: number) => ramp(t, at(3, 0.05) + i * 0.4, 0.3);

  // シーン3: 枚数と並べ方（4〜5）
  const s3 = sceneOpacity(t, at(4), at(6));
  const rows = [
    { n: 3, v: "6" },
    { n: 5, v: "120" },
    { n: 10, v: "3,628,800" },
  ];
  const rowK = (i: number) => ramp(t, i === 0 ? at(4, 0.0) : at(4, 0.1 + i * 0.35), 0.3);
  const factRows = Array.from({ length: 10 }, (_, i) => i + 1);
  const growK = (i: number) => ramp(t, at(5, 0.05) + i * 0.3, 0.25);
  const fact = (n: number) => {
    let v = 1;
    for (let k = 2; k <= n; k++) v *= k;
    return v;
  };

  // シーン4: 68桁（6）
  const s4 = sceneOpacity(t, at(6), at(7));
  const digitsK = smooth((t - at(6, 0.1)) / (durs[6] * 0.5));
  const beat6 = beat(t, at(6) + durs[6], pauseOf(6));

  // シーン5: 切った回数 28桁（7〜8）
  const s5 = sceneOpacity(t, at(7), at(9));
  const barB = ramp(t, at(7, 0.1), 0.5);
  const barA = ramp(t, at(8, 0.05), 0.5);
  const beat8 = beat(t, at(8) + durs[8], pauseOf(8));

  // シーン6: 定理名（9）／ 締め（10〜）
  const s6 = sceneOpacity(t, at(9), at(10));
  const s7 = sceneOpacity(t, at(10), end + 1);
  const deck7 = shuffled(424242).slice(0, 11);

  const fanCards = (deck: string[], cx: number, cy: number, w: number, spread: number, glow: number) =>
    deck.map((c, i) => {
      const a = (i - (deck.length - 1) / 2) * 7 * spread;
      const rad = (a * Math.PI) / 180;
      return (
        <Card key={`${c}${i}`} x={cx + Math.sin(rad) * 420 * spread} y={cy + (1 - Math.cos(rad)) * 420 * spread} w={w} label={c} rot={a} glow={glow} />
      );
    });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>{fanCards(deck1, 540, 900, 150, fan, glow1)}</g>

        {/* シーン2 */}
        <g opacity={s2}>
          {["A♠", "2♥", "3♣"].map((c, i) => (
            <Card key={c} x={330 + i * 210} y={760} w={150} label={c} opacity={ramp(t, at(2, 0.2) + i * 0.2, 0.3) * (1 - ramp(t, at(3), 0.3))} />
          ))}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {factRows.map((n, i) => (
            <rect key={n} x={120} y={680 + i * 56} width={n * 22} height={36} fill={C.a} rx={4} opacity={growK(i)} />
          ))}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <rect x={120} y={760} width={840 * barB} height={110} fill={C.b} rx={10} />
          <rect x={120} y={1040} width={840 * (28 / 68) * barA} height={110} fill={C.a} rx={10} />
        </g>

        {/* シーン7 */}
        <g opacity={s7}>{fanCards(deck7, 540, 900, 150, 1, ramp(t, at(10, 0.4), 0.3))}</g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={540} y={1250} text="人類で初めての並び" size={60} color={C.a} opacity={s1 * glow1} scale={beat1} />

      <Label x={540} y={960} text="何通りの並べ方？" size={52} opacity={s2 * (1 - ramp(t, at(3), 0.3))} />
      {PERMS.map((p, i) => (
        <Label
          key={p}
          x={i < 3 ? 290 : 790}
          y={700 + (i % 3) * 120}
          text={p}
          size={56}
          opacity={s2 * permK(i)}
        />
      ))}
      <Label x={540} y={1130} text="3 × 2 × 1 ＝ 6通り" size={60} color={C.b} opacity={s2 * permK(5)} />

      {rows.map((r, i) => (
        <React.Fragment key={r.n}>
          <Label x={150} y={760 + i * 170} text={`${r.n}枚`} align="left" size={60} color={C.a} opacity={s3 * rowK(i) * (1 - ramp(t, at(5), 0.3))} />
          <Label x={950} y={760 + i * 170} text={`${r.v}通り`} align="right" size={64} color={C.b} opacity={s3 * rowK(i) * (1 - ramp(t, at(5), 0.3))} />
        </React.Fragment>
      ))}
      {factRows.map((n, i) => (
        <Label
          key={n}
          x={120 + n * 22 + 20}
          y={698 + i * 56}
          text={fact(n).toLocaleString("en-US")}
          align="left"
          size={48}
          color={C.b}
          opacity={s3 * growK(i)}
        />
      ))}

      {/* 68桁の数 */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 640,
          width: 900,
          fontFamily: serif,
          fontWeight: 700,
          fontSize: 66,
          lineHeight: 1.35,
          letterSpacing: "0.12em",
          color: C.b,
          wordBreak: "break-all",
          opacity: s4,
          textAlign: "center",
        }}
      >
        {FACT52.slice(0, Math.round(68 * digitsK))}
      </div>
      <Label x={540} y={1250} text="68桁" size={80} color={C.b} opacity={s4 * ramp(digitsK, 0.98, 0.02)} scale={beat6} />

      <Label x={120} y={720} text="トランプの並べ方 68桁" align="left" size={52} color={C.b} opacity={s5 * barB} />
      <Label x={120} y={1000} text="80億人 × 宇宙の年齢（秒）" align="left" size={50} color={C.a} opacity={s5 * barA} />
      <Label x={120 + 840 * (28 / 68) + 30} y={1095} text="28桁" align="left" size={72} color={C.a} opacity={s5 * barA} scale={beat8} />
      <Label x={540} y={1240} text={`${SHUFFLES.length}桁 ≪ ${FACT52.length}桁`} size={56} opacity={s5 * ramp(t, at(8, 0.5), 0.3)} />

      <Label x={540} y={900} text="52 × 51 × 50 × … × 1" size={72} color={C.b} opacity={s6} />

      <Label x={540} y={1250} text="世界で初めての並び" size={60} color={C.a} opacity={s7 * ramp(t, at(10, 0.4), 0.3)} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>よく切ったトランプ</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>この並びは初めて？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), undefined, at(4))}>3枚で数える</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(4), at(5), at(6))}>枚数を増やすと</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.b} life={L(at(5), undefined, at(6))}>かけ算で一気に</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(6), undefined, at(7))}>52枚の並べ方</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(9))}>みんなで切り続けても</Line>

      <Line t={t} y={200} size={86} life={L(at(9), undefined, at(10))}>階乗</Line>
      <Line t={t} y={360} size={60} life={L(at(9, 0.2), undefined, at(10))}>1から順にかけ算</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10))}>次に切ったら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.4), undefined, at(1))}>
        過去に同じ並びはあった？
      </Line>
      <Line t={t} y={BOT[0]} size={72} color={C.a} life={L(at(1, 0.15), undefined, at(2))}>
        ほぼ確実に 初めて
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(3, 0.1), undefined, at(4))}>
        3通り × 2通り × 1通り
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(5, 0.1), undefined, at(6))}>
        枚数
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(5, 0.15), undefined, at(6))}>
        1枚ずつ
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(5, 0.35), undefined, at(6))}>
        並べ方
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(5, 0.4), undefined, at(6))}>
        ↑ かけ算で
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(6, 0.3), undefined, at(7))}>
        8のあとに 67個の数字
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(7, 0.3), undefined, at(9))}>
        毎秒1回 × 80億人 × 138億年
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(9, 0.3), undefined, at(10))}>
        52枚 → 68桁
      </Line>

      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(10, 0.4))}>
        あなたが世界で初めて
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
