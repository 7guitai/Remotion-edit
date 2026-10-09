// 指定したフレームの静止画をまとめて書き出す（ブラウザを1回だけ起動するので速い）。仕上がりの確認用
// 使い方: node scripts/render_stills.mjs <コンポジションID> <フレーム番号のJSON配列ファイル> <出力フォルダ> [倍率]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
const [, , id, framesFile, outDir, scale = "0.3"] = process.argv;
const frames = JSON.parse(fs.readFileSync(framesFile, "utf8"));
const serveUrl = await bundle({ entryPoint: new URL("../src/index.ts", import.meta.url).pathname });
const browser = await openBrowser("chrome", { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE, chromiumOptions: { gl: "swangle" } });
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions: { gl: "swangle" } });
fs.mkdirSync(outDir, { recursive: true });
for (const f of frames) {
  const out = `${outDir}/f${String(f).padStart(6, "0")}.png`;
  await renderStill({ composition, serveUrl, frame: f, output: out, scale: Number(scale), puppeteerInstance: browser, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 120000 });
  process.stdout.write(`${f} `);
}
await browser.close({ silent: true });
console.log("done");
