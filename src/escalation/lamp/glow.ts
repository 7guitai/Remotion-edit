import * as THREE from "three";

// 熱で光る色（黒体放射のおおまかな色）。約500℃から暗い赤 → オレンジ → 黄 → 白
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sstep = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
export const glowColor = (T0: number, scale = 1): [number, number, number] => {
  const T = T0 / scale;
  const x = clamp01((T - 800) / 2700);
  return [1, 0.08 + 0.85 * sstep(0, 0.6, x), 0.9 * sstep(0.35, 1, x)];
};
export const glowStrength = (T0: number, scale = 1) => {
  const T = T0 / scale;
  return sstep(740, 1100, T) * 1.3 * (T / 1100) ** 4;
};

const GLSL = `
uniform float uP; uniform vec3 uLamp; uniform float uCosY; uniform float uGlow; uniform float uTScale;
varying vec3 vWPos;
vec3 lampGlow(){
  vec3 dd = vWPos - uLamp;
  float r2 = max(dot(dd, dd), 0.25);
  float E = uP / (12.566 * r2);
  E *= mix(1.0, abs(dd.y) / sqrt(r2), uCosY);
  float T = pow(E / 5.670374e-8 + 6.88e9, 0.25) / uTScale;
  float x = clamp((T - 800.0) / 2700.0, 0.0, 1.0);
  vec3 c = vec3(1.0, 0.08 + 0.85 * smoothstep(0.0, 0.6, x), 0.9 * smoothstep(0.35, 1.0, x));
  return c * smoothstep(740.0, 1100.0, T) * 1.3 * pow(T / 1100.0, 4.0) * uGlow;
}
`;

// 標準のマテリアルに「街灯の光で熱くなって光る」を足す（位置から光の強さを計算）
export type GlowUniforms = { uP: { value: number }; uLamp: { value: THREE.Vector3 }; uCosY: { value: number }; uGlow: { value: number }; uTScale: { value: number } };
export const makeGlowUniforms = (lamp: THREE.Vector3, cosY: number): GlowUniforms => ({ uP: { value: 0 }, uLamp: { value: lamp }, uCosY: { value: cosY }, uGlow: { value: 1 }, uTScale: { value: 1 } });
export const addGlow = (mat: THREE.MeshStandardMaterial, u: GlowUniforms) => {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 lwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lwp = instanceMatrix * lwp;
        #endif
        vWPos = (modelMatrix * lwp).xyz;`,
      );
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += lampGlow();");
  };
  mat.customProgramCacheKey = () => "lampGlow";
  return mat;
};

// 見た目の温度のものさし：向かいの壁がいちばん熱く見えても約2300℃の色になるよう、それより熱い時は全体をちぢめる
// （本当はどれも白く光ってしまうので、近い所ほど白・遠い所ほど赤、の差を残す）
export const tempScale = (Tfront: number) => Math.max(1, Tfront / 2600);
