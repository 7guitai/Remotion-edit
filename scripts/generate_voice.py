"""src/episodes/<id>.json のテロップを読み上げ音声にして public/voice/<id>/NNN.wav に書き出す。

使い方:
  python3 scripts/generate_voice.py charger-power-split     # VOICEVOX が起動していれば VOICEVOX、なければ Open JTalk
  python3 scripts/generate_voice.py charger-power-split --speaker 3 --speed 1.2
  python3 scripts/generate_voice.py charger-power-split --engine openjtalk

VOICEVOX を使う場合は、VOICEVOX アプリ（または voicevox_engine）を起動しておくこと。
動画の概要欄に「VOICEVOX:ずんだもん」などのクレジット表記が必要。
"""

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "src" / "episodes"


def to_speech(text: str, readings: dict[str, str]) -> str:
    """テロップを読み上げ用の文に直す（改行を除き、単位や英字の読みを置き換える）"""
    text = text.replace("\n", "").replace("**", "")
    for word in sorted(readings, key=len, reverse=True):
        text = text.replace(word, readings[word])
    text = re.sub(r"(\d+)W", r"\1ワット", text)
    text = text.replace("W数", "ワット数")
    text = re.sub(r"(\d+)g", r"\1グラム", text)
    return text


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
    p.add_argument("episode", help="src/episodes/ のファイル名（拡張子なし）")
    p.add_argument("--engine", choices=["auto", "voicevox", "openjtalk"], default="auto")
    p.add_argument("--voicevox-url", default="http://127.0.0.1:50021")
    p.add_argument("--speaker", type=int, help="VOICEVOX の話者ID（省略時はエピソードの voice、なければ 3=ずんだもん）")
    p.add_argument("--speed", type=float, help="話す速さ（省略時はエピソードの voice、なければ 1.2）")
    args = p.parse_args()

    engine = args.engine
    if engine == "auto":
        engine = "voicevox" if voicevox_available(args.voicevox_url) else "openjtalk"
    if engine == "voicevox" and not voicevox_available(args.voicevox_url):
        sys.exit(f"VOICEVOX エンジンに接続できません: {args.voicevox_url}")
    print(f"engine: {engine}")

    episode = json.loads((EPISODES / f"{args.episode}.json").read_text(encoding="utf-8"))
    voice = episode.get("voice", {})
    speaker = args.speaker if args.speaker is not None else voice.get("speaker", 3)
    speed = args.speed if args.speed is not None else voice.get("speed", 1.2)
    readings = episode.get("readings", {})
    OUT_DIR = ROOT / "public" / "voice" / episode["id"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.wav"):
        old.unlink()

    for i, slide in enumerate(episode["slides"]):
        # 1ページ1雑学は、振り（NNN.wav）と答え（NNN-answer.wav）を別々に作る
        parts = [(f"{i:03d}.wav", slide.get("speech") or slide["text"])]
        if slide.get("answer"):
            parts.append((f"{i:03d}-answer.wav", slide.get("answerSpeech") or slide["answer"]))
        if slide.get("explain"):
            parts.append((f"{i:03d}-explain.wav", slide.get("explainSpeech") or slide["explain"]))
        for name, raw in parts:
            text = to_speech(raw, readings)
            out = OUT_DIR / name
            if engine == "voicevox":
                synth_voicevox(text, out, args.voicevox_url, speaker, speed)
            else:
                synth_openjtalk(text, out, speed)
            print(f"  {out.name}  {text}")


if __name__ == "__main__":
    main()
