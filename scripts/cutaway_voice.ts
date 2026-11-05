// 「断面図×工学の進化」シリーズの読み上げを VOICEVOX で作る。
// 台本（src/cutaway/*/xxxSpec.ts）の beats を読み、public/voice/<id>/000.wav〜 を書き出し、
// 長さ（秒）を src/cutaway/voice/<id>.json に保存する（ビートの長さ＝ナレーションの長さ）。
//   node_modules/.bin/esbuild scripts/cutaway_voice.ts --bundle --platform=node --outfile=/tmp/cv.js && node /tmp/cv.js cutaway-pen-short
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { PEN_SPEC } from "../src/cutaway/pen/penSpec";
import { CutawaySpec } from "../src/cutaway/types";
import { TIRE_SPEC } from "../src/cutaway/tire/tireSpec";

const SPECS: Record<string, CutawaySpec> = { [PEN_SPEC.id]: PEN_SPEC, [TIRE_SPEC.id]: TIRE_SPEC };
const URL = "http://127.0.0.1:50021";

const synth = async (text: string, speaker: number, speed: number) => {
  const q = await (await fetch(`${URL}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, { method: "POST" })).json();
  q.speedScale = speed;
  q.pitchScale = -0.02; // 少し低めに、落ち着いた声
  q.intonationScale = 0.95;
  q.prePhonemeLength = 0.05;
  q.postPhonemeLength = 0.08;
  q.outputSamplingRate = 44100;
  const wav = Buffer.from(await (await fetch(`${URL}/synthesis?speaker=${speaker}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) })).arrayBuffer());
  return { wav, seconds: wav.readUInt32LE(40) / wav.readUInt32LE(28) };
};

const main = async () => {
  const id = process.argv[2] ?? PEN_SPEC.id;
  const spec = SPECS[id];
  const dir = join(process.cwd(), "public", "voice", id);
  mkdirSync(dir, { recursive: true });
  const durations: number[] = [];
  for (const [i, b] of spec.beats.entries()) {
    const text = b.speech ?? b.text.replace(/\n/g, "");
    const r = await synth(text, spec.voice.speaker, spec.voice.speed);
    writeFileSync(join(dir, `${String(i).padStart(3, "0")}.wav`), r.wav);
    durations.push(Number(r.seconds.toFixed(3)));
    console.log(`${String(i).padStart(3, "0")} ${r.seconds.toFixed(2)}s ${text}`);
  }
  mkdirSync(join(process.cwd(), "src", "cutaway", "voice"), { recursive: true });
  writeFileSync(join(process.cwd(), "src", "cutaway", "voice", `${id}.json`), JSON.stringify({ durations }, null, 1) + "\n");
  console.log("total", durations.reduce((a, b) => a + b, 0).toFixed(1));
};
main();
