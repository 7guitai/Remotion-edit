import Matter from "matter-js";
import { LAYOUT } from "../config/physics";

const { Body } = Matter;

/** アリーナ外周の壁。ゲート（出口）は連続的に回転・開閉するので、
 *  Matter.jsの静的ボディではなく円＋ゲート端の線分として自前で衝突処理する。 */

export type GateState = { angle: number; halfWidth: number };

const TAU = Math.PI * 2;

export const wrapAngle = (a: number): number => {
  let x = (a + Math.PI) % TAU;
  if (x < 0) x += TAU;
  return x - Math.PI;
};

const WALL_RESTITUTION = 0.8;
const WALL_TANGENT_KEEP = 0.99;

const reflect = (ball: Matter.Body, nx: number, ny: number, restitution: number) => {
  const v = ball.velocity;
  const vn = v.x * nx + v.y * ny;
  if (vn >= 0) return; // 法線方向に離れつつある
  const tx = v.x - vn * nx;
  const ty = v.y - vn * ny;
  Body.setVelocity(ball, {
    x: tx * WALL_TANGENT_KEEP - vn * restitution * nx,
    y: ty * WALL_TANGENT_KEEP - vn * restitution * ny,
  });
};

/** ゲート端（半径 R〜R+t の線分）との衝突 */
const collideGateEdge = (ball: Matter.Body, edgeAngle: number, r: number): boolean => {
  const { cx, cy, radius: R, wallThickness: t } = LAYOUT.arena;
  const ux = Math.cos(edgeAngle);
  const uy = Math.sin(edgeAngle);
  const px = ball.position.x - cx;
  const py = ball.position.y - cy;
  const s = Math.min(R + t, Math.max(R, px * ux + py * uy));
  const qx = ux * s;
  const qy = uy * s;
  const dx = px - qx;
  const dy = py - qy;
  const d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  Body.setPosition(ball, { x: cx + qx + nx * r, y: cy + qy + ny * r });
  reflect(ball, nx, ny, WALL_RESTITUTION);
  return true;
};

export type WallOutcome = "none" | "hit" | "forced-out";

/**
 * 生存ボールと外周壁の衝突。
 * - ゲート範囲内なら通過できる（ゲート端とは衝突する）
 * - 壁の内側にいれば押し戻す
 * - ゲートが動いて壁の外側に取り残された場合は外へ押し出す（= 脱落）。ただし protectedBall は必ず内側へ戻す
 */
export const collideAliveWithWall = (
  ball: Matter.Body,
  r: number,
  gates: GateState | GateState[],
  isProtected: boolean,
): WallOutcome => {
  const list = Array.isArray(gates) ? gates : [gates];
  const { cx, cy, radius: R, wallThickness: t } = LAYOUT.arena;
  const px = ball.position.x - cx;
  const py = ball.position.y - cy;
  const d = Math.hypot(px, py);
  if (d < R - r) return "none";

  const phi = Math.atan2(py, px);
  const gate = list.find((g) => g.halfWidth > 0 && Math.abs(wrapAngle(phi - g.angle)) < g.halfWidth);

  if (gate && !isProtected) {
    const a = collideGateEdge(ball, gate.angle - gate.halfWidth, r);
    const b = collideGateEdge(ball, gate.angle + gate.halfWidth, r);
    return a || b ? "hit" : "none";
  }

  const nx = px / d;
  const ny = py / d;
  if (d >= R && !isProtected) {
    Body.setPosition(ball, { x: cx + nx * (R + t + r), y: cy + ny * (R + t + r) });
    return "forced-out";
  }
  Body.setPosition(ball, { x: cx + nx * (R - r), y: cy + ny * (R - r) });
  reflect(ball, -nx, -ny, WALL_RESTITUTION);
  return "hit";
};

/** 脱落ボールは外周壁の外側を転がってドロップゾーンへ落ちる */
export const collideDeadWithWall = (ball: Matter.Body, r: number): void => {
  const { cx, cy, radius: R, wallThickness: t } = LAYOUT.arena;
  const px = ball.position.x - cx;
  const py = ball.position.y - cy;
  const d = Math.hypot(px, py);
  const minD = R + t + r;
  if (d >= minD || d === 0) return;
  let nx = px / d;
  const ny = py / d;
  // 真上で静止しないよう、わずかに横へずらす
  if (Math.abs(px) < 0.5 && ny < 0) nx = px >= 0 ? 0.01 : -0.01;
  Body.setPosition(ball, { x: cx + nx * minD, y: cy + ny * minD });
  reflect(ball, nx, ny, 0.35);
};

export const clampSpeed = (ball: Matter.Body, maxSpeed: number): void => {
  const v = ball.velocity;
  const speed = Math.hypot(v.x, v.y);
  if (speed > maxSpeed) {
    Body.setVelocity(ball, { x: (v.x / speed) * maxSpeed, y: (v.y / speed) * maxSpeed });
  }
};
