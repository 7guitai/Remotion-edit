# 素材と権利

| 素材 | 入手 | 置き場所 | Git | クレジット |
| --- | --- | --- | --- | --- |
| 立ち絵（坂本アヒル「ずんだもん立ち絵素材2.3」「四国めたん立ち絵素材2.1」PSD） | ユーザーから zip をもらう | `scripts/export_psd_parts.py` で `public/shorts/common/chars/` に書き出し | 入れない | 任意（入れるなら「立ち絵：坂本アヒル」） |
| 音声 | VOICEVOX | `public/shorts/<id>/voice/` | 入れる | **必須**：`VOICEVOX:ずんだもん` `VOICEVOX:四国めたん` |
| BGM（甘茶の音楽工房） | `python3 scripts/download_short_assets.py <id>`（script.json の `bgm`） | `public/bgm/` | 入れない | 任意（入れる）。Content ID 登録は禁止 |
| 効果音 | `python3 scripts/make_sfx.py`（自前で合成） | `public/shorts/common/sfx/` | 入れる | 不要 |
| ロゴ | Simple Icons（CC0）の SVG：`https://cdn.jsdelivr.net/npm/simple-icons@<版>/icons/<名前>.svg`（新しい版で消えたロゴは古い版を探す） | `public/shorts/common/icons/` | 入れる | 任意 |
| 公式サイトの画面 | Playwright で撮影（`scripts/capture_pricing.js` が例。固定ヘッダーや Cookie バナーは消してから撮る） | `public/shorts/<id>/shots/` | 入れない | 「公式ページより」と明記 |
| OSS のデモ素材 | 公式リポジトリの `docs/assets` など（ライセンス確認。animated WebP は `scripts/fetch_orca_assets.py` の方法で mp4 に変換） | `public/shorts/<id>/media/` | 入れない | 概要欄に出典 |
| フォント | Noto Sans JP（OFL）同梱 | `public/fonts/` | 入れる | 不要 |

- 他社のロゴや画面は「紹介・解説」の範囲で使う。ロゴを改変したり、公式のように見せたりしない。
- 撮影した画面の中身は加工しない（価格が表示されない部分を書き足す等はしない）。足りない情報はカード側に書く。
