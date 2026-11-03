# AGENTS.md（Codex 向けの作業手順）

このリポジトリは、日本語の雑学 YouTube チャンネルの動画を **Remotion** で作るプロジェクトです。
ここでは **寝落ち雑学（relax スタイル・約45分）の新しい回（その3）** を、その1・その2 と同じ作り方で作る手順をまとめます。
細かいノウハウは `KNOWHOW.md` の「6.5 寝落ち用ロング（relax）の作り方」、使える部品は `README.md` にあります。最初に必ず読んでください。

## 0. 守るルール

- 返事・報告は日本語で書く
- **APIキーやトークンをチャットに貼らせない**（必要なら環境変数で渡してもらう）
- 他のクリエイターの動画を丸ごとまねしない。台本・映像はオリジナルで作る。既存キャラクター（ゆっくり霊夢・魔理沙など）は使わない
- 雑学の事実は**必ず検索して確かめる**。諸説ある話は「〜といわれています」「〜という説があります」にする
- 身近な暮らしにつながる例を入れる
- BGM は毎回変える（OpenTracks。**「利用条件有」の作曲者は避ける**）。BGM・いらすとやの画像は再配布禁止なのでコミットしない（`.gitignore` 済み）
- 写真は Openverse の **CC0・パブリックドメインだけ**。出典は概要欄に入る
- その1・その2 と**同じ話題・同じ写真を使わない**

### 使用済みの章（重ねない）
- その1：体／眠りと夢／食べもの・飲みもの／植物と自然／動物の暮らし／空と天気と季節／暮らしの道具／心がほっとする話／宇宙と時間
- その2：海と水／言葉と暮らしの由来／鳥と虫／台所の科学／季節と行事／感覚／地球と山と石／世界の暮らしと習慣／夜空と星
- 台本の中身は `scripts/relax_sleep_script.txt`・`scripts/relax_sleep2_script.txt` を見て、話題の重なりを避ける

## 1. 準備

```bash
npm ci
pip install numpy pillow imageio-ffmpeg   # mix_audio.py・photo_sheet.py・finalize_photos.py が使う
```

- **VOICEVOX**（音声）：VOICEVOX アプリを起動しておく。または Docker で
  `docker run -d --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest`
  （generate_voice.py は http://127.0.0.1:50021 を使う）
- ffmpeg がなければ `npx remotion ffmpeg ...` で代わりに使える
- ネットワークが必要：Openverse（写真）、OpenTracks（BGM）、VOICEVOX イメージの取得

## 2. 台本を書く：`scripts/relax_sleep3_script.txt`

書き方（その1・その2 と同じ）：

```
= はじめに
@ night window moon ; cozy bedroom lamp
今日も、聞いているうちに眠くなる、やさしい雑学をお話しします。[c]

= 第1章　〇〇のはなし
@ 英語の検索語 ; 別の検索語
事実の1行。
理由の1行。
身近な例の1行。{読みだけ変えたいときは、ここに読み}
やさしい一言（眠りにつなげる）。[c]
```

- 1行＝1場面（字幕1枚）。`= ` は章の扉、`@ ` はその話題の写真の検索語（英語・`;` で複数）
- 行末 `[c]` は「落ち着いた写真」の共通セットを使う。`{よみ}` は読み上げだけ差しかえる
- 1つの話題は「事実 → 理由 → 身近な例 → やさしい一言」の4行前後。断定しすぎない、静かな語り口
- 構成は **はじめに＋第1〜9章＋おわりに**、話題は90個くらい（約45分）。1章に10話題くらい
- 数字は読みが崩れやすいので `{}` で読みを書く（例：3.5 → さんてんご）

## 3. 写真を選ぶ（Openverse）

```bash
python3 scripts/fetch_openverse.py relax_sleep3_script.txt s3_   # 候補を scripts/openverse_cache/s3_tNNN.json（話題ごと）と calmNN.json（落ち着いた写真・共通）に保存
python3 scripts/photo_sheet.py out/sheets s3_t000 s3_t001 calm20   # 候補の一覧シート（番号つき）を out/sheets/ に作って目で見る
```

- 匿名は **1分20回・1日200回まで**。403/429 が出たら時間をおく。キャッシュは再利用される
- 選んだ番号を `scripts/photo_select3.json` に書く（形は `scripts/photo_select2.json` と同じ。`"calm"` に落ち着いた写真を20枚くらい）
- 古い版画・白黒写真・ロゴ入り・関係ない写真は除く。**その1・その2 の `photo_credits.tsv`・`photo_credits2.tsv` と同じ ID は除く**
- 検索結果が0件の語（onsen, hygge など）は、もっと一般的な英語に言いかえる
- rawpixel の大きいサイズにはすかしが入るので、Openverse の URL をそのまま使う（finalize_photos.py が対応済み）

```bash
python3 scripts/finalize_photos.py scripts/photo_select3.json photo_picks3.json photo_credits3.tsv
# → public/photos/relax/ に保存、scripts/photo_picks3.json と scripts/photo_credits3.tsv ができる
```

## 4. エピソードを作る

1. `scripts/build_relax_sleep3.py`（雛形あり）の **TODO** を埋める：BGM 3曲（OpenTracks の曲番号・曲名・作曲者）、タイトル、概要欄の章の話題
   - 使用済み BGM：眠れない夜に／子猫のお昼寝／10℃／花の季節を待ちながら／ささやかな眠り／ヒーリングガムラン
2. `python3 scripts/build_relax_sleep3.py` → `src/episodes/relax-sleep3-45m.json` ができる
3. `src/episodes/index.ts` に登録：`import relaxSleep3 from "./relax-sleep3-45m.json";` と、`EPISODES` の配列に `relaxSleep3 as Episode,`（その2 の `relaxSleep2` と同じ書き方）
4. `npm run assets`（BGM を public/bgm/ に取る）
5. `npx tsc --noEmit` で型チェック

設定（雛形に入っている。変えない）：style `relax`、fps 15、slideGap 22、背景白、BGM 音量 0.07、
声は **青山龍星「しっとり」speaker 84・速さ 1.0・抑揚 0.9**

## 5. 音声

```bash
python3 scripts/generate_voice.py relax-sleep3-45m   # head などにパイプしない（途中で止まる）
```

- 読み間違いを VOICEVOX の audio_query のかな（`/audio_query?speaker=84&text=...` の `kana`）で確かめ、`READINGS` に足して作り直す
- 過去に見つかった読み間違い：お米→オベエ、金星→キンボシ、熟す→コナス、緑や→リョクヤ、細やか→ササヤカ、日本→ニッポン、第8章→ダイワッショウ、8の字・108 の「は」が「わ」に
- 「だいはっしょう」はカタカナ「ダイハッショウ」にする（build_relax_sleep2.py と同じ処理が雛形にある）

## 6. サムネイル

`src/Root.tsx` の `relax-sleep2-45m-thumbnail` をまねて `relax-sleep3-45m-thumbnail` の `<Still>` を足す
（`RelaxThumbnail`：kicker「聞くだけで」、title「眠くなる\n雑学 3」、minutes「45分」、sub に話題、main と strip に public/photos/relax/ の写真）。

```bash
npx remotion still relax-sleep3-45m-thumbnail out/relax-sleep3-45m-thumbnail.png
```

## 7. 書き出し（長いので音声は別に作る）

Remotion で45分の音声まで書き出すと、一時ファイルで数GB使って容量切れになる。映像と音声を分ける：

```bash
npx remotion render relax-sleep3-45m out/v.mp4 --muted --concurrency=100%
npx remotion ffmpeg -i out/v.mp4 -vf scale=1280:720 -c:v libx264 -crf 26 out/v720.mp4 && rm out/v.mp4
python3 scripts/mix_audio.py relax-sleep3-45m out/a.m4a
npx remotion ffmpeg -i out/v720.mp4 -i out/a.m4a -c copy -map 0:v -map 1:a -shortest out/relax-sleep3-45m.mp4
python3 scripts/make_description.py relax-sleep3-45m   # 概要欄（BGM・写真・VOICEVOX のクレジット入り）
```

- 4コアで約35分。途中で数枚のフレームを書き出して（`npx remotion still relax-sleep3-45m out/f.png --frame=N`）字幕のはみ出し・写真の向きを確認する

## 8. 仕上げ

- `README.md` の動画一覧に `relax-sleep3-45m` を1行足し、`KNOWHOW.md` 6.5 に新しく分かったこと（読み間違い・0件の検索語など）を足す
- コミットする（BGM・写真・out/ はコミットしない。音声 public/voice/ はこれまでコミットしている）
