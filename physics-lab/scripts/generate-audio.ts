/**
 * オリジナル効果音・BGMを数式で合成して public/audio/ に書き出す（外部素材を使わないので権利上の問題がない）。
 * 実行: npm run audio
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SeededRandom } from "../src/physics/seeded-random";

const SR = 44100;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/audio");
const rng = new SeededRandom(1);
const noise = () => rng.next() * 2 - 1;
const TAU = Math.PI * 2;

const buffer = (seconds: number) => new Float32Array(Math.round(seconds * SR));

const writeWav = (name: string, data: Float32Array, peak = 0.89) => {
  let max = 0;
  for (const v of data) max = Math.max(max, Math.abs(v));
  const gain = max > 0 ? peak / max : 1;
  const pcm = Buffer.alloc(44 + data.length * 2);
  pcm.write("RIFF", 0);
  pcm.writeUInt32LE(36 + data.length * 2, 4);
  pcm.write("WAVEfmt ", 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20); // PCM
  pcm.writeUInt16LE(1, 22); // mono
  pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36);
  pcm.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * gain)) * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(OUT, name), pcm);
  console.log(`  ${name} (${(data.length / SR).toFixed(2)}s, peak ${peak})`);
};

/** 短いフェードで始点・終点のクリックノイズを防ぐ */
const fadeEdges = (d: Float32Array, ms = 4) => {
  const n = Math.round((ms / 1000) * SR);
  for (let i = 0; i < n && i < d.length; i++) {
    d[i] *= i / n;
    d[d.length - 1 - i] *= i / n;
  }
  return d;
};

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5));
const square = (ph: number) => (ph % 1 < 0.5 ? 1 : -1);

// --- collision: 短く硬い「カチッ」 ---
const collision = () => {
  const d = buffer(0.09);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 60);
    d[i] = env * (0.7 * Math.sin(TAU * 1250 * t) + 0.35 * Math.sin(TAU * 2900 * t)) + 0.25 * noise() * Math.exp(-t * 200);
  }
  return fadeEdges(d);
};

// --- elimination: 下降するザップ音 ---
const elimination = () => {
  const d = buffer(0.42);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 900 * Math.exp(-t * 6) + 90;
    ph += f / SR;
    const env = Math.min(1, t * 200) * Math.exp(-t * 6);
    d[i] = env * (0.55 * square(ph) * 0.5 + 0.5 * Math.sin(TAU * ph)) + 0.08 * noise() * Math.exp(-t * 30);
  }
  return fadeEdges(d);
};

// --- pulse: 衝撃波の「ドゥン」（低いキック＋空気の抜ける音） ---
const pulse = () => {
  const d = buffer(0.35);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    ph += (45 + 140 * Math.exp(-t * 25)) / SR;
    d[i] = Math.sin(TAU * ph) * Math.exp(-t * 9) + 0.18 * noise() * Math.exp(-t * 18) * Math.min(1, t * 400);
  }
  return fadeEdges(d);
};

// --- countdown / go ---
const beep = (freq: number, seconds: number, chord: number[] = [1]) => {
  const d = buffer(seconds);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 300) * Math.exp(-t * (4 / seconds));
    d[i] = env * chord.reduce((s, k) => s + Math.sin(TAU * freq * k * t) + 0.25 * square(freq * k * t), 0) / chord.length;
  }
  return fadeEdges(d);
};

// --- victory: 上昇アルペジオ＋和音 ---
const victory = () => {
  const d = buffer(2.6);
  const notes = [69, 73, 76, 81]; // A major
  notes.forEach((n, k) => {
    const start = k * 0.11;
    for (let i = Math.round(start * SR); i < d.length; i++) {
      const t = i / SR - start;
      const env = Math.min(1, t * 80) * Math.exp(-t * (k === 3 ? 1.2 : 3));
      const f = midi(n + 12);
      d[i] += env * (0.6 * saw(f * t) * 0.4 + Math.sin(TAU * f * t) * 0.6 + 0.3 * Math.sin(TAU * f * 2.003 * t));
    }
  });
  // 最後の和音
  for (let i = Math.round(0.45 * SR); i < d.length; i++) {
    const t = i / SR - 0.45;
    const env = Math.min(1, t * 20) * Math.exp(-t * 1.1);
    d[i] += env * 0.5 * [57, 64, 69, 73].reduce((s, n) => s + Math.sin(TAU * midi(n) * t) + 0.2 * saw(midi(n) * 1.002 * t), 0);
  }
  return fadeEdges(d, 20);
};

// --- BGM: 120BPM のシンセウェーブ風ループ（30秒） ---
const bgm = () => {
  const seconds = 30;
  const d = buffer(seconds);
  const bpm = 120;
  const beat = 60 / bpm;
  const progression = [57, 53, 60, 55]; // A, F, C, G（ルート音）
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const b = t / beat;
    const bar = Math.floor(b / 4);
    const root = progression[bar % 4];
    const inBeat = b % 1;
    const tb = inBeat * beat;
    // キック
    let v = 0.9 * Math.sin(TAU * (50 + 90 * Math.exp(-tb * 30)) * tb) * Math.exp(-tb * 9);
    // ハイハット（裏拍）
    const off = (b + 0.5) % 1;
    v += 0.12 * noise() * Math.exp(-off * beat * 60);
    // ベース（8分音符のオクターブ）
    const eighth = Math.floor(b * 2);
    const bassNote = root - 24 + (eighth % 2 === 0 ? 0 : 12);
    const te = ((b * 2) % 1) * (beat / 2);
    v += 0.32 * saw(midi(bassNote) * t) * Math.exp(-te * 7);
    // アルペジオ（16分）
    const six = Math.floor(b * 4);
    const arp = [0, 7, 12, 16, 12, 7][six % 6];
    const ts = ((b * 4) % 1) * (beat / 4);
    v += 0.1 * square(midi(root + 12 + arp) * t) * Math.exp(-ts * 18);
    // パッド
    v += 0.06 * [0, 3, 7].reduce((s, k) => s + saw(midi(root + k) * 1.001 * t) + saw(midi(root + k) * 0.999 * t), 0);
    d[i] = v;
  }
  return fadeEdges(d, 400);
};

fs.mkdirSync(OUT, { recursive: true });
console.log("public/audio/ に書き出し:");
writeWav("collision.wav", collision());
writeWav("elimination.wav", elimination());
writeWav("pulse.wav", pulse());
writeWav("countdown.wav", beep(880, 0.16));
writeWav("go.wav", beep(1320, 0.45, [1, 1.5, 2]));
writeWav("victory.wav", victory());
writeWav("bgm.wav", bgm(), 0.7);
