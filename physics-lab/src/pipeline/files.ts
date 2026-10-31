import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { SIMULATION } from "../config/physics";
import { simulationStaticPath } from "../config/paths";
import { runSimulation } from "../physics/simulation";
import type { SimulationResult } from "../physics/types";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Remotionが読み込むファイル（public/ 配下 = staticFile で参照可能） */
export { simulationStaticPath };
export const simulationPublicFile = (seed: number) => path.join(ROOT, "public", simulationStaticPath(seed));

/** 結果のうち、生成日時を除いた部分のハッシュ（再現性の確認用） */
export const resultHash = (result: SimulationResult): string => {
  const { generator: _g, ...rest } = result;
  return createHash("sha256").update(JSON.stringify(rest)).digest("hex").slice(0, 16);
};

export const simulateAndSave = (seed: number): { result: SimulationResult; file: string; hash: string } => {
  const result = runSimulation({ ...SIMULATION, seed });
  const file = simulationPublicFile(seed);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(result));
  return { result, file, hash: resultHash(result) };
};

export const loadSimulation = (seed: number): SimulationResult | null => {
  const file = simulationPublicFile(seed);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as SimulationResult;
};
