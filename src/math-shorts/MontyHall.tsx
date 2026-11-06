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
import { C, H, Line, Life, lerp, ramp, sceneOpacity, serif, Tex, W } from "./kit";
import { MathShortProps } from "./timeline";

// モンティ・ホール問題
// 要素A（ゴールド）: 最初に選んだドア … 1/3 のまま（100枚なら 1%）
// 要素B（シアン）  : 残りのドア … 2/3 が開かなかった1枚に集まる（100枚なら 99%）

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

// ドア（左上 x, y、幅 w）。open（0〜1）で開いて「外れ」が見える
const Door: React.FC<{ x: number; y: number; w: number; open?: number; ring?: string; ringK?: number; num?: string }> = ({
  x,
  y,
  w,
  open = 0,
  ring = C.a,
  ringK = 0,
  num,
}) => {
  const h = w * 1.6;
  return (
    <g>
      {/* 中（外れ） */}
      <rect x={x} y={y} width={w} height={h} fill="#1a1a1a" />
      <g opacity={open} stroke="#777" strokeWidth={w * 0.06} strokeLinecap="round">
        <line x1={x + w * 0.3} y1={y + h * 0.35} x2={x + w * 0.7} y2={y + h * 0.6} />
        <line x1={x + w * 0.7} y1={y + h * 0.35} x2={x + w * 0.3} y2={y + h * 0.6} />
      </g>
      {/* 扉（開くと横に縮む） */}
      <rect x={x} y={y} width={w * (1 - 0.85 * open)} height={h} fill="#7a4a2c" stroke="#a87250" strokeWidth={3} />
      <circle cx={x + w * (1 - 0.85 * open) * 0.82} cy={y + h * 0.55} r={w * 0.05} fill="#e8c27a" opacity={1 - open} />
      {num ? (
        <text x={x + w / 2} y={y + h * 0.25} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={w * 0.3} fill="#f3e2c8" opacity={1 - open}>
          {num}
        </text>
      ) : null}
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={8} fill="none" stroke={ring} strokeWidth={7} opacity={ringK} />
    </g>
  );
};

export const MontyHall: React.FC<MathShortProps> = ({ narration, starts, durs, voices, subtitles, bgm }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const at = (p: number, f = 0) => starts[p] + f * durs[p];
  const pauseOf = (p: number) => (p + 1 < starts.length ? starts[p + 1] - (starts[p] + durs[p]) : 0);

  const TOP = [170, 290, 410];
  const BOT = [1350, 1480, 1610];
  const L = (on: number, dim?: number, off?: number): Life => ({ on, dim, off });

  const DW = 230;
  const DX = [70, 425, 780];
  const DY = 720;

  // シーン1: ドア3枚（0〜2）
  const s1 = sceneOpacity(t, at(0), at(3));
  const pick1 = ramp(t, at(0, 0.3), 0.3);
  const open1 = ramp(t, at(0, 0.7), 0.4);
  const switch1 = ramp(t, at(1, 0.1), 0.4);
  const win1 = ramp(t, at(2, 0.1), 0.3);
  const beat2 = beat(t, at(2) + durs[2], pauseOf(2));

  // シーン2: 確率の分け方（3〜6）
  const s2 = sceneOpacity(t, at(3), at(7));
  const p13 = ramp(t, at(3, 0.2), 0.3);
  const p23 = ramp(t, at(4, 0.2), 0.3);
  const open2 = ramp(t, at(5, 0.3), 0.4);
  const move = ramp(t, at(6, 0.3), 0.6);
  const beat6 = beat(t, at(6) + durs[6], pauseOf(6));

  // シーン3: ドア100枚（7〜8）
  const s3 = sceneOpacity(t, at(7), at(9));
  const LEFT = 57; // 開かずに残る1枚
  const openK = (i: number) => ramp(t, at(8, 0.05) + ((i * 37) % 98) * 0.025, 0.2);
  const beat8 = beat(t, at(8) + durs[8], pauseOf(8));

  // シーン4: 定理名（9）／ 締め（10〜）
  const s4 = sceneOpacity(t, at(9), end + 1);
  const sw4 = ramp(t, at(10, 0.2), 0.5);

  const gpos = (i: number) => ({ x: 132 + (i % 10) * 87, y: 590 + Math.floor(i / 10) * 66 });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* シーン1 */}
        <g opacity={s1}>
          {DX.map((x, i) => (
            <Door
              key={i}
              x={x}
              y={DY}
              w={DW}
              num={`${i + 1}`}
              open={i === 2 ? open1 : 0}
              ring={i === 1 ? C.b : C.a}
              ringK={i === 0 ? pick1 * (1 - win1 * 0.6) : i === 1 ? win1 : 0}
            />
          ))}
          {/* 乗りかえの矢印 */}
          <path
            d={`M ${DX[0] + DW / 2} ${DY - 30} Q ${(DX[0] + DX[1] + DW) / 2} ${DY - 140} ${DX[1] + DW / 2} ${DY - 30}`}
            fill="none"
            stroke={C.b}
            strokeWidth={6}
            strokeDasharray="14 10"
            opacity={switch1}
          />
          <polygon points={`${DX[1] + DW / 2 - 16},${DY - 52} ${DX[1] + DW / 2 + 10},${DY - 50} ${DX[1] + DW / 2},${DY - 24}`} fill={C.b} opacity={switch1} />
        </g>

        {/* シーン2 */}
        <g opacity={s2}>
          {DX.map((x, i) => (
            <Door key={i} x={x} y={DY} w={DW} num={`${i + 1}`} open={i === 2 ? open2 : 0} ring={i === 0 ? C.a : C.b} ringK={i === 0 ? p13 : i === 1 ? move : 0} />
          ))}
          {/* 残り2枚のかっこ（開いたあと右端が縮む） */}
          <polyline
            points={`${DX[1] - 10},${DY + DW * 1.6 + 30} ${DX[1] - 10},${DY + DW * 1.6 + 55} ${lerp(DX[2] + DW + 10, DX[1] + DW + 10, move)},${DY + DW * 1.6 + 55} ${lerp(DX[2] + DW + 10, DX[1] + DW + 10, move)},${DY + DW * 1.6 + 30}`}
            fill="none"
            stroke={C.b}
            strokeWidth={6}
            opacity={p23}
          />
        </g>

        {/* シーン3 */}
        <g opacity={s3}>
          {Array.from({ length: 100 }, (_, i) => {
            const p = gpos(i);
            const k = i === 0 || i === LEFT ? 0 : openK(i);
            return (
              <g key={i} opacity={lerp(1, 0.25, k)}>
                <Door x={p.x} y={p.y} w={36} open={k} ring={i === 0 ? C.a : C.b} ringK={i === 0 ? 1 : i === LEFT ? ramp(t, at(8, 0.6), 0.3) : 0} />
              </g>
            );
          })}
        </g>

        {/* シーン4 */}
        <g opacity={s4}>
          {DX.map((x, i) => (
            <Door key={i} x={x} y={DY} w={DW} num={`${i + 1}`} open={i === 2 ? 1 : 0} ring={i === 0 ? C.a : C.b} ringK={i === 0 ? 1 - sw4 : i === 1 ? sw4 : 0} />
          ))}
          <path
            d={`M ${DX[0] + DW / 2} ${DY - 30} Q ${(DX[0] + DX[1] + DW) / 2} ${DY - 140} ${DX[1] + DW / 2} ${DY - 30}`}
            fill="none"
            stroke={C.b}
            strokeWidth={6}
            opacity={sw4}
          />
        </g>
      </svg>

      {/* ── 中央ゾーンのラベル（48px 以上、y≤1300） ── */}
      <Label x={DX[0] + DW / 2} y={DY + DW * 1.6 + 60} text="あなた" size={52} color={C.a} opacity={s1 * pick1} />
      <Label x={DX[2] + DW / 2} y={DY + DW * 1.6 + 60} text="外れ" size={52} color="#aaa" opacity={s1 * open1} />
      <Label x={DX[1] + DW / 2} y={DY - 150} text="変える？" size={52} color={C.b} opacity={s1 * switch1 * (1 - win1)} />
      <Label x={DX[1] + DW / 2} y={DY + DW * 1.6 + 60} text="当たり2倍" size={56} color={C.b} opacity={s1 * win1} scale={beat2} />

      <Label x={DX[0] + DW / 2} y={DY - 95} text={<Tex src="\tfrac{1}{3}" />} size={80} color={C.a} opacity={s2 * p13} />
      <Label x={lerp((DX[1] + DX[2] + DW) / 2, DX[1] + DW / 2, move)} y={DY + DW * 1.6 + 110} text={<Tex src="\tfrac{2}{3}" />} size={80} color={C.b} opacity={s2 * p23} scale={beat6} />
      <Label x={DX[2] + DW / 2} y={DY - 60} text="必ず外れ" size={48} color="#aaa" opacity={s2 * open2} />


      <Label x={gpos(0).x + 18} y={gpos(0).y - 45} text="1%" size={52} color={C.a} opacity={s3} />
      <Label x={gpos(LEFT).x + 50} y={gpos(LEFT).y + 30} text="99%" align="left" size={64} color={C.b} opacity={s3 * ramp(t, at(8, 0.6), 0.3)} scale={beat8} />
      <Label x={DX[1] + DW / 2} y={DY - 160} text="乗りかえる" size={56} color={C.b} opacity={s4 * sw4} />

      {/* ── 上部ゾーン（見出し） ── */}
      <Line t={t} y={TOP[0]} size={72} life={L(at(0), at(1), at(3))}>当たりは1つ</Line>
      <Line t={t} y={TOP[1]} size={72} life={L(at(1), at(2), at(3))}>選び直すべき？</Line>

      <Line t={t} y={TOP[0]} size={72} color={C.a} life={L(at(3), at(4), at(7))}>最初のドア</Line>
      <Line t={t} y={TOP[1]} size={72} color={C.b} life={L(at(4), at(5), at(7))}>残りの2枚</Line>
      <Line t={t} y={TOP[2]} size={64} life={L(at(5), undefined, at(7))}>司会者は知っている</Line>

      <Line t={t} y={TOP[0]} size={72} life={L(at(7), undefined, at(9))}>ドアが100枚なら</Line>

      <Line t={t} y={200} size={86} life={L(at(9), at(10))}>モンティ・ホール問題</Line>
      <Line t={t} y={360} size={72} life={L(at(10, 0.1))}>外れを見せられたら</Line>

      {/* ── 下部ゾーン ── */}
      <Line t={t} y={BOT[0]} size={60} life={L(at(0, 0.7), undefined, at(2))}>
        1つ選ぶ → 司会者が外れを開ける
      </Line>
      <Line t={t} y={BOT[1]} size={64} life={L(at(1, 0.1), undefined, at(2))}>
        変える？ 変えない？
      </Line>
      <Line t={t} y={BOT[0]} size={72} color={C.b} life={L(at(2, 0.1), undefined, at(3))}>
        変えるべき
      </Line>

      <Line t={t} y={BOT[0]} size={60} color={C.a} life={L(at(3, 0.3), at(4), at(7))}>
        最初のドア → 1/3 のまま
      </Line>
      <Line t={t} y={BOT[1]} size={60} color={C.b} life={L(at(4, 0.3), at(6), at(7))}>
        残りの2枚 → 合わせて 2/3
      </Line>
      <Line t={t} y={BOT[2]} size={60} color={C.b} life={L(at(6, 0.3), undefined, at(7))}>
        2/3 が 開かなかった1枚に
      </Line>

      <Line t={t} x={0} width={W / 2} y={BOT[0]} size={52} color={C.a} life={L(at(7, 0.5), undefined, at(9))}>
        変えない
      </Line>
      <Line t={t} x={0} width={W / 2} y={BOT[1]} size={64} color={C.a} life={L(at(7, 0.55), undefined, at(9))}>
        1%
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[0]} size={52} color={C.b} life={L(at(8, 0.6), undefined, at(9))}>
        変える
      </Line>
      <Line t={t} x={W / 2} width={W / 2} y={BOT[1]} size={64} color={C.b} life={L(at(8, 0.65), undefined, at(9))} >
        99%
      </Line>

      <Line t={t} y={BOT[0]} size={60} life={L(at(10, 0.3))}>
        <span style={{ color: C.a }}>1/3</span> → <span style={{ color: C.b }}>2/3</span>
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
