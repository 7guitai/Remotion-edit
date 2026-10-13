"""「好意はあるのに近づいてこない人の心理」（論文で読み解く恋愛心理学・ロング）の台本から
src/episodes/paper-love-long.json を作る。台本・例え話はこのチャンネルのオリジナル。
研究の内容は、論文・大学の発表などで確かめた範囲で紹介する（数字はプレスリリース等で確認したもの）。
使い方: python3 scripts/build_paper_love_long.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S: list[dict] = []
_last: dict | None = None
_tag = ""


def tag(t):
    global _tag
    _tag = t


def say(text, visual=None, speech=None, chapter=None):
    """1文 = 1スライド。visual を省くと前の図のまま（登場アニメなし）"""
    global _last
    enter = visual is not None
    if visual is None:
        visual = _last
    _last = visual
    s = {"type": "paper", "text": text, "visual": visual, "enter": enter}
    fixed = speech or text
    for a, b in READ.items():
        fixed = fixed.replace(a, b)
    if fixed != text:
        speech = fixed
    if speech:
        s["speech"] = speech
    if chapter:
        s["chapter"] = chapter
    if _tag and visual["kind"] not in ("title", "chapter"):
        s["tag"] = _tag
    S.append(s)


# 読み間違いの直し（読み上げだけ）
READ = {"出す側": "だすがわ", "「待つ側か、動く側か」": "、まつがわか、うごくがわか、"}

# 色（和モダン：藍・桜）
BLUE, PINK = "#2f5d8a", "#d0607a"
# 登場人物は いらすとや「いろいろな表情のスーツを着た人」（表情を場面で変える）
FACES = {
    "smile": "1_1_smile", "cry": "1_3_cry", "laugh": "1_4_laugh", "idea": "2_1_idea", "shock": "2_2_shock",
    "think": "2_4_think", "question": "3_1_question", "heart": "3_2_heart", "heat": "3_2_heat", "tehe": "3_4_tehe",
}


def face(who, f):
    if who == "man" and f == "heart":
        f = "heat"
    return f"ira_{who}_{f}.png"


def scene(left_thought=None, right_thought=None, show=None, place="会社帰り・駅のホーム", lf="smile", rf="smile"):
    return {
        "kind": "scene",
        "place": place,
        "left": {"emoji": face("man", lf), "name": "ハルト", "thought": left_thought, "color": BLUE},
        "right": {"emoji": face("woman", rf), "name": "ミオ", "thought": right_thought, "color": PINK},
        **({"show": show} if show else {}),
    }


# ───────── オープニング ─────────
say("好意はあるのに、近づいてこない。", {"kind": "title", "title": ["好意はあるのに", "近づいてこない人の心理"], "sub": "5つの研究で読み解く「すれちがい」の正体"},
    chapter="オープニング")
say("その裏には、ちゃんと名前のついた心のクセがあります。")
tag("オープニング")
say("同じ部署の同期、ハルトとミオ。", scene())
say("残業のあと、たまたま同じ電車で帰ることになりました。")
say("好きな映画の話で、驚くほど盛り上がる。")
say("ハルトは思います。「楽しかった。でも、誘ったら迷惑かな」", scene("楽しかった…\nでも誘ったら迷惑かな", None, ["left"], lf="think"))
say("「ミオさんは誰にでも感じがいいし、たぶん俺だけじゃない」")
say("同じころ、ミオも考えていました。", scene("楽しかった…\nでも誘ったら迷惑かな", "映画の話、すごく合ったのに", ["left", "right"], lf="think", rf="smile"))
say("「あんなに話したのに、何も言ってこない。私には興味ないんだ」", scene("楽しかった…\nでも誘ったら迷惑かな", "何も言ってこない…\n私には興味ないんだ", lf="think", rf="cry"))
say("駅に着いて、2人は「おつかれさま」とだけ言って別れます。")
say("2人とも、相手は自分に気がないと思っている。")
say("そして、2人とも間違っています。")
say("この動画では、なぜこんなすれちがいが起きるのかを、5つの研究から解き明かします。",
    {"kind": "list", "title": "この動画で紹介する研究", "items": ["好意のサインは、ほとんど気づかれない", "「自分は怖い、相手は無関心」の思い込み", "サインは思ったより届いていない", "待つ側・動く側で、気持ちが変わる", "人は、思っているより好かれている"]})
say("最後に、すれちがいを終わらせる3つのルールもお話しします。")

# ───────── 第1章 ─────────
say("第1章。好意のサインは、ほとんど気づかれない。", {"kind": "chapter", "no": 1, "title": "好意のサインは\nほとんど気づかれない"},
    speech="第一章。好意のサインは、ほとんど気づかれない。", chapter="第1章 好意のサインは気づかれない")
tag("第1章 気づかれないサイン")
say("アメリカのカンザス大学で、こんな実験が行われました。",
    {"kind": "paper", "authors": "Hall, Xing & Brooks", "year": "2014", "journal": "Communication Research",
     "title": "Accurately Detecting Flirting", "points": ["初対面の男女52組が、10〜12分ふたりきりで会話", "あとで「自分は好意を見せたか」「相手は見せていたか」を別々に答える"]},
    speech="アメリカのカンザス大学で、こんな実験が行われました。")
say("初対面の男女52組に、10分ほど、ふたりきりで話してもらいます。", speech="初対面の男女、52組に、10分ほど、ふたりきりで話してもらいます。")
say("そのあと、自分は好意を見せたか、相手は見せていたかを、こっそり答えてもらいました。")
say("相手が好意を見せていなかったときは、8割以上の人が正しく見抜けました。",
    {"kind": "stat", "value": 80, "unit": "%以上", "label": "好意がないことを 正しく見抜けた", "color": "#4f8a6b"})
say("ところが、好意を見せていたときは、どうだったか。")
say("男性が気づけたのは、わずか36%。",
    {"kind": "bars", "title": "相手の好意のサインに 気づけた割合", "rows": [{"label": "男性", "value": 36, "color": BLUE}, {"label": "女性", "value": 18, "color": PINK}],
     "max": 100, "note": "出典：カンザス大学の発表（Hall ほか, 2014）"}, speech="男性が気づけたのは、わずか36パーセント。")
say("女性はもっと低く、18%でした。", speech="女性はもっと低く、18パーセントでした。")
say("5回好意を見せても、4回は気づかれていない計算です。")
say("会話を外から見ていた人たちでも、結果はほとんど変わりませんでした。")
say("つまり、好意のサインは、思っているより、ずっと伝わりにくいものなんです。")
say("なぜ、こんなに気づかれないのでしょうか。")
say("ひとつは、好意のサインの多くが、とてもあいまいだからです。",
    {"kind": "list", "title": "よくある好意のサイン", "items": ["よく目が合う・笑顔が多い", "話をよく聞いて、質問してくれる", "帰るタイミングをそろえる", "相手の好きなものの話をする"]})
say("よく笑うのも、話を聞いてくれるのも、ただ感じのいい人なだけかもしれない。")
say("受け取る側は、「勘ちがいだったら恥ずかしい」と思って、好意として受け取るのをためらいます。")
say("もうひとつは、出す側が、はっきり出すのを怖がっていることです。")
say("ハッキリ出して断られたら、気まずくなる。だから、どうしても控えめになる。")
say("あいまいなサインを、慎重な相手が受け取る。気づかれないのも、無理はありません。")
say("ハルトの「楽しかった」も、ミオの「話が合ったね」も、相手には届いていなかったのかもしれません。", scene("（伝わってない…）", "（伝わってない…）", lf="question", rf="question"))

# ───────── 第2章 ─────────
say("第2章。「自分は怖い、相手は無関心」の思い込み。", {"kind": "chapter", "no": 2, "title": "「自分は怖い」\n「相手は無関心」"},
    speech="第二章。自分は怖い、相手は無関心、の思い込み。", chapter="第2章 自分は怖い、相手は無関心")
tag("第2章 多元的無知")
say("サインが伝わらないだけなら、自分から動けばいいはずです。")
say("でも、それができない。その理由を調べたのが、カナダの心理学者ボラウアーたちです。",
    {"kind": "paper", "authors": "Vorauer & Ratner", "year": "1996", "journal": "Journal of Social and Personal Relationships",
     "title": "Who's going to make the first move?", "points": ["気になる相手がいるのに動かない理由を調べた", "自分と相手で、説明の仕方がちがっていた"]})
say("気になる人がいるのに、自分から動かないとき。")
say("自分のことは、「断られるのが怖いから」と説明します。",
    {"kind": "versus", "left": {"title": "自分が動かない理由", "body": "断られるのが怖いから\n（気持ちはある）"}, "right": {"title": "相手が動かない理由", "body": "自分に興味がないから\n（気持ちがない）"}})
say("ところが、相手が動かないときは、「自分に興味がないからだ」と考えてしまう。")
say("同じ「動かない」なのに、自分と相手で、理由がまるでちがうんです。")
say("この思い込みには、名前がついています。")
say("多元的無知。", {"kind": "concept", "term": "多元的無知", "en": "Pluralistic Ignorance",
                   "desc": "みんな同じ気持ちを抱えているのに、\n「そう思っているのは自分だけ」と思い込むこと"},
    speech="たげんてきむち。")
say("みんな同じように怖がっているのに、怖いのは自分だけだと思い込む状態のことです。")
say("たとえば、授業で「質問ありますか？」と聞かれて、誰も手を挙げないとき。")
say("本当はみんな分かっていないのに、「分からないのは自分だけだ」と思って黙ってしまう。")
say("恋愛でも、これと同じことが起きています。")
say("ボラウアーたちの研究では、人は自分の「動けない理由」を、とても正確に感じています。")
say("断られたら、明日から気まずい。周りに知られたら恥ずかしい。今の関係まで壊れるかもしれない。")
say("ところが、相手も同じことを考えている可能性には、なかなか思い至りません。")
say("自分の怖さは、自分の内側からよく見えます。", scene("断られたらどうしよう", "嫌われたらどうしよう", lf="shock", rf="shock"))
say("でも、相手の怖さは、外からは見えません。")
say("だから相手の「動かない」は、「興味がない」に見えてしまうんです。")
say("LINEの返事が短いだけで、「脈なしかも」と思ったことはありませんか？",
    {"kind": "versus", "left": {"title": "送った側の気持ち", "body": "重いと思われたくない…\n短めにしておこう"}, "right": {"title": "受け取った側の解釈", "body": "そっけない…\nやっぱり興味ないんだ"}})
say("相手も同じように、言葉を選びすぎて、短くなっているだけかもしれません。")
say("職場や学校など、毎日顔を合わせる相手だと、この怖さはさらに大きくなります。")
say("断られたあとも、毎日会わなければいけないからです。")
say("だから、身近な相手ほど、お互いに慎重になって、すれちがいやすいんです。")

# ───────── 第3章 ─────────
say("第3章。サインは、思ったより届いていない。", {"kind": "chapter", "no": 3, "title": "サインは\n思ったより届いていない"},
    speech="第三章。サインは、思ったより届いていない。", chapter="第3章 サインは届いていない")
tag("第3章 シグナル増幅バイアス")
say("ボラウアーたちは、さらに研究を進めました。",
    {"kind": "paper", "authors": "Vorauer, Cameron, Holmes & Pearce", "year": "2003", "journal": "Journal of Personality and Social Psychology",
     "title": "Invisible Overtures: Fears of Rejection and the Signal Amplification Bias", "points": ["好意のサインを出した本人と、受け取った側を比べた", "本人は「伝わっている」と思い込みやすい"]})
say("好意のサインを出した本人は、「これだけやれば伝わっているはず」と考えます。")
say("でも、相手から見ると、そのサインはずっと小さく見えている。")
say("自分のサインを、実際より大きく見積もってしまうクセ。")
say("これを、シグナル増幅バイアスといいます。", {"kind": "concept", "term": "シグナル増幅バイアス", "en": "Signal Amplification Bias",
                                        "desc": "自分の好意のサインが、\n実際より相手に伝わっていると思い込むクセ"})
say("しかもこのクセは、断られるのが怖い人ほど、強くなりやすいといわれています。")
say("たとえば、ミオは電車で、週末に見たい映画の話をしました。", scene(None, "（遠回しに誘ったつもり…）", ["right"], rf="heart"))
say("ミオにとっては、勇気を出した「遠回しのお誘い」です。")
say("でもハルトには、ただの映画の話にしか聞こえていませんでした。", scene("（ただの映画トークかな）", "（遠回しに誘ったつもり…）", lf="question", rf="heart"))
say("そしてミオは、「あんなに言ったのに、反応がない」と感じてしまう。")
say("ここで、すれちがいの悪循環ができあがります。",
    {"kind": "list", "title": "すれちがいの悪循環", "items": ["断られるのが怖いので、サインは控えめになる", "本人は「伝わったはず」と思い込む", "相手は気づかず、反応しない", "「やっぱり興味ないんだ」と、さらに引いてしまう"]})
say("怖いからサインが小さくなり、小さいから届かず、届かないから、もっと怖くなる。")
say("ポイントは、どちらも悪くないということです。")
say("出す側は精一杯サインを出していて、受け取る側も、ちゃんと相手を見ています。")
say("ただ、「自分の目」と「相手の目」で、同じサインの大きさがちがって見えている。それだけなんです。")
say("自分では10のつもりで出したサインが、相手には3くらいにしか見えていない。",
    {"kind": "bars", "title": "同じサインの「見え方」（イメージ）", "rows": [{"label": "出した本人", "value": 10, "color": PINK}, {"label": "受け取った相手", "value": 3, "color": BLUE}],
     "unit": "", "max": 10, "note": "※大きさの比はイメージです"})
say("そう考えると、遠回しなサインがほとんど届かないのも、納得がいきます。")

# ───────── 第4章 ─────────
say("第4章。待つ側と、動く側。", {"kind": "chapter", "no": 4, "title": "待つ側と、動く側"},
    speech="第四章。待つ側と、動く側。", chapter="第4章 待つ側と動く側")
tag("第4章 役割で気持ちが変わる")
say("では、なぜ好意があっても「待つ」側にまわる人が多いのでしょうか。")
say("ヒントになるのが、アメリカのノースウェスタン大学の、スピードデートの実験です。",
    {"kind": "paper", "authors": "Finkel & Eastwick", "year": "2009", "journal": "Psychological Science",
     "title": "Arbitrary Social Norms Influence Sex Differences in Romantic Selectivity", "points": ["大学生350人がスピードデートに参加", "「座って待つ側」と「席を回る側」を入れかえて比べた"]})
say("ふつうのスピードデートでは、女性が座って待ち、男性が席を回ります。")
say("このとき、女性のほうが相手をえり好みする、という結果がよく出ていました。")
say("そこで研究者たちは、半分の回で、役割を入れかえてみました。")
say("女性が席を回り、男性が座って待つようにしたんです。")
say("すると、女性のほうがえり好みする、という差が消えてしまいました。",
    {"kind": "bars", "title": "「また会いたい」と答えた割合", "rows": [
        {"label": "男性が回る回：男性", "value": 50, "color": BLUE}, {"label": "男性が回る回：女性", "value": 43, "color": PINK},
        {"label": "女性が回る回：男性", "value": 43, "color": BLUE}, {"label": "女性が回る回：女性", "value": 45, "color": PINK}],
     "max": 60, "note": "出典：Psychological Science の発表・報道より（Finkel & Eastwick, 2009）"})
say("つまり、えり好みの差は、男女のちがいというより、「待つ側か、動く側か」で生まれていたんです。")
say("自分から近づくと、相手への気持ちも、自分への自信も、高まりやすいと考えられています。")
say("逆に、待つ側にいると、気持ちはあっても、なかなか動けない。")
say("「誘うのは相手から」という空気があると、好意があっても、待つ側にまわりやすくなります。", scene("（誘うのは自分から？）", "（誘われるのを待とう）", lf="think", rf="think"))
say("近づいてこないのは、気持ちがないからではなく、「待つ役」にいるだけなのかもしれません。")
say("これは、男女どちらにも当てはまります。")
say("職場の先輩と後輩、サークルの部長と新入生のように、立場の差があるときも、下の立場の人は待つ側になりやすい。")
say("「相手から誘ってくれるはず」と、お互いに待っていたら、何も始まりません。")

# ───────── 第5章 ─────────
say("第5章。あなたは、思っているより好かれている。", {"kind": "chapter", "no": 5, "title": "あなたは思っているより\n好かれている"},
    speech="第五章。あなたは、思っているより好かれている。", chapter="第5章 思っているより好かれている")
tag("第5章 ライキング・ギャップ")
say("もうひとつ、すれちがいを大きくしているクセがあります。",
    {"kind": "paper", "authors": "Boothby, Cooney, Sandstrom & Clark", "year": "2018", "journal": "Psychological Science",
     "title": "The Liking Gap in Conversations", "points": ["初対面の会話のあと、相手にどれくらい好かれたかを予想してもらった", "大学の寮の新入生では、数か月あとまで追いかけた"]})
say("イェール大学などの研究チームは、初対面で会話したあと、相手にどれくらい好かれたと思うかを聞きました。")
say("すると多くの人が、実際よりも、自分は好かれていないと思っていました。")
say("この差は、ライキング・ギャップと呼ばれています。", {"kind": "concept", "term": "ライキング・ギャップ", "en": "The Liking Gap",
                                            "desc": "会話の相手が自分をどれくらい好きかを、\n実際より低く見積もってしまうこと"})
say("会話のあと、「変なこと言わなかったかな」と、ひとり反省会をしてしまうこと、ありますよね。")
say("でも相手は、あなたの言いまちがいなんて、ほとんど覚えていません。")
say("このギャップは、寮のルームメイトどうしで、数か月たっても残っていたそうです。")
say("そして、恥ずかしがり屋の人ほど、ギャップが大きくなる傾向がありました。")
say("なぜ、こんなギャップが生まれるのでしょう。")
say("会話の最中、私たちは「次に何を話そう」「変に思われてないかな」と、自分のことで頭がいっぱいです。")
say("そのせいで、相手が楽しそうにうなずいていたり、笑っていたりするサインを、見逃してしまうんです。")
say("実際、会話の録画を見た第三者には、2人がお互いを好ましく思っていることが、ちゃんと分かったそうです。")
say("ここまでの研究を合わせると、こうなります。",
    {"kind": "list", "title": "すれちがいを生む5つのクセ", "items": ["好意のサインは、もともと気づかれにくい", "相手の「動かない」を「興味がない」と読む", "自分のサインは届いていると思い込む", "待つ役にいると、動けなくなる", "自分は好かれていないと思いやすい"]})
say("これだけのクセが重なれば、両思いでも、すれちがうのは当然なんです。")

# ───────── 第6章 ─────────
say("第6章。すれちがいを終わらせる3つのルール。", {"kind": "chapter", "no": 6, "title": "すれちがいを終わらせる\n3つのルール"},
    speech="第六章。すれちがいを終わらせる、3つのルール。", chapter="第6章 3つのルール")
tag("第6章 3つのルール")
say("ルール1。相手の「動かない」を、「興味がない」と決めつけない。",
    {"kind": "rule", "no": 1, "title": "「動かない」＝「興味がない」\nと決めつけない", "body": "相手も、あなたと同じように怖がっているかもしれない"},
    speech="ルールいち。相手の、動かない、を、興味がない、と決めつけない。")
say("相手が何も言ってこないのは、あなたと同じように、断られるのが怖いからかもしれません。")
say("「興味がないのかも」と思ったら、「この人も怖いのかも」と、一度だけ考え直してみてください。")
say("ルール2。サインは、自分が思う2倍はっきり出す。",
    {"kind": "rule", "no": 2, "title": "サインは\n「2倍はっきり」出す", "body": "遠回しより、言葉にする。「楽しかった、また話したい」"},
    speech="ルールに。サインは、自分が思う2倍、はっきり出す。")
say("遠回しなサインは、ほとんど届きません。")
say("「今日は楽しかった。また話したい」と、言葉にするだけで十分です。")
say("言葉は、表情や態度よりも、ずっとまっすぐ届きます。")
say("自分では「言いすぎかな」と思うくらいで、相手にはちょうどよく届くはずです。")
say("ルール3。断られても傷が浅い、小さな誘い方をする。",
    {"kind": "rule", "no": 3, "title": "小さく誘う", "body": "「その映画、今度一緒に行きません？」「お昼、行きませんか？」"},
    speech="ルールさん。断られても傷が浅い、小さな誘い方をする。")
say("いきなり「付き合ってください」ではなく、「今度お昼でもどうですか？」くらいで大丈夫。")
say("小さな誘いなら、断られても、関係はほとんど変わりません。")
say("もし断られても、「じゃあまた今度」と笑って返せば大丈夫。")
say("相手が「本当は行きたかった」なら、次はきっと、相手のほうから声をかけてくれます。")
say("そして、動く側にまわると、自信がつきやすいことも、スピードデートの実験が教えてくれました。")

# ───────── まとめ ─────────
say("まとめ。", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "しなかった後悔は、長く残る"}, chapter="まとめ")
tag("まとめ")
say("心理学者のギロビッチたちは、人が何を後悔するのかを調べました。",
    {"kind": "paper", "authors": "Gilovich & Medvec", "year": "1995", "journal": "Psychological Review",
     "title": "The Experience of Regret: What, When, and Why", "points": ["短い目で見ると「してしまったこと」を後悔しやすい", "長い目で見ると「しなかったこと」の後悔が残りやすい"]})
say("短い目で見ると、人は「やってしまったこと」を後悔します。")
say("でも長い目で見ると、心に残るのは「やらなかったこと」の後悔のほうだそうです。")
say("あのとき誘っていたら、どうなっていただろう。")
say("その問いは、答えが出ないまま、ずっと残ってしまいます。")
say("もし、ハルトが「また映画の話しよう」と、ひとこと言っていたら。", scene("また映画の話しよう！", "うん、今度一緒に行こう！", lf="laugh", rf="heart"))
say("ミオは、きっと笑って「行こう」と答えていたはずです。")
say("あなたの気になるあの人も、今ごろ、あなたからのひとことを待っているのかもしれません。")
say("この動画が参考になったら、高評価とチャンネル登録をお願いします。", {"kind": "title", "title": ["最後まで見てくれて", "ありがとう"], "sub": "あなたの「すれちがい体験」、コメントで教えてください"})
say("あなたの「すれちがい体験」も、ぜひコメントで教えてください。")

IRA = {
    "man": {k: u for k, u in {
        "1_1_smile": "AVvXsEinCa3_I-Cu_oduFEXJgdqLfVVLTpVDzeeKvJU1P7Tmvy0-LJIQn6eLnUde-sOqyUxlU6Kmf_3nN832P3E5_MuqE_VM3ZUP598T9aA9RBjhVVPZm3OC_fuKOQA5qHw61GXMAvDTEmgmtV9n",
        "1_4_laugh": "AVvXsEjOHa1uoODoJQKY4lJibxtbHwA7J0MZd_T7NI6Ccay2-Z-73eo10bkIenD9uMbk2n1If4e7m-W58iL_QSMaz1ekU7i0sBSq2ecLUpGrpwWs_farEoAtFI7TfxMIGwqvgmVF1qUJ2nUWsc1o",
        "2_2_shock": "AVvXsEj_6HziRfnEDt4hyphenhyphenAYghphhjJh930C5aFyyh31XDYKkS_FIrNOY4liMDdMhU1e6w9wN3hgGgH-mjLmSteUs3jy_t_H2JltQ2VoSx0lH5Yz2BE_iXyysblzC1LkUMb3XNen3Pe0Vj7HXuYdU",
        "2_4_think": "AVvXsEh4f8UNlNx6rgIq-4BDpGQszhhYthGnl10m47e0hgtvKX3ikrea74r0uu9wm7yI7U9kwe9FT01JCbBLYA0aHOjQaaqYq2hsL2Q_eNgmOG5fzH6V2x_XUxF8mx_mEuzmbhXwQbuSuYx4QrYG",
        "3_1_question": "AVvXsEgl0KzEZadyAPONwycA4NlT0GpZ3hlafw-DbpxSwzRp2BRgo4iIjacANvbXZW4CPwd7jqhdJI3FWPqhYrboe9bA7rCl7SqLVogwgZaru5rGSIe6iePd3Om-q-tk7O3pJxXwnnZHhAMA6_7b",
    }.items()},
    "woman": {k: u for k, u in {
        "1_1_smile": "AVvXsEgKIGkR0NAsKhA679VI-_AHno_N3kOZwDEDErKUvypLVOHeDP4mSJAL1BjcGdpQUT3entVehgWv5XUgqmaCT0Bk6JAxMC0KLDQ8ro14IqpaQVGADgeXzmKsvaKYorWY3JtENTkKNC1xaoD4",
        "1_3_cry": "AVvXsEhEd-PV9kxYcef_sYh9riNt0_7EKNd4fPmoIC27nJh-syE15Yvpym3hXmmc_6T-7nUvpYyWVk8Zt9micKw-DyRxSru8rqmCTOswxC9HrsHj3U5iXbr4oVQAQWCJa6laFx1Y8KzKT1SnUXTk",
        "2_2_shock": "AVvXsEhDCbvH3MnhSwXvCRkMh6oKkuWOl7VavEfSKEmUupkYbjo3rhyGZjmrt6Bn_Qet24e-5WkweqKetj_M2gPTkPVhA5-ACi3soeFXaYO8AJ-M_Tbd7Cgx6dLT_RfikBqaIsgCEfhYY_UJi_g2",
        "2_4_think": "AVvXsEj5WZVuN0Tjy3STawu94uzuxEFV3OG_ykTcqeWKgWLQez13ISsOub8G0u_WQfTnjvQes_RXVnJuaiUjjW8NZv9jwGFvfaoXtA7hlapl932SYQsrBO6jZhP-8ZXuAp4IGj1ElpfL1vZXfiqA",
        "3_1_question": "AVvXsEgLFi0jmvOC0MaCsAPvncR4IIVJcfHYTqte1gB1JrzuEEM4TK_2LlnEhT8JUu2ey4NMlMsAtwiY6s2-XC-VwvuB7Hu6FLRD0iiJGKFV-9yxYSZtLCsd3TOKrjQguZAyUU6dkhYVBp2YqHGF",
        "3_2_heart": "AVvXsEiAKNpwa7jBYdwKUDK525xt98ca4-9PWVJVoNrC9sEMTAfi6wpu_CJSm0EPy__RmWxXKn7pDL5h6xEZa_g795Ckk8Hw_Lo7BFPEwghDrPUNnU92EtQRr29pOTd8OowVNJlmyHQg2y1mOHt4",
    }.items()},
}
ILLS = {}
for who, faces in IRA.items():
    for code, key in faces.items():
        name = [k for k, v in FACES.items() if v == code][0]
        fname = f"business_{who}{code.split('_')[0]}_{'_'.join(code.split('_')[1:])}.png"
        ILLS[face(who, name)] = f"https://blogger.googleusercontent.com/img/b/R29vZ2xl/{key}/s800/{fname}"
# 使っている表情がそろっているか確認
_used = {p[side]["emoji"] for x in S if x["visual"]["kind"] == "scene" for p in [x["visual"]] for side in ("left", "right")}
assert _used <= set(ILLS), _used - set(ILLS)

episode = {
    "id": "paper-love-long",
    "title": "好意はあるのに近づいてこない人の心理【論文で読み解く恋愛心理学】",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "paper",
    "background": "#0b1222",
    "slideGap": 10,
    "bgmVolume": 0.07,
    "voice": {"speaker": 13, "speed": 1.2, "name": "青山龍星"},
    "bgm": {"file": "you_and_me.mp3", "title": "You and Me", "credit": "しゃろう", "page": "https://opentracks.com/bgm/detail/13787", "opentracks": 13787, "track": 1},
    "illustrations": {k: {"emoji": "🙂", "irasutoya": "いろいろな表情のスーツを着た人のイラスト", "url": u, "credit": "いらすとや"} for k, u in ILLS.items()},
    "description": "好意はあるのに、相手が近づいてこない。自分も動けない。その「すれちがい」を、5つの心理学の研究から読み解きます。\n台本・例え話はオリジナルです。研究の数字は、論文や大学の発表で確認できた範囲で紹介しています。\n\n▼ 紹介した研究\n・Hall, Xing & Brooks (2014) Accurately Detecting Flirting. Communication Research.\n・Vorauer & Ratner (1996) Who's going to make the first move? Journal of Social and Personal Relationships.\n・Vorauer, Cameron, Holmes & Pearce (2003) Invisible Overtures. Journal of Personality and Social Psychology.\n・Finkel & Eastwick (2009) Arbitrary Social Norms Influence Sex Differences in Romantic Selectivity. Psychological Science.\n・Boothby, Cooney, Sandstrom & Clark (2018) The Liking Gap in Conversations. Psychological Science.\n・Gilovich & Medvec (1995) The Experience of Regret. Psychological Review.",
    "hashtags": ["恋愛心理学", "心理学", "論文", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "paper-love-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
