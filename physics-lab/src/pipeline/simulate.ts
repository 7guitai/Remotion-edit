import path from "node:path";
import { SIMULATION } from "../config/physics";
import { intArg, parseArgs } from "./args";
import { ROOT, simulateAndSave } from "./files";
import { evaluate, passed, printChecks } from "./quality-check";

const args = parseArgs();
const seed = intArg(args, "seed", SIMULATION.seed);
const started = Date.now();
const { result, file, hash } = simulateAndSave(seed);
const w = result.winner;
console.log(`[simulate] seed=${seed} → ${path.relative(ROOT, file)} (${Date.now() - started}ms, hash ${hash})`);
console.log(`[simulate] 勝者 #${w.ballIndex + 1} / 決着 ${w.decidedAt}s (${w.decidedBy}) / 動画 ${(result.winnerFrame / result.fps).toFixed(2)}s`);
const checks = evaluate(result);
if (!passed(checks) || args.verbose) printChecks(checks);
if (!passed(checks)) console.warn("[simulate] ⚠ 品質チェックに不合格の項目があります（別のseedを推奨）");
