# PHYSICS LAB: Last Ball Standing (MVP v1.0)

*Predict. Simulate. Survive.*

YouTube Shorts 向けの物理シミュレーション動画を **Matter.js（物理演算）** と **Remotion（描画・MP4書き出し）** で生成するプロジェクトです。
最初の企画は **Last Ball Standing**: 24個のボールが回転するアリーナから脱落していき、最後に残った1個が勝者になる30秒の縦型動画です。

## セットアップ（Mac）

前提: Node.js 20 以上（推奨 22）、npm。 https://nodejs.org/

```bash
node -v && npm -v
cd physics-lab
npm install
```

初回の `npm run render` / `npm run dev` で、Remotion がレンダリング用の Chrome Headless Shell を自動でダウンロードします（ネットワーク接続が必要）。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 既定seedをシミュレーションしてから Remotion Studio を起動（プレビュー） |
| `npm run render` | 既定seedで `out/last-ball-standing.mp4`（+ メタデータ `.json`）を書き出す |
| `npm run render -- --seed=42` | seed 42 で `out/last-ball-standing-42.mp4` を書き出す（`--out=パス` で出力先指定、`--force` で品質チェック不合格でも書き出す） |
| `npm run simulate -- --seed=42` | シミュレーションだけ実行し `public/simulations/lbs-42.json` を保存 |
| `npm run check -- --seed=42` | 品質チェック＋同じseedを2回実行して結果が一致するかを確認 |
| `npm run generate -- --count=3` | 簡易バッチ: 合格したseedを3本 `renders/` に書き出す（`--start-seed=N`、`--no-render`） |
| `npm run audio` | 効果音・BGMを再合成して `public/audio/` に書き出す |
| `npm run typecheck` | TypeScript の型チェック |

Studio で別のseedを見るには、先に `npm run simulate -- --seed=42` を実行し、Studio の Props で `seed` を `42` に変更します。

## 仕組み: 物理演算と描画の分離

```
Matter.js（Node.js, 60Hz 固定ステップ）
  → 全ボールの座標・角度・ゲート・回転バーを毎ステップ記録
  → 動画900フレームへ時間マッピング（冒頭2秒の静止、勝者確定前後のスロー）
  → public/simulations/lbs-<seed>.json
Remotion
  → JSON を読み込んで各フレームを描画するだけ（物理演算は一切しない）
```

- 乱数はすべて seed 付き乱数（mulberry32）。同じ seed と設定からは同じ結果になる（`npm run check` で2回実行してハッシュ比較）
- seed が変わると、ボールの初期配置・色の割り当て・回転バーの腕の本数／速度／向き・バンパーの数／大きさ・ゲートの速度／向きが変わる
- 書き出し時のメタデータ（`.json`）に seed・設定・コース・勝者・脱落順・品質チェック結果・シミュレーションのハッシュ・ソースのコミットを保存

## ゲームルール（Last Ball Standing）

| 項目 | 内容 |
| --- | --- |
| アリーナ | 円形の壁。中央に回転バー（1〜3本の腕）とハブ、周囲にバンパー |
| 出口（ゲート） | 壁の一部が開いた出口が1つあり、壁に沿って回転する（時間とともに加速） |
| 脱落 | ボールの中心がゲートを抜けて壁の外に出たら脱落。脱落ボールは壁の外側を転がって下の **OUT（ドロップゾーン）** に溜まる（画面から消えない） |
| 勝者 | 残り1個になった瞬間に確定。ゲートは閉じ、勝者は壁の内側に保護される |
| 同時脱落 | 1物理ステップ（1/60秒）で脱落確定するのは最大1個。よって「全員同時に脱落して勝者なし」は起こらない |
| タイムアウト | シミュレーション 23.5 秒までに決着しなければ、**アリーナ中心に最も近いボールが勝者**。残りはその場で停止して脱落扱い（画面に TIME UP 表示） |
| テンポ調整 | 残数の目標カーブ（24 → 20.5秒で1）との差に応じて、ゲートの開き幅を自動調整 |

## 品質チェック（`src/pipeline/quality-check.ts`）

不合格（✘）の seed は `render` が中止し、`generate` は自動でスキップします。

- 900フレームあること / 全ボールが常に画面内で座標が有限
- 脱落数 = 23、勝者は脱落していない、残数は単調減少して最後は1
- タイムアウトではなく通常決着していること
- 勝者確定が動画の 18〜27 秒
- 勝者が決着後もアリーナ内にいること
- （警告のみ）最初の脱落が4秒以内 / 脱落の間隔が5秒以内

## 動画構成（30秒・1080×1920・30fps・H.264）

| 時間 | 内容 |
| --- | --- |
| 0〜2秒 | 「24 → 1」表示。ボールは静止 |
| 2秒〜 | GO! でスタート。上部に残数カウンター、脱落時に衝撃波＋効果音 |
| 残り3個以下 | 壁が赤く脈動、「FINAL n」表示 |
| 勝者確定の約1秒前〜直後 | 0.35倍スロー＋ズーム＋シネマバー |
| 確定後（概ね 21〜26秒〜） | フラッシュ、勝者スポットライト、紙吹雪、WINNER カード |

## 素材と権利

- 効果音・BGM: `scripts/generate-audio.ts` で数式から合成したオリジナル（外部素材なし）
- フォント: Orbitron（SIL Open Font License 1.1, `public/fonts/OFL-Orbitron.txt`）。npm の `@fontsource/orbitron` から取得

## 動作確認の記録（2026-10-31、Linux コンテナ上）

実際に確認したこと:

- `npm install`、`npm run typecheck`（エラーなし）
- `npx remotion compositions` で `LastBallStanding`（1080×1920, 30fps, 900フレーム）を検出
- Remotion Studio が起動し HTTP 200 を返すこと（ブラウザでの操作は未確認）
- `npm run render` で `out/last-ball-standing.mp4` を書き出し: H.264 1080×1920 / 30fps / 900フレーム / 30.0秒、AAC 音声、黒フレームなし（ffmpeg blackdetect）、音声ピーク −4.3 dBFS（クリップなし）。所要約3分
- 書き出したMP4のフレームを目視確認（イントロ、脱落、FINAL 2、スロー、WINNER）
- seed 40個の一括検証で全件合格（タイムアウト0件、勝者確定は動画の 21.4〜25.7 秒、勝者は20通り）
- 同じ seed を2回実行して結果のハッシュが一致
- タイムアウト処理: 決着期限を8秒に縮めて実行し、勝者1個・残りがタイムアウト脱落になること
- `npm run generate -- --count=3 --no-render`（シミュレーションと選別のみ）

未確認のこと:

- **Mac 上での実行**（Linux で確認。Mac 固有の問題は未検証）
- Remotion による Chrome Headless Shell の自動ダウンロード（コンテナでは既存の Chromium を `REMOTION_BROWSER_EXECUTABLE` で指定して実行）
- `npm run generate` で実際に3本レンダリングすること（レンダリング処理自体は `npm run render` と共通）
- スマートフォン実機での見え方、音量感

## MVPとしての判断・既知の制約

- **全ボール・全フレームの座標を JSON に保存**（1本あたり約0.5MB）。`public/simulations/` は生成物なので git 管理外
- **脱落はまとまって起きやすい**: 重力でボールが底に溜まるため、ゲートが底を通過するたびに数個ずつ落ちる「波」になる（間隔は概ね2〜5秒）。展開の演出として許容し、5秒超の空白は警告扱い
- **最後の2個がほぼ同時にゲートを抜けた場合**、残る1個（勝者）が壁の内側へ引き戻され、一瞬位置が飛ぶことがある。品質チェック「勝者は決着後もアリーナ内」で検出して不採用にする（一部の seed で発生。例: seed 501）
- タイムアウト決着の seed は品質チェックで不採用（ルールとしては実装済み）
- ボール数は24個固定で調整済み。50〜100個への拡張はパラメータ調整が必要
- 3D化・YouTube自動投稿・大規模バッチは後続フェーズ

## ディレクトリ

```
src/
  config/        動画・物理・レイアウト・テーマ設定
  physics/       Matter.js ワールド、外周壁とゲートの衝突、ルール、記録、seed付き乱数、型
  data/          Remotion側でシミュレーション結果を読み込むフック
  compositions/  LastBallStanding（全体の組み立て）
  components/    Arena / Ball / Obstacle / Counter / Countdown / WinnerDisplay
  scenes/        Intro / MainAction / Climax / Result
  audio/         効果音の配置（イベント → フレーム）
  pipeline/      simulate / render / generate / quality-check
scripts/         generate-audio.ts
configs/         企画一覧（ideas.json）、スタイル（styles.json）
public/          audio / fonts / simulations（生成物）
out/ renders/    書き出したMP4（git管理外）
```
