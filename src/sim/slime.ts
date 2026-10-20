import * as CANNON from "cannon-es";
import { applyBalance, createRagdoll, POSES, Ragdoll } from "./ragdoll";

// スライム（ねばねばした液体）のシミュレーション。小さな粒をたくさん集めて液体にする。
//  - 近すぎる粒どうしは押し合う（液体が つぶれない）
//  - 少し離れた粒どうしは引き合う（表面張力・まとまり）
//  - となりの粒と速さをそろえようとする（ねばり気＝粘度。大きいほど、ひも状のまま ゆっくり動く）
// ねばり気が小さいと、しぶきを上げて広がり、台からこぼれる。大きいと、ロープのように とぐろを巻いて積み上がる
export const SLIME = {
  // 台（大理石の箱）の上の面の大きさ（半分）
  half: 1.1,
  // 注ぎ口：回る円の半径・高さ・回る速さ（rad/s）・出てくる速さ（m/s）・注ぐ時間（秒）
  helixR: 0.42,
  top: 3.4,
  spin: 2.4,
  speed: 7,
  pour: 5.4,
  // 粒の間かく（m）と、ひもの太さ（半径）
  d: 0.034,
  tube: 0.055,
};

export type SlimeResult = {
  frames: number;
  n: number;
  // frames × n × 3（粒の位置）
  pos: Float32Array;
  // 人形の部位ごとの位置と向き（frames × 部位 × 7）
  doll: Float32Array;
  parts: { name: string; size: [number, number, number]; look: string }[];
};

const cache = new Map<string, SlimeResult>();

export const simulateSlime = (visc: number, frames: number, fps: number): SlimeResult => {
  const key = `${visc}:${frames}:${fps}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = SLIME;
  // 上の注ぎ口から、ひも状に注ぐ。注ぎ口は人のまわりを円をえがいて回るので、流れはらせんになる
  // 粒は最初は待機（見えない）。時間がたつと、注ぎ口から順に出てくる
  const sec: [number, number][] = [];
  for (let u = -S.tube; u <= S.tube + 1e-6; u += S.d) {
    for (let w2 = -S.tube; w2 <= S.tube + 1e-6; w2 += S.d) {
      if (u * u + w2 * w2 <= S.tube * S.tube) sec.push([u, w2]);
    }
  }
  const pour = S.pour;
  const layers = Math.floor((pour * S.speed) / S.d);
  const n = layers * sec.length;
  const p = new Float32Array(n * 3);
  const v = new Float32Array(n * 3);
  // 何番目の粒が いつ出てくるか
  const born = new Float32Array(n);
  for (let l = 0; l < layers; l++) {
    for (let c = 0; c < sec.length; c++) {
      const i = l * sec.length + c;
      born[i] = (l * S.d) / S.speed;
      p[i * 3 + 1] = -100;
    }
  }
  const nozzle = (t: number) => {
    const a = S.spin * t;
    return [Math.cos(a) * S.helixR, S.top, Math.sin(a) * S.helixR];
  };
  // 人形（台のまん中に立つ）
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
  world.allowSleep = false;
  (world.solver as CANNON.GSSolver).iterations = 20;
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(S.half, 1.5, S.half)), position: new CANNON.Vec3(0, -1.5, 0) });
  world.addBody(ground);
  world.defaultContactMaterial.friction = 0.7;
  world.defaultContactMaterial.restitution = 0.02;
  const rd: Ragdoll = createRagdoll(world, [0, 0, 0], 0);
  const names = Object.keys(rd.bodies) as (keyof Ragdoll["bodies"])[];
  const bodies = names.map((nm) => rd.bodies[nm]);
  const halves = names.map((nm) => rd.sizes[nm].map((x) => x / 2) as [number, number, number]);
  const isHead = names.map((nm) => nm === "head");

  const D = S.d;
  const H = D * 1.6;
  // 力は「加速度」で書く（粒1つあたり）。押し返す強さ・まとまる強さ・ねばり気
  const kRep = 20000;
  const coh = 3 + 3 * visc;
  // ねばり気：1回の計算で、まわりの粒の速さに どれだけ近づけるか（0〜1）
  const blend = 0.003 + 0.6 * visc * visc;
  const stick = 0.3 + 0.7 * visc;
  const yieldV = 2.2 * visc * visc;
  const hold = 0.08 * visc * visc;
  const maxH = 0.85 * visc * visc;
  // 体を押すときの 粒1つの重さ（kg）
  const mass = 0.025;
  const sub = 20;
  const dt = 1 / (fps * sub);
  const pos = new Float32Array(frames * n * 3);
  const doll = new Float32Array(frames * names.length * 7);
  // 近くの粒を探すための升目
  const cell = H;
  const grid = new Map<number, number[]>();
  const hash = (x: number, y: number, z: number) => ((Math.floor(x / cell) + 512) * 1048576) + ((Math.floor(y / cell) + 512) * 1024) + (Math.floor(z / cell) + 512);
  const f = new Float32Array(n * 3);
  const ws = new Float32Array(n);
  const wv = new Float32Array(n * 3);
  const alive = new Uint8Array(n);
  const tmp = new CANNON.Vec3();
  const loc = new CANNON.Vec3();
  const inv = new CANNON.Quaternion();
  const r = D * 0.5;

  for (let fr = 0; fr < frames; fr++) {
    for (let s = 0; s < sub; s++) {
      const t = (fr * sub + s) * dt;
      // 注ぎ口から新しい粒を出す
      for (let i = 0; i < n; i++) {
        if (alive[i] || born[i] > t || p[i * 3 + 1] > -50) continue;
        const c = i % sec.length;
        const [nx0, ny0, nz0] = nozzle(born[i]);
        const a = S.spin * born[i];
        // 断面は、注ぎ口の動く向きと横向きに広げる
        p[i * 3] = nx0 + Math.cos(a) * sec[c][0];
        p[i * 3 + 1] = ny0 - (t - born[i]) * S.speed;
        p[i * 3 + 2] = nz0 + Math.sin(a) * sec[c][0] + sec[c][1];
        v[i * 3] = 0;
        v[i * 3 + 1] = -S.speed;
        v[i * 3 + 2] = 0;
        alive[i] = 1;
      }
      // 人形：立ったまま（体はスライムに押される）
      rd.setPose(POSES.stand);
      applyBalance(rd);
      grid.clear();
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        const k = hash(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
        let c = grid.get(k);
        if (!c) grid.set(k, (c = []));
        c.push(i);
      }
      f.fill(0);
      ws.fill(0);
      wv.fill(0);
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        const xi = p[i * 3], yi = p[i * 3 + 1], zi = p[i * 3 + 2];
        const cx = Math.floor(xi / cell), cy = Math.floor(yi / cell), cz = Math.floor(zi / cell);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c2 = -1; c2 <= 1; c2++) {
          const list = grid.get((cx + a + 512) * 1048576 + (cy + b + 512) * 1024 + (cz + c2 + 512));
          if (!list) continue;
          for (const j of list) {
            if (j <= i) continue;
            const dx = p[j * 3] - xi, dy = p[j * 3 + 1] - yi, dz = p[j * 3 + 2] - zi;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > H * H || d2 < 1e-12) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d, ny = dy / d, nz = dz / d;
            let fn = 0;
            if (d < D) {
              fn -= kRep * Math.min(D - d, D * 0.4);
              // ぶつかって近づく勢いを消す（ねばるほど、はね返らずに その場で止まる）
              const rv = (v[j * 3] - v[i * 3]) * nx + (v[j * 3 + 1] - v[i * 3 + 1]) * ny + (v[j * 3 + 2] - v[i * 3 + 2]) * nz;
              if (rv < 0) {
                const dv = rv * 0.5 * stick;
                v[i * 3] += nx * dv; v[i * 3 + 1] += ny * dv; v[i * 3 + 2] += nz * dv;
                v[j * 3] -= nx * dv; v[j * 3 + 1] -= ny * dv; v[j * 3 + 2] -= nz * dv;
              }
              // めりこみすぎた粒は、位置を直接もどす（速く落ちてきても つぶれない）
              if (d < D * 0.8) {
                const c = (D * 0.8 - d) * 0.25;
                p[i * 3] -= nx * c; p[i * 3 + 1] -= ny * c; p[i * 3 + 2] -= nz * c;
                p[j * 3] += nx * c; p[j * 3 + 1] += ny * c; p[j * 3 + 2] += nz * c;
              }
            }
            else fn += coh * (1 - (d - D) / (H - D));
            // ねばり気：となりの粒の速さを集めておく（あとで、自分の速さを近づける）
            const w = 1 - d / H;
            ws[i] += w; ws[j] += w;
            wv[i * 3] += w * v[j * 3]; wv[i * 3 + 1] += w * v[j * 3 + 1]; wv[i * 3 + 2] += w * v[j * 3 + 2];
            wv[j * 3] += w * v[i * 3]; wv[j * 3 + 1] += w * v[i * 3 + 1]; wv[j * 3 + 2] += w * v[i * 3 + 2];
            const fx = nx * fn;
            const fy = ny * fn;
            const fz = nz * fn;
            f[i * 3] += fx; f[i * 3 + 1] += fy; f[i * 3 + 2] += fz;
            f[j * 3] -= fx; f[j * 3 + 1] -= fy; f[j * 3 + 2] -= fz;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        const k = i * 3;
        if (ws[i] > 0) {
          v[k] += blend * (wv[k] / ws[i] - v[k]);
          v[k + 1] += blend * (wv[k + 1] / ws[i] - v[k + 1]);
          v[k + 2] += blend * (wv[k + 2] / ws[i] - v[k + 2]);
        }
        v[k] += f[k] * dt;
        v[k + 1] += f[k + 1] * dt - 9.8 * dt;
        // スライムは ゆっくりした力では形がくずれにくい（降伏応力）。まわりに粒が多く、ゆっくり動いている粒は止める。
        // ただし自分の重さで支えられる高さ（maxH）までしか積み上がらない
        if (p[k + 1] < maxH && ws[i] > 2 && Math.hypot(v[k], v[k + 1], v[k + 2]) < yieldV) {
          v[k] *= 1 - hold; v[k + 1] *= 1 - hold; v[k + 2] *= 1 - hold;
        }
        v[k + 2] += f[k + 2] * dt;
        // ゆるい空気の抵抗。体のすき間にはさまった粒がはじけ飛ばないよう、速さに上限（秒速14m）
        v[k] *= 0.9995; v[k + 1] *= 0.9995; v[k + 2] *= 0.9995;
        const sp = Math.hypot(v[k], v[k + 1], v[k + 2]);
        if (sp > 14) {
          v[k] *= 14 / sp; v[k + 1] *= 14 / sp; v[k + 2] *= 14 / sp;
        }
        p[k] += v[k] * dt; p[k + 1] += v[k + 1] * dt; p[k + 2] += v[k + 2] * dt;
        // 台の上の面（台の外に出たら、下へ落ちていく）
        if (p[k + 1] < r && Math.abs(p[k]) < S.half && Math.abs(p[k + 2]) < S.half && p[k + 1] > -0.2) {
          p[k + 1] = r;
          if (v[k + 1] < 0) v[k + 1] *= -0.05;
          // 台との摩擦（ねばるほど すべりにくい）
          const fr2 = Math.min(1, 0.02 + 0.98 * visc * visc);
          v[k] *= 1 - fr2; v[k + 2] *= 1 - fr2;
        } else if (p[k + 1] < r && p[k + 1] > -0.2) {
          // 台の側面
          const ax = Math.abs(p[k]) - S.half, az = Math.abs(p[k + 2]) - S.half;
          if (ax < r && az < r && ax > -r * 2 && az > -r * 2) {
            if (ax > az) { p[k] = Math.sign(p[k]) * (S.half + r); v[k] *= -0.1; }
            else { p[k + 2] = Math.sign(p[k + 2]) * (S.half + r); v[k + 2] *= -0.1; }
          }
        }
        if (p[k + 1] < -3) alive[i] = 0;
        // 人形の体とぶつかる：粒を外へ出し、そのぶん体を押す
        for (let b = 0; b < bodies.length; b++) {
          const body = bodies[b];
          tmp.set(p[k] - body.position.x, p[k + 1] - body.position.y, p[k + 2] - body.position.z);
          if (isHead[b]) {
            const R = halves[b][0] + r;
            const dd = tmp.length();
            if (dd < R && dd > 1e-6) {
              const sc = R / dd;
              const nx = tmp.x / dd, ny = tmp.y / dd, nz = tmp.z / dd;
              p[k] = body.position.x + tmp.x * sc; p[k + 1] = body.position.y + tmp.y * sc; p[k + 2] = body.position.z + tmp.z * sc;
              const vn = v[k] * nx + v[k + 1] * ny + v[k + 2] * nz;
              if (vn < 0) {
                v[k] -= vn * nx; v[k + 1] -= vn * ny; v[k + 2] -= vn * nz;
                body.applyImpulse(new CANNON.Vec3(vn * nx * mass, vn * ny * mass, vn * nz * mass));
              }
            }
            continue;
          }
          body.quaternion.conjugate(inv);
          inv.vmult(tmp, loc);
          const hx = halves[b][0] + r, hy = halves[b][1] + r, hz = halves[b][2] + r;
          if (Math.abs(loc.x) < hx && Math.abs(loc.y) < hy && Math.abs(loc.z) < hz) {
            const ex = hx - Math.abs(loc.x), ey = hy - Math.abs(loc.y), ez = hz - Math.abs(loc.z);
            const nl = new CANNON.Vec3();
            if (ex <= ey && ex <= ez) { loc.x = Math.sign(loc.x || 1) * hx; nl.set(Math.sign(loc.x), 0, 0); }
            else if (ey <= ez) { loc.y = Math.sign(loc.y || 1) * hy; nl.set(0, Math.sign(loc.y), 0); }
            else { loc.z = Math.sign(loc.z || 1) * hz; nl.set(0, 0, Math.sign(loc.z)); }
            body.quaternion.vmult(loc, tmp);
            const nw = body.quaternion.vmult(nl);
            p[k] = body.position.x + tmp.x; p[k + 1] = body.position.y + tmp.y; p[k + 2] = body.position.z + tmp.z;
            const vn = v[k] * nw.x + v[k + 1] * nw.y + v[k + 2] * nw.z;
            if (vn < 0) {
              v[k] -= vn * nw.x; v[k + 1] -= vn * nw.y; v[k + 2] -= vn * nw.z;
              // 体を押す（粒の勢いを体へ）。押されるのは表面に当たったときだけ
              body.applyImpulse(new CANNON.Vec3(vn * nw.x * mass, vn * nw.y * mass, vn * nw.z * mass), body.position.vadd(tmp));
            }
          }
        }
      }
      world.step(dt);
    }
    pos.set(p, fr * n * 3);
    bodies.forEach((b, i) => {
      const o = (fr * bodies.length + i) * 7;
      doll[o] = b.position.x; doll[o + 1] = b.position.y; doll[o + 2] = b.position.z;
      doll[o + 3] = b.quaternion.x; doll[o + 4] = b.quaternion.y; doll[o + 5] = b.quaternion.z; doll[o + 6] = b.quaternion.w;
    });
  }
  const res: SlimeResult = {
    frames,
    n,
    pos,
    doll,
    parts: names.map((nm) => ({ name: nm, size: rd.sizes[nm], look: rd.looks[nm] })),
  };
  cache.set(key, res);
  return res;
};
