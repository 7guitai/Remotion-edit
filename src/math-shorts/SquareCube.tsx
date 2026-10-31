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
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, smooth, SphereDefs, Tex, W } from "./kit";
import { MathShortProps } from "./timeline";

// 二乗三乗則（10倍の巨人は立てない）
// 要素A（ゴールド）: 骨の切り口の広さ … 大きさ2倍で4倍、10倍で100倍
// 要素B（シアン）  : 体の重さ（中身の量） … 大きさ2倍で8倍、10倍で1000倍

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

const Card: React.FC<{ x: number; y: number; w: number; h: number; strong?: number }> = ({
  x,
  y,
  w,
  h,
  strong = 0,
}) => (
  <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke="#fff" strokeWidth={1.5} opacity={lerp(0.45, 0.95, strong)} />
);

const Leader: React.FC<{ pts: { x: number; y: number }[]; k: number; color?: string }> = ({ pts, k, color = C.white }) =>
  k <= 0 ? null : (
    <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={2} opacity={k} />
  );

// 人のシルエット（足もとが base、身長 h）
const Person: React.FC<{ x: number; base: number; h: number; fill?: string; crack?: number; legGlow?: number }> = ({
  x,
  base,
  h,
  fill = "url(#sphere-blue)",
  crack = 0,
  legGlow = 0,
}) => {
  const head = h * 0.075;
  const sh = base - h + head * 2.2;
  const hip = base - h * 0.47;
  const tw = h * 0.25;
  const lw = h * 0.085;
  const aw = h * 0.06;
  return (
    <g>
      <circle cx={x} cy={base - h + head} r={head} fill={fill} />
      <rect x={x - tw / 2} y={sh} width={tw} height={hip - sh} rx={h * 0.04} fill={fill} />
      <rect x={x - tw / 2 - aw - h * 0.01} y={sh + h * 0.01} width={aw} height={h * 0.36} rx={aw / 2} fill={fill} />
      <rect x={x + tw / 2 + h * 0.01} y={sh + h * 0.01} width={aw} height={h * 0.36} rx={aw / 2} fill={fill} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={x + s * tw * 0.27 - lw / 2} y={hip - h * 0.02} width={lw} height={base - hip + h * 0.02} rx={lw / 2} fill={fill} />
          {legGlow > 0 ? (
            <rect x={x + s * tw * 0.27 - lw / 2} y={hip - h * 0.02} width={lw} height={base - hip + h * 0.02} rx={lw / 2} fill={C.a} opacity={legGlow} />
          ) : null}
          {crack > 0 ? (
            <polyline
              points={[
                [-0.6, 0],
                [-0.1, 0.03],
                [0.2, -0.02],
                [0.6, 0.02],
              ]
                .map(([dx, dy]) => `${x + s * tw * 0.27 + dx * lw},${base - h * 0.22 + dy * h}`)
                .join(" ")}
              fill="none"
              stroke="#fff"
              strokeWidth={Math.max(3, h * 0.012)}
              opacity={crack}
            />
          ) : null}
        </g>
      ))}
    </g>
  );
};

// 等角図の立方体。(ox, oy) は手前下の角。size は一辺の画面上の長さ、n は面の目盛りの数
const COS = Math.cos(Math.PI / 6);
const Cube: React.FC<{
  ox: number;
  oy: number;
  size: number;
  n: number;
  top?: number;
  side?: number;
  opacity?: number;
}> = ({ ox, oy, size, n, top = 0, side = 0, opacity = 1 }) => {
  const P = (x: number, y: number, z: number) => ({
    X: ox + (x - y) * COS * size,
    Y: oy - (x + y) * 0.5 * size - z * size,
  });
  // 見える面：上（z=1）、左（y=1 を除く x=0 面）、右（y=0 面）
  const poly = (pts: { X: number; Y: number }[]) => pts.map((p) => `${p.X},${p.Y}`).join(" ");
  const left = [P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1)];
  const right = [P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)];
  const topF = [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)];
  const grid: React.ReactNode[] = [];
  const stroke = "rgba(0,0,0,0.55)";
  const sw = n > 5 ? 1 : 2.5;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    // 左面
    grid.push(<line key={`l1${i}`} x1={P(0, k, 0).X} y1={P(0, k, 0).Y} x2={P(0, k, 1).X} y2={P(0, k, 1).Y} stroke={stroke} strokeWidth={sw} />);
    grid.push(<line key={`l2${i}`} x1={P(0, 0, k).X} y1={P(0, 0, k).Y} x2={P(0, 1, k).X} y2={P(0, 1, k).Y} stroke={stroke} strokeWidth={sw} />);
    // 右面
    grid.push(<line key={`r1${i}`} x1={P(k, 0, 0).X} y1={P(k, 0, 0).Y} x2={P(k, 0, 1).X} y2={P(k, 0, 1).Y} stroke={stroke} strokeWidth={sw} />);
    grid.push(<line key={`r2${i}`} x1={P(0, 0, k).X} y1={P(0, 0, k).Y} x2={P(1, 0, k).X} y2={P(1, 0, k).Y} stroke={stroke} strokeWidth={sw} />);
    // 上面
    grid.push(<line key={`t1${i}`} x1={P(k, 0, 1).X} y1={P(k, 0, 1).Y} x2={P(k, 1, 1).X} y2={P(k, 1, 1).Y} stroke={stroke} strokeWidth={sw} />);
    grid.push(<line key={`t2${i}`} x1={P(0, k, 1).X} y1={P(0, k, 1).Y} x2={P(1, k, 1).X} y2={P(1, k, 1).Y} stroke={stroke} strokeWidth={sw} />);
  }
  const mix = (base: string, accent: string, k: number) => (k > 0.5 ? accent : base);
  return (
    <g opacity={opacity}>
      <polygon points={poly(left)} fill="#2E6E9E" />
      <polygon points={poly(left)} fill={C.b} opacity={side * 0.85} />
      <polygon points={poly(right)} fill="#1B4F7A" />
      <polygon points={poly(right)} fill="#3BA6C8" opacity={side * 0.85} />
      <polygon points={poly(topF)} fill="#5E9CC6" />
      <polygon points={poly(topF)} fill={C.a} opacity={top} />
      {grid}
      <polygon points={poly(left)} fill="none" stroke={mix("#cfe", "#fff", side)} strokeOpacity={0.7} strokeWidth={2} />
      <polygon points={poly(right)} fill="none" stroke="#cfe" strokeOpacity={0.7} strokeWidth={2} />
      <polygon points={poly(topF)} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={2} />
    </g>
  );
};

// 立方体の高さ（画面上）＝ size × (1 + 0.5 + 0.5) = 2 × size。中央にそろえるときに使う
const cubeH = (size: number) => size * 2;

const Elephant: React.FC<{ x: number; base: number; s: number; legGlow: number }> = ({ x, base, s, legGlow }) => {
  const fill = "#8a96a8";
  const legs = [-0.95, -0.55, 0.45, 0.85];
  return (
    <g>
      {legs.map((dx, i) => (
        <g key={i}>
          <rect x={x + dx * s - s * 0.13} y={base - s * 0.9} width={s * 0.26} height={s * 0.9} rx={s * 0.06} fill={fill} />
          <rect x={x + dx * s - s * 0.13} y={base - s * 0.9} width={s * 0.26} height={s * 0.9} rx={s * 0.06} fill={C.a} opacity={legGlow} />
        </g>
      ))}
      <ellipse cx={x - s * 0.05} cy={base - s * 1.15} rx={s * 1.25} ry={s * 0.62} fill={fill} />
      <circle cx={x + s * 1.2} cy={base - s * 1.45} r={s * 0.42} fill={fill} />
      <ellipse cx={x + s * 0.95} cy={base - s * 1.4} rx={s * 0.3} ry={s * 0.42} fill="#76839a" />
      <path
        d={`M ${x + s * 1.5} ${base - s * 1.3} Q ${x + s * 1.75} ${base - s * 0.8} ${x + s * 1.6} ${base - s * 0.35}`}
        stroke={fill}
        strokeWidth={s * 0.16}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={x + s * 1.3} cy={base - s * 1.55} r={s * 0.04} fill="#222" />
    </g>
  );
};

export const SquareCube: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });
  const BASE = 1230;

  // シーン1: 巨人（0〜1）
  const s1 = sceneOpacity(t, at(0), at(2));
  const grow = smooth((t - at(0, 0.2)) / (durs[0] * 0.6));
  const giantH = lerp(56, 560, grow);
  const crack = ramp(t, at(1, 0.45), 0.25);
  const shake = crack > 0 && crack < 1 ? Math.sin(t * 60) * 6 : 0;

  // シーン2: 重さ＝中身、強さ＝切り口（2〜3）
  const s2 = sceneOpacity(t, at(2), at(4));
  const fillK = ramp(t, at(2, 0.2), 0.5);
  const legK = ramp(t, at(3, 0.25), 0.4);

  // シーン3: サイコロ 1倍と2倍（4〜7）
  const s3 = sceneOpacity(t, at(4), at(8));
  const big2 = ramp(t, at(4, 0.4), 0.5);
  const topK = ramp(t, at(5, 0.1), 0.4);
  const sideK = ramp(t, at(6, 0.1), 0.4);
  const topDim = lerp(1, 0.55, ramp(t, at(6), 0.3));

  // シーン4: 10倍（8）
  const s4 = sceneOpacity(t, at(8), at(9));
  const top10 = ramp(t, at(8, 0.25), 0.4);
  const side10 = ramp(t, at(8, 0.6), 0.4);

  // シーン5: 大きさを 1→10 に（9）
  const s5 = sceneOpacity(t, at(9), at(10));
  const sc = lerp(1, 10, smooth((t - at(9, 0.05)) / (durs[9] * 0.85)));
  const scI = Math.max(1, Math.round(sc));

  // シーン6: 負担10倍（10）
  const s6 = sceneOpacity(t, at(10), at(11));
  const press = ramp(t, at(10, 0.1), 0.5);
  const crack6 = ramp(t, at(10, 0.5), 0.3);

  // シーン7: 定理名（11）
  const s7 = sceneOpacity(t, at(11), at(12));

  // シーン8: 身長1.7m→17m（12）
  const s8 = sceneOpacity(t, at(12), at(13));
  const g8 = smooth((t - at(12, 0.35)) / (durs[12] * 0.4));

  // シーン9: ゾウ（13〜）
  const s9 = sceneOpacity(t, at(13), end + 1);
  const legGlow9 = ramp(t, at(13, 0.3), 0.4) * 0.8;

  const c1 = { cx: 285, size: 70 };
  const c2 = { cx: 795, size: lerp(70, 140, big2) };

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <SphereDefs />

        {/* シーン1 */}
        <g opacity={s1}>
          <line x1={80} x2={1000} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
          <Person x={260} base={BASE} h={56} />
          <g transform={`translate(${shake} 0)`}>
            <Person x={620} base={BASE} h={giantH} crack={crack} />
          </g>
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <line x1={80} x2={1000} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
          <Person x={420} base={BASE} h={560} />
          <g opacity={fillK * (1 - legK * 0.6)}>
            <Person x={420} base={BASE} h={560} fill={C.b} />
          </g>
          <g opacity={legK}>
            <Person x={420} base={BASE} h={560} fill="none" legGlow={1} />
          </g>
          <Leader pts={[{ x: 460, y: BASE - 150 }, { x: 700, y: BASE - 150 }, { x: 700, y: 1000 }]} k={legK} color={C.a} />
          <circle cx={800} cy={900} r={80 * legK} fill={C.a} opacity={0.9} />
          <circle cx={800} cy={900} r={80} fill="none" stroke="#fff" strokeWidth={2} opacity={legK} />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <Card x={50} y={640} w={470} h={600} />
          <Card x={560} y={640} w={470} h={600} strong={big2} />
          <Cube ox={c1.cx} oy={1080} size={c1.size} n={1} top={topK * topDim} side={sideK} />
          <Cube ox={c2.cx} oy={1080 + (cubeH(140) - cubeH(c2.size)) * 0} size={c2.size} n={big2 > 0.5 ? 2 : 1} top={topK * topDim} side={sideK} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <Card x={50} y={640} w={470} h={600} />
          <Card x={560} y={640} w={470} h={600} strong={1} />
          <Cube ox={285} oy={1080} size={14} n={1} top={top10} side={side10} />
          <Cube ox={795} oy={1080} size={140} n={10} top={top10} side={side10} />
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <line x1={150} x2={930} y1={1200} y2={1200} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <rect x={250} y={1200 - (sc * sc) / 1000 * 480} width={160} height={(sc * sc) / 1000 * 480} fill={C.a} rx={4} />
          <rect x={670} y={1200 - (sc * sc * sc) / 1000 * 480} width={160} height={(sc * sc * sc) / 1000 * 480} fill={C.b} rx={4} />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <line x1={150} x2={930} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
          <rect x={490} y={BASE - 300} width={100} height={300} fill={C.a} rx={10} />
          <rect x={330} y={lerp(700, BASE - 300 - 200, press)} width={420} height={200} fill={C.b} rx={10} opacity={press} />
          <polyline
            points={`470,${BASE - 170} 520,${BASE - 150} 555,${BASE - 175} 610,${BASE - 150}`}
            fill="none"
            stroke="#fff"
            strokeWidth={6}
            opacity={crack6}
          />
        </g>

        {/* シーン7 */}
        <g opacity={s7 * 0.6}>
          <Cube ox={540} oy={1150} size={140} n={10} top={1} side={1} />
        </g>

        {/* シーン8 */}
        <g opacity={s8}>
          <line x1={80} x2={1000} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
          <Person x={250} base={BASE} h={56} />
          <g opacity={g8}>
            <Person x={640} base={BASE} h={lerp(56, 560, g8)} />
          </g>
        </g>

        {/* シーン9 */}
        <g opacity={s9}>
          <line x1={80} x2={1000} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
          <Elephant x={480} base={BASE} s={180} legGlow={legGlow9} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300、数字を添える） ── */}
      <Label x={260} y={BASE - 110} text="ふつう" size={48} opacity={s1} />
      <Label x={820} y={BASE - giantH - 10} text="10倍" align="left" size={56} color={C.b} opacity={s1 * ramp(grow, 0.9, 0.1)} />
      <Label x={820} y={BASE - 140} text="ポキッ" align="left" size={56} opacity={s1 * crack} />

      <Label x={800} y={760} text="骨の切り口" size={50} color={C.a} opacity={s2 * legK} />

      <Label x={285} y={705} text="1倍" size={54} opacity={s3} />
      <Label x={795} y={705} text="2倍" size={54} color={C.b} opacity={s3 * big2} />
      <Label x={285} y={1140} text="広さ 1" size={48} color={C.a} opacity={s3 * topK} />
      <Label x={795} y={1140} text="広さ 4" size={48} color={C.a} opacity={s3 * topK} />
      <Label x={285} y={1200} text="重さ 1" size={48} color={C.b} opacity={s3 * sideK} />
      <Label x={795} y={1200} text="重さ 8" size={48} color={C.b} opacity={s3 * sideK} />

      <Label x={285} y={705} text="1倍" size={54} opacity={s4} />
      <Label x={795} y={705} text="10倍" size={54} color={C.b} opacity={s4} />
      <Label x={285} y={1140} text="広さ 1" size={48} color={C.a} opacity={s4 * top10} />
      <Label x={795} y={1140} text="広さ 100" size={48} color={C.a} opacity={s4 * top10} />
      <Label x={285} y={1200} text="重さ 1" size={48} color={C.b} opacity={s4 * side10} />
      <Label x={795} y={1200} text="重さ 1000" size={48} color={C.b} opacity={s4 * side10} />

      <Label x={330} y={660} text="骨の広さ" size={50} color={C.a} opacity={s5} />
      <Label x={750} y={660} text="体の重さ" size={50} color={C.b} opacity={s5} />
      <Label x={330} y={1200 - (sc * sc) / 1000 * 480 - 40} text={`${Math.round(sc * sc)}`} size={50} opacity={s5} />
      <Label x={750} y={1200 - (sc * sc * sc) / 1000 * 480 - 40} text={`${Math.round(sc * sc * sc)}`} size={50} opacity={s5 * (sc ** 3 < 900 ? 1 : 0)} />
      <Label x={950} y={740} text={`${Math.round(sc * sc * sc)}`} align="right" size={50} opacity={s5 * (sc ** 3 >= 900 ? 1 : 0)} />
      <Label x={540} y={1260} text={`大きさ ×${scI}`} size={52} opacity={s5} />

      <Label x={540} y={BASE - 400 - 0} text="重さ 1000" size={52} opacity={s6 * press} />
      <Label x={640} y={BASE - 60} text="骨の広さ 100" align="left" size={48} color={C.a} opacity={s6} />
      <Label x={330} y={BASE - 160} text="負担 ×10" align="right" size={56} opacity={s6 * crack6} />

      <Label x={250} y={BASE - 110} text="1.7m" size={50} opacity={s8} />
      <Label x={250} y={BASE + 45} text="60kg" size={48} color={C.b} opacity={s8} />
      <Label x={850} y={BASE - 520} text="17m" align="left" size={56} opacity={s8 * g8} />
      <Label x={850} y={BASE - 440} text="60トン" align="left" size={56} color={C.b} opacity={s8 * g8} />

      <Label x={540} y={720} text="太い脚" size={56} color={C.a} opacity={s9 * legGlow9 * 1.25} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>人を10倍にすると</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>立っていられる？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(4))}>重さ＝中身の量</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), undefined, at(4))}>強さ＝切り口の広さ</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(4), undefined, at(8))}>サイコロで比べる</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(9))}>10倍の巨人なら</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(10))}>大きくするほど</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10), undefined, at(11))}>骨の負担は10倍</Line>

      <Line t={t} y={200} size={86} life={L(at(11), at(12), at(12))}>二乗三乗則</Line>
      <Line t={t} y={360} size={60} life={L(at(11, 0.2), at(12), at(12))}>広さは×4、重さは×8</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(12), undefined, at(13))}>身長1.7mの人なら</Line>
      <Line t={t} y={TOP[0]} size={72} life={L(at(13))}>ゾウの脚が太い理由</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.3), undefined, at(1))}>
        身長 ×10
      </Line>
      <Line t={t} y={BOT[0]} size={72} life={L(at(1, 0.4), undefined, at(2))}>
        脚の骨が折れる
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(2, 0.3), at(3), at(4))}>
        重さ → 中身で決まる
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(3, 0.3), undefined, at(4))}>
        強さ → 切り口で決まる
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(4, 0.4), at(5), at(7, 0.4))}>
        大きさ ×2
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(5, 0.2), at(7), at(8))}>
        広さ <Tex src="2 \times 2 = 4" /> 倍
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(6, 0.2), at(7), at(8))}>
        重さ <Tex src="2 \times 2 \times 2 = 8" /> 倍
      </Line>
      <Line t={t} y={BOT[0]} size={64} life={L(at(7, 0.55), undefined, at(8))}>
        負担 <Tex src="8 \div 4 = 2" /> 倍
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(8, 0.25), undefined, at(9))}>
        広さ <Tex src="10 \times 10 = 100" /> 倍
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(8, 0.6), undefined, at(9))}>
        重さ <Tex src="10 \times 10 \times 10 = 1000" /> 倍
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(9, 0.4), undefined, at(10))}>
        骨の広さ
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(9, 0.45), undefined, at(10))}>
        追いつかない
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(9, 0.2), undefined, at(10))}>
        体の重さ
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(9, 0.25), undefined, at(10))}>
        ↑ 急に増える
      </Line>

      <Line t={t} y={BOT[0]} size={64} life={L(at(10, 0.2), undefined, at(11))}>
        負担 <Tex src="1000 \div 100 = 10" /> 倍
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(12, 0.5), undefined, at(13))}>
        体重 60kg → 60トン
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(13, 0.4))}>
        重さを支える太い脚
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
