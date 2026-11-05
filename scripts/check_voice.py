"""ナレーションの音声を faster-whisper で文字起こしして、台本と見くらべる（読み間違いさがし）。

VOICEVOX の audio_query の kana だけでは気づきにくい「聞いて変な所」を見つけるのに使う。
文字起こしは聞いたままの文字になるので、同じ音の別の漢字（毛細管 → 盲載還…）は気にしなくてよい。
読みがおかしい所（ニッポン、キンボシ など）や、抜け・つまりを探す。

使い方:
  python3.13 scripts/check_voice.py public/voice/cutaway-pen-short          # small モデル（速い）
  python3.13 scripts/check_voice.py public/voice/relax-sleep4-45m --model medium --limit 20

faster-whisper は python3.13 に入っている（pip install faster-whisper）。初回はモデルをダウンロードする。
"""

import argparse
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np


def load16k(path: Path) -> np.ndarray:
    # av（PyAV）の版が合わないことがあるので、ffmpeg で 16kHz モノラルにしてから numpy で読む
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path), "-ar", "16000", "-ac", "1", tmp.name], check=True)
        with wave.open(tmp.name) as w:
            return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--model", default="small")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    from faster_whisper import WhisperModel

    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    files = sorted(Path(a.folder).glob("*.wav"))
    if a.limit:
        files = files[: a.limit]
    if not files:
        sys.exit(f"wav がありません: {a.folder}")
    for f in files:
        segs, _ = model.transcribe(load16k(f), language="ja", beam_size=1)
        print(f"{f.name}\t{''.join(s.text for s in segs).strip()}")


if __name__ == "__main__":
    main()
