# 睡眠の雑学（Remotion）

白い背景に **テロップ（上）＋イラスト（中央）** を置き、**AI音声がテロップを読み上げ**、**BGM** が流れるシンプルな雑学動画です。

- コンポジション: `SleepTrivia`（1920×1080 / 30fps）
- 動画の長さは読み上げ音声の長さから自動で決まります（現在 約2分8秒・24枚）

## 使い方

```bash
npm install
npm run assets  # いらすとやの画像とフリーBGMをダウンロード（最初に1回）
npm run voice   # テロップを ずんだもん で読み上げて public/voice/*.wav を作成（VOICEVOX を起動しておく）
npm run dev     # Remotion Studio でプレビュー
npm run build   # out/sleep-trivia.mp4 を書き出し
```

## 台本を変える

`src/script.json` の `slides` を編集します。1要素が1枚（1テロップ）です。

| キー | 内容 |
| --- | --- |
| `text` | 画面に出すテロップ |
| `speech` | （任意）読み上げ用の文。数字や記号の読みを直したいときに使う |
| `image` | `public/illustrations/` に置く画像ファイル名 |

編集したら `npm run voice` で音声を作り直してください。

## AI音声（ずんだもん）

ナレーションは [VOICEVOX](https://voicevox.hiroshiba.jp/) の **ずんだもん（ノーマル）**、話す速さ **1.2倍** です。
VOICEVOX アプリを起動した状態で `npm run voice` を実行すると作り直せます。

```bash
python3 scripts/generate_voice.py --speed 1.3     # もっと速く
python3 scripts/generate_voice.py --speaker 1     # ずんだもん（あまあま）
python3 scripts/generate_voice.py --speaker 2     # 四国めたん（ノーマル）
```

**公開時は概要欄に `VOICEVOX:ずんだもん` のクレジットが必要です。**
VOICEVOX が起動していないときは Open JTalk（`pip install pyopenjtalk numpy`）で代わりに読み上げます。

## イラスト（いらすとや）

使うイラスト（19点）は `src/script.json` の `illustrations` に、いらすとやでの名前と画像URLつきで書いてあります。
`npm run assets` でまとめて `public/illustrations/` に保存されます。
別のイラストに変えたいときは、画像を `public/illustrations/` に置いて各スライドの `image` をそのファイル名にしてください。
画像がないスライドは絵文字の仮イラストになります（Studio ではどの画像を置くかも表示されます）。

> いらすとやの素材は再配布が禁止されているため、`public/illustrations/` の画像は `.gitignore` でコミット対象外にしています。
> 商用利用は 1 作品につき 20 点までなど規約があるので、[利用規約](https://www.irasutoya.com/p/terms.html) を確認してください。

## BGM

[甘茶の音楽工房](https://amachamusic.chagasi.com/) の「[天使の夢](https://amachamusic.chagasi.com/music_tenshinoyume.html)」（オルゴール・癒し）を使っています。
商用利用可・クレジット表記は任意です（書く場合は「甘茶の音楽工房」）。
再配布は禁止のため Git には含めず、`npm run assets` で `public/bgm/` にダウンロードします。

曲を変えるときは `src/script.json` の `bgm` を書き換えてください。音量は `src/theme.ts` の `BGM_VOLUME` です。

## フォント

`public/fonts/` に M PLUS Rounded 1c を同梱（SIL Open Font License 1.1）。
