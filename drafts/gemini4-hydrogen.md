# 無料でも使える Gemini 4 Hydrogen の実力と注意点（ショート・約50秒）

- 形式: 縦型ショート（1080×1920）、ずんだもん単体解説
- シリーズ名: AIモデル検証レポート
- 見た目: 紙面・レポート風（paper）、立ち絵は坂本アヒル版
- BGM: シンプルスタイル（音量 0.067）

## 出典（確認済み）
- [公式] Google「Introducing Gemini 4 Hydrogen」2026年11月12日（11月16日更新）
  https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/
  - Google AI Studio・Gemini API の「すべての枠（all tiers）」で利用可能
  - 料金: 100万トークンあたり入力 $1.50・出力 $7.50（100万トークンの文脈全体で同一料金）
  - Artificial Analysis 総合指数で、標準（high）設定で Argon を上回る（51 対 50）、最高（xhigh）設定で 54
  - Antigravity の Orchestrator: Carbon と Hydrogen を切り替え。Terminal-Bench 4.0 で Carbon に近い成功率、使用量は平均24%少なく、19%速い
  - Gemini アプリの無料ユーザーは、自動モデル選択で適した場合に Hydrogen が使われる
- [第三者] Artificial Analysis「Gemini 4 Hydrogen」
  https://artificialanalysis.ai/models/gemini-4-hydrogen
  - xhigh: 総合指数 54（同程度のモデルの中央値 43）、1タスク $3.16、1タスク 15.2分（中央値 12.1分）
  - 評価全体の出力 3億400万トークン（中央値 6510万）＝「very verbose」
- [第三者・前回の回で確認] Artificial Analysis「Gemini 4 Neon」: xhigh 61点、1タスク $6.44・21.5分／Gemini 4 Carbon（high）60点

## 外したもの（裏が取れなかった／資料間で食い違う）
- 無料枠のレート制限の数値（公式の固定表が見つからない）
- 「無料枠の入力は Google の製品改善に使われる」（料金ページを直接確認できなかったため。二次情報では一致している）
- high 設定での1タスク費用（$1.87 という数値は二次情報のみ）
- Argon・Carbon の1タスク費用（資料間で食い違う）

## 1. フック（3〜4秒）
- 画面: hook「Gemini 4 Hydrogen\n【無料】でも実力は本物？」、sub「公式発表と第三者評価から検証」
- ずんだもん: 無料枠でも使えるGemini 4 Hydrogen、実力は本物なのだ？
- 表情: question / 効果音: impact_soft

## 2. 公式発表：使える範囲と料金
- 画面: versus（左「無料枠」値「利用可」、右「有料枠」入力 $1.50・出力 $7.50 / 100万トークン）
- ずんだもん: 公式発表では、Gemini APIとAI Studioのすべての枠で使えるのだ。有料なら100万トークンあたり入力1.5ドル、出力7.5ドルなのだ。
- 出典: Google公式ブログ（2026/11/12）
- 表情: normal / 効果音: slide_in

## 3. 第三者評価：総合指数
- 画面: ranking（Artificial Analysis 総合指数）
  - Gemini 4 Neon（xhigh）61
  - Gemini 4 Carbon（high）60
  - Gemini 4 Hydrogen（xhigh）54 ← 強調
  - Gemini 4 Argon（high）50
- 注記: 設定はモデルによって異なる。標準（high）設定では Hydrogen 51、Argon 50
- ずんだもん: Artificial Analysisの総合指数では、最高設定で54点。標準設定でも51点で、上位モデルのArgonの50点を上回ったのだ！
- 出典: Artificial Analysis／Google公式ブログ
- 表情: happy / 効果音: chime_up

## 4. 注意点：とても多弁
- 画面: versus（lead「安いけれど、多弁で遅め」、leadNote「考える量（出力）が多く、1タスクは平均より遅い」）
  - 左 Gemini 4 Hydrogen（xhigh）: 評価全体の出力 3.04億トークン／1タスク 15.2分（警告色）
  - 右 同程度のモデルの中央値: 6510万トークン／12.1分
- ずんだもん: ただし、とてもおしゃべりなモデルなのだ。評価全体の出力は3億トークン超えで、中央値の約4.7倍。1タスクも平均より遅いのだ。
- 出典: Artificial Analysis
- 表情: alert / 効果音: alert_soft

## 5. コスパ：Neon と比べる
- 画面: versus（左 Hydrogen（xhigh）1タスク $3.16・54点（強調色）、右 Neon（xhigh）$6.44・61点）
- ずんだもん: それでも1タスクの費用は3.16ドルで、Neonの6.44ドルの約半分なのだ。
- 出典: Artificial Analysis
- 表情: happy / 効果音: slide_in

## 6. 使い方（公式）
- 画面: flow「Carbon：設計・判断」→「Hydrogen：実行・テスト」→「Orchestrator：Carbonに近い成功率で、使用量24%減・19%速い（Terminal-Bench 4.0）」
- ずんだもん: 公式は、Carbonに考えさせてHydrogenに手を動かさせる組み合わせを勧めているのだ。使用量は24%少なく、19%速くなったそうなのだ。
- 出典: Google公式ブログ
- 表情: normal / 効果音: slide_in

## 7. まとめ＋コメント誘導
- 画面: points
  - 実力: 標準設定で Argon 超え（51点）
  - 注意: 出力が多く、処理は遅め
  - 使い方: 実行役に Hydrogen
- ずんだもん: 無料でも試せるから、まずは実行役として使ってみるのだ！何を作らせたいかコメントで教えてなのだ！
- 表情: wink / 効果音: outro_chime

## 概要欄
- 紹介文: Googleが2026年11月12日に公開した「Gemini 4 Hydrogen」の実力と注意点を、公式発表と第三者評価（Artificial Analysis）に分けて整理したのだ。
- ハッシュタグ: Gemini4, Gemini4Hydrogen, AI解説, 生成AI, ずんだもん

## レビューで直したこと
- 注意点の見出し「速くて安い…けど多弁」は不正確（Artificial Analysis では1タスクは平均より遅い。公式の「同クラスより速いことが多い」と食い違うので「速い」は使わない）→「安いけれど、多弁で遅め」
- 初稿の読み上げは61.0秒（フック4.3秒）で上限を超えたため、画面に出ている情報（100万トークンあたり等）を読み上げから外して短くした
