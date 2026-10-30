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
// 式を使わず「握手の回数」と「当たりくじ」で説明する
// 要素A（ゴールド）: 自分と比べる相手の数（22人）
// 要素B（シアン）  : 全員の握手の回数（253回。人数2倍で約4倍）

// BGM の音量（ナレーションは 1.0）。Mineral は声より約12dB大きく作られているので小さめ
const BGM_VOLUME = 0.06;

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

// 握手の順番（1人目の22本 → 2人目の21本 → …）
const HANDSHAKES = pairs(N);
const N40 = 40;
const PAIRS40 = pairs(N40);
const MATCH40: [number, number] = [6, 27];
const PAIRS46 = pairs(46);
// くじを引く順番（握手の線ごとに、何番目に引かれるか）
const DRAW_INDEX = new Map(PAIRS23.map(([a, b], k) => [`${a}-${b}`, k]));

export const BirthdayParadox: React.FC<MathShortProps> = ({
  narration,
  starts,
  durs,
  voices,
  subtitles,
  bgm,
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

  // シーン1: 23人の輪（0〜10）。冒頭 → 自分目線 → 握手 → くじ
  const s1 = sceneOpacity(t, at(0), at(10));
  const P1 = ring(N, 540, 930, 300);
  const appearSpan = [at(0, 0.12), at(1, 0.5)];
  const nodeAppear = (i: number) =>
    ramp(t, lerp(appearSpan[0], appearSpan[1], i / (N - 1)), 0.25);
  const nShown = P1.filter((_, i) => nodeAppear(i) > 0.5).length;
  const matchK = ramp(t, at(1, 0.55), 0.35) * (1 - ramp(t, at(2), 0.3));
  const selfK = ramp(t, at(2, 0.05), 0.3) * (1 - ramp(t, at(5), 0.4));
  const starK = (j: number) => ramp(t, at(2, 0.3) + (j / 21) * durs[2] * 0.5, 0.25);
  const starOpacity = lerp(1, 0.4, ramp(t, at(4), 0.3)) * (1 - ramp(t, at(5), 0.4));

  // 握手：1人目の22本、2人目の21本をゆっくり、残りは一気に
  const handTime = (idx: number) => {
    if (idx < 22) return lerp(at(6, 0.05), at(6, 0.4), idx / 22);
    if (idx < 43) return lerp(at(6, 0.45), at(6, 0.8), (idx - 22) / 21);
    return lerp(at(6, 0.85), at(7, 0.3), (idx - 43) / (HANDSHAKES.length - 43));
  };
  const handK = (idx: number) => ramp(t, handTime(idx), 0.2);
  const handCount = HANDSHAKES.filter((_, idx) => t >= handTime(idx)).length;
  // いま握手している人（1人目・2人目を光らせる）
  const shaker = t < at(6, 0.43) ? 0 : t < at(6, 0.83) ? 1 : -1;
  const shakerK = ramp(t, at(6), 0.3) * (1 - ramp(t, at(6, 0.85), 0.3));

  // くじ：1組だけ光らせる → 253組を順に引いていく
  const LOT: [number, number] = [8, 19];
  const lotK = ramp(t, at(8, 0.15), 0.35) * (1 - ramp(t, at(9), 0.3));
  const drawStart = at(9, 0.05);
  const drawEnd = at(9, 0.8);
  const drawTime = (idx: number) => lerp(drawStart, drawEnd, idx / PAIRS23.length);
  const drawn = Math.max(0, Math.min(253, Math.floor((253 * (t - drawStart)) / (drawEnd - drawStart))));
  const missPct = Math.pow(364 / 365, drawn) * 100;
  const lineBase = lerp(0.5, 0.18, ramp(t, at(8), 0.4));

  // シーン2: 人数が2倍なら組は約4倍（10〜11）
  const s2 = sceneOpacity(t, at(10), at(11));
  const cards = [
    { n: 23, x: 50, cx: 285, pairs: HANDSHAKES, label: "253組", color: C.a },
    { n: 46, x: 560, cx: 795, pairs: PAIRS46, label: "1035組", color: C.b },
  ];
  const cardK = (ci: number) => ramp(t, at(10, 0.05 + ci * 0.3), 0.5);

  // シーン3: 人数ごとの確率の棒グラフ（11〜12）
  const s3 = sceneOpacity(t, at(11), at(12));
  const bars = [10, 23, 40, 70].map((n, i) => ({ n, x: 240 + i * 200, p: pMatch(n) }));
  const barK = (i: number) => ramp(t, at(11, 0.05 + i * 0.15), 0.5);
  const by = (p: number) => 1200 - 480 * p;

  // シーン4: 40人のクラス（12〜終わり）
  const s4 = sceneOpacity(t, at(12), end + 1);
  const P40 = ring(N40, 540, 930, 300);
  const lines40 = ramp(t, at(13, 0.05), 0.8);
  const win40 = ramp(t, at(13, 0.45), 0.35);

  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <SphereDefs />

        {/* シーン1 */}
        <g opacity={s1}>
          {/* 握手の線（くじの場面では順に光る） */}
          {HANDSHAKES.map(([i, j], idx) => {
            const k = handK(idx);
            if (k <= 0) return null;
            const dt = t - drawTime(DRAW_INDEX.get(`${i}-${j}`) ?? 0);
            const flash = t < drawStart || dt < 0 ? 0 : Math.exp(-dt * 5);
            return (
              <Grow key={idx} a={P1[i]} b={P1[j]} k={k} color={C.b} width={1.7} opacity={Math.min(1, lineBase + 0.8 * flash)} />
            );
          })}
          {/* 自分から22人への線 */}
          {P1.slice(1).map((p, j) => (
            <Grow key={j} a={P1[0]} b={p} k={starK(j)} color={C.a} width={3} opacity={starOpacity} />
          ))}
          <Grow a={P1[MATCH[0]]} b={P1[MATCH[1]]} k={matchK} color={C.a} width={5} opacity={matchK} />
          <Grow a={P1[LOT[0]]} b={P1[LOT[1]]} k={lotK} color={C.a} width={6} opacity={lotK} />
          {P1.map((p, i) => {
            const k = nodeAppear(i);
            const gold = i === 0 ? selfK : MATCH.includes(i) ? matchK : LOT.includes(i) ? lotK : 0;
            return <Sphere key={i} x={p.x} y={p.y} r={17 * (0.6 + 0.4 * k)} gold={gold} opacity={k} />;
          })}
          {shaker >= 0 ? (
            <circle cx={P1[shaker].x} cy={P1[shaker].y} r={30} fill="none" stroke={C.b} strokeWidth={4} opacity={shakerK} />
          ) : null}
          <Leader
            pts={[
              { x: P1[MATCH[0]].x + 14, y: P1[MATCH[0]].y - 14 },
              { x: 800, y: 640 },
              { x: 850, y: 640 },
            ]}
            k={matchK}
          />
          <Leader pts={[{ x: 520, y: P1[0].y }, { x: 440, y: P1[0].y }]} k={selfK} color={C.a} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          {cards.map((c, ci) => {
            const pts = ring(c.n, c.cx, 930, 160);
            return (
              <g key={ci}>
                <Card x={c.x} y={640} w={470} h={580} strong={ci === 1 ? ramp(t, at(10, 0.4), 0.3) : 0} />
                {c.pairs.map(([i, j], idx) => (
                  <Grow
                    key={idx}
                    a={pts[i]}
                    b={pts[j]}
                    k={ramp(t, at(10, 0.05 + ci * 0.3) + (idx / c.pairs.length) * 0.8, 0.2)}
                    color={C.b}
                    width={1}
                    opacity={0.35}
                  />
                ))}
                {pts.map((p, i) => (
                  <Sphere key={i} x={p.x} y={p.y} r={ci === 0 ? 10 : 7} opacity={cardK(ci)} />
                ))}
              </g>
            );
          })}
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <line x1={150} x2={930} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} />
          <line x1={150} x2={930} y1={by(0.5)} y2={by(0.5)} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="10 10" />
          {bars.map((b, i) => {
            const h = 480 * b.p * smooth(barK(i));
            return <rect key={i} x={b.x - 60} y={1200 - h} width={120} height={h} rx={6} fill={b.n === 23 ? C.a : C.b} />;
          })}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {PAIRS40.map(([i, j], idx) => (
            <line key={idx} x1={P40[i].x} y1={P40[i].y} x2={P40[j].x} y2={P40[j].y} stroke={C.b} strokeWidth={1} opacity={0.22 * lines40} />
          ))}
          <Grow a={P40[MATCH40[0]]} b={P40[MATCH40[1]]} k={win40} color={C.a} width={6} />
          {P40.map((p, i) => (
            <Sphere key={i} x={p.x} y={p.y} r={14} gold={MATCH40.includes(i) ? win40 : 0} />
          ))}
        </g>
      </svg>

      {/* 中央ゾーンのラベル */}
      <Label x={860} y={640} text="同じ誕生日" align="left" size={42} opacity={s1 * matchK} />
      <Label x={425} y={P1[0].y} text="自分" align="right" size={44} color={C.a} opacity={s1 * selfK} />
      <Label
        x={540}
        y={1285}
        text={<>握手 <Tex src={`${handCount}`} /> 回</>}
        size={46}
        color={C.b}
        opacity={s1 * ramp(t, at(6, 0.05), 0.3) * (1 - ramp(t, at(8), 0.3))}
      />
      <Label
        x={540}
        y={1285}
        text={<>くじ <Tex src={`${drawn}`} /> 回目</>}
        size={46}
        color={C.b}
        opacity={s1 * ramp(t, at(9, 0.02), 0.3)}
      />
      <Label x={P1[LOT[1]].x - 30} y={P1[LOT[1]].y + 10} text="1組" align="right" size={44} color={C.a} opacity={s1 * lotK} />
      {cards.map((c, ci) => (
        <React.Fragment key={ci}>
          <Label x={c.cx} y={705} text={`${c.n}人`} size={52} opacity={s2 * cardK(ci)} />
          <Label x={c.cx} y={1150} text={c.label} size={50} color={c.color} opacity={s2 * ramp(t, at(10, 0.3 + ci * 0.3), 0.3)} />
        </React.Fragment>
      ))}
      {bars.map((b, i) => (
        <React.Fragment key={i}>
          <Label x={b.x} y={1245} text={`${b.n}人`} size={42} opacity={s3 * barK(i)} />
          <Label
            x={b.x}
            y={1200 - 480 * b.p * smooth(barK(i)) - 40}
            text={<Tex src={`${b.p >= 0.995 ? "99.9" : Math.round(b.p * 100)}\\%`} />}
            size={42}
            color={b.n === 23 ? C.a : C.white}
            opacity={s3 * barK(i)}
          />
        </React.Fragment>
      ))}
      <Label x={140} y={by(0.5)} text={<Tex src="50\%" />} align="right" size={34} opacity={s3 * 0.8} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>同じ誕生日の二人</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.5), at(1), at(2))}>何人で半分を超える？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(4))}>自分と同じ誕生日</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), undefined, at(4))}>23人なら</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(4), at(5), at(7))}>誰と誰でもよい</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(5), undefined, at(7))}>全員で握手すると</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(8))}>握手は253回</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), at(9), at(10))}>1組の当たりは小さい</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(9), undefined, at(10))}>253回くじを引く</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10), undefined, at(11))}>人数が2倍なら</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(11), undefined, at(12))}>人数の割に急に上がる</Line>

      <Line t={t} y={200} size={86} life={L(at(12), at(13))}>誕生日のパラドックス</Line>
      <Line t={t} y={360} size={72} life={L(at(13))}>40人のクラスなら</Line>

      {/* ── 下部ゾーン（数式・結論） ── */}
      <Line t={t} y={BOT[1]} size={60} life={L(at(0, 0.12), undefined, at(2))}>
        <Tex src={`n = ${nShown}`} />
        <span style={{ width: 40 }} />
        <Tex src={`P = ${(pMatch(nShown) * 100).toFixed(1)}\\%`} />
      </Line>
      <Line t={t} y={BOT[0]} size={72} life={L(at(1), undefined, at(2))}>たった23人</Line>

      <Line t={t} y={BOT[0]} size={64} color={C.a} life={L(at(3, 0.05), at(4), at(5))}>
        相手は <Tex src="22" /> 人
      </Line>
      <Line t={t} y={BOT[1]} size={64} life={L(at(3, 0.5), at(4), at(5))}>
        確率は わずか <Tex src="6\%" />
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(6, 0.1), at(7), at(8))}>
        <Tex src="22 + 21 + 20 + \cdots + 1" />
      </Line>
      <Line t={t} y={BOT[1] + 10} size={84} color={C.b} life={L(at(7, 0.05), undefined, at(8))}>
        <Tex src="= 253" /> 回
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(8, 0.3), undefined, at(9))}>
        1組が一致 <Tex src="\dfrac{1}{365}" />
      </Line>
      <Line t={t} y={BOT[1] + 20} size={56} life={L(at(9, 0.1), undefined, at(10))}>
        1回も当たらない確率
      </Line>
      <Line t={t} y={BOT[2] + 10} size={84} life={L(at(9, 0.1), undefined, at(10))}>
        <Tex src={`${missPct.toFixed(0)}\\%`} />
      </Line>

      <Line t={t} y={BOT[0] + 30} size={76} life={L(at(10, 0.3), undefined, at(11))}>
        <span style={{ color: C.a }}>人数 ×2</span>
        <span>→</span>
        <span style={{ color: C.b }}>組 ×4</span>
      </Line>

      <Line t={t} y={BOT[0] + 30} size={60} life={L(at(13, 0.1), at(13, 0.45))}>
        同じ誕生日がいる確率
      </Line>
      <Line t={t} y={BOT[1] + 40} size={96} color={C.a} life={L(at(13, 0.45))}>
        約 <Tex src="89\%" />
      </Line>

      {/* ナレーション */}
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
          // 声より十分小さく。最初と最後だけフェード
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
