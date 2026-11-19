import React from "react";
import { Series } from "remotion";
import { Episode } from "../../episodes";
import { ResolvedSlide } from "../../slides";
import { PAPER, sans, serif } from "./theme";

// 上部ヘッダー（Y=100〜235）: 枠なし・左寄せ。ラベル／番号、タイトル、二重罫線
export const PaperHeader: React.FC<{ episode: Episode; slides: ResolvedSlide[] }> = ({
  episode,
  slides,
}) => (
  <Series>
    {slides.map((s, i) => (
      <Series.Sequence key={i} durationInFrames={s.durationInFrames}>
        <HeaderBlock episode={episode} index={i} />
      </Series.Sequence>
    ))}
  </Series>
);

const HeaderBlock: React.FC<{ episode: Episode; index: number }> = ({ episode, index }) => (
  <div style={{ position: "absolute", top: PAPER.headerTop, left: PAPER.left, width: PAPER.width }}>
    <div
      style={{
        fontFamily: sans,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.06em",
        color: PAPER.accent,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {episode.look?.label ?? episode.series ?? "AIモデル検証レポート"}
      <span style={{ color: PAPER.muted, fontWeight: 500 }}>
        {"　／　"}
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
    <div
      style={{
        fontFamily: serif,
        fontWeight: 700,
        fontSize: titleSize(episode.headline ?? episode.title),
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        color: PAPER.ink,
        marginTop: 8,
      }}
    >
      {episode.headline ?? episode.title}
    </div>
    <div style={{ height: 3, background: PAPER.ink, marginTop: 16 }} />
    <div style={{ height: 1, background: PAPER.rule, marginTop: 5 }} />
  </div>
);

// タイトルを1行に収める（欧文は和文の約0.6文字分として幅を見積もる）
const titleSize = (text: string) => {
  const width = [...text].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.6 : 1), 0);
  return Math.min(62, Math.floor(PAPER.width / width));
};
