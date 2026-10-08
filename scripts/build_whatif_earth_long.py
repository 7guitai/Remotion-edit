"""ロング動画「地球の“もしも”10選」（src/episodes/whatif-earth-long.json）の台本を組み立てる。

台本はこのファイルで書き、python3 scripts/build_whatif_earth_long.py で JSON を作り直す。
"""
import json
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
    if no is not None: c["no"] = no
    if tag: c["tag"] = tag
    if sub: c["sub"] = sub
    d = w(text, card=c, hold=0.8, **kw)
    if chapter: d["chapter"] = chapter
    return d
E = lambda **k: {"texture": "earth", **k}

# ===== オープニング =====
w("もし、重力が半分になったら？", sim="jump", simStart=0.7, chapter="オープニング")
w("もし、摩擦が消えたら？", sim="fchaos", simStart=0.9)
w("もし、太陽が消えたら？", footage={"file": "sun_a.mp4", "start": 1}, effect="vanish", bg="space")
w("もし、海がなくなったら？", globe={"texture": "earth_jul", "textureTo": "earth_dry", "fade": [0.05, 0.75], "speed": 0.5}, bg="space")
w("もし、地球に輪があったら？", globe=E(rings=True, size=0.6, speed=0.6), bg="space", effect="zoom")
w("今回は、地球の「もしも」を10個、物理シミュレーションと、NASAの本物の映像で、本気で考えてみた。",
  speech="今回は、地球のもしもを10個、物理シミュレーションと、ナサの本物の映像で、本気で考えてみた。",
  globe=E(speed=0.9), bg="space", effect="zoom")
card(None, ["地球の“もしも”", "10選"], "地球のもしも、10選。", sub="物理シミュレーション × NASAの本物の映像",
     globe=E(speed=0.5, size=0.8), bg="space")

# ===== 1 重力が半分 =====
card(1, ["もし重力が", "半分になったら？"], "1つめ。もし、重力が半分になったら？", tag="重力が半分",
     chapter="01 もし重力が半分になったら？", globe=E(speed=0.8), bg="space")
w("まず、体重計にのると、体重がなんと半分に。66キロの人なら、33キロだ。", sim="scale")
w("でも、筋肉の力はそのまま。だから、ジャンプすると、ずっと高く跳べるんだ。", sim="jump")
w("転んだときも、倒れるのがゆっくりになって、地面にぶつかる勢いも、弱くなる。", sim="slip")
w("ボールを投げると、空気の抵抗を考えなければ、2倍近く遠くまで飛ぶ。", sim="throw")
w("ただし、困ることもある。タイヤが地面を押す力も半分になるので、止まるまでの距離は、約2倍に。", sim="brake")
w("スポーツも、大きく変わる。バスケットボールのダンクも、だれでもできるようになるかも。", sim="party")
w("さらに、地球が空気を引きとめる力も弱くなる。長い時間をかけて、空気が宇宙へ逃げやすくなるといわれているんだ。",
  footage={"file": "iss_ocean.mp4", "start": 1}, bg="space")
w("実際に、重力が地球の約4割しかない火星は、大気の濃さが、地球の100分の1ほどしかない。",
  globe={"texture": "mars", "speed": 0.7}, bg="space", big="重力 約4割", effect="zoom")
w("重力が小さいことも、その理由の一つと考えられているんだ。", globe={"texture": "mars", "speed": 0.7, "size": 1.25}, bg="space")

# ===== 2 摩擦がゼロ =====
card(2, ["もし摩擦が", "なくなったら？"], "2つめ。もし、摩擦がなくなったら？", tag="摩擦がゼロ",
     chapter="02 もし摩擦がなくなったら？", footage={"file": "arctic_sea_ice_2026.mp4", "start": 10, "zoom": 1.25, "focus": [0.4, 0.62]}, bg="space")
w("まず、歩くことができない。一歩ふみ出すと、足がすべって、転んでしまうんだ。", sim="fstand")
w("重い荷物も、軽く押すだけで動き出す。でも、押した自分も、後ろへすべっていく。", sim="fpush")
w("車は、ブレーキをかけても止まれない。止まる力も、摩擦が生み出しているからなんだ。", sim="fbrake")
w("壁に立てかけた、はしごも、足もとがすべって倒れてしまう。", sim="ladder")
w("ネジや釘も、摩擦の力でとまっている。家具は、バラバラになってしまうかも。", image="fe_nut_and_bolt.svg", imageSize=560, bg="night", effect="shake")
w("ひもの結び目もほどけて、靴ひもも結べない。", image="fe_knot.svg", imageSize=560, bg="night", effect="zoom")
w("鉛筆で字が書けるのも、芯が紙にこすれて、粉が残るから。摩擦がないと、字も書けないんだ。",
  image="fe_pencil.svg", imageSize=560, bg="night", effect="zoom", big="摩擦のおかげ")
w("実は、音を出すのにも摩擦が使われている。バイオリンの音は、弓と弦がこすれて生まれるんだ。",
  speech="実は、音を出すのにも摩擦が使われている。バイオリンの音は、弓とげんがこすれて生まれるんだ。",
  image="fe_violin.svg", imageSize=560, bg="night", effect="zoom")
w("ふだんは邪魔に思える摩擦。でも実は、私たちの暮らしを、しっかり支えてくれているんだね。",
  footage={"file": "arctic_sea_ice_2026.mp4", "start": 30, "zoom": 1.25, "focus": [0.4, 0.62]}, bg="space")

# ===== 3 空気が2倍 =====
card(3, ["もし空気が", "2倍の濃さになったら？"], "3つめ。もし、空気が2倍の濃さになったら？", tag="空気が2倍",
     chapter="03 もし空気が2倍の濃さになったら？", footage={"file": "iss_storm.mp4", "start": 1}, bg="space")
w("空気の濃さが2倍になると、同じ速さの風でも、物を押す力が、2倍になる。", footage={"file": "iss_storm.mp4", "start": 3}, bg="space", big="風の力 2倍")
w("台風なみの風の中、いまの空気なら、なんとか立っていられる。でも、空気が2倍だと、人も荷物も、吹き飛ばされてしまうんだ。", sim="wind", effect="wind")
w("気圧も2倍になるので、水がふっとうする温度は、約120度に上がる。料理の時間も、変わりそうだ。",
  image="fe_pot_of_food.svg", imageSize=560, bg="night", effect="zoom", big="約120℃でふっとう")
w("空気中の酸素も増えるので、ものが燃えやすくなり、火事が広がりやすくなるといわれている。",
  image="fe_fire.svg", imageSize=560, bg="night", effect="shake")
w("そのかわり、つばさが受ける力も大きくなるので、鳥や飛行機は、空に浮かびやすくなる。",
  image="fe_airplane.svg", imageSize=560, bg="sky", effect="zoom")
w("雨つぶは、空気の抵抗が大きくなって、今より、ゆっくり落ちてくるようになる。",
  image="fe_cloud_with_rain.svg", imageSize=560, bg="sky", effect="zoom")
w("ちなみに、お隣の金星の大気は、地球の約90倍。地上は、約460度の、灼熱の世界なんだ。",
  speech="ちなみに、お隣のきんせいの大気は、地球の約90倍。地上は、約460度の、灼熱の世界なんだ。",
  photo={"file": "venus_mariner10.jpg", "zoom": 1.0}, bg="space", big="気圧 約90倍")

# ===== 4 地球が2倍の大きさ =====
card(4, ["もし地球が", "2倍の大きさだったら？"], "4つめ。もし、地球が2倍の大きさだったら？", tag="地球が2倍",
     chapter="04 もし地球が2倍の大きさだったら？", globe=E(speed=0.7, size=0.55, sizeTo=1.0), bg="space")
w("同じ材料でできたまま、直径が2倍になると、表面の重力も、約2倍になる。",
  globe=E(speed=0.7, size=0.5, sizeTo=1.05), bg="space", big="重力 約2倍")
w("体重計にのると、66キロの人が、132キロに。", sim="scale", simG=2)
w("ジャンプしても、ほとんど跳べない。", sim="jump", simG=2)
w("転ぶときも、ずっと速く、地面にたたきつけられてしまう。", sim="slip", simG=2)
w("投げたボールも、すぐに落ちてしまう。", sim="throw", simG=2)
w("高い山も、できにくくなる。重力が強いと、山が自分の重さで、くずれやすくなるからだ。",
  footage={"file": "iss_land.mp4", "start": 1}, bg="space")
w("生き物は、重い体を支えるために、背が低く、がっしりした体つきになるかもしれない。",
  image="fe_elephant.svg", imageSize=560, bg="sky", effect="zoom")
w("反対に、重力が小さい火星には、エベレストの約2.5倍の高さといわれる、オリンポス山があるんだ。",
  photo={"file": "olympus_mons_viking.jpg", "zoom": 1.05}, bg="space", big="約2.5倍")

# ===== 5 自転が止まる =====
card(5, ["もし地球の自転が", "止まったら？"], "5つめ。もし、地球の自転が、急に止まったら？", tag="自転が止まる",
     chapter="05 もし地球の自転が止まったら？", globe=E(speed=2.5), bg="space")
w("地球は今も、ものすごい速さで回っている。赤道のあたりでは、時速およそ1700キロ。音より速いんだ。",
  speech="地球は今も、ものすごい速さで回っている。赤道のあたりでは、時速およそせんななひゃっキロ。音より速いんだ。",
  globe=E(speed=4), bg="space", big="時速 約1700km")
w("その回転が、急ブレーキで止まると、", globe=E(speed=5, stopAt=24), bg="space", effect="stop")
w("地面の上のものは、勢いのまま、東へ吹き飛ばされる。", footage={"file": "iss_land.mp4", "start": 1}, effect="wind")
w("空気も同じ速さで動いているから、とてつもない暴風が、地球をおそう。", footage={"file": "iss_storm.mp4", "start": 1}, effect="wind")
w("海の水も止まれずに、巨大な津波になって、陸へ押し寄せる。", speech="海の水もとまれずに、巨大な津波になって、陸へ押し寄せる。", footage={"file": "iss_ocean.mp4", "start": 1}, effect="flood")
w("もし生き残れても、1日の長さが、1年になってしまう。昼が約半年、夜も約半年、続くんだ。",
  globe={"texture": "earth_night", "speed": 0.3}, bg="space", big="1日＝1年")
w("さらに、海の水は北と南へ動いて、赤道には、巨大な大陸が現れると考えられている。",
  globe=E(speed=0.6, tilt=0), bg="space", effect="arrows")
w("でも安心して。地球の自転が急に止まることは、ないと考えられているんだ。",
  photo={"file": "blue_marble_east.jpg", "zoom": 1.05}, bg="space")

# ===== 6 1日が12時間 =====
card(6, ["もし1日が", "12時間だったら？"], "6つめ。もし、1日が12時間だったら？", tag="1日12時間",
     chapter="06 もし1日が12時間だったら？", globe=E(speed=3), bg="space")
w("地球の回る速さが2倍になると、1日は12時間。昼と夜は、およそ6時間ずつになる。",
  globe=E(speed=2.4), bg="space", big="1日 12時間")
w("1年の長さは変わらないので、1年は、およそ730日に。誕生日が来るのも、ずいぶん先に感じそうだ。",
  image="fe_spiral_calendar.svg", imageSize=560, bg="night", effect="zoom", big="1年 約730日")
w("赤道では、外へ飛び出そうとする力が強くなって、体重が、少しだけ軽くなる。66キロの人なら、約65.3キロだ。",
  speech="赤道では、外へ飛び出そうとする力が強くなって、体重が、少しだけ軽くなる。66キロの人なら、約65てん3キロだ。",
  sim="scale", simG=0.9896, simLabels=["いまの1日 24時間", "1日 12時間"])
w("地球の形も、今より横に広がって、少しつぶれた形になる。", globe=E(speed=2.4, tilt=0, squash=1.0, squashTo=0.9),
  bg="space", big="※大げさに表現しています")
w("さらに、風を曲げる力も強くなるので、うずを巻く嵐が、強くなりやすいといわれている。",
  footage={"file": "iss_storm.mp4", "start": 2}, bg="space")
w("実は、大昔の地球は、今よりずっと速く回っていた。", footage={"file": "earth_spin_nightlights.mp4", "start": 5}, bg="space")
w("月が引っぱる力で、少しずつブレーキがかかり、今の24時間になったと考えられているんだ。",
  globe={"texture": "moon", "speed": 0.6}, bg="space")

# ===== 7 海がなくなる =====
card(7, ["もし地球から", "海がなくなったら？"], "7つめ。もし、地球から海がなくなったら？", tag="海がなくなる",
     chapter="07 もし海がなくなったら？", globe={"texture": "earth_jul", "speed": 0.6}, bg="space")
w("地球の表面の、約7割をおおう海。その水が、すべて消えてしまったら…",
  globe={"texture": "earth_jul", "textureTo": "earth_dry", "fade": [0.2, 0.9], "speed": 0.5}, bg="space", big="表面の約7割")
w("そこに現れるのは、見たこともない、巨大な谷と山脈だ。", globe={"texture": "earth_dry", "speed": 0.5, "size": 1.15}, bg="space", effect="zoom")
w("海の底には、地球をぐるっと取り巻く、長さ約6万キロもの山脈が、かくれているんだ。",
  globe={"texture": "earth_dry", "speed": 0.9, "size": 1.3, "tilt": 10}, bg="space", big="全長 約6万km")
w("いちばん深いマリアナ海溝は、深さ約1万メートル。エベレストを沈めても、まだ届かない深さだ。",
  globe={"texture": "earth_dry", "speed": 0.4, "size": 1.4}, bg="space", big="深さ 約1万m")
w("ハワイのマウナケア山も、海の底から測ると、約1万メートル。実はエベレストよりも高い山なんだ。",
  globe={"texture": "earth_dry", "speed": 0.4, "size": 1.35, "tilt": -15}, bg="space", big="海底から 約1万m")
w("雨も、ほとんど降らなくなる。雨のもとになる水蒸気の多くは、海から来ているからだ。",
  photo={"file": "hurricane_helene_iss.jpg", "zoom": 1.05}, bg="space", effect="dark")
w("陸は乾いた砂漠のようになり、昼と夜の気温の差も、とても大きくなるといわれている。",
  globe={"texture": "earth_dry", "speed": 0.5}, bg="space")
w("さらに、私たちが吸う酸素の、約半分は、海の小さな植物プランクトンが作っているといわれている。",
  footage={"file": "iss_ocean.mp4", "start": 1}, bg="space", big="酸素の約半分")
w("海は、地球の命を支える、大切な場所なんだね。", globe={"texture": "earth_jul", "speed": 0.6}, bg="space")

# ===== 8 地球に輪 =====
card(8, ["もし地球に", "輪があったら？"], "8つめ。もし、地球に、土星のような輪があったら？", tag="地球に輪",
     chapter="08 もし地球に輪があったら？", globe=E(rings=True, size=0.55, speed=0.6), bg="space")
w("土星の輪は、たくさんの、氷や岩のつぶでできている。", image="fe_ringed_planet.svg", imageSize=600, bg="space", effect="zoom")
w("もし地球に輪があれば、こんなふうに、宇宙から見てもとても美しい星になるはずだ。",
  globe=E(rings=True, size=0.5, speed=0.5, tilt=23.4, tiltTo=30), bg="space")
w("夜空には、空を横切る、大きな光の帯が見えるだろう。", scene="ringsky")
w("昼間も、うっすらと白い輪が、空にかかって見えるかもしれない。", scene="ringsky_day")
w("ただし、輪の影が落ちる場所では、日光がさえぎられて、冬がより寒くなるともいわれている。",
  globe=E(rings=True, size=0.62, speed=0.5, tilt=-8), bg="space")
w("輪のつぶが少しずつ落ちてきて、流れ星も、今よりずっと増えるかもしれない。",
  image="fe_shooting_star.svg", imageSize=560, bg="night", effect="zoom")
w("実は、大昔の地球にも、輪があったかもしれない、という研究もあるんだ。",
  globe=E(rings=True, size=0.45, speed=0.8), bg="space", effect="zoom")

# ===== 9 月がなくなる =====
card(9, ["もし月が", "なくなったら？"], "9つめ。もし、ある日突然、月がなくなったら？", tag="月がなくなる",
     chapter="09 もし月がなくなったら？", globe={"texture": "moon", "speed": 1.0}, bg="space")
w("まず、夜がとても暗くなる。月明かりがなくなって、星の光だけの夜になるんだ。",
  photo={"file": "earth_night_iss.jpg", "zoom": 1.15, "focus": [0.5, 0.3]}, effect="dark")
w("次に、海の満ち引きが小さくなる。太陽の力の分だけが残るので、およそ3分の1に。",
  speech="次に、海のみちひきが小さくなる。太陽の力の分だけが残るので、およそ3分の1に。",
  footage={"file": "ocean_tides_1080p.mp4", "start": 15, "zoom": 1.3, "focus": [0.5, 0.4]}, big="約3分の1")
w("満月に合わせて卵を産む、サンゴのような生き物も、困ってしまう。", footage={"file": "iss_ocean.mp4", "start": 1})
w("さらに、地球の傾きが安定しなくなって、気候が、大きく変わるかもしれない。",
  globe=E(speed=0.8, tilt=23.4, tiltTo=60), bg="space")
w("暑すぎる時代や、寒すぎる時代が、くり返しやってくるとも考えられている。", footage={"file": "iss_storm.mp4", "start": 1}, effect="shake")
w("それから、日食も月食も、もう二度と見られなくなる。", globe={"texture": "moon", "speed": 0.4}, bg="space", effect="dark")
w("ちなみに月は、1年に約3.8センチずつ、地球から遠ざかっているんだ。",
  speech="ちなみに月は、1年に約3てん8センチずつ、地球から遠ざかっているんだ。",
  globe={"texture": "moon", "speed": 0.5, "size": 1.0, "sizeTo": 0.8}, bg="space", big="毎年 約3.8cm")
w("月はいつもそばで、地球を支えてくれているんだね。", photo={"file": "earthrise_artemis2.jpg"})

# ===== 10 太陽が消える =====
card(10, ["もし太陽が", "消えたら？"], "そして最後。もし、太陽が、突然消えたら？", tag="太陽が消える",
     chapter="10 もし太陽が消えたら？", footage={"file": "sun_b.mp4", "start": 1}, bg="space")
w("その瞬間、太陽は消える。でも地球では、まだ誰も気づかない。", footage={"file": "sun_a.mp4", "start": 1}, effect="vanish")
w("太陽の光が地球に届くまで、約8分20秒かかるからだ。", footage={"file": "solar_flare_m84.mp4", "start": 15}, big="約8分20秒")
w("8分後、空は突然、まっ暗になる。", footage={"file": "iss_land.mp4", "start": 1}, effect="dark")
w("月も惑星も、見えなくなる。自分では光っていないからだ。", globe={"texture": "moon", "speed": 0.6}, bg="space", effect="dark")
w("さらに地球は、太陽に引っぱられなくなり、まっすぐ宇宙の暗闇へ、飛んでいってしまう。",
  globe={"texture": "earth_night", "speed": 1.0, "sizeTo": 0.15}, bg="space")
w("植物は光合成ができず、少しずつ枯れていく。", footage={"file": "plants_forest.mp4", "start": 0}, effect="dark")
w("1週間ほどで、地表の気温は、氷点下に。", footage={"file": "arctic_sea_ice_2026.mp4", "start": 30, "zoom": 1.3, "focus": [0.45, 0.6]}, big="氷点下")
w("1年後には、マイナス70度ほどまで下がるといわれている。", photo={"file": "frozen_lake_iss.jpg", "zoom": 1.1}, big="約−70℃")
w("それでも深い海は、すぐには凍らない。海の底の熱で生きる生き物は、生き残れるかもしれない。",
  footage={"file": "iss_ocean.mp4", "start": 1}, effect="dark")
w("でも安心して。太陽は、あと50億年ほど、輝き続けるといわれているんだ。",
  footage={"file": "sun_b.mp4", "start": 1}, big="あと約50億年")

# ===== エンディング =====
card(None, ["どの“もしも”が", "いちばん怖かった？"], "10個のもしも、どれがいちばん怖かった？コメントで教えてね。",
     sub="コメントで教えてね", chapter="エンディング", footage={"file": "iss_aurora_2025.mp4", "start": 60})
w("当たり前の毎日は、重力や摩擦、海や月、そして太陽に、支えられているんだね。",
  footage={"file": "iss_aurora_2025.mp4", "start": 70})
w("ほかに知りたいもしもがあれば、ぜひリクエストしてね。チャンネル登録も、よろしくね。",
  globe=E(speed=0.6, size=0.7), bg="space", hold=14)

def bgm(file, title, credit, ot, frm, track=None, vol=None):
    d = {"file": file, "title": title, "credit": credit, "page": f"https://opentracks.com/bgm/detail/{ot}", "opentracks": ot, "fromSlide": frm}
    if track: d["track"] = track
    if vol: d["volume"] = vol
    return d
idx = {s.get("card", {}).get("no"): i for i, s in enumerate(S) if "card" in s}
fe = lambda name, folder, file: {"emoji": "🌍", "irasutoya": f"Fluent Emoji「{name}」", "url": f"https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/{folder}/Color/{file}", "credit": "Microsoft Fluent Emoji（MIT License）"}
ep = {
  "id": "whatif-earth-long",
  "title": "地球の“もしも”10選",
  "format": "landscape",
  "titleBand": False,
  "pr": False,
  "style": "whatif",
  "background": "#000",
  "slideGap": 8,
  "bgmVolume": 0.1,
  "voice": {"speaker": 13, "speed": 1.15, "name": "青山龍星"},
  "bgmPlaylist": [
    bgm("odoru_uchuu.mp3", "踊る、宇宙の中で(Dancing,at Universe)", "蒲鉾さちこ", 15926, 0, track=2),
    bgm("spacewalk.mp3", "Spacewalk", "Make a field Music", 13616, idx[5], vol=1.3),
    bgm("giant_step.mp3", "Giant Step", "風可＆葉羽", 9134, idx[9], vol=0.9),
  ],
  "headline": ["地球の", "もしも10選"],
  "illustrations": {
    "fe_nut_and_bolt.svg": fe("Nut and bolt", "Nut%20and%20bolt", "nut_and_bolt_color.svg"),
    "fe_knot.svg": fe("Knot", "Knot", "knot_color.svg"),
    "fe_pencil.svg": fe("Pencil", "Pencil", "pencil_color.svg"),
    "fe_pot_of_food.svg": fe("Pot of food", "Pot%20of%20food", "pot_of_food_color.svg"),
    "fe_fire.svg": fe("Fire", "Fire", "fire_color.svg"),
    "fe_airplane.svg": fe("Airplane", "Airplane", "airplane_color.svg"),
    "fe_ringed_planet.svg": fe("Ringed planet", "Ringed%20planet", "ringed_planet_color.svg"),
    "fe_violin.svg": fe("Violin", "Violin", "violin_color.svg"),
    "fe_cloud_with_rain.svg": fe("Cloud with rain", "Cloud%20with%20rain", "cloud_with_rain_color.svg"),
    "fe_elephant.svg": fe("Elephant", "Elephant", "elephant_color.svg"),
    "fe_spiral_calendar.svg": fe("Spiral calendar", "Spiral%20calendar", "spiral_calendar_color.svg"),
    "fe_shooting_star.svg": fe("Shooting star", "Shooting%20star", "shooting_star_color.svg"),
  },
  "slides": S,
  "description": "重力が半分、摩擦がゼロ、海が消える、地球に輪がある、太陽が消える…。地球の「もしも」を10個、本気で考えてみました。\n人や車の動きは物理エンジンでシミュレーションし、宇宙や地球の映像はNASAの本物の素材を使っています。\nあなたがいちばん怖かった「もしも」は？コメントで教えてください！\n映像・画像：NASA / NASA/JPL / NASA/JPL-Caltech / NASA Earth Observatory\n※「海がなくなった地球」はNASAの地図画像を加工して作ったイメージです。",
  "hashtags": ["もしも", "雑学", "宇宙", "物理", "地球", "科学"],
}
json.dump(ep, open(str(__import__("pathlib").Path(__file__).resolve().parent.parent / "src/episodes/whatif-earth-long.json"), "w"), ensure_ascii=False, indent=2)
open(str(__import__("pathlib").Path(__file__).resolve().parent.parent / "src/episodes/whatif-earth-long.json"), "a").write("\n")
print(len(S), "slides", idx)
