# 睡眠の雑学（Remotion）

白い背景に **テロップ（上）＋イラスト（中央）** を置き、**AI音声がテロップを読み上げ**、**BGM** が流れるシンプルな雑学動画です。

- コンポジション: `SleepTrivia`（1920×1080 / 30fps）
- 動画の長さは読み上げ音声の長さから自動で決まります（現在 約2分18秒・24枚）

## 使い方

```bash
npm install
pip install pyopenjtalk numpy   # 音声・BGM を作り直すときだけ必要

npm run voice   # src/script.json のテロップを読み上げて public/voice/*.wav を作成
npm run bgm     # public/bgm/bgm.mp3（オリジナルBGM）を作成
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

## AI音声

`scripts/generate_voice.py` は次の順で読み上げエンジンを選びます。

1. **VOICEVOX**（推奨）: VOICEVOX アプリを起動しておくと自動で使われます。
   話者は `python3 scripts/generate_voice.py --speaker 3` のように ID で指定（3 = ずんだもん ノーマル、2 = 四国めたん ノーマル）。
   公開時は概要欄に「VOICEVOX:ずんだもん」などのクレジットが必要です。
2. **Open JTalk**（pyopenjtalk）: VOICEVOX がないときの予備。オフラインで動きます。

## イラスト（いらすとや）

`src/script.json` の `illustrations` に、ファイル名と探す画像の目安が書いてあります。
[いらすとや](https://www.irasutoya.com/) から画像を保存し、同じファイル名で `public/illustrations/` に置いてください。
画像がないスライドは絵文字の仮イラストになります（Studio ではどの画像を置くかも表示されます）。

> いらすとやの素材は再配布が禁止されているため、`public/illustrations/` の画像は `.gitignore` でコミット対象外にしています。
> 商用利用は 1 作品につき 20 点までなど規約があるので、[利用規約](https://www.irasutoya.com/p/terms.html) を確認してください。

## BGM

`public/bgm/bgm.mp3` がループ再生されます（音量は `src/theme.ts` の `BGM_VOLUME`）。
同梱の BGM は `scripts/generate_bgm.py` で合成したオリジナル曲なので自由に使えます。
DOVA-SYNDROME などのフリーBGMを使う場合は、その曲を `public/bgm/bgm.mp3` として置き換えてください。

## フォント

`public/fonts/` に M PLUS Rounded 1c を同梱（SIL Open Font License 1.1）。
