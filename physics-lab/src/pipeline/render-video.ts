import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { SimulationResult } from "../physics/types";
import { ROOT } from "./files";
import type { Check } from "./quality-check";
import { DEFAULT_STYLE } from "../styles/presets";
import type { StyleId } from "../styles/types";

const COMPOSITION_ID = "LastBallStanding";

let bundled: Promise<string> | null = null;
/** Remotionのバンドルは1回だけ作って使い回す */
const getBundle = () => {
  bundled ??= bundle({ entryPoint: path.join(ROOT, "src/index.ts"), onProgress: () => undefined });
  return bundled;
};

const gitCommit = (): string | null => {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
};

export const renderSeed = async (opts: {
  sim: SimulationResult;
  hash: string;
  checks: Check[];
  outFile: string;
  style?: StyleId;
}): Promise<{ outFile: string; metaFile: string }> => {
  const { sim, outFile } = opts;
  const serveUrl = await getBundle();
  const inputProps = { seed: sim.config.seed, mode: sim.mode, style: opts.style ?? DEFAULT_STYLE };
  // REMOTION_BROWSER_EXECUTABLE を指定すると、既存のChrome/Chromiumを使う（未指定ならRemotionが自動でダウンロード）
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps, browserExecutable });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  let lastPct = -1;
  const started = Date.now();
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: outFile,
    inputProps,
    browserExecutable,
    imageFormat: "jpeg",
    jpegQuality: 90,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== lastPct) {
        lastPct = pct;
        process.stdout.write(`  レンダリング ${pct}%\n`);
      }
    },
  });

  const metaFile = outFile.replace(/\.mp4$/, ".json");
  const meta = {
    title: "Last Ball Standing",
    composition: COMPOSITION_ID,
    output: path.relative(ROOT, outFile),
    renderedAt: new Date().toISOString(),
    renderSeconds: Math.round((Date.now() - started) / 1000),
    video: { width: composition.width, height: composition.height, fps: composition.fps, durationInFrames: composition.durationInFrames, codec: "h264" },
    seed: sim.config.seed,
    mode: sim.mode,
    style: inputProps.style,
    simulationHash: opts.hash,
    generatorVersion: sim.generator.version,
    sourceCommit: gitCommit(),
    config: sim.config,
    course: sim.course,
    winner: { ...sim.winner, number: sim.balls[sim.winner.ballIndex].number, team: sim.balls[sim.winner.ballIndex].team, videoSeconds: sim.winnerFrame / sim.fps },
    eliminationOrder: sim.eliminations.map((e) => ({ place: e.place, number: sim.balls[e.ballIndex].number, team: sim.balls[e.ballIndex].team, t: e.t, reason: e.reason })),
    qualityChecks: opts.checks,
  };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return { outFile, metaFile };
};
