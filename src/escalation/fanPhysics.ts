// 「扇風機の風が1秒ごとに2倍になったら？」の物理モデル。
// メインの物理量は風の圧力（動圧）P = P0 × 2^t。
//  - 風の速さ：P = ½ρv² から。光速に近づくと頭打ちになるよう、相対論の形 β = √(k/(1+k))（k = 2P/ρc²）にする
//  - 押す力（推力）：F = 2PA（風の運動量の流れ ρv²A）。扇風機は魔法で固定、反動は地面＝地球が受ける
//  - 地球の自転：扇風機は西向きに吹くので、反動で地球は東向き（自転の向き）に押される。
//    角運動量 L = R∫F dt を、地球の慣性モーメント I に足していく。赤道の速さも光速の手前で頭打ちにする

export const RHO = 1.2; // 空気の密度 kg/m³
export const C = 299792458;
export const AREA = Math.PI * 0.2 * 0.2; // 扇風機の羽根（直径40cm）
export const P0 = 9.6; // 風速4m（そよ風）の動圧 Pa
export const R_EARTH = 6.371e6;
export const I_EARTH = 8.04e37; // kg·m²
export const OMEGA0 = (2 * Math.PI) / 86400; // 1日24時間
export const L_SUN = 3.828e26; // 太陽の明るさ W
export const BREAKUP_DAY = 2 * Math.PI * Math.sqrt(R_EARTH ** 3 / 3.986e14); // 赤道で遠心力が重力に並ぶ1日の長さ（約84分）

export const pressure = (t: number) => P0 * 2 ** t;
export const force = (t: number) => 2 * pressure(t) * AREA;

// 風の速さ（m/s）
export const windBeta = (t: number) => {
  const k = (2 * pressure(t)) / (RHO * C * C);
  return Math.sqrt(k / (1 + k));
};
export const windSpeed = (t: number) => windBeta(t) * C;

// 反動で増えた角速度（rad/s）と、光速の頭打ちを考えない角速度
const dOmega = (t: number) => (R_EARTH * 2 * P0 * AREA * (2 ** t - 1)) / Math.LN2 / I_EARTH;
const omegaNaive = (t: number) => OMEGA0 + dOmega(t);
// 赤道の速さ（光速の何倍か）。x/√(1+x²) で光速の手前で頭打ち
export const equatorBeta = (t: number) => {
  const x = (omegaNaive(t) * R_EARTH) / C;
  return x / Math.sqrt(1 + x * x);
};
export const omega = (t: number) => (equatorBeta(t) * C) / R_EARTH;
export const dayLength = (t: number) => (2 * Math.PI) / omega(t);
// 1日が何秒短くなったか
// （引き算だと桁落ちするので、増えた角速度から求める）
export const dayShorter = (t: number) => {
  const d = dOmega(t);
  return d < 1e-3 * OMEGA0 ? (86400 * d) / OMEGA0 : 86400 - dayLength(t);
};
// 風のエネルギー（毎秒）が太陽の何個ぶんか（光速に近い風のエネルギーの流れ ≒ 押す力 × 光速）
export const sunsAt = (t: number) => (force(t) * windSpeed(t)) / L_SUN;

// 地球の回転角（rad）。数値積分した表を使う（光速の頭打ちがあるので式で積分しにくい）
const TABLE_DT = 1 / 120;
let table: Float64Array | null = null;
export const earthAngle = (t: number) => {
  if (!table) {
    const n = Math.ceil(130 / TABLE_DT) + 2;
    table = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const a = (i - 1) * TABLE_DT;
      table[i] = table[i - 1] + 0.5 * (omega(a) + omega(a + TABLE_DT)) * TABLE_DT;
    }
  }
  const x = Math.max(0, t) / TABLE_DT;
  const i = Math.min(table.length - 2, Math.floor(x));
  return table[i] + (table[i + 1] - table[i]) * (x - i);
};

// t の目安（字幕を置くために逆算したもの）
export const tWhenPressure = (p: number) => Math.log2(p / P0);
export const tWhenSpeed = (v: number) => tWhenPressure(0.5 * RHO * v * v);
