# 断面図×工学の進化（課題と解決の連鎖）ショートの設計

身近な製品の内部機構が「弱点 → 発想の転換 → 新たな弱点 → 最終解決」と進化していく様子を、3D の断面アニメーションで見せる 9:16 の型。
1本めは `cutaway-pen-short`（ボールペンの驚くべき進化）。

## 構成テンプレート（でも → そこで の4段階）

| 世代 | 時間の目安 | 語りの形 | カメラ |
| --- | --- | --- | --- |
| 第1世代 | 0〜10秒 | 初期の〇〇は、Aで動いていた。でも、〇〇という問題が起きた | 弱点で超マクロズーム（role: "weak"） |
| 第2世代 | 10〜20秒 | そこで発想を変えた。Bにした。でも〇〇という弱点があった | 転換で引いて全体（role: "turn"）→ 弱点でマクロ |
| 第3世代 | 20〜35秒 | そこでCを足した。でも構造上、わずかな〇〇が残る | 同上 |
| 第4世代 | 35〜50秒 | そこで常識を捨て、Dにした。ついに問題を解決した | 引き → 完成形を回りこむ |

1文＝1ビート（字幕1枚・ナレーション1つ）。ビートの長さはナレーションの長さで決まる（`types.ts` の `beatStarts`）。

## 共通モジュール（src/cutaway/）

- `materials.tsx` … PBR 素材（真鍮 #d4af37 / metal 0.85 / rough 0.25、クローム #e5e7eb / 0.95 / 0.08、ゴム #222 / 0 / 0.9、セラミック #f5f5f0 / 0.05 / 0.2、アクリル opacity 0.28 / rough 0.1）。`*Cut` は切断面用（ノイズの bump でザラつき）。`ghostMat(base, g)` で外装を「ふつう ↔ 半透明ゴースト」に切りかえ。`Studio` は環境マップ（RoomEnvironment）＋3灯
- `parts.tsx` … `CutShell`（thetaLength = π の半円筒・円すい＋内側の面＋切り口＋上下のふた。厚さ ≥ 半径で中身のつまった棒）、`RubberRing`（つぶれると Y が縮み横にふくらむ・摩耗で細く）、`Spring`（らせん）
- `fluid.tsx` … 物理パーティクル（`Drops`：重力＋はね返り＋べちゃっと広がる、`SeepDrops`：すき間でふくらむ→つたう→落ちる、`Bubbles`）と論理ストリーム（`FlowStream`：色リボン＋白い矢印。`STREAM.hot` 赤 #ef4444 / `STREAM.cold` 青 #3b82f6。`blocked` で途中で止める）
- `camera.tsx` … `CameraRig`：ビートごとのキー（見る点・距離・角度・画角）をイージングでつなぐ。距離は対数でつなぐので、超マクロへの寄りも自然。字幕に重ならないよう模型を少し上に出す
- `Caption.tsx` … 中央（上から60%）の白文字字幕。細い黒縁＋影。上に小さく世代名（sub）
- `CutawayVideo.tsx` … 本体。背景のスタジオグラデーション、3D、字幕、ナレーション、BGM、テーマごとの効果音
- `theme.ts` / `types.ts` … テーマ（台本・ナレーションの長さ・模型・効果音）と台本の型

## 新しい製品を作るとき

1. `src/cutaway/<name>/<name>Spec.ts` に beats（text・speech・sub・gen・cam・role）を書く。事実は検索で確かめる
2. `<Name>Scene.tsx` に世代ごとの模型を書く（`CutShell` などを組み合わせる。動きはビートの開始時刻 `starts[i]` からの経過で決める）
3. `<name>Theme.tsx` に効果音（機構の動きに合わせる）を書き、`CutawayVideo.tsx` の `CUTAWAYS` と `scripts/cutaway_voice.ts` の `SPECS` に足す
4. `node_modules/.bin/esbuild scripts/cutaway_voice.ts --bundle --platform=node --outfile=/tmp/cv.js && node /tmp/cv.js <id>`（VOICEVOX）、`python3 scripts/make_cutaway_sfx.py`
5. `Root.tsx` に登録して `npx remotion render <id> out/<id>.mp4 --gl=swangle`

## ボールペンの回の事実確認

- 万年筆は毛細管現象でペン先の溝（スリット）を伝ってインクを送る。機内で気圧が下がると、中の空気がふくらんでインクが押し出される
- 初期のボールペンは重力でインクを送り、ほぼ垂直に持つ必要があった
- 加圧式（フィッシャーのスペースペン、窒素で加圧）は「圧力だけだと漏れた」ので、止まるとゲル・ボールが動くと液体になるインク（チキソトロピー）にした
- ゲルインクのボールペンは1984年（サクラクレパス）。インクの後ろに逆流防止体（フォロアー）を入れる
