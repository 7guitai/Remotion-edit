# ずんだもん解説動画（Remotion）

白い背景に **テロップ（上）＋イラストや図（中央）** を置き、**ずんだもん（VOICEVOX）が読み上げ**、**BGM** が流れる解説動画を作るプロジェクトです。

`src/episodes/<id>.json` の1ファイルが1本の動画です（コンポジションIDは `id`）。

| id | 内容 | 長さ |
| --- | --- | --- |
| `sleep-trivia` | 睡眠の雑学 | 約2分9秒 |
| `autumn-trivia` | 秋の雑学（クイズ3問入り） | 約2分22秒 |
| `love-trivia-short` | 恋愛の雑学（縦型ショート・クイズ1問入り） | 約50秒 |
| `animal-trivia-long` | 寝る前に聞きたい 動物の雑学63選（横長・1ページ1雑学＋解説、全6章） | 約8分44秒 |
| `money-trivia-short` | お金の雑学7選（縦型ショート・1ページ1雑学、声は青山龍星） | 約44秒 |
| `charger-power-split` | PCとスマホを同時充電する充電器の選び方（[OCHA NOTE の記事](https://ochanote.com/articles/laptop-phone-charger-power-split/)を動画化） | 約4分12秒 |

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

### エピソード JSON

| キー | 内容 |
| --- | --- |
| `id` / `title` | コンポジションID / 動画タイトル |
| `format` | `"short"` で縦型（1080×1920）の YouTube ショート。画面上部にタイトルの帯が出て、テロップは3行まで |
| `titleBand` | `false` でショート上部のタイトル帯を消す |
| `background` | 背景色（省略時は白） |
| `voice` | 読み上げの声 `{speaker, speed, name}`（省略時はずんだもん・1.2倍）。`name` は概要欄のクレジットに入る |
| `accent` / `marker` | 強調の色（テロップの強調・番号・カウントダウン・ショートのタイトル帯）。省略するとオレンジ |
| `pr` | `true` なら画面左上に「PR」を表示し、概要欄に広告表記を入れる（アフィリエイトを含む動画は必須） |
| `source` | 元記事（概要欄にリンク） |
| `bgm` | BGM（ファイル名・曲名・クレジット・取得URL）。OpenTracks（旧DOVA-SYNDROME）の曲は `url` の代わりに `opentracks`（曲番号）を書く |
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
| `quiz` | クイズの選択肢（A/B/C…） | `choices`, `answer`（正解の番号。0 始まり） |
| `trivia` | 1ページ1雑学（ショート向け）。上に `text`（振り）、中央にイラスト、読み上げのあと下に `answer`（答え）を出す。文字は黒＋白フチの極太 | `image`, `answer`, `answerSpeech`, `note`（読み上げない補足）, `explain` / `explainSpeech`（答えのあとに読み上げる解説） |

- **クイズ**：`answer` のない `quiz` は出題スライドで、読み上げのあとに3秒のカウントダウン（「考えてみて！」＋効果音）が入ります。
  次のスライドを同じ `choices` と `answer` 付きの `quiz` にすると、正解の選択肢が赤くなり「〇」と「ピンポーン」で発表します。
- **強調**：テロップの `**〜**` はオレンジ色＋マーカーで強調されます（読み上げでは記号を読みません）。
- **雑学の番号**：スライドに `no` を付けると、次の `chapter` まで画面左上に「雑学 No.○」と進み具合のドットを表示します。

## AI音声（ずんだもん）

[VOICEVOX](https://voicevox.hiroshiba.jp/) の **ずんだもん（ノーマル）**、話す速さ **1.2倍** です。

```bash
python3 scripts/generate_voice.py <id> --speed 1.3     # もっと速く
python3 scripts/generate_voice.py <id> --speaker 1     # ずんだもん（あまあま）
```

**公開時は概要欄に `VOICEVOX:ずんだもん` のクレジットが必要です**（`npm run description` の出力に含まれます）。
VOICEVOX が起動していないときは Open JTalk（`pip install pyopenjtalk numpy`）で代わりに読み上げます。

## イラスト（Microsoft Fluent Emoji）

いらすとやは商用利用だと1作品20点までなので、それ以上必要な動画では [Fluent Emoji](https://github.com/microsoft/fluentui-emoji)（MIT License）の「Color」SVG も使っています。
`illustrations` に `credit` を書いた素材は、概要欄のクレジットにまとめて表示されます。

## イラスト（いらすとや）

`npm run assets` で `public/illustrations/` に保存されます。
商用利用は 1 作品につき 20 点までなど規約があるので、[利用規約](https://www.irasutoya.com/p/terms.html) を確認してください。
素材の再配布は禁止のため、画像は `.gitignore` でコミット対象外にしています。

## BGM（OpenTracks（旧DOVA-SYNDROME））

`money-trivia-short` は もっぴーさうんど「Escort」を使っています。OpenTracks の[音源利用ライセンス](https://opentracks.com/)に沿って使ってください（クレジット表記は任意）。
再配布は禁止のため Git には含めず、`npm run assets` でダウンロードします。

## BGM（甘茶の音楽工房）

[甘茶の音楽工房](https://amachamusic.chagasi.com/) の曲を使っています（商用利用可・クレジット任意）。
再配布は禁止のため Git には含めず、`npm run assets` で `public/bgm/` にダウンロードします。
この曲を使った動画を YouTube の Content ID に登録することは禁止されています。

## 効果音

`public/sfx/` のクイズ用効果音は `python3 scripts/make_sfx.py` で合成した自作の音です（Git に含めています）。

## フォント

`public/fonts/` に M PLUS Rounded 1c（Medium / ExtraBold / Black）を同梱（SIL Open Font License 1.1）。
