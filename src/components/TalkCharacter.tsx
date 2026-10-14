import React from "react";

// 掛け合い解説（talk スタイル）のオリジナルキャラクター。大きな丸い顔だけの、ゆるいデザイン
// sora：解説役。紺色のショートヘア、丸メガネ、星のヘアピン
// komugi：聞き役。小麦色の髪、両サイドの小さな結び髪に緑のリボン
export type TalkWho = "sora" | "komugi";
export type TalkFace = "normal" | "smile" | "surprise" | "think" | "happy";

const SKIN = "#ffe8d6";
const LINE = "#5a3a2a";

const HAIR: Record<TalkWho, { main: string; dark: string }> = {
  sora: { main: "#33528a", dark: "#22396a" },
  komugi: { main: "#e8a23a", dark: "#c27f1f" },
};

export const TalkCharacter: React.FC<{
  who: TalkWho;
  face: TalkFace;
  talking: boolean;
  frame: number;
  size?: number;
  dim?: boolean;
}> = ({ who, face, talking, frame, size = 240, dim }) => {
  const h = HAIR[who];
  // まばたき（約3.3秒ごと、キャラでずらす）
  const blink = (frame + (who === "sora" ? 0 : 47)) % 100 < 4;
  // 口パク（話しているあいだ 4フレームごとに開け閉め）
  const open = talking && Math.floor(frame / 4) % 2 === 0;
  // 話している方は小さくはねる
  const bounce = talking ? Math.abs(Math.sin(frame / 5)) * 8 : 0;

  const eye = (cx: number) => {
    if (face === "smile" || face === "happy") {
      return <path d={`M${cx - 16} ${178} Q${cx} ${158} ${cx + 16} ${178}`} fill="none" stroke={LINE} strokeWidth={7} strokeLinecap="round" />;
    }
    const ry = blink ? 2 : face === "surprise" ? 25 : face === "think" ? 12 : 20;
    const rx = face === "surprise" ? 17 : 14;
    return (
      <g>
        <ellipse cx={cx} cy={178} rx={rx} ry={ry} fill="#2b2230" />
        {!blink ? <ellipse cx={cx + 5} cy={170} rx={5} ry={Math.min(7, ry * 0.4)} fill="#fff" /> : null}
      </g>
    );
  };

  const mouth = () => {
    if (face === "surprise") {
      return <ellipse cx={150} cy={235} rx={14} ry={open ? 18 : 13} fill="#c23b3b" stroke={LINE} strokeWidth={4} />;
    }
    if (open || face === "happy") {
      return <path d="M128 226 Q150 262 172 226 Z" fill="#c23b3b" stroke={LINE} strokeWidth={4} strokeLinejoin="round" />;
    }
    if (face === "think") {
      return <path d="M136 236 Q150 228 164 238" fill="none" stroke={LINE} strokeWidth={5} strokeLinecap="round" />;
    }
    return <path d="M132 230 Q150 244 168 230" fill="none" stroke={LINE} strokeWidth={5} strokeLinecap="round" />;
  };

  return (
    <svg width={size} height={size} viewBox="0 0 300 300" style={{ transform: `translateY(${-bounce}px)`, opacity: dim ? 0.85 : 1, overflow: "visible" }}>
      {/* うしろ髪・結び髪 */}
      {who === "komugi" ? (
        <g>
          <ellipse cx={30} cy={200} rx={30} ry={46} fill={h.main} stroke={LINE} strokeWidth={4} />
          <ellipse cx={270} cy={200} rx={30} ry={46} fill={h.main} stroke={LINE} strokeWidth={4} />
          <path d="M18 150 L44 160 L18 172 Z" fill="#4caf6e" stroke={LINE} strokeWidth={3} />
          <path d="M282 150 L256 160 L282 172 Z" fill="#4caf6e" stroke={LINE} strokeWidth={3} />
        </g>
      ) : null}
      <path d="M36 190 Q30 46 150 40 Q270 46 264 190 Z" fill={h.dark} stroke={LINE} strokeWidth={4} />
      {/* 顔（まんじゅう形） */}
      <path d="M40 170 Q40 70 150 68 Q260 70 260 170 Q262 272 150 274 Q38 272 40 170 Z" fill={SKIN} stroke={LINE} strokeWidth={4} />
      {/* ほっぺ */}
      <ellipse cx={86} cy={214} rx={20} ry={11} fill="#ffb3b3" opacity={0.75} />
      <ellipse cx={214} cy={214} rx={20} ry={11} fill="#ffb3b3" opacity={0.75} />
      {eye(108)}
      {eye(192)}
      {mouth()}
      {/* 前髪 */}
      <path
        d="M38 150 Q36 50 150 44 Q264 50 262 150 Q248 112 226 104 L212 136 L196 100 L174 132 L152 96 L128 132 L106 100 L88 138 L74 104 Q50 118 38 150 Z"
        fill={h.main}
        stroke={LINE}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {who === "sora" ? (
        <g>
          {/* 丸メガネ */}
          <circle cx={108} cy={178} r={30} fill="rgba(255,255,255,0.15)" stroke="#3a3a4a" strokeWidth={5} />
          <circle cx={192} cy={178} r={30} fill="rgba(255,255,255,0.15)" stroke="#3a3a4a" strokeWidth={5} />
          <path d="M138 176 Q150 168 162 176" fill="none" stroke="#3a3a4a" strokeWidth={5} />
          {/* 星のヘアピン */}
          <path
            d="M232 84 L238 98 L253 99 L241 108 L246 123 L232 114 L218 123 L223 108 L211 99 L226 98 Z"
            fill="#ffd23a"
            stroke={LINE}
            strokeWidth={3}
          />
        </g>
      ) : (
        <path d="M60 96 Q72 70 98 74" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
      )}
      {/* 考え中の汗 */}
      {face === "think" ? <path d="M248 140 Q258 160 248 168 Q238 160 248 140 Z" fill="#7cc7ff" stroke={LINE} strokeWidth={3} /> : null}
      {face === "surprise" ? (
        <g stroke="#ff6f61" strokeWidth={6} strokeLinecap="round">
          <line x1={262} y1={60} x2={278} y2={40} />
          <line x1={276} y1={88} x2={298} y2={80} />
          <line x1={38} y1={60} x2={22} y2={40} />
        </g>
      ) : null}
    </svg>
  );
};
