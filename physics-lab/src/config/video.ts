export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationSeconds: 30,
  /** 冒頭の「24 → 1」紹介。この間シミュレーション時間は0で止まっている */
  introSeconds: 2,
} as const;

export const VIDEO_DURATION_FRAMES = VIDEO.fps * VIDEO.durationSeconds;
export const INTRO_FRAMES = VIDEO.fps * VIDEO.introSeconds;
