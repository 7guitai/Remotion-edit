# 初回セットアップ（新しい環境・新しいセッションで）

```bash
npm install
# 立ち絵：ユーザーからもらった zip（坂本アヒルさんの PSD）からパーツを書き出す
pip install psd-tools
python3 scripts/export_psd_parts.py <ずんだもん立ち絵素材2.3.zip> <四国めたん立ち絵素材2.1.zip>
# BGM（script.json の bgm を見てダウンロード）
python3 scripts/download_short_assets.py <id>
# 既存の短編を書き出し直すなら、それぞれの素材も
node scripts/capture_pricing.js ai-subscription    # AIサブスク：公式料金ページの撮影
python3 scripts/fetch_orca_assets.py               # Orca：公式リポジトリのデモ素材
```

- 立ち絵 zip が無いと立ち絵が表示されない。ユーザーに再アップロードを頼む。
- VOICEVOX は `references/voice.md`。
- Chromium／Playwright はクラウド環境に入っている（`require('playwright')`）。
