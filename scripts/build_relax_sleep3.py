"""寝落ち雑学 その3（relax_sleep3_script.txt）から src/episodes/relax-sleep3-45m.json を作る。

作り方は build_relax_sleep.py と同じ（写真は scripts/photo_picks3.json）。
使い方: python3 scripts/build_relax_sleep3.py
"""

import json
from pathlib import Path

from build_relax_sleep import build

ROOT = Path(__file__).resolve().parent.parent
EP_ID = "relax-sleep3-45m"

# BGM（穏やかな曲。第1〜3章、第4〜6章、第7章〜おわり で切りかえ）
# TODO: その1・その2 と別の穏やかな曲を OpenTracks から3曲選ぶ（「利用条件有」の作曲者は避ける）
# 使用済み: 眠れない夜に／子猫のお昼寝／10℃／花の季節を待ちながら／ささやかな眠り／ヒーリングガムラン
BGM = [
    {"file": "TODO1.mp3", "title": "TODO", "credit": "TODO", "page": "https://opentracks.com/bgm/detail/0", "opentracks": 0, "track": 1, "fromSlide": 0},
    {"file": "TODO2.mp3", "title": "TODO", "credit": "TODO", "page": "https://opentracks.com/bgm/detail/0", "opentracks": 0, "track": 1, "fromSlide": 0},
    {"file": "TODO3.mp3", "title": "TODO", "credit": "TODO", "page": "https://opentracks.com/bgm/detail/0", "opentracks": 0, "track": 1, "fromSlide": 0},
]

# 読み間違いの直し（字幕はそのまま、読み上げだけ変える）。音声を作ったあと audio_query のかなで確かめて足す
READINGS: dict[str, str] = {
    # その2で見つかった読み間違い（同じ言葉を使うときのために残す）
    "お米": "おこめ",
    "熟す": "じゅくす",
    "細やか": "こまやか",
    "金星": "きんせい",
    "緑や": "みどりや",
    "日本": "にほん",
}


def main() -> None:
    slides = build(
        "relax_sleep3_script.txt",
        "photo_picks3.json",
        READINGS,
        ("聞くだけで眠くなる\nやさしい雑学 その3", "聞くだけで眠くなる、やさしい雑学。その3。"),
    )
    for x in slides:
        # 「だいはっしょう」の「は」が助詞の「わ」と読まれるのを防ぐ
        if x.get("speech", "").startswith("だいはっしょう"):
            x["speech"] = x["speech"].replace("だいはっしょう", "ダイハッショウ", 1)
    cards = [i for i, x in enumerate(slides) if x.get("card")]
    bgm = [dict(b) for b in BGM]
    bgm[1]["fromSlide"] = cards[4]
    bgm[2]["fromSlide"] = cards[7]
    ep = {
        "id": EP_ID,
        "title": "【寝落ち雑学】聞くだけで眠くなる、やさしい雑学 その3｜TODO 45分",
        "pr": False,
        "style": "relax",
        "fps": 15,
        "slideGap": 22,
        "background": "#ffffff",
        "titleBand": False,
        "bgmVolume": 0.07,
        "voice": {"speaker": 84, "speed": 1.0, "name": "青山龍星", "intonation": 0.9},
        "bgmPlaylist": bgm,
        "illustrations": {},
        "description": "聞いているうちに眠くなる、やさしい雑学の第3弾です。部屋を暗くして、目を閉じてお聞きください。\nTODO（章の話題）の雑学を90個ほど収録しています。\n※「〜といわれています」「〜という説があります」と話している内容は、諸説ある話や、目安の数字です。",
        "hashtags": ["睡眠導入", "寝落ち", "雑学", "聞き流し", "作業用"],
        "photoCredits": "Openverse 経由のフリー写真（CC0・パブリックドメイン）",
        "slides": slides,
    }
    out = ROOT / "src" / "episodes" / f"{EP_ID}.json"
    out.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(slides)} slides)")


if __name__ == "__main__":
    main()
