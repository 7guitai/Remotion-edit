import type { SimulationConfig } from "../physics/types";

/** 画面レイアウト（ワールド座標 = 動画のピクセル座標） */
export const LAYOUT = {
  arena: { cx: 540, cy: 880, radius: 420, wallThickness: 16 },
  /** 脱落ボールが溜まるドロップゾーン */
  dropZone: { top: 1340, floor: 1800, left: 24, right: 1056 },
  /** 脱落ボールが画面上へ飛び出さないための天井 */
  ceiling: 330,
} as const;

export const DEFAULT_SEED = 20261034;

export const SIMULATION: SimulationConfig = {
  seed: DEFAULT_SEED,
  ballCount: 60,
  gravity: 0.95,
  restitution: 0.82,
  friction: 0.015,
  airFriction: 0.002,
  ballRadius: 14,
  durationSeconds: 30,
  fps: 30,
  physicsHz: 60,
  maxSpeed: 22,
  /** この時刻（シミュレーション秒）までに最後の1個にするのが目標 */
  targetFinishSeconds: 19.5,
  /** この時刻までに決着しなければタイムアウト判定 */
  deadlineSeconds: 22.5,
};
