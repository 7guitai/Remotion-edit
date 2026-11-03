"""「家の中の事故 物理エンジンで検証10選」（横長ロング）の台本から src/episodes/verify-home-long.json を作る。

場面は sim/home.ts（HomeScene・左右の部屋で条件だけ変えて比べる）と sim/stairs.ts（StairsScene）。
simStart は場面の計算の何秒目から見せるか、simSpeed は再生の速さ（0.3 なら3倍スロー）。
使い方: python3 scripts/build_home_long.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP_ID = "verify-home-long"


def s(text, *, home=None, stairs=None, start=None, speed=None, big=None, speech=None, chapter=None, hold=None, compare=None):
    x = {"type": "whatif", "text": text, "effect": "none"}
    if home:
        x["home"] = home
    if stairs:
        x["stairs"] = stairs
    if start is not None:
        x["simStart"] = start
    if speed is not None:
        x["simSpeed"] = speed
    if big:
        x["big"] = big
    if speech:
        x["speech"] = speech
    if chapter:
        x["chapter"] = chapter
    if hold:
        x["hold"] = hold
    if compare:
        x["compare"] = compare
    return x


def card(no, title, tag, text, **kw):
    x = s(text, chapter=f"{no:02d} {''.join(title)}", hold=0.8, **kw)
    x["card"] = {"title": title, "no": no, "tag": tag}
    return x


SLIDES = [
    # オープニング
    s("家の中は安全…だと思っていない？", home="bath", start=0.75, speed=0.35, chapter="オープニング"),
    s("ぬれたお風呂の床。止まれない靴下。そして、地震で倒れるタンス。", home="socks", start=1.1, speed=0.6),
    s("東京消防庁によると、お年寄りの日常の事故は、7割以上が「ころぶ」事故。その半分は、家の中などで起きているんだ。", home="furniture", start=2.9, speed=0.6),
    s("今回は、家の中の10の事故を、物理エンジンで再現して、どうすれば防げるのか検証した。", stairs="down", start=0.6, speed=0.5),
    {**s("家の中の事故 物理エンジンで検証10選", home="shelf", start=3.2, hold=0.8), "card": {"title": ["家の中の事故", "物理エンジンで検証10選"], "sub": "左右の部屋で、条件だけ変えてくらべる"}},
    # 1 階段
    card(1, ["階段の", "下り"], "踏み外し", "1つめ。階段の下り。", stairs="down", start=0, speed=0.25),
    s("下りで、かかとが段の角からすべると…体が前へ投げ出されて、頭から落ちていく。", stairs="down", start=0.9, speed=0.3, speech="下りで、かかとが段のかどからすべると…体が前へ投げ出されて、頭から落ちていく。"),
    s("5段も転げ落ちて、頭を打つ速さは時速23km。", stairs="down", start=3.7, big="時速23km", speech="5段も転げ落ちて、頭を打つ速さは時速23キロ。"),
    s("アメリカの調査では、階段の事故の約9割が、下りの途中で起きていた。", stairs="down", start=4.2),
    s("でも、手すりを持っていれば…1段で止まった！", stairs="rail", start=0.85, speed=0.5),
    s("下りるときこそ、手すりを持とう。", stairs="rail", start=3.0),
    # 2 お風呂
    card(2, ["お風呂の", "床"], "すべる", "2つめ。お風呂の床。", home="bath", start=0),
    s("左はせっけんの泡でぬれた床。右はすべり止めマット。同じように一歩ふみ出すと…", home="bath", start=0.2, speed=0.5),
    s("左の人だけ、足がすべって転んだ！頭を打つ速さは時速20km。", home="bath", start=0.75, speed=0.35, speech="左の人だけ、足がすべって転んだ！頭を打つ速さは時速20キロ。"),
    s("歩くとき、足はいつも床を前後にこすっている。床がすべりやすいと、その力を支えきれないんだ。", home="bath", start=2.6),
    s("右の人は平気。お風呂場には、すべり止めマットを敷いて、泡はしっかり流そう。", home="bath", start=3.0),
    # 3 靴下
    card(3, ["靴下で", "フローリング"], "止まれない", "3つめ。靴下でフローリング。", home="socks", start=0),
    s("走っていて、急に止まろうとすると…", home="socks", start=0.3, speed=0.6),
    s("はだしなら、0.9mで止まれた。でも靴下は、2.3mもすべって…", home="socks", start=0.9, speed=0.5, speech="はだしなら、0.9メートルで止まれた。でも靴下は、2.3メートルもすべって…"),
    s("テーブルに激突！", home="socks", start=1.35, speed=0.3, big="止まれない！"),
    s("止まるまでの距離は、床との摩擦の強さに反比例する。この検証では、靴下の摩擦を、はだしの約4分の1にしてみた。", home="socks", start=3.5),
    s("家の中で走るときは、すべり止めのついた靴下やスリッパにしよう。", home="socks", start=4.0),
    # 4 歩きスマホ
    card(4, ["歩きスマホで", "つまずく"], "コードに引っかかる", "4つめ。歩きスマホでつまずく。", home="cord", start=0.3),
    s("床のコードに、足が引っかかった！", home="cord", start=1.3, speed=0.4),
    s("前を見ていた人は、とっさに手をついた。でも、スマホを見ていた人は…", home="cord", start=1.8, speed=0.4),
    s("手が出ずに、頭から落ちた！時速16km。", home="cord", start=2.5, speed=0.5, big="手が出ない", speech="手が出ずに、頭から落ちた！時速16キロ。"),
    s("スマホを持った手は、とっさに前へ出しにくい。床のコードは、壁ぞいにまとめておこう。", home="cord", start=4.0),
    # 5 踏み台・脚立
    card(5, ["高い所の", "物をとる"], "踏み台と脚立", "5つめ。高い所の物をとる。", home="ladder", start=0),
    s("左は高さ45cmの踏み台。右は高さ1.2mの脚立の天板。横へ手をのばして、バランスをくずすと…", home="ladder", start=0.4, speed=0.6, speech="左は高さ45センチの踏み台。右は高さ1.2メートルの脚立の天板。横へ手をのばして、バランスをくずすと…"),
    s("踏み台でも、頭を打つ速さは時速16km。脚立の天板からだと、時速25km！", home="ladder", start=1.6, speed=0.45, speech="踏み台でも、頭を打つ速さは時速16キロ。脚立の天板からだと、時速25キロ！"),
    s("NITEによると、脚立の事故は10年間で287件。天板に乗ることを禁止している脚立もある。", home="ladder", start=3.5, speech="ナイトによると、脚立の事故は10年間で287件。天板に乗ることを禁止している脚立もある。"),
    s("取りたい物の近くに台を動かして、体をのり出さないようにしよう。", home="ladder", start=4.5),
    # 6 ベッド
    card(6, ["ベッドから", "落ちる"], "寝返り", "6つめ。ベッドから落ちる。", home="bed", start=0),
    s("ぐっすり寝ていて、大きく寝返りを打つと…", home="bed", start=0.6, speed=0.6),
    s("ベッドの端から、床へドスン！高さは50cmでも、体は受け身をとれない。", home="bed", start=1.2, speed=0.5, speech="ベッドのはしから、床へドスン！高さは50センチでも、体は受け身をとれない。"),
    s("右のベッドガードは、転がった体をしっかり止めた。", home="bed", start=2.5),
    s("寝相が悪い人や、小さな子どもと寝るときは、ガードや低いベッドが安心だ。", home="bed", start=3.5),
    # 7 寝ながらスマホ
    card(7, ["寝ながら", "スマホ"], "顔に落とす", "7つめ。寝ながらスマホ。", home="phone", start=0.4),
    s("あおむけでスマホを見ていて、手がすべると…", home="phone", start=0.7, speed=0.4),
    s("ゴツッ！30cmの高さから落ちると、顔に当たる速さは時速8.6km。", home="phone", start=1.1, speed=0.3, speech="ゴツッ！30センチの高さから落ちると、顔に当たる速さは、時速8.6キロ。"),
    s("落ちる速さは、重さに関係なく同じ。でも、衝撃のエネルギーは重さに比例する。", home="phone", start=2.0),
    s("タブレットは、スマホの2.5倍の衝撃。寝ながら見るなら、横向きで持とう。", home="phone", start=2.5, big="2.5倍"),
    # 8 ドア
    card(8, ["ドアに", "指をはさむ"], "てこの原理", "8つめ。ドアに指をはさむ。", home="door", start=0.2),
    s("指のかわりに、にんじんをはさんでみる。左はドアノブ側、右はちょうつがい側。", home="door", start=0.3),
    s("同じ力で閉めると…ちょうつがい側のにんじんだけ、粉々に！", home="door", start=1.1, speed=0.3, speech="同じ力で閉めると…ちょうつがい側のにんじんだけ、こなごなに！"),
    s("これは、てこの原理。ちょうつがいの近くでは、ドアノブを押した力の約36倍の力がかかる。", home="door", start=1.8, big="約36倍"),
    s("5kgの力で押しただけで、約184kg分。子どもの指が切断される事故も起きている。", home="door", start=2.0, speech="5キロの力で押しただけで、約184キロ分。子どもの指が切断される事故も起きている。"),
    s("ちょうつがい側には、すき間をふさぐカバーをつけよう。", home="door", start=2.5),
    # 9 本棚
    card(9, ["地震で", "本棚が倒れる"], "重い物の置き場所", "9つめ。地震で本棚が倒れる。", home="shelf", start=0.4),
    s("左は重い箱を上の段に、右は下の段に入れた本棚。大きな地震の揺れがくると…", home="shelf", start=1.0, speed=0.8),
    s("重い物が上の本棚だけ、倒れた！", home="shelf", start=3.2, speed=0.5, big="倒れた！"),
    s("重い物が上にあると、重心が高くなって、少しかたむいただけで倒れてしまうんだ。", home="shelf", start=4.6),
    s("右の本棚は、揺れても倒れなかった。重い物は下の段にしまおう。", home="shelf", start=6.0),
    # 10 タンス
    card(10, ["地震で", "タンスが倒れる"], "固定する", "最後、10こめ。地震でタンスが倒れる。", home="furniture", start=0.4, speech="最後、じゅっこめ。地震でタンスが倒れる。"),
    s("寝ている人のそばに、背の高いタンス。左は固定なし、右はL字金具で壁に固定。", home="furniture", start=1.0, speed=0.8, speech="寝ている人のそばに、背の高いタンス。左は固定なし、右はエルじ金具で壁に固定。"),
    s("固定していないタンスが、寝ている人の上に！", home="furniture", start=2.9, speed=0.5, big="ドーン！"),
    s("東京消防庁によると、最近の地震でけがをした人の3割から5割は、家具の転倒や落下などが原因だった。", home="furniture", start=4.2),
    s("金具で固定したタンスは、倒れなかった。寝る場所の近くには、背の高い家具を置かないようにしよう。", home="furniture", start=6.0),
    # まとめ
    s("家の中の10の事故。気をつけるだけで、防げるものばかりだ。", chapter="まとめ", compare={
        "title": "頭を打つ速さ（時速km）",
        "rows": [
            {"label": "脚立の天板から落ちる", "value": 25, "unit": "km", "color": "#ff4a3d"},
            {"label": "階段の下りで踏み外す", "value": 23, "unit": "km", "color": "#ff8a00"},
            {"label": "お風呂ですべる", "value": 20, "unit": "km", "color": "#2f8bff"},
        ],
        "max": 25,
        "note": "物理エンジンの結果",
    }),
    s("あなたの家で、気になる場所はあった？検証してほしいことがあれば、コメントで教えてね！", home="furniture", start=7.0, hold=1),
]

BGM = [
    {"file": "tanoshii_kaerimichi.mp3", "title": "楽しい帰り道", "credit": "GANO", "page": "https://opentracks.com/bgm/detail/3438", "opentracks": 3438, "track": 1, "fromChapter": 0},
    {"file": "cassette_tape_dream.mp3", "title": "Cassette Tape Dream", "credit": "しゃろう", "page": "https://opentracks.com/bgm/detail/13963", "opentracks": 13963, "track": 1, "fromChapter": 4},
    {"file": "nine_jack.mp3", "title": "Nine Jack", "credit": "まんぼう二等兵", "page": "https://opentracks.com/bgm/detail/4899", "opentracks": 4899, "track": 1, "fromChapter": 8},
]

DESCRIPTION = """家の中で起きる10の事故を、物理エンジン（cannon-es）で再現して検証しました。左右の部屋で条件だけを変えて、どうすれば防げるのかをくらべています。
階段の下り・お風呂の床・靴下でフローリング・歩きスマホ・踏み台と脚立・ベッド・寝ながらスマホ・ドアのちょうつがい・地震で倒れる本棚とタンス。

▼ 参考にした資料
・東京消防庁「救急搬送データからみる高齢者の事故」（ころぶ事故が7割以上、その半数は住宅等で発生）
・東京消防庁「家具類の転倒・落下・移動防止対策」（近年の地震で負傷者の3〜5割が家具類の転倒・落下・移動が原因）
・NITE（製品評価技術基盤機構）はしご・脚立の事故（2010〜2019年度に脚立の事故287件）
・消費者庁 子どもの事故防止「ドアでの指はさみ」
・階段の事故の約9割が下り：米国の職場の階段事故の調査（CDC/NIOSH）
※数値は物理エンジンでのシミュレーション結果です。実際には体格や転び方、床や家具の状態で変わります。
※人や物の動きは計算で作っています。実際に試すのは危険なので、まねをしないでください。

ほかに検証してほしいことは、コメントで教えてください！"""


def main() -> None:
    playlist = []
    for b in BGM:
        x = {k: v for k, v in b.items() if k != "fromChapter"}
        n = b["fromChapter"]
        x["fromSlide"] = 0 if n == 0 else next(i for i, sl in enumerate(SLIDES) if sl.get("card", {}).get("no") == n)
        playlist.append(x)
    ep = {
        "id": EP_ID,
        "title": "家の中の事故 物理エンジンで検証10選【階段・お風呂・地震でタンス】",
        "format": "landscape",
        "titleBand": False,
        "pr": False,
        "style": "whatif",
        "background": "#000",
        "slideGap": 8,
        "bgmVolume": 0.1,
        "voice": {"speaker": 13, "speed": 1.15, "name": "青山龍星"},
        "bgmPlaylist": playlist,
        "headline": ["家の中の事故", "物理エンジンで検証10選"],
        "kicker": "検証",
        "illustrations": {},
        "description": DESCRIPTION,
        "hashtags": ["検証", "雑学", "防災", "物理", "物理シミュレーション"],
        "slides": SLIDES,
    }
    out = ROOT / "src" / "episodes" / f"{EP_ID}.json"
    out.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(SLIDES)} slides)")


if __name__ == "__main__":
    main()
