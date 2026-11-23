"""ショート用の効果音（ポン・シュッ・キラーン・ドン・レジ音）を合成して public/shorts/common/sfx/ に書き出す。
外部素材を使わずに作るので、ライセンスを気にせずコミットできる。

使い方: python3 scripts/make_sfx.py
"""

import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


def t(sec: float) -> np.ndarray:
    return np.arange(int(SR * sec)) / SR


def env(x: np.ndarray, attack: float, decay: float) -> np.ndarray:
    n = len(x)
    a = int(SR * attack)
    e = np.exp(-np.arange(n) / (SR * decay))
    if a:
        e[:a] *= np.linspace(0, 1, a)
    return x * e


def save(name: str, x: np.ndarray, out: Path) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    y = (np.stack([x, x], 1) * 32767).astype(np.int16)
    with wave.open(str(out / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(y.tobytes())


def pop() -> np.ndarray:
    tt = t(0.12)
    f = 900 * np.exp(-tt * 25) + 380
    ph = 2 * np.pi * np.cumsum(f) / SR
    return env(np.sin(ph), 0.002, 0.035)


def whoosh() -> np.ndarray:
    tt = t(0.35)
    n = rng.normal(size=len(tt))
    # 帯域を上げていくノイズ（簡易フィルタ: 移動平均の幅を変える）
    out = np.zeros_like(n)
    for i, k in enumerate(np.linspace(40, 4, 8).astype(int)):
        seg = slice(i * len(n) // 8, (i + 1) * len(n) // 8)
        out[seg] = np.convolve(n, np.ones(k) / k, "same")[seg]
    shape = np.sin(np.pi * np.linspace(0, 1, len(tt))) ** 2
    return out * shape


def ding() -> np.ndarray:
    tt = t(0.9)
    x = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(1568, 1), (2349, 0.5), (3136, 0.3), (4699, 0.15)])
    return env(x, 0.003, 0.25)


def stamp() -> np.ndarray:
    tt = t(0.4)
    f = 140 * np.exp(-tt * 10) + 45
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    click = rng.normal(size=len(tt)) * np.exp(-tt * 120)
    return env(body, 0.001, 0.12) + 0.4 * click


def register() -> np.ndarray:
    a = ding()[: int(SR * 0.6)]
    tt = t(0.6)
    coins = np.zeros_like(tt)
    for st in [0.0, 0.07, 0.13]:
        i = int(st * SR)
        c = env(np.sin(2 * np.pi * (2600 + 400 * rng.random()) * t(0.6 - st)), 0.001, 0.05)
        coins[i:] += c
    return 0.6 * a + 0.7 * coins


def main() -> None:
    out = ROOT / "public" / "shorts" / "common" / "sfx"
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in [("pop", pop), ("whoosh", whoosh), ("ding", ding), ("stamp", stamp), ("register", register)]:
        save(name, fn(), out)
        print("saved", name)


if __name__ == "__main__":
    main()
