import React from "react";
import { Audio, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COMMON, FONT } from "./theme";

// ---- アニメーション補助 ----

export const useSpring = (delay: number, config?: { damping?: number; stiffness?: number; mass?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 170, ...config } });
};

// フェード＋少し下から上がってくる登場
export const useRise = (delay: number, distance = 40) => {
  const s = useSpring(delay);
  return { opacity: s, transform: `translateY(${(1 - s) * distance}px)` } as React.CSSProperties;
};

// 0→1 を指定フレームの間で
export const useProgress = (from: number, to: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

// ---- 効果音（scripts/make_sfx.py で合成） ----

export type SfxName = "pop" | "whoosh" | "ding" | "stamp" | "register";

export const Sfx: React.FC<{ at: number; name: SfxName; volume?: number }> = ({ at, name, volume = 0.4 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45} layout="none">
    <Audio src={COMMON(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// ---- ロゴ（simple-icons の SVG をマスクにして好きな色で塗る） ----

export const Logo: React.FC<{ icon: string; size: number; color: string }> = ({ icon, size, color }) => {
  const url = `url(${COMMON(`icons/${icon}.svg`)})`;
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
      }}
    />
  );
};

// 角丸スクエアのアプリアイコン風
export const AppIcon: React.FC<{ icon: string; color: string; size: number; fg?: string }> = ({ icon, color, size, fg = "#fff" }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.26,
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `inset 0 -${size * 0.05}px 0 rgba(0,0,0,0.12)`,
      flexShrink: 0,
    }}
  >
    <Logo icon={icon} size={size * 0.58} color={fg} />
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; bg: string; color?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  bg,
  color = "#fff",
  size = 36,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.3,
      background: bg,
      color,
      fontFamily: FONT,
      fontWeight: 900,
      fontSize: size,
      padding: `${size * 0.2}px ${size * 0.55}px ${size * 0.26}px`,
      borderRadius: size * 0.4,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// 全角1・半角0.58として文字幅を見積もる
export const textWidth = (s: string) => [...s].reduce((w, ch) => w + (/[ -~]/.test(ch) ? 0.58 : 1), 0);
