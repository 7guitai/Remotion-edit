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
    text = text.replace("\n", "")
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


def audio_query(text: str, url: str, speaker: int) -> dict:
    q = urllib.parse.urlencode({"text": text, "speaker": speaker})
    req = urllib.request.Request(f"{url}/audio_query?{q}", method="POST")
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def register_dict(entries: list[dict], url: str) -> None:
    """エピソードの voiceDict（表記・読み・アクセント）を VOICEVOX のユーザー辞書に登録する（登録済みなら更新）"""
    with urllib.request.urlopen(f"{url}/user_dict") as res:
        existing = {w["surface"]: uid for uid, w in json.load(res).items()}
    for e in entries:
        q = urllib.parse.urlencode(
            {
                "surface": e["surface"],
                "pronunciation": e["pronunciation"],
                "accent_type": e.get("accent_type", 0),
                "word_type": "PROPER_NOUN",
            }
        )
        # 辞書には全角で登録されるため、全角に直した表記で照合する
        uid = existing.get(e["surface"].translate(FULLWIDTH))
        path = f"/user_dict_word/{uid}?{q}" if uid else f"/user_dict_word?{q}"
        req = urllib.request.Request(f"{url}{path}", method="PUT" if uid else "POST")
        urllib.request.urlopen(req).close()
        print(f"  辞書: {e['surface']} → {e['pronunciation']}")


FULLWIDTH = str.maketrans({chr(c): chr(c + 0xFEE0) for c in range(0x21, 0x7F)})


def mora_seconds(query: dict) -> float:
    total = 0.0
    for ap in query["accent_phrases"]:
        for m in ap["moras"]:
            total += (m.get("consonant_length") or 0) + m["vowel_length"]
        if ap.get("pause_mora"):
            total += ap["pause_mora"]["vowel_length"]
    return total


SPLIT = re.compile(r"(?<=[、。！？!?])")


def caption_chunks(display: str, reading: str, seconds: float, url: str, speaker: int,
                   lead: float) -> list[dict]:
    """字幕を句読点で区切り、2〜3秒ずつのまとまりにして表示タイミングを付ける。

    各区切りの長さは、区切りごとに VOICEVOX で求めたモーラ長の比で、実際の音声の長さを按分する。
    """
    disp = [p for p in SPLIT.split(display) if p.strip()]
    read = [p for p in SPLIT.split(reading) if p.strip()]
    if len(disp) != len(read):
        # 読み替えで区切りの数がずれたら、文字数の比で按分する
        read = disp
        weights = [len(p) for p in disp]
    else:
        weights = [mora_seconds(audio_query(r, url, speaker)) or len(r) for r in read]
    total = sum(weights) or 1
    speak = max(seconds - lead, 0.1)

    # 2秒未満のまとまりは次とつなげる（ただし字幕が長くなりすぎない範囲で）
    groups: list[tuple[str, float]] = []
    for text, w in zip(disp, weights):
        dur = speak * w / total
        if groups and (groups[-1][1] < 2.0) and len(groups[-1][0] + text) <= 32:
            groups[-1] = (groups[-1][0] + text, groups[-1][1] + dur)
        else:
            groups.append((text, dur))
    out, t = [], lead
    for text, dur in groups:
        out.append({"text": text.strip(), "start": round(t, 3), "end": round(t + dur, 3)})
        t += dur
    return out


def synth_voicevox(text: str, out: Path, url: str, speaker: int, speed: float,
                   pre: float = 0.05, post: float = 0.1) -> None:
    query = audio_query(text, url, speaker)
    query["speedScale"] = speed
    query["prePhonemeLength"] = pre
    query["postPhonemeLength"] = post
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
    p.add_argument("--speaker", type=int, default=3, help="VOICEVOX の話者ID（3=ずんだもん ノーマル）")
    p.add_argument("--speed", type=float, default=1.2, help="話す速さ（1.0 が標準）")
    args = p.parse_args()

    engine = args.engine
    if engine == "auto":
        engine = "voicevox" if voicevox_available(args.voicevox_url) else "openjtalk"
    if engine == "voicevox" and not voicevox_available(args.voicevox_url):
        sys.exit(f"VOICEVOX エンジンに接続できません: {args.voicevox_url}")
    if engine == "openjtalk":
        try:
            import pyopenjtalk  # noqa: F401
        except ImportError:
            # 既存の音声を消す前に止める
            sys.exit(
                "VOICEVOX に接続できず、代わりの Open JTalk も入っていません。\n"
                "VOICEVOX アプリを起動するか（Docker なら docker run -d -p 127.0.0.1:50021:50021 "
                "voicevox/voicevox_engine:cpu-latest）、pip install pyopenjtalk numpy を実行してください。"
            )
    print(f"engine: {engine}")

    episode = json.loads((EPISODES / f"{args.episode}.json").read_text(encoding="utf-8"))
    readings = episode.get("readings", {})
    # エピソードの voice 設定（話速・前後の無音）。コマンドの --speed より優先
    voice = episode.get("voice", {})
    base_speed = voice.get("speed", args.speed)
    pre = voice.get("pre", 0.05)
    post = voice.get("post", 0.1)
    if engine == "voicevox" and episode.get("voiceDict"):
        register_dict(episode["voiceDict"], args.voicevox_url)
    captions = []
    OUT_DIR = ROOT / "public" / "voice" / episode["id"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in [*OUT_DIR.glob("*.wav"), *OUT_DIR.glob("captions.json")]:
        old.unlink()

    for i, slide in enumerate(episode["slides"]):
        display = (slide.get("speech") or slide["text"]).replace("\n", "")
        text = to_speech(display, readings)
        speed = slide.get("voiceSpeed", base_speed)
        out = OUT_DIR / f"{i:03d}.wav"
        if engine == "voicevox":
            synth_voicevox(text, out, args.voicevox_url, args.speaker, speed, pre, post)
        else:
            synth_openjtalk(text, out, speed)
        with wave.open(str(out)) as w:
            seconds = w.getnframes() / w.getframerate()
        if engine == "voicevox":
            captions.append(caption_chunks(display, text, seconds - post, args.voicevox_url,
                                           args.speaker, pre))
        else:
            captions.append([{"text": display, "start": 0, "end": round(seconds, 3)}])
        print(f"  {out.name}  {seconds:.1f}s  {text}")

    # 字幕をフレーズ単位で切り替えるためのタイミング（src/slides.ts が読む）
    (OUT_DIR / "captions.json").write_text(
        json.dumps(captions, ensure_ascii=False, indent=1), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
