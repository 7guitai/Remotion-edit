import React from "react";
import { Countdown } from "../components/Countdown";

/** 0〜2秒: 参加数「24 → 1」を見せてから GO! */
export const Intro: React.FC<{ frame: number; total: number; introFrames: number }> = ({ frame, total, introFrames }) => {
  if (frame > introFrames + 24) return null;
  return <Countdown frame={frame} total={total} introFrames={introFrames} />;
};
