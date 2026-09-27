import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BarsSlide, PointsSlide, TableSlide } from "../episodes";
import { COLORS, fontFamily } from "../theme";

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily,
      fontWeight: 500,
      fontSize: 24,
      color: COLORS.note,
      textAlign: "center",
      marginTop: 28,
    }}
  >
    {children}
  </div>
);

const useStagger = (i: number, delay = 8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - 6 - i * delay,
    fps,
    config: { damping: 200 },
  });
};

// PC とスマホへの配分を積み上げ横棒で比較
export const Bars: React.FC<{ slide: BarsSlide }> = ({ slide }) => {
  const max = Math.max(...slide.bars.map((b) => b.pc + b.phone));
  const trackWidth = 920;
  return (
    <div style={{ fontFamily, width: 1560 }}>
      <Legend />
      <div style={{ display: "flex", flexDirection: "column", gap: 38 }}>
        {slide.bars.map((bar, i) => (
          <BarRow
            key={bar.label}
            bar={bar}
            index={i}
            scale={trackWidth / max}
          />
        ))}
      </div>
      {slide.note ? <Note>{slide.note}</Note> : null}
    </div>
  );
};

const Legend: React.FC = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: 32,
      fontWeight: 800,
      fontSize: 28,
      color: COLORS.text,
      marginBottom: 20,
    }}
  >
    {[
      ["PC", COLORS.primary],
      ["スマホ", COLORS.secondary],
    ].map(([label, color]) => (
      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: color }} />
        {label}
      </div>
    ))}
  </div>
);

const BarRow: React.FC<{
  bar: BarsSlide["bars"][number];
  index: number;
  scale: number;
}> = ({ bar, index, scale }) => {
  const progress = useStagger(index);
  const segment = (value: number, color: string) => (
    <div
      style={{
        width: value * scale * progress,
        height: 84,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontWeight: 800,
        fontSize: 36,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {progress > 0.6 ? `${value}W` : null}
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
      <div style={{ width: 360, textAlign: "right" }}>
        <div style={{ fontWeight: 800, fontSize: 48, color: COLORS.text }}>
          {bar.label}
        </div>
        {bar.sub ? (
          <div
            style={{
              fontWeight: 500,
              fontSize: 20,
              color: COLORS.note,
              lineHeight: 1.3,
              whiteSpace: "pre-line",
            }}
          >
            {bar.sub}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          borderRadius: 12,
          overflow: "hidden",
          background: COLORS.panel,
        }}
      >
        {segment(bar.pc, COLORS.primary)}
        {segment(bar.phone, COLORS.secondary)}
      </div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 34,
          color: COLORS.text,
          whiteSpace: "nowrap",
          opacity: interpolate(progress, [0.7, 1], [0, 1], {
            extrapolateLeft: "clamp",
          }),
        }}
      >
        計{bar.pc + bar.phone}W
      </div>
    </div>
  );
};

// 比較表（1列目を見出しとして太字）
export const Table: React.FC<{ slide: TableSlide }> = ({ slide }) => {
  const cell = (header: boolean, first: boolean): React.CSSProperties => ({
    padding: "18px 30px",
    borderBottom: `3px solid ${COLORS.border}`,
    fontWeight: header || first ? 800 : 500,
    fontSize: header ? 30 : 38,
    color: header ? COLORS.note : COLORS.text,
    textAlign: first ? "left" : "center",
    whiteSpace: "nowrap",
    background: header ? COLORS.panel : "transparent",
  });
  return (
    <div style={{ fontFamily }}>
      <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
        <thead>
          <tr>
            {slide.columns.map((c, i) => (
              <th key={i} style={cell(true, i === 0)}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slide.rows.map((row, r) => (
            <TableRow key={r} index={r}>
              {row.map((c, i) => (
                <td key={i} style={cell(false, i === 0)}>
                  {c}
                </td>
              ))}
            </TableRow>
          ))}
        </tbody>
      </table>
      {slide.note ? <Note>{slide.note}</Note> : null}
    </div>
  );
};

const TableRow: React.FC<{ index: number; children: React.ReactNode }> = ({
  index,
  children,
}) => {
  const progress = useStagger(index);
  return <tr style={{ opacity: progress }}>{children}</tr>;
};

// ラベル付きの箇条書き
export const Points: React.FC<{ slide: PointsSlide }> = ({ slide }) => (
  <div
    style={{
      fontFamily,
      display: "flex",
      flexDirection: "column",
      gap: 28,
      width: 1400,
    }}
  >
    {slide.items.map((item, i) => (
      <PointRow key={i} index={i} item={item} />
    ))}
  </div>
);

const PointRow: React.FC<{
  index: number;
  item: PointsSlide["items"][number];
}> = ({ index, item }) => {
  const progress = useStagger(index, 10);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 36,
        background: COLORS.panel,
        borderRadius: 20,
        padding: "26px 40px",
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`,
      }}
    >
      <div
        style={{
          minWidth: 190,
          textAlign: "center",
          fontWeight: 800,
          fontSize: 40,
          color: "#ffffff",
          background: COLORS.primary,
          borderRadius: 999,
          padding: "8px 24px",
        }}
      >
        {item.label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 46, color: COLORS.text }}>
        {item.body}
      </div>
    </div>
  );
};
