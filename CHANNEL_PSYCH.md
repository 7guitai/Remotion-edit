# 新チャンネル「論文で読み解く心理学」 毎日の動画づくりガイド

和モダンの解説動画（style: `paper`）を **毎日1本** 作るための手順書。
手本は `paper-love-long`（好意はあるのに近づいてこない人の心理）。台本の作り方は `scripts/build_paper_love_long.py` をそのまま型として使う。
先に `KNOWHOW.md` を読むこと（チャンネル運営者の決まりごと・技術メモ）。

---

## 1. 動画の形式（毎回同じ）

- 横長 1920×1080、約10分（台本 4,000〜4,500文字・スライド120〜140枚）
- 声：VOICEVOX 青山龍星（speaker 13）1.2倍。BGM の音量 0.07。slideGap 10
- 構成：オープニング（身近な2人のすれちがい・悩み場面）→ 第1〜5章（研究1本ずつ）→ 第6章（今日からできる3つのルール）→ まとめ（ストーリーの答え合わせ＋コメントのお願い）
- 見た目：`PaperPage.tsx` の visual を組み合わせる（title / chapter / scene / paper / stat / bars / concept / versus / rule / list）
  - title の `kicker` でシリーズ名を変えられる（例：「論文で読み解く 人間関係の心理学」）
- 登場人物：いらすとや「いろいろな表情のスーツを着た人（男性・女性）」の表情セット（`face("man", "think")` など）。場面に合う別のいらすとやを使ってもよい（1本20点まで、概要欄に「イラスト：いらすとや」）
  - 名前は毎回変える（ハルト／ミオ、ソウタ／アカリ、リク／ナナミ、ユウキ／サキ、タクミ／ハナ、ケンタ／マイは使用済み）。職場・学校・友人・家族など、見る人の日常の場面にする

## 2. 絶対に守ること

- **他の動画の台本・構成をまねない**。研究の「事実」だけを使い、台本・例え話はオリジナルで書く
- **研究の内容は必ず検索で確かめる**（著者・年・掲載誌・数字）。確かめられない数字は使わない。言い切れないことは「〜といわれています」「〜という研究があります」
- 断定的な恋愛テクニック・人を操る話・差別的な一般化はしない。「男は〜、女は〜」と決めつけない
- 健康・メンタルの深刻な話題（うつ・自傷など）は扱わない
- 具体例は見る人の日常に絡める（LINE、職場の同期、授業、駅のホーム、コンビニ…）

## 3. 毎日の手順

1. `docs/psych_channel_log.md` を読み、まだ使っていないテーマを1つ選ぶ（下の候補から、または新しく）
2. 研究を3〜6本、WebSearch / WebFetch で確認（大学のプレスリリース・論文の要旨）。メモを log に残す
3. `scripts/build_paper_<テーマ>_long.py` を作る（`build_paper_love_long.py` をコピーして台本を書きかえる）→ `src/episodes/index.ts` に登録
4. 新しい BGM を OpenTracks から選ぶ（「利用条件有」は避ける。穏やか・ピアノ系。使った曲は log に記録）→ `python3 scripts/download_assets.py`
5. VOICEVOX を起動 → audio_query の読みを全行チェック → 誤読は `READ` で直す → `python3 scripts/generate_voice.py <id>`
6. `node scripts/render_stills.mjs` で各 visual の静止画を確認（字幕の帯と人物・カードが重ならないか、はみ出し）
7. 書き出し（ディスク節約の手順）：
   ```bash
   npx remotion render <id> out/v.mp4 --muted --log=error --concurrency=100%
   python3 scripts/mix_audio.py <id> out/a.m4a
   FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
   $FF -y -v error -i out/v.mp4 -i out/a.m4a -map 0:v -map 1:a -c:v libx264 -crf 29 -preset slow -tune stillimage -c:a copy -shortest out/<id>-send.mp4
   rm -f out/v.mp4 out/a.m4a; rm -rf /tmp/remotion-webpack-bundle-* /tmp/remotion-v4*-assets*
   python3 scripts/make_description.py <id>
   ```
   送れるのは 30MB まで。超えたら crf を上げる
8. サムネイル（1280×720）も作る：`RelaxThumbnail` のように Still を Root.tsx に登録し、和モダンの配色で
9. `docs/psych_channel_log.md` に記録 → コミット＆プッシュ（作業ブランチ。push 前に `git pull --rebase`）
10. 動画・概要欄・サムネイルを SendUserFile で送り、3行くらいで内容を報告

## 4. テーマ候補（使ったら log へ移す。研究は必ず確かめてから）

- 何度も会う人を好きになる「単純接触効果」（Zajonc 1968 など）
- 完璧すぎない人が好かれる「しくじり効果」（Aronson ほか 1966 など。再現性の議論もふれる）
- 吊り橋効果は本当か（Dutton & Aron 1974 と、その後の議論）
- 似た者どうしが惹かれ合う？ 正反対は？（類似性の研究）
- 嫉妬・比べてしまう心理（社会的比較）
- 長続きするカップルの会話（Gottman の研究など）
