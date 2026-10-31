import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { bgmVolume, buildSoundCues } from "../audio/sound-design";
import { Counter } from "../components/Counter";
import { THEME, neonText } from "../config/theme";
import { frameAtSimTime, useSimulation } from "../data/load-simulation";
import { Climax } from "../scenes/Climax";
import { Intro } from "../scenes/Intro";
import { MainAction } from "../scenes/MainAction";
import { Result } from "../scenes/Result";
import type { SimulationResult } from "../physics/types";

export type LastBallStandingProps = { seed: number };

loadFont({ family: "Orbitron", url: staticFile("fonts/orbitron-latin-700-normal.woff2"), weight: "700" });
loadFont({ family: "Orbitron", url: staticFile("fonts/orbitron-latin-900-normal.woff2"), weight: "900" });

export const LastBallStanding: React.FC<LastBallStandingProps> = ({ seed }) => {
  const sim = useSimulation(seed);
  if (!sim) return <AbsoluteFill style={{ background: THEME.bg }} />;
  return <Video sim={sim} />;
};

const Video: React.FC<{ sim: SimulationResult }> = ({ sim }) => {
  const frame = Math.min(useCurrentFrame(), sim.frames.length - 1);
  const state = sim.frames[frame];

  const { elimFrames, deadFrame, cues } = useMemo(() => {
    const frameAt = (t: number) => frameAtSimTime(sim, t);
    const elimFrames = sim.eliminations.map((e) => frameAt(e.t));
    const deadFrame = sim.balls.map(() => Infinity);
    sim.eliminations.forEach((e, k) => (deadFrame[e.ballIndex] = elimFrames[k]));
    return { elimFrames, deadFrame, cues: buildSoundCues(sim, elimFrames, frameAt) };
  }, [sim]);

  const lastChange = Math.max(-100, ...elimFrames.filter((f) => f <= frame));
  const framesSinceChange = frame - lastChange;
  const climax = state.alive <= 3 && frame < sim.winnerFrame + 2 && frame > sim.introFrames;
  const slow = state.speed > 0 && state.speed < 1 ? (1 - state.speed) / 0.65 : 0;
  const zoom = 1 + 0.07 * slow;
  const { cx, cy } = sim.layout.arena;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${THEME.bg2} 0%, ${THEME.bg} 70%)` }}>
      <BackgroundGrid frame={frame} />

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
          <MainAction sim={sim} frame={frame} deadFrame={deadFrame} elimFrames={elimFrames} danger={climax ? 1 : 0} />
        </g>
      </svg>

      {/* HUD */}
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: THEME.font, fontWeight: 900, fontSize: 58, letterSpacing: 4, color: THEME.white, textShadow: neonText(THEME.magenta, 0.8) }}>
        LAST BALL STANDING
      </div>
      <Counter alive={state.alive} total={sim.balls.length} framesSinceChange={framesSinceChange} danger={climax} />
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", fontFamily: THEME.font, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: THEME.dim }}>
        PHYSICS LAB · SEED {sim.config.seed}
      </div>

      {climax && <Climax frame={frame} alive={state.alive} speed={state.speed} framesSinceChange={framesSinceChange} />}
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

const BackgroundGrid: React.FC<{ frame: number }> = ({ frame }) => {
  const offset = (frame * 1.5) % 80;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(rgba(0,240,255,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(0,240,255,0.07) 2px, transparent 2px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: `0 ${offset}px`,
        maskImage: "radial-gradient(ellipse at 50% 45%, black 30%, transparent 85%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 30%, transparent 85%)",
      }}
    />
  );
};
