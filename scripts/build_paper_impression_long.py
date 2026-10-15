"""「第一印象は0.1秒で決まる？」（論文で読み解く心理学・ロング）の台本から
src/episodes/paper-impression-long.json を作る。台本・例え話はこのチャンネルのオリジナル。
研究の内容は、論文の要旨（PubMed）・論文の本文などで確かめた範囲で紹介する。
使い方: python3 scripts/build_paper_impression_long.py
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
    "一語": "いちご",
    "いい人": "いいひと",
    "同じ人": "おなじひと",
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


def scene(left_thought=None, right_thought=None, show=None, place="配属初日のオフィス", lf="smile", rf="smile"):
    return {
        "kind": "scene",
        "place": place,
        "left": {"emoji": face("man", lf), "name": "タクミ", "thought": left_thought, "color": BLUE},
        "right": {"emoji": face("woman", rf), "name": "ハナ", "thought": right_thought, "color": PINK},
        **({"show": show} if show else {}),
    }


# ───────── オープニング ─────────
say("第一印象は、ほんの一瞬で決まる。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["第一印象は", "0.1秒で決まる？"], "sub": "5つの研究で読み解く「はじめまして」の心理"},
    speech="第一印象は、ほんの一瞬で決まる。", chapter="オープニング")
say("でも、その印象は、どこまで当たっているのでしょうか。")
tag("オープニング")
say("4月、新しい会社に入社したハナ。", scene(None, None, ["right"]))
say("配属先で隣の席になったのは、先輩のタクミでした。", scene())
say("タクミは、「よろしく」と一言だけ言って、すぐパソコンに向き直ります。", scene(None, None, lf="think", rf="smile"))
say("ハナは思いました。「なんだか、怖そうな人だな」", scene(None, "なんだか…\n怖そうな人だな", lf="think", rf="shock"))
say("お昼休み、別の先輩がこっそり教えてくれます。「タクミさんって、ちょっと冷たい感じでしょ」")
say("ハナの中で、「タクミさん＝冷たい人」という印象が、どんどん固まっていきました。", scene(None, "やっぱり\n冷たい人なんだ…", lf="think", rf="cry"))
say("一方そのころ、タクミも、ひそかに悩んでいました。", scene("緊張して、\nうまく笑えなかった…", "やっぱり\n冷たい人なんだ…", lf="cry", rf="cry"))
say("「新人さんが来るから、やさしくしようと思ってたのに。緊張して、うまく笑えなかった」")
say("たった数秒の出会いで、2人の間には、大きなズレが生まれていたんです。")
say("こんな経験、あなたにもありませんか。最初は苦手だと思った人が、話してみたら、すごくいい人だった。")
say("この動画では、第一印象がどうやって作られ、どこまで信じていいのかを、5つの研究から解き明かします。",
    {"kind": "list", "title": "この動画で紹介する研究", "items": ["顔を見て0.1秒で、印象は決まる", "30秒の映像で、授業の評価が分かる？", "たった一言の紹介で、印象が変わる", "顔の印象で、選挙の結果が予想できた", "同じ人でも、写真がちがえば印象もちがう"]})
say("最後に、第一印象とうまく付き合う3つのルールもお話しします。")

# ───────── 第1章 ─────────
say("第1章。顔を見て0.1秒で、印象は決まる。", {"kind": "chapter", "no": 1, "title": "顔を見て0.1秒で\n印象は決まる"},
    speech="第一章。顔を見て、れいてんいちびょうで、印象は決まる。", chapter="第1章 0.1秒の第一印象")
tag("第1章 0.1秒の印象")
say("プリンストン大学のトドロフたちは、人が顔から印象を作るまでの時間を調べました。",
    {"kind": "paper", "authors": "Willis & Todorov", "year": "2006", "journal": "Psychological Science",
     "title": "First Impressions: Making Up Your Mind After a 100-ms Exposure to a Face", "points": ["知らない人の顔写真を、ほんの一瞬だけ見せる", "見せる時間を変えて、印象を比べた"]})
say("知らない人の顔写真を、ほんの一瞬だけ見せて、「この人は信頼できそうか」「感じがよさそうか」などを答えてもらいます。")
say("見せる時間は、0.1秒、0.5秒、1秒。", speech="見せる時間は、れいてんいちびょう、れいてんごびょう、いちびょう。")
say("そして、時間をかけてじっくり見たときの印象と、比べました。")
say("すると、たった0.1秒でも、じっくり見たときと、よく似た印象ができあがっていたんです。",
    {"kind": "stat", "value": 0.1, "unit": "秒", "label": "印象ができるまでの時間", "sub": "じっくり見たときの印象と、よく似ていた"},
    speech="すると、たった、れいてんいちびょうでも、じっくり見たときと、よく似た印象ができあがっていたんです。")
say("0.1秒は、まばたき1回より短いくらいの時間です。", speech="れいてんいちびょうは、まばたきいっかいより短いくらいの時間です。")
say("この実験では、5つの印象を調べました。魅力、好感、信頼、有能さ、そして攻撃的かどうか。",
    {"kind": "list", "title": "0.1秒で決まった5つの印象", "items": ["魅力的か", "感じがいいか", "信頼できそうか", "仕事ができそうか", "攻撃的そうか"]})
say("信頼できそうか、感じがいいか、仕事ができそうか。どの印象も、ほぼ一瞬で決まっていました。")
say("では、時間をかけると、何が変わったのでしょう。")
say("見る時間を長くしても、印象の中身は、ほとんど変わりませんでした。")
say("変わったのは、「自分の判断は正しい」という自信のほうでした。",
    {"kind": "versus", "left": {"title": "見る時間を長くすると", "body": "印象の中身は\nほとんど変わらない"}, "right": {"title": "でも", "body": "「自分は正しい」という\n自信だけが強くなる"}})
say("つまり私たちは、一瞬で決めた印象を、あとから「やっぱりそうだ」と、確信に変えているのかもしれません。")
say("ちなみに、見る時間が長くなると、印象はより細かく、いろいろな面を区別したものになっていったそうです。")
say("人の印象を豊かにしてくれるのは、やっぱり、ある程度の時間なんですね。")
say("ハナが「怖そう」と感じたのも、タクミの顔を見た、ほんの一瞬だったはずです。", scene(None, "（怖そう…）", lf="think", rf="shock"))

# ───────── 第2章 ─────────
say("第2章。30秒の映像で、授業の評価が分かる？", {"kind": "chapter", "no": 2, "title": "30秒の映像で\n評価が分かる？"},
    speech="第二章。さんじゅうびょうの映像で、授業の評価が分かる？", chapter="第2章 30秒の映像")
tag("第2章 うすい切り取り")
say("顔写真だけでなく、動いている姿でも、同じようなことが起きます。",
    {"kind": "paper", "authors": "Ambady & Rosenthal", "year": "1993", "journal": "Journal of Personality and Social Psychology",
     "title": "Half a Minute: Predicting Teacher Evaluations from Thin Slices of Nonverbal Behavior", "points": ["大学の先生13人の授業を、音なしの短い映像にした", "見た人の印象と、学期末の学生の評価を比べた"]})
say("ハーバード大学のアンバディたちは、大学の先生13人の授業を撮影しました。")
say("そこから、音を消した10秒の映像を3本ずつ、つまり先生1人あたり30秒だけ、取り出します。", speech="そこから、音を消した、じゅうびょうの映像を3本ずつ、つまり先生ひとりあたり、さんじゅうびょうだけ、取り出します。")
say("その映像を、先生のことをまったく知らない人たちに見てもらい、印象を答えてもらいました。")
say("そして、その印象を、学期の終わりに受講生がつけた「先生の評価」と比べたんです。")
say("すると、音なしの30秒を見ただけの印象が、1学期間授業を受けた学生の評価と、強く一致していました。",
    {"kind": "versus", "left": {"title": "知らない人が", "body": "音なしの映像を\n30秒見ただけの印象"}, "right": {"title": "受講生が", "body": "1学期間、授業を受けた\nあとの評価"}})
say("さらに別の実験では、もっと短い、数秒の映像でも、似た結果が出ました。")
say("このように、ほんの短い行動から人を判断することを、「うすい切り取り」と呼びます。",
    {"kind": "concept", "term": "うすい切り取り", "en": "Thin Slices",
     "desc": "数秒〜数十秒の短い行動の切り取りから、\nその人の印象を作ること"})
say("表情、身ぶり、姿勢。私たちは、言葉より先に、こうしたサインをすばやく読み取っています。")
say("おもしろいことに、笑った回数や身ぶりの数など、細かい動きを数えたものより、全体の雰囲気の印象のほうが、評価とよく一致していました。",
    {"kind": "versus", "left": {"title": "細かい動きを数える", "body": "笑った回数・身ぶりの数\n→ あまり一致しない"}, "right": {"title": "全体の雰囲気", "body": "自信がありそう・あたたかい\n→ よく一致した"}})
say("先生の見た目の魅力を差し引いても、この結果は、ほとんど変わらなかったそうです。")
say("面接で「入ってきた瞬間に決まる」と言われるのも、この研究とよく似た話です。")
say("ただし、ここで大切なのは、「一致した」ことと「正しい」ことは、ちがうということです。",
    {"kind": "versus", "left": {"title": "一致した", "body": "見知らぬ人の印象と\n受講生の評価が似ていた"}, "right": {"title": "正しいとは限らない", "body": "どちらも「雰囲気」に\n引っぱられたのかも"}})
say("受講生の評価も、先生の雰囲気に、引っぱられていたのかもしれません。")
say("最初の授業で「いい先生だ」と感じたら、そのあとの授業も、いいところが目につきやすくなりますよね。")
say("第一印象が強いのは、それが当たっているからだけではなく、その後の見方まで変えてしまうから、とも考えられます。")

# ───────── 第3章 ─────────
say("第3章。たった一言の紹介で、印象が変わる。", {"kind": "chapter", "no": 3, "title": "たった一言の紹介で\n印象が変わる"},
    speech="第三章。たった一言の紹介で、印象が変わる。", chapter="第3章 一言の紹介")
tag("第3章 あたたかい・つめたい")
say("第一印象は、会う前から作られることもあります。",
    {"kind": "paper", "authors": "Kelley", "year": "1950", "journal": "Journal of Personality",
     "title": "The Warm-Cold Variable in First Impressions of Persons", "points": ["授業に来る「代わりの先生」の紹介文を、学生に配る", "紹介文の一語だけを変えて比べた"]})
say("アメリカの大学で、ある授業に、代わりの先生がやってくることになりました。")
say("授業の前に、学生たちに、その先生の紹介文が配られます。")
say("ただし紹介文は2種類あって、ちがうのはたった一語。「とてもあたたかい人」か、「ややつめたい人」か、だけでした。",
    {"kind": "versus", "left": {"title": "紹介文 A", "body": "…勤勉で、\n「とてもあたたかい」人"}, "right": {"title": "紹介文 B", "body": "…勤勉で、\n「ややつめたい」人"}})
say("同じ先生が、同じ授業をしたのに、「あたたかい」と紹介された学生のほうが、先生を好意的に評価しました。")
say("さらに、「あたたかい」と聞いた学生のほうが、授業の話し合いに、積極的に参加していたそうです。")
say("たった一語の前情報が、見え方も、関わり方も変えてしまったんです。",
    {"kind": "concept", "term": "前情報のレンズ", "en": "Warm-Cold Effect",
     "desc": "会う前に聞いた一言が、\nその人の見え方を左右すること"})
say("ハナが聞いた「ちょっと冷たい感じでしょ」も、まさにこの一言でした。", scene(None, "冷たい人って\n聞いたし…", lf="think", rf="think"))
say("一度「冷たい人」と聞くと、話しかけるのをためらってしまう。話しかけないから、相手のあたたかい面を知る機会もなくなる。")
say("前情報は、こうして、本当の姿を見る前に、扉を閉じてしまうことがあるんです。")
say("でも、うれしい続きの研究もあります。",
    {"kind": "paper", "authors": "Babad, Kaplowitz & Darley", "year": "1999", "journal": "Social Psychology of Education",
     "title": "A \"Classic\" Revisited: Students' Immediate and Delayed Evaluations of a Warm/Cold Instructor", "points": ["同じような実験を、大学の授業でくり返した", "授業を受けたあと、学期末にも評価してもらった"]})
say("イスラエルの研究チームが、同じような実験をして、そのあとも学生の評価を追いかけました。")
say("すると、会う前は「あたたかい」「つめたい」で大きな差があったのに、30分の授業を受けると、その差の多くが消えていました。")
say("そして学期末には、差は、ほとんどなくなっていたんです。",
    {"kind": "list", "title": "印象の差は、どう変わった？", "items": ["会う前：「あたたかい・つめたい」で大きな差", "30分の授業のあと：差の多くが消えた", "学期末：差はほとんどなくなった"]})
say("実際に関わる時間が増えれば、第一印象は、ちゃんと上書きされていくんですね。")
say("この研究では、「人は変われる」と考えている学生ほど、最初の印象を柔軟に見直していたことも分かりました。")

# ───────── 第4章 ─────────
say("第4章。顔の印象で、選挙の結果が予想できた。", {"kind": "chapter", "no": 4, "title": "顔の印象で\n選挙の結果が予想できた"},
    speech="第四章。顔の印象で、選挙の結果が予想できた。", chapter="第4章 顔と選挙")
tag("第4章 顔と選挙")
say("第一印象の力が、どれほど大きいかを示した研究があります。",
    {"kind": "paper", "authors": "Todorov, Mandisodza, Goren & Hall", "year": "2005", "journal": "Science",
     "title": "Inferences of Competence from Faces Predict Election Outcomes", "points": ["アメリカの議員選挙の候補者2人の顔写真を見せる", "「どちらが有能そうか」を、一瞬で選んでもらう"]})
say("アメリカの議員選挙で戦った、2人の候補者の顔写真を並べて見せます。")
say("見る人は、候補者のことを何も知りません。顔を1秒ほど見て、「どちらが仕事ができそうか」を選ぶだけです。", speech="見る人は、候補者のことを何も知りません。顔を、いちびょうほど見て、どちらが仕事ができそうかを選ぶだけです。")
say("すると、「仕事ができそう」と選ばれた候補者が、実際の選挙でも勝っていることが多かったんです。")
say("2004年の上院選挙では、およそ7割の選挙で、結果が当たっていました。",
    {"kind": "stat", "value": 68.8, "unit": "%", "label": "顔の印象で当たった上院選挙の割合", "sub": "2004年 アメリカ上院選挙（Todorov ほか, 2005）"},
    speech="にせんよねんの上院選挙では、およそ7割、ろくじゅうはってんはちパーセントの選挙で、結果が当たっていました。")
say("政策や実績で選んでいるつもりでも、一瞬の顔の印象が、投票に影響しているのかもしれない、というわけです。")
say("しかも、「仕事ができそう」と感じた差が大きい候補者ほど、大きな差で勝っている傾向もありました。")
say("この結果は、「仕事ができそうか」という印象で特に強く、ほかの印象では、それほどではなかったそうです。")
say("これは、選挙だけの話ではありません。")
say("アルバイトの面接、マッチングアプリのプロフィール写真、新しいクラスの自己紹介。",
    {"kind": "list", "title": "第一印象がはたらく場面", "items": ["アルバイトや就職の面接", "マッチングアプリのプロフィール写真", "新しいクラス・職場での自己紹介", "お店の店員さんへの印象"]})
say("私たちは毎日、知らないうちに、一瞬の印象で、人を選んだり、選ばれたりしています。")
say("でも、「仕事ができそうな顔」の人が、本当に仕事ができるとは限りません。")
say("では、その顔の印象は、そもそも、どこまで信用できるのでしょうか。")

# ───────── 第5章 ─────────
say("第5章。同じ人でも、写真がちがえば印象もちがう。", {"kind": "chapter", "no": 5, "title": "同じ人でも\n写真で印象が変わる"},
    speech="第五章。同じ人でも、写真がちがえば、印象もちがう。", chapter="第5章 写真で変わる印象")
tag("第5章 写真と印象")
say("その答えに近づく研究が、2014年に発表されました。",
    {"kind": "paper", "authors": "Todorov & Porter", "year": "2014", "journal": "Psychological Science",
     "title": "Misleading First Impressions: Different for Different Facial Images of the Same Person", "points": ["同じ人の、ちがう写真を何枚も見せる", "写真によって、印象がどれくらい変わるかを調べた"]},
    speech="その答えに近づく研究が、にせんじゅうよねんに発表されました。")
say("同じ人の、ちがう写真を何枚も用意して、それぞれの印象を答えてもらいます。")
say("すると、同じ人なのに、写真によって、印象が大きく変わることが分かりました。")
say("その変わり方は、「別の人どうしの差」と同じくらいか、それ以上だったんです。",
    {"kind": "versus", "left": {"title": "同じ人の、ちがう写真", "body": "印象が\n大きく変わる"}, "right": {"title": "別の人どうし", "body": "印象の差は\n同じくらい"}})
say("さらに、見る人は、目的に合わせて、ちがう写真を選びました。")
say("マッチングアプリ用ならこの写真、選挙のポスター用ならこの写真、というように、です。")
say("しかも、こうした差は、ほんの一瞬、写真を見せただけでも、はっきり出ていました。")
say("つまり、一瞬の第一印象は、その人そのものではなく、「その瞬間の顔」への印象なんです。",
    {"kind": "concept", "term": "「その瞬間」の印象", "en": "Misleading First Impressions",
     "desc": "同じ人でも、表情や角度、光で\n印象は大きく変わる"})
say("証明写真の自分と、友だちが撮ってくれた笑顔の自分。まるで別人に見えること、ありますよね。")
say("寝不足の朝、緊張した面接、カメラの角度。たまたまの条件で、人の顔の印象は、驚くほど変わってしまいます。")
say("顔の印象の研究の多くは、1人につき1枚の写真しか使っていませんでした。この研究は、その前提に疑問を投げかけたんです。")
say("タクミの「怖そうな顔」も、初日の緊張した一瞬を、切り取っただけだったのかもしれません。", scene("（緊張する…）", None, ["left"], lf="think"))
say("ここまでの研究を、まとめてみましょう。",
    {"kind": "list", "title": "第一印象について分かったこと", "items": ["顔を見て0.1秒で、印象はできる", "30秒の映像の印象が、長い評価と一致する", "会う前の一言で、見え方が変わる", "顔の印象が、選挙の結果にまで関わる", "でも、それは「その瞬間」の印象にすぎない"]})

# ───────── 第6章 ─────────
say("第6章。第一印象と付き合う、3つのルール。", {"kind": "chapter", "no": 6, "title": "第一印象と付き合う\n3つのルール"},
    speech="第六章。第一印象と付き合う、3つのルール。", chapter="第6章 3つのルール")
tag("第6章 3つのルール")
say("ルール1。相手への第一印象は、「仮の答え」にしておく。",
    {"kind": "rule", "no": 1, "title": "相手への第一印象は\n「仮の答え」にする", "body": "時間をかけても自信が増えるだけ。だから、あえて保留する"},
    speech="ルールいち。相手への第一印象は、仮の答えにしておく。")
say("0.1秒の研究では、時間をかけても、印象は変わらず、自信だけが強くなっていました。", speech="れいてんいちびょうの研究では、時間をかけても、印象は変わらず、自信だけが強くなっていました。")
say("だからこそ、「この人はこういう人だ」と感じたら、心の中で「たぶん」をつけてみてください。")
say("「たぶん怖い人」なら、次に会ったとき、ちがう面を見つけられるかもしれません。")
say("会話をして、一緒に仕事をして、少しずつ印象をアップデートしていけばいいんです。")
say("ルール2。人を紹介するときの一言を、大切にする。",
    {"kind": "rule", "no": 2, "title": "人を紹介する一言を\n大切にする", "body": "「ちょっと冷たい人」より「仕事がていねいな人」"},
    speech="ルールに。人を紹介するときの一言を、大切にする。")
say("「あたたかい」か「つめたい」か、たった一語で、印象も、関わり方も変わりました。")
say("新しい人に誰かを紹介するときは、その人のいいところを、ひとつ添えてあげましょう。")
say("その一言が、2人の関係のスタートを、ずっと楽にしてくれます。")
say("ルール3。自分の第一印象に、悩みすぎない。",
    {"kind": "rule", "no": 3, "title": "自分の第一印象に\n悩みすぎない", "body": "第一印象は「その瞬間」の1枚。2回目で上書きできる"},
    speech="ルールさん。自分の第一印象に、悩みすぎない。")
say("第一印象は、その日、その瞬間の、写真1枚のようなものです。")
say("授業の実験でも、関わる時間が増えるほど、最初の印象の差は消えていきました。")
say("初日に失敗しても、2回目、3回目で、ちゃんと上書きできるんです。")
say("それに、相手も、あなたの「その瞬間」しか見ていません。次に会うときに、いつものあなたを見せれば大丈夫です。")
say("ひとつだけ注意です。第一印象をよくしようとして、無理に自分を作りすぎると、続かなくなってしまいます。")
say("あいさつと笑顔くらいで十分。あとは、時間が味方してくれます。")

# ───────── まとめ ─────────
say("まとめ。", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "第一印象は、最初の1ページにすぎない"}, chapter="まとめ")
tag("まとめ")
say("入社して1週間。ハナは、仕事でミスをして、締め切りに間に合わなくなりそうになりました。", scene(None, "どうしよう…\n間に合わない", place="1週間後のオフィス", lf="smile", rf="cry"))
say("そのとき、だまって隣から資料を半分引き受けてくれたのが、タクミでした。", scene("半分やるよ。\n一緒にやろう", "どうしよう…\n間に合わない", lf="smile", rf="shock", place="1週間後のオフィス"))
say("「最初は、緊張してて、ちゃんとあいさつできなくてごめんね」")
say("ハナは、思わず笑ってしまいました。「わたし、怖い人だと思ってました」", scene("最初、緊張してて\nごめんね", "怖い人だと\n思ってました！", lf="tehe", rf="laugh", place="1週間後のオフィス"))
say("0.1秒で生まれた印象は、1週間で、まったくちがうものに変わったんです。", speech="れいてんいちびょうで生まれた印象は、1週間で、まったくちがうものに変わったんです。")
say("第一印象は、本でいえば、最初の1ページにすぎません。")
say("その人の本当の姿は、ページをめくった先に、ちゃんと書いてあります。")
say("この動画が参考になったら、高評価とチャンネル登録をお願いします。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["最後まで見てくれて", "ありがとう"], "sub": "あなたの「第一印象が変わった体験」、コメントで教えてください"})
say("第一印象が、がらりと変わった体験はありますか？　ぜひコメントで教えてください。")

# 使っている表情だけを素材に入れる（いらすとやは1作品20点まで）
_used = {p[side]["emoji"] for x in S if x["visual"]["kind"] == "scene" for p in [x["visual"]] for side in ("left", "right")}
ILLS = {face(who, f): f"https://blogger.googleusercontent.com/img/b/R29vZ2xl/{key}" for (who, f), key in IRA_URLS.items() if face(who, f) in _used}
assert _used <= set(ILLS), _used - set(ILLS)
assert len(ILLS) <= 20

episode = {
    "id": "paper-impression-long",
    "title": "第一印象は0.1秒で決まる？ でも信じすぎてはいけない理由【論文で読み解く心理学】",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "paper",
    "background": "#0b1222",
    "slideGap": 10,
    "bgmVolume": 0.07,
    "voice": {"speaker": 13, "speed": 1.2, "name": "青山龍星"},
    "bgm": {"file": "opening_of_a_book.mp3", "title": "the opening of a book", "credit": "ioni", "page": "https://opentracks.com/bgm/detail/2859", "opentracks": 2859, "track": 1},
    "illustrations": {k: {"emoji": "🙂", "irasutoya": "いろいろな表情のスーツを着た人のイラスト", "url": u, "credit": "いらすとや"} for k, u in ILLS.items()},
    "description": "第一印象は、顔を見てたった0.1秒で決まる。でも、その印象はどこまで信じていいのか。「はじめまして」の心理を、5つの研究から読み解きます。\n台本・例え話はオリジナルです。研究の内容は、論文の要旨や本文で確認できた範囲で紹介しています。\n\n▼ 紹介した研究\n・Willis & Todorov (2006) First Impressions: Making Up Your Mind After a 100-ms Exposure to a Face. Psychological Science, 17(7), 592-598.\n・Ambady & Rosenthal (1993) Half a Minute: Predicting Teacher Evaluations from Thin Slices of Nonverbal Behavior and Physical Attractiveness. Journal of Personality and Social Psychology, 64(3), 431-441.\n・Kelley (1950) The Warm-Cold Variable in First Impressions of Persons. Journal of Personality, 18(4), 431-439.\n・Babad, Kaplowitz & Darley (1999) A \"Classic\" Revisited: Students' Immediate and Delayed Evaluations of a Warm/Cold Instructor. Social Psychology of Education, 3, 81-102.\n・Todorov, Mandisodza, Goren & Hall (2005) Inferences of Competence from Faces Predict Election Outcomes. Science, 308, 1623-1626.\n・Todorov & Porter (2014) Misleading First Impressions: Different for Different Facial Images of the Same Person. Psychological Science, 25(7), 1404-1417.",
    "hashtags": ["心理学", "第一印象", "論文", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "paper-impression-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
