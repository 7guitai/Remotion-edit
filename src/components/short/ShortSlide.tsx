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
  FlowSlide,
  HookSlide,
  Episode,
  PointsSlide,
  RankingSlide,
  SourceSlide,
  StackedSlide,
  VersusSide,
  VersusSlide,
} from "../../episodes";
import { ResolvedSlide } from "../../slides";
import { fontFamily } from "../../theme";
import { LAYOUTS, SHORT, toneColor } from "./theme";

type Look = Episode["look"];

// 縦型ショート1枚: 上に図解カード、下にずんだもんの字幕、出典
export const ShortSlide: React.FC<{ resolved: ResolvedSlide; look?: Look }> = ({
  resolved,
  look,
}) => {
  const { slide } = resolved;
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: 30, config: { damping: 200 }, durationInFrames: 14 });
  const kit = look?.layout === "kit";
  const L = LAYOUTS[kit ? "kit" : "default"];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <div
        style={{
          position: "absolute",
          top: L.cardTop,
          left: L.cardLeft,
          right: L.cardRight,
          height: L.cardHeight,
          borderRadius: 40,
          background: SHORT.card,
          border: `2px solid ${SHORT.cardBorder}`,
          boxShadow: "0 18px 50px rgba(10, 20, 40, 0.18)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: kit ? "48px 40px 70px" : 56,
          boxSizing: "border-box",
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
        }}
      >
        <Visual resolved={resolved} />
        {kit && slide.cite ? <CardCite text={slide.cite} /> : null}
      </div>
      {kit ? (
        <>
          <KitCaption text={slide.text} top={L.captionTop} />
          <Speaker />
        </>
      ) : (
        <>
          <Caption text={slide.text} top={L.captionTop} />
          {slide.cite ? <Cite text={slide.cite} /> : null}
        </>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ resolved: ResolvedSlide }> = ({ resolved }) => {
  const { slide } = resolved;
  switch (slide.type) {
    case "hook":
      return <Hook slide={slide} />;
    case "source":
      return <Source slide={slide} />;
    case "versus":
      return <Versus slide={slide} />;
    case "flow":
      return <Flow slide={slide} />;
    case "stacked":
      return <Stacked slide={slide} />;
    case "ranking":
      return <Ranking slide={slide} />;
    case "emphasis":
      return <Emphasis slide={slide} />;
    case "points":
      return <Checklist slide={slide} />;
    case undefined:
    case "illust":
      return resolved.hasImage ? (
        <Img
          src={staticFile(`illustrations/${slide.image}`)}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      ) : (
        <div style={{ fontSize: 300 }}>{resolved.illustration?.emoji ?? "💡"}</div>
      );
    default:
      return null;
  }
};

const useStep = (i: number, delay = 10, start = 8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start - i * delay, fps, config: { damping: 200 } });
};

// ---- 字幕（ずんだもん） ----

// いちばん長い行が字幕の幅に収まる大きさにする
const captionSize = (text: string, width = 700, max = 62) => {
  const longest = Math.max(...text.split("\n").map((l) => [...l].length));
  return Math.min(max, Math.floor(width / Math.max(longest, 1)));
};

const Caption: React.FC<{ text: string; top: number }> = ({ text, top }) => (
  <div
    style={{
      position: "absolute",
      top,
      left: SHORT.side,
      right: SHORT.side,
      display: "flex",
      gap: 26,
      alignItems: "flex-start",
    }}
  >
    <Avatar size={116} />
    <div style={{ flex: 1, position: "relative" }}>
      <NameChip />
      <div
        style={{
          fontWeight: 800,
          fontSize: captionSize(text),
          lineHeight: 1.38,
          color: SHORT.text,
          whiteSpace: "pre-line",
          wordBreak: "keep-all",
          overflowWrap: "anywhere",
        }}
      >
        {text}
      </div>
    </div>
  </div>
);

// 素材キットの字幕: 白の太字＋緑の縁取り、最大2行（Y=1340..1540）
const KitCaption: React.FC<{ text: string; top: number }> = ({ text, top }) => {
  const size = captionSize(text, 800, 64);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 40,
        right: 150,
        height: 195,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.32,
        color: "#ffffff",
        WebkitTextStroke: `${Math.round(size / 5)}px #2e8b3a`,
        paintOrder: "stroke fill",
        textShadow: "0 4px 10px rgba(0, 0, 0, 0.45)",
        whiteSpace: "pre-line",
        wordBreak: "keep-all",
        overflowWrap: "anywhere",
      }}
    >
      {text}
    </div>
  );
};

// キャラクター欄（Y=1540〜）。立ち絵の代わりに名前入りのアイコンを置く
const Speaker: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 1560,
      left: 40,
      display: "flex",
      alignItems: "center",
      gap: 18,
    }}
  >
    <Avatar size={92} />
    <NameChip />
  </div>
);

const NameChip: React.FC = () => (
  <div
    style={{
      display: "inline-block",
      fontWeight: 800,
      fontSize: 26,
      color: "#fff",
      background: SHORT.zunda,
      borderRadius: 999,
      padding: "4px 20px",
      marginBottom: 14,
    }}
  >
    ずんだもん
  </div>
);

// 話し手を示す丸いアイコン（キャラクターの絵は使わず、名前の頭文字で表す）
const Avatar: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 5) * 3;
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #a6dd84, ${SHORT.zunda})`,
        border: "6px solid #fff",
        boxShadow: "0 8px 22px rgba(60, 120, 40, 0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: 800,
        fontSize: size * 0.52,
        color: "#fff",
        transform: `translateY(${bob}px)`,
      }}
    >
      ず
    </div>
  );
};

const Cite: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: SHORT.citeTop,
      left: SHORT.side,
      right: SHORT.side,
      fontWeight: 500,
      fontSize: 26,
      lineHeight: 1.4,
      color: SHORT.note,
    }}
  >
    出典: {text}
  </div>
);

// 図解カードの右下に出す出典（素材キットのルール）
const CardCite: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      right: 32,
      bottom: 22,
      left: 32,
      textAlign: "right",
      fontWeight: 500,
      fontSize: 24,
      color: SHORT.note,
    }}
  >
    出典：{text}
  </div>
);

// ---- 図解 ----

const Hook: React.FC<{ slide: HookSlide }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const pop = useStep(0, 0, 4);
  const pulse = 1 + Math.sin(frame / 6) * 0.03;
  return (
    <div style={{ textAlign: "center" }}>
      {slide.emoji ? (
        <div style={{ fontSize: 210, transform: `scale(${pop * pulse})`, marginBottom: 30 }}>
          {slide.emoji}
        </div>
      ) : null}
      <div
        style={{
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.3,
          color: SHORT.text,
          whiteSpace: "pre-line",
          opacity: pop,
        }}
      >
        <Marked text={slide.headline} />
      </div>
    </div>
  );
};

// 【】で囲んだ部分を強調色にする
const Marked: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(【[^】]+】)/).map((part, i) =>
      part.startsWith("【") ? (
        <span key={i} style={{ color: SHORT.bad }}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

const Source: React.FC<{ slide: SourceSlide }> = ({ slide }) => {
  const a = useStep(0);
  const b = useStep(1, 12);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", opacity: a }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: 30,
            color: "#fff",
            background: SHORT.accent,
            borderRadius: 12,
            padding: "6px 18px",
          }}
        >
          資料
        </span>
        <span style={{ fontWeight: 800, fontSize: 40, color: SHORT.text }}>{slide.org}</span>
        <span style={{ fontWeight: 500, fontSize: 32, color: SHORT.note }}>{slide.date}</span>
      </div>
      <div
        style={{
          marginTop: 36,
          borderLeft: `12px solid ${SHORT.accent}`,
          background: SHORT.panel,
          borderRadius: 20,
          padding: "34px 38px",
          opacity: a,
          transform: `translateX(${interpolate(a, [0, 1], [-30, 0])}px)`,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 52, lineHeight: 1.25, color: SHORT.text }}>
          {slide.title}
        </div>
        {slide.titleJa ? (
          <div style={{ fontWeight: 500, fontSize: 32, marginTop: 16, color: SHORT.sub, whiteSpace: "pre-line" }}>
            {slide.titleJa}
          </div>
        ) : null}
      </div>
      {slide.summary ? (
        <div
          style={{
            marginTop: 36,
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1.45,
            color: SHORT.text,
            opacity: b,
            whiteSpace: "pre-line",
          }}
        >
          {slide.summary}
        </div>
      ) : null}
    </div>
  );
};

const Versus: React.FC<{ slide: VersusSlide }> = ({ slide }) => (
  <div style={{ width: "100%" }}>
    <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
      <VersusCard side={slide.left} index={0} />
      <div
        style={{
          alignSelf: "center",
          fontWeight: 800,
          fontSize: 40,
          color: SHORT.note,
        }}
      >
        vs
      </div>
      <VersusCard side={slide.right} index={1} />
    </div>
    {slide.note ? <Note text={slide.note} /> : null}
  </div>
);

const VersusCard: React.FC<{ side: VersusSide; index: number }> = ({ side, index }) => {
  const s = useStep(index, 14);
  const color = toneColor(side.tone);
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 28,
        border: `5px solid ${color}`,
        background: `${color}14`,
        padding: "34px 26px",
        textAlign: "center",
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 38,
          color: SHORT.text,
          lineHeight: 1.3,
          whiteSpace: "pre-line",
        }}
      >
        {side.label}
      </div>
      {side.value ? (
        <div style={{ fontWeight: 800, fontSize: 108, color, marginTop: 18 }}>{side.value}</div>
      ) : null}
      {side.lines?.map((line) => (
        <div
          key={line}
          style={{
            fontWeight: 500,
            fontSize: 34,
            lineHeight: 1.4,
            color: SHORT.text,
            marginTop: 18,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

const Flow: React.FC<{ slide: FlowSlide }> = ({ slide }) => (
  <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
    {slide.steps.map((step, i) => (
      <FlowStep key={step.label} step={step} index={i} last={i === slide.steps.length - 1} />
    ))}
    {slide.note ? <Note text={slide.note} /> : null}
  </div>
);

const FlowStep: React.FC<{
  step: FlowSlide["steps"][number];
  index: number;
  last: boolean;
}> = ({ step, index, last }) => {
  const s = useStep(index, 16);
  const color = toneColor(step.tone);
  return (
    <>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 26,
          borderRadius: 26,
          background: last ? `${color}1f` : SHORT.panel,
          border: `4px solid ${last ? color : "transparent"}`,
          padding: "22px 30px",
          boxSizing: "border-box",
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
        }}
      >
        {step.emoji ? <div style={{ fontSize: 66 }}>{step.emoji}</div> : null}
        <div>
          <div style={{ fontWeight: 800, fontSize: 44, color: last ? color : SHORT.text }}>
            {step.label}
          </div>
          {step.sub ? (
            <div style={{ fontWeight: 500, fontSize: 30, color: SHORT.sub, marginTop: 4 }}>
              {step.sub}
            </div>
          ) : null}
        </div>
      </div>
      {last ? null : (
        <div style={{ fontSize: 46, color: SHORT.note, lineHeight: 1.1, opacity: s }}>▼</div>
      )}
    </>
  );
};

const Stacked: React.FC<{ slide: StackedSlide }> = ({ slide }) => (
  <div style={{ width: "100%" }}>
    <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginBottom: 40 }}>
      {slide.series.map((s) => (
        <div
          key={s.label}
          style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 30, fontWeight: 800 }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: toneColor(s.tone),
              display: "inline-block",
            }}
          />
          <span style={{ color: SHORT.text }}>{s.label}</span>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
      {slide.rows.map((row, i) => (
        <StackedRow key={row.label} row={row} series={slide.series} index={i} />
      ))}
    </div>
    {slide.note ? <Note text={slide.note} /> : null}
  </div>
);

const StackedRow: React.FC<{
  row: StackedSlide["rows"][number];
  series: StackedSlide["series"];
  index: number;
}> = ({ row, series, index }) => {
  const grow = useStep(index, 18);
  const total = row.values.reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 40, color: SHORT.text, marginBottom: 14 }}>
        {row.label}
      </div>
      <div
        style={{
          display: "flex",
          height: 104,
          borderRadius: 18,
          overflow: "hidden",
          background: SHORT.panel,
          width: `${grow * 100}%`,
        }}
      >
        {row.values.map((v, j) => (
          <div
            key={series[j]?.label ?? j}
            style={{
              width: `${(v / total) * 100}%`,
              background: toneColor(series[j]?.tone),
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: v / total >= 0.12 ? 40 : 0,
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(v * grow)}%
          </div>
        ))}
      </div>
    </div>
  );
};

const Ranking: React.FC<{ slide: RankingSlide }> = ({ slide }) => {
  const max = slide.max ?? Math.max(...slide.rows.map((r) => r.value)) * 1.08;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {slide.rows.map((row, i) => (
          <RankingRow key={row.label} row={row} index={i} max={max} unit={slide.unit} />
        ))}
      </div>
      {slide.note ? <Note text={slide.note} /> : null}
    </div>
  );
};

const RankingRow: React.FC<{
  row: RankingSlide["rows"][number];
  index: number;
  max: number;
  unit?: string;
}> = ({ row, index, max, unit }) => {
  const grow = useStep(index, 10);
  const color = row.highlight ? SHORT.good : SHORT.neutral;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 10,
          color: row.highlight ? SHORT.good : SHORT.text,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 30, color: SHORT.note }}>{index + 1}位</span>
        <span style={{ fontWeight: 800, fontSize: 38 }}>{row.label}</span>
        {row.sub ? (
          <span style={{ fontWeight: 500, fontSize: 26, color: SHORT.sub }}>{row.sub}</span>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            height: row.highlight ? 76 : 60,
            width: `${(row.value / max) * 82 * grow}%`,
            borderRadius: 14,
            background: color,
            boxShadow: row.highlight ? `0 0 28px ${SHORT.good}88` : "none",
          }}
        />
        <span
          style={{
            fontWeight: 800,
            fontSize: row.highlight ? 52 : 40,
            color: row.highlight ? SHORT.good : SHORT.text,
            opacity: grow,
          }}
        >
          {Math.round(row.value * grow)}
          {unit ?? ""}
        </span>
      </div>
    </div>
  );
};

const Emphasis: React.FC<{ slide: EmphasisSlide }> = ({ slide }) => {
  const s = useStep(0, 0, 4);
  const t = useStep(1, 12, 4);
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: 96,
          lineHeight: 1.25,
          color: SHORT.text,
          whiteSpace: "pre-line",
          transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
          opacity: s,
        }}
      >
        <Marked text={slide.big} />
      </div>
      {slide.sub ? (
        <div
          style={{
            marginTop: 44,
            fontWeight: 800,
            fontSize: 44,
            lineHeight: 1.45,
            color: "#fff",
            background: SHORT.accent,
            borderRadius: 24,
            padding: "22px 34px",
            display: "inline-block",
            opacity: t,
            whiteSpace: "pre-line",
          }}
        >
          {slide.sub}
        </div>
      ) : null}
    </div>
  );
};

const Checklist: React.FC<{ slide: PointsSlide }> = ({ slide }) => (
  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 30 }}>
    {slide.items.map((item, i) => (
      <ChecklistItem key={item.label} item={item} index={i} />
    ))}
  </div>
);

const ChecklistItem: React.FC<{ item: PointsSlide["items"][number]; index: number }> = ({
  item,
  index,
}) => {
  const s = useStep(index, 16);
  return (
    <div
      style={{
        display: "flex",
        gap: 26,
        alignItems: "center",
        background: SHORT.panel,
        borderRadius: 26,
        padding: "30px 32px",
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          flexShrink: 0,
          borderRadius: 20,
          background: SHORT.good,
          color: "#fff",
          fontWeight: 800,
          fontSize: 50,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        ✓
      </div>
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 42,
            color: SHORT.text,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {item.label}
        </div>
        <div style={{ fontWeight: 500, fontSize: 32, color: SHORT.sub, marginTop: 6 }}>
          {item.body}
        </div>
      </div>
    </div>
  );
};

const Note: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      marginTop: 34,
      fontWeight: 500,
      fontSize: 28,
      lineHeight: 1.45,
      color: SHORT.note,
      textAlign: "center",
      whiteSpace: "pre-line",
    }}
  >
    {text}
  </div>
);

