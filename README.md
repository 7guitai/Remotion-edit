# ずんだもん解説動画（Remotion）

> 物理シミュレーションShorts「PHYSICS LAB」は別プロジェクトとして [`physics-lab/`](physics-lab/README.md) にあります。

白い背景に **テロップ（上）＋イラストや図（中央）** を置き、**ずんだもん（VOICEVOX）が読み上げ**、**BGM** が流れる解説動画を作るプロジェクトです。

`src/episodes/<id>.json` の1ファイルが1本の動画です（コンポジションIDは `id`）。

| id | 内容 | 長さ |
| --- | --- | --- |
| `sleep-trivia` | 睡眠の雑学 | 約2分9秒 |
| `charger-power-split` | PCとスマホを同時充電する充電器の選び方（[OCHA NOTE の記事](https://ochanote.com/articles/laptop-phone-charger-power-split/)を動画化） | 約4分12秒 |

## 縦型ショート（掛け合い形式）

`src/shorts/<id>/script.json` の1ファイルが1本の縦型ショート（1080×1920）。ずんだもん＋四国めたんの掛け合いで、テロップ・カード演出・効果音つき。立ち絵は PSD のパーツを重ねて、口パク（音量連動）・まばたき・表情／ポーズ切り替えをしている（表情は `script.json` の `characters.*.psd.faces`）。

| id | 内容 | 長さ |
| --- | --- | --- |
| `ai-subscription-short` | いま契約するべきAI 目的別3選（2026年11月版） | 約72秒 |
| `orca-short` | AIエージェントを並列で動かすアプリ「Orca」の解説 | 約61秒 |

共通部品（立ち絵・テロップ・タイムライン・効果音・ロゴ）は `src/shorts/common/` と `public/shorts/common/` にある。

```bash
python3 scripts/download_short_assets.py ai-subscription   # BGM を取得
pip install psd-tools
python3 scripts/export_psd_parts.py <ずんだもん立ち絵素材2.3.zip> <四国めたん立ち絵素材2.1.zip>  # 立ち絵パーツを書き出し（全短編共通）
python3 scripts/generate_short_voice.py ai-subscription    # VOICEVOX で音声＋timing.json を作成
python3 scripts/make_sfx.py                                # 効果音を合成（コミット済み）
node scripts/capture_pricing.js ai-subscription            # 各社の公式料金ページを撮影（背景・プラン紹介で使用）
python3 scripts/fetch_orca_assets.py                       # orca-short 用：Orca 公式リポジトリ（MIT）の画面素材とデモ動画
npx remotion render ai-subscription-short out/ai-subscription-short.mp4
# ショート向けに音量を -14 LUFS にそろえる
ffmpeg -i out/ai-subscription-short.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/ai-subscription-short-final.mp4
```

デザインは参考動画にならい、明るい背景（撮影した公式ページをぼかして敷く）＋白カード＋暗色のテロップ枠＋画面下に小さく立つキャラ。フォントは Noto Sans JP（OFL）。

クレジット（概要欄）: `VOICEVOX:ずんだもん` `VOICEVOX:四国めたん` / 立ち絵: 坂本アヒル（ずんだもん立ち絵素材2.3・四国めたん立ち絵素材2.1）/ BGM: 甘茶の音楽工房「ピコピコディスコ」/ ロゴ: Simple Icons。
立ち絵は再配布禁止のため Git に含めない。料金は `script.json` に直書きなので、公開前に各公式サイトで最新か確認すること。

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
