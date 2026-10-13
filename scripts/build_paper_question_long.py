"""「話がうまい人より、質問上手が好かれる」（論文で読み解く心理学・ロング）の台本から
src/episodes/paper-question-long.json を作る。台本・例え話はこのチャンネルのオリジナル。
研究の内容は、論文の要旨（PubMed）・論文の本文などで確かめた範囲で紹介する。
使い方: python3 scripts/build_paper_question_long.py
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
READ = {
    "%": "パーセント",
    "一言": "ひとこと",
    "36個": "さんじゅうろっこ",
    "どの山": "どのやま",
}

# 色（和モダン：藍・桜）
BLUE, PINK = "#2f5d8a", "#d0607a"

# 登場人物は いらすとや「いろいろな表情のスーツを着た人」（男性・女性）。表情を場面で変える
IRA_URLS = {
    ("man", "angry"): "AVvXsEhUielHk8qrDrtuW8Lhh5kbE0fwmNRSstAtgO9BRT8b6Cqo81aM0yYq8F979ZGi_kpeRpW8qOPdYtDG6Y0f_juJ_K0wVu3k2MXuIQojg0UVdTxAWmShgrpbNZQR_tP5ORT1FBjaZNSyWwdd/s800/business_man1_2_angry.png",
    ("man", "cry"): "AVvXsEiMwrKPOp3kuJfDea-QwL6S8fu7rCCziqC6OzaS8QbRjwJBlajVoZYrghnt531VLj9G0XmIdNdKAXu3FV_T_Y0haoD6b8Rbtg_q_5hDOOdcDH5g4UUQTu3HEX2FWa-jo-PHGAZqtdwxhyphenhyphen_B/s800/business_man1_3_cry.png",
    ("man", "heat"): "AVvXsEieC7_EvlFgxKv3AfjyNTBGoJpp2Nwcr0PcIU2AP4t0q0elP9pJwiJTv1sed0gqlOsRZmKePHy1UBJ6yd_ETyPRW5aOgdGVfVYrWneUhq__tSNYVEELwqbkBzQoxJY4MXfR2oAnbdV_23Ox/s800/business_man3_2_heat.png",
    ("man", "idea"): "AVvXsEhT1nHSRTNumaQWjilS1yilCY863lpnSaaVWo9oTSuIIB_vJ1I4N7eAlMhKqf_0SalEaBBuVSuF0e6kLIeU571h9ozcf4R2mBHC-7i_r8m35PDZruoSyC3GtvMObVSHpz5x4iGKdwQJSnqB/s800/business_man2_1_idea.png",
    ("man", "laugh"): "AVvXsEjOHa1uoODoJQKY4lJibxtbHwA7J0MZd_T7NI6Ccay2-Z-73eo10bkIenD9uMbk2n1If4e7m-W58iL_QSMaz1ekU7i0sBSq2ecLUpGrpwWs_farEoAtFI7TfxMIGwqvgmVF1qUJ2nUWsc1o/s800/business_man1_4_laugh.png",
    ("man", "question"): "AVvXsEgl0KzEZadyAPONwycA4NlT0GpZ3hlafw-DbpxSwzRp2BRgo4iIjacANvbXZW4CPwd7jqhdJI3FWPqhYrboe9bA7rCl7SqLVogwgZaru5rGSIe6iePd3Om-q-tk7O3pJxXwnnZHhAMA6_7b/s800/business_man3_1_question.png",
    ("man", "shock"): "AVvXsEj_6HziRfnEDt4hyphenhyphenAYghphhjJh930C5aFyyh31XDYKkS_FIrNOY4liMDdMhU1e6w9wN3hgGgH-mjLmSteUs3jy_t_H2JltQ2VoSx0lH5Yz2BE_iXyysblzC1LkUMb3XNen3Pe0Vj7HXuYdU/s800/business_man2_2_shock.png",
    ("man", "smile"): "AVvXsEinCa3_I-Cu_oduFEXJgdqLfVVLTpVDzeeKvJU1P7Tmvy0-LJIQn6eLnUde-sOqyUxlU6Kmf_3nN832P3E5_MuqE_VM3ZUP598T9aA9RBjhVVPZm3OC_fuKOQA5qHw61GXMAvDTEmgmtV9n/s800/business_man1_1_smile.png",
    ("man", "surprise"): "AVvXsEgruM78KUd4uJzK26EtvEwdSvTaxdAdjvO7CHfYzL430Pv1GCqXZixYeqwtDkadMs6Y3DBUvfV3grj7zczW8_1eHSHEWtGE0X1jX2KrTJEsMhbNeNYK78-6x3fk9uZKKZ749rFW-5w9Kgvw/s800/business_man2_3_surprise.png",
    ("man", "tehe"): "AVvXsEgpWUJ8C23MH3tU9WO26wRMXCdu2di6A5q1Cm4YtF41FzfMT7LzIj1KuG3VCcQ_p6pNzR2WwGEHQFcDMMSPi3jjl_9eKZ-RigCKTnIvNvIl2QDQ3cq_5myY5DEmaZJEXYCs7GF-M0I2wZ7_/s800/business_man3_4_tehe.png",
    ("man", "think"): "AVvXsEh4f8UNlNx6rgIq-4BDpGQszhhYthGnl10m47e0hgtvKX3ikrea74r0uu9wm7yI7U9kwe9FT01JCbBLYA0aHOjQaaqYq2hsL2Q_eNgmOG5fzH6V2x_XUxF8mx_mEuzmbhXwQbuSuYx4QrYG/s800/business_man2_4_think.png",
    ("woman", "cry"): "AVvXsEhEd-PV9kxYcef_sYh9riNt0_7EKNd4fPmoIC27nJh-syE15Yvpym3hXmmc_6T-7nUvpYyWVk8Zt9micKw-DyRxSru8rqmCTOswxC9HrsHj3U5iXbr4oVQAQWCJa6laFx1Y8KzKT1SnUXTk/s800/business_woman1_3_cry.png",
    ("woman", "heart"): "AVvXsEiAKNpwa7jBYdwKUDK525xt98ca4-9PWVJVoNrC9sEMTAfi6wpu_CJSm0EPy__RmWxXKn7pDL5h6xEZa_g795Ckk8Hw_Lo7BFPEwghDrPUNnU92EtQRr29pOTd8OowVNJlmyHQg2y1mOHt4/s800/business_woman3_2_heart.png",
    ("woman", "idea"): "AVvXsEgORBdxfIobbkHZ3KPwdV4p5NHJ73LXkdycGPLPhBZO9w0bzk79tKRZICwa4mmYEkbkZHMP5aQAnq02xuhsxwBb9wD6HhSMjHDMy80iLT_tGvAuUP_Xq5wXeO325YJKtJ7MgkVR5PD64ey9/s800/business_woman2_1_idea.png",
    ("woman", "laugh"): "AVvXsEieAeI8ijO5STgO5_khv-yLs6YEmCim2YRL0pf2AmPs8n5BrLbNRlAPl2Xr-L0GPMrY2bHy03KwyS0AD5MEDr_cyvOIziLeJ1wE7j1zJOo3vuA2Rxcbhbzlu3OsLUo3CBrW1wCEEtWKWVgv/s800/business_woman1_4_laugh.png",
    ("woman", "question"): "AVvXsEgLFi0jmvOC0MaCsAPvncR4IIVJcfHYTqte1gB1JrzuEEM4TK_2LlnEhT8JUu2ey4NMlMsAtwiY6s2-XC-VwvuB7Hu6FLRD0iiJGKFV-9yxYSZtLCsd3TOKrjQguZAyUU6dkhYVBp2YqHGF/s800/business_woman3_1_question.png",
    ("woman", "shock"): "AVvXsEhDCbvH3MnhSwXvCRkMh6oKkuWOl7VavEfSKEmUupkYbjo3rhyGZjmrt6Bn_Qet24e-5WkweqKetj_M2gPTkPVhA5-ACi3soeFXaYO8AJ-M_Tbd7Cgx6dLT_RfikBqaIsgCEfhYY_UJi_g2/s800/business_woman2_2_shock.png",
    ("woman", "smile"): "AVvXsEgKIGkR0NAsKhA679VI-_AHno_N3kOZwDEDErKUvypLVOHeDP4mSJAL1BjcGdpQUT3entVehgWv5XUgqmaCT0Bk6JAxMC0KLDQ8ro14IqpaQVGADgeXzmKsvaKYorWY3JtENTkKNC1xaoD4/s800/business_woman1_1_smile.png",
    ("woman", "surprise"): "AVvXsEhE5tGOZ4CPuvQkpae0FSaqxrX5VvGQHauToJYRP-6VFU8oMupcPijrBmWqOrC-u2CGnRisPfHzRyvHw2zHGZVy1V6DH1rw7bPOdRj37yyngBATu4ncSTvBlZwphf200v1AbxjhYhHjeF-h/s800/business_woman2_3_surprise.png",
    ("woman", "tehe"): "AVvXsEhWNyPdOCBYo-ri3xd13eMoGkRrSQiYNCTUEMgV771ZnVdhJLEBQJKA2_tzmvNNzrB4kiyRA-eJhhyfM2jpY-kiJ-SX9gahezwy5ftFW6p2Yeu9_Mnhaa0XHbGngI7ivuLa3FWQFF4EKSSA/s800/business_woman3_4_tehe.png",
    ("woman", "think"): "AVvXsEj5WZVuN0Tjy3STawu94uzuxEFV3OG_ykTcqeWKgWLQez13ISsOub8G0u_WQfTnjvQes_RXVnJuaiUjjW8NZv9jwGFvfaoXtA7hlapl932SYQsrBO6jZhP-8ZXuAp4IGj1ElpfL1vZXfiqA/s800/business_woman2_4_think.png",
}


def face(who, f):
    if who == "man" and f == "heart":
        f = "heat"
    return f"ira_{who}_{f}.png"


def scene(left_thought=None, right_thought=None, show=None, place="歓迎ランチのお店", lf="smile", rf="smile"):
    return {
        "kind": "scene",
        "place": place,
        "left": {"emoji": face("man", lf), "name": "リク", "thought": left_thought, "color": BLUE},
        "right": {"emoji": face("woman", rf), "name": "ナナミ", "thought": right_thought, "color": PINK},
        **({"show": show} if show else {}),
    }


# ───────── オープニング ─────────
say("話がうまい人より、なぜか好かれる人がいる。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["話がうまい人より", "質問上手が好かれる"], "sub": "5つの研究で読み解く「また話したい人」の正体"},
    chapter="オープニング")
say("その秘密は、話す力ではなく、聞く力のほうにありました。")
tag("オープニング")
say("春から同じ部署に配属された、リクとナナミ。", scene())
say("今日は、先輩たちとの歓迎ランチです。")
say("リクは前の晩から、面白い話を3つも準備してきました。", scene("盛り上げなきゃ！\nネタは3つ用意した", None, ["left"], lf="idea"))
say("学生時代の失敗談、旅行の話、最近ハマっているゲームの話。")
say("「沈黙になったら負けだ」。そう思って、リクは話のすき間を必死に埋めていきます。")
say("リクは一生懸命しゃべり続け、ランチの時間はあっという間に終わりました。")
say("一方のナナミは、あまり自分の話をしませんでした。", scene("盛り上げなきゃ！\nネタは3つ用意した", "先輩たちの話、\nもっと聞きたいな", lf="laugh", rf="smile"))
say("先輩が「週末は山に行った」と言えば、「どの山ですか？」と聞く。")
say("「それで、頂上はどうでした？」と、また聞く。それだけです。")
say("ところが帰り道、先輩たちはこう話していました。「ナナミさんって、なんだか話しやすいね」", scene("あんなに話したのに…\nなんでだろう", "楽しかったな", place="帰り道", lf="question", rf="laugh"))
say("リクは首をかしげます。「僕のほうが、ずっとたくさん話したのに」")
say("話題も、笑いも、リクのほうが多かったはず。それなのに、なぜでしょう。")
say("この動画では、なぜ質問する人が好かれるのかを、5つの研究から解き明かします。",
    {"kind": "list", "title": "この動画で紹介する研究", "items": ["質問の多い人は、好かれる", "自分の話をするのは、気持ちいい", "少しずつ深い質問で、距離が縮まる", "深い話は、思ったより気まずくない", "聞きにくい質問も、思ったほど嫌がられない"]})
say("最後に、今日から使える3つのルールもお話しします。")

# ───────── 第1章 ─────────
say("第1章。質問の多い人は、好かれる。", {"kind": "chapter", "no": 1, "title": "質問の多い人は\n好かれる"},
    speech="第一章。質問の多い人は、好かれる。", chapter="第1章 質問の多い人は好かれる")
tag("第1章 質問と好意")
say("ハーバード大学の研究チームが、会話と好意の関係を調べました。",
    {"kind": "paper", "authors": "Huang, Yeomans, Brooks ほか", "year": "2017", "journal": "Journal of Personality and Social Psychology",
     "title": "It Doesn't Hurt to Ask: Question-Asking Increases Liking", "points": ["初対面の2人に、オンラインで会話してもらう", "片方に「たくさん質問して」「あまり質問しないで」と頼んで比べた"]})
say("初対面の2人に、チャットで自己紹介の会話をしてもらいます。")
say("このとき、片方の人にだけ、こっそり指示を出しました。")
say("「できるだけたくさん質問してください」、または「質問はあまりしないでください」。")
say("会話のあと、相手の人に「この人をどれくらい好きになったか」を聞きます。")
say("結果は、はっきりしていました。たくさん質問した人のほうが、相手から好かれていたんです。",
    {"kind": "versus", "left": {"title": "質問が多い人", "body": "相手からの好感度が\n高かった"}, "right": {"title": "質問が少ない人", "body": "相手からの好感度は\nそれほど上がらなかった"}})
say("しかも、効果が大きかったのは、ある種類の質問でした。")
say("それが、相手の話を受けて、もう一歩聞く質問。フォローアップ質問です。",
    {"kind": "concept", "term": "フォローアップ質問", "en": "Follow-up Question",
     "desc": "相手が話したことを受けて、\n「それで？」「どうして？」と一歩深く聞く質問"})
say("「週末、山に行ったんです」に「どの山ですか？」と返す。これがフォローアップ質問です。")
say("急に「趣味は何ですか？」と話題を変える質問とは、ちがいます。")
say("LINEで「今日カレー食べた」と来たら、「どこのお店？」と返す。これも立派なフォローアップ質問です。",
    {"kind": "versus", "left": {"title": "フォローアップ質問", "body": "「今日カレー食べた」\n→「どこのお店？」"}, "right": {"title": "話題を変える質問", "body": "「今日カレー食べた」\n→「ところで趣味は？」"}})
say("フォローアップ質問をされると、人は「ちゃんと聞いてもらえている」と感じます。")
say("研究チームは、これを「応答性」と呼びました。聞いて、分かって、大切にしてくれている感じのことです。",
    {"kind": "concept", "term": "応答性", "en": "Responsiveness", "desc": "話を聞いて、分かって、\n大切にしてくれていると感じられること"})
say("質問の数が増えるほど好かれたのは、この「ちゃんと聞いてくれている感じ」が伝わるからだと考えられています。")
say("逆に、相手の話を聞き流して、自分の話にすりかえると、この感じは伝わりません。")
say("この研究では、スピードデートの会話も分析しています。")
say("すると、フォローアップ質問の多い人ほど、相手から「また会いたい」と言われやすかったんです。")
say("ところが、面白い点がもうひとつあります。",
    {"kind": "versus", "left": {"title": "実際の結果", "body": "質問が多いほど\n好かれていた"}, "right": {"title": "多くの人の予想", "body": "質問の数は\n好かれるかと関係ない"}})
say("多くの人は、「質問をすると好かれる」とは、予想していなかったんです。")
say("だからリクのように、「面白い話をしなきゃ」と、自分が話すことばかり考えてしまうんですね。", scene("面白い話を\nしなきゃ…", None, ["left"], place="歓迎ランチのお店", lf="think"))

# ───────── 第2章 ─────────
say("第2章。自分の話をするのは、気持ちいい。", {"kind": "chapter", "no": 2, "title": "自分の話をするのは\n気持ちいい"},
    speech="第二章。自分の話をするのは、気持ちいい。", chapter="第2章 自分の話は気持ちいい")
tag("第2章 自己開示とごほうび")
say("では、なぜ質問されると、うれしいのでしょうか。",
    {"kind": "paper", "authors": "Tamir & Mitchell", "year": "2012", "journal": "PNAS",
     "title": "Disclosing Information about the Self Is Intrinsically Rewarding", "points": ["自分のことを話しているときの脳の働きを調べた", "お金と「自分の話」の、どちらを選ぶかも調べた"]})
say("ハーバード大学のタミールたちは、まず、人の会話の中身に注目しました。")
say("私たちの会話の30〜40%は、自分の経験や気持ちを伝える話だといわれています。",
    {"kind": "stat", "value": 40, "unit": "%", "label": "会話のうち「自分のこと」の話", "sub": "人の会話の 30〜40% といわれる"},
    speech="私たちの会話の、さんじゅうからよんじゅうパーセントは、自分の経験や気持ちを伝える話だといわれています。")
say("研究チームは、自分のことを話しているときの脳を、MRIで調べました。")
say("すると、おいしい物を食べたときなどに働く、「ごほうび」に関わる脳の部分が活発になっていました。",
    {"kind": "concept", "term": "自分の話は「ごほうび」", "en": "Self-disclosure is rewarding",
     "desc": "自分のことを話すと、\n脳の「ごほうび」に関わる部分が働く"})
say("さらに、こんな実験もしました。")
say("「自分についての質問に答える」か「ほかの人についての質問に答える」かを選ぶと、もらえるお金が少し変わる。")
say("すると参加者たちは、もらえるお金が減っても、自分の話をするほうを選びがちでした。")
say("報道によると、自分の話をするために、もらえるはずのお金の17%ほどをあきらめていたそうです。",
    {"kind": "stat", "value": 17, "unit": "%", "label": "自分の話のために あきらめたお金", "sub": "出典：Tamir & Mitchell（2012）の研究の報道より"},
    speech="報道によると、自分の話をするために、もらえるはずのお金の、じゅうななパーセントほどをあきらめていたそうです。")
say("人は、お金を払ってでも、自分の話をしたい生き物なんですね。")
say("しかも、その話を誰かが聞いてくれると分かっているときのほうが、うれしさは大きかったそうです。")
say("そう考えると、質問するというのは、相手に「ごほうび」を渡すことでもあります。")
say("リクが自分の話をしている間、気持ちよくなっていたのは、実はリク自身でした。", scene("（話してて楽しい！）", "（うんうん）", place="歓迎ランチのお店", lf="laugh", rf="smile"))
say("ナナミの質問は、先輩たちに、その気持ちよさを渡していたんです。")
say("もちろん、リクが悪いわけではありません。話したくなるのは、人として自然なことです。")
say("ただ、相手も同じように話したいと思っている。そのことを覚えておくだけで、会話は変わります。")
say("SNSで、自分の近況をつい書きたくなるのも、同じしくみだと考えられています。")

# ───────── 第3章 ─────────
say("第3章。少しずつ深い質問で、距離が縮まる。", {"kind": "chapter", "no": 3, "title": "少しずつ深い質問で\n距離が縮まる"},
    speech="第三章。少しずつ深い質問で、距離が縮まる。", chapter="第3章 36の質問")
tag("第3章 36の質問")
say("質問の「深さ」に注目した、有名な研究があります。",
    {"kind": "paper", "authors": "Aron, Melinat, Aron, Vallone & Bator", "year": "1997", "journal": "Personality and Social Psychology Bulletin",
     "title": "The Experimental Generation of Interpersonal Closeness", "points": ["初対面の2人が、決められた質問を交互に聞き合う", "質問は3つのセットで、だんだん深くなっていく"]})
say("ニューヨーク州立大学のアーロンたちは、初対面の2人に、質問を聞き合ってもらいました。")
say("用意された質問は全部で36個。12個ずつ、3つのセットに分かれています。",
    {"kind": "list", "title": "質問のイメージ（だんだん深くなる）", "items": ["最初：「理想の1日って、どんな日？」", "途中：「人生で一番感謝していることは？」", "最後：「人前で最後に泣いたのはいつ？」"]},
    speech="用意された質問は、全部で、さんじゅうろっこ。じゅうにこずつ、3つのセットに分かれています。")
say("最初は軽い質問から始まり、セットが進むほど、少しずつ深い質問になっていきます。")
say("比べるグループには、ずっと浅い世間話をしてもらいました。")
say("すると、だんだん深くなる質問をしたペアのほうが、相手との距離が近くなったと感じていました。",
    {"kind": "versus", "left": {"title": "だんだん深い質問", "body": "相手を近くに感じる\n気持ちが強まった"}, "right": {"title": "ずっと浅い世間話", "body": "距離は\nあまり縮まらなかった"}})
say("この36の質問は、「恋に落ちる36の質問」として、世界中で話題になりました。")
say("ただし研究者自身は、これで信頼や深い絆まで生まれるわけではない、と注意しています。")
say("ポイントは、いきなり深い質問をしないこと。")
say("軽い質問で安心してもらってから、少しずつ深くしていく。その順番が大切なんです。")
say("新しいクラスや、部活の飲み会でも同じです。まずは出身地や好きな食べ物から。",
    {"kind": "list", "title": "飲み会での質問の順番（例）", "items": ["「出身はどこ？」「好きな食べ物は？」", "「休みの日は何してるの？」", "「どうしてその仕事を選んだの？」"]})
say("打ちとけてきたら、「どうしてその仕事を選んだの？」と、少しだけ深く聞いてみる。")
say("ナナミも、「どの山ですか？」から始めて、「頂上はどうでした？」と、少しずつ聞いていました。", scene(None, "どの山ですか？\n頂上はどうでした？", ["right"], place="歓迎ランチのお店", rf="smile"))

# ───────── 第4章 ─────────
say("第4章。深い話は、思ったより気まずくない。", {"kind": "chapter", "no": 4, "title": "深い話は\n思ったより気まずくない"},
    speech="第四章。深い話は、思ったより気まずくない。", chapter="第4章 深い話の気まずさ")
tag("第4章 深い会話")
say("でも、「深い質問なんて、気まずくなりそう」と思いますよね。",
    {"kind": "paper", "authors": "Kardas, Kumar & Epley", "year": "2022", "journal": "Journal of Personality and Social Psychology",
     "title": "Overly Shallow?: Miscalibrated Expectations Create a Barrier to Deeper Conversation", "points": ["初対面どうしで、深い話・浅い話をしてもらう", "話す前の予想と、話したあとの感想を比べた"]})
say("シカゴ大学のエプリーたちは、初対面の人どうしで、深い話をしてもらう実験をくり返しました。")
say("話す前、参加者たちは「きっと気まずくなる」と予想していました。")
say("ところが実際に話してみると、気まずさは予想よりずっと小さく、つながりや楽しさは予想より大きかったんです。",
    {"kind": "versus", "left": {"title": "話す前の予想", "body": "気まずくなりそう…\n相手は興味ないかも"}, "right": {"title": "話したあと", "body": "思ったより楽しかった\n相手もちゃんと聞いてくれた"}})
say("特に、深い話のほうが、予想とのズレが大きくなっていました。")
say("なぜ、こんなに予想が外れるのでしょう。")
say("研究チームによると、私たちは「相手は自分の話に、あまり興味がないだろう」と思いこんでいるからです。")
say("でも実際は、相手は思っているより、あなたの話を大切に聞いてくれていました。")
say("ちなみに、仲のいい友だちや家族が相手のときは、予想はもっと正確だったそうです。",
    {"kind": "versus", "left": {"title": "初対面の相手", "body": "「興味ないかも」と思い\n予想がずれやすい"}, "right": {"title": "友だち・家族", "body": "興味を持ってくれていると\n分かるので予想が正確"}})
say("相手が自分に興味を持ってくれていると、はっきり分かっているからですね。")
say("だから、つい天気や仕事の話ばかりの、浅い会話になってしまう。")
say("研究チームは、これを「浅すぎる会話」のわなだと指摘しています。",
    {"kind": "concept", "term": "浅すぎる会話のわな", "en": "Overly Shallow", "desc": "「相手は興味がないだろう」と思いこみ、\n深い話を避けてしまうこと"})
say("同じ人と、深い話と浅い話の両方をしてもらった実験では、深い話をした相手のほうに、より強いつながりを感じていました。")
say("そして、「深い話は思ったより気まずくない」と知った人は、実際に深い話題を選びやすくなったそうです。")
say("職場のランチで、毎回「最近忙しいですか？」で終わってしまうのも、このわなかもしれません。")

# ───────── 第5章 ─────────
say("第5章。聞きにくい質問も、思ったほど嫌がられない。", {"kind": "chapter", "no": 5, "title": "聞きにくい質問も\n思ったほど嫌がられない"},
    speech="第五章。聞きにくい質問も、思ったほど嫌がられない。", chapter="第5章 聞きにくい質問")
tag("第5章 聞きにくい質問")
say("もう一歩、踏みこんだ研究もあります。",
    {"kind": "paper", "authors": "Hart, VanEpps & Schweitzer", "year": "2021", "journal": "Organizational Behavior and Human Decision Processes",
     "title": "The (Better Than Expected) Consequences of Asking Sensitive Questions", "points": ["お給料など「聞きにくいこと」を質問してもらう", "質問した人の予想と、相手の実際の印象を比べた"]})
say("ペンシルベニア大学などの研究チームは、5つの実験で、1400人以上を調べました。", speech="ペンシルベニア大学などの研究チームは、5つの実験で、せんよんひゃくにん以上を調べました。")
say("参加者に、お給料のような「聞きにくい質問」をしてもらいます。")
say("質問する側は、「失礼だと思われる」「相手が気を悪くする」と心配していました。")
say("ところが相手の印象は、通勤のような、ふつうの質問をされたときと、ほとんど変わらなかったんです。",
    {"kind": "versus", "left": {"title": "質問した人の心配", "body": "失礼だと思われそう…\n嫌われるかも"}, "right": {"title": "相手の実際の印象", "body": "ふつうの質問のときと\nほとんど変わらなかった"}})
say("この結果は、友だちどうしでも、初対面でも、対面でもオンラインでも、同じでした。")
say("私たちは、聞きにくいことを聞くとき、相手の気持ちを大きく見積もりすぎているのかもしれません。")
say("聞きにくいことを、思いきって聞く。そのほうが、深い話につながることもあります。")
say("ただし、どんな質問でもいい、ということではありません。")
say("相手が答えたくなさそうなら、すぐに引く。その気づかいは、いつでも大切です。")
say("ここまでの研究を、まとめてみましょう。",
    {"kind": "list", "title": "質問上手が好かれる5つの理由", "items": ["質問、特にフォローアップ質問が好かれる", "自分の話は、脳にとって「ごほうび」", "少しずつ深い質問で、距離が縮まる", "深い話は、思ったより気まずくない", "聞きにくい質問も、思ったほど嫌がられない"]})

# ───────── 第6章 ─────────
say("第6章。今日から使える、3つのルール。", {"kind": "chapter", "no": 6, "title": "今日から使える\n3つのルール"},
    speech="第六章。今日から使える、3つのルール。", chapter="第6章 3つのルール")
tag("第6章 3つのルール")
say("ルール1。相手の言葉を拾って、もう一歩だけ聞く。",
    {"kind": "rule", "no": 1, "title": "相手の言葉を拾って\nもう一歩だけ聞く", "body": "「山に行った」→「どの山ですか？」"},
    speech="ルールいち。相手の言葉を拾って、もう一歩だけ聞く。")
say("新しい話題を考える必要はありません。相手が言った言葉を、そのまま拾えばいいんです。")
say("「どうして？」「それで、どうなったんですか？」。これだけで、立派なフォローアップ質問になります。")
say("会議のあとの雑談で、同期が「昨日、徹夜で資料作ってて」と言ったら、「何の資料？」と聞くだけでいいんです。")
say("ルール2。話す時間の半分は、相手にゆずる。",
    {"kind": "rule", "no": 2, "title": "話す時間の半分は\n相手にゆずる", "body": "自分の話をしたら、「〇〇さんはどうですか？」と返す"},
    speech="ルールに。話す時間の半分は、相手にゆずる。")
say("自分の話をするのは、悪いことではありません。自分のことを話すと、相手も話しやすくなります。")
say("ただ、話し終えたら、「〇〇さんはどうですか？」と、ボールを相手に返しましょう。", speech="ただ、話し終えたら、なになにさんはどうですか？と、ボールを相手に返しましょう。")
say("ルール3。浅い話のあとに、少しだけ深い質問をひとつ。",
    {"kind": "rule", "no": 3, "title": "浅い話のあとに\n少し深い質問をひとつ", "body": "「最近、一番うれしかったことは？」"},
    speech="ルールさん。浅い話のあとに、少しだけ深い質問をひとつ。")
say("「最近、一番うれしかったことは何ですか？」。それくらいの深さで、十分です。")
say("「この仕事、どこが一番好きですか？」「子どものころ、何になりたかったですか？」も、使いやすい質問です。")
say("相手は、あなたが思うよりずっと、その質問を歓迎してくれるはずです。")
say("ひとつだけ注意です。質問を、つぎつぎと浴びせると、取り調べのようになってしまいます。")
say("大切なのは、質問の数より、相手の答えに本当に興味を持つことです。")
say("答えを聞きながら、うなずいたり、「へえ！」と反応したりするだけでも、聞いている気持ちは伝わります。")

# ───────── まとめ ─────────
say("まとめ。", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "好かれる人は、聞き上手"}, chapter="まとめ")
tag("まとめ")
say("次の週のランチ。リクは、ネタを準備するのをやめました。", scene("今日は、\n聞いてみよう", None, ["left"], place="次の週のランチ", lf="idea"))
say("先輩が「最近、料理を始めたんだ」と言うと、リクは聞きました。「何を作ったんですか？」")
say("「それで、うまくできました？」。先輩はうれしそうに、失敗談まで話してくれました。", scene("それで、\nうまくできました？", None, ["left"], place="次の週のランチ", lf="smile"))
say("帰り道、ナナミが笑って言います。「リクくん、今日すごく楽しそうだったね」", scene("話さなくても\n楽しいんだな", "今日は聞き上手\nだったね", place="次の週のランチ", lf="laugh", rf="laugh"))
say("私たちは、好かれるには、面白い話をしなければ、と思いがちです。")
say("でも研究が教えてくれるのは、その反対でした。")
say("話のうまさより、相手への興味。たくさん話すより、もう一歩聞くこと。")
say("「また話したい」と思われる人は、相手の話を、もう一歩聞いてくれる人なんです。")
say("この動画が参考になったら、高評価とチャンネル登録をお願いします。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["最後まで見てくれて", "ありがとう"], "sub": "あなたが「話しやすい」と感じる人の質問、コメントで教えてください"})
say("あなたが「話しやすい」と感じる人は、どんな質問をしてくれますか？　ぜひコメントで教えてください。")

# 使っている表情だけを素材に入れる（いらすとやは1作品20点まで）
_used = {p[side]["emoji"] for x in S if x["visual"]["kind"] == "scene" for p in [x["visual"]] for side in ("left", "right")}
ILLS = {face(who, f): f"https://blogger.googleusercontent.com/img/b/R29vZ2xl/{key}" for (who, f), key in IRA_URLS.items() if face(who, f) in _used}
assert _used <= set(ILLS), _used - set(ILLS)
assert len(ILLS) <= 20

episode = {
    "id": "paper-question-long",
    "title": "話がうまい人より、質問上手が好かれる理由｜会話の心理学【論文で読み解く心理学】",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "paper",
    "background": "#0b1222",
    "slideGap": 10,
    "bgmVolume": 0.07,
    "voice": {"speaker": 13, "speed": 1.2, "name": "青山龍星"},
    "bgm": {"file": "ten_degrees.mp3", "title": "10℃", "credit": "しゃろう", "page": "https://opentracks.com/bgm/detail/12420", "opentracks": 12420, "track": 1},
    "illustrations": {k: {"emoji": "🙂", "irasutoya": "いろいろな表情のスーツを着た人のイラスト", "url": u, "credit": "いらすとや"} for k, u in ILLS.items()},
    "description": "面白い話を用意したのに、なぜか「話しやすい」と言われるのは、質問していた人のほう。会話と好意の関係を、5つの心理学の研究から読み解きます。\n台本・例え話はオリジナルです。研究の内容は、論文の要旨や大学・メディアの紹介で確認できた範囲で紹介しています（自分の話のためにあきらめたお金の割合は、研究の報道で紹介された値です）。\n\n▼ 紹介した研究\n・Huang, Yeomans, Brooks, Minson & Gino (2017) It Doesn't Hurt to Ask: Question-Asking Increases Liking. Journal of Personality and Social Psychology, 113(3), 430-452.\n・Tamir & Mitchell (2012) Disclosing Information about the Self Is Intrinsically Rewarding. PNAS, 109(21), 8038-8043.\n・Aron, Melinat, Aron, Vallone & Bator (1997) The Experimental Generation of Interpersonal Closeness. Personality and Social Psychology Bulletin, 23(4), 363-377.\n・Kardas, Kumar & Epley (2022) Overly Shallow?: Miscalibrated Expectations Create a Barrier to Deeper Conversation. Journal of Personality and Social Psychology, 122(3), 367-398.\n・Hart, VanEpps & Schweitzer (2021) The (Better Than Expected) Consequences of Asking Sensitive Questions. Organizational Behavior and Human Decision Processes, 162, 136-154.",
    "hashtags": ["心理学", "会話", "論文", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "paper-question-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
