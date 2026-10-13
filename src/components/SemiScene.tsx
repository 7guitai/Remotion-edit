import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../theme";

// 半導体のしくみの図解（たて動画の映像エリア 1080×1000。字幕にかからないよう y≈620 まで）
// phone：スマホの中のチップを拡大 → スイッチがびっしり
// between：金属・ゴム・シリコンの電気の通りやすさ
// lattice：シリコンの原子と、手をつないで動けない電子
// ntype：リンを混ぜると、余った電子が動く
// ptype：ホウ素を混ぜると、電子の「空席」ができ、席をつめるように電気が流れる
// switchoff / switchon：トランジスタ（電圧をかけると電子の通り道ができる）
// bits：流れる＝1、止まる＝0
export type SemiMode = "phone" | "between" | "lattice" | "ntype" | "ptype" | "switchoff" | "switchon" | "bits";

const C = {
  si: "#7d8fb3",
  siDark: "#4b5b80",
  e: "#ffd23a",
  p: "#ff7a3d",
  b: "#3dd6a6",
  ink: "#fff",
  sub: "#9fb3d8",
  line: "rgba(255,255,255,0.25)",
};

const Label: React.FC<{ x: number; y: number; size?: number; color?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({
  x,
  y,
  size = 40,
  color = C.ink,
  anchor = "middle",
  children,
}) => (
  <text x={x} y={y} fontFamily={fontFamily} fontWeight={900} fontSize={size} textAnchor={anchor} fill={color} stroke="#0b1020" strokeWidth={size * 0.18} paintOrder="stroke">
    {children}
  </text>
);

// 原子（まわりに4本の手）
const Atom: React.FC<{ x: number; y: number; r?: number; color?: string; label: string; glow?: number }> = ({ x, y, r = 46, color = C.si, label, glow = 0 }) => (
  <g>
    {glow > 0 ? <circle cx={x} cy={y} r={r + 16} fill={color} opacity={0.25 * glow} /> : null}
    <circle cx={x} cy={y} r={r} fill={color} stroke="#0b1020" strokeWidth={4} />
    <text x={x} y={y + r * 0.32} fontFamily={fontFamily} fontWeight={900} fontSize={r * 0.85} textAnchor="middle" fill="#0b1020">
      {label}
    </text>
  </g>
);

const Electron: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 11 }) => (
  <g>
    <circle cx={x} cy={y} r={r + 6} fill={C.e} opacity={0.3} />
    <circle cx={x} cy={y} r={r} fill={C.e} stroke="#7a5a00" strokeWidth={2} />
  </g>
);

// 5×3 の結晶。special の位置だけ別の原子
const GRID = { cols: 5, rows: 3, x0: 180, y0: 185, dx: 180, dy: 145 };
const Lattice: React.FC<{ t: number; special?: { label: string; color: string }; dim?: boolean }> = ({ t, special, dim }) => {
  const atoms: { x: number; y: number; c: number; r: number }[] = [];
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      atoms.push({ x: GRID.x0 + c * GRID.dx, y: GRID.y0 + r * GRID.dy, c, r });
    }
  }
  const isSpecial = (a: { c: number; r: number }) => special && a.c === 2 && a.r === 1;
  return (
    <g opacity={dim ? 0.55 : 1}>
      {/* 手（結合）と、手をつなぐ電子2個 */}
      {atoms.map((a, i) => (
        <g key={`b${i}`}>
          {a.c < GRID.cols - 1 ? (
            <g>
              <line x1={a.x} y1={a.y} x2={a.x + GRID.dx} y2={a.y} stroke={C.line} strokeWidth={8} />
              {[-1, 1].map((s) =>
                special?.label === "B" && isSpecial(a) && s === 1 ? null : (
                  <Electron key={s} x={a.x + GRID.dx / 2 + Math.sin(t * 6 + i + s) * 3} y={a.y + s * 13} r={9} />
                ),
              )}
            </g>
          ) : null}
          {a.r < GRID.rows - 1 ? (
            <g>
              <line x1={a.x} y1={a.y} x2={a.x} y2={a.y + GRID.dy} stroke={C.line} strokeWidth={8} />
              {[-1, 1].map((s) => (
                <Electron key={s} x={a.x + s * 13} y={a.y + GRID.dy / 2 + Math.cos(t * 6 + i + s) * 3} r={9} />
              ))}
            </g>
          ) : null}
        </g>
      ))}
      {atoms.map((a, i) =>
        isSpecial(a) ? (
          <Atom key={i} x={a.x} y={a.y} color={special!.color} label={special!.label} glow={1} />
        ) : (
          <Atom key={i} x={a.x} y={a.y} label="Si" />
        ),
      )}
    </g>
  );
};

export const SemiScene: React.FC<{ mode: SemiMode; width: number; height: number }> = ({ mode, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  let body: React.ReactNode;

  if (mode === "phone") {
    // スマホ → チップ → びっしり並んだスイッチ
    const z = interpolate(t, [0.6, 2.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ez = z * z * (3 - 2 * z);
    const count = Math.round(interpolate(t, [2.4, 4.2], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    body = (
      <>
        <g opacity={1 - ez}>
          <rect x={380} y={110} width={320} height={500} rx={46} fill="#1b2236" stroke="#9fb3d8" strokeWidth={8} />
          <rect x={400} y={150} width={280} height={420} rx={18} fill="#2b3a5c" />
          <rect x={490} y={300} width={100} height={100} rx={8} fill="#4b5b80" stroke="#ffd23a" strokeWidth={4} />
          <Label x={540} y={360} size={30} color="#ffd23a">
            チップ
          </Label>
        </g>
        <g opacity={ez}>
          {Array.from({ length: 9 * 6 }, (_, i) => {
            const cx = 150 + (i % 9) * 98;
            const cy = 120 + Math.floor(i / 9) * 82;
            const on = random(`sw${i}-${Math.floor(t * 4)}`) > 0.5;
            return (
              <g key={i}>
                <rect x={cx - 38} y={cy - 28} width={76} height={56} rx={10} fill={on ? "#ffd23a" : "#2b3a5c"} stroke="#9fb3d8" strokeWidth={3} />
              </g>
            );
          })}
        </g>
        {t > 2.4 ? (
          <Label x={540} y={600} size={64} color="#ffd23a">{`スイッチ 約${count}億個`}</Label>
        ) : null}
      </>
    );
  } else if (mode === "between") {
    const cols = [
      { x: 200, name: "金属", sub: "よく通す", color: "#ffb02e", move: 1 },
      { x: 540, name: "シリコン", sub: "条件しだい", color: C.si, move: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2)) },
      { x: 880, name: "ゴム", sub: "通さない", color: "#d06a8a", move: 0 },
    ];
    body = (
      <>
        {cols.map((c) => (
          <g key={c.name}>
            <rect x={c.x - 140} y={140} width={280} height={330} rx={26} fill="rgba(255,255,255,0.06)" stroke={c.color} strokeWidth={5} />
            {Array.from({ length: 10 }, (_, i) => {
              const y = 190 + (i % 5) * 58;
              const base = c.x - 110 + (i < 5 ? 0 : 110) + random(`bx${c.name}${i}`) * 60;
              const x = c.x - 120 + ((base - (c.x - 120) + t * 160 * c.move) % 240);
              return <Electron key={i} x={x} y={y} r={10} />;
            })}
            <Label x={c.x} y={110} size={48} color={c.color}>
              {c.name}
            </Label>
            <Label x={c.x} y={530} size={38}>
              {c.sub}
            </Label>
          </g>
        ))}
        <Label x={540} y={610} size={36} color={C.sub}>
          ●＝電子（動けると、電気が流れる）
        </Label>
      </>
    );
  } else if (mode === "lattice") {
    body = (
      <>
        <Label x={540} y={100} size={48} color={C.sub}>
          シリコンの結晶
        </Label>
        <Lattice t={t} />
        <Label x={540} y={600} size={40} color={C.e}>
          電子は となりと手をつないで、動けない
        </Label>
      </>
    );
  } else if (mode === "ntype") {
    // リンの余った電子が、右へ流れていく
    const free = Array.from({ length: 3 }, (_, k) => {
      const s = ((t * 0.55 + k / 3) % 1);
      return { x: 120 + s * 840, y: 285 + Math.sin(t * 5 + k * 2) * 18 };
    });
    body = (
      <>
        <Label x={540} y={100} size={46} color={C.p}>
          リン（電子が1個多い）を混ぜる
        </Label>
        <Lattice t={t} special={{ label: "P", color: C.p }} />
        {free.map((e, i) => (
          <g key={i}>
            <circle cx={e.x} cy={e.y} r={24} fill="none" stroke={C.p} strokeWidth={3} strokeDasharray="6 6" />
            <Electron x={e.x} y={e.y} r={13} />
          </g>
        ))}
        <path d="M 760 600 L 980 600" stroke={C.e} strokeWidth={10} markerEnd="url(#arrow)" />
        <Label x={420} y={610} size={40} color={C.e}>
          余った電子が動く → 電気が流れる
        </Label>
      </>
    );
  } else if (mode === "ptype") {
    // 空席（ホール）が左へ移っていく：電子は右へ1席ずつつめる
    const step = Math.floor(t * 1.4) % 4;
    const holeX = GRID.x0 + 2 * GRID.dx + GRID.dx / 2 - step * GRID.dx;
    body = (
      <>
        <Label x={540} y={100} size={46} color={C.b}>
          ホウ素（電子が1個少ない）を混ぜる
        </Label>
        <Lattice t={t} special={{ label: "B", color: C.b }} />
        {/* 空席（電子の抜けた穴） */}
        <circle cx={Math.max(GRID.x0 + GRID.dx / 2, holeX)} cy={GRID.y0 + GRID.dy + 13} r={16} fill="#0b1020" stroke={C.b} strokeWidth={5} />
        <Label x={Math.max(GRID.x0 + GRID.dx / 2, holeX)} y={GRID.y0 + GRID.dy + 80} size={32} color={C.b}>
          空席
        </Label>
        <Label x={540} y={610} size={38} color={C.e}>
          席をつめるように電子が動く → 電気が流れる
        </Label>
      </>
    );
  } else if (mode === "switchoff" || mode === "switchon") {
    const on = mode === "switchon" ? interpolate(t, [0.6, 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    body = (
      <>
        {/* 土台（p型） */}
        <rect x={120} y={300} width={840} height={260} rx={20} fill="rgba(61,214,166,0.18)" stroke={C.b} strokeWidth={4} />
        <Label x={540} y={530} size={34} color={C.b}>
          ホウ素を混ぜたシリコン
        </Label>
        {/* 入口・出口（n型） */}
        {[200, 880].map((x, i) => (
          <g key={x}>
            <rect x={x - 90} y={300} width={180} height={120} rx={16} fill="rgba(255,122,61,0.3)" stroke={C.p} strokeWidth={4} />
            <Label x={x} y={280} size={34} color={C.p}>
              {i === 0 ? "入口" : "出口"}
            </Label>
          </g>
        ))}
        {/* ゲート（上の端子） */}
        <rect x={340} y={250} width={400} height={30} rx={6} fill="#c9ccd2" />
        <rect x={360} y={170} width={360} height={80} rx={12} fill={on > 0.5 ? "#ffd23a" : "#4b5b80"} stroke="#fff" strokeWidth={4} />
        <Label x={540} y={225} size={40} color={on > 0.5 ? "#3a2a00" : "#fff"}>
          {on > 0.5 ? "電圧 ON" : "電圧 OFF"}
        </Label>
        {/* 電子の通り道 */}
        <rect x={290} y={300} width={500} height={34} fill={C.e} opacity={0.35 * on} />
        {on > 0
          ? Array.from({ length: 7 }, (_, i) => {
              const s = (t * 0.6 + i / 7) % 1;
              return <Electron key={i} x={180 + s * 720} y={317} r={11} />;
            })
          : [180, 220, 860, 900].map((x) => <Electron key={x} x={x} y={360} r={11} />)}
        <Label x={540} y={120} size={56} color={on > 0.5 ? C.e : "#9fb3d8"}>
          {on > 0.5 ? "電気が流れる！" : "電気は流れない"}
        </Label>
        <Label x={540} y={610} size={38} color={C.sub}>
          トランジスタ ＝ 電気で動く スイッチ
        </Label>
      </>
    );
  } else {
    // bits：スイッチの列が 0 と 1 を表す
    const pattern = "1011001011100101";
    const shift = Math.floor(t * 3);
    body = (
      <>
        {Array.from({ length: 8 }, (_, i) => {
          const bit = pattern[(i + shift) % pattern.length] === "1";
          const x = 150 + i * 112;
          return (
            <g key={i}>
              <rect x={x - 44} y={190} width={88} height={130} rx={14} fill={bit ? "#ffd23a" : "#2b3a5c"} stroke="#9fb3d8" strokeWidth={4} />
              <Label x={x} y={420} size={78} color={bit ? C.e : "#9fb3d8"}>
                {bit ? "1" : "0"}
              </Label>
            </g>
          );
        })}
        <Label x={540} y={130} size={44} color={C.sub}>
          流れる＝1　止まる＝0
        </Label>
        <Label x={540} y={560} size={42}>
          写真も 音楽も LINEも、ぜんぶ 0と1
        </Label>
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #1d3a66 0%, #0b1020 75%)" }}>
      <svg width={width} height={height} viewBox="0 0 1080 1000" preserveAspectRatio="xMidYMin slice" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={C.e} />
          </marker>
        </defs>
        {body}
      </svg>
      {p < 0 ? null : null}
    </AbsoluteFill>
  );
};
