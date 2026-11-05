"""「断面図×工学の進化」シリーズの効果音を合成して public/sfx/cut_*.wav に書き出す（自作なのでコミットしてよい）。

- cut_roll.wav    … 金属の玉が転がるシャーッ（2秒ループ）
- cut_scratch.wav … ペン先が紙をこするカリカリ（2秒ループ）
- cut_flow.wav    … 液体が流れるザーッ（小さめ、3秒ループ）
- cut_whoosh.wav  … 場面転換のシュッ
- cut_clunk.wav   … 部品がはまるカチャン（金属）
- cut_crust.wav   … 乾いて固まるパリパリ
- cut_spurt.wav   … 吹き出すブシュッ
- cut_drip.wav    … しずくが落ちるピチャ
- cut_squeak.wav  … ゴムが押しつぶされるキュッ（摩擦音）
- cut_spring.wav  … バネが縮むギュイン
- cut_bubble.wav  … 空気が入るコポコポ
- cut_chime.wav   … 完成のキラーン
- cut_road.wav    … タイヤが道を転がるゴー（3秒ループ）
- cut_thump.wav   … 段差をこえるゴトン
- cut_pop.wav     … くぎが刺さるプスッ
- cut_hiss.wav    … 空気が抜けるシューッ

使い方: python3 scripts/make_cutaway_sfx.py （numpy が必要）
"""

import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sfx"
RATE = 44100
rng = np.random.default_rng(11)


def save(name, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
    print("wrote", name)


def T(sec):
    return np.arange(int(sec * RATE)) / RATE


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / RATE)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    s = T(2)
    roll = band(rng.standard_normal(len(s)), 2500, 9000) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * s) ** 2)
    ticks = np.zeros_like(s)
    ticks[rng.integers(0, len(s), 120)] = 1
    roll += band(ticks, 4000, 12000) * 6
    save("cut_roll.wav", roll, 0.5)
    sc = band(rng.standard_normal(len(s)), 800, 5000) * (0.5 + 0.5 * (np.sin(2 * np.pi * 9 * s) > 0.3))
    save("cut_scratch.wav", sc, 0.5)
    s = T(3)
    fl = band(rng.standard_normal(len(s)), 200, 2500) * (0.8 + 0.2 * np.sin(2 * np.pi * s / 1.5))
    save("cut_flow.wav", fl, 0.45)
    s = T(0.8)
    wh = band(rng.standard_normal(len(s)), 300, 4000) * np.sin(np.pi * s / 0.8) ** 2
    save("cut_whoosh.wav", wh, 0.6)
    s = T(0.45)
    cl = sum(np.sin(2 * np.pi * f * s) * np.exp(-s * d) for f, d in [(2200, 30), (3400, 45), (900, 20)]) + band(rng.standard_normal(len(s)), 1000, 8000) * np.exp(-s * 80)
    save("cut_clunk.wav", cl, 0.7)
    s = T(0.9)
    cr = np.zeros_like(s)
    for _ in range(40):
        at = rng.uniform(0, 0.7)
        cr += band(np.where((s > at) & (s < at + 0.004), 1.0, 0.0), 2000, 9000) * rng.uniform(0.3, 1)
    save("cut_crust.wav", cr, 0.6)
    s = T(1.0)
    sp = band(rng.standard_normal(len(s)), 400, 6000) * np.minimum(1, s * 30) * np.exp(-s * 4)
    save("cut_spurt.wav", sp, 0.7)
    s = T(0.3)
    f = 900 + 1400 * np.exp(-s * 25)
    dr = np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.exp(-s * 18)
    save("cut_drip.wav", dr, 0.6)
    s = T(0.7)
    f = 700 + 500 * np.sin(np.pi * s / 0.7)
    sq = np.sin(2 * np.pi * np.cumsum(f) / RATE) * (0.6 + 0.4 * np.sin(2 * np.pi * 40 * s)) * np.sin(np.pi * s / 0.7)
    save("cut_squeak.wav", sq, 0.45)
    s = T(0.9)
    f = 180 + 140 * s
    spg = np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.sin(2 * np.pi * 22 * s) * np.exp(-s * 2.5) + band(rng.standard_normal(len(s)), 2000, 6000) * np.exp(-s * 6) * 0.3
    save("cut_spring.wav", spg, 0.6)
    s = T(1.3)
    bb = np.zeros_like(s)
    for k in range(7):
        at = 0.1 + k * 0.16 + rng.uniform(0, 0.05)
        u = s - at
        f0 = rng.uniform(300, 600)
        bb += np.where(u > 0, np.sin(2 * np.pi * (f0 * u + 900 * u * u)) * np.exp(-u * 30), 0)
    save("cut_bubble.wav", bb, 0.6)
    s = T(2.2)
    ch = sum(np.sin(2 * np.pi * f * s) * a * np.exp(-s * d) for f, a, d in [(1568, 1, 2), (2093, 0.7, 2.4), (2637, 0.5, 2.8), (3136, 0.3, 3.5)])
    save("cut_chime.wav", ch, 0.5)
    s = T(3)
    road = band(rng.standard_normal(len(s)), 60, 700) * (0.85 + 0.15 * np.sin(2 * np.pi * 3 * s)) + band(rng.standard_normal(len(s)), 1500, 4000) * 0.15
    save("cut_road.wav", road, 0.5)
    s = T(0.5)
    th = np.sin(2 * np.pi * (70 * s - 40 * s * s)) * np.exp(-s * 14) + band(rng.standard_normal(len(s)), 80, 900) * np.exp(-s * 25) * 0.6
    save("cut_thump.wav", th, 0.8)
    s = T(0.4)
    pop = band(rng.standard_normal(len(s)), 600, 6000) * np.exp(-s * 40) + np.sin(2 * np.pi * 300 * s) * np.exp(-s * 30) * 0.5
    save("cut_pop.wav", pop, 0.7)
    s = T(2.5)
    hiss = band(rng.standard_normal(len(s)), 2500, 11000) * np.minimum(1, s * 12) * np.exp(-s * 0.7)
    save("cut_hiss.wav", hiss, 0.6)


if __name__ == "__main__":
    main()
