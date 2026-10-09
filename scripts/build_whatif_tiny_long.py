"""ロング動画「もし人間が10cmになったら？」（src/episodes/whatif-tiny-long.json）の台本を組み立てる。

台本はこのファイルで書き、python3 scripts/build_whatif_tiny_long.py で JSON を作り直す。
数字の根拠（身長175cm → 10cm、大きさ 1/17.5）：
  体重 1/17.5³ = 1/5359（66kg → 約12g）、筋肉の力 1/17.5²（体重のわりに17.5倍）
  ジャンプの高さはほぼ同じ（ボレリの法則）、落ちる最高速度：ふつうの人 秒速55m、10cmの人 秒速9m前後
  風の力 ÷ 体重 は 1/大きさ に比例 → 風速6mは、ふつうの人の風速25m（6 × √17.5）と同じ
  体についた水の膜（厚さはほぼ同じ）÷ 体重 → 17.5倍（ふつうの人 約0.7% → 1割以上）
"""
import json
from pathlib import Path

S = []


def w(text, **kw):
    d = {"type": "whatif", "text": text}
    d.update(kw)
    if "effect" not in d:
        d["effect"] = "none"
    S.append(d)
    return d


def card(no, title, text, tag=None, sub=None, chapter=None, **kw):
    c = {"title": title}
    if no is not None:
        c["no"] = no
    if tag:
        c["tag"] = tag
    if sub:
        c["sub"] = sub
    d = w(text, card=c, hold=0.8, **kw)
    if chapter:
        d["chapter"] = chapter
    return d


def img(text, image, **kw):
    return w(text, image=image, imageSize=kw.pop("imageSize", 520), bg=kw.pop("bg", "night"), effect=kw.pop("effect", "zoom"), **kw)


# ===== オープニング =====
w("もし、人間の身長が、10cmになったら？", sim="tworld", chapter="オープニング")
w("自分の体重の2倍の重さも、軽々と持ち上げる。", sim="tlift", simStart=1.4)
w("ビルから落ちても、時速30kmまでしか速くならない。", sim="tfall", simStart=2.0)
w("でも、そよ風が、台風のように襲ってくる。", sim="twind", simStart=1.6)
w("今回は、物理シミュレーションで、10cmの人間の世界を、本気で考えてみた。", sim="tworld", simStart=8)
card(None, ["もし人間が", "10cmになったら？"], "もし人間が、10cmになったら？", sub="物理シミュレーションで検証", sim="tworld", simStart=14)

# ===== 1 世界の大きさ =====
card(1, ["10cmの世界は", "どう見える？"], "1つめ。10cmの世界は、どう見える？", tag="世界の大きさ",
     chapter="01 10cmの世界はどう見える？", sim="tworld", simStart=18)
w("身長175cmの人が10cmになると、大きさは、17.5分の1。", sim="tworld", simStart=0,
  speech="身長175センチの人が10センチになると、大きさは、17.5分の1。")
w("つまり、まわりの物が、すべて17.5倍の大きさに見える世界だ。", sim="tworld", simStart=3)
w("この動画では、10cmの人の世界を、17.5倍に拡大して見ていくよ。", sim="tworld", simStart=6)
w("500円玉は、直径46cm。両手で抱えるほどの大きさ。", sim="tworld", simStart=9,
  speech="500円玉は、直径46センチ。両手で抱えるほどの大きさ。")
w("鉛筆は、長さ3m、太さ12cm。まるで丸太だ。", sim="tworld", simStart=20,
  speech="鉛筆は、長さ3メートル、太さ12センチ。まるで丸太だ。")
w("スマホは、高さ2.6mの、黒い壁。", sim="tworld", simStart=29,
  speech="スマホは、高さ2.6メートルの、黒い壁。")
w("そして家のドアは、高さ35m。10階建てのビルくらいある。", sim="tworld", simStart=33, big="ドアの高さ 約35m",
  speech="そして家のドアは、高さ35メートル。10階建てのビルくらいある。")
w("でも、本当にすごいのは、見た目じゃない。体のはたらきが、まるで変わってしまうんだ。", sim="tworld", simStart=36)

# ===== 2 体重と力 =====
card(2, ["体重と力は", "どうなる？"], "2つめ。体重と力は、どうなる？", tag="体重と力",
     chapter="02 体重と力はどうなる？", image="fe_coin.svg", imageSize=440, bg="night")
img("体の大きさが17.5分の1になると、体の体積、つまり体重は、17.5の3乗分の1。", "fe_coin.svg", big="体重 5359分の1",
    speech="体の大きさが17.5分の1になると、体の体積、つまり体重は、17.5の3じょう分の1。")
img("体重66kgの人なら、たったの12g。1円玉12枚分だ。", "fe_coin.svg", big="体重 約12g",
    speech="体重66キロの人なら、たったの12グラム。1円玉12枚分だ。")
img("一方、筋肉の力は、筋肉の太さ、つまり断面積で決まる。こちらは17.5の2乗分の1。", "fe_anatomical_heart.svg", effect="none",
    speech="一方、筋肉の力は、筋肉の太さ、つまり断面積で決まる。こちらは17.5の2じょう分の1。")
img("体重は5359分の1なのに、力は306分の1。だから、体重のわりに、力は17.5倍も強くなるんだ。", "fe_anatomical_heart.svg", big="体重のわりに 17.5倍",
    speech="体重は5359分の1なのに、力は306分の1。だから、体重のわりに、力は17.5倍も強くなるんだ。")
w("試しに、自分の体重の2倍の重さを、頭の上まで持ち上げてみよう。", sim="tlift")
w("ふつうの人は、132kgのバーベルを、びくともさせられない。", sim="tlift", simStart=1.5,
  speech="ふつうの人は、132キロのバーベルを、びくともさせられない。")
w("でも10cmの人は、500円玉4枚を、軽々と持ち上げてしまう。", sim="tlift", simStart=2.6)
img("アリが、自分の体重の何倍もの物を運べるのも、体が小さいから。", "fe_ant.svg")
img("大きさが変わると、体積は3乗、面積は2乗で変わる。これを、2乗3乗の法則という。", "fe_ant.svg", big="2乗3乗の法則",
    speech="大きさが変わると、体積は3じょう、面積は2じょうで変わる。これを、2じょう3じょうの法則という。")
img("この法則に、はじめて気づいたのは、ガリレオ・ガリレイだといわれているんだ。", "fe_telescope.svg")

# ===== 3 ジャンプ =====
card(3, ["ジャンプすると", "どうなる？"], "3つめ。ジャンプすると、どうなる？", tag="ジャンプ",
     chapter="03 ジャンプするとどうなる？", sim="tjump", simStart=0.3)
w("では、10cmの人がジャンプすると、どのくらい跳べるだろう？", sim="tjump")
w("実は、体の大きさが変わっても、跳べる高さは、ほとんど変わらないといわれている。", sim="tjump", simStart=2.2)
w("ふつうの人も、10cmの人も、だいたい50cm。跳んでいる時間まで、ぴったり同じだ。", sim="tjump", simStart=4.4,
  speech="ふつうの人も、10センチの人も、だいたい50センチ。跳んでいる時間まで、ぴったり同じだ。")
w("でも10cmの人にとって、50cmは、身長の5倍。ふつうの人なら、3階建ての屋根まで跳び上がるようなもの！", sim="tjump", simStart=6.6,
  big="身長の5倍", speech="でも10センチの人にとって、50センチは、身長の5倍。ふつうの人なら、3階建ての屋根まで跳び上がるようなもの！")
img("バッタやノミが、体の何十倍も跳べるのも、同じ理由なんだ。", "fe_cricket.svg")

# ===== 4 落ちる =====
card(4, ["高い所から", "落ちたら？"], "4つめ。高い所から、落ちたら？", tag="落ちる",
     chapter="04 高い所から落ちたら？", sim="tfall", simStart=0.2)
w("高さ30mのビルから、落ちてしまったら？", sim="tfall",
  speech="高さ30メートルのビルから、落ちてしまったら？")
w("ふつうの人は、地面に着くとき、時速80km以上。", sim="tfall", simStart=1.0,
  speech="ふつうの人は、地面に着くとき、時速80キロ以上。")
w("でも10cmの人は、空気抵抗で、時速30kmくらいまでしか、速くならないんだ。", sim="tfall", simStart=2.6,
  speech="でも10センチの人は、空気抵抗で、時速30キロくらいまでしか、速くならないんだ。")
img("体重のわりに、空気を受ける面が大きいから。羽根がゆっくり落ちるのと、同じ理由だ。", "fe_bird.svg")
img("生物学者のホールデンは、ネズミを深い穴に落としても、少し驚くだけで、歩いて去っていくと書いているよ。", "fe_mouse.svg",
    speech="生物学者のホールデンは、ネズミを深い穴に落としても、少しおどろくだけで、歩いて去っていくと書いているよ。")
img("10cmの人にとって、高い所は、それほど怖い場所ではないのかもしれない。", "fe_mouse.svg", effect="none")

# ===== 5 風 =====
card(5, ["風が", "吹いたら？"], "5つめ。風が、吹いたら？", tag="風",
     chapter="05 風が吹いたら？", sim="twind", simStart=1.5)
w("でも、軽さには、こわい面もある。", sim="twind")
w("風速6mの、ちょっと強い風が吹くと…", sim="twind", simStart=0.3,
  speech="風速6メートルの、ちょっと強い風が吹くと…")
w("10cmの人にとっては、風速25mの台風なみ！立っていることができないんだ。", sim="twind", simStart=1.4,
  speech="10センチの人にとっては、風速25メートルの台風なみ！立っていることができないんだ。")
w("体重のわりに、風を受ける面が大きいから。落ちても助かった理由の、ちょうど裏返しだね。", sim="twind", simStart=3.0)

# ===== 6 雨と水 =====
card(6, ["雨が", "降ったら？"], "6つめ。雨が、降ったら？", tag="雨と水",
     chapter="06 雨が降ったら？", sim="train", simStart=0.5)
w("雨の日は、さらに大変だ。", sim="train")
w("大きな雨粒は、直径5mmほど。10cmの人には、ソフトボールくらいの水のかたまりだ。", sim="train", simStart=0.2,
  speech="大きな雨粒は、直径5ミリほど。10センチの人には、ソフトボールくらいの水のかたまりだ。")
w("ふつうの人は何も感じないのに、10cmの人は、1粒当たるだけで、よろけてしまう。", sim="train", simStart=1.0,
  speech="ふつうの人は何も感じないのに、10センチの人は、1粒当たるだけで、よろけてしまう。")
img("しかも、ぬれると大変。水は表面張力で、体にまとわりつく。", "fe_droplet.svg")
img("お風呂上がりのふつうの人には、体重の1%くらいの水がついている。でも10cmの人だと、体重の1割以上になるんだ。", "fe_bathtub.svg",
    big="体重の1割以上", speech="お風呂上がりのふつうの人には、体重の1パーセントくらいの水がついている。でも10センチの人だと、体重の1割以上になるんだ。")
img("小さな虫が、水にぬれると動けなくなるのも、このためなんだ。", "fe_droplet.svg", effect="none")

# ===== 7 体温とごはん =====
card(7, ["体温とごはんは", "どうなる？"], "7つめ。体温と、ごはんは、どうなる？", tag="体温とごはん",
     chapter="07 体温とごはんはどうなる？", image="fe_thermometer.svg", imageSize=440, bg="night")
img("体が小さいと、体の熱が、どんどん逃げていく。", "fe_thermometer.svg")
img("熱が逃げる量は表面積、体にたまる熱は体積で決まる。だから10cmの人は、17.5倍も冷えやすいんだ。", "fe_thermometer.svg",
    big="17.5倍 冷えやすい", speech="熱が逃げる量は表面積、体にたまる熱は体積で決まる。だから10センチの人は、17.5倍も冷えやすいんだ。")
img("体温を保つには、たくさん食べ続けないといけない。", "fe_cooked_rice.svg")
img("ネズミは、1日に、体重の1割以上のえさを食べる。10cmの人も、同じくらい必要になりそうだ。", "fe_cooked_rice.svg",
    big="毎日 体重の1割以上")
img("心臓も、とても速くなる。ネズミの心臓は、1分間に500回以上も打っているんだ。", "fe_anatomical_heart.svg",
    big="1分間に500回以上")

# ===== 8 声 =====
card(8, ["声は", "どうなる？"], "8つめ。声は、どうなる？", tag="声",
     chapter="08 声はどうなる？", image="fe_studio_microphone.svg", imageSize=440, bg="night")
img("声の高さは、のどにある声帯の長さで決まる。短いほど、高い声になるんだ。", "fe_studio_microphone.svg")
img("声帯が17.5分の1になると、声は、とても高くなる。たとえば、こんな感じだ。", "fe_studio_microphone.svg",
    big="（イメージ）", sfx={"file": "sfx/tiny_voice.wav", "volume": 0.9}, hold=5.4)
img("ネズミは、人には聞こえないほど高い声で、おしゃべりしているといわれているよ。", "fe_mouse.svg")

# ===== まとめ =====
card(None, ["10cmの人の", "世界とは？"], "まとめ。10cmの人の世界とは？", chapter="まとめ", sim="tworld", simStart=24)
w("力持ちで、高い所から落ちても平気。", sim="tlift", simStart=2.6)
w("でも、風や雨にとても弱く、いつも、おなかをすかせている。", sim="twind", simStart=2.2)
w("それはまさに、ネズミや小鳥の世界だ。", image="fe_mouse.svg", imageSize=520, bg="night", effect="zoom")
w("大きさが変わるだけで、物理のルールは、こんなにも違って見えるんだ。", sim="tworld", simStart=12)
w("あなたは、10cmになってみたい？コメントで教えてね！", sim="tworld", simStart=26, hold=1.5,
  speech="あなたは、10センチになってみたい？コメントで教えてね！")

ILLS = ["Coin", "Ant", "Cricket", "Mouse", "Droplet", "Thermometer", "Cooked rice", "Anatomical heart",
        "Studio microphone", "Telescope", "Bird", "Bathtub"]


def ill(name):
    f = name.lower().replace(" ", "_")
    return f"fe_{f}.svg", {
        "emoji": "🐭",
        "irasutoya": f"Fluent Emoji「{name}」",
        "url": f"https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/{name.replace(' ', '%20')}/Color/{f}_color.svg",
        "credit": "Microsoft Fluent Emoji（MIT License）",
    }


# 章ごとに BGM を切り替える（何番目のスライドから）
def first(chapter_prefix):
    return next(i for i, s in enumerate(S) if s.get("chapter", "").startswith(chapter_prefix))


episode = {
    "id": "whatif-tiny-long",
    "title": "もし人間が10cmになったら？",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "whatif",
    "background": "#000",
    "slideGap": 8,
    "bgmVolume": 0.1,
    "voice": {"speaker": 13, "speed": 1.15, "name": "青山龍星"},
    "bgmPlaylist": [
        {"file": "nandeshou.mp3", "title": "なんでしょう？", "credit": "KK", "page": "https://opentracks.com/bgm/detail/710",
         "opentracks": 710, "fromSlide": 0},
        {"file": "kaeru_piano.mp3", "title": "かえるのピアノ", "credit": "こおろぎ", "page": "https://opentracks.com/bgm/detail/568",
         "opentracks": 568, "fromSlide": first("04"), "volume": 0.9},
        {"file": "hirusagari.mp3", "title": "昼下がり気分", "credit": "KK", "page": "https://opentracks.com/bgm/detail/4695",
         "opentracks": 4695, "fromSlide": first("07")},
    ],
    "headline": ["もし人間が", "10cmになったら？"],
    "illustrations": dict(ill(n) for n in ILLS),
    "slides": S,
    "description": "もし人間の身長が10cmになったら、体重・力・ジャンプ・落下・風・雨・体温・声はどうなるのか？\n"
    "「2乗3乗の法則」をもとに、物理シミュレーションで本気で考えました。\n"
    "10cmの人の世界は、17.5倍に拡大して（ふつうの人と同じ大きさにそろえて）表示しています。\n"
    "雨粒の動きは、見やすいようにゆっくり表示しています。声はイメージです。\n"
    "ほかに知りたい「もしも」は、コメントで教えてください！",
    "hashtags": ["もしも", "雑学", "物理", "科学", "2乗3乗の法則"],
    "readings": {"10cm": "10センチ"},
}
out = Path(__file__).resolve().parent.parent / "src" / "episodes" / "whatif-tiny-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(S)} slides -> {out}")
