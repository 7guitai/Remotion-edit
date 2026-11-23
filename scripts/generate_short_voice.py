"""縦型ショート（src/shorts/<id>/script.json）の掛け合い音声を作る（話者は src/shorts/common/characters.json）。

各セリフを VOICEVOX で読み上げて public/shorts/<id>/voice/NNN.wav に保存し、
長さを src/shorts/<id>/timing.json に書き出す（Remotion はこれを見て尺を決める）。

使い方:
  python3 scripts/generate_short_voice.py ai-subscription
  python3 scripts/generate_short_voice.py ai-subscription --voicevox-url http://127.0.0.1:50021 --speed 1.2

公開時は概要欄に「VOICEVOX:ずんだもん」「VOICEVOX:四国めたん」のクレジットが必要。
"""

import argparse
import json
import time
import urllib.parse
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def post(url: str, data: bytes | None = None, headers: dict | None = None) -> bytes:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST")
            with urllib.request.urlopen(req, timeout=120) as res:
                return res.read()
        except Exception as e:  # ネットワーク越しのエンジンは時々落ちるので再試行
            if attempt == 3:
                raise
            print(f"    retry ({e})")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError


def synth(text: str, out: Path, url: str, speaker: int, speed: float, pitch: float, intonation: float) -> None:
    q = urllib.parse.urlencode({"text": text, "speaker": speaker})
    query = json.loads(post(f"{url}/audio_query?{q}"))
    query["speedScale"] = speed
    query["pitchScale"] = pitch
    query["intonationScale"] = intonation
    query["prePhonemeLength"] = 0.0
    query["postPhonemeLength"] = 0.05
    query["outputSamplingRate"] = 48000
    wav = post(
        f"{url}/synthesis?speaker={speaker}",
        data=json.dumps(query).encode(),
        headers={"Content-Type": "application/json"},
    )
    out.write_bytes(wav)


def duration(path: Path) -> float:
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def envelope(path: Path, fps: int = 30) -> list[float]:
    """口パク代わりに使う、1フレームごとの音量（0〜1）"""
    import array

    with wave.open(str(path)) as w:
        sr = w.getframerate()
        data = array.array("h", w.readframes(w.getnframes()))
    hop = sr // fps
    vals = []
    for i in range(0, len(data), hop):
        chunk = data[i : i + hop]
        rms = (sum(v * v for v in chunk) / max(len(chunk), 1)) ** 0.5
        vals.append(rms)
    peak = max(vals) or 1
    return [round(min(v / peak, 1), 2) for v in vals]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("short", help="src/shorts/ のフォルダ名")
    p.add_argument("--voicevox-url", default="http://127.0.0.1:50021")
    p.add_argument("--speed", type=float, default=1.4)
    p.add_argument("--force", action="store_true", help="既存の音声も作り直す")
    args = p.parse_args()

    src = ROOT / "src" / "shorts" / args.short
    script = json.loads((src / "script.json").read_text(encoding="utf-8"))
    characters = json.loads((ROOT / "src" / "shorts" / "common" / "characters.json").read_text(encoding="utf-8"))
    out_dir = ROOT / "public" / "shorts" / args.short / "voice"
    out_dir.mkdir(parents=True, exist_ok=True)

    timing = []
    envelopes = []
    n = 0
    for scene in script["scenes"]:
        for line in scene["lines"]:
            ch = characters[line["who"]]
            out = out_dir / f"{n:03d}.wav"
            text = line.get("speech") or line["text"].replace("\n", "")
            if args.force or not out.exists():
                # めたんは少しゆっくり・抑揚多め、ずんだもんは元気に
                synth(
                    text,
                    out,
                    args.voicevox_url,
                    ch["speaker"],
                    args.speed * (0.96 if line["who"] == "metan" else 1.0),
                    0.0,
                    1.15,
                )
                print(f"  {out.relative_to(ROOT)}  [{ch['name']}] {text}")
            timing.append(round(duration(out), 3))
            envelopes.append(envelope(out))
            n += 1

    (src / "timing.json").write_text(json.dumps(timing, indent=1) + "\n", encoding="utf-8")
    (src / "envelope.json").write_text(json.dumps(envelopes, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"total {sum(timing):.1f}s / {n} lines")


if __name__ == "__main__":
    main()
