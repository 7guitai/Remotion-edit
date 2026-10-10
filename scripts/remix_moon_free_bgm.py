"""Reuse the checked video frames; render clean voice/SFX and duck licensed BGM."""
import hashlib
import argparse
import json
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP = "whatif-moon-gravity-2026-10-09"
SOURCE_SHA256 = "5654468d39fb6d4d70b6205659dd46982315b30c3424c34f37762071a4db1568"


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reuse-stem", action="store_true")
    args = parser.parse_args()
    ep = json.loads((ROOT / "src/episodes" / f"{EP}.json").read_text())
    track = ROOT / "public/bgm" / ep["bgm"]["file"]
    track.parent.mkdir(parents=True, exist_ok=True)
    if not track.exists():
        urllib.request.urlretrieve(ep["bgm"]["url"], track)
    assert hashlib.sha256(track.read_bytes()).hexdigest() == SOURCE_SHA256
    (ROOT / "out").mkdir(exist_ok=True)
    if not args.reuse_stem:
        run("npx", "remotion", "render", EP, "out/moon-voice-sfx.wav", "--codec=wav",
            '--props={"bgmMuted":true}', "--browser-executable=/usr/bin/chromium",
            "--gl=swangle", "--log=error")
    # Music approximately -28 LUFS before narration-controlled ducking.
    # Split the clean stem so the old BGM is never included in the remix.
    filters = (
        "[0:a]asplit=2[voice][key];"
        "[1:a]atrim=duration=37.6,asetpts=PTS-STARTPTS,volume=0.1,"
        "afade=t=in:d=0.5,afade=t=out:st=36.1:d=1.5[music];"
        "[music][key]sidechaincompress=threshold=0.025:ratio=3:"
        "attack=25:release=300:makeup=1[duck];"
        "[voice][duck]amix=inputs=2:duration=first:normalize=0,"
        "loudnorm=I=-16:TP=-1.5:LRA=11[a]"
    )
    run("ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", "out/moon-voice-sfx.wav", "-i", str(track),
        "-i", "videos/2026-10-09-moon-gravity.mp4", "-filter_complex", filters,
        "-map", "2:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac",
        "-b:a", "192k", "-ar", "48000", "-t", "37.6", "-movflags", "+faststart",
        "videos/2026-10-10-moon-gravity-free-bgm.mp4")


if __name__ == "__main__":
    main()
