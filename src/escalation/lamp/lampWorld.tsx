import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from "remotion";
import { realTime, simTime } from "../timeline";
import { Theme, Timeline, VoiceInfo, WorldProps } from "../world";
import { LAMP_SPEC } from "./lampSpec";
import lampVoice from "../voice/escalate-lamp-short.json";
import { simulateLamp } from "./lampSim";
import { LampCamera, LampTown, LEV } from "./LampTown";
import { LampSpace, SEV } from "./LampSpace";

// 街灯の回（escalate-lamp-short）の世界：夜の広場 → 光で熱くなる街 → 夜の地球 → 太陽 → 海と岩 → 天の川銀河
const isTownKind = (k: string) => k.startsWith("lamp");
const sm = (a: number, b: number, x: number) => interpolate(x, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const LampWorld: React.FC<WorldProps> = ({ t, frame, width, height, shot, u, shake }) => {
  const sim = useMemo(() => simulateLamp(), []);
  const town = isTownKind(shot.kind);
  // 夜空 → 街灯の光が空気に散って、空が明るくなる → 熱で白っぽいオレンジ
  const day = sm(6, 16, t);
  const hot = sm(21, 27, t);
  const white = town ? 0.12 * sm(28, 33, t) * (1 - sm(36, 39, t)) : 0;
  return (
    <>
      {town ? (
        <>
          <AbsoluteFill style={{ background: "linear-gradient(180deg, #02040c 0%, #0b1530 60%, #1a2442 100%)" }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, #3d5f98 0%, #8fb0dc 60%, #d8e4f2 100%)", opacity: day }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, #1c0a08 0%, #5a2414 55%, #b5562a 100%)", opacity: hot }} />
        </>
      ) : (
        <AbsoluteFill style={{ background: "#02030a" }} />
      )}
      <ThreeCanvas width={width} height={height} shadows={town} camera={{ fov: 55, near: 0.05, far: 20000 }} key={town ? "town" : "space"} gl={{ antialias: true, logarithmicDepthBuffer: town }}>
        {town ? (
          <>
            <LampCamera kind={shot.kind} u={u} shake={shake} frame={frame} t={t} />
            <LampTown sim={sim} t={t} frame={frame} />
          </>
        ) : (
          <LampSpace kind={shot.kind} u={u} T={t} frame={frame} shake={shake} />
        )}
      </ThreeCanvas>
      {white > 0.001 ? <AbsoluteFill style={{ background: "#fff8ea", opacity: white }} /> : null}
    </>
  );
};

const at = (tl: Timeline, fps: number, t: number) => Math.round(realTime(tl, t) * fps);
const LampAmbience: React.FC<{ tl: Timeline; fps: number }> = ({ tl, fps }) => {
  const start = Math.round(tl.countdown * fps);
  const tAt = (f: number, from: number) => simTime(tl, from / fps + f / fps);
  return (
    <>
      {/* 夜の虫の声（明るくなると消える） */}
      <Sequence from={0} durationInFrames={at(tl, fps, 13)}>
        <Audio loop src={staticFile("sfx/esc_night.wav")} volume={(f) => 0.25 * (1 - sm(6, 12.5, simTime(tl, f / fps)))} />
      </Sequence>
      {/* 街灯のジーという音：明るくなるほど大きく、高く */}
      <Sequence from={start} durationInFrames={at(tl, fps, 41) - start}>
        <Audio loop src={staticFile("sfx/esc_hum.wav")} volume={(f) => 0.04 + 0.3 * sm(0, 30, tAt(f, start))} />
      </Sequence>
      <Sequence from={at(tl, fps, LEV.fireT)} durationInFrames={at(tl, fps, 32) - at(tl, fps, LEV.fireT)}>
        <Audio loop src={staticFile("sfx/esc_fire.wav")} volume={(f) => Math.min(0.45, f / fps)} />
      </Sequence>
      {/* 表面が蒸発するゴーッという音 */}
      <Sequence from={at(tl, fps, 30)} durationInFrames={at(tl, fps, 41) - at(tl, fps, 30)}>
        <Audio loop src={staticFile("sfx/esc_jet.wav")} volume={(f) => Math.min(0.4, f / fps / 2)} />
      </Sequence>
      <Sequence from={at(tl, fps, 41)}>
        <Audio loop src={staticFile("sfx/esc_drone.wav")} volume={0.35} />
      </Sequence>
    </>
  );
};

export const LAMP_THEME: Theme = {
  spec: LAMP_SPEC,
  voice: lampVoice as VoiceInfo,
  World: LampWorld,
  Ambience: LampAmbience,
  shakes: [
    [LEV.glassT, 0.02, 0.5],
    [35.5, 0.16, 3],
    [SEV.bindT, 0.05, 1.5],
  ],
  flashes: [35.5, SEV.sunT, SEV.bindT, SEV.galaxyT],
  shakeScale: (kind) => (isTownKind(kind) ? 1 : 0.05),
};
