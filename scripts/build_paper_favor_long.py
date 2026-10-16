"""「頼みごとをすると、なぜか好かれる（ベン・フランクリン効果）」（論文で読み解く心理学・ロング）の台本から
src/episodes/paper-favor-long.json を作る。台本・例え話はこのチャンネルのオリジナル。
研究の内容は、論文の要旨（PubMed）・論文の本文などで確かめた範囲で紹介する。
使い方: python3 scripts/build_paper_favor_long.py
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
    "甘え": "あまえ",
    "表計算": "ひょうけいさん",
    "日本": "にほん",
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


def scene(left_thought=None, right_thought=None, show=None, place="平日の午後のオフィス", lf="smile", rf="smile"):
    return {
        "kind": "scene",
        "place": place,
        "left": {"emoji": face("man", lf), "name": "ケンタ", "thought": left_thought, "color": BLUE},
        "right": {"emoji": face("woman", rf), "name": "マイ", "thought": right_thought, "color": PINK},
        **({"show": show} if show else {}),
    }


# ───────── オープニング ─────────
say("頼みごとをすると、嫌われる。そう思っていませんか？", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["頼みごとをすると", "なぜか好かれる"], "sub": "5つの研究で読み解く「ベン・フランクリン効果」"},
    chapter="オープニング")
say("実は心理学では、その逆のことが、くり返し確かめられています。")
tag("オープニング")
say("入社2年目のマイは、表計算ソフトの集計作業で、すっかり手が止まっていました。", scene(None, "この関数、\nどう使うんだろう…", ["right"], rf="think"),
    speech="入社にねんめのマイは、表計算ソフトの集計作業で、すっかり手が止まっていました。")
say("向かいの席には、表計算が得意な先輩のケンタがいます。", scene(None, "この関数、\nどう使うんだろう…", rf="think"))
say("でも、マイは声をかけられません。", scene(None, "忙しそうだし…\n迷惑かな", rf="cry"))
say("「ケンタさん、忙しそうだし。こんなことも分からないのかって、思われたらどうしよう」")
say("結局マイは、ネットで調べながら、2時間かけて、ひとりで作業を終えました。")
say("そのころケンタは、こんなことを考えていました。", scene("最近マイさんと\nあまり話してないな", "忙しそうだし…\n迷惑かな", lf="think", rf="cry"))
say("「マイさん、困ってないかな。何かあったら、頼ってくれればいいのに」")
say("頼る側は「迷惑かも」と思い、頼られる側は「頼ってほしい」と思っている。")
say("このすれちがいには、心理学の研究で分かっている、いくつかの理由があります。")
say("「人に迷惑をかけてはいけない」。子どものころから、そう教わってきた人も多いはずです。")
say("でも、その教えが、人と仲よくなるチャンスを、知らないうちに減らしているのかもしれません。")
say("この動画では、頼みごとと人間関係の不思議な関係を、5つの研究から解き明かします。",
    {"kind": "list", "title": "この動画で紹介する研究", "items": ["頼みごとを聞いた相手を、好きになる", "日本でも、頼まれると好意が増えた", "人は、思ったより頼みを引き受けてくれる", "相談すると、「できる人」に見える", "「ありがとう」が、次の助けを生む"]})
say("最後に、上手に頼るための3つのルールもお話しします。")

# ───────── 第1章 ─────────
say("第1章。頼みごとを聞いた相手を、好きになる。", {"kind": "chapter", "no": 1, "title": "頼みごとを聞いた相手を\n好きになる"},
    speech="第一章。頼みごとを聞いた相手を、好きになる。", chapter="第1章 ベン・フランクリン効果")
tag("第1章 ベン・フランクリン効果")
say("この現象には、アメリカの政治家の名前がついています。")
say("アメリカ建国の父のひとり、ベンジャミン・フランクリンです。",
    {"kind": "concept", "term": "ベン・フランクリン効果", "en": "The Ben Franklin Effect",
     "desc": "頼みごとを引き受けた相手のことを、\nかえって好きになる現象"})
say("フランクリンの自伝には、こんな話が書かれています。")
say("議会で、自分に冷たい態度をとる、ライバルの議員がいました。")
say("フランクリンは、その議員が珍しい本を持っていると聞き、「ぜひ読ませてほしい」と手紙を書きます。")
say("議員は本を貸してくれ、フランクリンは、心のこもったお礼の手紙をそえて返しました。",
    {"kind": "list", "title": "フランクリンがしたこと", "items": ["冷たいライバルに「本を貸して」と頼む", "心をこめたお礼の手紙をそえて返す", "→ 相手のほうから、親しげに話しかけてきた"]})
say("すると次に会ったとき、その議員は、初めて親しげに話しかけてきたそうです。")
say("そして2人は、その後、長く友人になったといわれています。")
say("この話を、実験で確かめようとした研究があります。",
    {"kind": "paper", "authors": "Jecker & Landy", "year": "1969", "journal": "Human Relations",
     "title": "Liking a Person as a Function of Doing Him a Favour", "points": ["実験でお金をもらった学生に、「返してほしい」と頼む", "頼む人を変えて、研究者への好感を比べた"]})
say("学生たちは、ある実験に参加して、賞金をもらいました。")
say("実験が終わったあと、一部の学生は、研究者本人から「研究費が足りなくなったので、返してもらえないか」と頼まれます。")
say("別の学生は、研究室の事務の人から、同じように頼まれました。")
say("そして最後に、研究者のことをどれくらい好きかを聞きました。")
say("すると、研究者本人に頼まれてお金を返した学生が、いちばん研究者を好きだと答えたんです。",
    {"kind": "versus", "left": {"title": "研究者本人に頼まれた", "body": "研究者への好感が\nいちばん高かった"}, "right": {"title": "事務の人に頼まれた", "body": "研究者への好感は\n高くならなかった"}})
say("自分のお金を手放したのに、頼んだ相手を、むしろ好きになっていたんです。")
say("なぜ、こんなことが起きるのでしょう。ひとつの説明は、「自分の行動に、心が合わせにいく」というものです。")
say("「わざわざ助けたんだから、自分はこの人のことが好きなんだろう」。心が、そう納得しようとするわけです。")
say("ただし、これは1960年代の小さな実験です。そこで、もっと新しい研究も見てみましょう。")

# ───────── 第2章 ─────────
say("第2章。日本でも、頼まれると好意が増えた。", {"kind": "chapter", "no": 2, "title": "日本でも\n頼まれると好意が増えた"},
    speech="第二章。日本でも、頼まれると好意が増えた。", chapter="第2章 日本とアメリカの実験")
tag("第2章 頼まれるうれしさ")
say("2015年、日本の研究者が、この効果を、日本とアメリカの両方で確かめました。",
    {"kind": "paper", "authors": "Niiya", "year": "2016", "journal": "The Journal of Social Psychology",
     "title": "Does a Favor Request Increase Liking Toward the Requester?", "points": ["日本とアメリカの大学生が参加", "一緒に課題をする相手から、手伝いを頼まれる"]},
    speech="にせんじゅうごねん、日本の研究者が、この効果を、日本とアメリカの両方で確かめました。")
say("参加者は、ほかの参加者と一緒に、課題に取り組みます。実はこの相手は、研究チームの協力者です。")
say("あるグループでは、相手が「ちょっと手伝ってもらえませんか」と、直接頼みます。")
say("別のグループでは、頼まれずに、同じように相手を手伝うことになりました。")
say("すると、直接頼まれたグループでは、日本人もアメリカ人も、その相手への好感が上がりました。",
    {"kind": "versus", "left": {"title": "直接頼まれて手伝った", "body": "相手への好感が上がり\n親しみも増した"}, "right": {"title": "頼まれずに手伝った", "body": "好感は\n上がらなかった"}})
say("相手を「人づきあいのいい人」と感じ、自分との距離も近くなったと感じていたんです。")
say("ここで大事なのは、手伝ったこと自体ではなく、「頼まれた」ことのほうに意味があった、という点です。")
say("研究者は、日本語の「甘え」という考え方に注目しています。",
    {"kind": "concept", "term": "甘え", "en": "Amae",
     "desc": "相手の好意をあてにして、頼ったり、ゆだねたりすること。\n信頼のしるしとして受け取られることもある"},
    speech="研究者は、日本語の、あまえ、という考え方に注目しています。")
say("頼みごとをされると、人は「この人は自分を信頼してくれている」と感じます。")
say("その信頼のサインが、2人の距離を、ぐっと縮めてくれるのかもしれません。")
say("ケンタが「頼ってくれればいいのに」と思っていたのも、うなずけますね。", scene("頼ってくれれば\nいいのに", None, ["left"], lf="think"))
say("部活の後輩に「先輩、ちょっと教えてください」と言われて、うれしかった経験はありませんか。")
say("頼られるのは、手間がかかることでもありますが、それ以上に「信頼されている」という、うれしいサインでもあるんです。")

# ───────── 第3章 ─────────
say("第3章。人は、思ったより頼みを引き受けてくれる。", {"kind": "chapter", "no": 3, "title": "人は思ったより\n頼みを引き受けてくれる"},
    speech="第三章。人は、思ったより頼みを引き受けてくれる。", chapter="第3章 引き受けてもらえる確率")
tag("第3章 頼む側の思いこみ")
say("それでも、頼みごとをするのは、勇気がいりますよね。",
    {"kind": "paper", "authors": "Flynn & Lake", "year": "2008", "journal": "Journal of Personality and Social Psychology",
     "title": "If You Need Help, Just Ask: Underestimating Compliance with Direct Requests for Help", "points": ["知らない人に、ちょっとした頼みごとをしてもらう", "「何人に頼めば引き受けてもらえるか」を予想してから実行"]})
say("スタンフォード大学などの研究チームは、こんな実験をしました。")
say("学生たちに、キャンパスで知らない人に声をかけて、アンケートに答えてもらうよう頼んでもらいます。")
say("その前に、「何人に声をかければ、5人に答えてもらえるか」を予想してもらいました。")
say("学生たちの予想は、かなり多めでした。断られることを、強く覚悟していたんです。")
say("ところが実際には、予想の半分くらいの人数に声をかけただけで、目標に届いてしまいました。",
    {"kind": "stat", "value": 50, "unit": "%", "label": "引き受けてもらえる確率の見積もりちがい", "sub": "頼む側は、最大で50%ほど少なく見積もっていた"},
    speech="ところが実際には、予想の半分くらいの人数に声をかけただけで、目標に届いてしまいました。")
say("この研究では、いくつもの場面で、人は「引き受けてもらえる確率」を、最大で半分ほど少なく見積もっていました。", speech="この研究では、いくつもの場面で、人は、引き受けてもらえる確率を、最大で半分ほど少なく見積もっていました。")
say("なぜ、こんなに低く見積もってしまうのでしょう。")
say("頼む側は、「引き受けたら、相手は時間や手間がかかる」と、相手の負担ばかり考えます。")
say("でも、頼まれた側にとっては、「断る」こと自体も、気まずくて、つらいものなんです。",
    {"kind": "versus", "left": {"title": "頼む側が考えること", "body": "引き受けるのは\n時間も手間もかかる"}, "right": {"title": "頼まれた側の本音", "body": "断るほうが\n気まずくてつらい"}})
say("頼む側は、この「断るつらさ」を、見落としがちだったんです。")
say("駅で道を聞かれたとき、多くの人は、つい足を止めて答えてしまいますよね。あれも、同じしくみです。")
say("だから、思っているより多くの人が、頼みを引き受けてくれます。")
say("マイが「迷惑かも」と思っていた頼みごとも、ケンタにとっては、たぶん5分で済む、うれしいお願いでした。", scene("5分で教えられるのに", "迷惑かも…", lf="think", rf="cry"))
say("ただ、この研究は、もうひとつ大切なことも教えてくれます。")
say("断りにくいからこそ、相手が本当は無理をしていないか、気づかう必要もある、ということです。")

# ───────── 第4章 ─────────
say("第4章。相談すると、「できる人」に見える。", {"kind": "chapter", "no": 4, "title": "相談すると\n「できる人」に見える"},
    speech="第四章。相談すると、できる人に見える。", chapter="第4章 相談とできる人")
tag("第4章 相談の効果")
say("マイが頼れなかった、もうひとつの理由。それは「できない人だと思われたくない」という気持ちでした。",
    {"kind": "paper", "authors": "Brooks, Gino & Schweitzer", "year": "2015", "journal": "Management Science",
     "title": "Smart People Ask for (My) Advice: Seeking Advice Boosts Perceptions of Competence", "points": ["一緒に課題をした相手から、アドバイスを求められる", "相手の「有能さ」の印象を比べた"]})
say("ハーバード大学などの研究チームは、この心配が本当かどうかを調べました。")
say("参加者は、ペアの相手と一緒に、難しいパズルのような課題に取り組みます。")
say("途中で、相手から「どうしたらいいと思う？」とアドバイスを求められるグループと、求められないグループに分けました。")
say("すると、アドバイスを求めてきた相手のほうを、「有能な人だ」と評価したんです。",
    {"kind": "versus", "left": {"title": "アドバイスを求めた人", "body": "「有能な人」と\n評価された"}, "right": {"title": "求めなかった人", "body": "有能さの評価は\nそれほど高くない"}})
say("ただし、この効果には、いくつか条件がありました。",
    {"kind": "list", "title": "相談が「できる人」に見える条件", "items": ["課題がむずかしいとき（かんたんすぎると逆効果）", "「あなたに」直接相談したとき", "相手が得意な分野について相談したとき"]})
say("かんたんすぎることを聞いたり、専門外のことを聞いたりすると、この効果は弱くなりました。")
say("たとえば、料理が得意な友だちに「おいしい卵焼きのコツ、教えて」と聞くのは、とてもいい相談です。",
    {"kind": "versus", "left": {"title": "いい相談", "body": "料理が得意な友だちに\n「卵焼きのコツ、教えて」"}, "right": {"title": "逆効果になりやすい相談", "body": "すぐ調べられることを\n毎回聞く"}})
say("でも、ネットで1秒で分かることを毎回聞いていると、「自分で調べて」と思われてしまうかもしれません。")
say("相談された側は、「自分の力を認めてくれた」と感じて、うれしくなります。")
say("そして、そんな自分を頼ってくれた相手を、「見る目がある」と評価するのかもしれません。")
say("表計算が得意なケンタに、表計算のことを相談する。マイの頼みごとは、まさに理想的な相談だったんです。")

# ───────── 第5章 ─────────
say("第5章。「ありがとう」が、次の助けを生む。", {"kind": "chapter", "no": 5, "title": "「ありがとう」が\n次の助けを生む"},
    speech="第五章。ありがとうが、次の助けを生む。", chapter="第5章 ありがとうの力")
tag("第5章 ありがとうの力")
say("最後は、頼みごとを引き受けてもらった、そのあとの話です。",
    {"kind": "paper", "authors": "Grant & Gino", "year": "2010", "journal": "Journal of Personality and Social Psychology",
     "title": "A Little Thanks Goes a Long Way: Explaining Why Gratitude Expressions Motivate Prosocial Behavior", "points": ["学生の書類にアドバイスをしてもらう", "そのあとの返事に、お礼の言葉を入れるかどうかで比べた"]})
say("ペンシルベニア大学のグラントたちは、参加者に、ある学生の就職用の書類にアドバイスをしてもらいました。")
say("そのあと、学生からメールが届きます。")
say("半分の人には「アドバイスを受け取りました」とだけ。もう半分の人には、心のこもった「ありがとうございます」が書かれていました。")
say("そして、もう一度、書類を見てほしいという頼みが届きます。")
say("報道によると、引き受けた人は、お礼がなかったグループで32%、お礼を言われたグループでは66%。およそ2倍でした。",
    {"kind": "bars", "title": "次の頼みも 引き受けた人の割合", "rows": [{"label": "お礼なし", "value": 32, "color": BLUE}, {"label": "「ありがとう」あり", "value": 66, "color": PINK}],
     "max": 100, "note": "出典：Grant & Gino（2010）の実験を紹介したハーバード大学の記事より"},
    speech="報道によると、引き受けた人は、お礼がなかったグループで、さんじゅうにパーセント、お礼を言われたグループでは、ろくじゅうろくパーセント。およそ2倍でした。")
say("しかも、お礼を言われた人は、ほかの人からの頼みごとまで、引き受けやすくなっていました。")
say("研究チームによると、その理由は「自分は大切にされている」と感じられたからでした。",
    {"kind": "concept", "term": "必要とされている感覚", "en": "Social Worth",
     "desc": "「ありがとう」で、\n自分は大切にされていると感じると、また助けたくなる"})
say("実際の職場でも、上司が「ありがとう」と伝えただけで、電話をかける仕事の件数が増えたそうです。")
say("頼みごとは、頼んで終わりではありません。「ありがとう」までが、ひとつのセットなんです。")
say("「すみません」ではなく「ありがとう」。同じお礼でも、相手に伝わる気持ちは、ずいぶんちがいます。",
    {"kind": "versus", "left": {"title": "「すみません」", "body": "迷惑をかけたことへの\nおわび"}, "right": {"title": "「ありがとう」", "body": "してくれたことへの\n感謝"}})
say("「すみません」は、迷惑をかけたことへのおわび。「ありがとう」は、相手がしてくれたことへの感謝だからです。")
say("ここまでの研究を、まとめてみましょう。",
    {"kind": "list", "title": "頼みごとについて分かったこと", "items": ["頼みを引き受けた相手を、好きになる", "直接「頼まれた」ことが、親しさを生む", "人は思ったより、頼みを引き受けてくれる", "得意なことの相談は、「できる人」に見える", "「ありがとう」が、次の助けを生む"]})

# ───────── 第6章 ─────────
say("第6章。上手に頼るための、3つのルール。", {"kind": "chapter", "no": 6, "title": "上手に頼るための\n3つのルール"},
    speech="第六章。上手に頼るための、3つのルール。", chapter="第6章 3つのルール")
tag("第6章 3つのルール")
say("ルール1。小さく、直接、頼む。",
    {"kind": "rule", "no": 1, "title": "小さく、直接、頼む", "body": "「5分だけ、教えてもらえませんか？」"},
    speech="ルールいち。小さく、直接、頼む。")
say("日本とアメリカの実験では、「直接頼まれた」ことが、好意につながっていました。")
say("人づてやグループ全体に投げかけるより、「〇〇さん、5分だけいいですか？」と、名前を呼んで頼みましょう。", speech="人づてやグループ全体に投げかけるより、なになにさん、5分だけいいですか？と、名前を呼んで頼みましょう。")
say("最初は、すぐ終わる小さな頼みごとから始めるのがおすすめです。")
say("小さな頼みなら、相手も気軽に引き受けられて、あなたも気軽にお礼が言えます。")
say("ルール2。相手の得意なことを頼る。",
    {"kind": "rule", "no": 2, "title": "相手の得意なことを頼る", "body": "「〇〇さん、これ得意ですよね？」"},
    speech="ルールに。相手の得意なことを頼る。")
say("相談の研究では、相手の得意分野について聞いたとき、いちばん「できる人」に見えていました。")
say("「これ、〇〇さんが一番くわしいと思って」。その一言で、相手は自分の力を認められたと感じます。", speech="これ、なになにさんが一番くわしいと思って。その一言で、相手は自分の力を認められたと感じます。")
say("ルール3。「ありがとう」を、言葉にして伝える。",
    {"kind": "rule", "no": 3, "title": "「ありがとう」を\n言葉にして伝える", "body": "「助かりました。おかげで早く終わりました」"},
    speech="ルールさん。ありがとうを、言葉にして伝える。")
say("お礼を言われた人は、次の頼みごとも、2倍ほど引き受けやすくなっていました。")
say("「助かりました」に、「おかげで、〇〇できました」と、どう役に立ったかを添えると、さらに伝わります。", speech="助かりました、に、おかげで、なになにできました、と、どう役に立ったかを添えると、さらに伝わります。")
say("ひとつだけ注意です。人は、頼みごとを断りにくいものでした。")
say("だからこそ、「無理だったら、全然いいからね」と、断りやすい一言も添えてあげてください。")
say("頼りすぎず、でも、ひとりで抱えこみすぎない。そのバランスが大切です。")
say("そして、頼られたときは、今度はあなたが、気持ちよく引き受けてあげてください。頼り、頼られる関係が、いちばん長続きします。")

# ───────── まとめ ─────────
say("まとめ。", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "頼ることは、信頼を伝えること"}, chapter="まとめ")
tag("まとめ")
say("次の週、マイはまた、表計算で手が止まりました。", scene(None, "今日は、\n聞いてみよう", rf="idea", place="次の週のオフィス"))
say("今度は、思いきって声をかけます。「ケンタさん、表計算くわしいですよね。5分だけ、教えてもらえませんか？」", scene(None, "5分だけ、\n教えてもらえませんか？", rf="smile", place="次の週のオフィス"))
say("ケンタは、少しうれしそうに答えました。「いいよ。これはね、こうすると一瞬だよ」", scene("いいよ！\nこれはね…", "5分だけ、\n教えてもらえませんか？", lf="laugh", rf="smile", place="次の週のオフィス"))
say("2時間かかっていた作業は、たった10分で終わりました。")
say("「ありがとうございます！　おかげで、今日は定時に帰れます」", scene("また何でも\n聞いてね", "ありがとうございます！\n助かりました", lf="smile", rf="laugh", place="次の週のオフィス"))
say("それからというもの、2人は、ちょっとした雑談もするようになりました。")
say("頼みごとは、相手に迷惑をかけることではなく、「あなたを信頼しています」と伝えることでもあるんです。")
say("あなたも今日、誰かに、小さな頼みごとをしてみませんか。")
say("この動画が参考になったら、高評価とチャンネル登録をお願いします。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["最後まで見てくれて", "ありがとう"], "sub": "「頼ってよかった」体験、コメントで教えてください"})
say("頼みごとをして、相手と仲よくなれた体験はありますか？　ぜひコメントで教えてください。")

# 使っている表情だけを素材に入れる（いらすとやは1作品20点まで）
_used = {p[side]["emoji"] for x in S if x["visual"]["kind"] == "scene" for p in [x["visual"]] for side in ("left", "right")}
ILLS = {face(who, f): f"https://blogger.googleusercontent.com/img/b/R29vZ2xl/{key}" for (who, f), key in IRA_URLS.items() if face(who, f) in _used}
assert _used <= set(ILLS), _used - set(ILLS)
assert len(ILLS) <= 20

episode = {
    "id": "paper-favor-long",
    "title": "頼みごとをすると、なぜか好かれる｜ベン・フランクリン効果【論文で読み解く心理学】",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "paper",
    "background": "#0b1222",
    "slideGap": 10,
    "bgmVolume": 0.07,
    "voice": {"speaker": 13, "speed": 1.2, "name": "青山龍星"},
    "bgm": {"file": "south_wind.mp3", "title": "South Wind", "credit": "FLASH☆BEAT", "page": "https://opentracks.com/bgm/detail/9297", "opentracks": 9297, "track": 1},
    "illustrations": {k: {"emoji": "🙂", "irasutoya": "いろいろな表情のスーツを着た人のイラスト", "url": u, "credit": "いらすとや"} for k, u in ILLS.items()},
    "description": "「迷惑かな」と思って、頼みごとをためらっていませんか？ 実は、頼みごとを引き受けた相手のことを、人はかえって好きになる。ベン・フランクリン効果と「頼る」ことの心理を、5つの研究から読み解きます。\n台本・例え話はオリジナルです。研究の内容は、論文の要旨や大学・メディアの紹介で確認できた範囲で紹介しています（お礼の実験の割合は、ハーバード大学の記事で紹介された値です）。\n\n▼ 紹介した研究\n・Jecker & Landy (1969) Liking a Person as a Function of Doing Him a Favour. Human Relations, 22(4), 371-378.\n・Niiya (2016) Does a Favor Request Increase Liking Toward the Requester? The Journal of Social Psychology, 156(2), 211-221.\n・Flynn & Lake (2008) If You Need Help, Just Ask: Underestimating Compliance with Direct Requests for Help. Journal of Personality and Social Psychology, 95(1), 128-143.\n・Brooks, Gino & Schweitzer (2015) Smart People Ask for (My) Advice: Seeking Advice Boosts Perceptions of Competence. Management Science, 61(6), 1421-1435.\n・Grant & Gino (2010) A Little Thanks Goes a Long Way. Journal of Personality and Social Psychology, 98(6), 946-955.",
    "hashtags": ["心理学", "ベンフランクリン効果", "論文", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "paper-favor-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
