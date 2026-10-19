import * as CANNON from "cannon-es";

// 布（ふとん・毛布）のシミュレーション。点（粒）を格子に並べて、となりどうしの距離を保つように直していく
// （Position Based Dynamics という方法）。重力と空気の抵抗で落ちてきて、ベッドや人の体にぶつかって形が決まる
export type ClothSpec = {
  // 大きさ（m）と、粒の数
  w: number;
  h: number;
  nx: number;
  ny: number;
  // 空気の抵抗（大きいほど、ふわふわ ゆっくり落ちる。軽くて面積の広い布ほど大きい）
  drag: number;
  // 曲がりにくさ（0〜1。羽毛布団は大きい、シルクは小さい）
  bend: number;
  // 体やベッドとの すべりにくさ（0〜1）
  friction: number;
  // 布の厚さ（ぶつかる判定と見た目に使う）
  thick: number;
  // 最初の高さ（m）と、落とし始める時刻（秒）
  y0: number;
  start: number;
};

export type Collider =
  | { kind: "box"; body: CANNON.Body; half: [number, number, number] }
  | { kind: "sphere"; body: CANNON.Body; r: number };

type Link = [number, number, number, number];

export const makeCloth = (spec: ClothSpec, cx: number, cz: number) => {
  const { nx, ny, w, h } = spec;
  const n = nx * ny;
  const p = new Float32Array(n * 3);
  const q = new Float32Array(n * 3);
  const dx = w / (nx - 1);
  const dz = h / (ny - 1);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3;
      // 少しだけ傾けて持つ（落ちるときに片側から先につく）
      p[k] = cx - w / 2 + i * dx;
      p[k + 1] = spec.y0 + (i / (nx - 1) - 0.5) * 0.12;
      p[k + 2] = cz - h / 2 + j * dz;
    }
  }
  q.set(p);
  // つながり：となり（伸びない）、ななめ（ゆがまない）、ひとつとばし（曲がりにくさ）
  const links: Link[] = [];
  const add = (a: number, b: number, s: number) => {
    const ka = a * 3;
    const kb = b * 3;
    const L = Math.hypot(p[ka] - p[kb], p[ka + 1] - p[kb + 1], p[ka + 2] - p[kb + 2]);
    links.push([a, b, L, s]);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * nx + i;
      if (i + 1 < nx) add(a, a + 1, 1);
      if (j + 1 < ny) add(a, a + nx, 1);
      if (i + 1 < nx && j + 1 < ny) {
        add(a, a + nx + 1, 0.6);
        add(a + 1, a + nx, 0.6);
      }
      if (i + 2 < nx) add(a, a + 2, spec.bend);
      if (j + 2 < ny) add(a, a + 2 * nx, spec.bend);
    }
  }
  const tmp = new CANNON.Vec3();
  const loc = new CANNON.Vec3();
  const inv = new CANNON.Quaternion();
  const r = spec.thick / 2 + 0.008;

  const collide = (cols: Collider[]) => {
    for (let k = 0; k < n * 3; k += 3) {
      // 床
      if (p[k + 1] < r) {
        p[k + 1] = r;
        q[k] += (p[k] - q[k]) * spec.friction;
        q[k + 2] += (p[k + 2] - q[k + 2]) * spec.friction;
      }
      for (const c of cols) {
        const b = c.body;
        tmp.set(p[k] - b.position.x, p[k + 1] - b.position.y, p[k + 2] - b.position.z);
        if (c.kind === "sphere") {
          const d = tmp.length();
          const R = c.r + r;
          if (d < R && d > 1e-6) {
            const s = R / d;
            p[k] = b.position.x + tmp.x * s;
            p[k + 1] = b.position.y + tmp.y * s;
            p[k + 2] = b.position.z + tmp.z * s;
            q[k] += (p[k] - q[k]) * spec.friction;
            q[k + 1] += (p[k + 1] - q[k + 1]) * spec.friction;
            q[k + 2] += (p[k + 2] - q[k + 2]) * spec.friction;
          }
          continue;
        }
        // 箱：箱の向きにそろえて、中に入っていたら いちばん近い面の外へ出す
        b.quaternion.conjugate(inv);
        inv.vmult(tmp, loc);
        const hx = c.half[0] + r;
        const hy = c.half[1] + r;
        const hz = c.half[2] + r;
        if (Math.abs(loc.x) < hx && Math.abs(loc.y) < hy && Math.abs(loc.z) < hz) {
          const ex = hx - Math.abs(loc.x);
          const ey = hy - Math.abs(loc.y);
          const ez = hz - Math.abs(loc.z);
          if (ey <= ex && ey <= ez) {
            loc.y = Math.sign(loc.y || 1) * hy;
          } else if (ex <= ez) {
            loc.x = Math.sign(loc.x || 1) * hx;
          } else {
            loc.z = Math.sign(loc.z || 1) * hz;
          }
          b.quaternion.vmult(loc, tmp);
          p[k] = b.position.x + tmp.x;
          p[k + 1] = b.position.y + tmp.y;
          p[k + 2] = b.position.z + tmp.z;
          q[k] += (p[k] - q[k]) * spec.friction;
          q[k + 1] += (p[k + 1] - q[k + 1]) * spec.friction;
          q[k + 2] += (p[k + 2] - q[k + 2]) * spec.friction;
        }
      }
    }
  };

  // 各点の面の向き（となりの点から求める）
  const nrm = new Float32Array(n * 3);
  const normals = () => {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = (j * nx + Math.min(nx - 1, i + 1)) * 3;
        const b = (j * nx + Math.max(0, i - 1)) * 3;
        const c = (Math.min(ny - 1, j + 1) * nx + i) * 3;
        const d = (Math.max(0, j - 1) * nx + i) * 3;
        const ux = p[a] - p[b];
        const uy = p[a + 1] - p[b + 1];
        const uz = p[a + 2] - p[b + 2];
        const wx = p[c] - p[d];
        const wy = p[c + 1] - p[d + 1];
        const wz = p[c + 2] - p[d + 2];
        let x = uy * wz - uz * wy;
        let y = uz * wx - ux * wz;
        let z = ux * wy - uy * wx;
        const L = Math.hypot(x, y, z) || 1;
        x /= L;
        y /= L;
        z /= L;
        const k = (j * nx + i) * 3;
        nrm[k] = x;
        nrm[k + 1] = y;
        nrm[k + 2] = z;
      }
    }
  };

  const step = (t: number, dt: number, g: number, cols: Collider[]) => {
    if (t < spec.start) {
      return;
    }
    // 速さ（前の位置との差）に、空気の抵抗をかけて進める。
    // 空気は布の面に垂直な向きの動きを強くじゃまする（面にそってすべる動きは少しだけ）。
    // そのため、布は ひらひらと横へすべりながら落ちる
    normals();
    const keepT = Math.max(0, 1 - spec.drag * 0.08 * dt);
    for (let k = 0; k < n * 3; k += 3) {
      let vx = (p[k] - q[k]) * keepT;
      let vy = (p[k + 1] - q[k + 1]) * keepT;
      let vz = (p[k + 2] - q[k + 2]) * keepT;
      const vn = vx * nrm[k] + vy * nrm[k + 1] + vz * nrm[k + 2];
      const cut = vn * Math.min(1, spec.drag * dt);
      vx -= nrm[k] * cut;
      vy -= nrm[k + 1] * cut;
      vz -= nrm[k + 2] * cut;
      q[k] = p[k];
      q[k + 1] = p[k + 1];
      q[k + 2] = p[k + 2];
      p[k] += vx;
      p[k + 1] += vy - g * dt * dt;
      p[k + 2] += vz;
    }
    for (let it = 0; it < 14; it++) {
      for (const [a, b, L, s] of links) {
        const ka = a * 3;
        const kb = b * 3;
        const ex = p[kb] - p[ka];
        const ey = p[kb + 1] - p[ka + 1];
        const ez = p[kb + 2] - p[ka + 2];
        const d = Math.hypot(ex, ey, ez);
        if (d < 1e-9) continue;
        // 曲がりにくさのつながりは、縮むのだけ防ぐ（伸びは となりのつながりが防ぐ）
        if (s < 1 && s !== 0.6 && d > L) continue;
        const f = ((d - L) / d) * 0.5 * s;
        p[ka] += ex * f;
        p[ka + 1] += ey * f;
        p[ka + 2] += ez * f;
        p[kb] -= ex * f;
        p[kb + 1] -= ey * f;
        p[kb + 2] -= ez * f;
      }
      if (it % 2 === 1) {
        collide(cols);
      }
    }
  };
  return { p, n, step };
};
