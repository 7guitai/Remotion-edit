# 月の重力ショート：フリーBGM版

[完成動画](../../videos/2026-10-10-moon-gravity-free-bgm.mp4) / [概要欄](2026-10-10-moon-description.txt)

BGMは「Clowns」作曲：Tanner Helland。作者が公開する無料音源を使用。
- 作者の利用条件：https://tannerhelland.com/music.html
- 公開元：https://github.com/tannerhelland/free-music
- ライセンス：CC BY 4.0 https://creativecommons.org/licenses/by/4.0/
- 固定版：f6bfe16f49feab2181075ab86b13b24740592aa6
- 音源SHA256：5654468d39fb6d4d70b6205659dd46982315b30c3424c34f37762071a4db1568

MP3の古いタグにはCC BY-SA 3.0とあるが、作者の現在の公式ページと公式リポジトリは全音源をCC BY 4.0で提供すると明示している。今回はその公開条件に基づいて使用し、作者・曲名・リンク・加工内容を概要欄に記載。音源ファイル自体はリポジトリに追加しない。

37.6秒に抜粋。BGMの基本音量は10%、声と効果音の強さに応じてさらに下げ、冒頭0.5秒・末尾1.5秒でフェード。元のBGMを含まない音声をRemotionから書き出してミックスし、全体を-16 LUFS / 最大-1.5 dBTPへ調整。映像は既存の確認済みMP4から再圧縮せずコピー。

## 再現

```bash
npm ci
python3 scripts/remix_moon_free_bgm.py
python3 scripts/make_description.py whatif-moon-gravity-2026-10-09
```

Chromiumとffmpegが必要。同梱済み音声・効果音・既存動画を利用。音源は作者のGitHubからダウンロードし、ハッシュを確認する。`--reuse-stem`は既に生成した最新の音声・効果音WAVがある場合だけ使用。

通常のRemotionプレビューでは基本音量10%とフェードを適用。公開用の自動音量調整は上記ミックススクリプトで再現する。

## 確認

型チェックとPython構文チェックを実施。元動画の代表静止画を再確認。完成版は全編デコード、映像ストリームの一致、尺・解像度・フレームレート、音量とピークを検証し、結果を[検証JSON](2026-10-10-moon-verification.json)に保存済み。実測：37.600秒、-16.02 LUFS、AAC圧縮後ピーク-1.46 dBTP、5,269,111 bytes。
