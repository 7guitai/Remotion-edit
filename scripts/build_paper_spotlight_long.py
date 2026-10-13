"""「人は、あなたが思うほどあなたを見ていない（スポットライト効果）」（論文で読み解く心理学・ロング）の台本から
src/episodes/paper-spotlight-long.json を作る。台本・例え話はこのチャンネルのオリジナル。
研究の内容は、論文の要旨（PubMed）・論文の本文などで確かめた範囲で紹介する。
使い方: python3 scripts/build_paper_spotlight_long.py
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
    "寝ぐせ": "ねぐせ",
    "4人に1人": "よにんにひとり",
    "1回": "いっかい",
    "一言": "ひとこと",
    "見積もり": "みつもり",
    "口ごもった": "くちごもった",
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


def scene(left_thought=None, right_thought=None, show=None, place="朝の会議室", lf="smile", rf="smile"):
    return {
        "kind": "scene",
        "place": place,
        "left": {"emoji": face("man", lf), "name": "ソウタ", "thought": left_thought, "color": BLUE},
        "right": {"emoji": face("woman", rf), "name": "アカリ", "thought": right_thought, "color": PINK},
        **({"show": show} if show else {}),
    }


# ───────── オープニング ─────────
say("あの失敗、みんなに見られていた気がする。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["人は、あなたが思うほど", "あなたを見ていない"], "sub": "5つの研究で読み解く「気にしすぎ」の正体"},
    chapter="オープニング")
say("その「見られている感じ」には、ちゃんと名前のついた心のクセがあります。")
tag("オープニング")
say("入社2年目のソウタと、同じチームのアカリ。", scene(), speech="入社にねんめのソウタと、同じチームのアカリ。")
say("月曜の朝、ソウタは寝坊して、寝ぐせのまま会議に飛びこみました。", scene(None, None, ["left"], lf="shock"))
say("しかも、売上の報告で数字を言いまちがえ、口ごもってしまいます。")
say("ソウタは思います。「最悪だ。みんな絶対、変に思った」", scene("寝ぐせも見られた…\n数字もまちがえた…", None, ["left"], lf="cry"))
say("席にもどってからも、あの数秒が、何度も頭の中で再生されます。")
say("同じ会議で、アカリも考えごとをしていました。", scene("寝ぐせも見られた…\n数字もまちがえた…", "資料の誤字、\nバレてないかな…", lf="cry", rf="think"))
say("「私の資料、1か所まちがえてた。気づかれたかな」", speech="私の資料、いっかしょまちがえてた。気づかれたかな")
say("2人とも、自分の小さな失敗に、強いライトが当たっているように感じています。")
say("でも実は、2人とも、相手の失敗にはほとんど気づいていません。")
say("この動画では、なぜ私たちが「見られすぎ」と感じるのかを、5つの研究から解き明かします。",
    {"kind": "list", "title": "この動画で紹介する研究", "items": ["目立つTシャツは、どれくらい覚えられていた？", "会議の発言も、毎日の見た目も、思うほど目立たない", "緊張やウソは、顔に出ているほどバレていない", "失敗しても、思うほど厳しく見られない", "「見えていない」と知るだけで、話がうまくなる"]})
say("最後に、気にしすぎをほどく3つのルールもお話しします。")

# ───────── 第1章 ─────────
say("第1章。目立つTシャツは、覚えられていたか。", {"kind": "chapter", "no": 1, "title": "目立つTシャツは\n覚えられていたか"},
    speech="第一章。目立つTシャツは、覚えられていたか。", chapter="第1章 目立つTシャツの実験")
tag("第1章 スポットライト効果")
say("アメリカのコーネル大学で、ちょっと変わった実験が行われました。",
    {"kind": "paper", "authors": "Gilovich, Medvec & Savitsky", "year": "2000", "journal": "Journal of Personality and Social Psychology",
     "title": "The Spotlight Effect in Social Judgment", "points": ["学生に、ちょっと恥ずかしい絵柄のTシャツを着てもらう", "そのまま、ほかの学生がいる部屋に少しだけ入る"]})
say("学生に、当時の大学生から見て「ちょっとダサい」歌手の顔が大きくプリントされたTシャツを着てもらいます。")
say("そして、ほかの学生たちがアンケートを書いている部屋に、少しだけ入ってもらいました。")
say("部屋を出たあと、Tシャツを着た本人に聞きます。「何人くらいが、このTシャツの絵柄に気づいたと思う？」")
say("本人たちの予想は、部屋にいた人の、およそ半分でした。",
    {"kind": "bars", "title": "Tシャツの絵柄に 気づいた人の割合", "rows": [{"label": "本人の予想", "value": 46, "color": PINK}, {"label": "実際に気づいた人", "value": 23, "color": BLUE}],
     "max": 60, "note": "出典：Gilovich ほか（2000）研究1の結果を紹介した解説より（約）"})
say("ところが、実際に絵柄を言い当てられたのは、4人に1人ほど。")
say("本人は、見られている割合を、およそ2倍に見積もっていたんです。")
say("この思い込みは、スポットライト効果と名づけられました。", {"kind": "concept", "term": "スポットライト効果", "en": "The Spotlight Effect",
                                                "desc": "自分の見た目や行動が、\n実際よりも他人に注目されていると思い込むこと"})
say("まるで舞台の上で、自分だけにライトが当たっているように感じる、という意味です。")
say("面白いのは、恥ずかしいTシャツだけではなかったことです。")
say("本人が「着ていて誇らしい」と思う人物のTシャツでも、やはり気づかれ方を多く見積もっていました。")
say("つまり、恥ずかしいときも、ほめられたいときも、私たちは「見られている」と感じすぎるんです。")
say("なぜ、こんなに見積もりがずれるのでしょうか。")
say("研究チームは、私たちが「自分の感じ方」を基準にしてしまうからだと考えました。",
    {"kind": "concept", "term": "自分の感覚がものさし", "desc": "自分にとって大きなことを出発点にして、\n相手の目線へ調整しきれない"})
say("自分にとって、あのTシャツはとても目立つ。その強い感覚を出発点にして、「相手から見たら」と考え直します。")
say("でも、その考え直しが、どうしても足りない。だから、見積もりが大きいまま残ってしまうんです。")
say("前髪を切りすぎた日。シャツに小さなシミがある日。マスクのあとが顔に残っている日。",
    {"kind": "list", "title": "「見られてる」と感じやすい場面", "items": ["前髪を切りすぎた日", "シャツに小さなシミがある日", "電車で、お腹が鳴ったとき", "新しい服をおろした日"]})
say("そんな日は、すれちがう人みんなに見られている気がしますよね。")
say("でも、実験の結果から考えると、気づいている人は、思っているよりずっと少ないんです。")
say("ソウタの寝ぐせも、会議の参加者の多くは、たぶん覚えていません。", scene("（みんな寝ぐせ見てた…）", "（今日のお昼、何にしよう）", lf="cry", rf="think"))

# ───────── 第2章 ─────────
say("第2章。会議の発言も、毎日の見た目も、思うほど目立たない。", {"kind": "chapter", "no": 2, "title": "発言も見た目も\n思うほど目立たない"},
    speech="第二章。会議の発言も、毎日の見た目も、思うほど目立たない。", chapter="第2章 発言も見た目も目立たない")
tag("第2章 他人は自分で忙しい")
say("同じ論文には、話し合いの実験ものっています。")
say("数人のグループで話し合ったあと、自分の発言がどれくらい印象に残ったかを予想してもらいました。")
say("すると、うまく言えた発言も、言いまちがえた発言も、本人が思うほどは目立っていませんでした。",
    {"kind": "versus", "left": {"title": "本人の感覚", "body": "あの一言、変だった…\nみんな覚えてるはず"}, "right": {"title": "ほかの参加者", "body": "そんなこと言ってた？\n（よく覚えていない）"}})
say("会議で口ごもった一言を、帰り道まで気にしてしまうこと、ありますよね。")
say("でも、ほかの人にとっては、たくさんの発言のうちの、ひとつにすぎません。")
say("さらに2002年、同じ研究者たちは、毎日の「調子の波」についても調べました。",
    {"kind": "paper", "authors": "Gilovich, Kruger & Medvec", "year": "2002", "journal": "Journal of Experimental Social Psychology",
     "title": "The Spotlight Effect Revisited", "points": ["見た目の「いい日・悪い日」は、周りに気づかれているか", "スポーツやゲームの出来の波でも調べた"]})
say("今日は髪型が決まらない。昨日より顔がむくんでいる。")
say("自分では、日によって見た目が大きくちがうように感じます。")
say("でも研究では、その「日による差」を、周りの人は本人が思うほど見分けていませんでした。")
say("スポーツやテレビゲームの出来の波でも、同じ傾向が見られました。")
say("では、なぜ周りの人は、そんなに気づかないのでしょう。")
say("答えのひとつは、周りの人も、自分のことで手いっぱいだからです。",
    {"kind": "concept", "term": "みんな自分で手いっぱい", "desc": "ほかの人も、自分の発言・見た目・次にすることで\n頭がいっぱい。あなたを見ている余裕は少ない"})
say("ゲームの研究でも、見ている側が自分のプレイに集中していると、相手の出来には気づきにくいことが示されました。")
say("会議中のアカリも、自分の資料の誤字のことで、頭がいっぱいでした。", scene("（言いまちがえた…）", "（誤字、バレたかな…）", lf="cry", rf="shock"))
say("みんながそれぞれ、自分にライトを当てている。だから、他人のライトまでは見ていないんです。")

# ───────── 第3章 ─────────
say("第3章。緊張もウソも、顔に出ているほどバレていない。", {"kind": "chapter", "no": 3, "title": "緊張もウソも\n思うほどバレていない"},
    speech="第三章。緊張もウソも、顔に出ているほどバレていない。", chapter="第3章 透明性の錯覚")
tag("第3章 透明性の錯覚")
say("見た目だけでなく、心の中についても、同じようなクセがあります。",
    {"kind": "paper", "authors": "Gilovich, Savitsky & Medvec", "year": "1998", "journal": "Journal of Personality and Social Psychology",
     "title": "The Illusion of Transparency", "points": ["5人でウソ当てゲーム。毎回1人だけがウソをつく", "ウソをついた人に「何人に見抜かれたと思う？」と聞いた"]})
say("5人のグループで、順番に、自分についての短い話をします。")
say("ただし、毎回1人だけが、こっそりウソをつきます。", speech="ただし、毎回ひとりだけが、こっそりウソをつきます。")
say("ウソをついた人は、ほかの4人のうち、何人に見抜かれたと思ったでしょうか。")
say("本人たちの予想は、平均で48.8%。およそ半分の人に見抜かれた、と感じていました。",
    {"kind": "bars", "title": "ウソを 見抜かれた割合", "rows": [{"label": "ウソをついた本人の予想", "value": 48.8, "color": PINK}, {"label": "実際に見抜いた人", "value": 25.6, "color": BLUE}],
     "max": 60, "note": "出典：Gilovich, Savitsky & Medvec（1998）研究1"},
    speech="本人たちの予想は、平均で、よんじゅうはってんはちパーセント。およそ半分の人に見抜かれた、と感じていました。")
say("でも、実際に見抜いた人は25.6%。", speech="でも、実際に見抜いた人は、にじゅうごてんろくパーセント。")
say("4人から適当に1人を選んでも当たるのは25%なので、ほとんど当てずっぽうと同じでした。")
say("自分の気持ちが、ガラスのように外から透けて見えている、と思い込むクセ。")
say("これを、透明性の錯覚といいます。", {"kind": "concept", "term": "透明性の錯覚", "en": "The Illusion of Transparency",
                                 "desc": "自分の緊張や気持ちが、\n実際よりも相手に伝わっていると思い込むこと"},
    speech="これを、とうめいせいのさっかくといいます。")
say("同じ論文では、まずい飲み物を、顔に出さずに飲んでもらう実験もありました。")
say("飲んだ本人は「顔に出ていた」と思っていましたが、見ていた人は、本人が思うほどは気づいていませんでした。")
say("友だちの手料理が口に合わなかったとき、「バレたかも」とドキッとしたこと、ありませんか。")
say("面接で手がふるえたとき、プレゼンで声がうわずったとき。")
say("自分の中では、ドキドキが大きく鳴りひびいています。")
say("でも、そのドキドキの音は、外にはほとんど聞こえていないんです。")
say("自分の気持ちは内側からよく分かるので、相手にも分かっているはずだと考えてしまう。それが、このクセの正体です。")

# ───────── 第4章 ─────────
say("第4章。失敗しても、思うほど厳しく見られない。", {"kind": "chapter", "no": 4, "title": "失敗しても\n思うほど厳しく見られない"},
    speech="第四章。失敗しても、思うほど厳しく見られない。", chapter="第4章 失敗の見られ方")
tag("第4章 失敗への評価")
say("では、気づかれてしまった失敗は、どう見られているのでしょう。",
    {"kind": "paper", "authors": "Savitsky, Epley & Gilovich", "year": "2001", "journal": "Journal of Personality and Social Psychology",
     "title": "Do Others Judge Us as Harshly as We Think?", "points": ["気まずい失敗や、人前での失敗のあと", "「どれくらい悪く思われたか」の予想と実際を比べた"]})
say("この研究では、4つの実験で、恥ずかしい失敗をしたあとの「見られ方」を調べました。")
say("気まずい失敗を想像してもらったり、人前で問題が解けない経験をしてもらったりしたんです。")
say("すると、失敗した本人は、実際よりも厳しく評価されると予想していました。",
    {"kind": "versus", "left": {"title": "失敗した本人", "body": "頭が悪いと思われた…\nもう信用されない"}, "right": {"title": "見ていた人", "body": "まあ、そういうこともある\n（評価はほとんど変わらない）"}})
say("見ていた人の評価は、本人が心配するほど、下がっていなかったんです。")
say("なぜ、こんなズレが生まれるのでしょうか。")
say("失敗した本人は、その失敗の一瞬に、ずっと注目しています。")
say("でも見ている側は、「今日は難しい問題だった」「緊張する場面だった」と、まわりの事情もいっしょに見ています。",
    {"kind": "list", "title": "見ている人が考えていること", "items": ["その場の状況（難しさ・時間のなさ）", "その人の、ふだんの姿", "「自分も同じ失敗をするかも」という気持ち"]})
say("それに、その人のふだんの姿も知っています。1回の失敗だけで、全部を決めつけたりはしません。")
say("あなたも、友だちがカフェで飲み物をこぼしたとき、その人を嫌いになったりはしませんよね。")
say("たぶん「大丈夫？」と思って、次の日には忘れているはずです。")
say("LINEの送り先をまちがえたときも、送った本人ほど、相手は気にしていないことが多いものです。")
say("自分の失敗だけ、急に厳しい目で見てしまう。それが、私たちのクセなんです。")
say("ソウタの数字の言いまちがいも、きっと「月曜の朝だし、そういうこともある」くらいに受け取られています。", scene("（信用なくしたかも…）", "（月曜の朝だもんね）", lf="cry", rf="smile"))

# ───────── 第5章 ─────────
say("第5章。「見えていない」と知るだけで、話がうまくなる。", {"kind": "chapter", "no": 5, "title": "「見えていない」と\n知るだけで変わる"},
    speech="第五章。見えていない、と知るだけで、話がうまくなる。", chapter="第5章 知るだけで変わる")
tag("第5章 スピーチの実験")
say("このクセを知ると、何か変わるのでしょうか。それを確かめた研究があります。",
    {"kind": "paper", "authors": "Savitsky & Gilovich", "year": "2003", "journal": "Journal of Experimental Social Psychology",
     "title": "The Illusion of Transparency and the Alleviation of Speech Anxiety", "points": ["人前で短いスピーチをしてもらう", "話す前に伝える内容を、3つのグループで変えた"]})
say("学生に、短い準備時間で、人前でスピーチをしてもらいます。")
say("話す前に伝える内容を、3つのグループで変えました。",
    {"kind": "list", "title": "話す前に伝えたこと", "items": ["何も伝えない", "「緊張するのはふつうだから、気にしないで」", "「緊張は、思っているほど外から見えない」と、透明性の錯覚を説明する"]})
say("1つめは、何も伝えないグループ。")
say("2つめは、「緊張してもふつうだよ」と、はげますだけのグループ。")
say("3つめは、「緊張は、自分が思うほど外からは見えない」と、透明性の錯覚を説明したグループです。")
say("すると、3つめのグループは、自分のスピーチをより高く評価し、落ち着いていたと答えました。")
say("さらに、聞いていた人からも、話の出来や落ち着きを、高く評価されたそうです。")
say("ただ「大丈夫」と言われるより、「緊張は見えていない」という事実を知るほうが、効いたのかもしれません。")
say("「緊張がバレたらどうしよう」と思うと、その不安で、さらに緊張してしまいます。")
say("でも、「どうせ外からはあまり見えない」と分かれば、その悪循環を止められます。")
say("ソウタは明日、取引先の前でプレゼンがあります。", scene("明日のプレゼン、\n緊張がバレたら…", None, ["left"], place="夜・ソウタの部屋", lf="shock"))
say("この研究を知っていれば、少しだけ、肩の力を抜けるかもしれません。", scene("緊張しても、\n思うほど見えてない", None, ["left"], place="夜・ソウタの部屋", lf="idea"))
say("ここまでの研究を、まとめてみましょう。",
    {"kind": "list", "title": "「見られすぎ」と感じる5つのクセ", "items": ["見た目は、実際の2倍ほど見られている気がする", "発言や調子の波も、思うほど目立たない", "緊張やウソは、思うほど透けて見えない", "失敗しても、思うほど厳しく見られない", "それを知るだけで、落ち着いて話せる"]})

# ───────── 第6章 ─────────
say("第6章。気にしすぎをほどく、3つのルール。", {"kind": "chapter", "no": 6, "title": "気にしすぎをほどく\n3つのルール"},
    speech="第六章。気にしすぎをほどく、3つのルール。", chapter="第6章 3つのルール")
tag("第6章 3つのルール")
say("ルール1。「昨日の、隣の人の服」を思い出してみる。",
    {"kind": "rule", "no": 1, "title": "「昨日の、隣の人の服」を\n思い出してみる", "body": "思い出せないなら、相手もあなたを覚えていない"},
    speech="ルールいち。昨日の、隣の人の服を、思い出してみる。")
say("昨日、隣の席の人が何を着ていたか、思い出せますか。")
say("ほとんどの人は、はっきりとは思い出せません。")
say("きのうの会議で、誰が何回かんだかも、きっと覚えていないはずです。")
say("あなたが覚えていないように、相手も、あなたの寝ぐせやシミを覚えていないんです。")
say("ルール2。失敗したら、「見ていた人の目」で、1回だけ見直す。",
    {"kind": "rule", "no": 2, "title": "「見ていた人の目」で\n1回だけ見直す", "body": "友だちが同じ失敗をしたら、自分はどう思う？"},
    speech="ルールに。失敗したら、見ていた人の目で、いっかいだけ見直す。")
say("頭の中で反省会が止まらないときは、立場を入れかえてみてください。")
say("友だちが同じ失敗をしたら、あなたはその人を、そんなに悪く思うでしょうか。")
say("たぶん「よくあることだよ」と言ってあげるはずです。その言葉を、自分にもかけてあげましょう。")
say("ルール3。緊張したら、「これは外からは見えていない」と心の中で言う。",
    {"kind": "rule", "no": 3, "title": "「これは外から\n見えていない」と唱える", "body": "ドキドキは、内側で鳴っているだけ"},
    speech="ルールさん。緊張したら、これは外からは見えていない、と心の中で言う。")
say("スピーチの実験のように、事実を知っているだけで、気持ちは落ち着きやすくなります。")
say("手がふるえても、声がうわずっても、聞いている人は、思うほど気づいていません。")
say("聞いている人の多くは、話の中身や、自分が次に何を言うかで、頭がいっぱいです。")
say("ひとつだけ注意です。見られていないからといって、何をしてもいい、という意味ではありません。")
say("大切なのは、小さな失敗を、必要以上に大きく抱えこまないことです。")

# ───────── まとめ ─────────
say("まとめ。", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "ライトを当てているのは、自分だけ"}, chapter="まとめ")
tag("まとめ")
say("お昼休み。ソウタは思いきって、アカリに言いました。", scene("さっきの会議、\n恥ずかしかったです", None, ["left"], place="昼休みの休憩スペース", lf="tehe"))
say("「さっきの会議、数字まちがえて、恥ずかしかったです」")
say("アカリは、きょとんとして答えます。「え、そうだった？　全然気づかなかった」", scene("さっきの会議、\n恥ずかしかったです", "え、そうだった？\n全然気づかなかった", place="昼休みの休憩スペース", lf="tehe", rf="question"))
say("「それより私、資料に誤字があって、ずっと気になってたんだよね」")
say("今度は、ソウタがきょとんとする番です。「え、どこですか？」", scene("え、どこですか？", "資料の誤字、\nずっと気になってて", place="昼休みの休憩スペース", lf="question", rf="tehe"))
say("2人は顔を見合わせて、笑い出しました。", scene("なんだ、お互いさまか", "みんな自分のことで\n精一杯なんだね", place="昼休みの休憩スペース", lf="laugh", rf="laugh"))
say("私たちはみんな、自分にだけ強いライトを当てて、舞台に立っているような気持ちでいます。")
say("でも客席にいる人たちも、実は、それぞれの舞台で、自分のことで精一杯なんです。")
say("次に「見られている」と感じたら、そのライトを、少しだけ弱めてみてください。")
say("この動画が参考になったら、高評価とチャンネル登録をお願いします。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["最後まで見てくれて", "ありがとう"], "sub": "あなたの「気にしすぎだった体験」、コメントで教えてください"})
say("あなたの「気にしすぎだった体験」も、ぜひコメントで教えてください。")

# 使っている表情だけを素材に入れる（いらすとやは1作品20点まで）
_used = {p[side]["emoji"] for x in S if x["visual"]["kind"] == "scene" for p in [x["visual"]] for side in ("left", "right")}
ILLS = {face(who, f): f"https://blogger.googleusercontent.com/img/b/R29vZ2xl/{key}" for (who, f), key in IRA_URLS.items() if face(who, f) in _used}
assert _used <= set(ILLS), _used - set(ILLS)
assert len(ILLS) <= 20

episode = {
    "id": "paper-spotlight-long",
    "title": "人は、あなたが思うほどあなたを見ていない｜スポットライト効果【論文で読み解く心理学】",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "paper",
    "background": "#0b1222",
    "slideGap": 10,
    "bgmVolume": 0.07,
    "voice": {"speaker": 13, "speed": 1.2, "name": "青山龍星"},
    "bgm": {"file": "jitaku_nite.mp3", "title": "自宅にて", "credit": "KK", "page": "https://opentracks.com/bgm/detail/4041", "opentracks": 4041, "track": 1},
    "illustrations": {k: {"emoji": "🙂", "irasutoya": "いろいろな表情のスーツを着た人のイラスト", "url": u, "credit": "いらすとや"} for k, u in ILLS.items()},
    "description": "寝ぐせ、言いまちがい、人前での緊張。「みんなに見られていた」と感じるあの感覚は、どこまで本当なのか。スポットライト効果・透明性の錯覚など、5つの心理学の研究から読み解きます。\n台本・例え話はオリジナルです。研究の内容は、論文の要旨や本文で確認できた範囲で紹介しています（Tシャツ実験の割合は、研究を紹介した解説で広く引用されている値です）。\n\n▼ 紹介した研究\n・Gilovich, Medvec & Savitsky (2000) The Spotlight Effect in Social Judgment. Journal of Personality and Social Psychology, 78(2), 211-222.\n・Gilovich, Kruger & Medvec (2002) The Spotlight Effect Revisited. Journal of Experimental Social Psychology.\n・Gilovich, Savitsky & Medvec (1998) The Illusion of Transparency. Journal of Personality and Social Psychology, 75(2), 332-346.\n・Savitsky, Epley & Gilovich (2001) Do Others Judge Us as Harshly as We Think? Journal of Personality and Social Psychology, 81(1), 44-56.\n・Savitsky & Gilovich (2003) The Illusion of Transparency and the Alleviation of Speech Anxiety. Journal of Experimental Social Psychology, 39, 618-625.",
    "hashtags": ["心理学", "スポットライト効果", "論文", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "paper-spotlight-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
