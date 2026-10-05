"""クイズ用の効果音を合成して public/sfx/ に書き出す（自作なのでそのままコミットしてよい）。

- tick.wav   … カウントダウンの「コッ」
- correct.wav … 正解発表の「ピンポーン」
- pop.wav    … 2ch風のレスが出るときの「ポンッ」
- whoosh.wav … 派手版のページ切り替えの「シュッ」
- impact.wav … 派手版の答えが出るときの「ドンッ」
- sparkle.wav … 派手版の答えのきらきら「キラッ」

使い方: python3 scripts/make_sfx.py
"""

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sfx"
RATE = 44100


def tone(freq: float, seconds: float, decay: float, gain: float) -> list[float]:
    # 基音＋倍音を指数減衰させた、ベルのような音
    n = int(RATE * seconds)
    return [
        gain
        * math.exp(-t / RATE / decay)
        * (math.sin(2 * math.pi * freq * t / RATE) + 0.3 * math.sin(4 * math.pi * freq * t / RATE))
        for t in range(n)
    ]


def pop() -> list[float]:
    # 高い音から低い音へすばやく下がる短い音
    n = int(RATE * 0.12)
    out, phase = [], 0.0
    for t in range(n):
        freq = 900 * math.exp(-t / RATE / 0.03) + 300
        phase += 2 * math.pi * freq / RATE
        out.append(0.6 * math.exp(-t / RATE / 0.04) * math.sin(phase))
    return out


def noise(n: int, seed: int) -> list[float]:
    import random

    rnd = random.Random(seed)
    return [rnd.uniform(-1, 1) for _ in range(n)]


def whoosh() -> list[float]:
    # 音量が山なりに変わるノイズを、だんだん明るくなるフィルターに通す
    n = int(RATE * 0.35)
    out, y = [], 0.0
    for t, v in enumerate(noise(n, 1)):
        p = t / n
        a = 0.03 + 0.5 * p  # フィルターがだんだん開く
        y += a * (v - y)
        out.append(0.9 * math.sin(math.pi * p) ** 1.5 * y)
    return out


def impact() -> list[float]:
    # 低い音が下がりながら消える＋最初だけノイズ
    n = int(RATE * 0.6)
    out, phase = [], 0.0
    nz = noise(n, 2)
    for t in range(n):
        freq = 40 + 90 * math.exp(-t / RATE / 0.05)
        phase += 2 * math.pi * freq / RATE
        body = math.exp(-t / RATE / 0.18) * math.sin(phase)
        hit = 0.5 * math.exp(-t / RATE / 0.015) * nz[t]
        out.append(0.85 * body + hit)
    return out


def mix(*parts: tuple[float, list[float]]) -> list[float]:
    length = max(int(start * RATE) + len(s) for start, s in parts)
    out = [0.0] * length
    for start, s in parts:
        offset = int(start * RATE)
        for i, v in enumerate(s):
            out[offset + i] += v
    return out


def write(name: str, samples: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fade = int(RATE * 0.005)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = bytearray()
        for i, v in enumerate(samples):
            v *= min(1.0, (len(samples) - i) / fade)
            frames += struct.pack("<h", int(max(-1.0, min(1.0, v)) * 32767))
        w.writeframes(bytes(frames))
    print(f"  saved {(OUT / name).relative_to(ROOT)}")


def main() -> None:
    write("tick.wav", tone(1400, 0.12, 0.025, 0.5))
    write("pop.wav", pop())
    write("whoosh.wav", whoosh())
    write("impact.wav", impact())
    write("sparkle.wav", mix(*[(i * 0.05, tone(f, 0.4, 0.12, 0.18)) for i, f in enumerate([2093, 2637, 3136, 4186])]))
    write("correct.wav", mix((0, tone(1318.5, 0.35, 0.12, 0.35)), (0.16, tone(1046.5, 0.9, 0.3, 0.35))))


if __name__ == "__main__":
    main()
