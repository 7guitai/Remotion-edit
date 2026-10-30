# 数学ショートチャンネル（目で見る物理・数学スタイル）制作ガイド

このブランチ `claude/math-shorts-channel` は、縦型（9:16）約60秒の数学・物理ショートを **毎日 朝・夕の2本** 作るためのもの。
定期実行のセッションも、手動のセッションも、まずこのファイルを読んでから作業する。

- 動画の仕様（構成・デザイン・ナレーション規約）: [`docs/math-shorts-spec.md`](docs/math-shorts-spec.md) … **必ず全部読む**
- お手本の完成品: `src/math-shorts/BirthdayParadox.tsx`（実装）と `src/math-shorts/birthday-paradox.md`（台本・秒単位コンテ）
- 制作履歴とテーマのストック: [`channel/log.md`](channel/log.md)
- 改善メモ（過去の反省・視聴データからの学び）: [`channel/lessons.md`](channel/lessons.md)

## 決まりごと

- 公開リポジトリなので **BGM の mp3 はコミットしない**（配布元の規約で再配布禁止）。`scripts/make_math_short.sh` が配布元から取得する
- BGM は当面 **毎日同じ** zukisuzuki BGM「Mineral」。伸びなければ運営者が変える指示を出す（勝手に変えない）
- 声は VOICEVOX **青山龍星（speaker 13）**、速さ 0.97 前後（尺が 58〜62 秒に収まるよう 0.95〜1.05 で調整する）
- 挨拶・チャンネル登録の呼びかけは入れない（仕様書どおり）
- 数値・式は **必ず Python で計算して確かめてから** ナレーションに書く。うろ覚えの定数は使わない
- 同じテーマを繰り返さない（`channel/log.md` を見る）。朝と夕で分野が偏らないようにする（確率・幾何・解析・物理スケール則 など）
- 具体例は見る人の日常に近いものを優先する（教室・スマホ・料理・通勤など）

### わかりやすさのルール（運営者の指摘「説明が難解」を受けて。最優先）

- **式で導出しない。たとえと具体的な数字で説明する**（例：誕生日 → 「全員で握手すると何回？」「当たりくじを253回引く」）
- 画面に出す式は、具体的な数字が入った短いもの（`22+21+…+1 = 253`、`1/365`）か、「人数 ×2 → 組 ×4」のような言葉の対比までにする。`n(n-1)/2`、指数、平方根、`∝` の連続は使わない
- 文字（n, R など）を使うのは1本につき1つまで。使うなら最初に「n＝人数」と言う
- 中学生が1回見て分かるか、を基準にする。専門用語は1つまで、出すなら言いかえも添える
- 締めは身近な場面の数字で終える（「40人のクラスなら約9割」など）
- 声の速さは 0.95〜1.05（ゆっくりの方が分かりやすい）。尺が足りないときは速くせずに一言足す
- PR は頼まれたときだけ作る。コミットとプッシュは `claude/math-shorts-channel` に

## 1本の作り方（定期実行ではこれを上から順に全部やる）

### 0. 準備
```bash
git fetch origin claude/math-shorts-channel && git checkout claude/math-shorts-channel && git pull --rebase origin claude/math-shorts-channel
npm ci
```

### 1. 改善（前回までの振り返り）
- `channel/lessons.md` と `channel/log.md` の直近の行を読む
- 環境変数 `YT_CLIENT_ID` `YT_CLIENT_SECRET` `YT_REFRESH_TOKEN` があれば `python3 scripts/youtube_stats.py` で YouTube Studio と同じ数字（再生数・平均視聴率・高評価・登録者増・視聴維持率の曲線）を取る（設定方法は `docs/youtube-setup.md`）
  - `channel/log.md` の再生数・高評価を更新する（公開リポジトリなので、維持率などの細かい数字は `out/youtube-stats.json` に置いたままにし、コミットしない）
  - 冒頭（5%地点）で離脱が多い動画はフック、半分で落ちる動画は中盤の図解、が弱い。伸びた／伸びなかったテーマ・フックの傾向を `channel/lessons.md` に1〜3行で追記する
- 視聴データがない日は、直前の動画の静止画シートを見直し、仕様書と比べて改善点を1つ以上決めて `channel/lessons.md` に追記する
- 決めた改善は今回の動画に必ず反映する

### 2. テーマ選定
- 仕様書セクション7の条件（直感に反する現象 × 2つのスケール則の対比）を満たすテーマを3つ挙げる（`channel/log.md` のストックから選んでも、新しく考えてもよい）
- 「冒頭の1文で気になる」「中央の図解が動きで映える」「60秒で正確に言い切れる」の3点で比べ、1つに決める
- ID は `YYYYMMDD-am-<英小文字の短い名前>`（夕方は `pm`）。例: `20261031-am-gabriel-horn`

### 3. 台本
- `src/math-shorts/<id>.json` を作る（`birthday-paradox.json` と同じ形。`title` `description` `hashtags` `bgm` `voice` `readings` `slides`）
- ナレーションは 300〜340 文字、12〜15 フレーズ。1フレーズ＝1音声ファイル＝画面の1アクション
- `bgm` と `voice` は `birthday-paradox.json` からそのままコピーする

### 4. 音声と読みの確認
```bash
bash scripts/make_math_short.sh <id>   # 途中で止まってもよい。音声だけ先に作りたいときも同じ
```
- 読みを VOICEVOX の `audio_query` の `kana` で確認する（数字・記号・漢字の誤読）。おかしいものは `readings` にひらがなで足して作り直す
- 音声の合計が 58〜62 秒になるよう `voice.speed` を調整する

### 5. 実装
- `src/math-shorts/<PascalCase>.tsx` を作り、`src/math-shorts/index.ts` の `MATH_SHORTS` に登録する
- 部品は `kit.tsx`（`Line` `Tex` `Sphere` `ramp` `sceneOpacity` `C`（色）など）を使う。`BirthdayParadox.tsx` の書き方（`at(p, f)` でフレーズに同期、3ゾーン、点灯→減光→消去）をまねる
- 要素A＝ゴールド `C.a`、要素B＝シアン `C.b`。背景は純黒、見出しは1行 8〜11 文字
- `npx tsc --noEmit` を通す

### 6. 静止画で確認（毎回必ず）
```bash
bash scripts/render_math_stills.sh <id> /tmp/stills/<id> 60 150 ...   # 各フレーズの中ほど（14枚程度）
```
- `sheet.png` を目で見て、文字のはみ出し・重なり・数式の崩れ・図と文字の衝突がないか確かめる。直したらもう一度確認する

### 7. 書き出し
```bash
bash scripts/make_math_short.sh <id> --no-voice
```
- `out/<id>.mp4`（-14 LUFS にそろえ済み）と `out/<id>-description.txt`（タイトル・概要欄・ハッシュタグ・クレジット）ができる

### 8. 記録・保存・お届け
- `src/math-shorts/<id>.md` に「企画（候補3つと選んだ理由・タイトル案・数理の要約）」「ナレーション全文」「秒単位コンテ」を書く（`birthday-paradox.md` と同じ形）
- `channel/log.md` の制作履歴に1行足し、使ったテーマをストックから消す
- `out/` はコミットしない。それ以外（json・tsx・md・音声 wav・log）をコミットして `claude/math-shorts-channel` にプッシュする（プッシュ前に `git pull --rebase`）
- 完成した mp4 と概要欄テキストを SendUserFile でユーザーに送り、テーマ・タイトル・長さ・今回の改善点を短く報告する
