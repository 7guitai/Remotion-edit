import fs from "node:fs";
import path from "node:path";
import { intArg, modeArg, parseArgs } from "./args";
import { ROOT, simulateAndSave } from "./files";
import { evaluate, passed } from "./quality-check";
import { renderSeed } from "./render-video";

/**
 * 簡易バッチ生成（MVP版）
 * npm run generate -- --count=3 [--start-seed=1000] [--no-render]
 *
 * 1. 候補seedを順にシミュレーション
 * 2. 品質チェック不合格は不採用
 * 3. 同じバッチ内でコース構造（回転バーの腕の数 × バンパー数）が重複するものも不採用（似た動画を避ける）
 * 4. 合格したものを renders/ に MP4 + メタデータJSON として保存
 */
const args = parseArgs();
const count = intArg(args, "count", 3);
const startSeed = intArg(args, "start-seed", Math.floor(Date.now() / 1000) % 1_000_000_000);
const render = args["no-render"] !== "true";
const mode = modeArg(args);
const maxTries = count * 20;

const accepted: { seed: number; signature: string }[] = [];
const signatures = new Set<string>();
let tries = 0;
for (let seed = startSeed; accepted.length < count && tries < maxTries; seed++, tries++) {
  const { result, hash } = simulateAndSave(seed, mode);
  const checks = evaluate(result);
  const signature = `${result.course.spinner.arms}arms-${result.course.bumpers.length}bumpers`;
  if (!passed(checks)) {
    const ng = checks.filter((c) => !c.ok && c.severity === "error").map((c) => c.name);
    console.log(`[generate] seed ${seed}: 不採用（${ng.join(", ")}）`);
    continue;
  }
  if (signatures.has(signature)) {
    console.log(`[generate] seed ${seed}: 不採用（コース構造 ${signature} がバッチ内で重複）`);
    continue;
  }
  signatures.add(signature);
  accepted.push({ seed, signature });
  console.log(`[generate] seed ${seed}: 採用（${signature}, 勝者 #${result.winner.ballIndex + 1}）`);
  if (render) {
    const outFile = path.join(ROOT, "renders", `last-ball-standing-${mode}-${seed}.mp4`);
    await renderSeed({ sim: result, hash, checks, outFile });
    console.log(`[generate]   → ${path.relative(ROOT, outFile)}`);
  }
}

fs.mkdirSync(path.join(ROOT, "analytics"), { recursive: true });
fs.appendFileSync(
  path.join(ROOT, "analytics", "generation-log.local.jsonl"),
  accepted.map((a) => JSON.stringify({ at: new Date().toISOString(), ...a, rendered: render })).join("\n") + (accepted.length ? "\n" : ""),
);
console.log(`[generate] ${accepted.length}/${count} 本採用（${tries} seed を試行）`);
if (accepted.length < count) process.exit(1);
