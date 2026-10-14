"""「既読スルーがこんなに気になる理由」（論文で読み解く心理学・ロング）の台本から
src/episodes/paper-kidoku-long.json を作る。台本・例え話はこのチャンネルのオリジナル。
研究の内容は、論文の要旨（PubMed）・論文の本文などで確かめた範囲で紹介する。
使い方: python3 scripts/build_paper_kidoku_long.py
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
    "1ドル": "いちドル",
    "その間": "そのあいだ",
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


def scene(left_thought=None, right_thought=None, show=None, place="日曜の午後", lf="smile", rf="smile"):
    return {
        "kind": "scene",
        "place": place,
        "left": {"emoji": face("man", lf), "name": "ユウキ", "thought": left_thought, "color": BLUE},
        "right": {"emoji": face("woman", rf), "name": "サキ", "thought": right_thought, "color": PINK},
        **({"show": show} if show else {}),
    }


# ───────── オープニング ─────────
say("「既読」がついたのに、返事が来ない。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["既読スルーが", "こんなに気になる理由"], "sub": "5つの研究で読み解く「返事待ち」の心理"},
    chapter="オープニング")
say("あのモヤモヤには、ちゃんと名前のついた心のしくみがあります。")
tag("オープニング")
say("大学のゼミで仲がよかった、ユウキとサキ。", scene(place="日曜の午後"))
say("卒業して半年。ユウキは思いきって、サキにLINEを送りました。", scene("久しぶり！\n今度ごはん行かない？", None, ["left"], place="日曜の午後", lf="smile"))
say("「久しぶり！　今度ごはん行かない？」")
say("数分後、メッセージの横に「既読」の文字がつきます。")
say("ところが、1時間たっても、2時間たっても、返事が来ません。", scene("既読なのに…\nまだ返事がない", None, ["left"], place="日曜の午後", lf="think"))
say("「迷惑だったかな」「もしかして、嫌われてた？」")
say("ユウキは、5分おきにスマホを開いては、閉じてしまいます。", scene("迷惑だったかな…\n嫌われてた？", None, ["left"], place="日曜の午後", lf="cry"))
say("そのころサキは、バイト先のカフェで、てんてこまいでした。", scene("迷惑だったかな…\n嫌われてた？", "うれしい！\nあとでゆっくり返そう", place="日曜の午後", lf="cry", rf="smile"))
say("休けい中にメッセージを開いて、「うれしい！　あとでちゃんと返そう」と思っていたんです。")
say("同じ「既読」なのに、2人の頭の中は、まったくちがっていました。")
say("この動画では、返事を待つ時間がなぜこんなに苦しいのかを、5つの研究から解き明かします。",
    {"kind": "list", "title": "この動画で紹介する研究", "items": ["相手にされないと、心が「痛む」", "分からないと、頭から離れない", "答えが出ないと、気持ちが長引く", "答えを知りたくて、つい確かめてしまう", "連絡は、思ったより喜ばれている"]})
say("最後に、返事待ちのモヤモヤとうまく付き合う、3つのルールもお話しします。")

# ───────── 第1章 ─────────
say("第1章。相手にされないと、心が痛む。", {"kind": "chapter", "no": 1, "title": "相手にされないと\n心が痛む"},
    speech="第一章。相手にされないと、心が痛む。", chapter="第1章 相手にされない痛み")
tag("第1章 仲間はずれの痛み")
say("まずは、とてもシンプルな実験から紹介します。",
    {"kind": "paper", "authors": "Williams, Cheung & Choi", "year": "2000", "journal": "Journal of Personality and Social Psychology",
     "title": "Cyberostracism: Effects of Being Ignored over the Internet", "points": ["インターネット上で、3人でボールを投げ合うゲーム", "途中から、自分にだけボールが回ってこなくなる"]})
say("インターネット上で、3人がボールを投げ合うゲームをします。")
say("ところが途中から、ほかの2人が、自分にだけボールを投げてくれなくなります。")
say("実は、ほかの2人はコンピューターが動かしていて、顔も名前も知らない相手です。")
say("それでも、この実験に参加した、62か国、1486人の参加者は、はっきりと嫌な気持ちになりました。",
    {"kind": "stat", "value": 1486, "unit": "人", "label": "62か国から参加した人たち", "sub": "ボールが回ってこないほど、気分が落ちこんだ"},
    speech="それでも、この実験に参加した、ろくじゅうにかこく、せんよんひゃくはちじゅうろくにんの参加者は、はっきりと嫌な気持ちになりました。")
say("ボールが回ってこない時間が長いほど、気分が落ちこみ、「自分はここにいていいのか」という感覚が弱まっていったんです。")
say("知らない相手の、ただのゲームなのに、です。")
say("グループLINEで、自分の発言にだけ誰も反応しない。あのチクッとした気持ちも、これと同じ種類のものです。",
    {"kind": "versus", "left": {"title": "実験では", "body": "自分にだけ\nボールが回ってこない"}, "right": {"title": "毎日の中では", "body": "グループLINEで\n自分の発言だけスルー"}})
say("相手が知らない人でも、ほんの数分でも、人は「相手にされない」ことに、とても敏感なんですね。")
say("さらに、同じゲームをしている人の脳を調べた研究もあります。",
    {"kind": "paper", "authors": "Eisenberger, Lieberman & Williams", "year": "2003", "journal": "Science",
     "title": "Does Rejection Hurt? An fMRI Study of Social Exclusion", "points": ["ボールが回ってこないときの脳を、MRIで調べた", "体の痛みに関わる部分が、活発になっていた"]})
say("仲間はずれにされたとき、脳の「前帯状皮質」という部分が活発になっていました。", speech="仲間はずれにされたとき、脳の、ぜんたいじょうひしつ、という部分が活発になっていました。")
say("ここは、体が痛いときにも働く部分だといわれています。",
    {"kind": "concept", "term": "心の痛み", "en": "Social Pain",
     "desc": "相手にされないと、\n体の痛みと重なる脳のしくみが働く"})
say("つまり、相手にされないつらさは、気のせいではなく、脳にとっても「痛み」に近いものなんです。")
say("返事が来ない時間がつらいのは、あなたが弱いからではありません。")
say("人とのつながりを大切にする生き物として、ごく自然な反応なんです。")
say("大昔、仲間から外れることは、生きのびるうえで大きな危険でした。だから心は、つながりが切れそうなサインに、すばやく反応するのだと考えられています。")
say("ただし、ここで大事なポイントがあります。")
say("既読スルーは、本当に「無視」なのでしょうか。", scene("無視された…", "あとで返そう", place="日曜の午後", lf="cry", rf="smile"))
say("サキのように、ただ忙しいだけ、ということも多いはずです。")

# ───────── 第2章 ─────────
say("第2章。分からないと、頭から離れない。", {"kind": "chapter", "no": 2, "title": "分からないと\n頭から離れない"},
    speech="第二章。分からないと、頭から離れない。", chapter="第2章 分からないと離れない")
tag("第2章 不確かさ")
say("返事を待つ時間には、もうひとつの特徴があります。それは、「答えが分からない」ということです。")
say("バージニア大学とハーバード大学の研究チームは、こんな実験をしました。",
    {"kind": "paper", "authors": "Whitchurch, Wilson & Gilbert", "year": "2011", "journal": "Psychological Science",
     "title": "\"He Loves Me, He Loves Me Not...\": Uncertainty Can Increase Romantic Attraction", "points": ["女子大学生が、4人の男子学生のプロフィールを見る", "「相手からどう思われているか」の伝え方を変えた"]})
say("女子大学生に、ほかの大学の男子学生4人のプロフィールを見てもらいます。")
say("その男子学生たちは、先に彼女のプロフィールを見て、評価していた、と伝えられました。")
say("そして、伝え方を3つに分けました。",
    {"kind": "list", "title": "3つのグループ", "items": ["「あなたのことを、とても気に入っていた」", "「ふつうくらいに気に入っていた」", "「とても気に入ったか、ふつうか、分からない」"]})
say("「とても気に入っていた」と言われたほうが、「ふつう」と言われるより、相手に好感を持ちました。ここまでは予想どおりです。")
say("ところが、いちばん相手に惹かれたのは、「分からない」と言われたグループでした。",
    {"kind": "versus", "left": {"title": "気持ちが分かっている", "body": "「とても気に入っていた」\n→ 好感を持つ"}, "right": {"title": "気持ちが分からない", "body": "「どっちか分からない」\n→ いちばん気になった"}})
say("理由は、考える時間です。")
say("「分からない」グループの人たちは、その男子学生のことを、いちばんたくさん考えていました。")
say("考える回数が増えるほど、その人の存在が、心の中で大きくなっていったんです。",
    {"kind": "concept", "term": "分からないと、考え続ける", "en": "Uncertainty",
     "desc": "相手の気持ちが分からないと、\nその人のことを考える時間が増える"})
say("既読スルーも、まさにこの「分からない」状態です。")
say("返事がないから、相手の気持ちが分からない。分からないから、何度も考えてしまう。")
say("「怒ってるのかな」「忙しいのかな」「もう興味ないのかな」。答えが出ないまま、いくつもの可能性を行ったり来たりします。")
say("ユウキがスマホばかり見てしまうのも、サキのことを、何度も考えているからなんです。", scene("返事まだかな…\nどう思ってるんだろう", None, ["left"], place="日曜の午後", lf="think"))
say("ただし、この研究は、初対面のプロフィールを見ただけの実験です。")
say("「わざと返事を遅らせると好かれる」といった、駆け引きの話ではないので、注意してくださいね。")

# ───────── 第3章 ─────────
say("第3章。答えが出ないと、気持ちが長引く。", {"kind": "chapter", "no": 3, "title": "答えが出ないと\n気持ちが長引く"},
    speech="第三章。答えが出ないと、気持ちが長引く。", chapter="第3章 気持ちが長引く")
tag("第3章 不確かさと気分")
say("「分からない」が、気持ちを長引かせることを示した研究もあります。",
    {"kind": "paper", "authors": "Wilson, Centerbar, Kermer & Gilbert", "year": "2005", "journal": "Journal of Personality and Social Psychology",
     "title": "The Pleasures of Uncertainty", "points": ["思いがけない小さなプレゼントをもらう", "「なぜもらえたのか」が分かる・分からないで比べた"]})
say("参加者たちは、思いがけず、1ドル硬貨のついたカードをプレゼントされます。")
say("あるグループのカードは、なぜもらえたのかが、すっと分かる文章になっていました。")
say("別のグループのカードは、意味がつかみにくく、なぜもらえたのか、よく分からない文章でした。")
say("すると、うれしい気分が長く続いたのは、「よく分からない」ほうのグループでした。",
    {"kind": "versus", "left": {"title": "理由が分かる", "body": "納得して、\nうれしさが早く落ち着いた"}, "right": {"title": "理由が分からない", "body": "あれこれ考えて、\nうれしさが長く続いた"}})
say("人は、出来事の意味が分かると、それに慣れて、気持ちが落ち着いていきます。")
say("でも意味が分からないと、何度も思い出して考えるので、気持ちが長く残るんです。")
say("研究チームは、これを「わけが分かると、喜びは早く薄れる」という、ちょっと不思議な現象として説明しています。")
say("しかも参加者の多くは、「理由が分かるほうがうれしいはず」と予想していました。")
say("この研究で確かめられたのは、うれしい出来事のときです。")
say("でも、「答えが出ないと、何度も考えてしまう」というしくみ自体は、返事待ちの時間にも当てはまりそうです。")
say("既読スルーのモヤモヤが、なかなか消えないのは、答えが出ないまま、何度も考えてしまうからかもしれません。",
    {"kind": "list", "title": "返事待ちの頭の中", "items": ["「怒ってるのかな」", "「忙しいのかな」", "「もう興味ないのかな」", "→ 答えが出ないまま、ぐるぐる回る"]})
say("逆に、サキから「ごめん、バイトだった！」と一言来た瞬間、モヤモヤは一気に消えてしまうはずです。")

# ───────── 第4章 ─────────
say("第4章。答えを知りたくて、つい確かめてしまう。", {"kind": "chapter", "no": 4, "title": "答えを知りたくて\nつい確かめてしまう"},
    speech="第四章。答えを知りたくて、つい確かめてしまう。", chapter="第4章 つい確かめてしまう")
tag("第4章 パンドラ効果")
say("では、なぜ私たちは、何度もスマホを確かめてしまうのでしょう。",
    {"kind": "paper", "authors": "Hsee & Ruan", "year": "2016", "journal": "Psychological Science",
     "title": "The Pandora Effect: The Power and Peril of Curiosity", "points": ["電気がピリッと流れる「いたずらペン」を使った実験", "どのペンが流れるか、分かる・分からないで比べた"]})
say("シカゴ大学のシーたちは、いたずら用の「電気ペン」を使った実験をしました。", speech="シカゴ大学の、シーたちは、いたずら用の、電気ペンを使った実験をしました。")
say("ノックすると、ピリッと軽い電気が流れるペンです。")
say("待ち時間に、机の上のペンを、自由にノックしていいと伝えます。")
say("あるグループには、どのペンに電気が流れるかを、シールの色で分かるようにしました。")
say("別のグループには、どのペンに電気が流れるか、分からないようにしました。")
say("すると、「分からない」グループのほうが、たくさんのペンをノックしたんです。",
    {"kind": "versus", "left": {"title": "流れるペンが分かる", "body": "あまりノックしない"}, "right": {"title": "流れるペンが分からない", "body": "痛いかもしれないのに\nたくさんノックした"}})
say("痛いかもしれないのに、「どうなるか知りたい」という気持ちに、勝てなかったんです。")
say("この研究では、ほかにも、嫌な音や不快な写真を使った実験で、同じような結果が出ています。")
say("研究チームは、これを、パンドラの箱の物語になぞらえて、「パンドラ効果」と呼びました。",
    {"kind": "concept", "term": "パンドラ効果", "en": "The Pandora Effect",
     "desc": "答えが分からないと、\n嫌な結果になるかもしれなくても確かめたくなる"})
say("しかも、分からないものを次々に確かめた人たちは、あとで気分が悪くなっていた、と報告されています。")
say("返事が来ていないと分かっていても、ついLINEを開いてしまう。")
say("開くたびに「まだか」とがっかりして、また少し、気持ちが沈む。")
say("SNSの「いいね」の数を、何度も見に行ってしまうのも、似たしくみかもしれません。")
say("ユウキの「5分おきのスマホ」は、まさにこのパンドラ効果なんです。", scene("また見ちゃった…\nまだ来てない", None, ["left"], place="日曜の午後", lf="shock"))

# ───────── 第5章 ─────────
say("第5章。連絡は、思ったより喜ばれている。", {"kind": "chapter", "no": 5, "title": "連絡は\n思ったより喜ばれている"},
    speech="第五章。連絡は、思ったより喜ばれている。", chapter="第5章 連絡は喜ばれている")
tag("第5章 連絡のうれしさ")
say("最後に、ユウキに伝えたい研究があります。",
    {"kind": "paper", "authors": "Liu, Rim, Min & Min", "year": "2023", "journal": "Journal of Personality and Social Psychology",
     "title": "The Surprise of Reaching Out: Appreciated More Than We Think", "points": ["友だちや知り合いに、短いメッセージや小さな贈り物を送る", "送った人の予想と、受け取った人の気持ちを比べた"]})
say("この研究では、友だちや知り合いに、ちょっとしたメッセージや小さな贈り物を送ってもらいました。")
say("「元気？」「最近どうしてる？」くらいの、ちょっとした連絡です。")
say("そして、送った人には「相手はどれくらい喜ぶと思うか」を、受け取った人には「実際にどれくらいうれしかったか」を聞きました。")
say("すると、受け取った人は、送った人が予想するよりも、ずっと喜んでいたんです。",
    {"kind": "versus", "left": {"title": "送った人の予想", "body": "迷惑じゃないかな…\nそこまで喜ばないかも"}, "right": {"title": "受け取った人", "body": "思いがけない連絡で\nとてもうれしかった"}})
say("理由のひとつは、「驚き」でした。")
say("受け取る側は、「まさか連絡が来るなんて」という驚きを強く感じて、それがうれしさにつながっていたんです。")
say("そして、しばらく会っていない、少し距離のある相手ほど、この予想とのズレは大きくなりました。")
say("つまり、ユウキの「久しぶり！」は、サキにとって、思っているよりずっとうれしい連絡だった可能性が高いんです。", scene("迷惑だったかも…", "久しぶりに連絡くれて\nうれしいな", place="日曜の午後", lf="cry", rf="heart"))
say("「迷惑かな」と思って、連絡をためらった経験は、誰にでもあるはずです。")
say("でも研究によると、その心配の多くは、取りこし苦労なんです。")
say("返事が遅いことと、連絡がうれしくないことは、まったく別の話なんですね。")
say("ここまでの研究を、まとめてみましょう。",
    {"kind": "list", "title": "返事待ちがつらい5つの理由", "items": ["相手にされないと、脳は「痛み」を感じる", "分からないと、相手のことを考え続ける", "答えが出ないと、気持ちが長引く", "知りたくて、つい何度も確かめてしまう", "でも、連絡は思ったより喜ばれている"]})

# ───────── 第6章 ─────────
say("第6章。返事待ちのモヤモヤと付き合う、3つのルール。", {"kind": "chapter", "no": 6, "title": "返事待ちと付き合う\n3つのルール"},
    speech="第六章。返事待ちのモヤモヤと付き合う、3つのルール。", chapter="第6章 3つのルール")
tag("第6章 3つのルール")
say("ルール1。「既読」は、「読んだ」という意味だけ。",
    {"kind": "rule", "no": 1, "title": "「既読」は\n「読んだ」という意味だけ", "body": "返事の速さは、気持ちより「相手の今の状況」で決まりやすい"},
    speech="ルールいち。既読は、読んだという意味だけ。")
say("既読がついても、それは「メッセージを開いた」というだけのことです。")
say("仕事中、電車の中、バイトの休けい中。すぐに返せない理由は、いくらでもあります。")
say("ちゃんと返したいと思っている人ほど、時間のあるときに、ていねいに返そうとするものです。")
say("あなた自身も、大事なメッセージほど、すぐには返さずに、あとで落ち着いて返したことがありませんか。")
say("ルール2。確かめる回数を、自分で決める。",
    {"kind": "rule", "no": 2, "title": "確かめる回数を\n自分で決める", "body": "通知を切って「1時間に1回だけ見る」などと決める"},
    speech="ルールに。確かめる回数を、自分で決める。")
say("パンドラ効果の研究でも、確かめずにいられなかった人たちは、あとで気分が悪くなっていました。")
say("通知をいったん切って、「見るのは1時間に1回だけ」と決めてしまいましょう。", speech="通知をいったん切って、見るのは、いちじかんにいっかいだけ、と決めてしまいましょう。")
say("その間は、散歩をしたり、ほかのことに集中したりするのがおすすめです。")
say("「分からない」状態を何度ものぞきに行かなければ、モヤモヤが大きくなるのを防げます。")
say("ルール3。気になるなら、軽い一言で「答え」をもらう。",
    {"kind": "rule", "no": 3, "title": "気になるなら\n軽い一言で確かめる", "body": "「急ぎじゃないから、ひまなときに返してね」"},
    speech="ルールさん。気になるなら、軽い一言で、答えをもらう。")
say("モヤモヤの正体は、「分からない」ことでした。")
say("だから、相手を責めない軽い一言で、分からない状態を終わらせるのも、ひとつの方法です。")
say("「急ぎじゃないから、ひまなときに返してね」。この一言で、自分も相手も、ぐっと楽になります。")
say("ひとつだけ注意です。返事を急かすような連続のメッセージは、相手の負担になってしまいます。")
say("待つ側の気持ちを整えることと、相手の時間を大切にすること。その両方が、いい関係につながります。")

# ───────── まとめ ─────────
say("まとめ。", {"kind": "chapter", "no": 7, "title": "まとめ", "sub": "既読の向こうにも、それぞれの毎日がある"}, chapter="まとめ")
tag("まとめ")
say("その日の夜、ユウキのスマホが鳴りました。", scene(None, "ごめん、バイトだった！\nごはん行こう！", ["right"], place="日曜の夜", rf="laugh"))
say("「返事遅くなってごめん！　バイトだった。連絡うれしかった、ごはん行こう！」")
say("ユウキは、思わず声に出して笑いました。", scene("なんだ、\n心配しすぎた！", "ごめん、バイトだった！\nごはん行こう！", place="日曜の夜", lf="laugh", rf="laugh"))
say("昼間のあの数時間、ユウキの頭の中では、最悪のストーリーが何度も再生されていました。")
say("でも、それを作っていたのは、サキの気持ちではなく、「分からない」という状態だったんです。")
say("既読の向こうにも、それぞれの毎日があります。")
say("返事を待つときは、相手を信じて、少しだけスマホを置いてみてください。")
say("この動画が参考になったら、高評価とチャンネル登録をお願いします。", {"kind": "title", "kicker": "論文で読み解く 心理学", "title": ["最後まで見てくれて", "ありがとう"], "sub": "あなたの「返事待ちの過ごし方」、コメントで教えてください"})
say("あなたは返事を待つとき、どうやって過ごしていますか？　ぜひコメントで教えてください。")

# 使っている表情だけを素材に入れる（いらすとやは1作品20点まで）
_used = {p[side]["emoji"] for x in S if x["visual"]["kind"] == "scene" for p in [x["visual"]] for side in ("left", "right")}
ILLS = {face(who, f): f"https://blogger.googleusercontent.com/img/b/R29vZ2xl/{key}" for (who, f), key in IRA_URLS.items() if face(who, f) in _used}
assert _used <= set(ILLS), _used - set(ILLS)
assert len(ILLS) <= 20

episode = {
    "id": "paper-kidoku-long",
    "title": "既読スルーがこんなに気になる理由｜返事待ちの心理学【論文で読み解く心理学】",
    "format": "landscape",
    "titleBand": False,
    "pr": False,
    "style": "paper",
    "background": "#0b1222",
    "slideGap": 10,
    "bgmVolume": 0.07,
    "voice": {"speaker": 13, "speed": 1.2, "name": "青山龍星"},
    "bgm": {"file": "hirahira.mp3", "title": "HIRAHIRA", "credit": "もっぴーさうんど", "page": "https://opentracks.com/bgm/detail/2307", "opentracks": 2307, "track": 1},
    "illustrations": {k: {"emoji": "🙂", "irasutoya": "いろいろな表情のスーツを着た人のイラスト", "url": u, "credit": "いらすとや"} for k, u in ILLS.items()},
    "description": "「既読」がついたのに返事が来ない。たった数時間なのに、頭から離れない。あの「返事待ち」のモヤモヤを、5つの心理学の研究から読み解きます。\n台本・例え話はオリジナルです。研究の内容は、論文の要旨や本文、大学・学会の紹介で確認できた範囲で紹介しています。\n\n▼ 紹介した研究\n・Williams, Cheung & Choi (2000) Cyberostracism: Effects of Being Ignored over the Internet. Journal of Personality and Social Psychology, 79(5), 748-762.\n・Eisenberger, Lieberman & Williams (2003) Does Rejection Hurt? An fMRI Study of Social Exclusion. Science, 302, 290-292.\n・Whitchurch, Wilson & Gilbert (2011) \"He Loves Me, He Loves Me Not...\": Uncertainty Can Increase Romantic Attraction. Psychological Science, 22(2), 172-175.\n・Wilson, Centerbar, Kermer & Gilbert (2005) The Pleasures of Uncertainty. Journal of Personality and Social Psychology, 88(1), 5-21.\n・Hsee & Ruan (2016) The Pandora Effect: The Power and Peril of Curiosity. Psychological Science, 27(5), 659-666.\n・Liu, Rim, Min & Min (2023) The Surprise of Reaching Out: Appreciated More Than We Think. Journal of Personality and Social Psychology, 124(4), 754-771.",
    "hashtags": ["心理学", "既読スルー", "論文", "雑学"],
    "slides": S,
}
out = ROOT / "src" / "episodes" / "paper-kidoku-long.json"
out.write_text(json.dumps(episode, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(S)} slides, {sum(len(s.get('speech', s['text'])) for s in S)} chars)")
