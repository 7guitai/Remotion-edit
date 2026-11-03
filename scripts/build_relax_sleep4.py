"""寝落ち雑学 その4（relax_sleep4_script.txt）から src/episodes/relax-sleep4-45m.json を作る。

作り方は build_relax_sleep.py と同じ（写真は scripts/photo_picks4.json）。
使い方: python3 scripts/build_relax_sleep4.py
"""

import json
from pathlib import Path

from build_relax_sleep import build

ROOT = Path(__file__).resolve().parent.parent
EP_ID = "relax-sleep4-45m"

# BGM（穏やかな曲。第1〜3章、第4〜6章、第7章〜おわり で切りかえ）
# 使用済み（その1・その2）: 眠れない夜に／子猫のお昼寝／10℃／花の季節を待ちながら／ささやかな眠り／ヒーリングガムラン
# その3（Codex で作成）の曲はリポジトリにないため不明
BGM = [
    {"file": "mizu_no_kirameki.mp3", "title": "水のきらめき", "credit": "のる", "page": "https://opentracks.com/bgm/detail/23779", "opentracks": 23779, "track": 1, "fromSlide": 0},
    {"file": "ano_hi_no_evening.mp3", "title": "あの日のイヴニン", "credit": "しんさんわーくす", "page": "https://opentracks.com/bgm/detail/22662", "opentracks": 22662, "track": 1, "fromSlide": 0},
    {"file": "utsukushii_inochi.mp3", "title": "美しい命", "credit": "ゆうり(Yuli Audio Craft)", "page": "https://opentracks.com/bgm/detail/23565", "opentracks": 23565, "track": 1, "fromSlide": 0},
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
    # その4で見つけた読み間違い
    "弦": "げん",
    "綿の実": "わたの実",
    "それぞれの行": "それぞれのぎょう",
    "角の丸い": "かどの丸い",
    "角があると": "かどがあると",
    "丸い角": "丸いかど",
    "網の部屋": "あみの部屋",
    "かんのんざき": "カンノンザキ",
    "にじゅうく日": "にじゅうくにち",
    "はちじゅうはちあります": "はちじゅうはっこあります",
}


def main() -> None:
    slides = build(
        "relax_sleep4_script.txt",
        "photo_picks4.json",
        READINGS,
        ("聞くだけで眠くなる\nやさしい雑学 その4", "聞くだけで眠くなる、やさしい雑学。その4。"),
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
        "title": "【寝落ち雑学】聞くだけで眠くなる、やさしい雑学 その4｜雪・灯り・時計・昔の暮らしのはなし 45分",
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
        "description": "聞いているうちに眠くなる、やさしい雑学の第4弾です。部屋を暗くして、目を閉じてお聞きください。\n雪と氷・紙と文字・灯りと火・布と糸・暦と時計・楽器と音・乗りものと旅・遊びとおもちゃ・昔の人の暮らしの雑学を90個ほど収録しています。\n※「〜といわれています」「〜という説があります」と話している内容は、諸説ある話や、目安の数字です。",
        "hashtags": ["睡眠導入", "寝落ち", "雑学", "聞き流し", "作業用"],
        "photoCredits": "Openverse 経由のフリー写真（CC0・パブリックドメイン）",
        "slides": slides,
    }
    out = ROOT / "src" / "episodes" / f"{EP_ID}.json"
    out.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(slides)} slides)")


if __name__ == "__main__":
    main()
