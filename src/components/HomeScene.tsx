import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { DOOR, HomeMode, HomeResult, LANE_X, PHONE_DROP, ROOM, simulateHome } from "../sim/home";
import { PersonPart } from "./PhysicsScene";
import { Pill, SpeedLines } from "./FleaScene";
import { fontFamily } from "../theme";

// 「家の中の事故 検証10選」の場面。左右の部屋を、画面の左半分・右半分に分けて同時に見せる
const SKIN = "#f1c7a0";
const PANTS = "#2d3a57";
const SHOE = "#2a2a2e";
const RED = "#ff4a3d";
const BLUE = "#2f8bff";

export const HOME_LABELS: Record<HomeMode, [string, string]> = {
  bath: ["ぬれた床＋せっけん", "すべり止めマット"],
  socks: ["靴下", "はだし"],
  cord: ["前を見て歩く", "歩きスマホ"],
  ladder: ["踏み台（45cm）", "脚立の天板（1.2m）"],
  bed: ["ベッドガードなし", "ベッドガードあり"],
  phone: ["スマホ（190g）", "タブレット（480g）"],
  door: ["ドアノブ側", "ちょうつがい側"],
  shelf: ["重い物が上", "重い物が下"],
  furniture: ["固定なし", "L字金具で固定"],
};
// 危ないほうのレーン（赤）
const DANGER: Record<HomeMode, number> = { bath: 0, socks: 0, cord: 1, ladder: 1, bed: 0, phone: 1, door: 1, shelf: 0, furniture: 0 };

const NP = 13;
const partPos = (r: HomeResult, f: number, fig: number, i: number) => {
  const o = ((f * r.nFig + fig) * NP + i) * 7;
  return [r.doll[o], r.doll[o + 1], r.doll[o + 2]] as [number, number, number];
};
const PELVIS = 6;

const shakeAmp = (r: HomeResult, lane: number, t: number) => {
  let a = 0;
  for (const h of r.hits) {
    if (h.lane !== lane) continue;
    const d = t - h.t;
    if (d >= 0 && d < 0.5) a = Math.max(a, Math.min(0.05, h.v * 0.007) * Math.exp(-d * 8));
  }
  for (const e of r.events) {
    if (e.lane !== lane || !e.big) continue;
    const d = t - e.t;
    if (d >= 0 && d < 0.8) a = Math.max(a, 0.1 * Math.exp(-d * 5));
  }
  return a;
};

// レーンごとのカメラ（体を少しおくれて追いかける）
const Cam: React.FC<{ r: HomeResult; f: number; lane: number }> = ({ r, f, lane }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const lx = LANE_X[lane];
  const t = f / r.fps;
  const sh = shakeAmp(r, lane, t);
  const jx = sh * Math.sin(t * 77);
  const jy = sh * Math.cos(t * 63);
  let px = lx;
  let py = 1;
  if (r.nFig > lane) {
    let n = 0;
    px = 0;
    py = 0;
    for (let k = Math.max(0, f - 8); k <= f; k++) {
      const p = partPos(r, k, lane, PELVIS);
      px += p[0];
      py += p[1];
      n++;
    }
    px /= n;
    py /= n;
  }
  const m = r.mode;
  let pos: [number, number, number];
  let look: [number, number, number];
  if (m === "bath" || m === "socks" || m === "cord") {
    pos = [px, 1.35, 4.6];
    look = [px, 0.75, 0];
  } else if (m === "ladder") {
    pos = [lx + 0.5, 1.6, 5.6];
    look = [lx + 0.5, 1.15, 0];
  } else if (m === "bed") {
    pos = [lx + 0.5, 1.7, 3.7];
    look = [lx - 0.1, 0.45, -0.3];
  } else if (m === "phone") {
    pos = [lx + 0.35, 1.25, 1.2];
    look = [lx, 0.35, -0.3];
  } else if (m === "door") {
    // ななめ上から、ドアが閉まっていくのを見下ろす
    pos = [lx + 0.1, 3.0, 1.7];
    look = [lx, 0.7, -0.05];
  } else {
    pos = [lx + 0.2, 1.5, 4.8];
    look = [lx - 0.3, 0.9, 0];
  }
  camera.position.set(pos[0] + jx, pos[1] + jy, pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  camera.updateProjectionMatrix();
  return null;
};

// タイルの床・壁（お風呂）
const useTile = (base: string, line: string, rep: number) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = base;
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = line;
    x.fillRect(0, 0, 128, 4);
    x.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [base, line, rep]);

const useWood = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const x = c.getContext("2d")!;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = ["#c99a66", "#c29262", "#cfa16c", "#c6975f"][i % 4];
      x.fillRect(0, i * 32, 256, 32);
      x.fillStyle = "rgba(90,60,30,0.25)";
      x.fillRect(0, i * 32, 256, 2);
      x.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

// 部屋（床・奥の壁・仕切り）と、場面ごとの家具（飾り）
const Room: React.FC<{ r: HomeResult; f: number; lane: number }> = ({ r, f, lane }) => {
  const tile = useTile("#dbe9ee", "#b9cdd4", 6);
  const wallTile = useTile("#eef5f7", "#cfdde2", 8);
  const wood = useWood();
  const lx = LANE_X[lane];
  const m = r.mode;
  const bath = m === "bath";
  const sx = r.shake[f] ?? 0;
  const W = ROOM.half * 2;
  return (
    <group position={[sx, 0, 0]}>
      <mesh position={[lx, -0.05, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, 5]} />
        <meshStandardMaterial map={bath ? tile : wood} roughness={bath ? 0.25 : 0.7} />
      </mesh>
      {/* ぬれた床（光る水の膜）／すべり止めマット */}
      {bath && lane === 0 ? (
        <mesh position={[lx, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, 3]} />
          <meshStandardMaterial color="#e8f7ff" transparent opacity={0.35} roughness={0.02} metalness={0.3} />
        </mesh>
      ) : null}
      {bath && lane === 1 ? (
        <mesh position={[lx - 0.3, 0.004, 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.2, 1.2]} />
          <meshStandardMaterial color="#7fc8a9" roughness={0.95} />
        </mesh>
      ) : null}
      <mesh position={[lx, ROOM.h / 2, ROOM.back]} receiveShadow>
        <boxGeometry args={[W, ROOM.h, 0.1]} />
        <meshStandardMaterial map={bath ? wallTile : undefined} color={bath ? "#ffffff" : "#f3ead9"} roughness={0.9} />
      </mesh>
      {!bath ? (
        <mesh position={[lx, 0.06, ROOM.back + 0.06]}>
          <boxGeometry args={[W, 0.12, 0.02]} />
          <meshStandardMaterial color="#9b7653" />
        </mesh>
      ) : null}
      {/* お風呂：湯船と鏡 */}
      {bath ? (
        <group>
          <mesh position={[lx + 1.3, 0.3, ROOM.back + 0.45]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 0.6, 0.8]} />
            <meshStandardMaterial color="#f7f9fa" roughness={0.3} />
          </mesh>
          <mesh position={[lx + 1.3, 0.56, ROOM.back + 0.45]}>
            <boxGeometry args={[1.25, 0.04, 0.65]} />
            <meshStandardMaterial color="#8fd0ea" transparent opacity={0.8} roughness={0.05} />
          </mesh>
          <mesh position={[lx - 1.2, 1.4, ROOM.back + 0.06]}>
            <boxGeometry args={[0.6, 0.8, 0.02]} />
            <meshStandardMaterial color="#d9eef7" metalness={0.6} roughness={0.08} />
          </mesh>
          {/* せっけんの泡 */}
          {lane === 0
            ? Array.from({ length: 10 }, (_, i) => (
                <mesh key={i} position={[lx - 0.4 + random(`fx${i}`) * 1.4, 0.02, -0.4 + random(`fz${i}`) * 0.9]}>
                  <sphereGeometry args={[0.03 + random(`fr${i}`) * 0.03, 8, 6]} />
                  <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
                </mesh>
              ))
            : null}
        </group>
      ) : null}
      {/* 居間：窓と観葉植物 */}
      {m === "socks" || m === "cord" || m === "ladder" || m === "bed" || m === "phone" ? (
        <group>
          <mesh position={[lx + (lane === 0 ? -1.2 : 1.2), 1.45, ROOM.back + 0.06]}>
            <boxGeometry args={[1.0, 0.9, 0.03]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[lx + (lane === 0 ? -1.2 : 1.2), 1.45, ROOM.back + 0.08]}>
            <boxGeometry args={[0.9, 0.8, 0.01]} />
            <meshStandardMaterial color="#a9d4f0" />
          </mesh>
        </group>
      ) : null}
      {/* ドアのある壁（ドアの左右と上） */}
      {m === "door" ? (
        <group>
          <mesh position={[lx - 0.4 - 0.03 - 0.9, ROOM.h / 2, -0.22]} castShadow receiveShadow>
            <boxGeometry args={[1.8, ROOM.h, 0.12]} />
            <meshStandardMaterial color="#f3ead9" />
          </mesh>
          <mesh position={[lx - 0.4 + DOOR.w + 0.03 + 0.9, ROOM.h / 2, -0.22]} castShadow receiveShadow>
            <boxGeometry args={[1.8, ROOM.h, 0.12]} />
            <meshStandardMaterial color="#f3ead9" />
          </mesh>
          <mesh position={[lx - 0.4 + DOOR.w / 2, (DOOR.h + ROOM.h) / 2 + 0.02, -0.22]}>
            <boxGeometry args={[DOOR.w + 0.12, ROOM.h - DOOR.h, 0.12]} />
            <meshStandardMaterial color="#f3ead9" />
          </mesh>
          {/* 枠 */}
          {[-0.03, DOOR.w + 0.03].map((x, k) => (
            <mesh key={k} position={[lx - 0.4 + x, DOOR.h / 2, -0.22]}>
              <boxGeometry args={[0.04, DOOR.h, 0.14]} />
              <meshStandardMaterial color="#b98a5a" />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};

// 記録した物体（家具・道具）を描く
const Things: React.FC<{ r: HomeResult; f: number; lane: number }> = ({ r, f, lane }) => {
  const lx = LANE_X[lane];
  return (
    <group>
      {r.vis.map((v, i) => {
        if (v.hidden) return null;
        const o = (f * r.nBody + v.b) * 7;
        const p = [r.body[o], r.body[o + 1], r.body[o + 2]];
        // 自分の部屋の物だけ（となりの部屋の物は、カメラに入らないので描かない）
        if (Math.abs(p[0] - lx) > 3.2) return null;
        return (
          <group key={i} position={[p[0], p[1], p[2]]} quaternion={[r.body[o + 3], r.body[o + 4], r.body[o + 5], r.body[o + 6]]}>
            <mesh position={v.off} rotation={v.rot ?? [0, 0, 0]} castShadow receiveShadow>
              {v.shape === "cyl" ? <cylinderGeometry args={[v.size[0] / 2, v.size[0] / 2, v.size[1], 16]} /> : v.shape === "sphere" ? <sphereGeometry args={[v.size[0] / 2, 16, 12]} /> : <boxGeometry args={v.size} />}
              <meshStandardMaterial color={v.color} roughness={v.glass ? 0.05 : 0.6} transparent={v.glass} opacity={v.glass ? 0.45 : 1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ぶつかった所のちり
const Dust: React.FC<{ r: HomeResult; t: number; f: number; lane: number }> = ({ r, t, lane }) => {
  return (
    <group>
      {r.events
        .filter((e) => e.lane === lane && e.big)
        .map((e, k) => {
          const d = t - e.t;
          if (d < 0 || d > 1.2) return null;
          const ef = Math.min(r.frames - 1, Math.round(e.t * r.fps));
          let p: [number, number, number] = [LANE_X[lane], 0.1, 0];
          if (r.nFig > lane) p = partPos(r, ef, lane, 8);
          if (r.mode === "shelf" || r.mode === "furniture") {
            const o = (ef * r.nBody + lane) * 7;
            p = [r.body[o], 0.1, r.body[o + 2]];
          }
          return (
            <group key={k} position={[p[0], Math.max(0.05, p[1] - 0.1), p[2]]}>
              {Array.from({ length: 10 }, (_, i) => {
                const a = random(`hd${k}-${i}`) * Math.PI * 2;
                const s = 0.3 + d * 0.9 * random(`hs${k}-${i}`);
                return (
                  <mesh key={i} position={[Math.cos(a) * s * 0.5, Math.abs(Math.sin(a)) * s * 0.25, Math.sin(a) * s * 0.3]}>
                    <sphereGeometry args={[0.05 + d * 0.22, 8, 6]} />
                    <meshStandardMaterial color="#ece6da" transparent opacity={Math.max(0, 0.5 * (1 - d / 1.2))} depthWrite={false} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
    </group>
  );
};

// 下に出す数字（レーンごと）
const metric = (r: HomeResult, lane: number, t: number): { text: string; hot: boolean } | null => {
  const m = r.mode;
  const ev = r.events.filter((e) => e.lane === lane && t >= e.t);
  const head = r.head[lane];
  if (m === "bath" || m === "cord" || m === "ladder" || m === "socks") {
    if (m === "socks" && t > r.t0) {
      const d = Math.min(r.info[`slide${lane}`], Math.max(0, (t - r.t0) * 1.4));
      if (head.v <= 6 || t < head.t) return { text: `すべった距離 ${d.toFixed(1)}m`, hot: lane === 0 && t >= (r.info.fall0 ?? 99) };
    }
    if (head.v > 6 && t >= head.t) return { text: `頭を打つ 時速${Math.round(head.v)}km`, hot: true };
    return head.v <= 6 && t > r.t0 + 1.2 ? { text: "頭は打っていない", hot: false } : null;
  }
  if (m === "bed") return ev.length ? { text: "床まで50cm 落ちた", hot: true } : t > r.t0 + 1 ? { text: "落ちなかった", hot: false } : null;
  if (m === "phone") {
    if (!ev.length) return { text: `高さ30cm から落とす`, hot: false };
    const e = r.info[`e${lane}`];
    return { text: `顔への衝撃 ${e.toFixed(1)}J`, hot: lane === 1 };
  }
  if (m === "door") {
    const kg = lane === 0 ? DOOR.push / 9.8 : (DOOR.push * r.info.ratio) / 9.8;
    return t > r.t0 ? { text: `はさむ力 約${Math.round(kg)}kg分`, hot: lane === 1 } : null;
  }
  if (m === "shelf" || m === "furniture") return ev.length ? { text: "倒れた！", hot: true } : t > 6 ? { text: "倒れなかった", hot: false } : null;
  return null;
};

const Half: React.FC<{ r: HomeResult; f: number; lane: number; width: number; height: number; color: string }> = ({ r, f, lane, width, height, color }) => (
  <ThreeCanvas width={width} height={height} shadows camera={{ fov: 42, near: 0.03, far: 60 }} gl={{ antialias: true }}>
    <Cam r={r} f={f} lane={lane} />
    <ambientLight intensity={0.6} />
    <hemisphereLight args={["#fff6e8", "#8a6a4a", 0.45]} />
    <directionalLight
      position={[LANE_X[lane] + 2, 7, 5]}
      intensity={2.0}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-4}
      shadow-camera-right={4}
      shadow-camera-top={4}
      shadow-camera-bottom={-2}
      shadow-bias={-0.0004}
    />
    <Room r={r} f={f} lane={lane} />
    <Things r={r} f={f} lane={lane} />
    {r.parts
      .filter((p) => p.fig === lane)
      .map((p) => {
        const i = r.parts.indexOf(p);
        const o = ((f * r.nFig + p.fig) * NP + (i % NP)) * 7;
        const c = p.look === "shirt" ? color : p.look === "skin" ? SKIN : p.look === "shoe" ? SHOE : PANTS;
        return (
          <PersonPart
            key={i}
            part={p.name}
            size={p.size}
            color={c}
            closed={r.mode === "bed" || r.mode === "furniture"}
            pos={[r.doll[o], r.doll[o + 1], r.doll[o + 2]]}
            quat={[r.doll[o + 3], r.doll[o + 4], r.doll[o + 5], r.doll[o + 6]]}
          />
        );
      })}
    <Dust r={r} t={f / r.fps} f={f} lane={lane} />
  </ThreeCanvas>
);

// only を指定すると、その部屋だけを画面いっぱいに見せる（サムネイル用）
export const HomeScene: React.FC<{ mode: HomeMode; width: number; height: number; offset?: number; speed?: number; bare?: boolean; only?: number }> = ({ mode, width, height, offset = 0, speed = 1, bare, only }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = useMemo(() => simulateHome(mode, fps), [mode, fps]);
  const f = Math.max(0, Math.min(Math.floor(offset + frame * speed), r.frames - 1));
  const t = f / fps;
  const at = (sec: number) => Math.round((sec * fps - offset) / speed);
  const hw = only !== undefined ? width : Math.floor(width / 2);
  const danger = DANGER[mode];
  const colors = [0, 1].map((l) => (l === danger ? RED : BLUE));
  const quake = mode === "shelf" || mode === "furniture";
  const quakeOn = quake && t > 1.0 && t < 7.0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#f3ead9" }} />
      {(only !== undefined ? [only] : [0, 1]).map((lane) => {
        const flashE = r.events.filter((e) => e.lane === lane && e.big);
        const flash = flashE.reduce((a, e) => a + interpolate(t - e.t, [0, 0.02, 0.3], [0, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);
        const lines = r.events
          .filter((e) => e.lane === lane)
          .reduce((a, e) => Math.max(a, interpolate(t - e.t, [0, 0.04, 0.8], [0, e.big ? 1 : 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 0);
        const slam = r.events.filter((e) => e.lane === lane && t >= e.t && t < e.t + 1.4).pop();
        const sd = slam ? t - slam.t : 0;
        const mt = metric(r, lane, t);
        return (
          <div key={lane} style={{ position: "absolute", left: only !== undefined ? 0 : lane * hw, top: 0, width: hw, height, overflow: "hidden" }}>
            <Half r={r} f={f} lane={lane} width={hw} height={height} color={colors[lane]} />
            <SpeedLines strength={lines * 0.8} seed={Math.floor(t * 12) + lane * 7} width={hw} height={height} />
            {slam ? (
              <div
                style={{
                  position: "absolute",
                  top: height * 0.2,
                  width: "100%",
                  textAlign: "center",
                  fontFamily,
                  fontWeight: 900,
                  fontSize: slam.big ? 128 : 100,
                  color: slam.big ? "#ffe23a" : "#ffffff",
                  WebkitTextStroke: "10px #1a1a1a",
                  paintOrder: "stroke fill",
                  transform: `scale(${interpolate(sd, [0, 0.1, 0.2], [2.3, 0.9, 1], { extrapolateRight: "clamp" })}) rotate(${lane ? 6 : -6}deg)`,
                  opacity: interpolate(sd, [1.0, 1.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              >
                {slam.text}
              </div>
            ) : null}
            {bare ? null : (
              <div style={{ position: "absolute", top: 100, left: 24 }}>
                <Pill color={colors[lane]} size={44}>
                  {HOME_LABELS[mode][lane]}
                </Pill>
              </div>
            )}
            {!bare && mt ? (
              <div style={{ position: "absolute", bottom: 210, left: 24 }}>
                <Pill color={mt.hot ? RED : "#8a8f99"} size={42}>
                  {mt.text}
                </Pill>
              </div>
            ) : null}
            <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash), pointerEvents: "none" }} />
          </div>
        );
      })}
      {/* まん中の仕切り */}
      {only !== undefined ? null : <div style={{ position: "absolute", left: hw - 4, top: 0, width: 8, height, background: "#1a1a1a" }} />}
      {quakeOn && !bare ? (
        <div style={{ position: "absolute", top: 190, left: 0, width: "100%", display: "flex", justifyContent: "center" }}>
          <Pill color="#ff8a00" size={40}>
            {`大きな地震の揺れ`}
          </Pill>
        </div>
      ) : null}
      {/* 効果音：ぶつかるたびに小さく（強さに合わせて）、大きな事件は少し大きく */}
      {bare
        ? null
        : r.hits.map((h, k) => {
            const from = at(h.t);
            if (from < 0 || h.v < 1.5) return null;
            return (
              <Sequence key={`h${k}`} from={from} durationInFrames={30}>
                <Audio src={staticFile(`sfx/thud${(k % 3) + 1}.wav`)} volume={Math.min(0.3, 0.04 + h.v * 0.035)} />
              </Sequence>
            );
          })}
      {bare
        ? null
        : r.events.map((e, k) => {
            const from = at(e.t);
            if (from < 0) return null;
            const file = e.text === "バキッ！" ? "crack.wav" : e.big ? "impact.wav" : e.text === "ズルッ！" || e.text === "ガッ！" ? "whoosh.wav" : "tok.wav";
            return (
              <Sequence key={`e${k}`} from={from} durationInFrames={45}>
                <Audio src={staticFile(`sfx/${file}`)} volume={e.big ? 0.3 : 0.18} />
              </Sequence>
            );
          })}
      {/* 地震のゴゴゴ音のかわりに、低い揺れの音（雨の音を小さく） */}
      {!bare && quake && at(1.0) >= 0 ? (
        <Sequence from={at(1.0)} durationInFrames={Math.round((6 * fps) / speed)}>
          <Audio src={staticFile("sfx/rain.wav")} volume={0.12} playbackRate={0.5} />
        </Sequence>
      ) : null}
      {PHONE_DROP ? null : null}
    </AbsoluteFill>
  );
};
