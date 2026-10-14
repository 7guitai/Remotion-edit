"""寝落ち雑学 その2（relax_sleep2_script.txt）から src/episodes/relax-sleep2-45m.json を作る。

作り方は build_relax_sleep.py と同じ（写真は scripts/photo_picks2.json）。
使い方: python3 scripts/build_relax_sleep2.py
"""

import json
from pathlib import Path

from build_relax_sleep import build

ROOT = Path(__file__).resolve().parent.parent
EP_ID = "relax-sleep2-45m"

# BGM（その1とは別の、穏やかな曲。第1〜3章、第4〜6章、第7章〜おわり で切りかえ）
BGM = [
    {"file": "hana_no_kisetsu.mp3", "title": "花の季節を待ちながら", "credit": "のる", "page": "https://opentracks.com/bgm/detail/21727", "opentracks": 21727, "track": 1, "fromSlide": 0},
    {"file": "sasayakana_nemuri.mp3", "title": "ささやかな眠り", "credit": "ゆうり(Yuli Audio Craft)", "page": "https://opentracks.com/bgm/detail/21869", "opentracks": 21869, "track": 1, "fromSlide": 0},
    {"file": "healing_gamelan.mp3", "title": "ヒーリングガムラン", "credit": "マニーラ", "page": "https://opentracks.com/bgm/detail/22432", "opentracks": 22432, "track": 1, "fromSlide": 0},
]

# 読み間違いの直し（字幕はそのまま、読み上げだけ変える）。音声を作ったあと audio_query のかなで確かめて足す
READINGS: dict[str, str] = {
    "山や岩": "やまや、いわ",
    "貴重な水": "貴重なみず",
    "お米": "おこめ",
    "加えて固めた": "加えてかためた",
    "熟す": "じゅくす",
    "細やか": "こまやか",
    "金星": "きんせい",
    "緑や": "みどりや",
    "日本": "にほん",
}


def main() -> None:
    slides = build(
        "relax_sleep2_script.txt",
        "photo_picks2.json",
        READINGS,
        ("聞くだけで眠くなる\nやさしい雑学 その2", "聞くだけで眠くなる、やさしい雑学。その2。"),
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
        "title": "【寝落ち雑学】聞くだけで眠くなる、やさしい雑学 その2｜海・言葉・虫・星のはなし 45分",
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
        "description": "聞いているうちに眠くなる、やさしい雑学の第2弾です。部屋を暗くして、目を閉じてお聞きください。\n海と水・言葉の由来・鳥と虫・台所の科学・季節の行事・感覚・地球と石・世界の習慣・夜空と星の雑学を90個ほど収録しています。\n※「〜といわれています」「〜という説があります」と話している内容は、諸説ある話や、目安の数字です。",
        "hashtags": ["睡眠導入", "寝落ち", "雑学", "聞き流し", "作業用"],
        "photoCredits": "Openverse 経由のフリー写真（CC0・パブリックドメイン）",
        "slides": slides,
    }
    out = ROOT / "src" / "episodes" / f"{EP_ID}.json"
    out.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(slides)} slides)")


if __name__ == "__main__":
    main()
