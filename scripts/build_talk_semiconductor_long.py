"""「半導体のしくみ」を掛け合い解説（talk スタイル・ゆっくり解説のような雰囲気）で。
ソラ（解説役・冥鳴ひまり）とコムギ（聞き役・春日部つむぎ）のオリジナルキャラクターが話す。台本はオリジナル。
数字は paper-semiconductor-long と同じく、検索で確かめたもの。
使い方: python3 scripts/build_talk_semiconductor_long.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S: list[dict] = []
_last: dict | None = None
_tag = ""

VOICE = {"sora": (14, 1.2), "komugi": (8, 1.25)}
READ = {
    "1947年": "千九百四十七年",
    "1971年": "千九百七十一年",
    "1945年": "千九百四十五年",
    "1956年": "千九百五十六年",
    "2021年": "二千二十一年",
    "2027年": "二千二十七年",
    "17,468本": "一万七千四百六十八本",
    "2,300個": "二千三百個",
    "その間": "そのあいだ",
    "4004": "よんまるまるよん",
    "TSMC": "ティーエスエムシー",
    "ENIAC": "エニアック",
    "2nm": "2ナノメートル",
    "1000億": "千億",
    "%": "パーセント",
    "LED": "エルイーディー",
    "そこら中": "そこらじゅう",
}


def tag(t):
    global _tag
    _tag = t


def say(who, text, visual=None, face="normal", other="normal", speech=None, chapter=None):
    global _last
    enter = visual is not None
    if visual is None:
        visual = _last
    _last = visual
    spk, spd = VOICE[who]
    s = {"type": "talk", "who": who, "text": text, "face": face, "other": other, "visual": visual, "enter": enter, "speaker": spk, "speed": spd}
    fixed = speech or text
    for a, b in READ.items():
        fixed = fixed.replace(a, b)
    if fixed != text:
        s["speech"] = fixed
    if chapter:
        s["chapter"] = chapter
    if _tag:
        s["tag"] = _tag
    S.append(s)


def so(text, visual=None, face="normal", other="normal", **kw):
    say("sora", text, visual, face, other, **kw)


def ko(text, visual=None, face="normal", other="normal", **kw):
    say("komugi", text, visual, face, other, **kw)


def semi(mode):
    return {"kind": "semi", "mode": mode}


def img(src, caption=None, src2=None, caption2=None):
    v = {"kind": "image", "src": src}
    if caption:
        v["caption"] = caption
    if src2:
        v["src2"] = src2
        if caption2:
            v["caption2"] = caption2
    return v


def kw(term, en, desc):
    return {"kind": "concept", "label": "キーワード", "term": term, "en": en, "desc": desc}


# ───────── オープニング ─────────
ko("ねえソラ、ニュースで「半導体が足りない」ってよく聞くけど、半導体って何なの？",
   {"kind": "title", "kicker": "ソラとコムギの なるほど科学", "title": ["半導体の", "しくみ"], "sub": "砂から生まれる 200億個のスイッチ"}, face="think", chapter="オープニング")
so("いい質問だね。実はコムギのスマホの中にも、ぎっしり入ってるよ。", face="smile", other="surprise")
tag("オープニング")
ko("えっ、このスマホに？", img("ira_phone.png", "スマホ"), face="surprise")
so("最新のスマホの頭脳には、小さなスイッチが約200億個も詰まっているといわれているんだ。", semi("phone"), face="smile", other="surprise")
ko("200億！？ 世界の人口より多いじゃん！", face="surprise")
so("そう。今日は、その正体の「半導体」を、しくみから歴史、作り方まで、まるごと解説していくよ。",
   {"kind": "list", "title": "今日のメニュー", "items": ["半導体って、何が「半分」？", "電気を通すしくみ", "電気で動くスイッチ", "真空管から200億個へ", "砂から作られるまで", "世界と日本の半導体"]}, face="smile")
ko("よろしくお願いしまーす！", face="happy")

# ───────── 第1章 ─────────
so("まずは、何が「半分」なのか、からいこう。", {"kind": "chapter", "no": 1, "title": "何が「半分」なの？"}, chapter="第1章 何が「半分」なの？")
tag("第1章 半導体とは")
so("物は、電気の通しやすさで、大きく3つに分けられるんだ。", semi("between"))
so("金属は、電気をよく通す。電線に銅が使われているのは、そのためだね。")
so("ゴムやプラスチックは、電気をほとんど通さない。")
ko("電線のまわりのビニールだね！", face="smile")
so("そのとおり。そして半導体は、その間。条件しだいで、通したり、通さなかったりできる物質なんだ。")
ko("じゃあ、電気を「半分だけ」通すってこと？", face="think")
so("ちょっとちがう。「通すかどうかを、人が決められる」のがポイントなんだ。", kw("半導体", "Semiconductor", "電気を通す金属と、通さないゴムの中間。\n条件しだいで、通したり止めたりできる物質"), other="surprise")
ko("へえ〜、スイッチみたいだね。", face="smile")
so("まさにそれ。あとで、スイッチの話につながるよ。", face="smile")
so("半導体の代表は、シリコン。日本語では、ケイ素っていうんだ。")
so("シリコンは、砂や石にたくさん含まれていて、地球の表面の重さの約28%をしめているよ。",
   {"kind": "stat", "value": 28, "unit": "%", "label": "地殻にしめるシリコンの重さ", "sub": "酸素の次に多い元素", "color": "#3d6fd1"})
ko("そんなに！？ 材料はそこら中にあるんだね。", img("ira_sand.png", "砂の中にもシリコン"), face="surprise")

# ───────── 第2章 ─────────
so("次は、電気が流れるしくみだよ。", {"kind": "chapter", "no": 2, "title": "電気を通すしくみ"}, chapter="第2章 電気を通すしくみ")
tag("第2章 電子の動き")
so("電気が流れるっていうのは、電子っていう、ものすごく小さな粒が動くことなんだ。")
so("シリコンの原子は、となりの原子と、4本の手でしっかりつながっている。", semi("lattice"))
ko("手をつないで、輪になってるみたい。", face="smile")
so("そう。手をつないでいる電子は、その場から動けない。だから、きれいなシリコンは、電気をほとんど通さないんだ。")
ko("えっ、じゃあ役に立たないじゃん。", face="think")
so("そこで、ほかの原子を、ほんの少しだけ混ぜるんだ。", face="smile")
so("たとえば、手が5本ある「リン」を混ぜると。", semi("ntype"))
ko("1本、手が余っちゃう！", face="surprise")
so("その通り。つなぐ相手のいない電子が1個余って、自由に動き回る。これが電気を運んでくれるんだ。", face="smile")
so("逆に、手が3本しかない「ホウ素」を混ぜると。", semi("ptype"))
ko("今度は、1本足りない…？", face="think")
so("そう。電子が1個足りない「空席」ができる。となりの電子がその空席に移ると、また別の場所に空席ができるんだ。")
ko("映画館で、みんなが1席ずつ詰めていく感じ？", face="smile")
so("いいたとえだね。そうやって、電気が流れていくんだ。", face="happy")
so("混ぜる量は、ほんのわずか。でも、それだけで電気の通しやすさが、がらりと変わるんだよ。")

# ───────── 第3章 ─────────
so("いよいよ、半導体がスイッチになるしくみだよ。", {"kind": "chapter", "no": 3, "title": "電気で動くスイッチ"}, chapter="第3章 電気で動くスイッチ")
tag("第3章 トランジスタ")
so("リンを混ぜたシリコンと、ホウ素を混ぜたシリコンを組み合わせると、トランジスタができる。", semi("switchoff"))
so("上の端子に電圧をかけていないときは、入口から出口へ、電気は流れない。")
ko("通せんぼされてるね。", face="think")
so("ところが、電圧をかけると。", semi("switchon"))
ko("あっ、流れた！", face="surprise")
so("電子が引き寄せられて、通り道ができるんだ。指で押すかわりに、電気で押せるスイッチだね。", face="smile")
ko("電気で押せると、何がうれしいの？", face="think")
so("ものすごく速く、何億回でも、オンとオフを切りかえられるんだ。")
so("そして、流れるを1、止まるを0と決めると。", semi("bits"))
ko("スイッチの並びで、数字が作れる！", face="surprise")
so("そう。写真も、音楽も、LINEのメッセージも、スマホの中では、ぜんぶ0と1の並びなんだ。", face="smile")
ko("わたしの自撮りも、0と1…！", face="surprise")
so("ふふ、そういうこと。", face="happy")
so("実は、半導体の仕事はスイッチだけじゃないんだ。",
   {"kind": "versus", "left": {"title": "LED（光る）", "body": "電子が空席に入るとき、\nエネルギーが光になる"}, "right": {"title": "太陽電池（発電する）", "body": "光が当たると電子が動き出し、\n電気が生まれる"}})
so("電子が空席に飛びこむとき、エネルギーが光になる。これがLED。")
so("反対に、光を当てると電子が動いて、電気が生まれる。これが太陽電池だよ。")
ko("同じしくみの、行きと帰りなんだ！", img("ira_led.png", "LED照明", "ira_solar.png", "太陽電池"), face="happy")
so("身の回りには、半導体がいっぱいあるんだ。",
   {"kind": "list", "title": "身の回りの半導体", "items": ["スマホ・パソコン：計算と記憶", "エアコン・冷蔵庫：モーターの細かい調整", "LED照明・テレビ：光", "太陽光パネル：発電", "車：エンジン、ブレーキ、安全装置"]})
ko("車にも入ってるから、足りなくなると車が作れなかったんだね。", face="think")
so("そういうこと。2021年ごろには、世界中で車の生産が大きく減ったんだ。")

# ───────── 第4章 ─────────
so("ここからは、半導体の歴史を見ていこう。", {"kind": "chapter", "no": 4, "title": "真空管から\n200億個へ"}, chapter="第4章 真空管から200億個へ")
tag("第4章 半導体の歴史")
so("トランジスタが生まれる前、スイッチの役目をしていたのは、真空管っていう部品だったんだ。", img("ira_tube.png", "真空管"))
ko("電球みたい！", face="smile")
so("1945年に完成したコンピューター「ENIAC」には、真空管が17,468本も使われていた。",
   {"kind": "stat", "value": 17468, "unit": "本", "label": "ENIAC（1945年）の真空管", "sub": "重さ 約27トン", "color": "#ff6f61"})
ko("重さ27トン！？ 部屋まるごとコンピューター！", face="surprise")
so("しかも真空管は熱くなりやすくて、よく切れたらしい。切れた真空管を探して取りかえるのも、大変だったといわれているよ。", face="think")
so("そこで、1947年。アメリカのベル研究所で、トランジスタが生まれたんだ。",
   {"kind": "timeline", "items": [
       {"year": "1945", "title": "ENIAC 完成", "sub": "真空管\n17,468本", "color": "#8a6a4a"},
       {"year": "1947", "title": "トランジスタ\n誕生", "sub": "ベル研究所", "color": "#3d6fd1"},
       {"year": "1971", "title": "Intel 4004", "sub": "2,300個", "color": "#2ea36b"},
       {"year": "現在", "title": "最新スマホ", "sub": "約200億個", "color": "#ff6f61"}]})
so("発明した3人は、1956年に、ノーベル物理学賞を受けたんだよ。")
so("そして1971年、ひとつのチップに計算の頭脳をまるごと詰めこんだ、Intel 4004が登場する。", img("ira_calc.png", "電卓"))
ko("あれ、なんで電卓？", face="think")
so("実はこのチップ、日本の電卓メーカー、ビジコンのために作られたものなんだ。", face="smile", other="surprise")
ko("えっ、日本の電卓から始まってたの！？", face="surprise")
so("トランジスタの数は、2,300個。それが今では、スマホのチップ1枚に、約200億個。",
   {"kind": "stat", "value": 870, "unit": "万倍", "label": "50年あまりで トランジスタは", "sub": "2,300個 → 約200億個", "color": "#ff6f61"})
ko("870万倍…！ 想像できないよ。", face="surprise")
so("もしENIACと同じ真空管で200億個のスイッチを作ろうとしたら、ENIACが100万台以上も必要になる計算だよ。")
ko("地球が真空管だらけになっちゃう！", face="happy")
so("トランジスタの数は、およそ2年ごとに2倍になる。この予想は「ムーアの法則」と呼ばれていて、長いあいだ業界の目標になってきたんだ。",
   kw("ムーアの法則", "Moore's Law", "チップにのせるトランジスタの数は、\nおよそ2年ごとに2倍になる、という予想"))

# ───────── 第5章 ─────────
ko("でも、200億個なんて、どうやって作るの？", {"kind": "chapter", "no": 5, "title": "砂から作られるまで"}, face="think", chapter="第5章 砂から作られるまで")
tag("第5章 半導体の作り方")
so("材料は、石や砂に含まれるシリコン。まずは、不純物をとことん取りのぞくんだ。",
   {"kind": "list", "title": "半導体ができるまで", "items": ["石からシリコンを取り出し、精製する", "大きな結晶にして、薄い円盤（ウエハー）に切る", "光で、回路の模様を焼きつける", "混ぜ物を入れ、配線を重ねる", "1枚ずつ切り分けて、チップの完成"]})
so("その純度は、99.999999999%。9が11個並ぶから、イレブンナインと呼ばれているよ。",
   kw("99.999999999%", "イレブンナイン（9が11個）", "1000億個の原子の中に、\nちがう原子が1個あるかないか"),
   speech="その純度は、きゅうじゅうきゅうてん、きゅうきゅうきゅう、きゅうきゅうきゅう、きゅうきゅうきゅうパーセント。9が11個並ぶから、イレブンナインと呼ばれているよ。")
ko("9がいっぱい！", face="surprise")
so("さっき、ほんの少しの混ぜ物で性質が変わるって話したよね。だから、余計なものは徹底的に取りのぞくんだ。")
so("この純粋なシリコンを大きな結晶に育てて、薄くスライスしたのが、ウエハー。", img("ira_wafer.png", "シリコンウエハー", "ira_chip.png", "半導体チップ"))
so("ウエハーの上に、光を使って、回路の模様を焼きつける。写真の現像みたいなしくみだよ。")
so("このとき使う、光に反応する薬「フォトレジスト」は、日本のメーカーが世界の大部分を作っているといわれているんだ。", face="smile")
ko("日本、すごいじゃん！", face="happy")
so("今の最先端の回路の線は、数ナノメートル。1ナノメートルは、1ミリの100万分の1だよ。")
ko("細すぎて、もう見えないね…。", face="think")
so("だから、工場の中は、ちりを徹底的に取りのぞいた、クリーンルームになっている。", img("ira_clean.png", "クリーンルーム"))
so("小さなちりが乗るだけで、回路がふさがって、チップが動かなくなっちゃうからね。")
ko("全身おおう服を着てるのは、そのためなんだ。", face="smile")
so("そう。ひとつのチップができるまでには、数百もの工程と、何か月もの時間がかかるといわれているよ。")

# ───────── 第6章 ─────────
so("最後は、世界と日本の半導体の話だよ。", {"kind": "chapter", "no": 6, "title": "世界と日本の半導体"}, chapter="第6章 世界と日本")
tag("第6章 世界と日本")
so("最先端の半導体を作れる会社は、世界でもほんのひとにぎり。なかでも台湾のTSMCは、受託生産で世界の約7割をしめているんだ。",
   {"kind": "bars", "title": "半導体の受託生産（ファウンドリ）の世界シェア 2025年",
    "rows": [{"label": "TSMC（台湾）", "value": 70, "color": "#ff6f61"}, {"label": "サムスン（韓国）", "value": 7, "color": "#3d6fd1"}, {"label": "そのほか", "value": 23, "color": "#b0a090"}],
    "max": 100, "note": "出典：TrendForce（2025年・売上高ベース、概数）"})
ko("7割！？ ひとつの会社に集中してるんだ。", face="surprise")
so("だから、何かあったときに、世界中が困ってしまう。2021年の半導体不足は、それをはっきり見せつけたんだ。", face="think")
so("日本も、ふたたび最先端に挑戦しているよ。北海道の千歳市で、ラピダスという会社が、2ナノメートル世代の半導体の、2027年の量産を目指しているんだ。",
   kw("ラピダス", "Rapidus（北海道・千歳）", "2ナノメートル世代の半導体の\n2027年の量産を目指して、試作を進めている"))
ko("北海道から、世界の最先端！", face="happy")
so("材料や製造装置の分野でも、日本の会社は今も大きな役割をはたしているんだ。日本の技術がなければ作れない部分が、たくさんあるんだよ。", face="smile")

# ───────── まとめ ─────────
so("それじゃあ、今日のまとめ！", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "砂から生まれる 200億個のスイッチ"}, chapter="まとめ")
tag("まとめ")
so("半導体のポイントを、ふり返ろう。",
   {"kind": "list", "title": "今日のポイント", "items": ["半導体は、電気を通すかどうかを決められる物質", "ほんの少しの混ぜ物で、電子が動けるようになる", "トランジスタは、電気で動くスイッチ", "スイッチの0と1で、計算も写真も表せる", "材料は砂。でも作るには、極限の技術がいる"]})
ko("このスマホの中で、200億個のスイッチが、今も動いてるんだね。", img("ira_phone.png", "200億個のスイッチ"), face="smile")
so("しかも、もとは砂なんだよ。", face="smile", other="surprise")
ko("なんだか、スマホがちょっと愛おしくなってきた！", face="happy")
so("この動画がおもしろかったら、高評価とチャンネル登録をよろしくね。",
   {"kind": "title", "kicker": "ソラとコムギの なるほど科学", "title": ["見てくれて", "ありがとう！"], "sub": "次に知りたい「しくみ」をコメントで教えてね"}, face="happy")
ko("次に知りたい身近なしくみも、コメントで教えてね！", face="happy")

ILLS = {
    "ira_wafer.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjEQeXkChxAmGzZ871pNtlDBIRWwOejFdH2bOMt6hlO_o9UbG3IgFmpe2XRhX2xFiSm1lEHBkhy-2SjpfsaKvp5YBcWAdkC9MhUbSAz-UVf4yiSsMzSYKJPJCJaBtELmwc3-z1vj_0lFheUjN1BJElD9lvC41I0Lz5hOnuZ2Sq4b2HpNoMT5HuI1FlEOATe/s800/computer_silicon_wefar.png",
    "ira_chip.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEieydelb8imIrzaJR9p7mfLXNhtpTbZI5IjW9-9vvE9f2ZFHqONSqDPYnofJqj2SyWbllp4wjqLgIIH-rfD8VrAxPjdoyXMGo_ca_4QCuLxZLEUtQms-3INQxQhfhUG5n1p0M8yXzVrK5CQOczLSbZ-eSQMyiouYcAFcW8d9jRUbBewbfOsPZgwhOk-JucN/s800/computer_chip.png",
    "ira_tube.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhUQuKYbht8f43EfW4QC8GQnIhumI1x4iipR3HyPEvCnHSHLEjzHmkX0s3MJAmOB6MBS07Uu1DyObU16DcSqmgVyRiR-jwylammibHzg3WmHPRQoAGHd6AGeWD-EDQJpLE5EkGf6ra0hx0/s800/music_shinkuukan.png",
    "ira_calc.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK616GUIddcEDjdJHGe0eCEvbfifyrLTdf6XL_xTuOtYbDtwZpp5NFdnlPu3hstk8oY_CqRyVCgj80Gn238RgvUC4EUhTkYjUdkr3CCwuZ7zIkokB_oatN8-iT2Y3G9P_7kwZDzeHX3ew/s800/dentaku_syoumen_big.png",
    "ira_solar.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj_szgXk4iVEZ1TgIY15Xi9LWUYFtEg2ADAFKVpo9Xicxe8IL1w9fW1fjDVZNvyhqUhWSRwi5ev8q3M7rG_j5S8IBwOhht52inC0e6KPuM4trh8QWvTtV0B6erUNCGMMjVJdAkK_jWoWg7A/s800/denryoku_solar_panel.png",
    "ira_led.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh3wXeRpCisQ3GouqtajP7h0sqSqQ4I2P-Dq3ZMuICT2ngMy0XthyfR_OyQ2UA3XpfdtgvSo232Ny77mCDssszNslqjJXCWqKiYIiLKPCk1G960n389BlyIaPXggz86eVCMcOyG66bAWOJn/s800/syoumei_led_base_light.png",
    "ira_clean.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj68j92Aw5hzIeg3p2rypz2siHXsGqUZC4q7sbP-FRcxUXXceVI8EyJQldZ1kTK7JJtRCsS32-yz314rtlxVf4yGVGefWRyCtcnbLQ2gGKGFsQdzLRAqQTdnP9Js4rov-KO9aUaC0p-8iw/s800/cleanroom_jikken.png",
    "ira_sand.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh2QjMsi-_ASBrwm6E7yk9_ipGVhguWZ7weo2ohypTKwuKiB16p-uoPaHrzD9y0oEX0Meufeqg-KFUpRXwouWymplTsBBFQX0ZgFV9jgxMlc1VSxgcO5nitnxqgrhu7UM5WxP0Ih655l08I/s800/beach_sunayama.png",
    "ira_phone.png": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgApSdAMCM6Pve5e4DZev5oMuxEFumD7qaVQYHRwY3NgDAnTRS3kHNoCtyJzSktMZdwFE2DTQ4aQB3sSYsPzeapjgAFCSJnT5OVePymS3NkqCzYUNoZk0_Dac1GtqW5U23C4QqOeLWFQVyLlLCg5BU-7WGnZjXi7oxekS-RTNd_WnA4rz0brbqOO5BJE244/s800/ai_smartphone_tanmatsu.png"
}
ILLS_FIXED = {
    "ira_wafer.png": "computer_silicon_wefar.png",
    "ira_chip.png": "computer_chip.png",
    "ira_tube.png": "music_shinkuukan.png",
    "ira_calc.png": "dentaku_syoumen_big.png",
    "ira_solar.png": "denryoku_solar_panel.png",
    "ira_led.png": "syoumei_led_base_light.png",
    "ira_clean.png": "cleanroom_jikken.png",
    "ira_sand.png": "beach_sunayama.png",
    "ira_phone.png": "ai_smartphone_tanmatsu.png",
}
illustrations = {}
for k, name in ILLS_FIXED.items():
    illustrations[k] = {"emoji": "🖼", "irasutoya": name, "credit": "いらすとや", **({"url": ILLS[k]} if ILLS.get(k) else {})}

episode = {
    "id": "talk-semiconductor-long",
    "title": "【ゆっくり解説風】半導体のしくみ｜砂から生まれる200億個のスイッチ",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "talk",
    "background": "#fff6e3",
    "slideGap": 6,
    "bgmVolume": 0.08,
    "voice": {"speaker": 14, "speed": 1.2, "name": "冥鳴ひまり"},
    "replyVoices": [{"speaker": 8, "speed": 1.25, "name": "春日部つむぎ"}],
    "bgm": {"file": "gudaguda.mp3", "title": "ぐだぐだな感じ", "credit": "yuki", "page": "https://opentracks.com/bgm/detail/2738", "opentracks": 2738, "track": 1},
    "illustrations": illustrations,
    "description": "ソラとコムギの掛け合いで、「半導体」のしくみを解説します。何が「半分」なのか、どうして電気で動くスイッチになるのか、真空管から200億個のスイッチまでの歴史、砂から作られるまで、そして世界と日本の今。\n台本・キャラクターはオリジナルです。数字は公開資料で確認できた範囲で紹介しています（一部は推定値・概数）。\n\n▼ 数字の出典（目安）\n・最新スマホのチップのトランジスタ数 約200億個：Apple A18 Pro の報道値（メーカー非公表の推定）\n・シリコンは地殻の重さの約28%：日本金属学会などの解説\n・ENIAC（1945年）真空管17,468本・約27トン：コンピューター史の資料\n・トランジスタの発明（1947年・ベル研究所）、1956年ノーベル物理学賞\n・Intel 4004（1971年）トランジスタ2,300個、日本のビジコン向け\n・半導体用シリコンの純度 イレブンナイン：早稲田大学の解説\n・ファウンドリ世界シェア TSMC 約70%（2025年）：TrendForce\n・ラピダス 2nm 2027年量産目標：報道\n・フォトレジストは日本の主要メーカーが世界の大部分：報道",
    "hashtags": ["半導体", "掛け合い解説", "科学", "解説", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "talk-semiconductor-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
