"""睡眠用の雨の音を合成して public/sfx/rain.wav に書き出す（自作なのでそのままコミットしてよい）。

ノイズをフィルターでやわらかくした「サー」という音に、ランダムな雨粒の音と
ゆっくりした強弱を重ね、最初と最後をつなげて継ぎ目なくループできるようにする。
使い方: python3 scripts/make_ambient.py
"""

import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
RATE = 32000
SECONDS = 60
FADE = 3  # ループの継ぎ目を重ねる秒数


def rain(seconds: float, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(RATE * seconds)
    white = rng.standard_normal(n)

    # 雨の「サー」：中高域を残したやわらかいノイズ
    b, a = signal.butter(2, [300, 3500], btype="band", fs=RATE)
    hiss = signal.lfilter(b, a, white)
    # 遠くの雨音：低めのこもったノイズ
    b, a = signal.butter(2, 900, btype="low", fs=RATE)
    rumble = signal.lfilter(b, a, rng.standard_normal(n))

    # ゆっくりした強弱（数秒周期）
    env = signal.lfilter(*signal.butter(1, 0.15, fs=RATE), rng.standard_normal(n))
    env = 0.8 + 0.2 * env / (np.abs(env).max() + 1e-9)

    # 雨粒：短い減衰音をランダムに置く
    drops = np.zeros(n)
    count = int(seconds * 35)
    t = np.arange(int(RATE * 0.03)) / RATE
    for _ in range(count):
        pos = rng.integers(0, n - len(t))
        freq = rng.uniform(1200, 3500)
        amp = rng.uniform(0.05, 0.35) ** 2
        drops[pos : pos + len(t)] += amp * np.exp(-t / 0.006) * np.sin(2 * np.pi * freq * t)

    mix = 0.45 * hiss / hiss.std() + 0.55 * rumble / rumble.std() + 2.0 * drops
    return mix * env


def main() -> None:
    x = rain(SECONDS + FADE)
    f = int(RATE * FADE)
    # 最後の FADE 秒を最初に重ねて、ループの継ぎ目をなくす
    ramp = np.linspace(0, 1, f)
    head = x[:f] * ramp + x[-f:] * (1 - ramp)
    loop = np.concatenate([head, x[f:-f]])
    loop = loop / np.abs(loop).max() * 0.6
    out = ROOT / "public" / "sfx" / "rain.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((loop * 32767).astype(np.int16).tobytes())
    print(f"  saved {out.relative_to(ROOT)}  {len(loop) / RATE:.1f}秒")


if __name__ == "__main__":
    main()
