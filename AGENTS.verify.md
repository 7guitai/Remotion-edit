# AGENTS.md（Codex 向け：検証系ショートの作り方）

このリポジトリは、日本語の雑学・科学 YouTube チャンネルの動画を **Remotion 4 ＋ @remotion/three ＋ cannon-es（物理エンジン）** で作るプロジェクトです。
ここでは **「もしも」系・【検証】系のショート（縦 1080×1920、30〜60秒）** を1本作る手順をまとめます。

- 最初に必ず `KNOWHOW.md` と `README.md` を全部読む（決まりごと・作品一覧・失敗と対策がある）
- 参考動画は `reference/`（zip に同梱）。まず数本を最後まで見て、形・テンポ・演出の強さをつかむ
  - `whatif-friction-short.mp4`（お手本：もし摩擦がなくなったら？）
  - `whatif-slope-short.mp4`（最新：もし地面がぜんぶ30度の坂道だったら？）
  - `verify-stairs-short.mp4`（【検証】階段でつまずいたら、上りと下り どっちが危ない？）
  - `whatif-flea-short.mp4`・`whatif-heavyair-short.mp4`（派手な演出・比べ方の例）

## 0. 守るルール

- 返事・報告は日本語で書く。**品質最優先**
- **API キーやトークンをチャットに貼らせない**（必要なら環境変数で渡してもらう）
- 他のクリエイターの動画を丸ごとまねしない。台本・映像・キャラはオリジナル。既存キャラ（ゆっくり・マイクラなど）は使わない
- 事実は**必ず検索して確かめ**、数字には根拠を持つ。諸説ある話は「〜といわれています」
- 具体例は**視聴者の日常**につなげる（歩く・ドア・自転車・お風呂・料理・通学 など）
- 人は**物理エンジンのラグドール**で見せる。「視覚的な面白さ」（転ぶ・すべる・土けむり・カメラのゆれ・見上げるカメラ）を入れる
- **多少派手な演出を必ずつける**：たたきつけ文字（スライドの `big`）・集中線・白いフラッシュ・画面のゆれ・スロー（`simSpeed`）。ただし字幕が読めなくなるほどはやりすぎない
- 衝突の効果音は小さめで、ぶつかる強さに合わせて大きさを変える。**ずっと鳴り続けるノイズの環境音（風・走行音・ザーという音のループ・ペンで書く音など）は使わない**。効果音はその瞬間だけ鳴る音にする
- BGM は**毎回ちがう曲**（OpenTracks。作曲者の利用条件が「利用条件有」の曲は使わない。「サイト準拠」ならよい）。使用済みの確認方法は 4 章
- BGM・いらすとや・Fluent Emoji の画像は再配布禁止なのでコミットしない（`.gitignore` 済み）。いらすとやは1作品20点まで・クレジット
- アフィリエイトのときは PR 表記

## 1. 準備

```bash
npm ci
pip install numpy pillow imageio-ffmpeg faster-whisper yt-dlp
```

- **VOICEVOX**（ナレーション）：アプリを起動するか、Docker で
  `docker run -d --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest`（http://127.0.0.1:50021 を使う）
- ffmpeg がなければ `npx remotion ffmpeg ...` で代わりに使える
- BGM・イラストの取得：`npm run assets`（= `python3 scripts/download_assets.py`。エピソード JSON の `opentracks` 番号と `illustrations` の URL から取る）
- 書き出しの GL：Linux のクラウドでは `--gl=swangle`。Mac なら指定なし（または `--gl=angle`）でよい

## 2. 2つの形式（どちらも `style: "whatif"`）

| 形式 | タイトル帯（`headline`） | 中身 | 例 |
| --- | --- | --- | --- |
| もしも | 「もし〇〇が／〜たら？」 | 「いまの地球」と「もしもの世界」を並べて比べる | whatif-friction-short・whatif-slope-short |
| 【検証】 | 「【検証】〇〇／どっちが〜？」 | 条件だけ変えて比べる（検証1・検証2…を `big` で） | verify-stairs-short・verify-strap-short |

- 画面：上に黄色と赤の2行タイトル（`headline` の配列）、まん中に 3D の場面（約1080×1000）、下に大きな字幕
- 比べる2つは**色つきのラベル**（左上の凡例・物の上のピル）で区別し、**結果を数字で**出す（何m すべった・時速何km・体重の何倍）
- 30〜60秒。最後は「住むならどっち？」「〜しようね」など日常につなげる一言

使ったテーマ（重ねない）は `README.md` の作品一覧と `src/episodes/whatif-*`・`verify-*` を見る。
これまで：摩擦ゼロ／摩擦10倍／重力半分・2倍／空気抵抗ゼロ／空気が水の重さ／トランポリンの地面／氷が沈む／ノミのジャンプ力／巨人／10cmの人／月・太陽・自転・金・地球の穴／30度の坂道、【検証】階段・電車の急ブレーキ・電車の中でジャンプ・飛び降り・トースト・エレベーター（落下・満員）・雨の日に走る・家の中の事故10選

## 3. 作り方

### 3-1. 台本：`src/episodes/<id>.json`
`src/episodes/whatif-slope-short.json` をコピーして書きかえる。`src/episodes/index.ts` に import して `EPISODES` 配列へ追加。

スライド（1文＝1スライド）の主なフィールド：
- `text`：字幕（読点で区切られて表示される）。`speech`：読み上げだけ変える（数字・単位は必ずかなで：25m→「25メートル」、時速94km→「時速94キロ」、0.45→「れいてんよんご」）
- 場面：`sim`（`src/sim/scenes.ts` の場面）か、専用シーン（`stairs`・`flea`・`home` など）、または `image`（`illustrations` の絵、`bg: "night"`）
- `simStart`：その場面の何秒目から見せるか。`simSpeed`：スロー（**専用シーンだけ効く。`sim` の場面には効かない**）
- `big`：たたきつけ文字（集中線・ゆれ・効果音つき）。`effect`：`none`／`zoom`／`shake`。`hold`：最後のスライドを長めに

### 3-2. シミュレーション（どちらかで作る）
**A. 新しい専用シーン（おすすめ。大きなファイルをさわらずにすむ）**
- `src/sim/stairs.ts`（計算）と `src/components/StairsScene.tsx`（描画）をお手本にする
- 計算は cannon-es で全フレームを前もって計算し、位置と向きを Float32Array に記録 → 描くときは読むだけ（どのフレームから描いても同じ結果になる）
- 人は `src/sim/ragdoll.ts` の `createRagdoll`・`applyBalance`・`POSES`、描画は `PhysicsScene.tsx` の `PersonPart`
- `src/episodes/index.ts` のスライドの型に `xxx?: XxxMode` を足し、`src/components/WhatIfPage.tsx` で `slide.xxx` のときに `<XxxScene .../>` を出す（`stairs` と同じ書き方）

**B. 既存の `sim` の場面に足す（whatif-slope-short のやり方）**
- `src/sim/scenes.ts`：`SimKind` に名前を足し、`build()` に場面を書く（レーン 0 = いまの世界、レーン 1 = もしもの世界。別々の物理ワールド）。`simulate()` の `labels` にラベル
- `src/components/PhysicsScene.tsx`：`cameraBase` の switch にカメラ、凡例の条件に追加、物の上のピル（数字）を `overlays` に足す

### 3-3. 物理のコツ（失敗から分かったこと）
- **cannon-es の摩擦は強く出すぎる**（関節でつながった人形・箱）。すべる・止まるを正しく見せたいときは、接触の摩擦を 0 にして「摩擦係数 × 面を押す力」を自分で力として足す。人は**体重を地面にふれている部分で分け合う**（部分ごとの重さで計算すると、立っている人の足の摩擦が弱すぎてすべる）
- ボールなど速い物は空気抵抗（½ρ Cd A v²）を入れないと速くなりすぎる
- 比べる2つのレーンを手前・奥に並べると形が見えにくいことがある。上下の段に分けて真横から見る、などカメラを工夫する
- 字幕の「6秒で〜m」と画面の数字は必ず合わせる（`sim` の場面では、スライドを分けて `simStart` を合わせる）
- 字幕・タイトル帯・凡例の下に人や物がかくれないように、カメラの高さと距離を調整する
- 地面の大きな板は、手前に来ると断面や物をかくす。地面がちらつくときは KNOWHOW の「地面が緑↔白に点滅した」の項（地面は depthWrite=false・renderOrder を負に）

## 4. BGM（毎回ちがう曲）

使った曲の番号をすべて集めてから選ぶ：
```bash
grep -rhoE '"opentracks": ?[0-9]+|opentracks: ?[0-9]+|bgm/detail/[0-9]+' src scripts | grep -oE '[0-9]+$' | sort -un
```
- OpenTracks の曲ページで作曲者の利用条件を確認（「利用条件有」は使わない）。エピソード JSON の `bgm` に `file`・`title`・`credit`・`page`・`opentracks`・`track` を書いて `npm run assets`

## 5. 音声

```bash
python3 scripts/generate_voice.py <id>    # 出力を head などにパイプしない（途中で止まる）
```
- 読み間違いは VOICEVOX の `/audio_query?speaker=13&text=...` の `kana` で確かめ、`speech` で直す
- 文字起こしでも確かめる：`python3 scripts/check_voice.py public/voice/<id>`（faster-whisper。漢字はあてにならないが、抜け・変な読みが分かる。正確に見たいときは `--model medium`）
- 過去の読み間違い：日本→ニッポン（「にほん」と書く）、12秒→「じゅうにびょう」、小数は全部かな
- 声は 青山龍星（speaker 13）速さ 1.2 が基本

## 6. 確認と書き出し

```bash
npx tsc --noEmit -p .
rm -rf node_modules/.cache
npx remotion still <id> out/check.png --frame=<N> --gl=swangle --timeout=900000   # 各スライドの見せ場を何枚も見る
npx remotion render <id> out/<id>.mp4 --gl=swangle --log=error --concurrency=100% --timeout=900000 --crf=24
python3 scripts/make_description.py <id>     # 概要欄（BGM・VOICEVOX・素材のクレジット入り）
```
- 静止画で見ること：人や物が画面外・字幕の下にかくれていないか／ラベルが重なっていないか／数字が台本と合っているか／地面のちらつき
- 完成動画からも数コマと音量（ずっと鳴る音がないか）を確認
- 30MB をこえたら ffmpeg で crf を上げた共有用の版を作る

## 7. 仕上げ

- `README.md` の作品一覧に1行、`KNOWHOW.md` に新しく分かったことを足す
- コミットする（BGM・イラスト・`out/` はコミットしない。`public/voice/` はコミットしてよい）
- 報告：テーマ・検証の結果の数字・見どころ・確かめた事実と出典・気になる点
