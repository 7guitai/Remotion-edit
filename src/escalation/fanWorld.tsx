import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { realTime, simTime } from "./timeline";
import { TownCamera, TownEvents, TownScene } from "./TownScene";
import { EarthScene } from "./EarthScene";
import { simulateTown } from "./townSim";
import { earthAngle, force, omega, pressure, P0, windSpeed } from "./fanPhysics";
import { FAN_SPEC } from "./fanSpec";
import fanVoice from "./voice/escalate-fan-short.json";
import { Theme, Timeline, VoiceInfo, WorldProps } from "./world";

// 扇風機の回（escalate-fan-short）の世界：昼の広場 → 地球の自転 → 光のうず
const TOWN_KINDS = ["closeup", "plaza", "street", "front", "back", "rooftop"];
const EV: TownEvents = { hatT: 3, fleeT: 5, glassT: 8.6, drillT: 12.8, reactionT: 19.3 };
const BEAM_START = 21.6;

const FanWorld: React.FC<WorldProps> = ({ t, rate, frame, fps, width, height, shot, u, shake }) => {
  const town = useMemo(() => simulateTown({ force, reactionT: EV.reactionT, t0: 12, t1: 25 }), []);
  const isTown = TOWN_KINDS.includes(shot.kind);
  const P = pressure(t);
  const strength = Math.min(1, Math.max(0, Math.log2(P / P0) / 20));
  const v = windSpeed(t);
  const spin = Math.min(0.9, 0.18 + v * 0.03);
  const perFrame = (omega(t) * Math.max(rate, 1)) / fps;
  return (
    <>
      {/* 空（3D の背景は透明なので、うしろに空の色をしく） */}
      <AbsoluteFill style={{ background: isTown ? "linear-gradient(180deg, #4f9be8 0%, #9fd0f7 55%, #dff0fb 100%)" : "#02030a" }} />
      <ThreeCanvas width={width} height={height} shadows={isTown} camera={{ fov: 55, near: 0.05, far: 20000 }} key={isTown ? "town" : "earth"} gl={{ antialias: true, logarithmicDepthBuffer: isTown }}>
        {isTown ? (
          <>
            <TownCamera kind={shot.kind} u={u} shake={shake} frame={frame} />
            <TownScene sim={town} t={t} frame={frame} ev={EV} strength={strength} speed={v} spin={spin} />
          </>
        ) : (
          <EarthScene kind={shot.kind} u={u} T={t} frame={frame} angleAt={earthAngle} perFrame={perFrame} beamStart={BEAM_START} shake={shake} />
        )}
      </ThreeCanvas>
    </>
  );
};

const FanAmbience: React.FC<{ tl: Timeline; fps: number }> = ({ tl, fps }) => (
  <>
    {/* 風の音（町の場面）：強くなるほど大きく、音速をこえると轟音が重なる */}
    <Sequence from={Math.round(tl.countdown * fps)} durationInFrames={Math.round((realTime(tl, 24.6) - tl.countdown) * fps)}>
      <Audio loop src={staticFile("sfx/esc_wind.wav")} volume={(f) => 0.05 + 0.3 * Math.min(1, simTime(tl, tl.countdown + f / fps) / 14)} />
    </Sequence>
    <Sequence from={Math.round(realTime(tl, 12.8) * fps)} durationInFrames={Math.round((realTime(tl, 24.6) - realTime(tl, 12.8)) * fps)}>
      <Audio loop src={staticFile("sfx/esc_jet.wav")} volume={(f) => Math.min(0.4, f / fps / 2)} />
    </Sequence>
    {/* 宇宙の低いうなり */}
    <Sequence from={Math.round(realTime(tl, 24.6) * fps)}>
      <Audio loop src={staticFile("sfx/esc_drone.wav")} volume={0.35} />
    </Sequence>
  </>
);

export const FAN_THEME: Theme = {
  spec: FAN_SPEC,
  voice: fanVoice as VoiceInfo,
  World: FanWorld,
  Ambience: FanAmbience,
  shakes: [
    [12.8, 0.04, 0.8],
    [16.9, 0.12, 2.5],
    [19.3, 0.18, 2],
    [91.7, 0.05, 1.5],
  ],
  flashes: [16.9, 19.3, 91.7],
  shakeScale: (kind) => (TOWN_KINDS.includes(kind) ? 1 : 0.05),
};
