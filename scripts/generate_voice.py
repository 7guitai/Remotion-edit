"""src/script.json のテロップを読み上げ音声にして public/voice/NNN.wav に書き出す。

使い方:
  python3 scripts/generate_voice.py                 # VOICEVOX が起動していれば VOICEVOX、なければ Open JTalk
  python3 scripts/generate_voice.py --engine voicevox --speaker 3   # ずんだもん（ノーマル）
  python3 scripts/generate_voice.py --engine openjtalk

VOICEVOX を使う場合は、VOICEVOX アプリ（または voicevox_engine）を起動しておくこと。
動画の概要欄に「VOICEVOX:ずんだもん」などのクレジット表記が必要。
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "script.json"
OUT_DIR = ROOT / "public" / "voice"


def voicevox_available(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/version", timeout=2):
            return True
    except Exception:
        return False


def synth_voicevox(text: str, out: Path, url: str, speaker: int, speed: float) -> None:
    q = urllib.parse.urlencode({"text": text, "speaker": speaker})
    req = urllib.request.Request(f"{url}/audio_query?{q}", method="POST")
    with urllib.request.urlopen(req) as res:
        query = json.load(res)
    query["speedScale"] = speed
    query["prePhonemeLength"] = 0.05
    query["postPhonemeLength"] = 0.1
    req = urllib.request.Request(
        f"{url}/synthesis?speaker={speaker}",
        data=json.dumps(query).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        out.write_bytes(res.read())


def synth_openjtalk(text: str, out: Path, speed: float) -> None:
    import numpy as np
    import pyopenjtalk

    x, sr = pyopenjtalk.tts(text, speed=speed)
    x = np.clip(x, -32768, 32767).astype(np.int16)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(x.tobytes())


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--engine", choices=["auto", "voicevox", "openjtalk"], default="auto")
    p.add_argument("--voicevox-url", default="http://127.0.0.1:50021")
    p.add_argument("--speaker", type=int, default=3, help="VOICEVOX の話者ID（3=ずんだもん ノーマル）")
    p.add_argument("--speed", type=float, default=1.2, help="話す速さ（1.0 が標準）")
    args = p.parse_args()

    engine = args.engine
    if engine == "auto":
        engine = "voicevox" if voicevox_available(args.voicevox_url) else "openjtalk"
    if engine == "voicevox" and not voicevox_available(args.voicevox_url):
        sys.exit(f"VOICEVOX エンジンに接続できません: {args.voicevox_url}")
    print(f"engine: {engine}")

    slides = json.loads(SCRIPT.read_text(encoding="utf-8"))["slides"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.wav"):
        old.unlink()

    for i, slide in enumerate(slides):
        text = (slide.get("speech") or slide["text"]).replace("\n", "")
        out = OUT_DIR / f"{i:03d}.wav"
        if engine == "voicevox":
            synth_voicevox(text, out, args.voicevox_url, args.speaker, args.speed)
        else:
            synth_openjtalk(text, out, args.speed)
        print(f"  {out.name}  {text}")


if __name__ == "__main__":
    main()
