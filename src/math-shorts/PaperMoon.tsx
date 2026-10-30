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
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, smooth, Sphere, SphereDefs, Tex, W } from "./kit";
import { MathShortProps } from "./timeline";

// 紙を42回折ると月に届く
// 要素A（ゴールド）: 重ねる … 1回ごとに +0.1mm（足し算）
// 要素B（シアン）  : 折る   … 1回ごとに ×2（倍々）

const BGM_VOLUME = 0.06;
const PAPER = "#EDEDED";

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

// 縦の寸法線（矢じり付き）
const DimV: React.FC<{ x: number; y1: number; y2: number; color?: string; opacity?: number }> = ({
  x,
  y1,
  y2,
  color = C.white,
  opacity = 1,
}) =>
  opacity <= 0 ? null : (
    <g opacity={opacity} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <polyline points={`${x - 10},${y1 + 16} ${x},${y1} ${x + 10},${y1 + 16}`} />
      <polyline points={`${x - 10},${y2 - 16} ${x},${y2} ${x + 10},${y2 - 16}`} />
    </g>
  );

// 薄い紙の層を積んだ束
const Stack: React.FC<{ x: number; bottom: number; w: number; n: number; layer: number; color: string }> = ({
  x,
  bottom,
  w,
  n,
  layer,
  color,
}) => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <rect key={i} x={x - w / 2} y={bottom - (i + 1) * layer} width={w} height={Math.max(1, layer - 1.5)} fill={color} rx={1} />
    ))}
  </g>
);

// 比べる目印（同じ縮尺で、柱と並べる）
const Phone: React.FC<{ x: number; base: number; h: number }> = ({ x, base, h }) => (
  <g>
    <rect x={x - h * 0.24} y={base - h} width={h * 0.48} height={h} rx={h * 0.07} fill="#222" stroke="#bbb" strokeWidth={4} />
    <rect x={x - h * 0.2} y={base - h * 0.93} width={h * 0.4} height={h * 0.86} rx={h * 0.03} fill="#0F4C81" opacity={0.8} />
  </g>
);

const Building: React.FC<{ x: number; base: number; h: number }> = ({ x, base, h }) => {
  const w = h * 0.38;
  const rows = 12;
  return (
    <g>
      <rect x={x - w / 2} y={base - h} width={w} height={h} fill="#2a2a2a" stroke="#bbb" strokeWidth={3} />
      {Array.from({ length: rows }, (_, r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={x - w / 2 + w * (0.12 + c * 0.29)}
            y={base - h + h * (0.04 + (r * 0.92) / rows)}
            width={w * 0.18}
            height={(h / rows) * 0.45}
            fill="#E2C48E"
            opacity={0.55}
          />
        )),
      )}
    </g>
  );
};

const Tower: React.FC<{ x: number; base: number; h: number }> = ({ x, base, h }) => (
  <g fill="#ccc">
    <polygon points={`${x - h * 0.07},${base} ${x + h * 0.07},${base} ${x + h * 0.012},${base - h * 0.95} ${x - h * 0.012},${base - h * 0.95}`} />
    <rect x={x - h * 0.035} y={base - h * 0.56} width={h * 0.07} height={h * 0.03} rx={4} />
    <rect x={x - h * 0.026} y={base - h * 0.71} width={h * 0.052} height={h * 0.02} rx={4} />
    <line x1={x} y1={base - h * 0.95} x2={x} y2={base - h} stroke="#ccc" strokeWidth={3} />
  </g>
);

const Fuji: React.FC<{ x: number; base: number; h: number }> = ({ x, base, h }) => {
  const w = h * 2.1;
  const top = h * 0.12;
  return (
    <g>
      <polygon points={`${x - w / 2},${base} ${x - top},${base - h} ${x + top},${base - h} ${x + w / 2},${base}`} fill="#3a4a63" />
      <polygon
        points={`${x - top},${base - h} ${x + top},${base - h} ${x + top + h * 0.3},${base - h * 0.7} ${x + top * 0.3},${base - h * 0.78} ${x - top * 0.6},${base - h * 0.66} ${x - top - h * 0.3},${base - h * 0.7}`}
        fill="#f4f4f4"
      />
    </g>
  );
};

const Moon: React.FC<{ x: number; y: number; r: number; opacity?: number }> = ({ x, y, r, opacity = 1 }) => (
  <g opacity={opacity}>
    <circle cx={x} cy={y} r={r} fill="#cfcfcf" />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.22} fill="#a9a9a9" />
    <circle cx={x + r * 0.35} cy={y + r * 0.3} r={r * 0.15} fill="#a9a9a9" />
  </g>
);

// 地球から月への柱（縦）。月の位置を 38.4万km とした縮尺
const EARTH = { x: 540, y: 1230, r: 120 };
const SURF = EARTH.y - EARTH.r;
const MOON_Y = 640;
const PX_PER_KM = (SURF - MOON_Y) / 384400;
const kmY = (km: number) => SURF - km * PX_PER_KM;

const fmtYen = (v: number) => Math.round(v).toLocaleString("en-US");

export const PaperMoon: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 紙を折っていく（0）
  const s1 = sceneOpacity(t, at(0), at(1));
  const foldF = clampN(((t - at(0, 0.15)) / (durs[0] * 0.75)) * 5, 0, 5);
  const folds = Math.floor(foldF);
  const fk = smooth(foldF - folds);
  // 横と縦を交互に半分にする
  const sizeAfter = (k: number) => ({ w: 620 / 2 ** Math.ceil(k / 2), h: 440 / 2 ** Math.floor(k / 2) });
  const a0 = sizeAfter(folds);
  const a1 = sizeAfter(Math.min(folds + 1, 5));
  const pw = lerp(a0.w, a1.w, fk);
  const ph = lerp(a0.h, a1.h, fk);
  const shownFolds = Math.min(5, Math.round(foldF));

  // シーン2: 月まで届く（1）
  const s2 = sceneOpacity(t, at(1), at(2));
  const rise = smooth((t - at(1, 0.05)) / (durs[1] * 0.55));
  const colTop2 = lerp(SURF, kmY(439805), rise);

  // シーン3: 重ねる／折る（2〜4）
  const s3 = sceneOpacity(t, at(2), at(5));
  const nStack = Math.round(lerp(0, 42, smooth((t - at(2, 0.05)) / (durs[2] * 0.6))));
  const leftStrong = ramp(t, at(3), 0.3) * (1 - ramp(t, at(4), 0.3));
  const dbl = clampN(Math.floor((t - at(4, 0.1)) / ((durs[4] * 0.75) / 6)), 0, 5);
  const nFold = t < at(4, 0.05) ? 0 : 2 ** dbl;

  // シーン4: 身近なものと比べる（5〜7）
  const s4 = sceneOpacity(t, at(5), at(8));
  const BASE = 1250;
  const TALL = 560;
  const stages = [
    { on: at(5), off: at(6), col: 0.1024, ref: 0.147, n: 10, colText: "約10cm", refText: "スマホ" },
    { on: at(6), off: at(7), col: 104.86, ref: 100, n: 20, colText: "約100m", refText: "ビル" },
    { on: at(7), off: at(7, 0.5), col: 838.9, ref: 634, n: 23, colText: "約840m", refText: "スカイツリー" },
    { on: at(7, 0.5), off: at(8), col: 6710.9, ref: 3776, n: 26, colText: "約6700m", refText: "富士山" },
  ];

  // シーン5: 1回ごとに増える量（8）
  const s5 = sceneOpacity(t, at(8), at(9));
  const barK = (i: number) => ramp(t, at(8, 0.08) + i * 0.22, 0.25);

  // シーン6: 最後の1回（9〜10）
  const s6 = sceneOpacity(t, at(9), at(11));
  const lastK = ramp(t, at(10, 0.05), 0.5);

  // シーン7: 指数関数のグラフ（11）
  const s7 = sceneOpacity(t, at(11), at(12));
  const gK = smooth((t - at(11, 0.05)) / (durs[11] * 0.7));
  const gx = (n: number) => lerp(170, 930, n / 12);
  const gy = (v: number) => lerp(1220, 640, v / 4096);
  const expPts = Array.from({ length: 121 }, (_, i) => i / 10)
    .filter((n) => n <= gK * 12)
    .map((n) => `${gx(n)},${gy(2 ** n)}`)
    .join(" ");
  const linPts = Array.from({ length: 121 }, (_, i) => i / 10)
    .filter((n) => n <= gK * 12)
    .map((n) => `${gx(n)},${gy(n * 60)}`)
    .join(" ");

  // シーン8: 本物の紙は7回（12）
  const s8 = sceneOpacity(t, at(12), at(13));

  // シーン9: 1円を毎日2倍（13〜）
  const s9 = sceneOpacity(t, at(13), end + 1);
  const dayF = clampN(((t - at(13, 0.1)) / (durs[13] * 0.75)) * 30, 0, 30);
  const day = Math.floor(dayF);
  const yen = 2 ** day;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <SphereDefs />

        {/* シーン1 */}
        <g opacity={s1}>
          <rect x={540 - pw / 2} y={930 - ph / 2} width={pw} height={ph} fill={PAPER} stroke="#999" strokeWidth={2} />
          {/* 折り目の影 */}
          <rect x={540 - pw / 2} y={930 - ph / 2} width={pw} height={ph} fill="#000" opacity={0.25 * Math.sin(Math.PI * fk) * (folds < 5 ? 1 : 0)} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <line x1={150} x2={930} y1={MOON_Y} y2={MOON_Y} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          <rect x={EARTH.x - 9} y={colTop2} width={18} height={SURF - colTop2} fill={C.b} />
          <Moon x={EARTH.x + 150} y={MOON_Y - 50} r={50} />
          <Sphere x={EARTH.x} y={EARTH.y} r={EARTH.r} />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <Card x={50} y={640} w={470} h={600} strong={leftStrong} />
          <Card x={560} y={640} w={470} h={600} strong={ramp(t, at(4), 0.3)} />
          <Stack x={285} bottom={1150} w={260} n={nStack} layer={3} color={C.a} />
          <DimV x={445} y1={1150 - 42 * 3} y2={1150} color={C.a} opacity={s3 * ramp(t, at(2, 0.65), 0.3)} />
          <Stack x={795} bottom={1150} w={260} n={nFold} layer={nFold > 16 ? 12 : 14} color={C.b} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          <line x1={80} x2={1000} y1={BASE} y2={BASE} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {stages.map((st, i) => {
            const op = ramp(t, st.on - 0.15, 0.3) * (1 - ramp(t, st.off - 0.15, 0.3));
            if (op <= 0) return null;
            const scale = TALL / Math.max(st.col, st.ref);
            const colH = st.col * scale * ramp(t, st.on + 0.05, 0.6);
            const refH = st.ref * scale;
            return (
              <g key={i} opacity={op}>
                <rect x={300} y={BASE - colH} width={110} height={colH} fill={C.b} />
                {i === 0 ? <Phone x={720} base={BASE} h={refH} /> : null}
                {i === 1 ? <Building x={720} base={BASE} h={refH} /> : null}
                {i === 2 ? <Tower x={720} base={BASE} h={refH} /> : null}
                {i === 3 ? <Fuji x={760} base={BASE} h={refH} /> : null}
              </g>
            );
          })}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <line x1={120} x2={960} y1={1220} y2={1220} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => {
            const h = (2 ** i / 512) * 520;
            const k = barK(i);
            return (
              <g key={i}>
                <rect x={150 + i * 80} y={1220 - Math.max(h, 3) * k} width={34} height={Math.max(h, 3) * k} fill={C.b} />
                <rect x={188 + i * 80} y={1220 - 6 * k} width={20} height={6 * k} fill={C.a} />
              </g>
            );
          })}
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <Moon x={EARTH.x + 150} y={MOON_Y - 50} r={50} />
          <line x1={150} x2={930} y1={MOON_Y} y2={MOON_Y} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 10" />
          <rect x={EARTH.x - 9} y={kmY(439805)} width={18} height={SURF - kmY(439805)} fill={C.b} opacity={lerp(1, 0.35, lastK)} />
          <rect x={EARTH.x - 9} y={kmY(439805)} width={18} height={(SURF - kmY(439805)) / 2} fill={C.b} opacity={lastK} />
          <DimV x={EARTH.x - 50} y1={kmY(439805)} y2={kmY(219902)} color={C.b} opacity={lastK} />
          <Sphere x={EARTH.x} y={EARTH.y} r={EARTH.r} />
        </g>

        {/* シーン7 */}
        <g opacity={s7}>
          <line x1={gx(0)} x2={gx(12)} y1={gy(0)} y2={gy(0)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <line x1={gx(0)} x2={gx(0)} y1={gy(0)} y2={gy(4300)} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <polyline points={linPts} fill="none" stroke={C.a} strokeWidth={6} strokeLinejoin="round" />
          <polyline points={expPts} fill="none" stroke={C.b} strokeWidth={6} strokeLinejoin="round" />
        </g>

        {/* シーン8 */}
        <g opacity={s8}>
          <Stack x={540} bottom={1150} w={300} n={128} layer={2.6} color={PAPER} />
          <DimV x={730} y1={1150 - 128 * 2.6} y2={1150} opacity={ramp(t, at(12, 0.3), 0.3)} />
        </g>

        {/* シーン9 */}
        <g opacity={s9}>
          <circle cx={540} cy={820} r={110} fill="none" stroke="#ccc" strokeWidth={6} />
          <circle cx={540} cy={820} r={92} fill="none" stroke="#ccc" strokeWidth={2} opacity={0.5} />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={540} y={1250} text={`${shownFolds}回`} size={56} opacity={s1} />

      <Label x={EARTH.x - 40} y={MOON_Y - 40} text="月まで 38万km" align="right" size={50} opacity={s2} />
      <Label x={EARTH.x + 220} y={kmY(439805) - 10} text="44万km" align="left" size={52} color={C.b} opacity={s2 * ramp(rise, 0.95, 0.05)} />

      <Label x={285} y={710} text="重ねる" size={54} color={C.a} opacity={s3} />
      <Label x={795} y={710} text="折る" size={54} color={C.b} opacity={s3 * ramp(t, at(4) - 0.2, 0.3)} />
      <Label x={285} y={1200} text={`${nStack}枚`} size={50} opacity={s3} />
      <Label x={795} y={1200} text={`${nFold}枚分`} size={50} opacity={s3 * (nFold > 0 ? 1 : 0)} />

      {stages.map((st, i) => {
        const op = s4 * ramp(t, st.on - 0.15, 0.3) * (1 - ramp(t, st.off - 0.15, 0.3));
        const scale = TALL / Math.max(st.col, st.ref);
        return (
          <React.Fragment key={i}>
            <Label x={355} y={BASE - st.col * scale - 70} text={st.colText} size={50} color={C.b} opacity={op * ramp(t, st.on + 0.5, 0.3)} />
            <Label x={720} y={BASE - st.ref * scale - 70} text={st.refText} size={50} opacity={op} />
          </React.Fragment>
        );
      })}

      <Label x={540} y={1275} text="1回目 → 10回目" size={48} opacity={s5} />
      <Label x={150} y={640} text="1回ごとに増える量" align="left" size={50} opacity={s5} />

      <Label x={EARTH.x + 220} y={MOON_Y - 50} text="月" align="left" size={50} opacity={s6} />
      <Label x={EARTH.x - 80} y={(kmY(439805) + kmY(219902)) / 2 - 20} text={<>最後の1回<br />約22万km</>} align="right" size={50} color={C.b} opacity={s6 * lastK} />
      <Label x={EARTH.x - 140} y={SURF - 10} text="+0.1mm" align="right" size={50} color={C.a} opacity={s6 * (1 - lastK)} />

      <Label x={gx(12)} y={gy(4096) + 20} text="折る" align="right" size={52} color={C.b} opacity={s7 * ramp(gK, 0.9, 0.1)} />
      <Label x={gx(12)} y={gy(720) - 50} text="重ねる" align="right" size={52} color={C.a} opacity={s7 * ramp(gK, 0.9, 0.1)} />
      <Label x={gx(12)} y={gy(0) + 50} text="回数" align="right" size={48} opacity={s7} />

      <Label x={760} y={1150 - 64 * 2.6} text="約1.3cm" align="left" size={50} opacity={s8 * ramp(t, at(12, 0.3), 0.3)} />
      <Label x={540} y={730} text="7回 ＝ 128枚分" size={52} opacity={s8} />

      <Label x={540} y={820} text="¥" size={110} color="#ddd" opacity={s9} />
      <Label x={540} y={1010} text={`${day}日目`} size={56} opacity={s9} />
      <Label x={540} y={1130} text={`${fmtYen(yen)}円`} size={72} color={day >= 30 ? C.b : C.white} opacity={s9} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>0.1ミリの紙を</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.35), at(1), at(2))}>42回折ると？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(4), at(5))}>重ねる 42枚</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(4), undefined, at(5))}>折る 1回で2倍</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(5), undefined, at(8))}>折るたびに2倍</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(9))}>増える量＝今の厚さ</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), undefined, at(11))}>42回目の1回</Line>

      <Line t={t} y={200} size={86} life={L(at(11), at(12), at(12))}>指数関数</Line>
      <Line t={t} y={360} size={64} life={L(at(11, 0.3), at(12), at(12))}>倍々で増える</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(12), undefined, at(13))}>本物の紙は7回</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(13))}>1円を毎日2倍</Line>

      {/* ── 下部ゾーン（数式・結論） ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.2), undefined, at(1))}>
        厚さ 0.1mm
      </Line>
      <Line t={t} y={BOT[0]} size={56} life={L(at(1), at(1, 0.5), at(2))}>
        <Tex src="0.1\,\mathrm{mm} \times 2 \times 2 \times \cdots" />
      </Line>
      <Line t={t} y={BOT[1]} size={80} color={C.b} life={L(at(1, 0.4), undefined, at(2))}>
        約44万km
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.6), at(4), at(5))}>
        42枚 → 4.2mm
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(3, 0.2), at(4), at(5))}>
        1回ごとに +0.1mm
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(4, 0.2), undefined, at(5))}>
        1回ごとに ×2
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(5, 0.4), at(6), at(8))}>
        10回 → 約10cm
      </Line>
      <Line t={t} y={BOT[1]} size={60} life={L(at(6, 0.4), at(7), at(8))}>
        20回 → 約100m
      </Line>
      <Line t={t} y={BOT[2]} size={60} life={L(at(7, 0.1), undefined, at(7, 0.5))}>
        23回 → 約840m
      </Line>
      <Line t={t} y={BOT[2]} size={60} life={L(at(7, 0.55), undefined, at(8))}>
        26回 → 約6700m
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(8, 0.15), at(8, 0.6), at(9))}>
        増える量 ＝ そのときの厚さ
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(8, 0.6), undefined, at(9))}>
        厚いほど ↑ 大きく増える
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={50} color={C.a} life={L(at(9, 0.1), undefined, at(11))}>
        重ねる42回目
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={64} color={C.a} life={L(at(9, 0.3), undefined, at(11))}>
        +0.1mm
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={50} color={C.b} life={L(at(10, 0.05), undefined, at(11))}>
        折る42回目
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={64} color={C.b} life={L(at(10, 0.2), undefined, at(11))}>
        +22万km
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(11, 0.2), undefined, at(12))}>
        <Tex src="1,\ 2,\ 4,\ 8,\ 16,\ 32,\ \dots" />
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(12, 0.4), undefined, at(13))}>
        計算では月まで
      </Line>

      <Line t={t} y={BOT[1]} size={64} color={C.b} life={L(at(13, 0.85))}>
        30日で 10億円超え
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

const clampN = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

