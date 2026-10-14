"""寝落ち雑学（relax_sleep_script.txt）から src/episodes/relax-sleep-45m.json を作る。

- 1行 = 1場面。字幕は読点の位置で 1〜3行に折る
- 写真は scripts/photo_picks.json（話題ごとに選んだ写真）から順に割り当てる。
  [c] の行は「落ち着いた写真」の共通セットから、使っていないものを順に使う
使い方: python3 scripts/build_relax_sleep.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP_ID = "relax-sleep-45m"


# BGM（穏やかなピアノ。章の切りかわりで次の曲へ）。fromSlide はあとで章の位置に合わせる
BGM = [
    {"file": "nemurenai_yoru.mp3", "title": "眠れない夜に", "credit": "しんさんわーくす", "page": "https://opentracks.com/bgm/detail/21794", "opentracks": 21794, "track": 1, "fromSlide": 0},
    {"file": "koneko_ohirune.mp3", "title": "子猫のお昼寝", "credit": "のる", "page": "https://opentracks.com/bgm/detail/23117", "opentracks": 23117, "track": 1, "fromSlide": 0},
    {"file": "jusshido.mp3", "title": "10℃", "credit": "しゃろう", "page": "https://opentracks.com/bgm/detail/12420", "opentracks": 12420, "track": 1, "fromSlide": 0},
]

# 読み間違いの直し（字幕はそのまま、読み上げだけ変える）
READINGS = {
    "中から皮": "なかから皮",
    "隠れていた黄色": "隠れていたきいろ",
    "表に出て": "おもてに出て",
    "20時間近く": "20時間ちかく",
    "長い距離通って": "長い距離をとおって",
    "馬肥ゆる": "うまこゆる",
    "ふとんの綿": "ふとんのわた",
}


def split_caption(text: str) -> str:
    """読点・句点の位置で、なるべく長さのそろった 1〜3行に分ける（1行 28文字くらいまで）"""
    if len(text) <= 24:
        return text
    cuts = [m.end() for m in re.finditer(r"[、。！？]", text) if m.end() < len(text)]
    if not cuts:
        # 読点がないときは助詞のうしろで切る
        cuts = [m.end() for m in re.finditer(r"[はがをにでとのも](?![、。])", text) if 6 < m.end() < len(text) - 4]
    best = None
    for c in cuts:
        a, b = text[:c], text[c:]
        score = max(len(a), len(b))
        if best is None or score < best[0]:
            best = (score, [a, b])
    if best and best[0] <= 30:
        return "\n".join(best[1])
    # 3行
    best3 = None
    for i, c1 in enumerate(cuts):
        for c2 in cuts[i + 1 :]:
            parts = [text[:c1], text[c1:c2], text[c2:]]
            score = max(len(p) for p in parts)
            if best3 is None or score < best3[0]:
                best3 = (score, parts)
    if best3:
        return "\n".join(best3[1])
    return "\n".join(best[1]) if best else text


def parse(script: str = "relax_sleep_script.txt") -> list[dict]:
    items = []
    topic = -1
    for raw in (ROOT / "scripts" / script).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("="):
            items.append({"kind": "card", "title": line[1:].strip()})
            continue
        if line.startswith("@"):
            topic += 1
            continue
        calm = "[c]" in line
        reading = re.search(r"\{(.+?)\}", line)
        text = re.sub(r"\[.*?\]|\{.*?\}", "", line).strip()
        items.append({"kind": "line", "text": text, "topic": topic, "calm": calm, "speech": reading.group(1) if reading else None})
    return items


def build(script: str, pick_name: str, readings: dict[str, str], intro_card: tuple[str, str]) -> list[dict]:
    """台本と選んだ写真から slides を作る（2本目以降の build_relax_sleep2.py からも使う）"""
    pick_file = ROOT / "scripts" / pick_name
    picks = json.loads(pick_file.read_text(encoding="utf-8")) if pick_file.exists() else {"topics": {}, "calm": [{"file": "none.jpg"}]}
    items = parse(script)
    slides = []
    used_calm = 0
    calm = picks["calm"]
    per_topic_used: dict[int, int] = {}
    chapter_no = 0
    for it in items:
        if it["kind"] == "card":
            title = it["title"]
            slide = {"type": "relax", "text": title, "card": title.replace("　", "\n", 1)}
            # 章の読み上げ：「第1章。体のふしぎ」
            m = re.match(r"第(\d)章　(.+)", title)
            if m:
                yomi = ["", "いっ", "に", "さん", "よん", "ご", "ろっ", "なな", "はっ", "きゅう"][int(m.group(1))]
                slide["speech"] = f"だい{yomi}しょう。{m.group(2)}"
            elif title == "はじめに":
                slide["card"], slide["speech"] = intro_card
            else:
                slide["speech"] = title
            slide["chapter"] = title.replace("　", " ")
            chapter_no += 1
            slides.append(slide)
            continue
        t = it["topic"]
        own = picks["topics"].get(str(t), [])
        k = per_topic_used.get(t, 0)
        if it["calm"] or k >= len(own):
            if not it["calm"] and own:
                # 話題の写真が足りないときは、同じ話題の写真をもう一度使う
                photo = own[k % len(own)]
            else:
                photo = calm[used_calm % len(calm)]
                used_calm += 1
        else:
            photo = own[k]
        per_topic_used[t] = k + (0 if it["calm"] else 1)
        slide = {"type": "relax", "text": split_caption(it["text"]), "photo": photo["file"]}
        if photo.get("focus"):
            slide["focus"] = photo["focus"]
        speech = it["speech"] or it["text"]
        for a, b in readings.items():
            speech = speech.replace(a, b)
        if speech != slide["text"]:
            slide["speech"] = speech
        slides.append(slide)
    return slides


def main() -> None:
    slides = build("relax_sleep_script.txt", "photo_picks.json", READINGS, ("聞くだけで眠くなる\nやさしい暮らしの雑学", "聞くだけで眠くなる、やさしい暮らしの雑学。"))
    cards = [i for i, x in enumerate(slides) if x.get("card")]
    # 第1〜3章、第4〜6章、第7章〜おわり で曲を変える（cards[0] は「はじめに」）
    bgm = [dict(b) for b in BGM]
    bgm[1]["fromSlide"] = cards[4]
    bgm[2]["fromSlide"] = cards[7]

    ep = {
        "id": EP_ID,
        "title": "【寝落ち雑学】聞くだけで眠くなる、やさしい暮らしの雑学 45分",
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
        "description": "聞いているうちに眠くなる、やさしい暮らしの雑学を45分お話しします。部屋を暗くして、目を閉じてお聞きください。\n体・眠り・食べもの・植物・動物・空・道具・心・宇宙の雑学を100個ほど収録しています。\n※「〜という説があります」「〜という研究があります」と話している内容は、まだ確かめられている途中の話です。",
        "hashtags": ["睡眠導入", "寝落ち", "雑学", "聞き流し", "作業用"],
        "photoCredits": "Openverse 経由のフリー写真（CC0）StockSnap.io・rawpixel・iNaturalist・WordPress Photo Directory",
        "slides": slides,
    }
    out = ROOT / "src" / "episodes" / f"{EP_ID}.json"
    out.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(slides)} slides)")


if __name__ == "__main__":
    main()
