"""ショート用の効果音（ぽこっ・シュッ・ポーン・ドン・レジ音）を合成して public/shorts/common/sfx/ に書き出す。
外部素材を使わずに作るので、ライセンスを気にせずコミットできる。
「耳が痛い」とのフィードバックを受け、低めの音程・ローパス・最大 -6dB にしている。

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


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """1次のローパス（高い成分を削って耳に痛くない音にする）"""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def save(name: str, x: np.ndarray, out: Path, peak: float = 0.5) -> None:
    # 最大音量を抑えめ（-6dB）にそろえる
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    y = (np.stack([x, x], 1) * 32767).astype(np.int16)
    with wave.open(str(out / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(y.tobytes())


def pop() -> np.ndarray:
    """やわらかい「ぽこっ」：低めの音程、立ち上がりを丸めて、高音を削る"""
    tt = t(0.16)
    f = 420 * np.exp(-tt * 18) + 220
    ph = 2 * np.pi * np.cumsum(f) / SR
    return lowpass(env(np.sin(ph), 0.006, 0.045), 1800)


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
    """やわらかい「ポーン」：低めの音程で、高い倍音はすぐ消える"""
    tt = t(0.9)
    x = np.sin(2 * np.pi * 784 * tt) * np.exp(-tt / 0.32)
    x += 0.35 * np.sin(2 * np.pi * 1176 * tt) * np.exp(-tt / 0.12)
    x += 0.12 * np.sin(2 * np.pi * 1568 * tt) * np.exp(-tt / 0.06)
    return lowpass(env(x, 0.008, 10), 2500)


def stamp() -> np.ndarray:
    tt = t(0.4)
    f = 140 * np.exp(-tt * 10) + 45
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    click = rng.normal(size=len(tt)) * np.exp(-tt * 120)
    return env(body, 0.001, 0.12) + 0.4 * click


def register() -> np.ndarray:
    """レジ音：やわらかいベル＋控えめなコイン"""
    a = ding()[: int(SR * 0.6)]
    tt = t(0.6)
    coins = np.zeros_like(tt)
    for st in [0.0, 0.07, 0.13]:
        i = int(st * SR)
        c = env(np.sin(2 * np.pi * (1400 + 200 * rng.random()) * t(0.6 - st)), 0.003, 0.04)
        coins[i:] += c
    return lowpass(0.7 * a + 0.35 * coins, 2500)


def main() -> None:
    out = ROOT / "public" / "shorts" / "common" / "sfx"
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in [("pop", pop), ("whoosh", whoosh), ("ding", ding), ("stamp", stamp), ("register", register)]:
        save(name, fn(), out)
        print("saved", name)


if __name__ == "__main__":
    main()
