import type { GameMode } from "../physics/types";

/** public/ からの相対パス（Remotionでは staticFile()、Node側では public/ 配下のファイル） */
export const simulationStaticPath = (seed: number, mode: GameMode = "gate") => `simulations/lbs-${mode}-${seed}.json`;
