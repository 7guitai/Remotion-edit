import React from "react";
import {
  Audio,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ASSET, BODY_FONT, C, HEAD_FONT } from "./theme";

// ---- アニメーション補助 ----

export const useSpring = (delay: number, config?: { damping?: number; stiffness?: number; mass?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180, ...config } });
};

// 「ドン！」と押されるスタンプ用（大きい→ぴったり）
export const useSlam = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 260, mass: 0.7 } });
  return {
    visible: frame >= delay,
    scale: interpolate(s, [0, 1], [2.4, 1]),
    opacity: interpolate(frame - delay, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    // 着地の瞬間に画面が少し揺れる
    shake: frame >= delay + 3 && frame < delay + 11 ? Math.sin((frame - delay) * 2.4) * (11 - (frame - delay)) * 1.6 : 0,
  };
};

// ---- 効果音 ----

export const Sfx: React.FC<{ at: number; name: "pop" | "whoosh" | "ding" | "stamp" | "register"; volume?: number }> = ({
  at,
  name,
  volume = 0.5,
}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45} layout="none">
    <Audio src={ASSET(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// ---- ロゴ（simple-icons の SVG をマスクにして好きな色で塗る） ----

export const Logo: React.FC<{ icon: string; size: number; color: string; style?: React.CSSProperties }> = ({
  icon,
  size,
  color,
  style,
}) => {
  const url = `url(${ASSET(`icons/${icon}.svg`)})`;
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
};

// ロゴを白丸に入れたバッジ
export const LogoBubble: React.FC<{ icon: string; color: string; size: number; filled?: boolean; style?: React.CSSProperties }> = ({
  icon,
  color,
  size,
  filled,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: filled ? color : C.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 ${size * 0.06}px ${size * 0.18}px rgba(0,0,0,0.35), inset 0 0 0 ${Math.max(3, size * 0.03)}px ${filled ? "rgba(255,255,255,0.35)" : color}`,
      ...style,
    }}
  >
    <Logo icon={icon} size={size * 0.56} color={filled ? C.white : color} />
  </div>
);

// ---- 文字 ----

// 縁取り付きの見出し文字
export const Outlined: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  font?: string;
  style?: React.CSSProperties;
}> = ({ children, size, color = C.white, stroke = C.ink, strokeWidth, font = HEAD_FONT, style }) => (
  <div
    style={{
      fontFamily: font,
      fontWeight: font === BODY_FONT ? 900 : 400,
      fontSize: size,
      lineHeight: 1.15,
      color,
      WebkitTextStroke: `${strokeWidth ?? Math.round(size * 0.16)}px ${stroke}`,
      paintOrder: "stroke fill",
      textAlign: "center",
      whiteSpace: "pre-line",
      letterSpacing: "0.02em",
      ...style,
    }}
  >
    {children}
  </div>
);

// 「迷ったらコレ」などのリボン
export const Chip: React.FC<{ children: React.ReactNode; bg: string; color?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  bg,
  color = C.white,
  size = 40,
  style,
}) => (
  <div
    style={{
      display: "inline-block",
      background: bg,
      color,
      fontFamily: BODY_FONT,
      fontWeight: 900,
      fontSize: size,
      padding: `${size * 0.22}px ${size * 0.6}px`,
      borderRadius: size,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// 全角1・半角0.55として文字幅を見積もる
export const textWidth = (s: string) =>
  [...s].reduce((w, ch) => w + (/[ -~]/.test(ch) ? 0.58 : 1), 0);
