"""クイズ用の効果音を合成して public/sfx/ に書き出す（自作なのでそのままコミットしてよい）。

- tick.wav   … カウントダウンの「コッ」
- correct.wav … 正解発表の「ピンポーン」
- pop.wav    … 2ch風のレスが出るときの「ポンッ」
- whoosh.wav … 派手版のページ切り替えの「シュッ」
- impact.wav … 派手版の答えが出るときの「ドンッ」
- sparkle.wav … 派手版の答えのきらきら「キラッ」
- thud1〜3.wav … 物理シミュレーションで人が地面にぶつかる「ドサッ」（毎回同じ音にならないよう高さ違いを3つ）
- tok.wav    … ボールが地面ではねる「トッ」
- clack.wav  … コーンが車に当たる・倒れる「カコン」
- boing.wav  … トランポリンではねる「ボヨン」（低い音が上がりながら、ゆれる）
- crack.wav  … 卵が割れる「グシャ」
- plop.wav   … 水に物が落ちる「チャポン」

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


def thud(pitch: float = 1.0, seed: int = 3) -> list[float]:
    # こもった低い音＋短くこすれるノイズ（布や体が地面に当たる感じ）
    n = int(RATE * 0.3)
    out, phase, y = [], 0.0, 0.0
    nz = noise(n, seed)
    for t in range(n):
        freq = pitch * (50 + 60 * math.exp(-t / RATE / 0.025))
        phase += 2 * math.pi * freq / RATE
        body = math.exp(-t / RATE / 0.06) * math.sin(phase)
        y += 0.08 * (nz[t] - y)  # ノイズをこもらせる
        rustle = 1.2 * math.exp(-t / RATE / 0.03) * y
        out.append(0.7 * body + rustle)
    return normalize(out, 0.6)


def tok() -> list[float]:
    # ゴムのボールがはねる、短く高めの「トッ」
    n = int(RATE * 0.12)
    out, phase = [], 0.0
    for t in range(n):
        freq = 260 + 180 * math.exp(-t / RATE / 0.01)
        phase += 2 * math.pi * freq / RATE
        out.append(math.exp(-t / RATE / 0.025) * math.sin(phase))
    return normalize(out, 0.5)


def clack() -> list[float]:
    # 中が空洞のプラスチックが当たる「カコン」（いくつかの共鳴を重ねる）
    n = int(RATE * 0.25)
    nz = noise(n, 5)
    out = []
    for t in range(n):
        sec = t / RATE
        ring = sum(
            a * math.exp(-sec / d) * math.sin(2 * math.pi * f * sec)
            for f, a, d in [(620, 1.0, 0.05), (1130, 0.6, 0.035), (1870, 0.35, 0.02)]
        )
        out.append(ring + 0.5 * math.exp(-sec / 0.004) * nz[t])
    return normalize(out, 0.5)


def boing() -> list[float]:
    # 低い音から高い音へ上がりながら、ビブラートでゆれる「ボヨン」
    n = int(RATE * 0.45)
    out, phase = [], 0.0
    for t in range(n):
        x = t / n
        f = 110 + 170 * (1 - math.exp(-x * 5)) + 18 * math.sin(2 * math.pi * 11 * t / RATE)
        phase += 2 * math.pi * f / RATE
        env = math.exp(-x * 4.5) * min(1.0, t / (RATE * 0.008))
        out.append(env * (math.sin(phase) + 0.25 * math.sin(2 * phase)))
    return normalize(out, 0.6)


def crack() -> list[float]:
    # 短い雑音の「カシャ」と、低い「ペシャ」を重ねる
    n = int(RATE * 0.18)
    nz = noise(n, 21)
    sharp = [v * math.exp(-t / (RATE * 0.02)) for t, v in enumerate(nz)]
    soft = [0.6 * v * math.exp(-t / (RATE * 0.06)) for t, v in enumerate(noise(n, 5))]
    smooth = [0.0] * n
    for t in range(1, n):
        smooth[t] = 0.8 * smooth[t - 1] + 0.2 * soft[t]
    return normalize([a + 2.5 * b for a, b in zip(sharp, smooth)], 0.55)


def plop() -> list[float]:
    # 高さが急に上がる短い音（水の「ポチャン」）＋ 小さな水しぶきの雑音
    n = int(RATE * 0.25)
    out, phase = [], 0.0
    nz = noise(n, 33)
    for t in range(n):
        x = t / RATE
        f = 380 + 900 * (1 - math.exp(-x * 30))
        phase += 2 * math.pi * f / RATE
        out.append(math.exp(-x * 22) * math.sin(phase) + 0.25 * nz[t] * math.exp(-x * 40))
    return normalize(out, 0.55)


def normalize(samples: list[float], peak: float) -> list[float]:
    m = max(abs(v) for v in samples) or 1.0
    return [v * peak / m for v in samples]


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
    for k, (pitch, seed) in enumerate([(1.0, 3), (0.86, 7), (1.15, 11)], start=1):
        write(f"thud{k}.wav", thud(pitch, seed))
    write("tok.wav", tok())
    write("clack.wav", clack())
    write("boing.wav", boing())
    write("crack.wav", crack())
    write("plop.wav", plop())
    write("sparkle.wav", mix(*[(i * 0.05, tone(f, 0.4, 0.12, 0.18)) for i, f in enumerate([2093, 2637, 3136, 4186])]))
    write("correct.wav", mix((0, tone(1318.5, 0.35, 0.12, 0.35)), (0.16, tone(1046.5, 0.9, 0.3, 0.35))))


if __name__ == "__main__":
    main()
