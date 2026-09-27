"""オリジナルのオルゴール風BGM（ループ用）を合成して public/bgm/bgm.mp3 に書き出す。

外部素材を使っていないため著作権フリー。
フリーBGM（DOVA-SYNDROME など）に差し替える場合は、その曲を public/bgm/bgm.mp3 として置けばよい。
"""

import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "bgm" / "bgm.mp3"

SR = 44100
BPM = 72
BEAT = 60 / BPM
BAR = BEAT * 4

CHORDS = {
    "F": [53, 57, 60],
    "Dm": [50, 53, 57],
    "Bb": [46, 50, 53],
    "C": [48, 52, 55],
    "Am": [45, 48, 52],
}
PROGRESSION = ["F", "Dm", "Bb", "C", "F", "Dm", "Bb", "C",
               "Bb", "C", "Am", "Dm", "Bb", "C", "F", "F"]

# (拍, MIDIノート, 長さ[拍]) を小節ごとに
MELODY = [
    [(0, 72, 2), (2, 69, 1), (3, 72, 1)],
    [(0, 74, 2), (2, 77, 2)],
    [(0, 74, 1.5), (1.5, 72, 0.5), (2, 70, 2)],
    [(0, 67, 3), (3, 72, 1)],
    [(0, 69, 2), (2, 72, 1), (3, 77, 1)],
    [(0, 76, 2), (2, 74, 2)],
    [(0, 74, 1), (1, 72, 1), (2, 70, 1), (3, 67, 1)],
    [(0, 72, 4)],
    [(0, 77, 2), (2, 74, 2)],
    [(0, 76, 2), (2, 72, 2)],
    [(0, 72, 1), (1, 76, 1), (2, 81, 2)],
    [(0, 77, 3), (3, 74, 1)],
    [(0, 74, 2), (2, 77, 1), (3, 74, 1)],
    [(0, 76, 2), (2, 79, 2)],
    [(0, 81, 2), (2, 79, 1), (3, 76, 1)],
    [(0, 77, 4)],
]

ARP_PATTERN = [0, 2, 3, 4, 3, 2, 1, 2]


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def bell(freq: float, seconds: float, decay: float) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    tone = (
        np.sin(2 * np.pi * freq * t)
        + 0.25 * np.sin(2 * np.pi * 2 * freq * t)
        + 0.08 * np.sin(2 * np.pi * 3.01 * freq * t) * np.exp(-t * 6)
    )
    env = np.exp(-t * decay) * np.minimum(1, t / 0.005)
    return tone * env


def add(buf: np.ndarray, start: float, sig: np.ndarray, gain: float) -> None:
    # ループ再生時に途切れないよう、末尾からはみ出した余韻は先頭に回り込ませる
    idx = (int(start * SR) + np.arange(len(sig))) % len(buf)
    np.add.at(buf, idx, sig * gain)


def main() -> None:
    total = len(PROGRESSION) * BAR
    buf = np.zeros(int(total * SR))

    for bar, name in enumerate(PROGRESSION):
        r, third, fifth = CHORDS[name]
        tones = [r, third, fifth, r + 12, third + 12]
        t0 = bar * BAR

        # 分散和音
        for i, k in enumerate(ARP_PATTERN):
            add(buf, t0 + i * BEAT / 2, bell(hz(tones[k]), 2.5, 2.8), 0.16)

        # やわらかいパッド
        t = np.arange(int(BAR * SR)) / SR
        env = np.sin(np.pi * t / BAR) ** 2
        pad = sum(np.sin(2 * np.pi * hz(n - 12) * t) for n in (r, third, fifth))
        add(buf, t0, pad * env, 0.05)

        # メロディ
        for beat, note, length in MELODY[bar]:
            add(buf, t0 + beat * BEAT, bell(hz(note), max(2.0, length * BEAT + 1.5), 1.6), 0.32)

    # 簡易リバーブ
    wet = np.zeros_like(buf)
    for delay, g in [(0.113, 0.3), (0.227, 0.22), (0.379, 0.15), (0.53, 0.1)]:
        wet += np.roll(buf, int(delay * SR)) * g
    out = buf + wet
    out = out / np.max(np.abs(out)) * 0.8

    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".wav")
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    # Remotion 同梱の ffmpeg で mp3 に変換
    subprocess.run(
        ["npx", "remotion", "ffmpeg", "-y", "-loglevel", "error",
         "-i", str(tmp), "-b:a", "160k", str(OUT)],
        cwd=ROOT, check=True, shell=sys.platform == "win32",
    )
    tmp.unlink()
    print(f"wrote {OUT} ({total:.1f}s)")


if __name__ == "__main__":
    main()
