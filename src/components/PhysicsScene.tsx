import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
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
    case "throw": {
      // いちばん遠くまで飛んでいるボールを追いかけて、だんだん引く
      let far = 0;
      for (let k = 0; k <= f; k++) {
        for (const lane of [0, 1]) {
          far = Math.max(far, posAt(sim, k, findIndex(sim, "sphere", lane))[0]);
        }
      }
      const cx = 0.8 + far * 0.5;
      const d = 6.5 + far * 0.55;
      return { pos: [cx, 1.8 + far * 0.12, d], look: [cx, 1.6 + far * 0.1, 0] };
    }
    case "wind":
      return { pos: [-0.2, 1.7, lerp(9.6, 9.0, t)], look: [-0.2, 1.15, 0] };
    case "fstand":
      return { pos: [0, 1.5, lerp(8.6, 8.0, t)], look: [0, 0.85, 0] };
    case "fpush":
      return { pos: [0.9, 1.9, lerp(10.2, 9.6, t)], look: [0.9, 0.8, 0] };
    case "ladder":
      // 斜め前から見下ろす（手前と奥のはしごが重ならないように）
      return { pos: [lerp(-6.0, -5.4, t), 4.0, 8.2], look: [-0.4, 1.2, -0.3] };
    case "fchaos": {
      const a = lerp(-0.3, 0.3, t);
      return { pos: [Math.sin(a) * 7.6, 2.1, Math.cos(a) * 7.6], look: [0, 1.1, 0] };
    }
    case "brake":
    case "fbrake": {
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
    if (kind === "brake" || kind === "fbrake") {
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
    const unit = kind === "brake" || kind === "fbrake" ? 4 : 2;
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
  sim.kind === "party" || sim.kind === "fchaos" ? PARTY_SHIRTS[doll % PARTY_SHIRTS.length] : LANE_COLORS[lane];

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
}> = ({ kind, width, height, gravity = 0.5, labels, offset = 0 }) => {
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
  const cam0 = cameraFor(sim, f, sim.frames);
  const near = landscape && !["throw", "brake", "fbrake"].includes(kind) ? 0.8 : 1;
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
  const isRoad = sim.kind === "brake" || sim.kind === "fbrake";
  const lanesTop = ["jump", "scale", "slip", "fstand", "wind"].includes(sim.kind);
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
  } else if (sim.kind === "throw" || isRoad || sim.kind === "fpush" || sim.kind === "ladder") {
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
  if (sim.kind === "throw") {
    [0, 1].forEach((lane) => {
      const land = v(`land${lane}`);
      if (land > 0) {
        const p = project(cam, [land, 0.9, lane === 0 ? 0.9 : -0.9], width, height);
        overlays.push(
          <Pill key={`land${lane}`} x={Math.min(width - 120, Math.max(120, p.x))} y={Math.max(190 + T, p.y - 40)} color={LANE_COLORS[lane]} size={42}>
            {`約${Math.round(land)}m`}
          </Pill>,
        );
      }
    });
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

  if (sim.kind === "fpush") {
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

  // ボールの軌跡（0.5秒前までの位置を点で）
  const trails: React.ReactNode[] = [];
  if (sim.kind === "throw") {
    [0, 1].forEach((lane) => {
      const bi = findIndex(sim, "sphere", lane);
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

  const fogColor = isRoad ? "#b9c7d6" : "#cfe8ff";
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
          background:
            "linear-gradient(180deg, #4a9cff 0%, #8cc8ff 55%, #dff0ff 100%)",
        }}
      />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 40, near: 0.1, far: 400 }}>
        <CameraRig cam={cam} width={width} height={height} />
        <fog attach="fog" args={[fogColor, 30, 120]} />
        <hemisphereLight args={["#dff1ff", "#6a7a4a", 1.1]} />
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial map={ground} roughness={0.95} />
        </mesh>

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

        {sim.kind === "throw" ? (
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
                {/* ガムテープ */}
                <mesh position={[0, b.size[1] / 2 + 0.002, 0]}>
                  <boxGeometry args={[b.size[0] + 0.004, 0.004, 0.16]} />
                  <meshStandardMaterial color="#d9b77c" roughness={0.6} />
                </mesh>
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
        {trails}
      </ThreeCanvas>
      {overlays}
      {sounds}
    </AbsoluteFill>
  );
};
