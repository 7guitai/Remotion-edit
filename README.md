# ずんだもん解説動画（Remotion）

白い背景に **テロップ（上）＋イラストや図（中央）** を置き、**ずんだもん（VOICEVOX）が読み上げ**、**BGM** が流れる解説動画を作るプロジェクトです。

`src/episodes/<id>.json` の1ファイルが1本の動画です（コンポジションIDは `id`）。

| id | 内容 | 長さ |
| --- | --- | --- |
| `sleep-trivia` | 睡眠の雑学 | 約2分9秒 |
| `autumn-trivia` | 秋の雑学（クイズ3問入り） | 約2分22秒 |
| `love-trivia-short` | 恋愛の雑学（縦型ショート・クイズ1問入り） | 約50秒 |
| `sleep-trivia-1h` | 【睡眠導入】ずんだもんと寝落ち 雑学1時間（夜空と雨の音、雑学192個） | 約60分 |
| `money-trivia-long` | 知っておきたい お金の雑学62選（横長・1ページ1雑学＋解説、全6章） | 約9分58秒 |
| `animal-trivia-long` | 寝る前に聞きたい 動物の雑学63選（横長・1ページ1雑学＋解説、全6章） | 約8分44秒 |
| `savings-2ch-short` | 【2ch風】貯金1000万貯めて分かったこと（縦型ショート・スレ風の見出し＋レス） | 約52秒 |
| `whatif-rotation-short` | もし地球の自転が止まったら？（縦型ショート・「もしも」形式） | 約48秒 |
| `whatif-sun-short` | もし太陽が消えたら？（同上・NASA の映像9種類） | 約51秒 |
| `whatif-gravity-short` | もし重力が半分になったら？（人・車は物理エンジンでシミュレーション、火星は NASA の素材） | 約59秒 |
| `whatif-friction-short` | もし摩擦がなくなったら？（同上。右・奥の世界は途中で摩擦がゼロになる） | 約55秒 |
| `whatif-earth-long` | 地球の“もしも”10選（横長。章の扉・BGM 3曲の切り替え・物理シミュレーション・NASA の素材） | 約9分21秒 |
| `illusion-quiz-short` | 目の錯覚クイズ（新ジャンル。図形はコードで描き、答え合わせで図が動いて種明かし） | 約82秒 |
| `whatif-friction10-short` | もし摩擦が10倍になったら？（摩擦ゼロの逆バージョン。すべり台・箱・ブレーキ） | 約50秒 |
| `whatif-tramp-short` | もし地面がぜんぶトランポリンになったら？（ばねの地面を自作。へこむマット・生卵・塀から飛び降り） | 約43秒 |
| `whatif-tiny-long` | もし人間が10cmになったら？（横長ロング。2乗3乗の法則で拡大した世界をシミュレーション） | 約5分46秒 |
| `whatif-air-short` | もし空気抵抗がなくなったら？（羽根と鉄球・ビーチボール・雨・スカイダイビング・紙ひこうきを物理エンジンで比較、アポロ15号の映像、流れ星の図解） | 約83秒 |
| `whatif-moon-short` | もし月がなくなったら？（同上） | 約44秒 |
| `food-ranking-short` | 9割が知らない 食べ物のヒミツ ランキング（縦型ショート・派手な編集） | 約38秒 |
| `body-ranking-short` | 9割が知らない 体のヒミツ ランキング（同上） | 約38秒 |
| `konbini-ranking-short` | 9割が知らない コンビニのヒミツ ランキング（同上） | 約37秒 |
| `things-ranking-short` | 9割が知らない 身近なモノのヒミツ ランキング（縦型ショート・派手な編集・第5位〜第1位） | 約38秒 |
| `japan-trivia-short` | 日本の雑学7選（縦型ショート・派手な編集） | 約36秒 |
| `body-trivia-short` | 体の雑学7選（縦型ショート・派手な編集） | 約36秒 |
| `coffee-trivia-short` | コーヒーの雑学7選（10月1日のコーヒーの日。縦型ショート・1ページ1雑学） | 約45秒 |
| `money-trivia-short` | お金の雑学7選（縦型ショート・1ページ1雑学、声は青山龍星） | 約44秒 |
| `charger-power-split` | PCとスマホを同時充電する充電器の選び方（[OCHA NOTE の記事](https://ochanote.com/articles/laptop-phone-charger-power-split/)を動画化） | 約4分12秒 |

## 使い方

```bash
npm install
npm run assets                          # いらすとやの画像とフリーBGMをダウンロード（最初に1回）
npm run voice -- charger-power-split    # ずんだもんで読み上げ音声を作成（VOICEVOX を起動しておく）
npm run dev                             # Remotion Studio でプレビュー
npx remotion render charger-power-split out/charger-power-split.mp4
npm run description -- charger-power-split   # 概要欄（目次・クレジット付き）を out/ に作成
```

## 新しい動画を作る

1. `src/episodes/` に JSON を追加し、`src/episodes/index.ts` の `EPISODES` に登録する
2. `npm run assets` → `npm run voice -- <id>` → レンダリング

### エピソード JSON

| キー | 内容 |
| --- | --- |
| `id` / `title` | コンポジションID / 動画タイトル |
| `format` | `"short"` で縦型（1080×1920）の YouTube ショート。画面上部にタイトルの帯が出て、テロップは3行まで |
| `style` | `"flashy"` で1ページ1雑学を派手な編集にする（ページごとに色が変わる集中線、文字の叩きつけ、答えでフラッシュ＋画面の揺れ＋集中線＋きらきら、「シュッ」「ドンッ」「キラッ」の効果音） |
| `fps` | フレームレート（省略時は 30）。動きの少ない長時間動画は 10 などに下げると書き出しが速い |
| `slideGap` | 読み上げのあとに入れる間（フレーム）。睡眠用は全体の長さに合わせて調整する |
| `ambient` | ずっと流す環境音 `{file, volume, name}`（`public/sfx/`。雨の音は `python3 scripts/make_ambient.py` で合成） |
| `answerPause` | 1ページ1雑学で、振りから答えまでの間（フレーム。省略時は 30）。テンポを上げたいショートは 15 前後 |
| `bgmVolume` | BGM の音量（省略時は 0.12） |
| `titleBand` | `false` でショート上部のタイトル帯を消す |
| `background` | 背景色（省略時は白） |
| `replyVoices` | 2ch風のレスを読む声の配列（レスの順番で交互に使う） |
| `voice` | 読み上げの声 `{speaker, speed, name}`（省略時はずんだもん・1.2倍）。`name` は概要欄のクレジットに入る |
| `accent` / `marker` | 強調の色（テロップの強調・番号・カウントダウン・ショートのタイトル帯）。省略するとオレンジ |
| `pr` | `true` なら画面左上に「PR」を表示し、概要欄に広告表記を入れる（アフィリエイトを含む動画は必須） |
| `source` | 元記事（概要欄にリンク） |
| `bgm` | BGM（ファイル名・曲名・クレジット・取得URL）。OpenTracks（旧DOVA-SYNDROME）の曲は `url` の代わりに `opentracks`（曲番号）を書く |
| `readings` | 読み上げの読み替え（例: `"USB-C": "ユーエスビーシー"`）。`65W`→「65ワット」、`130g`→「130グラム」は自動 |
| `illustrations` | いらすとや の画像（ファイル名 → 名前・URL・仮表示の絵文字） |
| `slides` | スライドの配列（下記） |
| `description` / `links` / `hashtags` | 概要欄に入れる紹介文・商品リンク・ハッシュタグ |

### スライドの種類

どのスライドも `text`（テロップ）と任意の `speech`（読み上げ文）、`chapter`（概要欄の目次見出し）を持てます。
テロップは `\n` で改行でき、3行以上になりそうなときは自動で文字が小さくなります。

| `type` | 中央に表示するもの | 追加のキー |
| --- | --- | --- |
| （省略）/ `illust` | イラスト | `image` |
| `bars` | PC／スマホの配分などを比べる積み上げ横棒グラフ | `bars: [{label, sub, pc, phone}]`, `note` |
| `table` | 比較表 | `columns`, `rows`, `note` |
| `points` | ラベル付きの箇条書き（結論・チェックポイント） | `items: [{label, body}]` |
| `quiz` | クイズの選択肢（A/B/C…） | `choices`, `answer`（正解の番号。0 始まり） |
| `thread` | 2ch風。集中線の背景に赤グラデ＋白黒フチの大きな見出し、イラストの上にレスの吹き出しが順番に出る（「ポンッ」の効果音つき）。レスは `replyVoices` の声で交互に読む | `image`, `replies: [{text, speech, color}]` |
| `sleep` | 睡眠用。夜空（星・月・雨のすじ・眠る犬）の背景に雑学の文字をふわっと出して消す。`speech` をひと続きで読み上げ、`answer`/`explain` は表示だけ | `speech`, `answer`, `explain` |
| `whatif` | 「もしも」形式。上の黒帯に2行のタイトル（エピソードの `headline`）、真ん中の映像に背景・イラスト・演出、読み上げに合わせて句読点ごとに切り替わる大きな字幕 | `image`, `bg`（space/night/sky/sea）, `effect`（none/vanish/zoom/spin/stop/shake/wind/flood/dark/arrows/half/flip）, `big`（黄色いラベル）, `globe`（本物の写真の回る地球・月）, `footage`（NASA の動画）, `photo`（NASA の写真）, `sim`（物理シミュレーション：scale/jump/slip/throw/brake/party、摩擦は fstand/fpush/fbrake/ladder/fchaos） |
| `trivia` | 1ページ1雑学（ショート向け）。上に `text`（振り）、中央にイラスト、読み上げのあと下に `answer`（答え）を出す。文字は黒＋白フチの極太 | `image`, `answer`, `answerSpeech`, `note`（読み上げない補足）, `explain` / `explainSpeech`（答えのあとに読み上げる解説） |

- **クイズ**：`answer` のない `quiz` は出題スライドで、読み上げのあとに3秒のカウントダウン（「考えてみて！」＋効果音）が入ります。
  次のスライドを同じ `choices` と `answer` 付きの `quiz` にすると、正解の選択肢が赤くなり「〇」と「ピンポーン」で発表します。
- **強調**：テロップの `**〜**` はオレンジ色＋マーカーで強調されます（読み上げでは記号を読みません）。
- **雑学の番号**：スライドに `no` を付けると、次の `chapter` まで画面左上に「雑学 No.○」と進み具合のドットを表示します。

## 本物の写真の地球・月（3D）

`whatif` スライドの `globe` は、NASA の地図画像を Three.js の球に貼って回します（`src/components/Globe.tsx`）。
WebGL を使うので、書き出すときは `--gl=swangle` を付けます。

```bash
python3 scripts/download_footage.py      # NASA の素材（地図画像・動画）を取得
npx remotion render whatif-rotation-short out/whatif-rotation-short.mp4 --gl=swangle
```

## 物理シミュレーション（人・車）

`whatif` スライドの `sim` は、物理エンジン [cannon-es](https://github.com/pmndrs/cannon-es) で計算した場面を 3D で描きます（`src/sim/`, `src/components/PhysicsScene.tsx`）。

- 人は関節つきの人形（13個の部位・12個の関節）。関節には「筋肉」があり、目標の姿勢へ戻ろうとする力で立つ・しゃがむ・跳ぶ・着地でひざを曲げる。力を弱めると、ぐにゃっと倒れる
- 左右（または手前と奥）に重力 1G と 0.5G の世界を並べて、同じ動きをさせて比べる
- 体重計はばね、車のブレーキは「摩擦係数 × 重さ × 重力」の力で計算。数字（体重・高さ・時間・距離）はシミュレーションの結果をそのまま表示
- ぶつかった瞬間に効果音を鳴らす。音量はぶつかる速さ（面に向かう向きの速さ）で変わり、人は `thud1〜3.wav`、ボールは `tok.wav`、コーンは `clack.wav`
- 1フレームずつ全部の物体の位置を記録してから描くので、どのフレームから書き出しても同じ結果になる

| sim | 内容 |
|---|---|
| `scale` | 体重計にのる（66kg → 33kg） |
| `jump` | しゃがんでジャンプ（高さを目盛りで比べる） |
| `slip` | バナナの皮ですべって転ぶ（倒れるまでの時間） |
| `throw` | ボールを投げる（飛んだ距離） |
| `brake` | 時速36kmから急ブレーキ（止まるまでの距離・コーンをはね飛ばす） |
| `party` | 重力半分の世界で、5人でジャンプ |
| `fstand` | 一歩ふみ出す（摩擦ゼロだと足が前後にすべって開脚） |
| `fpush` | 40kgの箱を150Nで押す（摩擦ゼロだと箱は前へ、自分は後ろへすべり続ける） |
| `fbrake` | 時速36kmから急ブレーキ（摩擦ゼロだと止まれない） |
| `ladder` | 壁に70度で立てかけた3mのはしご（摩擦ゼロだと足もとがすべって倒れる） |
| `fchaos` | 摩擦ゼロの広場で、5人が歩き出そうとして転ぶ |

摩擦の場面（f〜・ladder）は、右（奥）の世界だけ 0.6 秒で摩擦がゼロになり、地面が氷のように光ります。
関節の筋肉の強さは実際のトルク（N·m）で、物理エンジンの1ステップあたりの力積に直して与えています。

## 目の錯覚クイズ（`style: "illusion"`）

`type: "illusion"` のスライドで、図を見せて問題を読み → 3秒カウントダウン（`answerPause: 90`）→ 答え（図が動いて種明かし）→ 解説、の流れになります（`src/components/IllusionPage.tsx`）。

| kind | 錯覚 | 種明かし |
|---|---|---|
| `muller` | ミュラー・リヤー錯視（矢印の線） | 矢羽根が消え、両端に赤い補助線 |
| `ebbinghaus` | エビングハウス錯視（囲まれた円） | まわりの円が消え、右の円の輪郭が左にぴったり重なる |
| `contrast` | 明るさの対比（グラデーションの上の帯） | 背景のグラデーションが消える |
| `cafe` | カフェウォール錯視（傾いて見える横線） | タイルがうすくなり、横線に赤い線を重ねる |
| `ponzo` | ポンゾ錯視（線路の上の2本の棒） | 線路が消え、下の棒の輪郭が上の棒のすぐ下まで上がる |
| `intro`／`outro` | タイトルとしめくくり | |

## 横長の「もしも」（ロング動画）

`format: "landscape"` で `style: "whatif"` にすると、横長のレイアウトになります（例：`whatif-earth-long`）。

- 映像は画面いっぱい、字幕は下（読みやすいように下をうす暗く）
- `card`：章の扉（大きな番号・タイトル・全体の何番目か）。読み上げはするが字幕は出さない。`tag` は章の間、右上に出す短い名前
- `bgmPlaylist`：`fromSlide` 番目のスライドから曲を切り替える（1.5秒のクロスフェード）。曲ごとに `volume` で音量をそろえる
- `hold`：読み上げのあとも映像を見せる秒数（最後のエンドカード用など）
- `sim` と一緒に `simG`（右の世界の重力の倍率）・`simLabels`（左右の名前）・`simStart`（途中の秒から見せる）
- `globe` に `textureTo`／`fade`（別の地図へゆっくり切り替え）・`rings`（輪）・`squash`／`squashTo`（上下につぶれた形）
- `scene: "ringsky"`／`"ringsky_day"`：地上から見上げた、輪のある空

台本は `scripts/build_whatif_earth_long.py` で書いて JSON を作ります。仕上がりの確認には、場面ごとの静止画をまとめて書き出す `scripts/render_stills.mjs` が便利です。
長いので、書き出しはフレームの範囲ごとに分けて（`--frames` と `--muted`）、音声は `--codec=wav` で別に書き出してからつなぎます。
サムネイルは `npx remotion still whatif-earth-long-thumbnail out/thumb.png --gl=swangle`。

## AI音声（ずんだもん）

[VOICEVOX](https://voicevox.hiroshiba.jp/) の **ずんだもん（ノーマル）**、話す速さ **1.2倍** です。

```bash
python3 scripts/generate_voice.py <id> --speed 1.3     # もっと速く
python3 scripts/generate_voice.py <id> --speaker 1     # ずんだもん（あまあま）
```

**公開時は概要欄に `VOICEVOX:ずんだもん` のクレジットが必要です**（`npm run description` の出力に含まれます）。
VOICEVOX が起動していないときは Open JTalk（`pip install pyopenjtalk numpy`）で代わりに読み上げます。

## イラスト（Microsoft Fluent Emoji）

いらすとやは商用利用だと1作品20点までなので、それ以上必要な動画では [Fluent Emoji](https://github.com/microsoft/fluentui-emoji)（MIT License）の「Color」SVG も使っています。
`illustrations` に `credit` を書いた素材は、概要欄のクレジットにまとめて表示されます。

## イラスト（いらすとや）

`npm run assets` で `public/illustrations/` に保存されます。
商用利用は 1 作品につき 20 点までなど規約があるので、[利用規約](https://www.irasutoya.com/p/terms.html) を確認してください。
素材の再配布は禁止のため、画像は `.gitignore` でコミット対象外にしています。

## BGM（OpenTracks（旧DOVA-SYNDROME））

`money-trivia-short` は もっぴーさうんど「Escort」を使っています。OpenTracks の[音源利用ライセンス](https://opentracks.com/)に沿って使ってください（クレジット表記は任意）。
再配布は禁止のため Git には含めず、`npm run assets` でダウンロードします。

## BGM（甘茶の音楽工房）

[甘茶の音楽工房](https://amachamusic.chagasi.com/) の曲を使っています（商用利用可・クレジット任意）。
再配布は禁止のため Git には含めず、`npm run assets` で `public/bgm/` にダウンロードします。
この曲を使った動画を YouTube の Content ID に登録することは禁止されています。

## 効果音

`public/sfx/` のクイズ用効果音は `python3 scripts/make_sfx.py` で合成した自作の音です（Git に含めています）。

## サムネイル（睡眠用）

`npx remotion still sleep-thumbnail out/thumb.png` で 1280×720 のサムネイルを書き出します（文字は `src/Root.tsx` の `defaultProps` で変更）。

## フォント

`public/fonts/` に M PLUS Rounded 1c（Medium / ExtraBold / Black）を同梱（SIL Open Font License 1.1）。
