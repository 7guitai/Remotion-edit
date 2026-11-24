---
name: zunda-metan-short
description: ずんだもん＋四国めたんの掛け合いで、AIツールやサービスを解説する縦型ショート動画（1080×1920・60〜75秒）を Remotion で作る。「ずんだもんとめたんのショート」「掛け合い形式で〇〇の動画」「いつもの2人の形式で」「この形式で新しく作って」など、2人の掛け合いショートの新規作成・修正・タイトルや概要欄づくりを頼まれたときに使う。
---

# ずんだもん＋四国めたん 掛け合いショートの作り方

このリポジトリ（Remotion）で、四国めたんが悩みを出し、ずんだもんが答える掛け合い形式の縦型ショートを作る。
実例は `src/shorts/ai-subscription/`（AIサブスク比較）、`src/shorts/orca/`（ツール解説）、`src/shorts/gemini-mac/`（新機能ニュース・最新の作り方）。迷ったら gemini-mac のコードを読むこと。

## 全体の流れ

1. **題材を調べる**（必ず最新情報を確認。料金・機能・対応OSなどは公式ページで裏を取る）→ `references/research.md`
2. **新しいショートを作る**：`python3 scripts/new_short.py <id>`（`src/shorts/<id>/` にひな形、`src/shorts/index.ts` に登録）
3. **台本を書く**：`src/shorts/<id>/script.json` → `references/script.md`
4. **音声を作る**：`python3 scripts/generate_short_voice.py <id> --voicevox-url <URL>` → `references/voice.md`
5. **素材を集める**：公式画面の撮影・デモ動画・ロゴ・BGM → `references/assets.md`
6. **画面を作る**：`scenes.tsx`（シーン部品）と `theme.ts`（配色）を題材に合わせて作り込む → `references/design.md`
7. **静止画で確認 → 修正**を繰り返す（文字のはみ出し・重なりを必ず目で見る）
8. **書き出し＋音量調整**（-14 LUFS）→ `references/render.md`
9. **タイトルと概要欄**：`src/shorts/<id>/description.txt` → `references/description.md`
10. コミット・プッシュし、動画ファイルと概要欄をユーザーに渡す。

## 守ること

- **2人の役割**：四国めたん＝視聴者の代弁（悩み・疑問・ツッコミ。語尾「〜わ」「〜のよね」「〜かしら」）、ずんだもん＝解説役（語尾「〜のだ」「〜なのだ」）。
- **構成**：つかみ（悩み）→ 不満の具体化 → 解決策（〇〇とは）→ 特徴・デモ → 注意点 → 向いている人／向いていない人 → まとめ（保存の呼びかけ）。
- **デザインの共通テイスト**：明るい背景、白いカード、画面上部の白い帯のヘッダー、暗色の角丸テロップ枠＋左上に話者名、画面下の左右に小さめの全身立ち絵（口パク・まばたき・表情差分）。
- **動画ごとのオリジナリティ**：配色（`theme.ts` の `C`）、ヘッダーの形、背景の模様、題材に合った図解やアニメーションを毎回変える。前の動画の見た目をそのまま使い回さない。
- **事実の正確さ**：料金・数値は公式ページで確認し、画面と概要欄に「〇年〇月時点」を入れる。説明用の図には「イメージ」と書く。推測で数字を作らない。
- **公平さ**：比較動画では特定の会社に肩入れしない。
- **クレジット**：概要欄に `VOICEVOX:ずんだもん` `VOICEVOX:四国めたん`（必須）、立ち絵・BGM・素材の出典を書く。
- **再配布禁止の素材**（立ち絵 PNG・BGM・撮影画像・他社のデモ素材）は Git に入れない（`.gitignore` 済みの場所に置く）。
- 音声は自分では聞けないので、読み方（英語の固有名詞など）の確認をユーザーに頼む。
- **BGM は控えめに**（`common/audio.tsx` の `ShortAudio`：0.07＋セリフ中ダッキング）。ユーザーから「うるさい」と言われたことがある。
- 品質を上げる共通機能（キーワード強調 `{ }`・感情マーク・ワイプ・公式画面/公式動画）は `references/design.md` の表を見て毎回使う。

## 仕組み（覚えておくと速い）

| 場所 | 役割 |
| --- | --- |
| `src/shorts/common/` | 共通部品：立ち絵 `Character.tsx`、テロップ `Subtitle.tsx`、タイムライン `timeline.ts`、効果音・ロゴ・ラベル `parts.tsx`、フォント `theme.ts`、キャラ設定 `characters.json` |
| `src/shorts/<id>/script.json` | 台本（シーンの配列。各シーンに `type`・`chapter`・`lines`＋自由なキー） |
| `src/shorts/<id>/timing.json` / `envelope.json` | 音声の長さ／口パク用の音量（音声生成で自動作成） |
| `src/shorts/<id>/scenes.tsx` | シーンの見た目（`type` ごとのコンポーネント） |
| `src/shorts/index.ts` | ショートの登録一覧（`new_short.py` が追記） |
| `public/shorts/common/` | 立ち絵パーツ（Git 対象外）・効果音・ロゴ SVG |
| `public/shorts/<id>/` | 音声 `voice/`、撮影画像 `shots/`、デモ素材 `media/` |

尺はセリフの音声の長さから自動で決まる（セリフ間 4 フレーム、シーン間 +4 フレーム）。シーン内のアニメーションは `scene.lines[n].from`（シーン先頭からの相対フレーム）に合わせて出す。

## 初回セットアップ（新しい環境で）

`references/setup.md` を参照（npm install、立ち絵 PSD の書き出し、BGM の取得、VOICEVOX）。
