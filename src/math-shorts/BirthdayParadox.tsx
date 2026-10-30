import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  C,
  H,
  Line,
  Life,
  lerp,
  ramp,
  sceneOpacity,
  serif,
  smooth,
  Sphere,
  SphereDefs,
  Tex,
  W,
} from "./kit";
import { MathShortProps } from "./timeline";

// 誕生日のパラドックス
// 要素A（ゴールド）: 自分と比べる相手の数 ∝ n
// 要素B（シアン）  : 全体のペアの数 ∝ n²

const DAYS = 365;
const N = 23;
// 冒頭と最後に「同じ誕生日」として光らせる2人
const MATCH: [number, number] = [3, 15];

// n 人に同じ誕生日の組がいる確率（厳密値）
const pMatch = (n: number) => {
  let q = 1;
  for (let k = 0; k < n; k++) q *= (DAYS - k) / DAYS;
  return 1 - q;
};

type Pt = { x: number; y: number };
const ring = (n: number, cx: number, cy: number, r: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

const pairs = (n: number) => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
};

// 線を引く順番を毎回同じ並びで混ぜる（全体に散らばって増えていくように）
const shuffled = <T,>(arr: T[], seed: number) => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const PAIRS23 = shuffled(pairs(N), 7);

// 始点から終点へ伸びていく線
const Grow: React.FC<{
  a: Pt;
  b: Pt;
  k: number;
  color: string;
  width?: number;
  opacity?: number;
}> = ({ a, b, k, color, width = 2, opacity = 1 }) =>
  k <= 0 ? null : (
    <line
      x1={a.x}
      y1={a.y}
      x2={lerp(a.x, b.x, k)}
      y2={lerp(a.y, b.y, k)}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
    />
  );

// 直角に折れる引き出し線
const Leader: React.FC<{ pts: Pt[]; k: number; color?: string }> = ({ pts, k, color = C.white }) =>
  k <= 0 ? null : (
    <polyline
      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={2}
      opacity={k}
    />
  );

// SVG の上に置く日本語ラベル
const Label: React.FC<{
  x: number;
  y: number;
  text: React.ReactNode;
  color?: string;
  size?: number;
  opacity?: number;
  align?: "left" | "center" | "right";
}> = ({ x, y, text, color = C.white, size = 44, opacity = 1, align = "center" }) =>
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

const Card: React.FC<{ x: number; y: number; w: number; h: number; strong: number }> = ({
  x,
  y,
  w,
  h,
  strong,
}) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={16}
    fill="none"
    stroke="#fff"
    strokeWidth={1.5}
    opacity={lerp(0.45, 0.95, strong)}
  />
);

export const BirthdayParadox: React.FC<MathShortProps> = ({
  narration,
  starts,
  durs,
  voices,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  // フレーズ p の開始から f（0〜1）の位置の時刻
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  // 3ゾーンの行位置
  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];

  // ── 中央ゾーン ──────────────────────────────────────

  // シーン1: 23人の輪（0〜4）
  const s1 = sceneOpacity(t, at(0), at(4));
  const P1 = ring(N, 540, 930, 300);
  const appearSpan = [at(0, 0.12), at(1, 0.5)];
  const nodeAppear = (i: number) =>
    ramp(t, lerp(appearSpan[0], appearSpan[1], i / (N - 1)), 0.25);
  const nShown = P1.filter((_, i) => nodeAppear(i) > 0.5).length;
  const matchK = ramp(t, at(1, 0.55), 0.35) * (1 - ramp(t, at(2), 0.3));
  const selfK = ramp(t, at(2, 0.05), 0.3);
  const starDim = lerp(1, 0.45, ramp(t, at(3), 0.3));
  const allK = (idx: number) =>
    ramp(t, lerp(at(3, 0.2), at(3, 0.85), idx / PAIRS23.length), 0.2);

  // シーン2: 大きい場合／小さい場合の比較カード（4〜6）
  const s2 = sceneOpacity(t, at(4), at(6));
  const cards = [
    { n: 10, x: 50, cx: 285 },
    { n: 23, x: 560, cx: 795 },
  ];
  const cardStar = (j: number) => ramp(t, at(4, 0.1) + j * 0.08, 0.6);
  const focusRight = ramp(t, at(5), 0.3);

  // シーン3: 6人の例でペアを数える（6〜8）
  const s3 = sceneOpacity(t, at(6), at(8));
  const P6 = ring(6, 540, 900, 260);
  const oneK = (j: number) => ramp(t, at(6, 0.45) + j * 0.12, 0.3);
  // 各人から出る線（2回数えた状態）→ 1本にまとまる
  const ordered = (i: number) => ramp(t, at(7, 0.02) + i * 0.16, 0.3);
  const merge = ramp(t, at(7, 0.55), 0.6);

  // シーン4: 23人なら 253 組（8〜9）
  const s4 = sceneOpacity(t, at(8), at(9));
  const k23 = (idx: number) => ramp(t, lerp(at(8, 0), at(8, 0.6), idx / PAIRS23.length), 0.15);

  // シーン5: 人数を増やすと（9〜10）
  const s5 = sceneOpacity(t, at(9), at(10));
  const nBar = Math.round(lerp(2, 60, smooth((t - at(9, 0.08)) / (durs[9] * 0.85))));
  const qBar = 1 - pMatch(nBar);
  const pairBar = (nBar * (nBar - 1)) / 2;

  // シーン6: 全員外れる確率のグラフ（10〜12）
  const s6 = sceneOpacity(t, at(10), at(12));
  const gx = (n: number) => lerp(170, 970, n / 60);
  const gy = (q: number) => lerp(1200, 660, q);
  const curveK = smooth((t - at(10, 0.15)) / (durs[10] * 0.75));
  const curve = Array.from({ length: 61 }, (_, n) => ({ x: gx(n), y: gy(1 - pMatch(n)) })).filter(
    (_, n) => n <= curveK * 60,
  );
  const crossK = ramp(t, at(11, 0.1), 0.4);
  const n50 = Math.sqrt(2 * Math.log(2) * DAYS);

  // シーン7: 253回のくじ（12〜終わり）
  const s7 = sceneOpacity(t, at(12), end + 1);
  const sweep = (idx: number) => lerp(at(13, 0.05), at(13, 0.6), idx / PAIRS23.length);
  const winK = ramp(t, at(13, 0.62), 0.35);

  // ── 見出し・数式 ────────────────────────────────────
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <SphereDefs />

        {/* シーン1 */}
        <g opacity={s1}>
          {PAIRS23.map(([i, j], idx) => (
            <Grow key={idx} a={P1[i]} b={P1[j]} k={allK(idx)} color={C.b} width={1.6} opacity={0.42} />
          ))}
          {P1.slice(1).map((p, j) => (
            <Grow
              key={j}
              a={P1[0]}
              b={p}
              k={ramp(t, at(2, 0.3) + (j / 21) * durs[2] * 0.4, 0.25)}
              color={C.a}
              width={3}
              opacity={starDim}
            />
          ))}
          <Grow a={P1[MATCH[0]]} b={P1[MATCH[1]]} k={matchK} color={C.a} width={5} opacity={matchK} />
          {P1.map((p, i) => {
            const k = nodeAppear(i);
            const gold = i === 0 ? selfK : MATCH.includes(i) ? matchK : 0;
            return <Sphere key={i} x={p.x} y={p.y} r={17 * (0.6 + 0.4 * k)} gold={gold} opacity={k} />;
          })}
          <Leader
            pts={[
              { x: P1[MATCH[0]].x + 14, y: P1[MATCH[0]].y - 14 },
              { x: 800, y: 640 },
              { x: 850, y: 640 },
            ]}
            k={matchK}
          />
          <Leader pts={[{ x: 520, y: P1[0].y }, { x: 440, y: P1[0].y }]} k={selfK * (1 - ramp(t, at(4) - 0.35, 0.35))} color={C.a} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          {cards.map((c, ci) => {
            const pts = ring(c.n, c.cx, 930, 150);
            const strong = ci === 1 ? focusRight : 0;
            const fade = ci === 0 ? lerp(1, 0.4, focusRight) : 1;
            return (
              <g key={ci}>
                <Card x={c.x} y={640} w={470} h={560} strong={strong} />
                <g opacity={fade}>
                  {pts.slice(1).map((p, j) => (
                    <Grow key={j} a={pts[0]} b={p} k={cardStar(j)} color={C.a} width={2.5} />
                  ))}
                  {pts.map((p, i) => (
                    <Sphere key={i} x={p.x} y={p.y} r={11} gold={i === 0 ? 1 : 0} />
                  ))}
                </g>
              </g>
            );
          })}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {pairs(6).map(([i, j], idx) => {
            const a = P6[i];
            const b = P6[j];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const off = 6 * (1 - merge);
            const nx = (-(b.y - a.y) / len) * off;
            const ny = ((b.x - a.x) / len) * off;
            const first = i === 0 ? Math.max(oneK(j - 1), ordered(i)) : ordered(i);
            return (
              <g key={idx}>
                <Grow a={{ x: a.x + nx, y: a.y + ny }} b={{ x: b.x + nx, y: b.y + ny }} k={first} color={C.b} width={3} />
                <Grow a={{ x: b.x - nx, y: b.y - ny }} b={{ x: a.x - nx, y: a.y - ny }} k={ordered(j)} color={C.b} width={3} opacity={1 - merge} />
              </g>
            );
          })}
          {P6.map((p, i) => (
            <Sphere key={i} x={p.x} y={p.y} r={26} />
          ))}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {PAIRS23.map(([i, j], idx) => (
            <Grow key={idx} a={P1[i]} b={P1[j]} k={k23(idx)} color={C.b} width={1.6} opacity={0.5} />
          ))}
          {P1.map((p, i) => (
            <Sphere key={i} x={p.x} y={p.y} r={17} />
          ))}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <line x1={150} x2={930} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.45} strokeWidth={1.5} />
          <rect x={220} y={1200 - 440 * qBar} width={160} height={440 * qBar} fill={C.a} rx={6} />
          <rect x={700} y={1200 - 440 * (pairBar / 1770)} width={160} height={440 * (pairBar / 1770)} fill={C.b} rx={6} />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <line x1={gx(0)} x2={gx(60)} y1={gy(0)} y2={gy(0)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(0)} y1={gy(0)} y2={gy(1.05)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(60)} y1={gy(0.5)} y2={gy(0.5)} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="10 10" />
          <polyline
            points={curve.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={C.a}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <line x1={gx(n50)} x2={gx(n50)} y1={gy(0)} y2={gy(0.5)} stroke={C.a} strokeWidth={2} strokeDasharray="8 8" opacity={crossK} />
          <circle cx={gx(n50)} cy={gy(0.5)} r={12} fill={C.a} opacity={crossK} />
        </g>

        {/* シーン7 */}
        <g opacity={s7}>
          {PAIRS23.map(([i, j], idx) => {
            const dt = t - sweep(idx);
            const op = dt < 0 ? 0.12 : 0.22 + 0.78 * Math.exp(-dt * 5);
            return (
              <line key={idx} x1={P1[i].x} y1={P1[i].y} x2={P1[j].x} y2={P1[j].y} stroke={C.b} strokeWidth={1.6} opacity={op * ramp(t, at(12, 0.3), 0.6)} />
            );
          })}
          <Grow a={P1[MATCH[0]]} b={P1[MATCH[1]]} k={winK} color={C.a} width={6} />
          {P1.map((p, i) => (
            <Sphere key={i} x={p.x} y={p.y} r={17} gold={MATCH.includes(i) ? winK : 0} />
          ))}
          <Leader
            pts={[
              { x: P1[MATCH[0]].x + 14, y: P1[MATCH[0]].y - 14 },
              { x: 800, y: 640 },
              { x: 850, y: 640 },
            ]}
            k={winK}
            color={C.a}
          />
        </g>
      </svg>

      {/* 中央ゾーンのラベル */}
      <Label x={860} y={640} text="同じ誕生日" align="left" size={42} opacity={s1 * matchK} />
      <Label x={425} y={P1[0].y} text="自分" align="right" size={44} color={C.a} opacity={s1 * selfK * (1 - ramp(t, at(4) - 0.35, 0.35))} />
      {cards.map((c, ci) => (
        <React.Fragment key={ci}>
          <Label x={c.cx} y={705} text={`${c.n}人`} size={50} opacity={s2 * (ci === 0 ? lerp(1, 0.4, focusRight) : 1)} />
          <Label
            x={c.cx}
            y={1130}
            text={`相手 ${c.n - 1}人`}
            size={42}
            color={C.a}
            opacity={s2 * ramp(t, at(4, 0.35), 0.3) * (ci === 0 ? lerp(1, 0.4, focusRight) : 1)}
          />
        </React.Fragment>
      ))}
      <Label x={540} y={1230} text={<Tex src="6 \times 5 = 30" />} size={52} opacity={s3 * ramp(t, at(7, 0.1), 0.3) * (1 - ramp(t, at(7, 0.55), 0.3) * 0.62)} />
      <Label x={540} y={1300} text={<Tex src="30 \div 2 = 15" />} size={52} opacity={s3 * ramp(t, at(7, 0.6), 0.3)} />
      <Label x={540} y={1300} text={<>23人 → <Tex src="253" /> 組</>} size={54} color={C.b} opacity={s4 * ramp(t, at(8, 0.3), 0.3)} />
      {/* シーン5 のラベル */}
      <Label x={300} y={680} text="全員外れる確率" size={46} color={C.a} opacity={s5} />
      <Label x={780} y={680} text="ペアの数" size={46} color={C.b} opacity={s5} />
      <Label x={300} y={1200 - 440 * qBar - 40} text={<Tex src={`${(qBar * 100).toFixed(1)}\\%`} />} size={40} opacity={s5} />
      <Label x={780} y={1200 - 440 * (pairBar / 1770) - 40} text={<Tex src={`${pairBar}`} />} size={40} opacity={s5} />
      <Label x={540} y={1250} text={<Tex src={`n = ${nBar}`} />} size={52} opacity={s5} />
      {/* シーン6 のラベル */}
      <Label x={gx(0) - 10} y={gy(1.1)} text="全員外れる確率" align="left" size={42} opacity={s6} />
      <Label x={gx(0) - 20} y={gy(0.5)} text={<Tex src="\tfrac12" />} align="right" size={44} opacity={s6} />
      <Label x={gx(60)} y={gy(0) + 50} text={<>人数 <Tex src="n" /></>} align="right" size={36} opacity={s6} />
      <Label x={gx(n50)} y={gy(0) + 50} text="23人" size={40} color={C.a} opacity={s6 * crossK} />
      {/* シーン7 のラベル */}
      <Label x={860} y={640} text="当たり" align="left" size={46} color={C.a} opacity={s7 * winK} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>同じ誕生日の二人</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.5), at(1), at(2))}>何人で半分を超える？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(4))}>自分と同じ誕生日</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), undefined, at(4))}>誰と誰でもよい</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(4), at(5), at(6))}>自分目線の相手</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(5), undefined, at(6))}>23人でも</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(6), at(7), at(9))}>全体のペアを数える</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(7), at(7, 0.5), at(9))}>人数分かけて</Line>
      <Line t={t} y={TOP[2]} size={72} life={L(at(7, 0.5), at(8), at(9))}>重複を2で割る</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(10))}>人数が増えると</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10), at(10, 0.5), at(12))}>1組が外れる確率</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(10, 0.5), at(11), at(12))}>半分になる条件</Line>

      <Line t={t} y={200} size={86} life={L(at(12), at(13))}>誕生日のパラドックス</Line>
      <Line t={t} y={360} size={72} life={L(at(13))}>253回のくじ</Line>

      {/* ── 下部ゾーン（数式・結論） ── */}
      <Line t={t} y={BOT[1]} size={60} life={L(at(0, 0.12), undefined, at(2))}>
        <Tex src={`n = ${nShown}`} />
        <span style={{ width: 40 }} />
        <Tex src={`P = ${(pMatch(nShown) * 100).toFixed(1)}\\%`} />
      </Line>
      <Line t={t} y={BOT[0]} size={72} life={L(at(1), undefined, at(2))}>たった23人</Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.5), at(3), at(4))}>
        比べる相手 <Tex src="n-1" />
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(3, 0.4), undefined, at(4))}>
        組み合わせが急増
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(4, 0.4), at(5), at(6))}>
        相手の数 <Tex src="\propto n" />
      </Line>
      <Line t={t} y={BOT[1] + 20} size={56} life={L(at(5, 0.35), undefined, at(6))}>
        自分と一致 <Tex src="\dfrac{22}{365} \approx 6\%" />
      </Line>

      <Line t={t} y={BOT[0]} size={56} life={L(at(6, 0.4), at(7), at(8))}>
        一人の相手 <Tex src="n-1" />
      </Line>
      <Line t={t} y={BOT[1]} size={56} life={L(at(7, 0.05), at(7, 0.55), at(8))}>
        人数分 <Tex src="n(n-1)" />
      </Line>
      <Line t={t} y={BOT[2]} size={56} life={L(at(7, 0.55), at(8), at(9))}>
        <Tex src="\dfrac{n(n-1)}{2}" />
      </Line>
      <Line t={t} y={BOT[0] + 20} size={72} color={C.b} life={L(at(8, 0.15), undefined, at(9))}>
        ペアの数 <Tex src="\propto n^2" />
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(9, 0.55), undefined, at(10))}>
        全員外れる確率
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={64} color={C.a} life={L(at(9, 0.6), undefined, at(10))}>
        ↓ 減る
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(9, 0.25), undefined, at(10))}>
        ペア数 <Tex src="\propto n^2" />
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={64} color={C.b} life={L(at(9, 0.3), undefined, at(10))}>
        ↑ 増える
      </Line>

      <Line t={t} y={BOT[0] - 20} size={52} life={L(at(10, 0.05), at(10, 0.5), at(12))}>
        1組が外れる <Tex src="\dfrac{364}{365}" />
      </Line>
      <Line t={t} y={BOT[1] + 40} size={52} life={L(at(10, 0.5), at(11), at(12))}>
        <Tex src="\left(\dfrac{364}{365}\right)^{n^2/2} = \dfrac{1}{2}" />
      </Line>
      <Line t={t} y={BOT[2] + 90} size={52} life={L(at(11, 0.1), at(12), at(13))}>
        <Tex src="n \approx 1.18\sqrt{365} \approx 22.5" />
      </Line>

      <Line t={t} y={BOT[0]} size={56} life={L(at(13, 0.05), at(13, 0.6))}>
        <Tex src="\dfrac{23 \times 22}{2} = 253" /> 組
      </Line>
      <Line t={t} y={BOT[1] + 20} size={64} life={L(at(13, 0.62))}>
        当たる確率 <Tex src="\approx 50.7\%" />
      </Line>

      {/* ナレーション */}
      {voices.map((v, i) =>
        v ? (
          <Sequence key={i} from={Math.round(starts[i] * fps)}>
            <Audio src={staticFile(v)} />
          </Sequence>
        ) : null,
      )}

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
