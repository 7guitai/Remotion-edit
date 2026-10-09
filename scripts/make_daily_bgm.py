"""Create an original looping soundtrack for the 2026-10-09 short (no external assets)."""
from pathlib import Path
import numpy as np
import wave

ROOT = Path(__file__).resolve().parent.parent
sr = 44100
length = 16
t = np.arange(sr * length) / sr
x = np.zeros_like(t)
# 120 BPM, eight bars. Warm bass and short bell notes, no samples.
roots = [130.8128, 164.8138, 174.6141, 146.8324]
for beat in range(32):
    start = beat * 0.5
    local = t - start
    mask = (local >= 0) & (local < 0.45)
    u = local[mask]
    f = roots[(beat // 8) % 4]
    x[mask] += 0.22 * np.sin(2 * np.pi * f * u) * np.exp(-u * 10)
    if beat % 2 == 0:
        x[mask] += 0.13 * np.sin(2 * np.pi * f * 4 * u) * np.exp(-u * 16)
    kick = (local >= 0) & (local < 0.13)
    u = local[kick]
    x[kick] += 0.14 * np.sin(2 * np.pi * (55 * u + 35 * (1 - np.exp(-u * 35)) / 35)) * np.exp(-u * 30)
x = np.clip(x, -1, 1)
out = ROOT / "public/bgm/subscription-2ch-2026-10-09.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((x * 32767).astype("<i2").tobytes())
print(out)
