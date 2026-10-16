# 「論文で読み解く心理学」制作ログ

## 公開済み・制作済み

| 日付 | id | テーマ | 研究 | BGM | 登場人物 |
|---|---|---|---|---|---|
| 2026-10-13 | paper-love-long | 好意はあるのに近づいてこない人の心理 | Hall ほか 2014 / Vorauer & Ratner 1996 / Vorauer ほか 2003 / Finkel & Eastwick 2009 / Boothby ほか 2018 / Gilovich & Medvec 1995 | You and Me（しゃろう, 13787） | ハルト・ミオ |
| 2026-10-13 | paper-spotlight-long | 人は、あなたが思うほどあなたを見ていない（スポットライト効果） | Gilovich ほか 2000 / Gilovich, Kruger & Medvec 2002 / Gilovich, Savitsky & Medvec 1998 / Savitsky, Epley & Gilovich 2001 / Savitsky & Gilovich 2003 | 自宅にて（KK, 4041） | ソウタ・アカリ |
| 2026-10-14 | paper-question-long | 話がうまい人より、質問上手が好かれる理由 | Huang ほか 2017 / Tamir & Mitchell 2012 / Aron ほか 1997 / Kardas, Kumar & Epley 2022 / Hart, VanEpps & Schweitzer 2021 | 10℃（しゃろう, 12420） | リク・ナナミ |
| 2026-10-15 | paper-kidoku-long | 既読スルーがこんなに気になる理由（返事待ちの心理） | Williams, Cheung & Choi 2000 / Eisenberger ほか 2003 / Whitchurch, Wilson & Gilbert 2011 / Wilson ほか 2005 / Hsee & Ruan 2016 / Liu ほか 2023 | HIRAHIRA（もっぴーさうんど, 2307） | ユウキ・サキ |
| 2026-10-16 | paper-impression-long | 第一印象は0.1秒で決まる？ でも信じすぎてはいけない理由 | Willis & Todorov 2006 / Ambady & Rosenthal 1993 / Kelley 1950 / Babad ほか 1999 / Todorov ほか 2005 / Todorov & Porter 2014 | the opening of a book（ioni, 2859） | タクミ・ハナ |
| 2026-10-17 | paper-favor-long | 頼みごとをすると、なぜか好かれる（ベン・フランクリン効果） | Jecker & Landy 1969 / Niiya 2016 / Flynn & Lake 2008 / Brooks, Gino & Schweitzer 2015 / Grant & Gino 2010 | South Wind（FLASH☆BEAT, 9297） | ケンタ・マイ |

## メモ
- 使った BGM はここに追記する（同じ曲を続けて使わない）

- 共通の不具合を直した（paper-spotlight-long）：PaperPage の図のエリアは AbsoluteFill（height 100%）のため bottom が効かず、図が下にずれて2行の字幕と重なっていた → height を明示（720）。名前札・カードの下端が字幕に隠れなくなった
- サムネイルは `PaperThumbnail`（Root.tsx に `<id>-thumbnail` の Still として登録。props で見出し・バッジ・人物・吹き出しを変える）
- render_stills がコード変更を拾わないときは `node_modules/.cache` を消す

## 研究メモ

### paper-spotlight-long（2026-10-13）
- Gilovich, Medvec & Savitsky (2000) JPSP 78(2):211-222：要旨（PubMed 10707330）で確認。研究1・2＝恥ずかしい／誇らしいTシャツで、気づいた人数を多く見積もる。研究3＝話し合いの発言（良い・悪い）の目立ち方を多く見積もる。研究4・5＝自分の感覚にアンカーして調整不足。Tシャツの「予想46%・実際23%」は複数の解説記事の値（原文は未確認のため画面に「解説より（約）」と注記）
- Gilovich, Kruger & Medvec (2002) JESP：見た目・スポーツ・ゲームの出来の「波」を周りは本人ほど気づかない。観察者が自分の行動に忙しいことも一因（研究3）
- Gilovich, Savitsky & Medvec (1998) JPSP 75(2):332-346：本文PDFで確認。5人のウソ当てゲームで、ウソをついた人の予想 48.8% → 実際 25.6%（偶然と同じ）。まずい飲み物の嫌悪を隠す実験も
- Savitsky, Epley & Gilovich (2001) JPSP 81(1):44-56：要旨（PubMed 11474724）で確認。失敗後の評価を実際より厳しく予想。失敗に注目しすぎて状況要因を考えないため
- Savitsky & Gilovich (2003) JESP 39:618-625：スピーチ前に透明性の錯覚を説明された群は、自己評価も観察者の評価も高かった（Wikipedia・解説で確認、数値は使っていない）

### paper-question-long（2026-10-14）
- Huang, Yeomans, Brooks, Minson & Gino (2017) JPSP 113(3):430-452：要旨（PubMed、2025年の訂正記事も。監査で結論は有効と確認）。質問、特にフォローアップ質問が多いほど好かれる。応答性が仲立ち。スピードデートでフォローアップ質問が多い人ほど2回目のデートに同意されやすい。人は質問の効果を予想していない。質問数の具体的な指示（何回以上など）は未確認なので使っていない
- Tamir & Mitchell (2012) PNAS 109(21):8038-8043：要旨で確認（会話の30〜40%は自分の経験の話、自己開示で側坐核など報酬系が活動、お金をあきらめても自分の話を選ぶ）。「17%」は報道（TIME など）で確認した値なので、画面に「報道より」と注記
- Aron ほか (1997) PSPB 23(4):363-377：36の質問（12問×3セット、だんだん深く）と浅い世間話の比較。解説記事で確認。研究者自身が「忠誠や関わりまで生むわけではない」と注意している点も紹介
- Kardas, Kumar & Epley (2022) JPSP 122(3):367-398：要旨で確認。深い会話の気まずさを過大に予想、相手の関心を過小評価。友人・家族相手では予想が正確。正しい予想を知ると深い話題を選ぶ
- Hart, VanEpps & Schweitzer (2021) OBHDP 162:136-154：5実験・1427人。給料など聞きにくい質問をしても、ふつうの質問（通勤など）と同じくらい好印象。Wharton の解説・IDEAS で確認。数値の比較グラフは作らず versus で表示

### paper-kidoku-long（2026-10-15）
- Williams, Cheung & Choi (2000) JPSP 79(5):748-762：要旨（PubMed）。サイバーボール、62か国1486人。仲間はずれが多いほど気分・所属感・コントロール感が下がる
- Eisenberger, Lieberman & Williams (2003) Science 302:290-292：要旨。仲間はずれで前帯状皮質（ACC）が活動、体の痛みの研究と並行
- Whitchurch, Wilson & Gilbert (2011) Psychological Science 22(2):172-175：本文PDF（Harvard）で確認。女子学生が男子学生4人のプロフィールを見る。「とても好き」「ふつう」「どちらか分からない」の3条件で、分からない条件がいちばん惹かれた（考えた量が仲立ち）。初対面の実験で、駆け引きの話ではないと注意
- Wilson, Centerbar, Kermer & Gilbert (2005) JPSP 88(1):5-21：要旨。1ドル硬貨つきカード、意味が分かりにくい条件のほうがうれしさが長続き。予測者は分かる条件を好む。うれしい出来事での結果であることを台本で明示
- Hsee & Ruan (2016) Psychological Science 27(5):659-666：要旨＋APS・Chicago Booth の紹介。電気ペン、分からない条件のほうが多くノック。数字（何本など）は使っていない
- Liu, Rim, Min & Min (2023) JPSP 124(4):754-771：要旨。連絡を受けた側の喜びを、送る側は過小評価。驚きが理由のひとつ。距離のある相手ほどズレが大きい
- サムネイルの最後の行は、長いとき自動で小さくなるようにした（PaperThumbnail）

### paper-impression-long（2026-10-16）
- Willis & Todorov (2006) Psych Sci 17(7):592-598：要旨（PubMed）。100ms・500ms・1000ms。100msの印象が時間制限なしの印象と高く相関、時間を延ばしても相関は上がらず自信が増える。時間が長いと印象がより細かくなる
- Ambady & Rosenthal (1993) JPSP 64(3):431-441：本文PDFで確認。大学の先生13人、音なし10秒×3本（計30秒）、学期末評価と r=.76。細かい行動のコードより全体（molar）の印象が予測、魅力を統制しても .74。研究3で6秒・15秒
- Kelley (1950) J Personality 18(4):431-439：「とてもあたたかい／ややつめたい」の一語ちがいの紹介文。数値（参加率など）は原文未確認なので使っていない
- Babad, Kaplowitz & Darley (1999) Social Psychology of Education 3:81-102：要旨。会う前の大きな差が30分の授業後に多くが消え、学期末にはほぼ消えた。人は変われると考える学生ほど見直す
- Todorov, Mandisodza, Goren & Hall (2005) Science 308:1623-1626：要旨。有能さの印象で2004年上院選の68.8%を予測、得票差とも関係、有能さに特有、1秒の提示
- Todorov & Porter (2014) Psych Sci 25(7):1404-1417：要旨。同じ人の写真間のばらつきが人どうしの差と同等以上、目的（出会い系・選挙）で選ぶ写真が変わる、40msでも
- PaperPage の stat も小数（0.1・68.8）を表示できるようにした

### paper-favor-long（2026-10-17）
- Jecker & Landy (1969) Human Relations 22(4):371-378：解説記事で確認（研究者本人に賞金の返金を頼まれた学生が研究者をいちばん好きに。事務の人からの依頼と比較）。小さな古い実験であることを台本で明示
- Niiya (2016) J Soc Psychol 156(2):211-221：要旨（PubMed）。日本とアメリカ、協力者に直接頼まれると好感・社交的な印象・親しさが増加、頼まれずに手伝った場合は増えない。甘えの理論
- Flynn & Lake (2008) JPSP 95(1):128-143：要旨。直接の依頼が受け入れられる確率を最大50%過小評価。断る社会的コストを見落とす
- Brooks, Gino & Schweitzer (2015) Management Science 61(6):1421-1435：要旨（IDEAS）・解説。アドバイスを求める人は有能に見える（課題が難しい・自分に直接・専門分野のとき）
- Grant & Gino (2010) JPSP 98(6):946-955：要旨。お礼で援助が増え、別の人への援助も増える、社会的価値の感覚が仲立ち、募金係の電話件数も増加。32%→66%はハーバード・ガゼットの記事の値（画面に出典を明記）

