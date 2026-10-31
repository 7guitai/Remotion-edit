import path from "node:path";
import { SIMULATION } from "../config/physics";
import { intArg, parseArgs } from "./args";
import { ROOT, simulateAndSave } from "./files";
import { evaluate, passed, printChecks } from "./quality-check";
import { renderSeed } from "./render-video";

/**
 * npm run render                       → out/last-ball-standing.mp4（既定seed）
 * npm run render -- --seed=42          → out/last-ball-standing-42.mp4
 * npm run render -- --out=renders/x.mp4
 * npm run render -- --force            品質チェック不合格でも書き出す
 */
const args = parseArgs();
const seed = intArg(args, "seed", SIMULATION.seed);
const defaultName = seed === SIMULATION.seed ? "last-ball-standing.mp4" : `last-ball-standing-${seed}.mp4`;
const outFile = path.resolve(ROOT, args.out ?? path.join("out", defaultName));

console.log(`[render] seed=${seed} をシミュレーション中...`);
const { result, hash } = simulateAndSave(seed);
const checks = evaluate(result);
printChecks(checks);
if (!passed(checks) && args.force !== "true") {
  console.error("[render] 品質チェック不合格のため中止しました（--force で強制的に書き出せます）");
  process.exit(1);
}
console.log(`[render] 勝者 #${result.winner.ballIndex + 1}（動画 ${(result.winnerFrame / result.fps).toFixed(2)}秒で確定）`);
const { metaFile } = await renderSeed({ sim: result, hash, checks, outFile });
console.log(`[render] 完了: ${path.relative(ROOT, outFile)}`);
console.log(`[render] メタデータ: ${path.relative(ROOT, metaFile)}`);
