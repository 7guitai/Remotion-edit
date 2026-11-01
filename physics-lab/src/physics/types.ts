import type { TeamId } from "./teams";

/** ゲームのルール */
export type GameMode = "gate" | "collapse" | "battle";

export type SimulationConfig = {
  mode: GameMode;
  seed: number;
  ballCount: number;
  gravity: number;
  restitution: number;
  friction: number;
  airFriction: number;
  ballRadius: number;
  durationSeconds: number;
  fps: number;
  /** 物理演算の固定更新頻度（描画fpsとは独立） */
  physicsHz: number;
  /** 1ステップあたりの速度上限（px/step）。数値発散防止 */
  maxSpeed: number;
  targetFinishSeconds: number;
  deadlineSeconds: number;
};

export type SpinnerSpec = {
  /** 回転中心から腕の先端までの長さ */
  length: number;
  thickness: number;
  /** rad/s。符号が回転方向 */
  angularSpeed: number;
  initialAngle: number;
  /** 腕の本数（等間隔に放射状に並ぶ） */
  arms: 1 | 2 | 3 | 4;
};

/** seedから決まるコース構造 */
export type BumperSpec = { x: number; y: number; radius: number };

export type CourseSpec = {
  spinner: SpinnerSpec;
  bumpers: BumperSpec[];
  hubRadius: number;
  /** 出口（ゲート）の回転速度 rad/s（符号が向き。時間とともに少しずつ加速） */
  gateAngularSpeed: number;
  gateInitialAngle: number;
};

export type BallInfo = {
  id: string;
  number: number;
  team: TeamId;
  color: string;
  radius: number;
};

export type EliminationReason = "escaped" | "timeout";

export type Elimination = {
  ballIndex: number;
  /** シミュレーション秒 */
  t: number;
  x: number;
  y: number;
  /** 脱落後の残数 */
  aliveAfter: number;
  /** 順位（24位 → 2位） */
  place: number;
  reason: EliminationReason;
};

export type HitEvent = { t: number; strength: number; kind: "ball" | "obstacle" | "wall" };

/** 動画1フレーム分の状態 */
export type FrameState = {
  /** このフレームが表示するシミュレーション時刻（秒） */
  t: number;
  /** [x, y, angle] × ボール数 を平坦化した配列 */
  b: number[];
  alive: number;
  /** ゲートの開始角・終了角（rad）。閉じているときは null */
  gate: [number, number] | null;
  spinnerAngle: number;
  /** 重力の傾き（rad, 0 = 真下）。終盤だけ左右に振れる */
  tilt: number;
  /** battle: 安全地帯（壁）の半径 */
  zone?: number;
  /** 再生速度（1 = 等速, < 1 = スロー） */
  speed: number;
};

export type WinnerInfo = {
  ballIndex: number;
  /** 最後の脱落が起きたシミュレーション秒（= 勝者確定時刻） */
  decidedAt: number;
  decidedBy: "last-standing" | "timeout";
};

/** collapse: 床のタイル（扇形）。warnAt で点滅し、fallAt で落ちる */
export type Tile = { r0: number; r1: number; a0: number; a1: number; warnAt: number | null; fallAt: number | null };

/** battle: HPの変化 */
export type HpEvent = { t: number; ball: number; hp: number; source: "ball" | "spike" | "fence" };

export type SimulationResult = {
  format: "physics-lab/last-ball-standing@1";
  mode: GameMode;
  /** collapse のみ */
  tiles?: Tile[];
  /** battle のみ */
  hp?: { max: number; events: HpEvent[]; zoneStart: number };
  /** 勝者が決着時に安全な場所にいたか（同時脱落で位置が飛んだ場合などは false） */
  winnerSafe: boolean;
  generator: { version: string; createdAt: string };
  config: SimulationConfig;
  course: CourseSpec;
  layout: {
    arena: { cx: number; cy: number; radius: number; wallThickness: number };
    dropZone: { top: number; floor: number; left: number; right: number };
  };
  fps: number;
  durationFrames: number;
  introFrames: number;
  balls: BallInfo[];
  eliminations: Elimination[];
  hits: HitEvent[];
  /** 「ドン」という演出音を鳴らすシミュレーション秒（gate: 衝撃波、collapse: 床の落下） */
  pulses: number[];
  winner: WinnerInfo;
  /** 勝者確定の瞬間を表示する動画フレーム */
  winnerFrame: number;
  frames: FrameState[];
};
