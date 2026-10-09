import React from "react";
import { Composition, Still } from "remotion";
import { SleepThumbnail } from "./components/SleepThumbnail";
import { WhatIfThumbnail } from "./components/WhatIfThumbnail";
import { TinyThumbnail } from "./components/TinyThumbnail";
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
