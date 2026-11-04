import React from "react";
import { CutawaySpec } from "./types";

// 1本ぶんのテーマ：台本・ナレーションの長さ・3D の模型（Canvas の中）・機構に合わせた効果音
export type CutawayTheme = {
  spec: CutawaySpec;
  durations: number[];
  Scene: React.FC<{ t: number; starts: number[]; gen: number; frame: number }>;
  Sounds: React.FC<{ starts: number[]; fps: number }>;
};
