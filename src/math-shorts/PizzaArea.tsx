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
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, smooth, Tex, W } from "./kit";
import { MathShortProps } from "./timeline";

// ピザの大きさ（面積の比は相似の比の2乗）
// 要素A（ゴールド）: 長さ（直径・耳）… 約1.4倍
// 要素B（シアン）  : 面積（食べられる量）… 約2.07倍

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

// ピザ（直径 d cm、1cm = s px）
const Pizza: React.FC<{ x: number; y: number; d: number; s: number; glow?: number; opacity?: number; plain?: number }> = ({
  x,
  y,
  d,
  s,
  glow = 0,
  opacity = 1,
  plain = 0,
}) => {
  const r = (d / 2) * s;
  const toppings = Array.from({ length: 9 }, (_, i) => {
    const a = i * 2.4;
    const rr = r * (0.25 + 0.5 * ((i * 37) % 10) / 10);
    return [x + rr * Math.cos(a), y + rr * Math.sin(a)];
  });
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill="#b9773a" />
      <circle cx={x} cy={y} r={r * 0.86} fill="#f1c45a" opacity={1 - plain} />
      <circle cx={x} cy={y} r={r * 0.86} fill={C.b} opacity={plain * 0.85} />
      {toppings.map(([tx, ty], i) => (
        <circle key={i} cx={tx} cy={ty} r={r * 0.09} fill="#b8432f" opacity={1 - plain} />
      ))}
      <circle cx={x} cy={y} r={r + 4} fill="none" stroke={C.a} strokeWidth={8} opacity={glow} />
    </g>
  );
};

const S = 8.5; // 1cm あたり px

export const PizzaArea: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  // シーン1〜2: ピザ3枚（0〜3）
  const s1 = sceneOpacity(t, at(0), at(4));
  const appear = (i: number) => ramp(t, at(0, 0.1) + i * 0.4, 0.4);
  const win = ramp(t, at(1, 0.1), 0.3) * (1 - ramp(t, at(2), 0.3));
  const beat1 = beat(t, at(1) + durs[1], pauseOf(1));
  const diamK = ramp(t, at(2, 0.1), 0.5);
  const ratioK = ramp(t, at(3, 0.3), 0.3);
  const P2 = [
    { x: 250, y: 800 },
    { x: 250, y: 1080 },
  ];
  const BIG = { x: 750, y: 940 };

  // シーン3: 面積（4〜5）
  const s3 = sceneOpacity(t, at(4), at(6));
  const sq = smooth((t - at(4, 0.1)) / (durs[4] * 0.6));
  const barsK = ramp(t, at(5, 0.05), 0.5);
  const beat5 = beat(t, at(5) + durs[5], pauseOf(5));

  // シーン4: 耳（6〜7）
  const s4 = sceneOpacity(t, at(6), at(8));
  const crustBar = ramp(t, at(6, 0.4), 0.6);
  const crustWin = ramp(t, at(7, 0.3), 0.3);

  // シーン5: 相似（8〜9）
  const s5 = sceneOpacity(t, at(8), at(10));
  const sim = (i: number) => ramp(t, at(8, 0.05) + i * 0.5, 0.4);

  // シーン6: 36cm と 20cm（10〜）
  const s6 = sceneOpacity(t, at(10), end + 1);
  const smallK = (i: number) => ramp(t, at(10, 0.25) + i * 0.3, 0.3);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1〜2 */}
        <g opacity={s1}>
          {P2.map((p, i) => (
            <Pizza key={i} x={p.x} y={p.y} d={25} s={S} opacity={appear(i)} />
          ))}
          <Pizza x={BIG.x} y={BIG.y} d={36} s={S} opacity={appear(2)} glow={win} />
          {/* 直径の線 */}
          <g opacity={diamK}>
            {P2.map((p, i) => (
              <line key={i} x1={p.x - 12.5 * S} x2={p.x + 12.5 * S} y1={p.y} y2={p.y} stroke={C.a} strokeWidth={8} strokeLinecap="round" />
            ))}
            <line x1={BIG.x - 18 * S} x2={BIG.x + 18 * S} y1={BIG.y} y2={BIG.y} stroke={C.a} strokeWidth={8} strokeLinecap="round" />
          </g>
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {/* 1辺 1 と 1辺 1.44 の正方形 */}
          <rect x={120} y={1000 - 200} width={200} height={200} fill={C.b} opacity={0.85} />
          <rect x={460} y={1000 - 200 * lerp(1, 1.44, sq)} width={200 * lerp(1, 1.44, sq)} height={200 * lerp(1, 1.44, sq)} fill={C.b} opacity={0.85} />
          <rect x={460} y={800} width={200} height={200} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="10 8" opacity={sq} />
          {/* 量の棒 */}
          <g opacity={barsK}>
            <rect x={120} y={1100} width={300 * 2} height={44} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
            <rect x={120} y={1100} width={300 * barsK} height={44} fill={C.b} opacity={0.7} />
            <rect x={420} y={1100} width={300 * barsK} height={44} fill={C.b} opacity={0.5} />
            <rect x={120} y={1180} width={300 * 2.0736 * barsK} height={44} fill={C.b} />
          </g>
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {[0, 1].map((i) => (
            <circle key={i} cx={200 + i * 230} cy={800} r={12.5 * 7} fill="none" stroke={C.a} strokeWidth={8} />
          ))}
          <circle cx={830} cy={800} r={18 * 7} fill="none" stroke={C.a} strokeWidth={8} />
          <rect x={120} y={1020} width={157.1 * 5.4 * crustBar} height={50} fill={C.a} rx={6} />
          <rect x={120} y={1150} width={113.1 * 5.4 * crustBar} height={50} fill={C.a} rx={6} opacity={0.6} />
        </g>

        {/* シーン5 */}
        <g opacity={s5}>
          {[1, 2, 3].map((k, i) => (
            <g key={k} opacity={sim(i)}>
              <rect x={120 + [0, 170, 450][i]} y={1150 - k * 110} width={k * 110} height={k * 110} fill={C.b} opacity={0.75} stroke="#fff" strokeWidth={2} />
              {Array.from({ length: k - 1 }, (_, j) => (
                <g key={j}>
                  <line
                    x1={120 + [0, 170, 450][i] + (j + 1) * 110}
                    x2={120 + [0, 170, 450][i] + (j + 1) * 110}
                    y1={1150 - k * 110}
                    y2={1150}
                    stroke="#000"
                    strokeOpacity={0.5}
                    strokeWidth={3}
                  />
                  <line
                    x1={120 + [0, 170, 450][i]}
                    x2={120 + [0, 170, 450][i] + k * 110}
                    y1={1150 - (j + 1) * 110}
                    y2={1150 - (j + 1) * 110}
                    stroke="#000"
                    strokeOpacity={0.5}
                    strokeWidth={3}
                  />
                </g>
              ))}
            </g>
          ))}
        </g>

        {/* シーン6 */}
        <g opacity={s6}>
          <Pizza x={330} y={930} d={36} s={S * 0.95} />
          {[0, 1, 2].map((i) => (
            <Pizza key={i} x={790} y={770 + i * 170} d={20} s={S * 0.95} opacity={smallK(i)} />
          ))}
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={250} y={650} text="25cm × 2枚" size={52} opacity={s1 * appear(0)} />
      <Label x={BIG.x} y={720} text="36cm × 1枚" size={52} opacity={s1 * appear(2)} />
      <Label x={BIG.x} y={1180} text="こっちが多い" size={56} color={C.a} opacity={s1 * win} scale={beat1} />
      <Label x={250} y={1240} text="合計 50cm" size={52} color={C.a} opacity={s1 * diamK} />
      <Label x={BIG.x} y={1180} text={<>36cm ＝ 25cm の<span style={{ color: C.a }}>約1.4倍</span></>} size={48} opacity={s1 * ratioK} />

      <Label x={220} y={1050 - 280} text="25cm" size={50} opacity={s3 * (1 - barsK)} />
      <Label x={460 + 144} y={1050 - 330} text="36cm" size={50} opacity={s3 * (1 - barsK)} />
      <Label x={560} y={1050} text="縦 1.4 × 横 1.4" size={48} color={C.a} opacity={s3 * sq * (1 - barsK)} />
      <Label x={850} y={900} text="約2倍" size={64} color={C.b} opacity={s3 * ramp(sq, 0.9, 0.1)} />
      <Label x={120} y={1070} text="25cm 2枚 ＝ 2" align="left" size={48} opacity={s3 * barsK} />
      <Label x={940} y={1250} text="36cm 1枚 ＝ 2.07" align="right" size={52} color={C.b} opacity={s3 * barsK} scale={beat5} />

      <Label x={315} y={660} text="25cm × 2枚" size={50} opacity={s4} />
      <Label x={830} y={640} text="36cm" size={50} opacity={s4} />
      <Label x={120} y={990} text="耳の長さ 約157cm" align="left" size={50} color={C.a} opacity={s4 * crustBar} />
      <Label x={120} y={1120} text="耳の長さ 約113cm" align="left" size={50} color={C.a} opacity={s4 * crustBar * 0.75} />
      <Label x={960} y={1175} text="約1.4倍" align="right" size={56} opacity={s4 * crustWin} />

      {[1, 2, 3].map((k, i) => (
        <React.Fragment key={k}>
          <Label x={120 + [0, 170, 450][i] + (k * 110) / 2} y={1200} text={`長さ ×${k}`} size={48} color={C.a} opacity={s5 * sim(i)} />
          <Label x={120 + [0, 170, 450][i] + (k * 110) / 2} y={1150 - k * 110 - 40} text={`面積 ×${k * k}`} size={48} color={C.b} opacity={s5 * sim(i)} />
        </React.Fragment>
      ))}

      <Label x={330} y={1180} text="36cm" size={52} opacity={s6} />
      <Label x={940} y={1250} text="20cm" align="right" size={48} opacity={s6 * smallK(0)} />
      <Label x={540} y={640} text="36cm ＝ 20cm の約3.2枚分" size={52} color={C.b} opacity={s6 * smallK(2)} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(2))}>ピザ2枚と1枚</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(0, 0.4), at(1), at(2))}>多いのはどっち？</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(2), at(3), at(4))}>直径の合計は50cm</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.a} life={L(at(3), undefined, at(4))}>でも直径は1.4倍</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.b} life={L(at(4), undefined, at(6))}>面積は縦にも横にも</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(6), undefined, at(8))}>耳の長さは？</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(8), undefined, at(9))}>同じ形の図形</Line>
      <Line t={t} y={200} size={80} life={L(at(9), undefined, at(10))}>面積比は相似比の2乗</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(10))}>36cmと20cmなら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.4), undefined, at(1))}>
        食べられる量は？
      </Line>
      <Line t={t} y={BOT[0]} size={80} color={C.a} life={L(at(1, 0.1), undefined, at(2))}>
        36cm 1枚
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(2, 0.3), at(3), at(4))}>
        25 + 25 ＝ 50cm
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.a} life={L(at(3, 0.2), undefined, at(4))}>
        <Tex src="36 \div 25 \approx 1.4" />
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.b} life={L(at(4, 0.3), at(5), at(6))}>
        <Tex src="1.4 \times 1.4 \approx 2" />
      </Line>
      <Line t={t} y={BOT[1]} size={64} color={C.b} life={L(at(5, 0.2), undefined, at(6))}>
        正確には 2.07倍 ＞ 2枚
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(6, 0.2), undefined, at(8))}>
        耳（長さ）
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={60} color={C.a} life={L(at(6, 0.3), undefined, at(8))}>
        ×1.4 だけ
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(6, 0.2), undefined, at(8))}>
        量（面積）
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={60} color={C.b} life={L(at(6, 0.3), undefined, at(8))}>
        ×2.07
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(8, 0.3), undefined, at(10))}>
        <span style={{ color: C.a }}>長さ ×2</span> → <span style={{ color: C.b }}>面積 ×4</span>
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(10, 0.3), at(11), undefined)}>
        <Tex src="1.8 \times 1.8 \approx 3.2" />
      </Line>
      <Line t={t} y={BOT[1]} size={64} color={C.b} life={L(at(11, 0.2))}>
        比べるなら 面積で
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
