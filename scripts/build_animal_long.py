"""「もし人間が動物の能力を持っていたら？10選」（横長ロング）の台本から src/episodes/whatif-animal-long.json を作る。

場面は sim/animal.ts（AnimalScene）と sim/flea.ts（FleaScene）。simStart は場面の計算の何秒目から見せるか、
simSpeed は再生の速さ（0.1 なら10倍スロー）。
使い方: python3 scripts/build_animal_long.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP_ID = "whatif-animal-long"


def s(text, *, animal=None, flea=None, start=None, speed=None, big=None, speech=None, chapter=None, hold=None):
    x = {"type": "whatif", "text": text, "effect": "none"}
    if animal:
        x["animal"] = animal
    if flea:
        x["flea"] = flea
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
    return x


def card(no, title, tag, text, **kw):
    x = s(text, chapter=f"{no:02d} {''.join(title)}", hold=0.8, **kw)
    x["card"] = {"title": title, "no": no, "tag": tag}
    return x


SLIDES = [
    # オープニング
    s("もし人間が、動物の能力を持っていたら？", animal="cheetah", start=5.5, chapter="オープニング"),
    s("ノミのジャンプ力なら、13階建てのビルをひと跳び。", flea="jump", start=2.4, speed=0.7),
    s("シャコのパンチなら、レンガの壁も吹き飛ぶ。", animal="shrimp", start=1.9, speed=0.35),
    s("今回は、10種類の動物の能力を、物理シミュレーションで、人間に当てはめてみた。", animal="cat", start=0.6, speed=0.5),
    {**s("もし人間が、動物の能力を持っていたら？", animal="falcon", start=6, hold=0.8), "card": {"title": ["もし人間が", "動物の能力を持っていたら？"], "sub": "物理シミュレーションで検証"}},
    # 1 チーター
    card(1, ["チーターの", "足"], "走る速さ", "1つめ。チーターの足。", animal="cheetah"),
    s("野生のチーターの最高速度は、時速93km。GPSの首輪をつけて、実際に測った記録だ。", animal="cheetah", start=0, speech="野生のチーターの最高速度は、時速93キロ。GPSの首輪をつけて、実際に測った記録だ。"),
    s("もし人間がこの速さで走れたら、時速60kmの車も、あっという間に追い抜いてしまう。", animal="cheetah", start=2.6, big="時速93km", speech="もし人間がこの速さで走れたら、時速60キロの車も、あっという間に追い抜いてしまう。"),
    s("100m走のタイムは、約5.4秒。世界記録の9秒58より、4秒も速い。", animal="cheetah", start=6.4, speech="100メートル走のタイムは、約5.4秒。世界記録の9秒58より、4秒も速い。"),
    s("家から1km先の駅までなら、わずか39秒で着いてしまう。", animal="cheetah", start=4.2, speech="家から1キロ先の駅までなら、わずか39秒で着いてしまう。"),
    s("でも、問題は止まるとき。この速さで転んだら…", animal="cheetah", start=8.0, speed=0.45),
    s("体は数十mも転がって、段ボールの山に突っこむ。チーターは、長いしっぽでバランスをとって、急ブレーキや急カーブをしているんだ。", animal="cheetah", start=9.3, speech="体は数十メートルも転がって、段ボールの山に突っこむ。チーターは、長いしっぽでバランスをとって、急ブレーキや急カーブをしているんだ。"),
    # 2 ノミ
    card(2, ["ノミの", "ジャンプ力"], "跳ぶ高さ", "2つめ。ノミのジャンプ力。", flea="jump", start=0),
    s("ノミは、体の長さの約23倍の高さまで跳ぶ。人間なら、なんと約40m！", flea="jump", start=2.3, speed=0.5, big="約40m", speech="ノミは、体の長さの約23倍の高さまで跳ぶ。人間なら、なんと約40メートル！"),
    s("13階建てのビルを、ひと跳びで越える高さ。下の町が、ミニチュアみたいだ。", flea="top", start=5.2, speed=0.15),
    s("でも、着地は時速100km。止めてある車の屋根も、ぺしゃんこ。", flea="land", start=6.3, speed=0.75, speech="でも、着地は時速100キロ。止めてある車の屋根も、ぺしゃんこ。"),
    s("跳ぶ瞬間には、重力の100倍以上の力。人間の体では、とても耐えられない。", flea="jump", start=2.45, speed=0.08, big="100G以上"),
    # 3 フンコロガシ
    card(3, ["フンコロガシの", "力"], "引っぱる力", "3つめ。フンコロガシの力。", animal="beetle"),
    s("ある種類のフンコロガシは、自分の体重の1141倍の重さを、引っぱることができる。", animal="beetle", start=0),
    s("人間なら、体重66kgの1141倍で、約75トン。バス6台をまとめて引っぱれる。", animal="beetle", start=1.2, big="約75トン", speech="人間なら、体重66キロの1141倍で、約75トン。バス6台をまとめて引っぱれる。"),
    s("これは、昆虫の中でもいちばん強い力だといわれている。", animal="beetle", start=6),
    s("体が小さいほど、重さのわりに力は強くなる。小さな虫だから、できることなんだ。", animal="beetle", start=10),
    # 4 ヤモリ
    card(4, ["ヤモリの", "手足"], "はりつく力", "4つめ。ヤモリの手足。", animal="gecko"),
    s("ヤモリの足の裏には、とても細かい毛がびっしり。分子どうしが引き合う力で、壁や天井にはりつく。", animal="gecko", start=0),
    s("もし人間の手と足に、同じ力があったら、ビルの壁も、すいすい登れてしまう。", animal="gecko", start=3, speech="もし人間の手と足に、おなじちからがあったら、ビルの壁も、すいすい登れてしまう。"),
    s("ヤモリの足は、1平方センチメートルあたり、約2kg分の力でくっつく。人間の手のひらと足の裏なら、合わせて1トン以上を支えられる計算だ。", animal="gecko", start=7, big="1トン以上", speech="ヤモリの足は、1平方センチメートルあたり、約2キロ分の力でくっつく。人間の手のひらと足の裏なら、合わせて1トン以上を支えられる計算だ。"),
    s("この仕組みは、何度でもはがせるテープや、壁を登るロボットの研究にも使われているよ。", animal="gecko", start=11),
    # 5 ネコ
    card(5, ["ネコの", "着地"], "空中で体をひねる", "5つめ。ネコの着地。", animal="cat", start=0, speed=0.5),
    s("ネコは、背中から落ちても、空中でくるっと体をひねって、足から着地する。これを、立ち直り反射という。", animal="cat", start=0.3, speed=0.3),
    s("左のふつうの人は、背中から落ちてしまう。右は、空中で体をひねって、足から着地！", animal="cat", start=0.8, speed=0.3),
    s("ネコは体重のわりに面積が広く、落ちる速さは時速100kmくらいで頭打ち。人間は時速200kmくらいまで速くなる。", animal="cat", start=2.2, speech="ネコは体重のわりに面積が広く、落ちる速さは時速100キロくらいで頭打ち。人間は時速200キロくらいまで速くなる。"),
    s("ネコの落ちる速さが最高になるのは、建物の5〜7階くらいの高さから落ちたときだといわれている。", animal="cat", start=0.9, speed=0.3, speech="ネコの落ちる速さが最高になるのは、建物の5階から7階くらいの高さから落ちたときだといわれている。"),
    # 6 ハヤブサ
    card(6, ["ハヤブサの", "急降下"], "いちばん速い動物", "6つめ。ハヤブサの急降下。", animal="falcon"),
    s("地球でいちばん速い動物は、ハヤブサ。獲物をめがけて急降下するとき、時速389kmを記録したという。", animal="falcon", start=0, speech="地球でいちばん速い動物は、ハヤブサ。獲物をめがけて急降下するとき、時速389キロを記録したという。"),
    s("スカイダイバーは、空気の抵抗で、時速200kmくらいで頭打ちになる。", animal="falcon", start=5, speech="スカイダイバーは、空気の抵抗で、時速200キロくらいで頭打ちになる。"),
    s("ハヤブサは、翼をたたんで矢のような形になり、空気の抵抗を小さくしている。新幹線の最高速度、時速320kmより速いんだ。", animal="falcon", start=9, big="時速389km", speech="ハヤブサは、翼をたたんで矢のような形になり、空気の抵抗を小さくしている。新幹線の最高速度、時速320キロより速いんだ。"),
    # 7 カメレオン
    card(7, ["カメレオンの", "舌"], "のびる速さ", "7つめ。カメレオンの舌。", animal="chameleon", start=0),
    s("カメレオンは、体の長さの約2倍まで、舌を一瞬でのばす。", animal="chameleon", start=0.8),
    s("人間なら、約3.5m先のリンゴも、口から舌をのばして、パクッ。", animal="chameleon", start=1.85, speed=0.06, speech="人間なら、約3.5メートル先のリンゴも、口から舌をのばして、パクッ。"),
    s("その加速は、なんと重力の264倍。100分の1秒で、時速97kmに達する。", animal="chameleon", start=1.9, speed=0.04, big="重力の264倍", speech="その加速は、なんと重力の264倍。100分の1秒で、時速97キロに達する。"),
    s("舌の中に、ゴムのようにのびる組織があって、ばねのように力をためて、一気に放っているんだ。", animal="chameleon", start=2.6),
    # 8 シャコ
    card(8, ["シャコの", "パンチ"], "最速のパンチ", "8つめ。シャコのパンチ。", animal="shrimp", start=0),
    s("シャコという海の生き物は、ハンマーのような腕で、かたい貝を割って食べる。", animal="shrimp", start=0.3),
    s("そのパンチは、秒速23m。加速は、重力の約1万倍！", animal="shrimp", start=1.95, speed=0.12, big="重力の約1万倍", speech="そのパンチは、秒速23メートル。加速は、重力の約1万倍！"),
    s("人間のパンチがこの速さなら、レンガの壁も、こなごなに吹き飛ぶ。", animal="shrimp", start=2.0, speed=0.4),
    s("水の中では、パンチのいきおいで泡ができる。その泡がつぶれる衝撃でも、獲物をたたくんだ。", animal="shrimp", start=3.5),
    s("大きなシャコは、水そうのガラスを割ってしまうこともあるほど。飼うときは注意が必要だ。", animal="shrimp", start=2.3, speed=0.5),
    # 9 バシリスク
    card(9, ["バシリスクの", "足"], "水の上を走る", "9つめ。バシリスクの足。", animal="basilisk"),
    s("中南米にすむトカゲ、バシリスクは、水の上を走ることができる。", animal="basilisk", start=0.5),
    s("人間が同じことをするには、時速108kmで走りつづける必要がある、という計算がある。", animal="basilisk", start=3.2, big="時速108km", speech="人間が同じことをするには、時速108キロで走りつづける必要がある、という計算がある。"),
    s("時速108kmは、高速道路を走る車と同じくらい。それで水の上を走りつづけるんだ。", animal="basilisk", start=4.6, speech="時速108キロは、高速道路を走る車と同じくらい。それで水の上を走りつづけるんだ。"),
    s("しかも、少しでも遅くなると…", animal="basilisk", start=6.0, speed=0.6),
    s("ドボン。体の重さを支えきれず、しずんでしまう。必要なパワーは、人間の限界の約15倍だ。", animal="basilisk", start=7.0),
    # 10 キツツキ
    card(10, ["キツツキの", "頭"], "つつく速さ", "最後、10こめ。キツツキの頭。", animal="woodpecker", start=0, speech="最後、じゅっこめ。キツツキの頭。"),
    s("キツツキは、1秒に20回ほどの速さで、木をつつく。", animal="woodpecker", start=1.3, speed=0.1),
    s("1回つつくたびに、脳には最大で約400Gの衝撃。人間なら、脳しんとうを起こしてもおかしくない強さだ。", animal="woodpecker", start=2.0, big="約400G", speech="1回つつくたびに、脳には最大で約400ジーの衝撃。人間なら、脳しんとうを起こしてもおかしくない強さだ。"),
    s("キツツキが平気なのは、脳がとても小さくて軽いから。小さいほど、同じ衝撃でも、脳への負担が小さいんだ。", animal="woodpecker", start=3.0),
    # まとめ
    s("10種類の動物の能力。あなたは、どれがほしい？", animal="cheetah", start=4, chapter="まとめ"),
    s("実は、動物のすごい能力の多くは、体が小さいからできること。人間の大きさでは、体がもたないものも多いんだ。", animal="beetle", start=12),
    s("ほしい能力を、コメントで教えてね！", animal="cat", start=2.5, hold=1),
]


# BGM（第1〜3章、第4〜7章、第8章〜おわり で切りかえ）
BGM = [
    {"file": "clap.mp3", "title": "CLAP!", "credit": "稿屋 隆", "page": "https://opentracks.com/bgm/detail/182", "opentracks": 182, "track": 1, "fromChapter": 0},
    {"file": "odore_glocken.mp3", "title": "おどれグロッケンシュピール", "credit": "しゃろう", "page": "https://opentracks.com/bgm/detail/8662", "opentracks": 8662, "track": 1, "fromChapter": 4},
    {"file": "harikiccyau.mp3", "title": "はりきっちゃう時のテーマ", "credit": "こおろぎ", "page": "https://opentracks.com/bgm/detail/465", "opentracks": 465, "track": 1, "fromChapter": 8},
]


DESCRIPTION = """もし人間が、動物のすごい能力を持っていたら？チーター・ノミ・フンコロガシ・ヤモリ・ネコ・ハヤブサ・カメレオン・シャコ・バシリスク・キツツキの10種類を、物理シミュレーションで人間に当てはめてみました。
人や物の動きは物理エンジン（cannon-es）で計算しています（走る・登るなどの決まった動きは、関節の角度から計算しています）。

▼ 参考にした研究・記録
・チーター 時速93km：Wilson et al. (2013) Nature「Locomotion dynamics of hunting in wild cheetahs」
・ノミ 体長の約23倍・100G以上：Bennet-Clark & Alder (1967) J. Exp. Biol.「The Jump of the Flea」
・フンコロガシ 体重の1141倍：Knell & Simmons (2010) Proc. R. Soc. B（Onthophagus taurus）
・ヤモリ 足の裏の付着力：Autumn et al. (2000) Nature ほか
・ネコ 落ちる速さ 時速約100km：立ち直り反射（Cat righting reflex）
・ハヤブサ 時速389km：ギネス世界記録
・カメレオン 舌の加速264G：Anderson (2016) Scientific Reports
・シャコ パンチの加速：Patek et al. (2004) Nature
・バシリスク 人なら時速約108km：Glasheen & McMahon (1996) の計算をもとにした試算
・キツツキ 脳にかかる衝撃 最大約400G：Van Wassenbergh et al. (2022) Current Biology
※人間に当てはめた数字は、体の大きさの比で計算した目安です。

ほしい能力を、コメントで教えてください！"""


def main() -> None:
    playlist = []
    for b in BGM:
        x = {k: v for k, v in b.items() if k != "fromChapter"}
        n = b["fromChapter"]
        x["fromSlide"] = 0 if n == 0 else next(i for i, sl in enumerate(SLIDES) if sl.get("card", {}).get("no") == n)
        playlist.append(x)
    ep = {
        "id": EP_ID,
        "title": "もし人間が、動物の能力を持っていたら？10選【物理シミュレーション】",
        "format": "landscape",
        "titleBand": False,
        "pr": False,
        "style": "whatif",
        "background": "#000",
        "slideGap": 8,
        "bgmVolume": 0.1,
        "voice": {"speaker": 13, "speed": 1.15, "name": "青山龍星"},
        "bgmPlaylist": playlist,
        "headline": ["もし人間が", "動物の能力を持っていたら？"],
        "illustrations": {},
        "description": DESCRIPTION,
        "hashtags": ["もしも", "雑学", "動物", "物理", "物理シミュレーション"],
        "slides": SLIDES,
    }
    old = ROOT / "src" / "episodes" / f"{EP_ID}.json"
    if old.exists():
        prev = json.loads(old.read_text(encoding="utf-8"))
        for k in ("description",):
            if prev.get(k):
                ep[k] = prev[k]
    old.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {old} ({len(SLIDES)} slides)")


if __name__ == "__main__":
    main()
