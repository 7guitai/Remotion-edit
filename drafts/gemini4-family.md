# Gemini 4 の4モデル、どれを使う？選び方ガイド（ショート・約55秒）

- 形式: 縦型ショート（1080×1920）、ずんだもん単体解説
- シリーズ名: AIモデル検証レポート
- 見た目: 紙面・レポート風（paper）、坂本アヒル版立ち絵（口パク・まばたき）
- 音: BGM シンプルスタイル（音量 0.067、ナレーション中は 0.55 倍に下げる）、効果音あり
- 制作日: 2026年11月19日（Argon・Carbon の導入価格終了まで11日）

## 出典（確認済み・すべて直接閲覧）
- [公式] Google「Gemini 4 Argon is now available for everyone」2026年10月13日
  https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/
  - 導入価格 入力 $2・出力 $10（100万トークンあたり）。2026年11月30日の導入期間終了後は $4・$20
  - Gemini API の有料枠で利用
- [公式] Google「Gemini 4 Carbon is now available」2026年11月10日
  https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/
  - 導入価格は Argon と同じ $2・$10、11月30日の終了後は $4・$20。Gemini API の有料枠
  - 「大半のソフトウェア開発・知的作業には Argon が最適。Carbon はモデルの知能の限界を試すタスク向けで、Argon より多くのトークンを使う」
- [公式] Google「Introducing Gemini 4 Hydrogen」2026年11月12日
  https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/
  - $1.50・$7.50。AI Studio・Gemini API のすべての枠で利用可。素早い実行向け
- [公式] Google「Introducing Gemini 4 Neon」2026年11月18日
  https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/
  - $3・$15。「最先端レベルの知能と、速いタスク完了」
- [第三者] Artificial Analysis（各モデルのページ）
  - 総合指数: Neon（xhigh）61、Carbon（high）60、Hydrogen（xhigh）54、Argon（high）50
  - 1タスクの時間: Hydrogen 15.2分、Neon 21.5分、Argon 29.5分、Carbon 36.6分

## 外したもの
- 1タスクの費用の4モデル比較: Artificial Analysis でも Carbon は導入期間後の価格（$4/$20）、Argon は導入価格（$2/$10）で計算されていて基準がそろわないため
- Neon の無料枠の有無: 公式で確認できなかったため（表に「無料枠」列を作らない）
- 「無料枠があるのは Hydrogen だけ」: 二次情報のみ

## 1. フック（3〜4秒）
- 画面: hook「Gemini 4\n【4兄弟】の選び方」、sub「公式発表と第三者評価から整理」
- ずんだもん: Gemini 4は4種類。どれを使えばいいのだ？
- 表情: question / 効果音: impact_soft

## 2. 公式の料金（一覧表）
- 画面: table（列: モデル／一般提供／入力／出力、100万トークンあたり）
  - Hydrogen | 11/12 | $1.50 | $7.50（強調）
  - Neon | 11/18 | $3 | $15
  - Argon | 10/13 | $2※ | $10※
  - Carbon | 11/10 | $2※ | $10※
  - 注記: ※導入価格（11月30日まで）。Hydrogen は無料枠でも利用可
- ずんだもん: 公式の料金は、Hydrogenがいちばん安い入力1.5ドル。Neonは3ドル、ArgonとCarbonは今は2ドルなのだ。
- 出典: Google公式ブログ（各モデルの発表）
- 表情: normal / 効果音: slide_in

## 3. 注意点：導入価格の終了
- 画面: versus（lead「11月30日で導入価格が終了」、leadNote「Argon・Carbon は入力・出力とも2倍に」）
  - 左 いま（導入価格）: 入力 $2・出力 $10
  - 右 終了後: 入力 $4・出力 $20（警告色）
- ずんだもん: ただし、ArgonとCarbonは11月30日で導入価格が終わって、入力も出力も2倍になるのだ。
- 出典: Google公式ブログ
- 表情: alert / 効果音: alert_soft

## 4. 第三者評価：総合指数
- 画面: ranking（シリーズ内の順位）Neon 61（強調）／Carbon 60／Hydrogen 54／Argon 50
- 注記: 設定はモデルによって異なる（Neon・Hydrogen は xhigh、Carbon・Argon は high）
- ずんだもん: 第三者のArtificial Analysisでは、Neonが61点でいちばん高く、Carbonが60点、Hydrogenが54点、Argonが50点なのだ。
- 出典: Artificial Analysis
- 表情: happy / 効果音: chime_up

## 5. 第三者評価：速さ
- 画面: ranking（1タスクの時間、短いほど速い）Hydrogen 15.2分（強調）／Neon 21.5分／Argon 29.5分／Carbon 36.6分
- ずんだもん: 速さはHydrogenが1タスク15.2分でいちばん速く、Carbonは36.6分かかるのだ。
- 出典: Artificial Analysis
- 表情: normal / 効果音: slide_in

## 6. 公式のおすすめの使い分け
- 画面: points
  - Argon: 大半の開発・知的作業
  - Carbon: 知能の限界を試す難問（トークンを多く使う）
  - Hydrogen: 素早い実行・日常の作業
  - Neon: 賢さと速さのバランス
- ずんだもん: 公式の説明では、普段の作業はArgon、限界に挑む難問はCarbon、速さ重視ならHydrogenとNeonなのだ。
- 出典: Google公式ブログ
- 表情: normal / 効果音: slide_in

## 7. まとめ＋コメント誘導
- 画面: points
  - 安く速く: Hydrogen（無料枠でも利用可）
  - 最高スコア: Neon（61点）
  - 注意: Argon・Carbon は11月30日で導入価格終了
- ずんだもん: まずは無料で試せるHydrogenから使ってみるのだ！どれを使ってるかコメントで教えてなのだ！
- 表情: wink / 効果音: outro_chime

## 概要欄
- 紹介文: Gemini 4 の4モデル（Argon・Carbon・Hydrogen・Neon）の料金・評価・使い分けを、公式発表と第三者評価（Artificial Analysis）に分けて整理したのだ。Argon と Carbon は2026年11月30日で導入価格が終わるので注意なのだ。
- ハッシュタグ: Gemini4, AI解説, 生成AI, AI比較, ずんだもん
