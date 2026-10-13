import React from "react";
import { Composition, Still } from "remotion";
import { SleepThumbnail } from "./components/SleepThumbnail";
import { WhatIfThumbnail } from "./components/WhatIfThumbnail";
import { TinyThumbnail } from "./components/TinyThumbnail";
import { RelaxThumbnail } from "./components/RelaxThumbnail";
import { PaperThumbnail } from "./components/PaperThumbnail";
import { EPISODES } from "./episodes";
import { calculateMetadata, FPS } from "./slides";
import { Video } from "./Video";

// src/episodes/*.json の1ファイル＝1本の動画（コンポジションIDはエピソードの id）
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EPISODES.map((ep) => (
        <Composition
          key={ep.id}
          id={ep.id}
          component={Video}
          // 実際の長さは音声ファイルの長さから calculateMetadata で決まる
          durationInFrames={ep.fps ?? FPS}
          fps={ep.fps ?? FPS}
          width={ep.format === "short" ? 1080 : 1920}
          height={ep.format === "short" ? 1920 : 1080}
          defaultProps={{ episodeId: ep.id, slides: [] }}
          calculateMetadata={calculateMetadata}
        />
      ))}
      {/* 睡眠用動画のサムネイル（npx remotion still sleep-thumbnail out/thumb.png） */}
      <Still
        id="sleep-thumbnail"
        component={SleepThumbnail}
        width={1280}
        height={720}
        defaultProps={{
          kicker: "即寝落ち",
          catchCopy: "聴くだけで\nぐっすり",
          hours: "1",
          tag: "雨の音",
        }}
      />
      {/* 寝落ち雑学45分のサムネイル（npx remotion still relax-sleep-45m-thumbnail out/thumb.png） */}
      <Still
        id="relax-sleep-45m-thumbnail"
        component={RelaxThumbnail}
        width={1280}
        height={720}
        defaultProps={{
          kicker: "聞くだけで",
          title: "眠くなる\n雑学",
          minutes: "45分",
          sub: "やさしい\n暮らしの雑学100",
          main: "relax/cee3458a-3794-4f12-b61f-a7296aa9fa78.jpg",
          strip: [
            "relax/70280d10-ca80-4887-b9db-ddd14fbdcca2.jpg",
            "relax/366921d5-e66e-4201-9e53-99c5e8792bd7.jpg",
            "relax/bef6d67d-baac-49db-9e7b-a94fd50af4f8.jpg",
            "relax/7a52926a-6ca3-4498-86d7-98cf9e7b48e2.jpg",
          ],
        }}
      />
      {/* 「論文で読み解く心理学」スポットライト効果の回のサムネイル（npx remotion still paper-spotlight-long-thumbnail out/thumb.png） */}
      <Still
        id="paper-spotlight-long-thumbnail"
        component={PaperThumbnail}
        width={1280}
        height={720}
        defaultProps={{
          kicker: "論文で読み解く心理学",
          lines: ["人は、あなたを", "見ていない"],
          badge: "スポットライト効果",
          person: "ira_man_shock.png",
          thought: "みんなに\n見られてる…！？",
        }}
      />
      {/* 「地球の“もしも”10選」のサムネイル（npx remotion still whatif-earth-long-thumbnail out/thumb.png --gl=swangle） */}
      <Still
        id="whatif-earth-long-thumbnail"
        component={WhatIfThumbnail}
        width={1280}
        height={720}
        defaultProps={{
          kicker: "物理シミュレーションで検証",
          title: ["地球の", "“もしも”"],
          big: "10選",
          badge: "海が消えた地球",
        }}
      />
      {/* 「もし人間が10cmになったら？」のサムネイル（npx remotion still whatif-tiny-long-thumbnail out/thumb.png --gl=swangle） */}
      <Composition
        id="whatif-tiny-long-thumbnail"
        component={TinyThumbnail}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={30}
        defaultProps={{ offset: 300 }}
      />
    </>
  );
};
