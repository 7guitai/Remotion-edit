import { pathToFileURL } from "node:url";
import { SIMULATION } from "../config/physics";
import { runSimulation } from "../physics/simulation";
import type { SimulationResult } from "../physics/types";
import { intArg, parseArgs } from "./args";
import { resultHash } from "./files";

export type Check = { name: string; ok: boolean; detail: string; severity: "error" | "warn" };

/** シミュレーション結果を検査する。severity=error が1つでもあれば不採用 */
export const evaluate = (res: SimulationResult): Check[] => {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail: string, severity: Check["severity"] = "error") =>
    checks.push({ name, ok, detail, severity });
  const { fps, config } = res;
  const n = res.balls.length;

  add("フレーム数", res.frames.length === res.durationFrames && res.durationFrames === fps * config.durationSeconds,
    `${res.frames.length} frames`);

  // 座標が有限で画面内にある
  let bad = 0;
  for (const f of res.frames) {
    for (let i = 0; i < n; i++) {
      const x = f.b[i * 3];
      const y = f.b[i * 3 + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1080 || y < 0 || y > 1920) bad++;
    }
  }
  add("全ボールが常に画面内", bad === 0, bad === 0 ? "OK" : `${bad} 件が画面外/NaN`);

  add("脱落数", res.eliminations.length === n - 1, `${res.eliminations.length} / ${n - 1}`);
  const order = new Set(res.eliminations.map((e) => e.ballIndex));
  add("勝者は脱落していない", !order.has(res.winner.ballIndex) && order.size === n - 1, `winner #${res.winner.ballIndex + 1}`);

  let monotonic = true;
  for (let i = 1; i < res.frames.length; i++) if (res.frames[i].alive > res.frames[i - 1].alive) monotonic = false;
  add("残数は単調減少して最後は1", monotonic && res.frames[res.frames.length - 1].alive === 1,
    `final alive = ${res.frames[res.frames.length - 1].alive}`);

  add("通常決着（タイムアウトでない）", res.winner.decidedBy === "last-standing", res.winner.decidedBy);

  const winnerSec = res.winnerFrame / fps;
  add("勝者確定が動画の18〜27秒", winnerSec >= 18 && winnerSec <= 27, `${winnerSec.toFixed(2)}s (sim ${res.winner.decidedAt}s)`);

  // 勝者は最後まで内側にいる
  const { cx, cy, radius } = res.layout.arena;
  let outside = 0;
  for (const f of res.frames.slice(res.winnerFrame)) {
    const i = res.winner.ballIndex;
    if (Math.hypot(f.b[i * 3] - cx, f.b[i * 3 + 1] - cy) > radius) outside++;
  }
  add("勝者は決着後もアリーナ内", outside === 0, outside === 0 ? "OK" : `${outside} frames outside`);

  // 展開: 最初の脱落が早く、脱落の間隔が空きすぎない
  const times = res.eliminations.map((e) => e.t);
  add("最初の脱落が4秒以内", times[0] <= 4, `${times[0]?.toFixed(2)}s`, "warn");
  let maxGap = 0;
  for (let i = 1; i < times.length; i++) maxGap = Math.max(maxGap, times[i] - times[i - 1]);
  add("脱落の間隔が5秒以内", maxGap <= 5, `最大 ${maxGap.toFixed(2)}s`, "warn");

  return checks;
};

export const passed = (checks: Check[]) => checks.every((c) => c.ok || c.severity === "warn");

export const printChecks = (checks: Check[]) => {
  for (const c of checks) {
    const mark = c.ok ? "✔" : c.severity === "error" ? "✘" : "△";
    console.log(`  ${mark} ${c.name}: ${c.detail}`);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const seed = intArg(args, "seed", SIMULATION.seed);
  console.log(`seed ${seed} をシミュレーションして検査します`);
  const a = runSimulation({ ...SIMULATION, seed });
  const b = runSimulation({ ...SIMULATION, seed });
  const checks = evaluate(a);
  const ha = resultHash(a);
  const hb = resultHash(b);
  checks.push({ name: "同じseedで同じ結果（2回実行して比較）", ok: ha === hb, detail: `${ha} / ${hb}`, severity: "error" });
  printChecks(checks);
  console.log(`勝者: #${a.winner.ballIndex + 1} (${a.balls[a.winner.ballIndex].color})`);
  process.exit(passed(checks) ? 0 : 1);
}
