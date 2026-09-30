"""クイズ用の効果音を合成して public/sfx/ に書き出す（自作なのでそのままコミットしてよい）。

- tick.wav   … カウントダウンの「コッ」
- correct.wav … 正解発表の「ピンポーン」
- pop.wav    … 2ch風のレスが出るときの「ポンッ」

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
    write("correct.wav", mix((0, tone(1318.5, 0.35, 0.12, 0.35)), (0.16, tone(1046.5, 0.9, 0.3, 0.35))))


if __name__ == "__main__":
    main()
