import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  AbsoluteFill,
  Audio,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  TRAIN_KINDS,
  GOLD_GONE,
  GOLD_SIDE,
  TANK,
  BOUNCE_KINDS,
  TINY,
  TINY_KINDS,
  AIR_KINDS,
  FRICTION_KINDS,
  FRICTION_OFF,
  HitSound,
  SimKind,
  SimResult,
  simulate,
} from "../sim/scenes";
import { fontFamily } from "../theme";

// 物理エンジンで計算した場面を、3D で描く（人は関節つきの人形）

const LANE_COLORS = ["#ff4a3d", "#2f8bff"];
const PARTY_SHIRTS = ["#ff4a3d", "#ffb020", "#2fc46b", "#2f8bff", "#b25cff"];

type Cam = { pos: [number, number, number]; look: [number, number, number] };

// 下の字幕に隠れないよう、カメラの中心を画面の上寄りにずらす（px）
const LIFT = 120;

const setLift = (c: THREE.PerspectiveCamera, width: number, height: number) => {
  c.setViewOffset(width, height + 2 * LIFT, 0, 2 * LIFT, width, height);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// フレームごとの物体の位置
const posAt = (sim: SimResult, f: number, i: number): [number, number, number] => {
  const o = (Math.min(f, sim.frames - 1) * sim.bodies.length + i) * 7;
  return [sim.data[o], sim.data[o + 1], sim.data[o + 2]];
};

const quatAt = (sim: SimResult, f: number, i: number): [number, number, number, number] => {
  const o = (Math.min(f, sim.frames - 1) * sim.bodies.length + i) * 7;
  return [sim.data[o + 3], sim.data[o + 4], sim.data[o + 5], sim.data[o + 6]];
};

const findIndex = (sim: SimResult, shape: string, lane: number) =>
  sim.bodies.findIndex((b) => b.shape === shape && b.lane === lane);

// 場面ごとのカメラ
const cameraFor = (sim: SimResult, f: number, total: number): Cam => {
  const t = f / Math.max(1, total - 1);
  switch (sim.kind) {
    case "scale":
      return { pos: [0, 1.7, lerp(9.0, 8.5, t)], look: [0, 1.15, 0] };
    case "jump":
      return { pos: [0, 2.2, lerp(9.4, 8.8, t)], look: [0, 2.0, 0] };
    case "slip":
      return { pos: [0.9, 1.5, lerp(8.8, 8.2, t)], look: [0.9, 0.85, 0] };
    case "trconst":
    case "tracc":
    case "trbrake":
      // 床の印（跳んだ位置・着地した位置）が見えるよう、上から見下ろす
      return { pos: [0, 4.4, lerp(8.4, 8.0, t)], look: [0, 0.3, -0.3] };
    case "gold":
    case "goldgone":
      // 人の後ろから、金の立方体を見上げる
      return { pos: [lerp(-6, 6, t), 6, 95], look: [0, 8, -6] };
    case "ice":
      // 水そうの中が見えるよう、少し上から見下ろす
      return { pos: [0, 2.4, lerp(6.4, 6.0, t)], look: [0, 0.7, 0.2] };
    case "bjump":
      return { pos: [0, 2.6, lerp(11.2, 10.6, t)], look: [0, 2.5, 0] };
    case "bdrop":
      // 卵が落ちる地面が、下の字幕にかからないよう、上から見下ろす
      return { pos: [0.15, 2.3, lerp(5.4, 5.1, t)], look: [0.15, 0.6, 0.3] };
    case "bwall":
      return { pos: [-0.1, 2.9, lerp(11.5, 10.9, t)], look: [-0.1, 2.5, 0] };
    case "tworld": {
      // 大きな物のまわりを、ゆっくり一周する（40秒で一周。simStart で向きを選べる）
      const a = (f / sim.fps) * ((Math.PI * 2) / 40);
      return { pos: [Math.sin(a) * 5.6, 1.8, Math.cos(a) * 5.6], look: [0, 1.15, 0] };
    }
    case "tlift":
      return { pos: [0, 1.75, lerp(7.6, 7.2, t)], look: [0, 1.45, 0] };
    case "tjump":
      return { pos: [0, 5.4, lerp(18.5, 17.5, t)], look: [0, 4.9, 0] };
    case "tfall": {
      const a = lerp(-0.2, 0.2, t);
      return { pos: [Math.sin(a) * 5.8, 6.4, Math.cos(a) * 5.8], look: [0, 2.35, 0] };
    }
    case "twind":
      return { pos: [0.6, 1.8, lerp(10.4, 9.8, t)], look: [0.6, 1.25, 0] };
    case "train":
      return { pos: [0, 1.65, lerp(7.8, 7.4, t)], look: [0, 1.3, 0] };
    case "afeather":
      return { pos: [0, 1.6, lerp(8.2, 7.8, t)], look: [0, 1.6, 0] };
    case "arain":
      return { pos: [0, 1.6, lerp(8.4, 7.9, t)], look: [0, 1.25, 0] };
    case "asky": {
      // 落ちていく2人を、ななめ上からゆっくり回りこんで見る
      const a = lerp(-0.2, 0.2, t);
      return { pos: [Math.sin(a) * 5.8, 6.4, Math.cos(a) * 5.8], look: [0, 2.35, 0] };
    }
    case "throw":
    case "athrow":
    case "aplane": {
      // いちばん遠くまで飛んでいるボールを追いかけて、だんだん引く
      let far = 0;
      const shape = sim.kind === "aplane" ? "plane" : "sphere";
      for (let k = 0; k <= f; k++) {
        for (const lane of [0, 1]) {
          far = Math.max(far, posAt(sim, k, findIndex(sim, shape, lane))[0]);
        }
      }
      const air = sim.kind !== "throw";
      if (air) {
        far = Math.min(far, 9);
      }
      const cx = air ? 0.3 + far * 0.4 : 0.8 + far * 0.5;
      const d = air ? 8 + far * 0.8 : 6.5 + far * 0.55;
      if (air) {
        return { pos: [cx, 1.8 + far * 0.12, d], look: [cx, 0.9 + far * 0.12, 0] };
      }
      return { pos: [cx, 1.8 + far * 0.12, d], look: [cx, 1.6 + far * 0.1, 0] };
    }
    case "tunnel":
    case "tunnelzero": {
      // 落ちていく人を、ななめ上から追いかける
      const pi = sim.bodies.findIndex((b) => b.part === "pelvis");
      const p = posAt(sim, f, pi);
      return { pos: [p[0] + 1.6, p[1] + 2.9, p[2] + 2.9], look: [p[0], p[1] - 0.2, p[2]] };
    }
    case "wind":
      return { pos: [-0.2, 1.7, lerp(9.6, 9.0, t)], look: [-0.2, 1.15, 0] };
    case "fstand":
      return { pos: [0, 1.5, lerp(8.6, 8.0, t)], look: [0, 0.85, 0] };
    case "fpush":
    case "xpush":
      return { pos: [0.9, 1.9, lerp(10.2, 9.6, t)], look: [0.9, 0.8, 0] };
    case "ladder":
      // 斜め前から見下ろす（手前と奥のはしごが重ならないように）
      return { pos: [lerp(-6.0, -5.4, t), 4.0, 8.2], look: [-0.4, 1.2, -0.3] };
    case "fchaos": {
      const a = lerp(-0.3, 0.3, t);
      return { pos: [Math.sin(a) * 7.6, 2.1, Math.cos(a) * 7.6], look: [0, 1.1, 0] };
    }
    case "xslide":
      return { pos: [0.4, 2.3, lerp(9.6, 9.1, t)], look: [0.4, 1.35, 0] };
    case "brake":
    case "fbrake":
    case "xbrake": {
      // 2台の車のまん中を見る（止まれない車は、そのまま画面の外へ走り去る）
      const mid =
        (posAt(sim, f, findIndex(sim, "car", 0))[0] +
          posAt(sim, f, findIndex(sim, "car", 1))[0]) /
        2;
      // 重力が強い世界の車は手前で止まるので、そのときは少し左を見る
      const near = Math.min(
        posAt(sim, f, findIndex(sim, "car", 0))[0],
        posAt(sim, f, findIndex(sim, "car", 1))[0],
      );
      const cx = Math.min(Math.max(-1, mid), 10) + (near > 2.5 ? 2 : 0.8);
      return { pos: [cx - 5, 9, 17], look: [cx + 0.5, 0, 0] };
    }
    default: {
      const a = lerp(-0.35, 0.35, t);
      return {
        pos: [Math.sin(a) * 10.5, 2.6, Math.cos(a) * 10.5],
        look: [0, 2.0, 0],
      };
    }
  }
};

// 3D の点を画面の座標へ（HTML のラベルを物体に合わせて置くため）
const project = (
  cam: Cam,
  p: [number, number, number],
  width: number,
  height: number,
) => {
  const c = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
  setLift(c, width, height);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.look));
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
};

const CameraRig: React.FC<{ cam: Cam; width: number; height: number }> = ({
  cam,
  width,
  height,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  setLift(camera, width, height);
  camera.position.set(...cam.pos);
  camera.lookAt(new THREE.Vector3(...cam.look));
  camera.updateProjectionMatrix();
  return null;
};

// 地面の模様（1m ごとのタイル。動きや距離が分かるように）
const useGroundTexture = (kind: SimKind) =>
  useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    if (TRAIN_KINDS.includes(kind)) {
      // 電車の床（灰色のゴムの床に、細かい粒）
      ctx.fillStyle = "#8e959e";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 1400; i++) {
        const g = 120 + ((i * 97) % 40);
        ctx.fillStyle = `rgb(${g},${g + 4},${g + 10})`;
        ctx.fillRect((i * 53) % size, (i * 131) % size, 2, 2);
      }
    } else if (TINY_KINDS.includes(kind)) {
      // 木の床（板の幅は 10cmの人の世界で 10cm → 拡大して 1.75m）
      const plank = ["#b98a5a", "#c49464", "#ae8052", "#bf8f5d"];
      plank.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, (i * size) / 4, size, size / 4);
        ctx.fillStyle = "rgba(60,35,15,0.55)";
        ctx.fillRect(0, (i * size) / 4, size, 2);
      });
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(90,55,25,${0.08 + ((i * 37) % 10) / 100})`;
        ctx.fillRect((i * 53) % size, (i * 131) % size, 30 + ((i * 17) % 40), 1);
      }
    } else if (kind === "brake" || kind === "fbrake" || kind === "xbrake") {
      ctx.fillStyle = "#4a4d55";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 1800; i++) {
        const g = 60 + ((i * 97) % 40);
        ctx.fillStyle = `rgb(${g},${g + 2},${g + 8})`;
        ctx.fillRect((i * 53) % size, (i * 131) % size, 2, 2);
      }
    } else {
      ctx.fillStyle = "#8cc965";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#80bd5a";
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    // brake は 4m、それ以外は 2m（タイル1枚が1m）ごとにくり返す
    const unit = TINY_KINDS.includes(kind) ? 7 : kind === "brake" || kind === "fbrake" || kind === "xbrake" ? 4 : 2;
    tex.repeat.set(200 / unit, 200 / unit);
    tex.anisotropy = 8;
    return tex;
  }, [kind]);

// 目盛り（ジャンプの高さ・投げた距離）
const useRulerTexture = (labels: string[], vertical: boolean) =>
  useMemo(() => {
    const canvas = document.createElement("canvas");
    const n = labels.length - 1;
    canvas.width = vertical ? 160 : 128 * n;
    canvas.height = vertical ? 128 * n : 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    ctx.font = "bold 44px sans-serif";
    labels.forEach((label, i) => {
      if (vertical) {
        const y = canvas.height - (i / n) * canvas.height;
        ctx.fillRect(0, Math.min(canvas.height - 6, Math.max(0, y - 3)), 70, 6);
        if (label) {
          ctx.fillText(label, 76, Math.min(canvas.height - 6, Math.max(40, y + 16)));
        }
      } else {
        const x = (i / n) * canvas.width;
        ctx.fillRect(Math.min(canvas.width - 6, Math.max(0, x - 3)), 0, 6, 70);
        if (label) {
          ctx.fillText(label, Math.min(canvas.width - 70, Math.max(4, x - 20)), 130);
        }
      }
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [labels, vertical]);

// 効果音の種類ごとの最大音量と、最大になるぶつかる速さ（m/s）
const HIT_SOUNDS: Record<HitSound, { file: string; max: number; ref: number }> = {
  body: { file: "sfx/thud1.wav", max: 0.3, ref: 5 },
  ball: { file: "sfx/tok.wav", max: 0.22, ref: 9 },
  cone: { file: "sfx/clack.wav", max: 0.25, ref: 6 },
};

const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const HAIR = "#3a2a20";

const partGeometry = (part: string, size: [number, number, number]) => {
  const [w, h, d] = size;
  if (part === "head") {
    return new THREE.SphereGeometry(w / 2, 32, 24);
  }
  if (/upperArm|lowerArm|thigh|shin/.test(part)) {
    const r = Math.min(w, d) / 2;
    return new THREE.CapsuleGeometry(r, Math.max(0.01, h - 2 * r), 8, 16);
  }
  return new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * 0.35);
};

// 地球を貫く穴の壁：岩の地層の模様と、一定の間隔の明かり。壁は落ちる人のまわりにだけ描き、
// 模様の位置を高さに合わせてずらして、ずっと続く穴に見せる
const useRockTexture = () =>
  useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    let y = 0;
    let k = 0;
    while (y < 512) {
      const h = 8 + ((k * 37) % 29);
      const c = 70 + ((k * 53) % 60);
      ctx.fillStyle = `rgb(${c + 40},${c},${Math.round(c * 0.6)})`;
      ctx.fillRect(0, y, 256, h);
      y += h;
      k++;
    }
    for (let i = 0; i < 1500; i++) {
      const g = (i * 71) % 90;
      ctx.fillStyle = `rgba(${g + 20},${g},${g * 0.5},0.5)`;
      ctx.fillRect((i * 97) % 256, (i * 151) % 512, 3, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(4, 6);
    return tex;
  }, []);

// y：壁を置く高さ（落ちる人のまわり）、phase：模様を流す量（m）。人がその場にいても、壁が流れて速さが見える
const Shaft: React.FC<{ y: number; phase?: number }> = ({ y, phase = 0 }) => {
  const tex = useRockTexture();
  const H = 60;
  const yy = y - phase;
  // 模様の1回分が10m。壁の中心が y にあっても、模様は高さで決まる位置に見える
  tex.offset.y = (((yy - H / 2) / 10) % 1 + 1) % 1;
  const lamps = [];
  for (let h = Math.ceil((yy - 28) / 6) * 6; h < yy + 28; h += 6) {
    lamps.push(h + phase);
  }
  return (
    <group>
      <mesh position={[0, y, 0]}>
        <cylinderGeometry args={[2.8, 2.8, H, 48, 1, true]} />
        <meshStandardMaterial map={tex} side={THREE.BackSide} roughness={0.95} />
      </mesh>
      {lamps.map((h) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.72, 0.05, 8, 64]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={2.5} />
        </mesh>
      ))}
    </group>
  );
};

// 羽根（白い羽根と、まん中の軸）
const Feather: React.FC = () => (
  // 小さくて見えにくいので、見た目は2倍にする
  <group scale={2}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[0.032, 0.105, 1]} castShadow>
      <circleGeometry args={[1, 32]} />
      <meshStandardMaterial color="#fbfbf6" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.003, 0.01]}>
      <cylinderGeometry args={[0.003, 0.002, 0.24, 6]} />
      <meshStandardMaterial color="#c9b9a0" roughness={0.6} />
    </mesh>
  </group>
);

// 紙ひこうき（機首が +x）
const usePlaneGeometry = () =>
  useMemo(() => {
    const g = new THREE.BufferGeometry();
    const v = [
      // 左の翼
      0.14, 0.0, 0.0, -0.13, 0.01, -0.1, -0.13, 0.0, 0.0,
      // 右の翼
      0.14, 0.0, 0.0, -0.13, 0.0, 0.0, -0.13, 0.01, 0.1,
      // 胴（下に折った部分）
      0.14, 0.0, 0.0, -0.13, 0.0, 0.0, -0.13, -0.045, 0.0,
    ];
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, []);

const PaperPlane: React.FC<{ color: string }> = ({ color }) => {
  const geom = usePlaneGeometry();
  return (
    <mesh geometry={geom} castShadow scale={2.2}>
      <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ビーチボールのしま模様
const useBeachTexture = () =>
  useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const colors = ["#ff3b3b", "#ffffff", "#ffd21a", "#ffffff", "#2f8bff", "#ffffff"];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((i * 512) / colors.length, 0, 512 / colors.length + 1, 256);
    });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 18);
    ctx.fillRect(0, 238, 512, 18);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

// 500円玉（10cmの人の世界を17.5倍に拡大：直径46cm・厚さ3.2cm）
const Coin: React.FC<{ y?: number; rot?: number }> = ({ y = 0, rot = 0 }) => (
  <group position={[0, y, 0]} rotation={[0, rot, 0]}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.23, 0.23, 0.032, 48]} />
      {/* 金属らしさを強くすると、映りこむ景色がないので黒っぽくなる。少しおさえて明るい金色に */}
      <meshStandardMaterial color="#e3bf63" roughness={0.38} metalness={0.35} />
    </mesh>
    {/* ふちの模様と、表面の円 */}
    <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.19, 0.205, 48]} />
      <meshStandardMaterial color="#b8923f" roughness={0.45} metalness={0.35} />
    </mesh>
  </group>
);

// 10cmの人のまわりの物（17.5倍に拡大して置く）。label はラベルを出す位置
const TINY_PROPS: { name: string; label: [number, number, number] }[] = [
  { name: "500円玉（直径46cm）", label: [1.7, 0.75, -0.3] },
  { name: "鉛筆（長さ3m）", label: [-0.2, 0.45, -1.7] },
  { name: "スマホ（高さ2.6m）", label: [-2.0, 2.9, -0.4] },
  { name: "米つぶ（9cm）", label: [0.9, 0.35, 1.2] },
];

const TinyProps: React.FC = () => (
  <group>
    {/* 立てた500円玉 */}
    <group position={[1.7, 0.23, -0.3]} rotation={[Math.PI / 2, 0, -0.35]}>
      <Coin />
    </group>
    {/* 寝かせた鉛筆（六角形・長さ3m・太さ12cm） */}
    <group position={[-0.2, 0.06, -1.7]} rotation={[0, 0.15, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.6, 6]} />
        <meshStandardMaterial color="#f2c230" roughness={0.5} />
      </mesh>
      <mesh position={[0, -1.5, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.012, 0.4, 6]} />
        <meshStandardMaterial color="#e7cfa6" roughness={0.8} />
      </mesh>
      <mesh position={[0, -1.72, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.012, 0.05, 6]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.36, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.12, 16]} />
        <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.058, 0.16, 16]} />
        <meshStandardMaterial color="#f08aa0" roughness={0.8} />
      </mesh>
    </group>
    {/* 立てたスマホ（高さ2.6m・幅1.25m・厚さ14cm） */}
    <group position={[-2.0, 1.31, -0.4]} rotation={[0, 0.5, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.25, 2.62, 0.14]} />
        <meshStandardMaterial color="#15171c" roughness={0.25} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.071]}>
        <planeGeometry args={[1.12, 2.45]} />
        <meshStandardMaterial color="#1f3a66" emissive="#2a5aa8" emissiveIntensity={0.35} roughness={0.1} />
      </mesh>
    </group>
    {/* 米つぶ（長さ5mm → 9cm） */}
    {[[0.9, 1.2, 0.3], [1.05, 1.35, 1.2], [0.75, 1.4, 2.1]].map(([x, z, r], k) => (
      <mesh key={k} position={[x, 0.025, z]} rotation={[0, r, Math.PI / 2]} scale={[1, 1, 0.75]} castShadow>
        <capsuleGeometry args={[0.025, 0.045, 6, 12]} />
        <meshStandardMaterial color="#fbf8ef" roughness={0.6} />
      </mesh>
    ))}
  </group>
);

// トランポリンの地面：人や物が沈んだ所が、まわりごとへこむマット
const TrampMat: React.FC<{
  sim: SimResult;
  f: number;
  lane: number;
  area: [number, number, number, number];
}> = ({ sim, f, lane, area }) => {
  const [cx, cz, w, d] = area;
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1b2433";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(120,150,200,0.25)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w, d);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [w, d]);
  // その瞬間に沈んでいる所（人の部位・卵）
  const dents: [number, number, number][] = [];
  sim.bodies.forEach((b, i) => {
    if (b.lane !== lane || !(b.shape === "part" || b.shape === "egg")) {
      return;
    }
    const p = posAt(sim, f, i);
    const low = p[1] - b.size[1] / 2;
    if (low < 0) {
      dents.push([p[0], p[2], -low]);
    }
  });
  const geom = useMemo(() => new THREE.PlaneGeometry(w, d, Math.round(w * 10), Math.round(d * 10)), [w, d]);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < pos.count; k++) {
    // 平面の (x, y) は、地面では (x, -z)
    const x = pos.getX(k) + cx;
    const z = -pos.getY(k) + cz;
    let dip = 0;
    for (const [dx, dz, dd] of dents) {
      const r2 = (x - dx) ** 2 + (z - dz) ** 2;
      dip = Math.max(dip, dd * Math.exp(-r2 / (2 * 0.5 * 0.5)));
    }
    pos.setZ(k, 0.004 - dip);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return (
    <group>
      <mesh geometry={geom} position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* まわりのふち（青いクッション） */}
      {[
        [cx, cz - d / 2, w + 0.3, 0.3],
        [cx, cz + d / 2, w + 0.3, 0.3],
        [cx - w / 2, cz, 0.3, d],
        [cx + w / 2, cz, 0.3, d],
      ].map(([x, z, ww, dd], k) => (
        <mesh key={k} position={[x, 0.06, z]} castShadow receiveShadow>
          <boxGeometry args={[ww, 0.12, dd]} />
          <meshStandardMaterial color="#2f7bff" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// トランポリンではねた瞬間（マットに沈み始めた瞬間）の「ボヨン」と、卵が割れた「グシャ」。
// 音量は、そのあといちばん深く沈んだ深さで決める
const BounceSounds: React.FC<{ sim: SimResult; offset: number }> = ({ sim, offset }) => {
  const deep = sim.values.deep1;
  const out: React.ReactNode[] = [];
  if (deep) {
    for (let k = 1; k < sim.frames; k++) {
      if (deep[k - 1] < 0.03 && deep[k] >= 0.03 && k >= offset) {
        let mx = 0;
        for (let j = k; j < Math.min(sim.frames, k + 12); j++) {
          mx = Math.max(mx, deep[j]);
        }
        out.push(
          <Sequence key={`bo${k}`} from={k - offset} durationInFrames={20}>
            <Audio src={staticFile("sfx/boing.wav")} volume={Math.min(0.3, 0.08 + mx * 0.5)} />
          </Sequence>,
        );
      }
    }
  }
  const br = sim.values.broken0;
  if (br) {
    const k = br.findIndex((x) => x > 0);
    if (k >= offset) {
      out.push(
        <Sequence key="crack" from={k - offset} durationInFrames={20}>
          <Audio src={staticFile("sfx/crack.wav")} volume={0.28} />
        </Sequence>,
      );
    }
  }
  return <>{out}</>;
};

// 生卵（割れたら、黄身と白身と殻のかけら）
const Egg: React.FC<{ broken: boolean }> = ({ broken }) =>
  broken ? (
    <group position={[0, -0.008, 0]} scale={1.6}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.4, 1, 1]}>
        <circleGeometry args={[0.09, 32]} />
        <meshStandardMaterial color="#f4f1e6" roughness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.01, 0.006, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.032, 24, 16]} />
        <meshStandardMaterial color="#ffb21f" roughness={0.25} />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[Math.cos(k * 1.3) * 0.1, 0.006, Math.sin(k * 1.3) * 0.07]} rotation={[k, k * 2, 0]}>
          <boxGeometry args={[0.025, 0.004, 0.018]} />
          <meshStandardMaterial color="#f3e6cf" roughness={0.6} />
        </mesh>
      ))}
    </group>
  ) : (
    // 小さくて見えにくいので、見た目は1.8倍にする
    <mesh scale={[1.8, 2.3, 1.8]} castShadow>
      <sphereGeometry args={[0.035, 24, 18]} />
      <meshStandardMaterial color="#f3e6cf" roughness={0.45} />
    </mesh>
  );

// 金の延べ棒を積み上げた模様（1本 約25cm × 8cm）
const useGoldTexture = () =>
  useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e7b53c";
    ctx.fillRect(0, 0, 512, 512);
    const bw = 64;
    const bh = 22;
    for (let r = 0; r < 512 / bh; r++) {
      for (let c = -1; c < 512 / bw + 1; c++) {
        const x = c * bw + (r % 2) * (bw / 2);
        const y = r * bh;
        const g = ctx.createLinearGradient(x, y, x, y + bh);
        g.addColorStop(0, "#ffe9a3");
        g.addColorStop(0.45, "#f2c14e");
        g.addColorStop(1, "#b9852a");
        ctx.fillStyle = g;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(GOLD_SIDE / 2, GOLD_SIDE / 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

const GoldCube: React.FC<{ gone: number; t: number }> = ({ gone, t }) => {
  const tex = useGoldTexture();
  const s = 1 - gone;
  const c: [number, number, number] = [0, GOLD_SIDE / 2, -GOLD_SIDE / 2 - 1];
  return (
    <group>
      {s > 0.01 ? (
        <mesh position={[c[0], (GOLD_SIDE / 2) * s, c[2]]} scale={[s, s, s]} castShadow receiveShadow>
          <boxGeometry args={[GOLD_SIDE, GOLD_SIDE, GOLD_SIDE]} />
          <meshStandardMaterial map={tex} roughness={0.32} metalness={0.45} emissive="#7a5200" emissiveIntensity={0.55} />
        </mesh>
      ) : null}
      {/* 消えるときのきらきら */}
      {gone > 0 && gone < 1
        ? Array.from({ length: 70 }, (_, i) => {
            const a = random(`ga${i}`) * Math.PI * 2;
            const r = random(`gr${i}`) * GOLD_SIDE * 0.6;
            const up = gone * (6 + random(`gu${i}`) * 14);
            return (
              <mesh key={i} position={[c[0] + Math.cos(a) * r, 2 + random(`gy${i}`) * GOLD_SIDE * 0.8 + up, c[2] + Math.sin(a) * r]}>
                <octahedronGeometry args={[0.35 + 0.3 * Math.sin(t * 9 + i), 0]} />
                <meshBasicMaterial color="#fff2a8" transparent opacity={1 - gone} />
              </mesh>
            );
          })
        : null}
    </group>
  );
};

// 電車の外の景色（電柱と建物）。電車が進んだ距離だけ、横に流す
const useSceneryTexture = () =>
  useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#6fb3ff");
    sky.addColorStop(1, "#d8ecff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 14; i++) {
      const w = 50 + ((i * 37) % 60);
      const h = 60 + ((i * 53) % 110);
      ctx.fillStyle = ["#9aa8b8", "#b9c3cf", "#8a97a8", "#c7b9a8"][i % 4];
      ctx.fillRect(i * 75, 200 - h, w, h);
    }
    ctx.fillStyle = "#6c9a4e";
    ctx.fillRect(0, 196, 1024, 60);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#4a4f57";
      ctx.fillRect(i * 256 + 120, 20, 10, 200);
      ctx.fillRect(i * 256 + 100, 40, 50, 6);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

// 電車の車内（後ろのかべと窓、つり革）。窓の外の景色は、電車の進んだ距離 pos だけ流れる
const TrainCar: React.FC<{ x0: number; pos: number }> = ({ x0, pos }) => {
  const base = useSceneryTexture();
  const tex = useMemo(() => base.clone(), [base]);
  // 景色の1枚は横 40m 分（電柱 10m おき）
  tex.repeat.set(2.7 / 40, 1);
  tex.offset.x = (((pos / 40) % 1) + 1) % 1;
  tex.needsUpdate = true;
  const W = 2.7;
  return (
    <group>
      {/* 窓の外の景色 */}
      <mesh position={[x0, 1.45, -1.25]}>
        <planeGeometry args={[W, 0.9]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      {/* かべ（窓の下・上・窓わく） */}
      <mesh position={[x0, 0.5, -1.15]} receiveShadow>
        <boxGeometry args={[W, 1.0, 0.1]} />
        <meshStandardMaterial color="#d9dee6" roughness={0.7} />
      </mesh>
      <mesh position={[x0, 2.2, -1.15]}>
        <boxGeometry args={[W, 0.6, 0.1]} />
        <meshStandardMaterial color="#d9dee6" roughness={0.7} />
      </mesh>
      {[-W / 2, 0, W / 2].map((dx) => (
        <mesh key={dx} position={[x0 + dx, 1.45, -1.13]}>
          <boxGeometry args={[0.08, 0.9, 0.12]} />
          <meshStandardMaterial color="#b8c0cc" roughness={0.5} />
        </mesh>
      ))}
      {/* 座席 */}
      <mesh position={[x0, 0.25, -0.85]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.2, 0.45, 0.5]} />
        <meshStandardMaterial color="#3f6fb5" roughness={0.9} />
      </mesh>
      {/* つり革 */}
      <mesh position={[x0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, W, 8]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.6} roughness={0.3} />
      </mesh>
      {[-0.9, 0.9].map((dx) => (
        <group key={dx} position={[x0 + dx, 2.3, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.03, 0.3, 0.02]} />
            <meshStandardMaterial color="#e8e8e8" />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <torusGeometry args={[0.07, 0.015, 8, 20]} />
            <meshStandardMaterial color="#f2f2f2" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const PersonPart: React.FC<{
  part: string;
  size: [number, number, number];
  color: string;
  pos: [number, number, number];
  quat: [number, number, number, number];
}> = ({ part, size, color, pos, quat }) => {
  const geom = useMemo(() => partGeometry(part, size), [part, size]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh geometry={geom} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {part === "head" ? (
        <>
          {/* 髪 */}
          <mesh rotation={[-0.35, 0, 0]} castShadow>
            <sphereGeometry args={[size[0] / 2 + 0.008, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            <meshStandardMaterial color={HAIR} roughness={0.8} />
          </mesh>
          {/* 目 */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.042, 0.01, size[0] / 2 - 0.012]}>
              <sphereGeometry args={[0.017, 12, 12]} />
              <meshStandardMaterial color="#111" roughness={0.3} />
            </mesh>
          ))}
        </>
      ) : null}
    </group>
  );
};

const Car: React.FC<{ color: string }> = ({ color }) => {
  const body = useMemo(() => new RoundedBoxGeometry(4.0, 0.6, 1.7, 4, 0.18), []);
  const cabin = useMemo(() => new RoundedBoxGeometry(2.2, 0.55, 1.5, 4, 0.2), []);
  return (
    <group>
      <mesh geometry={body} position={[0, -0.12, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh geometry={cabin} position={[-0.25, 0.42, 0]} castShadow>
        <meshStandardMaterial color="#1d2a3a" roughness={0.15} metalness={0.5} />
      </mesh>
      {[-1.3, 1.3].map((x) =>
        [-0.78, 0.78].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.4, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.24, 24]} />
            <meshStandardMaterial color="#151515" roughness={0.9} />
          </mesh>
        )),
      )}
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[2.0, -0.05, z]}>
          <boxGeometry args={[0.04, 0.14, 0.3]} />
          <meshStandardMaterial color="#fff6c8" emissive="#fff6c8" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

const Cone: React.FC = () => (
  <group>
    <mesh castShadow>
      <cylinderGeometry args={[0.05, 0.2, 0.6, 24]} />
      <meshStandardMaterial color="#ff6a00" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.03, 0]}>
      <cylinderGeometry args={[0.112, 0.142, 0.12, 24]} />
      <meshStandardMaterial color="#f4f4f4" roughness={0.5} />
    </mesh>
    <mesh position={[0, -0.29, 0]} castShadow>
      <boxGeometry args={[0.44, 0.03, 0.44]} />
      <meshStandardMaterial color="#222" roughness={0.8} />
    </mesh>
  </group>
);

const shirtColor = (sim: SimResult, doll: number, lane: number) =>
  sim.kind === "party" || sim.kind === "fchaos" || sim.kind === "gold" || sim.kind === "goldgone" ? PARTY_SHIRTS[doll % PARTY_SHIRTS.length] : LANE_COLORS[lane];

const Pill: React.FC<{
  x: number;
  y: number;
  color: string;
  children: React.ReactNode;
  size?: number;
  opacity?: number;
}> = ({ x, y, color, children, size = 46, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
      fontFamily,
      fontWeight: 900,
      fontSize: size,
      color: "#fff",
      background: color,
      padding: "4px 22px",
      borderRadius: 999,
      border: "5px solid #fff",
      boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {children}
  </div>
);

export const PhysicsScene: React.FC<{
  kind: SimKind;
  width: number;
  height: number;
  // 重力くらべの右（奥）の世界の重力（1G に対する倍率）
  gravity?: number;
  // 左右の世界の名前（省略するとシミュレーションの種類から決まる）
  labels?: [string, string];
  // シミュレーションの途中（フレーム）から見せる
  offset?: number;
  // ラベルや効果音を出さない（サムネイル用）
  bare?: boolean;
  // カメラの位置を指定する（サムネイル用）
  camera?: Cam;
}> = ({ kind, width, height, gravity = 0.5, labels, offset = 0, bare = false, camera }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sim = useMemo(
    () => simulate(kind, durationInFrames + offset, fps, gravity),
    [kind, durationInFrames, fps, gravity, offset],
  );
  const laneNames = labels ?? sim.labels;
  const f = Math.min(frame + offset, sim.frames - 1);
  // 横長の画面では、人がもう少し大きく見えるよう、カメラを少し近づける
  const landscape = width > height;
  const cam0 = camera ?? cameraFor(sim, f, sim.frames);
  const near = landscape && !["throw", "brake", "fbrake", "athrow", "aplane", "tjump", "tfall", "asky", "tworld"].includes(kind) ? 0.8 : 1;
  const cam: Cam = {
    pos: cam0.pos.map((p, i) => cam0.look[i] + (p - cam0.look[i]) * near) as [number, number, number],
    look: cam0.look,
  };
  // 横長では右上に章の名前が出るので、ラベル類を少し下げる
  const T = landscape ? 70 : 0;
  const ground = useGroundTexture(kind);
  const heightRuler = useRulerTexture(
    ["0m", "", "1m", "", "2m", "", "3m"],
    true,
  );
  const distRuler = useRulerTexture(
    Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? `${i}m` : "")),
    false,
  );
  const v = (name: string) => sim.values[name]?.[f] ?? 0;

  const overlays: React.ReactNode[] = [];
  const laneX = [width * 0.25, width * 0.75];
  const isRoad = sim.kind === "brake" || sim.kind === "fbrake" || sim.kind === "xbrake";
  const lanesTop = ["jump", "scale", "slip", "fstand", "wind", "afeather", "arain", "asky", "tlift", "tjump", "tfall", "twind", "train", "bjump", "bdrop", "bwall", "ice", "trconst", "tracc", "trbrake"].includes(sim.kind);
  const isAir = AIR_KINDS.includes(sim.kind);
  // 摩擦ゼロの世界は、摩擦が消えた瞬間からラベルを点滅させる
  const offFrame = Math.round(FRICTION_OFF * fps);
  const isFriction = FRICTION_KINDS.includes(sim.kind);
  const blink =
    isFriction && f >= offFrame && f < offFrame + 24
      ? 1 + 0.18 * Math.sin(((f - offFrame) / 24) * Math.PI * 4)
      : 1;
  if (lanesTop) {
    const xs =
      sim.kind === "slip"
        ? [-0.8, 2.6]
        : sim.kind === "wind"
          ? [-1.5, 1.0]
          : sim.kind === "bdrop"
            ? [-0.9, 0.9]
            : sim.kind === "ice"
              ? [-1.0, 1.0]
              : TRAIN_KINDS.includes(sim.kind)
                ? [-1.4, 1.4]
            : sim.kind === "bjump" || sim.kind === "bwall"
              ? [-1.4, 1.4]
            : sim.kind === "asky" || sim.kind === "tfall"
            ? [-1.35, 1.35]
            : sim.kind === "tlift"
              ? [-1.4, 1.4]
              : sim.kind === "tjump"
                ? [-3.0, 3.0]
                : sim.kind === "twind"
                  ? [-1.5, 1.0]
                  : sim.kind === "train"
                    ? [-1.3, 1.3]
          : sim.kind === "scale" || sim.kind === "jump"
            ? [-1, 1]
            : [-1.2, 1.2];
    xs.forEach((x, lane) => {
      const p = project(cam, [x, 0, 0], width, height);
      laneX[lane] = Math.min(width - 190, Math.max(190, p.x));
      overlays.push(
        <Pill key={`lane${lane}`} x={laneX[lane]} y={70 + T} color={LANE_COLORS[lane]} size={44 * (lane === 1 ? blink : 1)}>
          {laneNames[lane]}
        </Pill>,
      );
    });
  } else if (sim.kind === "throw" || sim.kind === "athrow" || sim.kind === "aplane" || isRoad || sim.kind === "fpush" || sim.kind === "xpush" || sim.kind === "xslide" || sim.kind === "ladder") {
    overlays.push(
      <div key="legend" style={{ position: "absolute", left: 30, top: 34 + T, display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1].map((lane) => (
          <div key={lane} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: LANE_COLORS[lane], border: "4px solid #fff" }} />
            <div style={{ fontFamily, fontWeight: 900, fontSize: 40, color: "#fff", WebkitTextStroke: "8px #111", paintOrder: "stroke fill" }}>
              {laneNames[lane]}
            </div>
          </div>
        ))}
      </div>,
    );
  }

  if (sim.kind === "wind") {
    const w = v("wind0");
    overlays.push(
      <Pill key="wind" x={width / 2} y={150 + T} color="#334" size={40}>
        {`風速 ${Math.round(w)}m/s`}
      </Pill>,
    );
  }
  if (sim.kind === "scale") {
    [0, 1].forEach((lane) => {
      overlays.push(
        <div
          key={`kg${lane}`}
          style={{
            position: "absolute",
            left: laneX[lane],
            top: 128 + T,
            transform: "translate(-50%, 0)",
            fontFamily: "'Courier New', monospace",
            fontWeight: 900,
            fontSize: 74,
            color: "#7dff9a",
            background: "#0d1a12",
            padding: "4px 24px",
            borderRadius: 14,
            border: `6px solid ${LANE_COLORS[lane]}`,
            textShadow: "0 0 14px rgba(125,255,154,0.8)",
            whiteSpace: "nowrap",
          }}
        >
          {v(`kg${lane}`).toFixed(1)}
          <span style={{ fontSize: 40 }}> kg</span>
        </div>,
      );
    });
  }
  if (sim.kind === "jump") {
    [-1, 1].forEach((x, lane) => {
      const top = v(`top${lane}`);
      if (top > 0.15) {
        const p = project(cam, [x + 0.45, top, 0], width, height);
        overlays.push(
          <Pill key={`top${lane}`} x={p.x + 70} y={p.y} color={LANE_COLORS[lane]} size={40}>
            {`${top.toFixed(1)}m`}
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "slip") {
    [0, 1].forEach((lane) => {
      overlays.push(
        <div
          key={`timer${lane}`}
          style={{
            position: "absolute",
            left: laneX[lane],
            top: 128 + T,
            transform: "translate(-50%, 0)",
            fontFamily,
            fontWeight: 900,
            fontSize: 60,
            color: "#111",
            background: "#fff",
            padding: "2px 22px",
            borderRadius: 16,
            border: `6px solid ${LANE_COLORS[lane]}`,
            whiteSpace: "nowrap",
          }}
        >
          {`⏱ ${v(`timer${lane}`).toFixed(2)}秒`}
        </div>,
      );
    });
  }
  if (sim.kind === "throw" || sim.kind === "athrow" || sim.kind === "aplane") {
    [0, 1].forEach((lane) => {
      const land = v(`land${lane}`);
      if (land > 0) {
        const p = project(cam, [land, 0.9, lane === 0 ? 0.9 : -0.9], width, height);
        overlays.push(
          <Pill key={`land${lane}`} x={Math.min(width - 120, Math.max(120, p.x))} y={Math.max(190 + T, p.y - 40)} color={LANE_COLORS[lane]} size={42}>
            {sim.kind === "throw" ? `約${Math.round(land)}m` : `${land.toFixed(1)}m`}
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "afeather") {
    // ストップウォッチ：手をはなしてから地面に着くまで
    [0, 1].forEach((lane) => {
      const ball = v(`ball${lane}`);
      const feather = v(`feather${lane}`);
      const row = (name: string, t: number, done: boolean) => (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
          <span style={{ fontSize: 28 }}>{name}</span>
          <span style={{ color: done ? "#111" : "#888" }}>{`${Math.abs(t).toFixed(2)}秒`}</span>
        </div>
      );
      overlays.push(
        <div
          key={`sw${lane}`}
          style={{
            position: "absolute",
            left: laneX[lane],
            top: 118 + T,
            transform: "translate(-50%, 0)",
            fontFamily,
            fontWeight: 900,
            fontSize: 36,
            color: "#111",
            background: "#fff",
            padding: "4px 22px",
            borderRadius: 16,
            border: `6px solid ${LANE_COLORS[lane]}`,
            whiteSpace: "nowrap",
            minWidth: 250,
          }}
        >
          {row("鉄球", ball, ball > 0 && f > 0 && v(`ball${lane}`) === sim.values[`ball${lane}`][Math.max(0, f - 1)])}
          {row("羽根", feather, feather > 0)}
        </div>,
      );
      if (lane === 1 && feather > 0 && ball > 0) {
        overlays.push(
          <Pill key="same" x={width / 2} y={150 + T} color="#ff8a00" size={44}>
            同時に着地！
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "arain") {
    overlays.push(
      <Pill key="r0" x={laneX[0]} y={150 + T} color="#334" size={38}>雨粒 時速30km</Pill>,
      <Pill key="r1" x={laneX[1]} y={150 + T} color="#c0182b" size={38}>雨粒 時速500km</Pill>,
    );
  }
  if (sim.kind === "asky") {
    [0, 1].forEach((lane) => {
      const kmh = v(`v${lane}`);
      const h = v(`h${lane}`);
      overlays.push(
        <div
          key={`hud${lane}`}
          style={{
            position: "absolute",
            left: laneX[lane],
            top: 124 + T,
            transform: "translate(-50%, 0)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {[
            ["時速", `${Math.round(kmh).toLocaleString()} km`, lane === 1 && kmh > 600 ? "#ff5a5a" : "#7dff9a"],
            ["高度", `${Math.round(h).toLocaleString()} m`, h < 500 ? "#ff5a5a" : "#7dff9a"],
          ].map(([k, val, c]) => (
            <div key={k} style={{ fontFamily, fontWeight: 900, fontSize: 44, color: c, background: "rgba(0,0,0,0.7)", border: `4px solid ${LANE_COLORS[lane]}`, borderRadius: 14, padding: "0 16px", whiteSpace: "nowrap", textAlign: "right" }}>
              <span style={{ color: "#fff", fontSize: 30, marginRight: 12 }}>{k}</span>
              {val}
            </div>
          ))}
        </div>,
      );
    });
    overlays.push(
      <Pill key="t" x={width / 2} y={330 + T} color="#222" size={36}>
        {`飛び降りて ${Math.floor(v("t0"))}秒`}
      </Pill>,
    );
    if (v("h1") < 400) {
      overlays.push(
        <Pill key="warn" x={laneX[1]} y={420 + T} color="#e01b2f" size={44 * (1 + 0.06 * Math.sin(f * 0.8))}>
          地面が目の前！
        </Pill>,
      );
    }
  }
  if (isRoad) {
    [0, 1].forEach((lane) => {
      const stop = v(`stop${lane}`);
      const carX = posAt(sim, f, findIndex(sim, "car", lane))[0];
      if (stop < 0 && sim.kind === "fbrake" && carX > 9) {
        // 摩擦がないので、ブレーキをかけても止まれない
        overlays.push(
          <Pill key={`stop${lane}`} x={width * 0.62} y={190 + T} color={LANE_COLORS[lane]} size={46}>
            止まれない！
          </Pill>,
        );
      }
      if (stop > 0) {
        const p = project(cam, [stop - 2, 1.8, lane === 0 ? 1.7 : -1.7], width, height);
        overlays.push(
          <Pill key={`stop${lane}`} x={Math.min(width - 200, Math.max(200, p.x))} y={Math.max(240 + T, p.y - 30)} color={LANE_COLORS[lane]} size={42}>
            {`${stop.toFixed(1)}mで停止`}
          </Pill>,
        );
      }
    });
  }

  if (TRAIN_KINDS.includes(sim.kind)) {
    [0, 1].forEach((lane) => {
      const kmh = v(`v${lane}`);
      overlays.push(
        <Pill key={`sp${lane}`} x={laneX[lane]} y={140 + T} color="#334" size={32}>
          {kmh < 0.5 ? "止まっている" : `時速${Math.round(kmh)}km →`}
        </Pill>,
      );
      const sh = sim.values[`shift${lane}`][f];
      if (!Number.isNaN(sh)) {
        const cm = Math.round(sh * 100);
        overlays.push(
          <Pill key={`sh${lane}`} x={laneX[lane]} y={height * 0.48} color={Math.abs(cm) < 4 ? "#1f8f4e" : "#e01b2f"} size={44}>
            {Math.abs(cm) < 4 ? "ズレ ほぼ0cm" : cm < 0 ? `後ろへ ${-cm}cm` : `前へ ${cm}cm`}
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "gold" || sim.kind === "goldgone") {
    const gone = v("gone");
    overlays.push(
      <Pill key="g1" x={width / 2} y={80 + T} color="#b8860b" size={40} opacity={1 - gone}>
        人類が掘り出した金 ぜんぶ
      </Pill>,
      <Pill key="g2" x={width / 2} y={150 + T} color="#222" size={36} opacity={1 - gone}>
        約21万トン・一辺 約22m
      </Pill>,
    );
    if (gone >= 1) {
      overlays.push(
        <Pill key="g3" x={width / 2} y={110 + T} color="#e01b2f" size={56}>
          消えた！
        </Pill>,
      );
    }
  }
  if (sim.kind === "ice") {
    overlays.push(
      <Pill key="d0" x={laneX[0]} y={140 + T} color="#334" size={30}>氷の重さ：水の0.92倍</Pill>,
      <Pill key="d1" x={laneX[1]} y={140 + T} color="#334" size={30}>水の1.08倍（もしも）</Pill>,
    );
    if (f > 3.6 * fps) {
      overlays.push(
        <Pill key="r0" x={laneX[0]} y={205 + T} color={LANE_COLORS[0]} size={42}>浮く！</Pill>,
        <Pill key="r1" x={laneX[1]} y={205 + T} color={LANE_COLORS[1]} size={42}>沈む…</Pill>,
      );
    }
  }
  if (sim.kind === "xslide") {
    [0, 1].forEach((lane) => {
      const moved = v(`slide${lane}`);
      if (f > 1.9 * fps) {
        const pi = sim.bodies.findIndex((b) => b.part === "head" && b.lane === lane);
        const hp = posAt(sim, f, pi);
        const p = project(cam, [hp[0], hp[1] + 0.45, hp[2]], width, height);
        overlays.push(
          <Pill key={`sl${lane}`} x={Math.min(width - 150, Math.max(150, p.x))} y={Math.max(200 + T, p.y)} color={LANE_COLORS[lane]} size={40}>
            {moved > 0.8 ? "すべる！" : "すべらない…"}
          </Pill>,
        );
      }
    });
    const p = project(cam, [1.6, 0.5, 1.6], width, height);
    overlays.push(
      <Pill key="ang" x={p.x} y={p.y} color="#334" size={32}>角度35°</Pill>,
    );
  }
  if (sim.kind === "fpush" || sim.kind === "xpush") {
    [0, 1].forEach((lane) => {
      const bi = findIndex(sim, "box", lane);
      const p = project(cam, [posAt(sim, f, bi)[0], 1.05, lane === 0 ? 0.9 : -0.9], width, height);
      const moved = Math.max(0, v(`box${lane}`));
      overlays.push(
        <Pill key={`box${lane}`} x={Math.min(width - 120, Math.max(120, p.x))} y={Math.max(190 + T, p.y - 20)} color={LANE_COLORS[lane]} size={40}>
          {moved < 0.05 ? "びくともしない" : `箱 ${moved.toFixed(1)}m →`}
        </Pill>,
      );
    });
  }

  if (sim.kind === "tunnel" || sim.kind === "tunnelzero") {
    // 速さは、中身が均一な地球を通る穴の計算（中心で時速 約2万8000km）を場面に合わせて表示
    const p = f / Math.max(1, sim.frames - 1);
    const kmh = sim.kind === "tunnelzero" ? 28000 : 28000 * Math.sin((Math.PI / 2) * 0.85 * p);
    overlays.push(
      <div key="hud" style={{ position: "absolute", left: 30, top: 30 + T, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 44, color: "#7dff9a", background: "rgba(0,0,0,0.65)", border: "3px solid rgba(125,255,154,0.6)", borderRadius: 14, padding: "2px 18px", whiteSpace: "nowrap" }}>
          <span style={{ color: "#fff", fontSize: 32, marginRight: 12 }}>時速</span>
          {`${Math.round(kmh).toLocaleString()} km`}
        </div>
      </div>,
    );
    if (sim.kind === "tunnelzero") {
      overlays.push(
        <Pill key="zero" x={width - 190} y={70 + T} color="#7a3cff" size={46}>
          重力ゼロ
        </Pill>,
      );
    }
  }

  if (sim.kind === "bjump") {
    [-1.4, 1.4].forEach((x, lane) => {
      const top = v(`top${lane}`);
      if (top > 0.15) {
        const p = project(cam, [x + 0.5, top, 0], width, height);
        overlays.push(
          <Pill key={`top${lane}`} x={Math.min(width - 120, p.x + 90)} y={Math.max(150 + T, p.y)} color={LANE_COLORS[lane]} size={40}>
            {`${top.toFixed(1)}m`}
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "bdrop") {
    if (v("broken0") > 0) {
      overlays.push(
        <Pill key="b0" x={laneX[0]} y={150 + T} color="#c0182b" size={42}>割れた！</Pill>,
      );
    }
    // トランポリンの卵：一度はね返ったら「割れない！」
    const ei = sim.bodies.findIndex((b) => b.shape === "egg" && b.lane === 1);
    let bounced = false;
    for (let k = 1; k <= f; k++) {
      if (posAt(sim, k, ei)[1] > posAt(sim, k - 1, ei)[1] + 0.005 && posAt(sim, k, ei)[1] < 0.6) {
        bounced = true;
        break;
      }
    }
    if (bounced) {
      overlays.push(
        <Pill key="b1" x={laneX[1]} y={150 + T} color="#1f8f4e" size={42}>割れない！</Pill>,
      );
    }
  }
  if (sim.kind === "bwall") {
    [-2.3, 0.5].forEach((x, lane) => {
      const p = project(cam, [x, 3.05, 0], width, height);
      overlays.push(
        <Pill key={`h${lane}`} x={p.x} y={p.y - 30} color="#334" size={30}>高さ3m</Pill>,
      );
    });
  }
  if (sim.kind === "tworld") {
    overlays.push(
      <Pill key="title" x={width / 2} y={70 + T} color="#7a3cff" size={40}>
        身長10cmの世界（17.5倍に拡大）
      </Pill>,
    );
    // まわりの物の名前（カメラの前にあるときだけ）
    for (const prop of TINY_PROPS) {
      const p = project(cam, prop.label, width, height);
      const d = Math.hypot(cam.pos[0] - prop.label[0], cam.pos[2] - prop.label[2]);
      const toLook = [cam.look[0] - cam.pos[0], cam.look[2] - cam.pos[2]];
      const toProp = [prop.label[0] - cam.pos[0], prop.label[2] - cam.pos[2]];
      const front = toLook[0] * toProp[0] + toLook[1] * toProp[1] > 0;
      if (front && d > 2.5 && p.x > 120 && p.x < width - 120 && p.y > 130 + T) {
        overlays.push(
          <Pill key={prop.name} x={p.x} y={p.y} color="#222" size={34}>
            {prop.name}
          </Pill>,
        );
      }
    }
  }
  if (sim.kind === "tlift") {
    const late = f > 2.6 * fps;
    overlays.push(
      <Pill key="w0" x={laneX[0]} y={145 + T} color="#334" size={32}>バーベル132kg（体重の2倍）</Pill>,
      <Pill key="w1" x={laneX[1]} y={145 + T} color="#334" size={32}>500円玉4枚 28g（体重の2倍）</Pill>,
    );
    if (late) {
      overlays.push(
        <Pill key="r0" x={laneX[0]} y={215 + T} color={LANE_COLORS[0]} size={40}>持ち上がらない…</Pill>,
        <Pill key="r1" x={laneX[1]} y={215 + T} color={LANE_COLORS[1]} size={40}>軽々！</Pill>,
      );
    }
  }
  if (sim.kind === "tjump") {
    [-3.0, 3.0].forEach((x, lane) => {
      const top = v(`top${lane}`);
      if (top > 0.1) {
        const p = project(cam, [x + 0.5, top, 0], width, height);
        const real = lane === 0 ? top : top / TINY;
        overlays.push(
          <Pill key={`top${lane}`} x={Math.min(width - 260, p.x + 150)} y={Math.max(150 + T, p.y)} color={LANE_COLORS[lane]} size={36}>
            {lane === 0 ? `${Math.round(real * 100)}cm` : `${Math.round(real * 100)}cm（身長の${(real / 0.1).toFixed(1)}倍）`}
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "tfall") {
    [0, 1].forEach((lane) => {
      const kmh = v(`v${lane}`);
      const h = v(`h${lane}`);
      overlays.push(
        <div
          key={`hud${lane}`}
          style={{ position: "absolute", left: laneX[lane], top: 124 + T, transform: "translate(-50%, 0)", display: "flex", flexDirection: "column", gap: 8 }}
        >
          {[
            ["時速", `${Math.round(kmh)} km`],
            ["高さ", `${h.toFixed(1)} m`],
          ].map(([k, val]) => (
            <div key={k} style={{ fontFamily, fontWeight: 900, fontSize: 42, color: "#7dff9a", background: "rgba(0,0,0,0.7)", border: `4px solid ${LANE_COLORS[lane]}`, borderRadius: 14, padding: "0 16px", whiteSpace: "nowrap", textAlign: "right" }}>
              <span style={{ color: "#fff", fontSize: 28, marginRight: 12 }}>{k}</span>
              {val}
            </div>
          ))}
        </div>,
      );
      if (h <= 0) {
        overlays.push(
          <Pill key={`land${lane}`} x={laneX[lane]} y={300 + T} color={LANE_COLORS[lane]} size={38}>
            {`地面に着く速さ 時速${Math.round(kmh)}km`}
          </Pill>,
        );
      }
    });
  }
  if (sim.kind === "twind") {
    overlays.push(
      <Pill key="wind" x={width / 2} y={150 + T} color="#334" size={38}>
        {`どちらも 風速${v("wind0").toFixed(0)}m/s`}
      </Pill>,
    );
    if (v("wind0") > 5) {
      overlays.push(
        <Pill key="ty" x={laneX[1]} y={225 + T} color="#e01b2f" size={40}>
          台風なみ！
        </Pill>,
      );
    }
  }
  if (sim.kind === "train") {
    if (v("hit1") > 0) {
      overlays.push(
        <Pill key="h0" x={laneX[0]} y={150 + T} color="#334" size={36}>何も感じない</Pill>,
        <Pill key="h1" x={laneX[1]} y={150 + T} color="#e01b2f" size={36}>雨粒1つで よろける！</Pill>,
      );
    }
  }

  // ボールの軌跡（0.5秒前までの位置を点で）
  const trails: React.ReactNode[] = [];
  if (sim.kind === "throw" || sim.kind === "athrow" || sim.kind === "aplane") {
    [0, 1].forEach((lane) => {
      const bi = findIndex(sim, sim.kind === "aplane" ? "plane" : "sphere", lane);
      for (let k = 2; k <= f; k += 2) {
        const p = posAt(sim, k, bi);
        if (p[0] < 0.5) {
          continue;
        }
        trails.push(
          <mesh key={`tr${lane}-${k}`} position={p}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshBasicMaterial color={LANE_COLORS[lane]} transparent opacity={0.55} />
          </mesh>,
        );
      }
    });
  }

  // 効果音：ぶつかった速さで音量を変える（音の大きさは速さの約1.5乗で増える）。
  // 人の音は高さ違いの3種類を順番に使い、毎回まったく同じ音にならないようにする
  const sounds = sim.impacts
    .filter((hit) => hit.frame >= offset)
    .map((hit, i) => {
    const spec = HIT_SOUNDS[hit.sound];
    const file =
      hit.sound === "body" ? `sfx/thud${(i % 3) + 1}.wav` : spec.file;
    const volume = spec.max * Math.min(1, (hit.v / spec.ref) ** 1.5);
    return (
      <Sequence key={i} from={hit.frame - offset} durationInFrames={15}>
        <Audio src={staticFile(file)} volume={volume} />
      </Sequence>
    );
  });

  const isTunnel = kind === "tunnel" || kind === "tunnelzero";
  const isSky = kind === "asky" || kind === "tfall";
  // トランポリンのマットの場所（中心x, 中心z, 幅, 奥行き）
  const matArea: [number, number, number, number] = kind === "bparty" ? [0, -0.6, 9, 6] : [2.4, 0, 4.2, 6];
  const beach = useBeachTexture();
  const iceGeom = useMemo(() => new RoundedBoxGeometry(0.16, 0.16, 0.16, 3, 0.025), []);

  // 空から落ちていく場面：下から上へ流れる風のすじ（流れる速さと長さは落ちる速さに比例）
  const streaks: React.ReactNode[] = [];
  if (isSky) {
    [0, 1].forEach((lane) => {
      const sp = sim.values[`v${lane}`];
      const hh = sim.values[`h${lane}`];
      // ここまでに流れた量（m）。見やすいよう、実際の速さの 1/4 で流す
      let travel = 0;
      for (let k = 0; k <= f; k++) {
        travel += (sp[k] / 3.6 / fps) * 0.25;
      }
      // tfall は地面に着いたら止める
      const vNow = kind === "tfall" && hh && hh[f] <= 0 ? 0 : sp[f] / 3.6;
      const len = Math.min(6, 0.15 + vNow * 0.02);
      for (let i = 0; i < 36; i++) {
        const H = 14;
        const y = ((random(`sy${lane}-${i}`) * H + travel) % H) - 5;
        const x = (lane === 0 ? -1.35 : 1.35) + (random(`sx${lane}-${i}`) - 0.5) * 2.6;
        const z = (random(`sz${lane}-${i}`) - 0.5) * 4 - 0.5;
        streaks.push(
          <mesh key={`st${lane}-${i}`} position={[x, y, z]}>
            <boxGeometry args={[0.012, len, 0.012]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={vNow < 1 ? 0 : 0.55} />
          </mesh>,
        );
      }
    });
  }

  const rain: React.ReactNode[] = [];
  // 10cmの人の雨：左はふつうの雨粒（細いすじ）、右はソフトボールくらいの水のかたまり（※動きはスロー）
  if (kind === "train") {
    const t = f / fps;
    [0, 1].forEach((lane) => {
      const cx = lane === 0 ? -1.3 : 1.3;
      const n = lane === 0 ? 120 : 14;
      const speedV = lane === 0 ? 9 : 22;
      const H = 7;
      for (let i = 0; i < n; i++) {
        const x = cx + (random(`tr${lane}x${i}`) - 0.5) * 2.4;
        const z = (random(`tr${lane}z${i}`) - 0.5) * 3;
        // 体の真上は、当たる1粒だけにする
        if (Math.abs(x - cx) < 0.35 && Math.abs(z) < 0.35) {
          continue;
        }
        const y = H - ((random(`tr${lane}y${i}`) * H + t * speedV) % H);
        rain.push(
          lane === 0 ? (
            <mesh key={`tr${lane}-${i}`} position={[x, y + 0.1, z]}>
              <boxGeometry args={[0.008, 0.2, 0.008]} />
              <meshBasicMaterial color="#d6ecff" transparent opacity={0.6} />
            </mesh>
          ) : (
            <mesh key={`tr${lane}-${i}`} position={[x, y, z]} scale={[1, 1.25, 1]}>
              <sphereGeometry args={[0.045, 16, 12]} />
              <meshStandardMaterial color="#9fd3ff" transparent opacity={0.55} roughness={0.05} metalness={0.1} />
            </mesh>
          ),
        );
      }
      // 頭に当たる1粒（当たる時刻にちょうど頭の上に来るように落とす）と、はじける水しぶき
      const head = posAt(sim, f, sim.bodies.findIndex((b) => b.part === "head" && b.lane === lane));
      [1.5, 4.2].forEach((hitT, k) => {
        const dtHit = hitT - t;
        const r = lane === 0 ? 0.012 : 0.045;
        if (dtHit > 0 && dtHit < 0.4) {
          rain.push(
            <mesh key={`hd${lane}-${k}`} position={[head[0], head[1] + 0.15 + dtHit * speedV, head[2]]} scale={[1, 1.25, 1]}>
              <sphereGeometry args={[r, 16, 12]} />
              <meshStandardMaterial color="#9fd3ff" transparent opacity={0.7} roughness={0.05} />
            </mesh>,
          );
        }
        if (dtHit <= 0 && dtHit > -0.35) {
          const s = -dtHit / 0.35;
          for (let j = 0; j < 10; j++) {
            const a = (j / 10) * Math.PI * 2;
            const sp = lane === 0 ? 0.08 : 0.5;
            rain.push(
              <mesh key={`sp${lane}-${k}-${j}`} position={[head[0] + Math.cos(a) * sp * s, head[1] + 0.12 + Math.sin(s * Math.PI) * sp * 0.6, head[2] + Math.sin(a) * sp * s]}>
                <sphereGeometry args={[r * 0.35, 8, 8]} />
                <meshBasicMaterial color="#e8f6ff" transparent opacity={0.85 * (1 - s)} />
              </mesh>,
            );
          }
        }
      });
    });
  }

  // 雨：左はゆっくり（秒速8m・短いすじ）、右は空気抵抗ゼロで超高速（見やすいよう秒速40mで表示・長いすじ）
  if (kind === "arain") {
    [0, 1].forEach((lane) => {
      const cx = lane === 0 ? -1.2 : 1.2;
      const speedV = lane === 0 ? 8 : 40;
      const len = lane === 0 ? 0.18 : 1.6;
      const H = 6;
      for (let i = 0; i < 110; i++) {
        const x = cx + (random(`rx${lane}-${i}`) - 0.5) * 2.3;
        const z = (random(`rz${lane}-${i}`) - 0.5) * 3.2;
        const y = H - ((random(`ry${lane}-${i}`) * H + (f / fps) * speedV) % H);
        rain.push(
          <mesh key={`rn${lane}-${i}`} position={[x, y + len / 2, z]}>
            <boxGeometry args={[0.012, len, 0.012]} />
            <meshBasicMaterial color={lane === 0 ? "#cfe6ff" : "#e8f4ff"} transparent opacity={0.7} />
          </mesh>,
        );
      }
      // 地面と体ではじける水しぶき
      for (let i = 0; i < (lane === 0 ? 10 : 26); i++) {
        const seed = `sp${lane}-${i}-${Math.floor(f / 2)}`;
        const onBody = lane === 1 && i % 3 === 0;
        const x = onBody ? cx + (random(`${seed}x`) - 0.5) * 0.5 : cx + (random(`${seed}x`) - 0.5) * 2.3;
        const z = onBody ? (random(`${seed}z`) - 0.5) * 0.4 : (random(`${seed}z`) - 0.5) * 3.2;
        const y = onBody ? 1.15 + random(`${seed}y`) * 0.25 : 0.02;
        rain.push(
          <mesh key={`spl${lane}-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[lane === 0 ? 0.025 : 0.05, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>,
        );
      }
    });
  }
  const fogColor = isTunnel
    ? "#140a05"
    : isRoad
      ? "#b9c7d6"
      : kind === "arain" || kind === "train"
        ? "#8f9aa8"
        : TINY_KINDS.includes(kind)
          ? "#ead9bc"
          : TRAIN_KINDS.includes(kind)
            ? "#e6eaf0"
          : "#cfe8ff";
  // 中心付近（tunnelzero）は人がその場でただようので、壁のほうを流して速さを見せる
  const shaftPhase = kind === "tunnelzero" ? frame * 0.9 : 0;
  // 摩擦ゼロの地面は、つるつるの氷のように見せる（摩擦が消えた瞬間から）
  const ice = isFriction
    ? Math.min(1, Math.max(0, (f - offFrame) / 8))
    : 0;
  const iceArea: [number, number, number, number] | null = !isFriction
    ? null
    : sim.kind === "fchaos"
      ? [0, 0, 40, 40]
      : lanesTop
        ? [10.0, 0, 20, 40]
        : [0, -10, 80, 20];

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: isTunnel
            ? "#140a05"
            : isSky
              ? "linear-gradient(180deg, #1f5fbf 0%, #5ea3e8 45%, #cfe6ff 100%)"
              : kind === "arain" || kind === "train"
                ? "linear-gradient(180deg, #4d5866 0%, #7d8896 55%, #a3adb9 100%)"
                : TINY_KINDS.includes(kind)
                  ? "linear-gradient(180deg, #f3e6d0 0%, #e9d6b8 60%, #d9c09a 100%)"
                  : TRAIN_KINDS.includes(kind)
                    ? "linear-gradient(180deg, #eef1f5 0%, #dfe4ea 100%)"
                : "linear-gradient(180deg, #4a9cff 0%, #8cc8ff 55%, #dff0ff 100%)",
        }}
      />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 40, near: 0.1, far: 400 }}>
        <CameraRig cam={cam} width={width} height={height} />
        <fog attach="fog" args={isTunnel ? [fogColor, 6, 34] : kind === "arain" ? [fogColor, 12, 60] : kind === "gold" || kind === "goldgone" ? [fogColor, 160, 600] : [fogColor, 30, 120]} />
        <hemisphereLight args={isTunnel ? ["#ffd2a0", "#3a1a08", 0.9] : ["#dff1ff", "#6a7a4a", 1.1]} />
        {isTunnel ? (
          <>
            <pointLight position={[cam.look[0] + 0.5, cam.look[1] + 2.5, cam.look[2] + 1]} intensity={30} distance={14} color="#ffe2b8" />
            <Shaft y={cam.look[1]} phase={shaftPhase} />
          </>
        ) : null}
        <directionalLight
          position={[cam.look[0] + 6, 12, 8]}
          intensity={2.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-camera-near={1}
          shadow-camera-far={60}
          shadow-bias={-0.0004}
        >
          <object3D attach="target" position={[cam.look[0], 0, 0]} />
        </directionalLight>
        {isTunnel || isSky ? null : BOUNCE_KINDS.includes(kind) ? (
          // トランポリンのマットの所だけ、地面に穴をあける（へこんだマットが見えるように）
          (() => {
            const [cx, cz, w, d] = matArea;
            const x0 = cx - w / 2;
            const x1 = cx + w / 2;
            const z0 = cz - d / 2;
            const z1 = cz + d / 2;
            const R = 100;
            const pieces: [number, number, number, number][] = [
              [-R, x0, -R, R],
              [x1, R, -R, R],
              [x0, x1, -R, z0],
              [x0, x1, z1, R],
            ];
            return pieces.map(([a0, a1, b0, b1], k) => {
              // 地面の模様（1m のタイル）が、どの切れ端でも同じ大きさ・同じ位置になるように
              const t = ground.clone();
              t.repeat.set((a1 - a0) / 2, (b1 - b0) / 2);
              t.offset.set((((a0 / 2) % 1) + 1) % 1, (((-b1 / 2) % 1) + 1) % 1);
              t.needsUpdate = true;
              return (
                <mesh key={k} position={[(a0 + a1) / 2, 0, (b0 + b1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[a1 - a0, b1 - b0]} />
                  <meshStandardMaterial map={t} roughness={0.95} />
                </mesh>
              );
            });
          })()
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial map={ground} roughness={0.95} />
          </mesh>
        )}

        {iceArea && ice > 0 ? (
          <mesh position={[iceArea[0], 0.004, iceArea[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[iceArea[2], iceArea[3]]} />
            <meshStandardMaterial color="#d6f3ff" transparent opacity={0.62 * ice} roughness={0.08} metalness={0.25} />
          </mesh>
        ) : null}

        {lanesTop ? (
          // レーンの境目
          <mesh position={[sim.kind === "slip" ? 0.95 : sim.kind === "wind" ? -0.25 : 0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.06, 40]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        ) : null}

        {sim.kind === "jump" ? (
          <mesh position={[0, 1.5, -0.6]}>
            <planeGeometry args={[0.45, 3.0]} />
            <meshBasicMaterial map={heightRuler} transparent />
          </mesh>
        ) : null}

        {sim.kind === "jump"
          ? [-1, 1].map((x, lane) => {
              const top = v(`top${lane}`);
              return top > 0.15 ? (
                <mesh key={lane} position={[x, top, -0.3]}>
                  <boxGeometry args={[0.9, 0.025, 0.025]} />
                  <meshBasicMaterial color={LANE_COLORS[lane]} />
                </mesh>
              ) : null;
            })
          : null}

        {sim.kind === "scale"
          ? [-1, 1].map((x) => (
              <mesh key={x} position={[x, 0.03, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.78, 0.06, 0.78]} />
                <meshStandardMaterial color="#9aa3ad" roughness={0.4} metalness={0.2} />
              </mesh>
            ))
          : null}

        {sim.kind === "slip"
          ? [0.0, 3.2].map((x) => (
              // バナナの皮
              <mesh key={x} position={[x + 0.1, 0.02, 0.1]} rotation={[0, 0.6, 0]} castShadow>
                <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#ffd21a" roughness={0.5} />
              </mesh>
            ))
          : null}

        {sim.kind === "throw" || sim.kind === "athrow" || sim.kind === "aplane" ? (
          <mesh position={[10, 0.006, 1.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 1.0]} />
            <meshBasicMaterial map={distRuler} transparent />
          </mesh>
        ) : null}

        {isRoad ? (
          <>
            {/* ブレーキをかける線 */}
            <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.35, 7.5]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* 車線 */}
            {Array.from({ length: 14 }, (_, i) => (
              <mesh key={i} position={[-10 + i * 3, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.6, 0.14]} />
                <meshBasicMaterial color="#f2f2f2" />
              </mesh>
            ))}
            {/* タイヤの跡 */}
            {[0, 1].map((lane) => {
              const ci = findIndex(sim, "car", lane);
              const rear = posAt(sim, f, ci)[0] + 1.3;
              const len = Math.max(0, rear - 1.3 + 0.0);
              if (rear <= 1.3) {
                return null;
              }
              const z = lane === 0 ? 1.7 : -1.7;
              return [-0.78, 0.78].map((dz) => (
                <mesh key={`${lane}${dz}`} position={[1.3 + len / 2, 0.007, z + dz]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[len, 0.22]} />
                  <meshBasicMaterial color="#141414" transparent opacity={0.7} />
                </mesh>
              ));
            })}
          </>
        ) : null}

        {sim.bodies.map((b, i) => {
          const pos = posAt(sim, f, i);
          const quat = quatAt(sim, f, i);
          if (b.shape === "part") {
            const color =
              b.look === "shirt"
                ? shirtColor(sim, b.doll ?? 0, b.lane)
                : b.look === "skin"
                  ? SKIN
                  : b.look === "shoe"
                    ? SHOE
                    : PANTS;
            return <PersonPart key={i} part={b.part!} size={b.size} color={color} pos={pos} quat={quat} />;
          }
          if (b.shape === "ice") {
            return (
              <mesh key={i} position={pos} quaternion={quat} geometry={iceGeom} castShadow>
                <meshStandardMaterial color="#e8f7ff" roughness={0.08} metalness={0.05} transparent opacity={0.82} />
              </mesh>
            );
          }
          if (b.shape === "egg") {
            return (
              <group key={i} position={pos} quaternion={b.lane === 0 && v("broken0") > 0 ? [0, 0, 0, 1] : quat}>
                <Egg broken={b.lane === 0 && v("broken0") > 0} />
              </group>
            );
          }
          if (b.shape === "barbell") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.018, 0.018, 1.8, 12]} />
                  <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.8} />
                </mesh>
                {[-0.72, 0.72].map((x) => (
                  <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.24, 0.24, 0.12, 32]} />
                    <meshStandardMaterial color="#1d1f24" roughness={0.6} />
                  </mesh>
                ))}
              </group>
            );
          }
          if (b.shape === "coins") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                {[0, 1, 2, 3].map((k) => (
                  <Coin key={k} y={-0.0485 + k * 0.0325} rot={k * 0.7} />
                ))}
              </group>
            );
          }
          if (b.shape === "feather") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                <Feather />
              </group>
            );
          }
          if (b.shape === "plane") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                <PaperPlane color={b.color!} />
              </group>
            );
          }
          if (b.shape === "sphere" && b.color === "beach") {
            return (
              <mesh key={i} position={pos} quaternion={quat} castShadow>
                <sphereGeometry args={[b.size[0] / 2, 32, 24]} />
                <meshStandardMaterial map={beach} roughness={0.3} />
              </mesh>
            );
          }
          if (b.shape === "sphere") {
            return (
              <mesh key={i} position={pos} quaternion={quat} castShadow>
                {/* 遠くからでも見えるよう、見た目は少し大きめに */}
                <sphereGeometry args={[b.size[0] * 0.9, 24, 24]} />
                <meshStandardMaterial color={b.color} roughness={0.35} />
              </mesh>
            );
          }
          if (b.shape === "platform") {
            return (
              <mesh key={i} position={pos} quaternion={quat} castShadow receiveShadow>
                <boxGeometry args={b.size} />
                <meshStandardMaterial color="#f4f6f8" roughness={0.3} />
              </mesh>
            );
          }
          if (b.shape === "car") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                <Car color={b.color!} />
              </group>
            );
          }
          if (b.shape === "box") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={b.size} />
                  <meshStandardMaterial color={b.color} roughness={0.85} />
                </mesh>
                {/* ガムテープ（段ボール箱だけ） */}
                {b.color === "#c8925a" ? (
                  <mesh position={[0, b.size[1] / 2 + 0.002, 0]}>
                    <boxGeometry args={[b.size[0] + 0.004, 0.004, 0.16]} />
                    <meshStandardMaterial color="#d9b77c" roughness={0.6} />
                  </mesh>
                ) : null}
              </group>
            );
          }
          if (b.shape === "wall") {
            return (
              <mesh key={i} position={pos} quaternion={quat} castShadow receiveShadow>
                <boxGeometry args={b.size} />
                <meshStandardMaterial color="#d8cbb8" roughness={0.9} />
              </mesh>
            );
          }
          if (b.shape === "ladder") {
            const L = b.size[1];
            return (
              <group key={i} position={pos} quaternion={quat}>
                {[-0.24, 0.24].map((z) => (
                  <mesh key={z} position={[0, 0, z]} castShadow>
                    <boxGeometry args={[0.06, L, 0.06]} />
                    {/* 柱は左上の色見本と同じ色（赤＝いまの地球、青＝摩擦ゼロ） */}
                    <meshStandardMaterial color={LANE_COLORS[b.lane]} roughness={0.35} metalness={0.3} />
                  </mesh>
                ))}
                {Array.from({ length: 7 }, (_, k) => (
                  <mesh key={k} position={[0, -L / 2 + 0.35 + k * 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.02, 0.02, 0.48, 10]} />
                    <meshStandardMaterial color="#aeb4bd" roughness={0.35} metalness={0.6} />
                  </mesh>
                ))}
              </group>
            );
          }
          if (b.shape === "cone") {
            return (
              <group key={i} position={pos} quaternion={quat}>
                <Cone />
              </group>
            );
          }
          return null;
        })}
        {kind === "tworld" ? <TinyProps /> : null}
        {TRAIN_KINDS.includes(kind)
          ? [-1.4, 1.4].map((x0, lane) => {
              const take = sim.values[`take${lane}`][f];
              const land = sim.values[`land${lane}`][f];
              return (
                <group key={lane}>
                  <TrainCar x0={x0} pos={v(`pos${lane}`)} />
                  {/* 跳んだ位置（赤い線）と、着地した位置（青い線） */}
                  {!Number.isNaN(take) ? (
                    <mesh position={[take, 0.006, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
                      <planeGeometry args={[0.06, 0.7]} />
                      <meshBasicMaterial color="#ff2d2d" />
                    </mesh>
                  ) : null}
                  {!Number.isNaN(land) ? (
                    <mesh position={[land, 0.007, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
                      <planeGeometry args={[0.06, 0.7]} />
                      <meshBasicMaterial color="#2f8bff" />
                    </mesh>
                  ) : null}
                </group>
              );
            })
          : null}
        {kind === "gold" || kind === "goldgone" ? <GoldCube gone={v("gone")} t={f / fps} /> : null}
        {kind === "ice"
          ? [-1.0, 1.0].map((x0, lane) => {
              const sp = sim.values[`splash${lane}`]?.[f] ?? -1;
              const since = sp < 0 ? 99 : f / fps - sp;
              return (
                <group key={lane}>
                  {/* 水 */}
                  <mesh position={[x0, TANK.level / 2, TANK.z]}>
                    <boxGeometry args={[TANK.w - 0.04, TANK.level, TANK.d - 0.04]} />
                    <meshStandardMaterial color="#3d9bff" transparent opacity={0.32} roughness={0.1} depthWrite={false} />
                  </mesh>
                  {/* 水面 */}
                  <mesh position={[x0, TANK.level, TANK.z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[TANK.w - 0.04, TANK.d - 0.04]} />
                    <meshStandardMaterial color="#9fd3ff" transparent opacity={0.45} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} />
                  </mesh>
                  {/* ガラスのふち */}
                  {[
                    [x0 - TANK.w / 2, TANK.z - TANK.d / 2],
                    [x0 + TANK.w / 2, TANK.z - TANK.d / 2],
                    [x0 - TANK.w / 2, TANK.z + TANK.d / 2],
                    [x0 + TANK.w / 2, TANK.z + TANK.d / 2],
                  ].map(([x, z], k) => (
                    <mesh key={k} position={[x, TANK.h / 2, z]}>
                      <boxGeometry args={[0.025, TANK.h, 0.025]} />
                      <meshStandardMaterial color="#dfe9f2" roughness={0.2} />
                    </mesh>
                  ))}
                  {[TANK.z - TANK.d / 2, TANK.z + TANK.d / 2].map((z, k) => (
                    <mesh key={`t${k}`} position={[x0, TANK.h, z]}>
                      <boxGeometry args={[TANK.w, 0.025, 0.025]} />
                      <meshStandardMaterial color="#dfe9f2" roughness={0.2} />
                    </mesh>
                  ))}
                  <mesh position={[x0, TANK.h / 2, TANK.z]}>
                    <boxGeometry args={[TANK.w, TANK.h, TANK.d]} />
                    <meshStandardMaterial color="#ffffff" transparent opacity={0.08} roughness={0.05} depthWrite={false} />
                  </mesh>
                  {/* 水しぶき */}
                  {since < 0.45
                    ? Array.from({ length: 14 }, (_, k) => {
                        const a = (k / 14) * Math.PI * 2;
                        const s2 = since / 0.45;
                        return (
                          <mesh key={`sp${k}`} position={[x0 + Math.cos(a) * 0.25 * s2, TANK.level + Math.sin(s2 * Math.PI) * 0.25 * (0.6 + (k % 3) * 0.2), TANK.z + Math.sin(a) * 0.15 * s2]}>
                            <sphereGeometry args={[0.018, 8, 8]} />
                            <meshBasicMaterial color="#e8f6ff" transparent opacity={0.9 * (1 - s2)} />
                          </mesh>
                        );
                      })
                    : null}
                </group>
              );
            })
          : null}
        {BOUNCE_KINDS.includes(kind) ? (
          <TrampMat sim={sim} f={f} lane={1} area={matArea} />
        ) : null}
        {trails}
        {streaks}
        {rain}
      </ThreeCanvas>
      {bare ? null : overlays}
      {bare ? null : sounds}
      {BOUNCE_KINDS.includes(kind) && !bare ? <BounceSounds sim={sim} offset={offset} /> : null}
      {kind === "goldgone" && Math.round(GOLD_GONE * fps) - offset >= 0 ? (
        <Sequence from={Math.round(GOLD_GONE * fps) - offset} durationInFrames={40}>
          <Audio src={staticFile("sfx/sparkle.wav")} volume={0.35} />
        </Sequence>
      ) : null}
      {kind === "ice"
        ? [0, 1].flatMap((lane) => {
            // 氷が水に入るたびに「チャポン」（記録された時刻が変わったフレーム）
            const sp = sim.values[`splash${lane}`];
            const out: React.ReactNode[] = [];
            for (let k = Math.max(1, offset); k < sim.frames; k++) {
              if (sp[k] !== sp[k - 1] && sp[k] > 0) {
                out.push(
                  <Sequence key={`pl${lane}-${k}`} from={k - offset} durationInFrames={15}>
                    <Audio src={staticFile("sfx/plop.wav")} volume={0.22} />
                  </Sequence>,
                );
              }
            }
            return out;
          })
        : null}
      {kind === "arain" || kind === "train" ? <Audio src={staticFile("sfx/rain.wav")} volume={0.3} loop /> : null}
      {kind === "train"
        ? [1.5, 4.2].map((h) => {
            const from = Math.round(h * fps) - offset;
            return from >= 0 ? (
              <Sequence key={h} from={from} durationInFrames={20}>
                <Audio src={staticFile("sfx/thud2.wav")} volume={0.22} />
              </Sequence>
            ) : null;
          })
        : null}
      {isSky ? <Audio src={staticFile("sfx/whoosh.wav")} volume={0.12} /> : null}
    </AbsoluteFill>
  );
};
