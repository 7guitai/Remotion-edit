# 「論文で読み解く心理学」制作ログ

## 公開済み・制作済み

| 日付 | id | テーマ | 研究 | BGM | 登場人物 |
|---|---|---|---|---|---|
| 2026-10-13 | paper-love-long | 好意はあるのに近づいてこない人の心理 | Hall ほか 2014 / Vorauer & Ratner 1996 / Vorauer ほか 2003 / Finkel & Eastwick 2009 / Boothby ほか 2018 / Gilovich & Medvec 1995 | You and Me（しゃろう, 13787） | ハルト・ミオ |
| 2026-10-13 | paper-spotlight-long | 人は、あなたが思うほどあなたを見ていない（スポットライト効果） | Gilovich ほか 2000 / Gilovich, Kruger & Medvec 2002 / Gilovich, Savitsky & Medvec 1998 / Savitsky, Epley & Gilovich 2001 / Savitsky & Gilovich 2003 | 自宅にて（KK, 4041） | ソウタ・アカリ |
| 2026-10-14 | paper-question-long | 話がうまい人より、質問上手が好かれる理由 | Huang ほか 2017 / Tamir & Mitchell 2012 / Aron ほか 1997 / Kardas, Kumar & Epley 2022 / Hart, VanEpps & Schweitzer 2021 | 10℃（しゃろう, 12420） | リク・ナナミ |

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

