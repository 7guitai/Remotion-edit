import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { beatAt, beatStarts } from "./types";
import { CameraRig } from "./camera";
import { CenterCaption } from "./Caption";
import { Studio } from "./materials";
import { CutawayTheme } from "./theme";
import { PEN_THEME } from "./pen/penTheme";

// 「断面図×工学の進化」ショートの本体（9:16）。HUD・帯・タイトルは出さず、中央の模型と、その少し下の字幕だけ。
export const CUTAWAYS: Record<string, CutawayTheme> = { [PEN_THEME.spec.id]: PEN_THEME };

export const cutawayDuration = (id: string, fps: number) => {
  const th = CUTAWAYS[id];
  return Math.ceil(beatStarts(th.spec, th.durations).total * fps);
};

export const CutawayVideo: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const th = CUTAWAYS[id];
  const { spec, Scene, Sounds } = th;
  const { starts } = useMemo(() => beatStarts(spec, th.durations), [spec, th.durations]);
  const t = frame / fps;
  const { i, age } = beatAt(starts, t);
  const beat = spec.beats[i];
  const keys = useMemo(() => spec.beats.map((b, k) => ({ ...b.cam, t: starts[k] })), [spec, starts]);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 38%, #2a3140 0%, #141821 55%, #07090d 100%)" }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 38, near: 0.05, far: 4000 }} gl={{ antialias: true }}>
        <Studio />
        <CameraRig keys={keys} t={t} />
        <Scene t={t} starts={starts} gen={beat.gen} frame={frame} />
      </ThreeCanvas>
      <CenterCaption text={beat.text} sub={beat.sub} age={age} />
      {spec.beats.map((_, k) => (
        <Sequence key={k} from={Math.round(starts[k] * fps)}>
          <Audio src={staticFile(`voice/${spec.id}/${String(k).padStart(3, "0")}.wav`)} volume={1} />
        </Sequence>
      ))}
      <Sounds starts={starts} fps={fps} />
      {spec.bgm ? <Audio src={staticFile(`bgm/${spec.bgm.file}`)} volume={spec.bgm.volume} loop /> : null}
    </AbsoluteFill>
  );
};
