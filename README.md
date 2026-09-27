# 睡眠の雑学 10選（Remotion）

夜空をテーマにした「睡眠に関する雑学」動画を Remotion で作成するプロジェクトです。

- `SleepTrivia` … 通常動画 1920×1080（約95秒 / 30fps）
- `SleepTriviaShorts` … YouTube ショート用 1080×1920

## 構成

| パート | 内容 |
| --- | --- |
| オープニング | 「知らないと損する！？ 睡眠の雑学 10選」 |
| 雑学 ×10 | 番号バッジ → 絵文字アイコン＋見出しテロップ → キーワードのスタンプ → 補足説明の吹き出し |
| エンディング | 「おやすみなさい」＋ 高評価・チャンネル登録の呼びかけ |

## 使い方

```bash
npm install
npm run dev            # Remotion Studio でプレビュー
npm run build          # out/sleep-trivia.mp4 を書き出し
npm run build:shorts   # out/sleep-trivia-shorts.mp4 を書き出し
```

## カスタマイズ

- 雑学の内容: `src/data.ts` の `TRIVIA` を編集（件数を変えると尺も自動で変わります）
- 各パートの長さ: `src/data.ts` の `OPENING_FRAMES` / `TRIVIA_FRAMES` / `ENDING_FRAMES`
- 色・フォント: `src/theme.ts`
- BGM やナレーションを入れる場合は `public/` に音声を置き、`src/SleepTrivia.tsx` に `<Audio src={staticFile("bgm.mp3")} />` を追加

## フォント

`public/fonts/` に同梱（SIL Open Font License 1.1）。

- M PLUS Rounded 1c
- Dela Gothic One
