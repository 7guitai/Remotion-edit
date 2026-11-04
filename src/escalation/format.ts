// 桁に応じて単位を自動で切り替えるフォーマッタ（HUD 用）

const sig = (x: number, digits = 3) => {
  // 有効数字 digits 桁（小数点以下の0は残す：1.00、12.3、123）
  const d = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(x) || 1)));
  return x.toFixed(Math.min(d, 3));
};

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
export const sci = (x: number, unit: string) => {
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  return `${m.toFixed(2)}×10${String(e).split("").map((c) => SUP[c]).join("")} ${unit}`;
};

// 圧力：Pa → kPa → MPa → GPa → 1.00×10¹² Pa
export const formatPressure = (p: number) => {
  if (p < 1e3) return `${sig(p)} Pa`;
  if (p < 1e6) return `${sig(p / 1e3)} kPa`;
  if (p < 1e9) return `${sig(p / 1e6)} MPa`;
  if (p < 1e12) return `${sig(p / 1e9)} GPa`;
  return sci(p, "Pa");
};

// 力：N → トン（重さに直す）→ 万トン → 億トン → 指数
export const formatForceTon = (f: number) => {
  const t = f / 9.8 / 1000;
  if (t < 1) return `${sig(t * 1000)} kg`;
  if (t < 1e4) return `${sig(t)} トン`;
  if (t < 1e8) return `${sig(t / 1e4)} 万トン`;
  if (t < 1e12) return `${sig(t / 1e8)} 億トン`;
  return sci(t, "トン");
};

const C = 299792458;
// 速さ：秒速 2.3m → 秒速 42.3km → 光速の1.136%（光速に近づくと 99.99…%）
export const formatSpeed = (v: number) => {
  const b = v / C;
  if (b >= 0.01) {
    if (b > 0.9999999) return "光速の99.99999…%";
    if (b > 0.9999) return `光速の${(b * 100).toFixed(5)}%`;
    if (b > 0.99) return `光速の${(b * 100).toFixed(3)}%`;
    return `光速の${(b * 100).toFixed(b < 0.1 ? 3 : 2)}%`;
  }
  if (v < 1000) return `秒速 ${sig(v)}m`;
  return `秒速 ${sig(v / 1000)}km`;
};

// 時間の長さ：1日の長さ 24時間00分 → 84分00秒 → 2.45秒 → 0.134秒
export const formatDuration = (s: number) => {
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s - h * 3600) / 60);
    return `${h}時間${String(m).padStart(2, "0")}分`;
  }
  if (s >= 60) {
    const m = Math.floor(s / 60);
    return `${m}分${String(Math.floor(s - m * 60)).padStart(2, "0")}秒`;
  }
  if (s >= 1) return `${s.toFixed(2)}秒`;
  return `${s.toFixed(3)}秒`;
};

// ごく短い時間：ナノ秒・マイクロ秒など（「1日が2.45ナノ秒 短く」）
export const formatTiny = (s: number) => {
  const units: [number, string][] = [
    [1, "秒"],
    [1e-3, "ミリ秒"],
    [1e-6, "マイクロ秒"],
    [1e-9, "ナノ秒"],
    [1e-12, "ピコ秒"],
    [1e-15, "フェムト秒"],
  ];
  for (const [u, name] of units) if (s >= u) return `${sig(s / u)}${name}`;
  return sci(s, "秒");
};

// 大きな数を「兆」「京」などで（太陽の何個ぶん）
export const formatJaBig = (x: number) => {
  const units: [number, string][] = [
    [1e20, "垓"],
    [1e16, "京"],
    [1e12, "兆"],
    [1e8, "億"],
    [1e4, "万"],
  ];
  for (const [u, name] of units) if (x >= u) return `${Math.round(x / u).toLocaleString("ja-JP")}${name}`;
  return Math.round(x).toLocaleString("ja-JP");
};

// 日本の数の単位で有効数字3桁（5000 → 5000、1.23万、45.6億 … 秭・穣・溝・澗・正まで）
const JA_UNITS: [number, string][] = [
  [1e40, "正"],
  [1e36, "澗"],
  [1e32, "溝"],
  [1e28, "穣"],
  [1e24, "秭"],
  [1e20, "垓"],
  [1e16, "京"],
  [1e12, "兆"],
  [1e8, "億"],
  [1e4, "万"],
];
export const formatJaSig = (x: number) => {
  for (const [u, name] of JA_UNITS) if (x >= u) return `${sig(x / u)}${name}`;
  return x >= 1000 ? Math.round(x).toString() : sig(x);
};
// 電力：W → kW → 万kW → 億kW → 兆kW …（発電所や電気の量にくらべやすい）
export const formatPowerJa = (w: number) => (w < 1e3 ? `${sig(w)} W` : `${formatJaSig(w / 1e3)} kW`);
