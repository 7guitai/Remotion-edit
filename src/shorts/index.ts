// 縦型ショートの一覧。scripts/new_short.py で新しく作ると、ここに自動で1行追加される
import React from "react";
import { AiSubscriptionShort } from "./ai-subscription/Short";
import { TIMELINE as AI_SUBSCRIPTION_TIMELINE } from "./ai-subscription/timeline";
import { OrcaShort } from "./orca/Short";
import { TIMELINE as ORCA_TIMELINE } from "./orca/theme";
// <new-short-imports>

export type ShortEntry = { id: string; component: React.FC; durationInFrames: number };

export const SHORTS: ShortEntry[] = [
  { id: "ai-subscription-short", component: AiSubscriptionShort, durationInFrames: AI_SUBSCRIPTION_TIMELINE.total },
  { id: "orca-short", component: OrcaShort, durationInFrames: ORCA_TIMELINE.total },
  // <new-short-entries>
];
