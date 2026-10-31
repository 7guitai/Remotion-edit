import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { bgmVolume, buildSoundCues } from "../audio/sound-design";
import { Counter } from "../components/Counter";
import { StyleProvider, useStyle } from "../styles/context";
import { DEFAULT_STYLE, STYLES } from "../styles/presets";
import type { StyleId } from "../styles/types";
import { TEAMS, type TeamId } from "../physics/teams";
import { frameAtSimTime, useSimulation } from "../data/load-simulation";
import { Climax } from "../scenes/Climax";
import { Intro } from "../scenes/Intro";
import { MainAction } from "../scenes/MainAction";
import { Result } from "../scenes/Result";
import type { SimulationResult } from "../physics/types";

export type LastBallStandingProps = { seed: number; style?: StyleId };

loadFont({ family: "MPLUS Rounded", url: staticFile("fonts/MPLUSRounded1c-ExtraBold.ttf"), weight: "800" });

export const LastBallStanding: React.FC<LastBallStandingProps> = ({ seed, style = DEFAULT_STYLE }) => {
  const sim = useSimulation(seed);
  const visual = STYLES[style] ?? STYLES[DEFAULT_STYLE];
  return (
    <StyleProvider style={visual}>
      {sim ? <Video sim={sim} /> : <AbsoluteFill style={{ background: visual.background }} />}
    </StyleProvider>
  );
};

const Video: React.FC<{ sim: SimulationResult }> = ({ sim }) => {
  const s = useStyle();
  const frame = Math.min(useCurrentFrame(), sim.frames.length - 1);
  const state = sim.frames[frame];

  const { elimFrames, deadFrame, pulseFrames, cues } = useMemo(() => {
    const frameAt = (t: number) => frameAtSimTime(sim, t);
    const elimFrames = sim.eliminations.map((e) => frameAt(e.t));
    const deadFrame = sim.balls.map(() => Infinity);
    sim.eliminations.forEach((e, k) => (deadFrame[e.ballIndex] = elimFrames[k]));
    const pulseFrames = (sim.pulses ?? []).map((t) => frameAt(t));
    return { elimFrames, deadFrame, pulseFrames, cues: buildSoundCues(sim, elimFrames, frameAt, pulseFrames) };
  }, [sim]);

  const lastChange = Math.max(-100, ...elimFrames.filter((f) => f <= frame));
  const framesSinceChange = frame - lastChange;
  const climax = state.alive <= 3 && frame < sim.winnerFrame + 2 && frame > sim.introFrames;
  const teamAlive = Object.fromEntries(TEAMS.map((t) => [t.id, 0])) as Record<TeamId, number>;
  sim.balls.forEach((b, i) => {
    if (frame < deadFrame[i]) teamAlive[b.team]++;
  });
  const slow = state.speed > 0 && state.speed < 1 ? (1 - state.speed) / 0.65 : 0;
  const zoom = 1 + 0.07 * slow;
  const { cx, cy } = sim.layout.arena;

  return (
    <AbsoluteFill style={{ background: s.background }}>

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
          <MainAction sim={sim} frame={frame} pulseFrames={pulseFrames} deadFrame={deadFrame} elimFrames={elimFrames} />
        </g>
      </svg>

      {/* HUD */}
      <Counter alive={state.alive} total={sim.balls.length} teamAlive={teamAlive} framesSinceChange={framesSinceChange} />
      <div style={{ position: "absolute", bottom: 46, left: 0, right: 0, textAlign: "center", fontFamily: s.font, fontWeight: 800, fontSize: 28, letterSpacing: 6, color: s.sub }}>
        PHYSICS LAB · SEED {sim.config.seed}
      </div>

      {climax && <Climax alive={state.alive} framesSinceChange={framesSinceChange} />}
      <Intro frame={frame} total={sim.balls.length} introFrames={sim.introFrames} />
      <Result sim={sim} frame={frame} />

      {/* 音 */}
      <Audio src={staticFile("audio/bgm.wav")} volume={(f) => bgmVolume(f, sim)} />
      {cues.map((c, i) => (
        <Sequence key={i} from={c.frame} durationInFrames={sim.fps * 3} layout="none">
          <Audio src={staticFile(c.src)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
