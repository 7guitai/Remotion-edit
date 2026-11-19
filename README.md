# ずんだもん解説動画（Remotion）

> 物理シミュレーションShorts「PHYSICS LAB」は別プロジェクトとして [`physics-lab/`](physics-lab/README.md) にあります。

白い背景に **テロップ（上）＋イラストや図（中央）** を置き、**ずんだもん（VOICEVOX）が読み上げ**、**BGM** が流れる解説動画を作るプロジェクトです。

`src/episodes/<id>.json` の1ファイルが1本の動画です（コンポジションIDは `id`）。

| id | 内容 | 長さ |
| --- | --- | --- |
| `sleep-trivia` | 睡眠の雑学 | 約2分9秒 |
| `charger-power-split` | PCとスマホを同時充電する充電器の選び方（[OCHA NOTE の記事](https://ochanote.com/articles/laptop-phone-charger-power-split/)を動画化） | 約4分12秒 |
| `ai-hallucination` | 【縦型ショート】AIはなぜ自信満々にウソをつく？（[OpenAI の論文](https://openai.com/index/why-language-models-hallucinate/)を図解） | 約58秒 |
| `gemini4-neon` | 【縦型ショート・紙面風】Gemini 4 Neon の実力と注意点 | 約46秒 |
| `gemini4-hydrogen` | 【縦型ショート・紙面風】無料でも使える Gemini 4 Hydrogen の実力と注意点 | 約54秒 |

## 使い方

```bash
npm install
npm run assets                          # いらすとやの画像とフリーBGMをダウンロード（最初に1回）
npm run voice -- charger-power-split    # ずんだもんで読み上げ音声を作成（VOICEVOX を起動しておく）
npm run dev                             # Remotion Studio でプレビュー
npx remotion render charger-power-split out/charger-power-split.mp4
npm run description -- charger-power-split   # 概要欄（目次・クレジット付き）を out/ に作成
```

## 新しい動画を作る

1. `src/episodes/` に JSON を追加し、`src/episodes/index.ts` の `EPISODES` に登録する
2. `npm run assets` → `npm run voice -- <id>` → レンダリング

### 縦型ショート（AI解説シリーズ「AIのウラ側」）

エピソード JSON に `"format": "short"` を付けると 1080×1920 の縦型になります。
画面上部にシリーズ名（`series`）と見出し（`headline`）、中央に図解カード、下にずんだもんの字幕、最下部に出典（スライドごとの `cite`）が出ます。
図解の種類は `hook`（問いかけ）・`source`（資料カード）・`versus`（2つの比較）・`flow`（流れ図）・`stacked`（100%積み上げ横棒）・`emphasis`（強調）・`points`（チェックリスト）です（型は `src/episodes/index.ts`）。

```bash
python3 scripts/gemini_produce.py drafts/ai-hallucination.md --id ai-hallucination --format short --title "..."
python3 scripts/generate_voice.py ai-hallucination --speed 1.3   # ショートは少し速め
npx remotion render ai-hallucination out/ai-hallucination.mp4
```

60秒以内に収めるため、台本は9スライド・読み上げ合計55秒程度を目安にします。

#### 紙面・レポート風（Editorial Paper）

`"look": { "theme": "paper", "layout": "paper", "label": "AIモデル検証レポート" }` で、生成り白の紙面に文字・数字・1px罫線・単色の棒グラフだけで組む質素なデザインになります（`src/components/paper/`）。
- 字幕は `scripts/generate_voice.py` が書き出す `public/voice/<id>/captions.json` を使い、発話に合わせて2〜3秒ごとのフレーズで切り替わります
- エピソードの `voice`（話速・前後の無音）、スライドの `voiceSpeed`（冒頭だけ速くする等）、`voiceDict`（VOICEVOX ユーザー辞書。例: アンチグラビティのアクセント）、`bgmVolume` で音を調整できます
- 読み上げ文（`speech`）は字幕にそのまま出るので、モデル名などは英語表記で書き、読みは `readings` で指定します
- フォントは Noto Serif JP（タイトル）と Noto Sans JP（本文）を `public/fonts/` に同梱（SIL OFL 1.1）

#### 立ち絵（坂本アヒル「ずんだもん立ち絵素材」）

`gemini4-neon` は坂本アヒルさんのデフォルメ立ち絵を使います（公式ガイドラインに準じて商用利用・改変可、クレジット任意）。
再配布はしないため Git には含めません。pixiv の配布ページから PSD をダウンロードし、表情ごとの PNG（口を閉じた絵と開けた絵）を書き出してください。

```bash
pip install psd-tools
python3 scripts/build_character.py <ダウンロードした ずんだもん立ち絵素材2.3.psd>
```

表情（normal / question / happy / alert / wink）とレイヤーの組み合わせは `scripts/build_character.py` の `EXPRESSIONS` で変えられます。話している間は口を開けた絵と交互に表示します（口パク）。

### Gemini に制作させる（台本 → エピソード JSON）

台本（Markdown）を `drafts/<id>.md` に書き、Gemini（既定は `gemini-4-hydrogen`）にスライド構成・テロップ・読み上げ文・図表・イラスト選び・読み替え辞書を組み立てさせます。
出力は `src/episodes/<id>.json` に書き出され、`src/episodes/index.ts` にも登録されます。

```bash
GEMINI_API_KEY=<AI Studio のキー> python3 scripts/gemini_produce.py drafts/<id>.md --id <id> --title "動画タイトル"
```

- 混雑（503）やレート制限（429）のときは自動で待って再試行します。`--model gemini-3.5-flash` などで別モデルも使えます
- イラストは `irasutoya`（探す画像名）と仮の絵文字だけ入るので、URL は人が確認して入れてください
- 出力は下書きです。数値・事実が台本どおりかを必ずレビューしてください

### エピソード JSON

| キー | 内容 |
| --- | --- |
| `id` / `title` | コンポジションID / 動画タイトル |
| `pr` | `true` なら画面左上に「PR」を表示し、概要欄に広告表記を入れる（アフィリエイトを含む動画は必須） |
| `source` | 元記事（概要欄にリンク） |
| `bgm` | BGM（ファイル名・曲名・クレジット・取得URL） |
| `readings` | 読み上げの読み替え（例: `"USB-C": "ユーエスビーシー"`）。`65W`→「65ワット」、`130g`→「130グラム」は自動 |
| `illustrations` | いらすとや の画像（ファイル名 → 名前・URL・仮表示の絵文字） |
| `slides` | スライドの配列（下記） |
| `description` / `links` / `hashtags` | 概要欄に入れる紹介文・商品リンク・ハッシュタグ |

### スライドの種類

どのスライドも `text`（テロップ）と任意の `speech`（読み上げ文）、`chapter`（概要欄の目次見出し）を持てます。
テロップは `\n` で改行でき、3行以上になりそうなときは自動で文字が小さくなります。

| `type` | 中央に表示するもの | 追加のキー |
| --- | --- | --- |
| （省略）/ `illust` | イラスト | `image` |
| `bars` | PC／スマホの配分などを比べる積み上げ横棒グラフ | `bars: [{label, sub, pc, phone}]`, `note` |
| `table` | 比較表 | `columns`, `rows`, `note` |
| `points` | ラベル付きの箇条書き（結論・チェックポイント） | `items: [{label, body}]` |

## AI音声（ずんだもん）

[VOICEVOX](https://voicevox.hiroshiba.jp/) の **ずんだもん（ノーマル）**、話す速さ **1.2倍** です。

```bash
python3 scripts/generate_voice.py <id> --speed 1.3     # もっと速く
python3 scripts/generate_voice.py <id> --speaker 1     # ずんだもん（あまあま）
```

**公開時は概要欄に `VOICEVOX:ずんだもん` のクレジットが必要です**（`npm run description` の出力に含まれます）。
VOICEVOX が起動していないときは Open JTalk（`pip install pyopenjtalk numpy`）で代わりに読み上げます。

## イラスト（いらすとや）

`npm run assets` で `public/illustrations/` に保存されます。
商用利用は 1 作品につき 20 点までなど規約があるので、[利用規約](https://www.irasutoya.com/p/terms.html) を確認してください。
素材の再配布は禁止のため、画像は `.gitignore` でコミット対象外にしています。

## BGM（甘茶の音楽工房）

[甘茶の音楽工房](https://amachamusic.chagasi.com/) の曲を使っています（商用利用可・クレジット任意）。
再配布は禁止のため Git には含めず、`npm run assets` で `public/bgm/` にダウンロードします。
この曲を使った動画を YouTube の Content ID に登録することは禁止されています。

## フォント

`public/fonts/` に M PLUS Rounded 1c を同梱（SIL Open Font License 1.1）。
