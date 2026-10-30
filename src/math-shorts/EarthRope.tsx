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

// 赤道のロープ問題
// 要素A（ゴールド）: ロープ＝周の長さ L = 2πR ∝ R（地球なら約4万km）
// 要素B（シアン）  : すき間＝半径の増え ΔR = ΔL/2π（R によらない）

const BGM_VOLUME = 0.06;

type Pt = { x: number; y: number };

// 地球（中央ゾーンの中心）
const EX = 540;
const EY = 930;
const ER = 290;

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

// 両端に矢じりのある寸法線
const Dim: React.FC<{ a: Pt; b: Pt; color?: string; opacity?: number }> = ({ a, b, color = C.white, opacity = 1 }) => {
  if (opacity <= 0) return null;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const head = Math.min(16, len / 3);
  const arrow = (p: Pt, s: number) =>
    `${p.x + s * (ux * head - uy * head * 0.55)},${p.y + s * (uy * head + ux * head * 0.55)} ${p.x},${p.y} ${
      p.x + s * (ux * head + uy * head * 0.55)
    },${p.y + s * (uy * head - ux * head * 0.55)}`;
  return (
    <g opacity={opacity} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <polyline points={arrow(a, 1)} />
      <polyline points={arrow(b, -1)} />
    </g>
  );
};

// 経緯線の入った地球
const Globe: React.FC<{ x: number; y: number; r: number; opacity?: number }> = ({ x, y, r, opacity = 1 }) => (
  <g opacity={opacity}>
    <Sphere x={x} y={y} r={r} />
    <g fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={1.5}>
      {[0.35, 0.7].map((k) => (
        <ellipse key={k} cx={x} cy={y} rx={r * k} ry={r} />
      ))}
      {[-0.55, 0, 0.55].map((k) => (
        <ellipse key={k} cx={x} cy={y + r * k} rx={r * Math.sqrt(1 - k * k)} ry={r * 0.12 * Math.sqrt(1 - k * k)} />
      ))}
    </g>
  </g>
);

// ロープ（金色の円）。dash を与えると一部だけ描く
const Rope: React.FC<{ x: number; y: number; r: number; width?: number; opacity?: number; draw?: number }> = ({
  x,
  y,
  r,
  width = 6,
  opacity = 1,
  draw = 1,
}) => {
  const c = 2 * Math.PI * r;
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke={C.a}
      strokeWidth={width}
      opacity={opacity}
      strokeDasharray={`${c * draw} ${c}`}
      transform={`rotate(-90 ${x} ${y})`}
    />
  );
};

// 拡大図：地面とロープの間を猫がくぐる
const GROUND_Y = 1080;
const GAP_PX = 150;
const Cat: React.FC<{ x: number; y: number; step: number }> = ({ x, y, step }) => {
  const leg = (dx: number, ph: number) => (
    <line
      x1={x + dx}
      y1={y - 34}
      x2={x + dx + 10 * Math.sin(step * Math.PI * 2 + ph)}
      y2={y}
      stroke="#ddd"
      strokeWidth={9}
      strokeLinecap="round"
    />
  );
  return (
    <g>
      {leg(-38, 0)}
      {leg(-22, Math.PI)}
      {leg(28, Math.PI)}
      {leg(44, 0)}
      <ellipse cx={x} cy={y - 50} rx={66} ry={27} fill="#ddd" />
      <path d={`M ${x - 60} ${y - 58} q -45 -10 -50 -55`} stroke="#ddd" strokeWidth={10} fill="none" strokeLinecap="round" />
      <circle cx={x + 70} cy={y - 74} r={25} fill="#ddd" />
      <polygon points={`${x + 52},${y - 90} ${x + 56},${y - 118} ${x + 72},${y - 97}`} fill="#ddd" />
      <polygon points={`${x + 76},${y - 98} ${x + 90},${y - 120} ${x + 94},${y - 90}`} fill="#ddd" />
    </g>
  );
};

const Zoom: React.FC<{ t: number; t0: number; t1: number; lift: number; dimK: number }> = ({ t, t0, t1, lift, dimK }) => {
  const step = (t - t0) * 1.6;
  // ロープが上がってから左から歩いてくる
  const cx = lerp(-150, 1150, (t - t0 - 1.4) / (t1 - t0 - 1.4));
  const ropeY = GROUND_Y - GAP_PX * lift;
  // 地球の丸みはほとんど見えないので、ゆるい弧にする
  const arc = (y: number) => `M 60 ${y + 18} Q 540 ${y - 18} 1020 ${y + 18}`;
  return (
    <g>
      <defs>
        <clipPath id="zoom-clip">
          <rect x={50} y={620} width={980} height={640} rx={16} />
        </clipPath>
      </defs>
      <Card x={50} y={620} w={980} h={640} />
      <g clipPath="url(#zoom-clip)">
        <path d={`${arc(GROUND_Y)} L 1020 1260 L 60 1260 Z`} fill="url(#sphere-blue)" />
        <Cat x={cx} y={GROUND_Y - 2} step={step} />
        <path d={arc(ropeY)} fill="none" stroke={C.a} strokeWidth={8} />
      </g>
      <Dim a={{ x: 150, y: GROUND_Y - 10 }} b={{ x: 150, y: ropeY + 6 }} color={C.b} opacity={ramp(lift, 0.6, 0.3) * (1 - dimK)} />
    </g>
  );
};

export const EarthRope: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1: 地球にロープを巻いて 1m 伸ばす（0）
  const s1 = sceneOpacity(t, at(0), at(1));
  const draw1 = smooth((t - at(0, 0.05)) / (durs[0] * 0.35));
  const lift1 = ramp(t, at(0, 0.5), 0.6);

  // シーン2: 拡大図（1）
  const s2 = sceneOpacity(t, at(1), at(2));
  const lift2 = ramp(t, at(1, 0.45), 0.5);

  // シーン3: ロープ＝周、すき間＝半径の増え（2〜3）
  const s3 = sceneOpacity(t, at(2), at(4));
  const draw3 = smooth((t - at(2, 0.1)) / (durs[2] * 0.5));
  const radK = ramp(t, at(3, 0.15), 0.4);
  const gap3 = 26 * ramp(t, at(3, 0.35), 0.5);

  // シーン4: 周は半径に比例（4）
  const s4 = sceneOpacity(t, at(4), at(5));
  const cardDraw = (j: number) => smooth((t - at(4, 0.1) - j * 0.25) / (durs[4] * 0.45));

  // シーン5: 1m は周の4千万分の1／ΔR = ΔL/2π（5〜7）
  const s5 = sceneOpacity(t, at(5), at(8));
  const tick = ramp(t, at(5, 0.25), 0.4);
  const ring6 = ramp(t, at(6, 0.05), 0.4);
  const gap6 = 26 * ring6;
  const crossR = ramp(t, at(7, 0.2), 0.4);

  // シーン6: ボールと地球（8）
  const s6 = sceneOpacity(t, at(8), at(9));
  const lift8 = ramp(t, at(8, 0.4), 0.6);

  // シーン7: 円が大きくなってもすき間は同じ（9〜10）
  const s7 = sceneOpacity(t, at(9), at(11));
  const grow = smooth((t - at(9, 0.05)) / (durs[9] * 0.8));
  const rG = lerp(60, 250, grow);
  const GAP_G = 46;
  const dimG = ramp(t, at(10, 0.2), 0.4);

  // シーン8: 定理名（11）
  const s8 = sceneOpacity(t, at(11), at(12));

  // シーン9: 回収（12〜）
  const s9 = sceneOpacity(t, at(12), end + 1);
  const lift9 = ramp(t, at(12, 0.05), 0.6);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <SphereDefs />

        {/* シーン1 */}
        <g opacity={s1}>
          <Globe x={EX} y={EY} r={ER} />
          <Rope x={EX} y={EY} r={ER + 4 + 22 * lift1} draw={draw1} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          <Zoom t={t} t0={at(1)} t1={at(2)} lift={lift2} dimK={0} />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          <Globe x={EX} y={EY} r={ER} />
          <Rope x={EX} y={EY} r={ER + 4 + gap3} draw={draw3} opacity={lerp(1, 0.55, radK)} />
          <line x1={EX} y1={EY} x2={EX} y2={EY - ER} stroke={C.b} strokeWidth={4} opacity={radK} strokeDasharray={`${ER * radK} ${ER}`} />
          <circle cx={EX} cy={EY} r={7} fill="#fff" opacity={radK} />
          <Dim a={{ x: EX + 30, y: EY - ER }} b={{ x: EX + 30, y: EY - ER - gap3 }} color={C.b} opacity={gap3 > 12 ? 1 : 0} />
          <Leader pts={[{ x: EX + 36, y: EY - ER - 14 }, { x: 820, y: 600 }, { x: 860, y: 600 }]} k={ramp(t, at(3, 0.5), 0.3)} color={C.b} />
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {[
            { x: 50, cx: 285, r: 75 },
            { x: 560, cx: 795, r: 150 },
          ].map((c, j) => (
            <g key={j}>
              <Card x={c.x} y={640} w={470} h={560} strong={j === 1 ? ramp(t, at(4, 0.5), 0.3) : 0} />
              <circle cx={c.cx} cy={930} r={c.r} fill="url(#sphere-blue)" opacity={0.85} />
              <Rope x={c.cx} y={930} r={c.r} width={5} draw={cardDraw(j)} />
              <line x1={c.cx} y1={930} x2={c.cx + c.r} y2={930} stroke={C.b} strokeWidth={4} />
              <circle cx={c.cx} cy={930} r={6} fill="#fff" />
            </g>
          ))}
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          <Globe x={EX} y={EY} r={ER} />
          <Rope x={EX} y={EY} r={ER + 4 + gap6} opacity={lerp(1, 0.7, ring6)} />
          {/* 伸ばした 1m（誇張して描く） */}
          <path
            d={`M ${EX - 18} ${EY - ER - 8} A ${ER + 8} ${ER + 8} 0 0 1 ${EX + 18} ${EY - ER - 8}`}
            stroke="#fff"
            strokeWidth={12}
            fill="none"
            opacity={tick * (1 - ring6)}
          />
          <Leader pts={[{ x: EX + 14, y: EY - ER - 16 }, { x: 760, y: 590 }, { x: 800, y: 590 }]} k={tick * (1 - ring6)} />
          <line x1={EX} y1={EY} x2={EX} y2={EY - ER} stroke={C.b} strokeWidth={4} opacity={ring6 * lerp(1, 0.35, crossR)} />
          <circle cx={EX} cy={EY} r={7} fill="#fff" opacity={ring6} />
          <Dim a={{ x: EX + 30, y: EY - ER }} b={{ x: EX + 30, y: EY - ER - gap6 }} color={C.b} opacity={gap6 > 12 ? 1 : 0} />
          <Leader pts={[{ x: EX + 36, y: EY - ER - 14 }, { x: 820, y: 600 }, { x: 860, y: 600 }]} k={ring6} color={C.b} />
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <Card x={50} y={640} w={470} h={560} />
          <Card x={560} y={640} w={470} h={560} />
          {/* ボール：半径 12cm に 16cm のすき間（同じ縮尺） */}
          <Sphere x={285} y={980} r={60} />
          <Rope x={285} y={980} r={lerp(62, 60 * (1 + 0.159 / 0.119), lift8)} width={5} />
          <Dim a={{ x: 285, y: 918 }} b={{ x: 285, y: 980 - 60 * (1 + 0.159 / 0.119) + 2 }} color={C.b} opacity={lift8 > 0.6 ? lift8 : 0} />
          {/* 地球：すき間は見えないほど小さい */}
          <defs>
            <clipPath id="card-earth">
              <rect x={560} y={640} width={470} height={560} rx={16} />
            </clipPath>
          </defs>
          <g clipPath="url(#card-earth)">
            <Globe x={795} y={1640} r={700} />
            <Rope x={795} y={1640} r={702 + 3 * lift8} width={5} />
          </g>
        </g>

        {/* シーン7 */}
        <g opacity={s7}>
          <circle cx={EX} cy={EY} r={rG} fill="url(#sphere-blue)" />
          <Rope x={EX} y={EY} r={rG + GAP_G} />
          <Dim a={{ x: EX, y: EY - rG - 2 }} b={{ x: EX, y: EY - rG - GAP_G + 4 }} color={C.b} />
          <line x1={EX} y1={EY} x2={EX + rG} y2={EY} stroke="#fff" strokeOpacity={0.6} strokeWidth={3} />
          <Leader pts={[{ x: EX + 10, y: EY - rG - GAP_G / 2 }, { x: 820, y: EY - rG - GAP_G / 2 }]} k={dimG} color={C.b} />
        </g>

        {/* シーン8 */}
        <g opacity={s8}>
          <Globe x={EX} y={EY} r={ER} opacity={0.5} />
          <Rope x={EX} y={EY} r={ER + 26} opacity={0.5} />
        </g>

        {/* シーン9 */}
        <g opacity={s9}>
          <Zoom t={t} t0={at(12)} t1={end} lift={lift9} dimK={0} />
        </g>
      </svg>

      {/* 中央ゾーンのラベル（48px 以上、中央ゾーン内に収める） */}
      <Label x={EX} y={1290} text="+1m" size={56} color={C.a} opacity={s1 * lift1} />
      <Label x={175} y={GROUND_Y - GAP_PX - 55} text="16cm" align="left" size={54} color={C.b} opacity={s2 * ramp(lift2, 0.6, 0.3)} />
      <Label x={175} y={GROUND_Y - GAP_PX - 55} text="16cm" align="left" size={54} color={C.b} opacity={s9 * ramp(lift9, 0.6, 0.3)} />
      <Label x={540} y={680} text="拡大" size={48} color="#aaa" opacity={Math.max(s2, s9)} />

      <Label x={840} y={1250} text="周 L" size={54} color={C.a} opacity={s3 * ramp(t, at(2, 0.3), 0.3) * (1 - ramp(t, at(3), 0.3) * 0.6)} />
      <Label x={EX + 20} y={EY - ER * 0.4} text={<Tex src="R" />} align="left" size={56} color={C.b} opacity={s3 * radK} />
      <Label x={870} y={600} text="すき間" align="left" size={50} color={C.b} opacity={s3 * ramp(t, at(3, 0.5), 0.3)} />

      <Label x={285} y={705} text={<>半径 <Tex src="R" /></>} size={50} opacity={s4} />
      <Label x={795} y={705} text={<>半径 <Tex src="2R" /></>} size={50} opacity={s4} />
      <Label x={285} y={1140} text={<>周 <Tex src="L" /></>} size={50} color={C.a} opacity={s4 * ramp(t, at(4, 0.4), 0.3)} />
      <Label x={795} y={1140} text={<>周 <Tex src="2L" /></>} size={50} color={C.a} opacity={s4 * ramp(t, at(4, 0.55), 0.3)} />

      <Label x={810} y={590} text="1m" align="left" size={54} opacity={s5 * tick * (1 - ring6)} />
      <Label x={70} y={620} text="周 約4万km" align="left" size={50} color={C.a} opacity={s5 * ramp(t, at(5, 0.1), 0.3) * (1 - ring6)} />
      <Label x={EX + 20} y={EY - ER * 0.4} text={<Tex src="R" />} align="left" size={56} color={C.b} opacity={s5 * ring6 * lerp(1, 0.35, crossR)} />
      <Label x={870} y={600} text={<Tex src="\Delta R" />} align="left" size={56} color={C.b} opacity={s5 * ring6} />

      <Label x={285} y={705} text="ボール" size={50} opacity={s6} />
      <Label x={795} y={705} text="地球" size={50} opacity={s6} />
      <Label x={285} y={785} text="周 75cm" size={48} color={C.a} opacity={s6} />
      <Label x={795} y={785} text="周 4万km" size={48} color={C.a} opacity={s6} />
      <Label x={285} y={1260} text="すき間 16cm" size={48} color={C.b} opacity={s6 * lift8} />
      <Label x={795} y={1260} text="すき間 16cm" size={48} color={C.b} opacity={s6 * lift8} />

      <Label x={830} y={EY - rG - GAP_G / 2} text="すき間" align="left" size={50} color={C.b} opacity={s7 * (1 - dimG)} />
      <Label x={830} y={EY - rG - GAP_G / 2} text="16cm" align="left" size={54} color={C.b} opacity={s7 * dimG} />
      <Label x={EX + rG / 2} y={EY + 40} text={<Tex src="R" />} size={52} opacity={s7} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>赤道に巻いたロープ</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.3), at(1), at(2))}>1m伸ばすと？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(2), at(3), at(4))}>ロープ＝円の周</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(3), undefined, at(4))}>すき間＝半径の増え</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(4), undefined, at(5))}>周は半径に比例</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(5), at(6), at(8))}>伸ばす割合はわずか</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(6), at(7), at(8))}>半径の増え方</Line>
      <Line t={t} y={TOP[2]} size={72} life={L(at(7), undefined, at(8))}>地球の半径が消える</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(9))}>ボールでも1m</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(9), at(10), at(11))}>円を大きくしても</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(10), undefined, at(11))}>1mを2πで割る</Line>

      <Line t={t} y={200} size={86} life={L(at(11), at(12))}>赤道のロープ問題</Line>
      <Line t={t} y={360} size={72} life={L(at(12, 0.1))}>一周16cmのすき間</Line>

      {/* ── 下部ゾーン（数式・結論） ── */}
      <Line t={t} y={BOT[0]} size={64} life={L(at(0, 0.55), undefined, at(1))}>
        すき間は？
      </Line>
      <Line t={t} y={BOT[0]} size={56} life={L(at(1), at(1, 0.4), at(2))}>
        1ミリもなさそう？
      </Line>
      <Line t={t} y={BOT[1]} size={80} color={C.b} life={L(at(1, 0.4), undefined, at(2))}>
        約16cm
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.3), at(3), at(4))}>
        ロープの長さ <Tex src="L" />
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(3, 0.3), undefined, at(4))}>
        すき間 <Tex src="\Delta R" />
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(4, 0.2), at(4, 0.6), at(5))}>
        <Tex src="L = 2\pi R" />
      </Line>
      <Line t={t} y={BOT[1]} size={72} color={C.a} life={L(at(4, 0.6), undefined, at(5))}>
        周 <Tex src="L \propto R" />
      </Line>

      <Line t={t} y={BOT[0]} size={56} color={C.a} life={L(at(5, 0.3), at(6), at(8))}>
        伸ばす割合 <Tex src="\dfrac{1}{4 \times 10^{7}}" />
      </Line>
      <Line t={t} y={BOT[1] + 20} size={56} life={L(at(6, 0.1), at(6, 0.6), at(8))}>
        <Tex src="L + \Delta L = 2\pi (R + \Delta R)" />
      </Line>
      <Line t={t} y={BOT[2] + 30} size={60} color={C.b} life={L(at(6, 0.6), undefined, at(8))}>
        <Tex src="\Delta R = \dfrac{\Delta L}{2\pi}" />
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={50} color={C.a} life={L(at(9, 0.2), undefined, at(10))}>
        伸ばす割合
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={64} color={C.a} life={L(at(9, 0.25), undefined, at(10))}>
        ↓ 減る
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={50} color={C.b} life={L(at(9, 0.55), undefined, at(10))}>
        すき間 <Tex src="\Delta R" />
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={64} color={C.b} life={L(at(9, 0.6), undefined, at(10))}>
        → 同じ
      </Line>

      <Line t={t} y={BOT[0] + 30} size={60} life={L(at(10, 0.1), at(11), at(12))}>
        <Tex src="\Delta R = \dfrac{1\,\mathrm{m}}{2\pi} \approx 0.16\,\mathrm{m}" />
      </Line>

      <Line t={t} y={BOT[1] + 20} size={60} color={C.b} life={L(at(12, 0.4))}>
        地球の大きさによらない
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
