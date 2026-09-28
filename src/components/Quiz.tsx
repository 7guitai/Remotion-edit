import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { QuizSlide } from "../episodes";
import { COUNTDOWN } from "../slides";
import { COLORS, fontFamily } from "../theme";

const LABELS = ["A", "B", "C", "D"];

// 選択肢を縦に並べる。answer があれば正解だけ残して「〇」を押す
export const Quiz: React.FC<{
  slide: QuizSlide;
  countdownStart: number | null;
}> = ({ slide, countdownStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal =
    slide.answer === undefined
      ? 0
      : spring({ frame: frame - 4, fps, config: { damping: 12 } });

  return (
    <div
      style={{
        fontFamily,
        display: "flex",
        flexDirection: "column",
        gap: 28,
        width: 1180,
        position: "relative",
      }}
    >
      {slide.choices.map((choice, i) => (
        <Choice
          key={i}
          index={i}
          label={choice}
          correct={slide.answer === i}
          wrong={slide.answer !== undefined && slide.answer !== i}
          reveal={reveal}
        />
      ))}
      {countdownStart !== null ? <Countdown start={countdownStart} /> : null}
    </div>
  );
};

const Choice: React.FC<{
  index: number;
  label: string;
  correct: boolean;
  wrong: boolean;
  reveal: number;
}> = ({ index, label, correct, wrong, reveal }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 正解発表では選択肢は最初から並べておく（出題と同じ画面から切り替わるように）
  const enter =
    correct || wrong
      ? 1
      : spring({ frame: frame - 6 - index * 8, fps, config: { damping: 200 } });
  const highlight = correct ? reveal : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 36,
        background: correct
          ? `color-mix(in srgb, ${COLORS.correct} ${Math.min(1, highlight) * 100}%, ${COLORS.panel})`
          : COLORS.panel,
        borderRadius: 24,
        padding: "22px 40px",
        opacity: enter * (wrong ? interpolate(reveal, [0, 1], [1, 0.3]) : 1),
        transform: `translateX(${interpolate(enter, [0, 1], [60, 0])}px) scale(${1 + highlight * 0.05})`,
        position: "relative",
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: 800,
          fontSize: 42,
          color: correct && highlight > 0.5 ? COLORS.correct : "#ffffff",
          background: correct && highlight > 0.5 ? "#ffffff" : COLORS.primary,
        }}
      >
        {LABELS[index]}
      </div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 50,
          color: correct && highlight > 0.5 ? "#ffffff" : COLORS.text,
        }}
      >
        {label}
      </div>
      {correct ? <Stamp progress={reveal} /> : null}
    </div>
  );
};

// 正解の選択肢に押す「〇」
const Stamp: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: "absolute",
      right: 40,
      top: "50%",
      width: 96,
      height: 96,
      marginTop: -48,
      borderRadius: "50%",
      border: `14px solid #ffffff`,
      boxSizing: "border-box",
      opacity: Math.min(1, progress),
      transform: `scale(${interpolate(progress, [0, 1], [2.2, 1])}) rotate(-8deg)`,
    }}
  />
);

// 読み上げのあと 3, 2, 1 と減っていくタイマー
const Countdown: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - start;
  const appear = spring({ frame: t, fps, config: { damping: 14 } });
  const remaining = Math.max(1, Math.ceil((COUNTDOWN - Math.max(0, t)) / fps));
  const progress = interpolate(t, [0, COUNTDOWN], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 1秒ごとに数字が少し跳ねる
  const beat = t >= 0 ? interpolate(t % fps, [0, 6], [1.25, 1], { extrapolateRight: "clamp" }) : 1;
  const size = 170;
  const r = size / 2 - 10;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      style={{
        position: "absolute",
        right: -300,
        bottom: -10,
        width: size,
        height: size,
        opacity: t < 0 ? 0 : appear,
        transform: `scale(${appear})`,
      }}
    >
      <svg width={size} height={size} style={{ position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="#ffffff" stroke={COLORS.border} strokeWidth={14} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: 800,
          fontSize: 84,
          color: COLORS.accent,
          transform: `scale(${beat})`,
        }}
      >
        {remaining}
      </div>
      <div
        style={{
          position: "absolute",
          top: -52,
          left: -40,
          right: -40,
          textAlign: "center",
          fontWeight: 800,
          fontSize: 30,
          color: COLORS.note,
        }}
      >
        考えてみて！
      </div>
    </div>
  );
};
