import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { simulationStaticPath } from "../config/paths";
import type { GameMode, SimulationResult } from "../physics/types";

const cache = new Map<string, Promise<SimulationResult>>();

const fetchSimulation = (seed: number, mode: GameMode): Promise<SimulationResult> => {
  const key = `${mode}-${seed}`;
  let p = cache.get(key);
  if (!p) {
    const url = staticFile(simulationStaticPath(seed, mode));
    p = fetch(url).then(async (res) => {
      if (!res.ok) {
        throw new Error(
          `シミュレーション結果 public/${simulationStaticPath(seed, mode)} が見つかりません。` +
            `先に \`npm run simulate -- --seed=${seed} --mode=${mode}\` を実行してください。`,
        );
      }
      return (await res.json()) as SimulationResult;
    });
    cache.set(key, p);
  }
  return p;
};

/** 事前計算済みのシミュレーション結果を読み込む（物理演算はここでは一切行わない） */
export const useSimulation = (seed: number, mode: GameMode): SimulationResult | null => {
  const [data, setData] = useState<SimulationResult | null>(null);
  const [handle] = useState(() => delayRender(`simulation ${mode} ${seed}`));
  useEffect(() => {
    fetchSimulation(seed, mode)
      .then((d) => {
        setData(d);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [seed, mode, handle]);
  return data;
};

/** シミュレーション時刻 t 以上になる最初の動画フレーム */
export const frameAtSimTime = (sim: SimulationResult, t: number): number => {
  const { frames } = sim;
  let lo = sim.introFrames;
  let hi = frames.length - 1;
  if (frames[hi].t < t) return frames.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t >= t) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};
