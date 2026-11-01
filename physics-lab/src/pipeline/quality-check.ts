import { pathToFileURL } from "node:url";
import { SIMULATION, configFor } from "../config/physics";
import { runSimulation } from "../physics/simulation";
import type { SimulationResult } from "../physics/types";
import { intArg, modeArg, parseArgs } from "./args";
import { resultHash } from "./files";

export type Check = { name: string; ok: boolean; detail: string; severity: "error" | "warn" };

/** シミュレーション結果を検査する。severity=error が1つでもあれば不採用 */
export const evaluate = (res: SimulationResult): Check[] => {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail: string, severity: Check["severity"] = "error") =>
    checks.push({ name, ok, detail, severity });
  const { fps, config } = res;
  const n = res.balls.length;

  if (res.mode === "takeover") return evaluateTakeover(res, add);

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

  add("勝者は決着後も安全な場所にいる", res.winnerSafe, res.winnerSafe ? "OK" : "同時脱落で勝者の位置が飛んだ／落ちた床の上にいる");

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
  const mode = modeArg(args);
  console.log(`${mode} / seed ${seed} をシミュレーションして検査します`);
  const a = runSimulation(configFor(mode, seed));
  const b = runSimulation(configFor(mode, seed));
  const checks = evaluate(a);
  const ha = resultHash(a);
  const hb = resultHash(b);
  checks.push({ name: "同じseedで同じ結果（2回実行して比較）", ok: ha === hb, detail: `${ha} / ${hb}`, severity: "error" });
  printChecks(checks);
  console.log(`勝者: #${a.winner.ballIndex + 1} (${a.balls[a.winner.ballIndex].team})`);
  process.exit(passed(checks) ? 0 : 1);
}

/** takeover: 誰も脱落しないので、色の変化で検査する */
function evaluateTakeover(res: SimulationResult, add: (name: string, ok: boolean, detail: string, severity?: Check["severity"]) => void): Check[] {
  const checks: Check[] = [];
  const push = (name: string, ok: boolean, detail: string, severity: Check["severity"] = "error") => {
    checks.push({ name, ok, detail, severity });
    add(name, ok, detail, severity);
  };
  const { fps, config } = res;
  const tk = res.takeover!;
  const n = res.balls.length;
  push("フレーム数", res.frames.length === fps * config.durationSeconds, `${res.frames.length} frames`);
  let bad = 0;
  for (const f of res.frames) for (let i = 0; i < n; i++) if (!Number.isFinite(f.b[i * 3]) || !Number.isFinite(f.b[i * 3 + 1])) bad++;
  push("座標が有限", bad === 0, bad === 0 ? "OK" : `${bad} 件`);
  const team = res.balls.map((b) => b.team as string);
  for (const c of tk.conversions) team[c.ball] = c.team;
  const final = new Set(team);
  push("最後は1色", final.size === 1, [...final].join(","));
  push("勝者（MVP）は勝った色", team[res.winner.ballIndex] === [...final][0], `#${res.winner.ballIndex + 1}`);
  push("通常決着（タイムアウトでない）", res.winner.decidedBy === "last-standing", res.winner.decidedBy);
  const winnerSec = res.winnerFrame / fps;
  push("勝者確定が動画の18〜27秒", winnerSec >= 18 && winnerSec <= 27, `${winnerSec.toFixed(2)}s (sim ${res.winner.decidedAt}s)`);
  // 序盤に色が一方的に決まらない: 10秒時点で3色以上残っている
  const at10 = res.frames.find((f) => f.t >= 10);
  push("10秒時点で3色以上残っている", (at10?.alive ?? 0) >= 3, `${at10?.alive ?? "-"} 色`, "warn");
  return checks;
}
