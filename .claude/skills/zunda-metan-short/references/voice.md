# 音声（VOICEVOX）

```bash
python3 scripts/generate_short_voice.py <id>                        # 手元で VOICEVOX を起動していれば（http://127.0.0.1:50021）
python3 scripts/generate_short_voice.py <id> --voicevox-url <URL>   # 別の場所のエンジンを使う
python3 scripts/generate_short_voice.py <id> --force                # 台本を直したら作り直す
```

- 話者：ずんだもん（ノーマル・ID 3）、四国めたん（ノーマル・ID 2）。`src/shorts/common/characters.json` の `speaker`。
- 速さ 1.4 倍が標準（めたんは 0.96 倍してやや落ち着かせる）、抑揚 1.15、48kHz。
- 出力：`public/shorts/<id>/voice/NNN.wav`、長さ `timing.json`、口パク用の音量 `envelope.json`。
- 合計が 75 秒を超えたら、セリフを削るか `--speed 1.45` にする。
- クラウド環境で VOICEVOX を起動できない場合、Hugging Face Spaces に公開されている VOICEVOX ENGINE（`https://<space>.hf.space/version` が返るもの）を使える。`/speakers` に「ずんだもん」「四国めたん」がいるか確認する（「VOICEVOX ENGINE OSS」版は製品版の声が入っていないので不可）。台本の文章が外部に送られる点はユーザーに伝える。
- 自分では音声を聞けない。英語の読みや数字の読みがおかしくないか、ユーザーに確認を頼む。
