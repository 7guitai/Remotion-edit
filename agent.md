# 雑学・科学チャンネル 動画制作ノウハウ（Remotion）

新しいプロジェクト／別の会話でこのノウハウを引き継ぐためのまとめ。
**新しい会話では、まずこの制作ガイドを読む。** ユーザー指定の保存名は `agent.md`。Codex が自動で読む `AGENTS.md` からも参照する。

---

## 0. チャンネル運営者からの決まりごと（必ず守る）

- **品質を最優先**。コストより仕上がり。完成前に必ず静止画で確認する（→ 7章）
- **人が登場する場面は物理エンジン（cannon-es）でシミュレーション**して描く。手で動きを付けない
- **効果音は控えめに、ぶつかる強さで音量を変える**（全部同じ音量は不自然、と指摘あり）
- BGM は動画ごとに変える
- 錯覚クイズなどは**有名すぎるネタを避けて、少しコアなもの**を選ぶ
- アフィリエイト動画は **PR 表記必須**（画面左上の「PR」＋概要欄の先頭に【PR】）、効果の誇張をしない、無許可の商品写真を使わない
- API キーやトークンを会話に貼らせない。必要なら環境設定の環境変数（例 `GEMINI_API_KEY`）に入れてもらう
- 作業ブランチにコミット＆プッシュ。PR はたのまれたときだけ作る

## 1. 伸びた実績（ネタ選びの参考）

- 「もし摩擦がなくなったら？」（縦型ショート・物理シミュレーション）が **1,539回再生／139高評価** で伸びた
  → 「もしも○○が○○だったら」＋物理シミュレーションで比べる形式は強い。続編（重力2、地球トンネルなど）を作った
- 錯覚クイズは、ミュラー・リヤー錯視などの有名どころは見飽きられている → 上級編（ポッゲンドルフ、ジャストロー、ムンカー、コーンスウィート、シェパードのテーブルなど）

## 2. プロジェクト構成

```
src/
  episodes/<id>.json     … 1ファイル = 1本の動画（コンポジションIDは id）
  episodes/index.ts      … JSON を import して EPISODES 配列に登録（型定義もここ）
  Video.tsx              … 全体の組み立て（BGM・プレイリストのクロスフェード、PRバッジ、章タグ）
  Root.tsx               … コンポジション登録。calculateMetadata で音声 wav の長さから尺を自動計算
  components/            … ページの種類ごとの部品（WhatIfPage, IllusionPage, ThermoScene, Globe …）
  sim/ragdoll.ts         … 人形（ラグドール）と関節の「筋肉」
  sim/scenes.ts          … シミュレーションの場面
scripts/
  generate_voice.py      … VOICEVOX で読み上げ音声 → public/voice/<id>/NNN.wav
  download_assets.py     … BGM（OpenTracks）・いらすとや を取得
  download_footage.py    … NASA の映像・写真・地図画像を取得（切り抜き・縮小も）
  make_description.py    … 概要欄（目次・クレジット・PR表記）を out/<id>-description.txt に
  make_sfx.py            … 効果音を合成（thud1〜3, tok, clack）
  render_stills.mjs      … 指定フレームの静止画を一括書き出し（確認用）
public/  bgm / fonts / footage / illustrations / sfx / voice
```

尺は**音声の長さから自動で決まる**（LEAD_IN 6フレーム、`slideGap`、`answerPause`、TAIL など）。テキストを変えたら音声を作り直すだけで尺が合う。

## 3. 動画の形式（style）

| style | 内容 | 例 |
|---|---|---|
| `whatif` | 「もしも」形式。上に黒帯の2行タイトル（`headline`）、真ん中に映像、下に大きな字幕 | whatif-friction-short |
| `illusion` | 錯覚クイズ。図はすべてコード（SVG）で描き、答え合わせで図が動いて種明かし | illusion-quiz2-short |
| `flashy` | 1ページ1雑学の派手な編集（集中線・叩きつけ・フラッシュ） | food-ranking-short |
| （thermo） | `whatif` の映像部分に図解（`thermo`）＋最後に商品カード（`product`）＝アフィリエイト | thermo-pr-short |
| 横長ロング | `format` 省略で 1920×1080。章の扉（`card`）・章タグ・BGM プレイリスト | whatif-earth-long |

`format: "short"` で 1080×1920。
whatif スライドの主なキー：`sim` / `simG` / `simLabels` / `globe` / `footage` / `photo` / `scene` / `cut` / `thermo` / `product` / `card` / `hold`。

## 4. 音声（VOICEVOX）

Docker で起動する（よく止まるので、そのたびに再起動）：
```bash
docker info >/dev/null 2>&1 || (dockerd >/tmp/dockerd.log 2>&1 &)
docker rm -f vv; docker run -d --rm --network host --name vv mirror.gcr.io/voicevox/voicevox_engine:cpu-latest
python3 scripts/generate_voice.py <id>
```
- 声：**青山龍星（speaker 13）1.2倍** … もしも・科学系　／　**ずんだもん（3）** … 錯覚クイズ・雑学
- 概要欄に「VOICEVOX:青山龍星」などのクレジットが必要（make_description.py が自動で入れる）
- **読み間違いを必ずチェック**：audio_query の kana を見て、おかしければ `speech` / `answerSpeech` / `explainSpeech` にひらがなで書く
  - 実際にあった誤読：止まれ→「やまれ」、金星→「きんぼし」、弦→「つる」、辺→「あたり」

## 5. 物理シミュレーション（cannon-es）

- 人は 13部位・12関節のラグドール。関節は ConeTwist ＋ 回転モーター3本の**速度サーボ**（目標の姿勢へ戻る「筋肉」）
- **単位の罠**：モーターの maxForce は「トルク × strength × dt」。ソルバーは1ステップあたりの力積で扱うので dt を掛けないと強さを変えても効かない
- 姿勢の符号：手足は −x が前、胴は +x が前かがみ
- **摩擦の罠**：cannon の摩擦は物体自身の質量で上限がかかる。軽い動く台（体重計など）に乗せると足がすべる → 台を重く（30kg）
- 全フレームを先に計算して記録 → どのフレームから書き出しても同じ結果（Remotion の並列レンダリングと相性が良い）
- **効果音**：衝突ごとに `{frame, v, sound, lane}` を記録し、面に向かう速さで音量を変える（小さめ）。人は thud1〜3 をランダム、ボールは tok、コーンは clack
- 比較は左右（または手前と奥）に 1G と 0.5G などを並べる。数字はシミュレーションの結果をそのまま表示
- バランス調整の値を試したら**元に戻し忘れない**（wind で 0.08 のまま残した事故あり → 0.15）

## 6. 素材とライセンス

- **BGM**：OpenTracks（旧 DOVA-SYNDROME）。JSON に `opentracks`（曲番号）と `track`（何番目の音源か）を書くと download_assets.py が取る
  - 使用済み：踊る、宇宙の中で（15926, track 2）／Spacewalk（13616）／Giant Step（9134）／なぞなぞ（16023, track 2）
  - **「利用条件有」の作曲者は避ける**。クレジットは概要欄に自動で入る
- **NASA の映像・写真**：パブリックドメイン。ただし**映像に日付・HUD・字幕が焼き込まれているものがある** → 拡大で切る／別素材にする
- いらすとや：概要欄にクレジット（使わない動画では行ごと省略される）
- フォント：M PLUS Rounded 1c（OFL）

## 7. 品質チェックの手順（毎回やる）

1. `node scripts/render_stills.mjs <id> frames.json <出力フォルダ> 0.5` で各スライドの代表フレームを書き出す
2. Python（PIL）で1枚のシートに並べて目で見る
3. 見るポイント：
   - **字幕（下 1/3）と図・ラベルが重ならないか**（縦型の映像エリア 1080×1000 では y≈640 より下は字幕の場所）
   - 文字のはみ出し（カード・枠の右端）
   - 素材の焼き込み文字、3D の物体が隠れていないか
   - 字幕の改行位置（数字・%・英字が途中で切れないよう分割の正規表現に入れてある：`/[0-9A-Za-z.,%％]/`）
4. 直したらもう一度静止画で確認してから本番書き出し

## 8. 書き出し

```bash
npx remotion render <id> out/<id>.mp4 --log=error                 # 2D だけ
npx remotion render <id> out/<id>.mp4 --gl=swangle --log=error    # 3D（地球・シミュレーション）
python3 scripts/make_description.py <id>
```
- **長い動画**：`--frames=a-b --muted` で分割して書き出し、音声は `--codec=wav` で別に出し、ffmpeg でつなぐ（バックグラウンド処理の上限が2時間のため）
- **共有用の圧縮**（30MB 以下に）：ショートは `-crf 26`、ロングは 960×540・2パス 330kbps
- ffmpeg がないときは `node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg` を使う
- **ディスクが埋まる**：`/tmp/remotion-webpack-bundle-*` が1つ約2.2GB 残る。書き出しが動いていないときに削除

## 9. アフィリエイト動画（科学で解説系）

構成：**身近な疑問 → 比較（※イメージ表示）→ 科学のしくみ（図解アニメ）→ 歴史の一言 → 商品カード → 「概要欄のリンクから」**
- エピソードに `"pr": true` → 画面左上に PR バッジ、概要欄の先頭に【PR】が自動で入る（description に重ねて書かない）
- 数字（何時間保冷など）を言い切らない。「比較はイメージ」「性能は商品によって異なる」と書く
- 商品は写真でなくイラスト。差し替えは最後のスライドの `product.name` / `product.points`（1行11文字くらいまで）と概要欄のリンク
- 投稿時に YouTube Studio で「**有料プロモーション**」にチェック
- 科学で語りやすい商品の例：真空断熱タンブラー（熱の伝わり方）、加湿器（気化熱）、ノイズキャンセリング（音の打ち消し合い）

## 10. 新しい動画を作る流れ

1. ネタと形式を決める（伸びた形式を優先）
2. `src/episodes/<id>.json` を作り、`index.ts` に登録
3. 素材：`npm run assets`、必要なら `python3 scripts/download_footage.py`
4. 音声：VOICEVOX 起動 → `npm run voice -- <id>` → 読みを確認・修正
5. `npx tsc --noEmit` で型チェック
6. 静止画で確認 → 修正（7章）
7. 本番書き出し → 概要欄 → 共有用に圧縮
8. コミット＆プッシュ → 動画と概要欄をユーザーに送る


## 11. 2ch風ショートの制作ルール

- 実在のスレッドを転載せず、オリジナル会話として制作する。画面と概要欄に「2ch風・創作」と分かる表記を入れる。
- `type: "thread"`、`format: "short"`、1080×1920・30fps。見出し2〜3行、レスは最大2件、1レス2行程度。
- スレ主・レスで声を分ける。標準は青山龍星（13）、ずんだもん（3）、春日部つむぎ（8）。
- 音声で尺を決め、約45〜60秒を目安にする。数字の読み・計算・解約などの事実を確認する。
- 吹き出しとイラストが重ならないよう、レスありページのイラストを下段に置く。毎ページの代表静止画を確認する。
- フリー素材の取得ができなければ自作SVG・自作BGMを使う。再配布禁止の素材をGitHubに上げない。
- 作業ブランチに `agent.md`、新エピソード、登録、必要なコードと再現用スクリプトをコミットして保存する。
- 2026-10-09の制作例：`subscription-2ch-2026-10-09`。テーマはサブスクの放置課金。
