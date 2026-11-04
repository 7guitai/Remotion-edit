// 「夜の街灯の明るさが1秒ごとに2倍になったら？」の物理モデル。
// メインの物理量は明るさ（光束）L = 5000 lm × 2^t（LED の道路灯くらい）。
//  - 光のエネルギー：白色 LED の光は、光のエネルギー1Wあたり約300ルーメンとして P = L / 300（W）
//  - 光は四方八方に同じだけ出るとして、距離 d での明るさ（照度）は L/(4πd²) ルクス、光の強さは P/(4πd²) W/m²
//  - 光を受けた面の温度：吸収した光と、自分が出す熱放射（σT⁴）がつり合う温度（放射平衡）
//  - 表面が蒸発すると、その反動で押される（アブレーション）。押す力 = Cm × 受けた光のエネルギー（Cm は 3×10⁻⁵ N/W ほど）
//  - 光の半分は地面（地球）に吸いこまれる。その熱の合計を、海の蒸発・地殻がとける熱・地球がバラバラになるエネルギーとくらべる

export const L0 = 5000; // lm
export const LM_PER_W = 300; // lm/W（光のエネルギー1Wあたり）
export const SIGMA = 5.670374e-8;
export const CM = 3e-5; // N/W
export const L_SUN = 3.828e26; // 太陽の明るさ W
export const L_GALAXY = 2e10 * L_SUN; // 天の川銀河の星ぜんぶ（太陽 約200億個ぶん）
export const E_OCEAN = 1.4e21 * (4186 * 85 + 2.26e6); // 海（1.4×10²¹ kg）を15℃からすべて蒸発させる熱
export const E_CRUST = 2.6e22 * (1000 * 1200 + 4e5); // 地殻（2.6×10²² kg）を約1500℃まで熱してとかす熱
export const E_BIND = 2.49e32; // 地球がバラバラになるエネルギー（重力の結合エネルギー）
export const JAPAN_KWH = 1e12; // 日本で1年に使う電気（約1兆kWh）

export const lumen = (t: number) => L0 * 2 ** t;
export const power = (t: number) => lumen(t) / LM_PER_W;
export const lux = (t: number, d: number) => lumen(t) / (4 * Math.PI * d * d);
export const flux = (t: number, d: number) => power(t) / (4 * Math.PI * d * d);
// 光を受けた面の温度（K）。もとの温度 15℃
export const surfaceTemp = (E: number) => Math.pow(E / SIGMA + 288 ** 4, 0.25);
// 地面に吸いこまれた熱の合計（J）：光の半分 × ∫P dt
export const absorbed = (t: number) => (0.5 * power(0) * (2 ** t - 1)) / Math.LN2;
export const sunsAt = (t: number) => power(t) / L_SUN;
// 1秒ぶんの光のエネルギーが、日本で使う電気の何年ぶんか
export const japanYears = (t: number) => power(t) / (JAPAN_KWH * 3.6e6);

// t の目安（字幕を置くための逆算）
export const tWhenLux = (lx: number, d: number) => Math.log2((lx * 4 * Math.PI * d * d) / L0);
export const tWhenFlux = (E: number, d: number) => Math.log2((E * 4 * Math.PI * d * d) / power(0));
export const tWhenPower = (P: number) => Math.log2(P / power(0));
export const tWhenAbsorbed = (E: number) => Math.log2((E * Math.LN2) / (0.5 * power(0)) + 1);
