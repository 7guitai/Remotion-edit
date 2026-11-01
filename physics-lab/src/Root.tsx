import React from "react";
import { Composition } from "remotion";
import { LastBallStanding, type LastBallStandingProps } from "./compositions/LastBallStanding";
import { DEFAULT_MODE, DEFAULT_SEED } from "./config/physics";
import { DEFAULT_STYLE } from "./styles/presets";
import { VIDEO, VIDEO_DURATION_FRAMES } from "./config/video";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LastBallStanding"
    component={LastBallStanding}
    durationInFrames={VIDEO_DURATION_FRAMES}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
    defaultProps={{ seed: DEFAULT_SEED, mode: DEFAULT_MODE, style: DEFAULT_STYLE } satisfies LastBallStandingProps}
  />
);
