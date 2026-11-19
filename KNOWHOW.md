# ずんだもん解説動画 制作ノウハウ

このプロジェクトで「ずんだもん解説動画」（横型の長尺と、縦型ショート）を作るときの手順・ルール・注意点をまとめたものです。
コードの細かい仕様より、「どう作ると品質が上がるか」「どこでつまずくか」を中心に書いています。

---

## 1. 全体像

```
台本（drafts/<id>.md）
   │  人（またはAIアシスタント）が書く。一次資料で事実を確認する
   ▼
エピソード JSON（src/episodes/<id>.json）＋ src/episodes/index.ts に登録
   │  スライド構成・字幕・読み上げ文・図解の数値・出典・表情・効果音
   ▼
素材の取得     npm run assets                         … BGM・効果音・公式立ち絵・いらすとや
立ち絵の書き出し python3 scripts/build_character.py <PSD> … 坂本アヒル版（PSD）を使うとき
   ▼
音声           python3 scripts/generate_voice.py <id>  … VOICEVOX でスライドごとの WAV と字幕タイミング
   ▼
プレビュー     npm run dev（Remotion Studio）／ npx remotion still で静止画確認
   ▼
書き出し       npx remotion render <id> out/<id>.mp4
   ▼
概要欄         npm run description -- <id>            … out/<id>-description.txt（出典・クレジット込み）
```

- 1本の動画 = `src/episodes/<id>.json` 1ファイル。コンポジション ID は `id`。
- スライドの長さは**音声の長さで自動的に決まる**（`src/slides.ts`）。尺を変えたいときは読み上げ文を変える。
- 収録済みの例:
  - `sleep-trivia` / `charger-power-split` … 横型（1920×1080）、白背景＋いらすとや
  - `ai-hallucination` … 縦型ショート・明るいカード型デザイン
  - `gemini4-neon` … 縦型ショート・紙面・レポート風（Editorial Paper）＋デフォルメ立ち絵＋口パク

---

## 2. 制作の流れ（チェックリスト）

1. **企画**: テーマと「誰の何の疑問に答えるか」を1文で決める。
2. **一次資料を集める**: 公式発表（ブログ・ドキュメント・料金表）と第三者評価（ベンチマーク等）を分けてメモする。URL も控える。
3. **台本を書く**（`templates/draft-short.md` をコピー）。→ 3章のルール
4. **エピソード JSON を作る**（`templates/episode-short-paper.json` をコピー）し、`src/episodes/index.ts` に `import` と `EPISODES` への追加をする。
5. **素材**: `npm run assets`。デフォルメ立ち絵を使うなら `build_character.py`。
6. **音声**: VOICEVOX を起動して `python3 scripts/generate_voice.py <id>`。出力の秒数を見て尺を確認。
7. **読みの確認**: 誤読しやすい語（数字＋単位、英字、固有名詞）を 5章の方法で確認し、`readings` / `voiceDict` を直して音声を作り直す。
8. **見た目の確認**: Studio で全スライドを見る。字幕の折り返し、数値のはみ出し、UI との重なり（7章）を確認。
9. **書き出し**: `npx remotion render <id> out/<id>.mp4`。
10. **最終確認**: 長さ（ショートは60秒未満）、音量、出典表示、クレジット。
11. **概要欄**: `npm run description -- <id>` の出力を貼る。立ち絵・BGM・効果音・VOICEVOX のクレジットが入っているか確認。

---

## 3. 台本の書き方

### 事実の扱い（いちばん大事）
- **数値・URL・発言を作らない。** 一次資料で確認できたものだけ使う。
- **公式発表と第三者評価を分けて言う。**「公式では〜」「第三者機関〇〇の評価では〜」。
- **注意点（コスト・条件・限界）を最低1つ入れる。**「最強確定」「完全終了」のような煽りは使わない。
- 資料どうしで数値が食い違うもの、噂、出典のない SNS 投稿は**載せない**（または「未確認」と明示）。
- 「ほぼ同じ」「約3分の1」などの言い換えも、元の数値と矛盾しないか確認する（例: 24% と 22% は「同じ」ではなく「ほぼ同じ」）。
- 台本の末尾に「確認した出典」と「外したもの（理由）」を残すと、後から見直せる（`drafts/gemini4-neon.md` 参照）。

### 尺とテンポ（ショート）
- **45〜58秒**に収める（60秒を超えると Shorts にならない）。読み上げ 1.2倍速で、全体で約280〜360文字が目安。
- **冒頭のフックは3〜4秒以内。** 1文の問いかけにして、`voiceSpeed`（例 1.32）で少し速くする。
- 1スライド＝1つの話。読み上げは1スライド60文字程度まで。
- 構成の型: フック → 前提（公式情報） → データ（第三者） → 注意点 → 使いどころ → まとめ＋コメント誘導。

### 文体・表記
- 語尾は「〜のだ」「〜なのだ」。
- **読み上げ文（`speech`）はそのまま字幕に出る**（紙面レイアウト）。モデル名などは英語表記で書き、読みは `readings` で指定する。
  例: `"speech": "Gemini 4 Neonが総合3位って本当なのだ？"` ＋ `"readings": {"Gemini 4 Neon": "ジェミニフォーネオン"}`
- 字幕は句読点（、。！？）で区切られて2〜3秒ずつ切り替わる。区切りたい位置に読点を入れる。

---

## 4. エピソード JSON

型の定義はすべて `src/episodes/index.ts` にあります。ひな形は `templates/episode-short-paper.json`。

### 主なキー
| キー | 内容 |
| --- | --- |
| `id` / `title` | コンポジション ID / 動画タイトル |
| `format` | `"short"` で縦型 1080×1920。省略で横型 1920×1080 |
| `look` | ショートの見た目（下表） |
| `series` / `headline` | 画面上部のシリーズ名・見出し |
| `pr` | アフィリエイト等を含むなら `true`（画面に「PR」、概要欄に広告表記） |
| `source` / `sources` | 出典（概要欄に載る）。複数なら `sources: [{label, url}]` |
| `bgm` / `bgmVolume` | BGM と音量（既定 0.12。紙面版は 0.067 ≒ -5dB） |
| `voice` | `{speed, pre, post}` 話速と前後の無音（秒） |
| `voiceDict` | VOICEVOX ユーザー辞書 `[{surface, pronunciation, accent_type}]` |
| `readings` | 読み替え `{表記: 読み}`。`65W`→ワット、`130g`→グラム は自動 |
| `character` | 立ち絵（表情ごとの画像、口パク用 `talk`、`spriteHeight`、クレジット） |
| `sounds` / `soundCredit` | 効果音（キー → ファイル）とクレジット |
| `slides` | スライドの配列 |
| `description` / `hashtags` / `links` | 概要欄 |

### ショートの見た目（`look`）
| 指定 | 見た目 |
| --- | --- |
| 省略 | 明るい背景＋白いカード、字幕の横に「ず」アイコン（`ai-hallucination`） |
| `{"theme":"dark","layout":"kit","background":…,"banner":…}` | 暗い背景画像＋タイトル帯画像、縁取り字幕（素材キット用） |
| `{"theme":"paper","layout":"paper","label":"AIモデル検証レポート"}` | **紙面・レポート風**。生成り白、文字・数字・罫線だけ（`gemini4-neon`） |

### スライド共通のキー
`text`（字幕の予備・横型ではテロップ）、`speech`（読み上げ＝紙面では字幕）、`cite`（出典。図解の近くに表示）、
`expression`（立ち絵の表情キー）、`se`（切り替え時の効果音キー）、`voiceSpeed`（このスライドだけ話速を変える）、`chapter`（横型の概要欄目次）。

### スライドの種類（`type`）
| type | 用途 | 主なキー |
| --- | --- | --- |
| `hook` | 冒頭の問い | `headline`（`\n` 改行、`【】` で強調）, `sub` |
| `source` | 資料の紹介 | `org`, `date`, `title`, `titleJa`, `summary` |
| `versus` | 2つの比較 | `left`/`right`: `{label, value, lines, metrics:[{label,value}], tone}`, `lead`, `leadNote`, `leadTone`, `note` |
| `ranking` | スコアの順位 | `title`, `rows:[{label, sub, value, highlight}]`, `unit`, `note` |
| `stacked` | 100% 積み上げ横棒 | `series:[{label,tone}]`, `rows:[{label, values}]`, `note` |
| `flow` | 流れ図 | `steps:[{label, sub, tone}]` |
| `emphasis` | 大きな一言 | `big`（`【】` 強調）, `sub` |
| `points` | チェックリスト・まとめ | `items:[{label, body}]` |
| `illust`（省略） | イラスト（横型） | `image` |
| `bars` / `table` | 横型用のグラフ・表 | `bars` / `columns`, `rows` |

`tone` は `good`（強調色）／`bad`（警告色）／`neutral`。紙面デザインでは `good`=深緑、`bad`=臙脂。

---

## 5. 音声（VOICEVOX）

```bash
python3 scripts/generate_voice.py <id>                 # VOICEVOX が起動していれば VOICEVOX、なければ Open JTalk
python3 scripts/generate_voice.py <id> --speaker 1     # ずんだもん（あまあま）
```

- 話者はずんだもん（ノーマル）= `speaker 3`。話速は 1.2 が基本、ショートの冒頭だけ 1.3 前後。
- エピソードの `voice.pre` / `voice.post`（前後の無音）を 0.05 にするとテンポが上がる。
- 出力: `public/voice/<id>/NNN.wav` と `captions.json`（字幕の切り替えタイミング）。
  字幕の区切りごとの長さは VOICEVOX のモーラ長の比で按分している。
- **読みの確認方法**（VOICEVOX 起動中）:
  ```bash
  curl -s -X POST "http://127.0.0.1:50021/audio_query?speaker=3&text=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("白紙なら必ず0点なのだ"))')" | python3 -c "import sys,json;print(json.load(sys.stdin)['kana'])"
  ```
  `'` がアクセント位置、`/` が区切り。ここで読み間違いが分かる。
- 実際にあった誤読と対処:
  | 語 | 問題 | 対処 |
  | --- | --- | --- |
  | 0点 | 「ゼロテン」 | `readings: {"0点": "れいてん"}` |
  | アンチグラビティ | アクセントで「アンチブラビティ」に聞こえる | `voiceDict: [{"surface":"アンチグラビティ","pronunciation":"アンチグラビティ","accent_type":5}]` |
  | o4-mini / モデル名 | 英字読み | `readings` でカタカナに |
- `voiceDict` は音声生成のたびに VOICEVOX のユーザー辞書へ自動登録（更新）される。

---

## 6. デザイン

### 紙面・レポート風（Editorial Paper）のルール
- 色は7色だけ: 背景 `#F7F6F2`、文字 `#1C1C1C`、補助 `#6B6B6B`、罫線 `#D6D3CD`、強調 `#1E5631`（主役・ランキングだけ）、警告 `#9B2C2C`（注意点のカットだけ）、非強調バー `#D1CEC7`。
- **引き算**: 枠、丸角の入れ子、太い色枠、影、グラデーション、OS 絵文字は使わない。図解は文字・数字（等幅数字）・1px 罫線・単色の棒だけ。
- タイトルは Noto Serif JP、本文・字幕は Noto Sans JP。数字は大きく（主役 150px 前後）。
- 配置（1080×1920）: 左余白 68px、右余白 170px（Shorts の UI アイコン）。ヘッダー Y=100〜235、図解 Y=260〜1280、出典は右下 Y≈1240、字幕 Y=1310〜1510、立ち絵 Y=1520〜（顔は Y=1720 より上に）。
- 実装: `src/components/paper/`。色と配置は `theme.ts` の `PAPER`。

### Shorts の安全領域（どのデザインでも）
- 上 0〜80px（ステータスバー）、右 150〜170px（いいね等のボタン）、下 250〜300px（タイトル・チャンネル名）には**重要な文字を置かない**。
- 静止画を書き出して確認するのが確実: `npx remotion still <id> out/check.png --frame=<フレーム>`

### よくある見た目の崩れ
- 字幕の句点だけが次の行に落ちる → 文字サイズを行の長さから自動調整済み。それでも起きるなら読点を入れて短く区切る。
- 「Gemini 4 / Neon」のように名前の途中で改行 → `word-break` を通常にして日本語の位置で折り返すようにしてある。
- 図解が縦に収まらずヘッダーに食い込む → 中身を減らす（行数・注記）。レイアウトは上から詰める（`justify-content: safe center`）。

---

## 7. 立ち絵・表情・口パク

- **公式イラスト**（`npm run assets` で取得）: 東北ずん子・ずんだもんプロジェクトの配布画像。1枚＝1ポーズ。
- **坂本アヒル「ずんだもん立ち絵素材」**（PSD、PSDTool 形式）: デフォルメ絵。表情・腕・口を組み合わせられる。
  ```bash
  pip install psd-tools
  python3 scripts/build_character.py <ずんだもん立ち絵素材2.3.psd>
  ```
  `public/characters/zundamon-ahiru/<表情>.png`（口閉じ）と `<表情>_talk.png`（口開き）を書き出す。全表情を同じ範囲で切り抜くので、切り替えても位置がずれない。
  表情の定義は `scripts/build_character.py` の `EXPRESSIONS`（レイヤー名で指定）。
- スライドの `expression` で表情を切り替える。おすすめの割り当て:
  フック=`question`（考える）／説明=`normal`／好成績=`happy`（手を振る）／注意点=`alert`（指差し・汗）／締め=`wink`。
- 口パク: `talk` 画像があると、字幕のタイミングで話している間だけ口の開閉を4フレームごとに切り替える。

---

## 8. 音（BGM・効果音）

- 声が最優先。BGM は 0.067〜0.12（-5dB 下げると聞き取りやすさがかなり上がる）。効果音は 0.35。
- 効果音はスライドの切り替えで鳴らす。役割の例（効果音ラボ）:
  | キー | 場面 | 音 |
  | --- | --- | --- |
  | `impact_soft` | フック | クイズ出題「デデン」 |
  | `slide_in` | 図解の切り替え | 柔らかい「ポン」 |
  | `chime_up` | 好成績 | 鉄琴の正解音 |
  | `alert_soft` | 注意点 | 警告音 |
  | `outro_chime` | まとめ | 明るい決定音 |

---

## 9. 素材と規約（公開前に必ず確認）

| 素材 | 条件の要点 | 概要欄 |
| --- | --- | --- |
| VOICEVOX ずんだもん | クレジット必須 | `VOICEVOX:ずんだもん` |
| 東北ずん子・ずんだもんプロジェクト（キャラクター・公式イラスト） | 個人クリエイターは非商用で自由。個人の YouTube 広告・スパチャは非商用の範囲。**企業等のスポンサー案件は有償ライセンス**。https://zunko.jp/guideline.html | 推奨 |
| 坂本アヒル「ずんだもん立ち絵素材」 | 公式規約に準じて商用・改変可。クレジット任意。**再配布不可** | 推奨 |
| 効果音ラボ | 商用・収益化可、クレジット任意。**再配布禁止、効果音を紹介する動画は不可、Content ID 登録不可** | 任意 |
| 甘茶の音楽工房 | 商用可・クレジット任意。**再配布禁止、Content ID 登録不可** | 任意 |
| いらすとや | 商用は1作品20点まで等。https://www.irasutoya.com/p/terms.html | 任意 |
| Noto Serif/Sans JP、M PLUS Rounded 1c | SIL OFL 1.1（同梱可） | 不要 |

- 再配布禁止の素材は Git やこの zip に入れない（`.gitignore` 済み）。各自が配布元から取得する。
- 他チャンネルの動画のキャラクター絵は、似ていても**その絵自体は使わない**。配布素材から探す。
- アフィリエイトや PR を含む動画は `pr: true`（ステマ規制対応）。

---

## 10. つまずきやすい点

| 症状 | 原因と対処 |
| --- | --- |
| `generate_voice.py` が Open JTalk で読む | VOICEVOX が起動していない。アプリを起動（またはDocker）して `--engine voicevox` |
| 音声を作り直したのに字幕がずれる | `captions.json` も同時に作り直される。Studio を再読み込み |
| レンダリングで BGM が見つからない | `npm run assets` を実行していない |
| 立ち絵が出ない | `public/characters/...` に画像がない。`npm run assets` か `build_character.py` |
| ショートが60秒を超えた | 読み上げ文を削る。`voice.pre/post` を 0.05 に、ショートは前後の間も短く設定済み |
| `npm run assets` で一部失敗 | 配布元に接続できない素材は FAIL と表示して次へ進む。手動でダウンロードして置けばよい |

---

## 11. 過去の制作から学んだこと

- **台本の数値は必ず一次資料と照合する。** 素材キットの図解に、確認できない点数や資料間で食い違う数値が入っていたことがあった。確認できたものだけで図解を作り直した。
- **初稿は尺オーバーしがち。** 音声を作ったら合計秒数を見て、読み上げ文を短くする（63.8秒 → 52.5秒に調整した例あり）。
- **字幕は「一度に全部」より「フレーズ単位」の方が読まれる。** 2〜3秒ごとに切り替える。
- **装飾を減らすほど数字が伝わる。** 紙面デザインでは影・枠・絵文字をやめ、主役の数字だけを大きく・色付きにした。
- **注意点のカットには「なぜそうなるか」を1行添える。**（例: 思考トークンも出力として課金されるため、出力が増えると費用が膨らむ）
- 静止画を数枚書き出して並べて見ると、崩れに早く気づける。
