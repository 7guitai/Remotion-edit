// 指数関数エスカレーション型の動画の読み上げを VOICEVOX で作る。
// 台本（src/escalation/*Spec.ts）の theme と captions を読み、public/voice/<id>/000.wav〜 と、
// 群衆の声 shout0.wav〜 を書き出す。長さ（秒）は src/escalation/voice/<id>.json に保存（タイミング合わせに使う）
//
// 使い方（VOICEVOX を http://127.0.0.1:50021 で起動しておく）:
//   node_modules/.bin/esbuild scripts/escalation_voice.ts --bundle --platform=node --outfile=/tmp/ev.js && node /tmp/ev.js escalate-fan-short
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { FAN_SPEC } from "../src/escalation/fanSpec";
import { EscalationSpec } from "../src/escalation/types";

const SPECS: Record<string, EscalationSpec> = { [FAN_SPEC.id]: FAN_SPEC };
const URL = "http://127.0.0.1:50021";
// 群衆の声（台本の shouts の順）：話者と言葉
const SHOUTS: [number, string][] = [
  [13, "うわっ！"],
  [8, "にげろー！"],
];

const synth = async (text: string, speaker: number, speed: number) => {
  const q = await (await fetch(`${URL}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, { method: "POST" })).json();
  q.speedScale = speed;
  q.prePhonemeLength = 0.05;
  q.postPhonemeLength = 0.08;
  q.outputSamplingRate = 44100;
  const wav = Buffer.from(await (await fetch(`${URL}/synthesis?speaker=${speaker}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) })).arrayBuffer());
  // WAV の長さ（データの大きさ ÷ 1秒あたりのバイト数）
  const byteRate = wav.readUInt32LE(28);
  const dataSize = wav.readUInt32LE(40);
  return { wav, seconds: dataSize / byteRate };
};

const main = async () => {
  const id = process.argv[2] ?? FAN_SPEC.id;
  const spec = SPECS[id];
  const root = join(__dirname, "..");
  const dir = join(process.cwd(), "public", "voice", id);
  mkdirSync(dir, { recursive: true });
  const { speaker, speed } = spec.voice;
  const theme = await synth(spec.themeSpeech, speaker, speed);
  writeFileSync(join(dir, "000.wav"), theme.wav);
  const captions: number[] = [];
  for (const [i, c] of spec.captions.entries()) {
    const text = c.speech ?? c.text.replace(/\n/g, "");
    if (text === "-") {
      captions.push(0);
      continue;
    }
    const r = await synth(text, speaker, speed);
    writeFileSync(join(dir, `${String(i + 1).padStart(3, "0")}.wav`), r.wav);
    captions.push(Number(r.seconds.toFixed(3)));
    console.log(`${String(i + 1).padStart(3, "0")}.wav ${r.seconds.toFixed(2)}s  ${text}`);
  }
  const shouts: number[] = [];
  for (const [k, s] of spec.shouts.entries()) {
    const [sp, word] = SHOUTS[k % SHOUTS.length];
    const r = await synth(word, sp, 1.1);
    writeFileSync(join(dir, `${s.file}.wav`), r.wav);
    shouts.push(Number(r.seconds.toFixed(3)));
  }
  writeFileSync(join(process.cwd(), "src", "escalation", "voice", `${id}.json`), JSON.stringify({ theme: Number(theme.seconds.toFixed(3)), captions, shouts }, null, 1) + "\n");
  void root;
  console.log("done");
};

main();
