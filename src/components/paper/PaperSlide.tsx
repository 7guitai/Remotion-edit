import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  EmphasisSlide,
  Episode,
  FlowSlide,
  HookSlide,
  PointsSlide,
  RankingSlide,
  SourceSlide,
  VersusSide,
  VersusSlide,
} from "../../episodes";
import { ResolvedSlide } from "../../slides";
import { PAPER, sans, serif, toneInk } from "./theme";

const num: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

// 紙面風の1枚: 中央に図解、右下に出典、下に字幕（発話に合わせて切り替え）、左下に立ち絵
export const PaperSlide: React.FC<{ resolved: ResolvedSlide; episode: Episode }> = ({
  resolved,
  episode,
}) => {
  const { slide } = resolved;
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: 30, config: { damping: 200 }, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ fontFamily: sans, color: PAPER.ink }}>
      <div
        style={{
          position: "absolute",
          top: PAPER.mainTop,
          left: PAPER.left,
          width: PAPER.width,
          height: PAPER.citeTop - PAPER.mainTop - 20,
          display: "flex",
          flexDirection: "column",
          // 中身が高いときは上に溢れさせず、上から詰める
          justifyContent: "safe center",
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
        }}
      >
        <Visual resolved={resolved} />
      </div>
      {slide.cite ? (
        <div
          style={{
            position: "absolute",
            top: PAPER.citeTop,
            left: PAPER.left,
            width: PAPER.width,
            textAlign: "right",
            fontWeight: 500,
            fontSize: 26,
            color: PAPER.muted,
          }}
        >
          出典：{slide.cite}
        </div>
      ) : null}
      <Caption resolved={resolved} />
      <Sprite episode={episode} resolved={resolved} />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const { slide } = resolved;
  switch (slide.type) {
    case "hook":
      return <Hook slide={slide} />;
    case "versus":
      return <Versus slide={slide} />;
    case "ranking":
      return <Ranking slide={slide} />;
    case "flow":
      return <Steps items={slide.steps.map((s) => ({ label: s.label, body: s.sub, tone: s.tone }))} />;
    case "points":
      return <Steps items={slide.items.map((s) => ({ label: s.label, body: s.body }))} numbered />;
    case "emphasis":
      return <Emphasis slide={slide} />;
    case "source":
      return <Source slide={slide} />;
    default:
      return null;
  }
};

const useStep = (i: number, delay = 8, start = 6) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start - i * delay, fps, config: { damping: 200 } });
};

const Hairline: React.FC<{ margin?: string; color?: string }> = ({ margin = "0", color }) => (
  <div style={{ height: 1, background: color ?? PAPER.rule, margin }} />
);

const Small: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color,
  style,
}) => (
  <div
    style={{
      fontWeight: 500,
      fontSize: 28,
      lineHeight: 1.5,
      color: color ?? PAPER.muted,
      whiteSpace: "pre-line",
      ...style,
    }}
  >
    {children}
  </div>
);

// 【】で囲んだ部分を深緑にする
const Marked: React.FC<{ text: string; color?: string }> = ({ text, color }) => (
  <>
    {text.split(/(【[^】]+】)/).map((part, i) =>
      part.startsWith("【") ? (
        <span key={i} style={{ color: color ?? PAPER.accent }}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

// ---- 字幕 ----

// 1行の幅に入る文字数から、2行に収まる最大の文字サイズを選ぶ
const captionSize = (text: string) => {
  const width = [...text].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0);
  return [52, 48, 44, 40].find((s) => Math.ceil((width * s) / PAPER.width) <= 2) ?? 40;
};

const Caption: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - resolved.voiceStart) / fps;
  const chunks = resolved.captions ?? [{ text: resolved.slide.text.replace(/\n/g, ""), start: 0, end: 999 }];
  // 今話しているまとまり（話す前は最初、話し終わったら最後を出しておく）
  const index = Math.max(
    0,
    chunks.findIndex((c, i) => t < c.end || i === chunks.length - 1),
  );
  const chunk = chunks[index];
  const since = (t - (index === 0 ? -1 : chunk.start)) * fps;
  const fade = interpolate(since, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: PAPER.captionTop,
          left: PAPER.left,
          width: PAPER.width,
          height: 1,
          background: PAPER.rule,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: PAPER.captionTop + 28,
          left: PAPER.left,
          width: PAPER.width,
          height: PAPER.captionBottom - PAPER.captionTop - 28,
          fontWeight: 700,
          fontSize: captionSize(chunk.text),
          lineHeight: 1.45,
          color: PAPER.ink,
          opacity: fade,
          lineBreak: "strict",
        }}
      >
        {chunk.text}
      </div>
    </>
  );
};

// ---- 立ち絵（左下。顔が Y=1720 より下に掛からない高さで切り取る） ----

// 口パク: 話している間（字幕のまとまりの範囲）だけ、口を開けた絵と閉じた絵を交互に出す
const isSpeaking = (resolved: ResolvedSlide, frame: number, fps: number) => {
  if (!resolved.voice) {
    return false;
  }
  const t = (frame - resolved.voiceStart) / fps;
  const chunks = resolved.captions;
  if (!chunks) {
    return t >= 0;
  }
  return chunks.some((c) => t >= c.start && t < c.end - 0.08);
};

const Sprite: React.FC<{ episode: Episode; resolved: ResolvedSlide }> = ({ episode, resolved }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const character = episode.character;
  const expression = resolved.slide.expression ?? "normal";
  const img = character?.images[expression] ?? character?.images.normal;
  if (!character || !img) {
    return null;
  }
  const talking = img.talk && isSpeaking(resolved, frame, fps) && Math.floor(frame / 4) % 2 === 0;
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 170 }, durationInFrames: 16 });
  const height = character.spriteHeight ?? 820;
  return (
    <div
      style={{
        position: "absolute",
        top: PAPER.spriteTop - 24,
        left: 24,
        width: 380,
        height: 1920 - PAPER.spriteTop + 24,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile(talking && img.talk ? img.talk : img.file)}
        style={{
          position: "absolute",
          top: 4,
          left: "50%",
          height,
          transform: `translateX(-50%) translateY(${interpolate(pop, [0, 1], [24, 0])}px)`,
        }}
      />
    </div>
  );
};

// ---- 図解 ----

const Hook: React.FC<{ slide: HookSlide }> = ({ slide }) => {
  const a = useStep(0, 0, 2);
  const b = useStep(1, 10, 2);
  return (
    <div>
      {slide.sub ? <Small color={PAPER.accent} style={{ fontWeight: 700, fontSize: 32 }}>{slide.sub}</Small> : null}
      <div
        style={{
          fontFamily: serif,
          fontWeight: 700,
          fontSize: hookSize(slide.headline),
          lineHeight: 1.28,
          marginTop: 24,
          whiteSpace: "pre-line",
          opacity: a,
          transform: `translateY(${interpolate(a, [0, 1], [16, 0])}px)`,
        }}
      >
        <Marked text={slide.headline} />
      </div>
      <div style={{ height: 3, background: PAPER.ink, width: `${b * 100}%`, marginTop: 48 }} />
    </div>
  );
};

// 大見出しのいちばん長い行が1行に収まる大きさ（欧文は和文の約0.58文字分）
const hookSize = (text: string) => {
  const longest = Math.max(
    ...text
      .replace(/[【】]/g, "")
      .split("\n")
      .map((l) => [...l].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.58 : 1), 0)),
  );
  return Math.min(104, Math.floor(PAPER.width / Math.max(longest, 1)));
};

const Versus: React.FC<{ slide: VersusSlide }> = ({ slide }) => {
  const lead = useStep(0, 0, 2);
  return (
    <div>
      {slide.lead ? (
        <div
          style={{
            borderLeft: `6px solid ${toneInk(slide.leadTone)}`,
            paddingLeft: 26,
            marginBottom: 56,
            opacity: lead,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 50, lineHeight: 1.3, color: toneInk(slide.leadTone) }}>
            {slide.lead}
          </div>
          {slide.leadNote ? <Small style={{ marginTop: 8, fontSize: 30 }}>{slide.leadNote}</Small> : null}
        </div>
      ) : null}
      <div style={{ display: "flex" }}>
        <VersusColumn side={slide.left} index={0} />
        <div style={{ width: 1, background: PAPER.rule, margin: "0 36px" }} />
        <VersusColumn side={slide.right} index={1} />
      </div>
      {slide.note ? (
        <>
          <Hairline margin="44px 0 18px" />
          <Small>{slide.note}</Small>
        </>
      ) : null}
    </div>
  );
};

const VersusColumn: React.FC<{ side: VersusSide; index: number }> = ({ side, index }) => {
  const s = useStep(index, 10);
  const color = toneInk(side.tone);
  return (
    <div style={{ flex: 1, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)` }}>
      <div style={{ fontWeight: 700, fontSize: 36, color: side.tone === "bad" ? color : PAPER.ink }}>
        {side.label}
      </div>
      <Hairline margin="16px 0 22px" color={side.tone === "bad" ? color : PAPER.ink} />
      {side.metrics ? (
        side.metrics.map((m, i) => (
          <div key={m.label} style={{ marginTop: i === 0 ? 0 : 34 }}>
            <Small style={{ fontSize: 28 }}>{m.label}</Small>
            <div style={{ ...num, fontWeight: 700, fontSize: 104, lineHeight: 1.1, color }}>{m.value}</div>
          </div>
        ))
      ) : (
        <>
          {side.value ? (
            <div style={{ ...num, fontWeight: 700, fontSize: 150, lineHeight: 1.1, color }}>{side.value}</div>
          ) : null}
          {side.lines?.map((line) => (
            <div key={line} style={{ fontWeight: 500, fontSize: 32, lineHeight: 1.5, marginTop: 10 }}>
              {line}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

const Ranking: React.FC<{ slide: RankingSlide }> = ({ slide }) => {
  const max = slide.max ?? Math.max(...slide.rows.map((r) => r.value));
  const hi = slide.rows.findIndex((r) => r.highlight);
  const top = hi >= 0 ? slide.rows[hi] : null;
  const head = useStep(0, 0, 2);
  const unit = slide.unit ?? "";
  return (
    <div>
      {slide.title ? <Small style={{ fontSize: 30 }}>{slide.title}</Small> : null}
      {top ? (
        <div style={{ opacity: head }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ ...num, fontWeight: 700, fontSize: 150, lineHeight: 1.05, color: PAPER.accent }}>
              {top.value}
            </span>
            <span style={{ fontWeight: 700, fontSize: 48 }}>
              {unit}（{slide.rankPrefix ?? ""}
              {hi + 1}位）
            </span>
          </div>
          {hi > 0 ? (
            <Small style={{ fontSize: 30 }}>
              {slide.rows
                .slice(0, hi)
                .map((r, i) => `${i + 1}位 ${r.value}${unit}`)
                .join("・")}
              に迫る
            </Small>
          ) : null}
        </div>
      ) : null}
      <Hairline margin="26px 0 4px" color={PAPER.ink} />
      {slide.rows.map((row, i) => (
        <RankRow key={row.label} row={row} rank={i + 1} max={max} unit={unit} index={i} />
      ))}
      {slide.note ? <Small style={{ marginTop: 18, fontSize: 26 }}>{slide.note}</Small> : null}
    </div>
  );
};

const RankRow: React.FC<{
  row: RankingSlide["rows"][number];
  rank: number;
  max: number;
  unit: string;
  index: number;
}> = ({ row, rank, max, unit, index }) => {
  const grow = useStep(index, 7, 10);
  const color = row.highlight ? PAPER.accent : PAPER.ink;
  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${PAPER.rule}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, color }}>
        <span style={{ ...num, fontWeight: 700, fontSize: 30, width: 56 }}>{rank}位</span>
        <span style={{ fontWeight: 700, fontSize: 36 }}>{row.label}</span>
        {row.sub ? <span style={{ fontWeight: 500, fontSize: 24, color: PAPER.muted }}>{row.sub}</span> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10, paddingLeft: 72 }}>
        <div style={{ flex: 1, height: 20 }}>
          <div
            style={{
              height: "100%",
              width: `${(row.value / max) * 100 * grow}%`,
              background: row.highlight ? PAPER.accent : PAPER.bar,
            }}
          />
        </div>
        <span style={{ ...num, fontWeight: 700, fontSize: 34, width: 96, textAlign: "right", color }}>
          {row.value}
          {unit}
        </span>
      </div>
    </div>
  );
};

// 番号付きの縦の並び（流れ図・まとめ）
const Steps: React.FC<{
  items: { label: string; body?: string; tone?: "good" | "bad" | "neutral" }[];
  numbered?: boolean;
}> = ({ items }) => (
  <div>
    <Hairline color={PAPER.ink} />
    {items.map((item, i) => (
      <StepRow key={item.label} item={item} index={i} />
    ))}
  </div>
);

const StepRow: React.FC<{
  item: { label: string; body?: string; tone?: "good" | "bad" | "neutral" };
  index: number;
}> = ({ item, index }) => {
  const s = useStep(index, 12);
  const color = item.tone === "good" ? PAPER.accent : item.tone === "bad" ? PAPER.alert : PAPER.ink;
  return (
    <div
      style={{
        display: "flex",
        gap: 30,
        padding: "34px 0",
        borderBottom: `1px solid ${PAPER.rule}`,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)`,
      }}
    >
      <div style={{ ...num, fontFamily: serif, fontWeight: 700, fontSize: 52, color: PAPER.accent, width: 76 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 44, lineHeight: 1.3, color, whiteSpace: "pre-line" }}>
          {item.label}
        </div>
        {item.body ? <Small style={{ fontSize: 32, marginTop: 8 }}>{item.body}</Small> : null}
      </div>
    </div>
  );
};

const Emphasis: React.FC<{ slide: EmphasisSlide }> = ({ slide }) => (
  <div>
    <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 92, lineHeight: 1.3, whiteSpace: "pre-line" }}>
      <Marked text={slide.big} />
    </div>
    {slide.sub ? (
      <>
        <Hairline margin="40px 0 20px" color={PAPER.ink} />
        <div style={{ fontWeight: 700, fontSize: 40, lineHeight: 1.5, whiteSpace: "pre-line" }}>{slide.sub}</div>
      </>
    ) : null}
  </div>
);

const Source: React.FC<{ slide: SourceSlide }> = ({ slide }) => (
  <div>
    <Small style={{ fontSize: 30 }}>
      {slide.org}　{slide.date}
    </Small>
    <Hairline margin="16px 0 26px" color={PAPER.ink} />
    <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 64, lineHeight: 1.3 }}>{slide.title}</div>
    {slide.titleJa ? <Small style={{ fontSize: 34, marginTop: 14, whiteSpace: "pre-line" }}>{slide.titleJa}</Small> : null}
    {slide.summary ? (
      <div style={{ fontWeight: 700, fontSize: 40, lineHeight: 1.5, marginTop: 40, whiteSpace: "pre-line" }}>
        {slide.summary}
      </div>
    ) : null}
  </div>
);
