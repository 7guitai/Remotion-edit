"""指数関数エスカレーション型の動画で使う効果音を合成して public/sfx/esc_*.wav に書き出す（自作なのでコミットしてよい）。

- esc_beep.wav   … カウントダウンの「ピッ」
- esc_go.wav     … スタートの「ピーッ」（高い音）
- esc_wind.wav   … 風の音（6秒でつなぎ目なくループ）
- esc_jet.wav    … 高圧の噴射の轟音（6秒ループ）
- esc_glass.wav  … 窓ガラスが割れる「ガシャーン」
- esc_boom.wav   … 音速をこえた「ドーン」
- esc_rumble.wav … 建物がくずれる「ゴゴゴゴ」
- esc_drone.wav  … 宇宙の低いうなり（8秒ループ）
- esc_night.wav  … 夜の虫の声（6秒ループ）
- esc_hum.wav    … 街灯のジーという音（4秒ループ）
- esc_crack.wav  … 窓ガラスが熱でひび割れる「ピキピキッ」
- esc_ignite.wav … 火がつく「ボッ」
- esc_fire.wav   … 燃える音（6秒ループ）
- esc_flare.wav  … まぶしく光る「キィーン」

使い方: python3 scripts/make_escalation_sfx.py （numpy が必要）
"""

import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sfx"
RATE = 44100
rng = np.random.default_rng(7)


def save(name: str, x: np.ndarray, peak: float = 0.8) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())
    print("wrote", name)


def t(sec: float) -> np.ndarray:
    return np.arange(int(sec * RATE)) / RATE


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    # 1次のローパスを2回（なめらかに）
    a = np.exp(-2 * np.pi * cutoff / RATE)
    for _ in range(2):
        y = np.empty_like(x)
        acc = 0.0
        for i in range(len(x)):
            acc = a * acc + (1 - a) * x[i]
            y[i] = acc
        x = y
    return x


def fft_filter(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    # つなぎ目のないループにするため、周波数領域で帯域だけ残す（周期的なので端が自然につながる）
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / RATE)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    s = t(0.14)
    save("esc_beep.wav", np.sin(2 * np.pi * 1000 * s) * np.minimum(1, (0.14 - s) * 60), 0.6)
    s = t(0.45)
    save("esc_go.wav", np.sin(2 * np.pi * 2000 * s) * np.minimum(1, (0.45 - s) * 20), 0.6)
    # 風：ゆっくりゆれる帯域ノイズ
    n = rng.standard_normal(6 * RATE)
    wind = fft_filter(n, 150, 1400)
    s = t(6)
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * s / 3) ** 2
    save("esc_wind.wav", wind, 0.7)
    jet = fft_filter(rng.standard_normal(6 * RATE), 60, 5000) + 0.6 * fft_filter(rng.standard_normal(6 * RATE), 30, 200)
    save("esc_jet.wav", jet, 0.75)
    # ガラス：高い音のかけらが散らばる
    s = t(1.6)
    g = np.zeros_like(s)
    for _ in range(60):
        at = rng.uniform(0, 0.9)
        f = rng.uniform(2500, 7000)
        env = np.where(s > at, np.exp(-(s - at) * rng.uniform(15, 40)), 0)
        g += np.sin(2 * np.pi * f * (s - at)) * env * rng.uniform(0.3, 1)
    g += fft_filter(rng.standard_normal(len(s)), 2000, 9000) * np.exp(-s * 6) * 0.8
    save("esc_glass.wav", g, 0.7)
    # ドーン：低い音が急に立ち上がって消える
    s = t(2.5)
    boom = np.sin(2 * np.pi * (55 * s - 8 * s * s)) * np.exp(-s * 2.2) + lowpass(rng.standard_normal(len(s)), 300) * np.exp(-s * 3) * 3
    save("esc_boom.wav", boom, 0.9)
    # ゴゴゴ：低いノイズが長く続く
    s = t(4)
    rum = lowpass(rng.standard_normal(len(s)), 120) * 6 * np.minimum(1, s * 4) * np.exp(-s * 0.6)
    rum += fft_filter(rng.standard_normal(len(s)), 300, 2500) * np.exp(-s * 1.2) * 0.4
    save("esc_rumble.wav", rum, 0.9)
    # 宇宙のうなり：低い和音＋かすかなノイズ（8秒ループ）
    s = t(8)
    drone = sum(np.sin(2 * np.pi * f * s) * a for f, a in [(55, 1), (82.5, 0.6), (110, 0.4), (165, 0.15)])
    drone *= 0.8 + 0.2 * np.sin(2 * np.pi * s / 4)
    drone += fft_filter(rng.standard_normal(len(s)), 100, 800) * 0.25
    save("esc_drone.wav", drone, 0.6)
    # 夜の虫：4.2kHz のさえずりを、間をあけてくり返す（周期6秒でつながる）
    s = t(6)
    night = np.zeros_like(s)
    for k, (f0, per, ph) in enumerate([(4200, 0.75, 0.0), (3800, 1.0, 0.3), (4600, 1.5, 0.7)]):
        gate = ((s + ph) % per) < 0.18
        trill = (np.sin(2 * np.pi * 28 * s) > 0) * gate
        night += np.sin(2 * np.pi * f0 * s) * trill * (0.6 - 0.15 * k)
    night += fft_filter(rng.standard_normal(len(s)), 200, 900) * 0.05
    save("esc_night.wav", night, 0.5)
    # 街灯のジー：120Hz の倍音（4秒ループ。整数周期なのでつながる）
    s = t(4)
    hum = sum(np.sin(2 * np.pi * 120 * k * s) / k for k in range(1, 9)) + fft_filter(rng.standard_normal(len(s)), 2000, 6000) * 0.15
    save("esc_hum.wav", hum, 0.6)
    # ひび割れ：短いパルスがパラパラと
    s = t(1.2)
    cr = np.zeros_like(s)
    for _ in range(26):
        at = rng.uniform(0, 0.8) ** 1.6
        env = np.where(s > at, np.exp(-(s - at) * rng.uniform(60, 140)), 0)
        cr += np.sin(2 * np.pi * rng.uniform(1800, 5200) * (s - at)) * env * rng.uniform(0.3, 1)
    save("esc_crack.wav", cr, 0.7)
    # 火がつく：低いボッ＋ノイズの立ち上がり
    s = t(1.5)
    ig = lowpass(rng.standard_normal(len(s)), 500) * 4 * np.minimum(1, s * 12) * np.exp(-s * 2.5) + np.sin(2 * np.pi * (80 * s - 20 * s * s)) * np.exp(-s * 5)
    save("esc_ignite.wav", ig, 0.8)
    # 燃える音：低いゴーと、パチパチ（6秒ループ）
    s = t(6)
    fire = fft_filter(rng.standard_normal(len(s)), 80, 700) * 0.8
    idx = rng.integers(0, len(s), 90)
    pops = np.zeros_like(s)
    pops[idx] = rng.uniform(0.5, 1.5, 90)
    pops = np.real(np.fft.ifft(np.fft.fft(pops) * np.fft.fft(np.exp(-np.arange(len(s)) / RATE * 400) * np.sin(2 * np.pi * 2500 * np.arange(len(s)) / RATE))))
    fire += pops * 2
    save("esc_fire.wav", fire, 0.7)
    # キィーン：高い音が重なって明るくなる
    s = t(3)
    fl = sum(np.sin(2 * np.pi * f * s + 3 * np.sin(2 * np.pi * 5 * s)) * a for f, a in [(1320, 1), (1980, 0.6), (2640, 0.4), (660, 0.5)])
    fl *= np.minimum(1, s * 3) * np.exp(-s * 0.9)
    fl += fft_filter(rng.standard_normal(len(s)), 3000, 12000) * np.exp(-s * 2) * 0.3
    save("esc_flare.wav", fl, 0.55)


if __name__ == "__main__":
    main()
