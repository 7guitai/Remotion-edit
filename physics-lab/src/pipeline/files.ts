import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { configFor } from "../config/physics";
import { simulationStaticPath } from "../config/paths";
import { runSimulation } from "../physics/simulation";
import type { GameMode, SimulationResult } from "../physics/types";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Remotionが読み込むファイル（public/ 配下 = staticFile で参照可能） */
export { simulationStaticPath };
export const simulationPublicFile = (seed: number, mode: GameMode) => path.join(ROOT, "public", simulationStaticPath(seed, mode));

/** 結果のうち、生成日時を除いた部分のハッシュ（再現性の確認用） */
export const resultHash = (result: SimulationResult): string => {
  const { generator: _g, ...rest } = result;
  return createHash("sha256").update(JSON.stringify(rest)).digest("hex").slice(0, 16);
};

export const simulateAndSave = (seed: number, mode: GameMode): { result: SimulationResult; file: string; hash: string } => {
  const result = runSimulation(configFor(mode, seed));
  const file = simulationPublicFile(seed, mode);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(result));
  return { result, file, hash: resultHash(result) };
};

