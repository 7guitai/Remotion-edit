import React, { useEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";

export type GlobeProps = {
  // 貼り付ける地図（public/footage/ の NASA テクスチャ）
  texture: GlobeTexture;
  // 場面の途中で、別の地図へゆっくり切り替える（例：海がなくなる）。fade は場面の何割から何割で切り替えるか
  textureTo?: GlobeTexture;
  fade?: [number, number];
  // 土星のような輪をつける
  rings?: boolean;
  // たての縮み（1 でまんまる。0.9 なら上下につぶれた形）。squashTo でそこまで変わっていく
  squash?: number;
  squashTo?: number;
  // 1フレームあたりの回転（度）
  speed?: number;
  // このフレームで急ブレーキをかけて止める
  stopAt?: number;
  // 地軸の傾き（度）。tiltTo を指定すると場面の間にそこまで傾いていく
  tilt?: number;
  tiltTo?: number;
  // 球の大きさ（1 で映像エリアにほぼ収まる）。sizeTo を指定すると場面の間にその大きさへ（遠ざかる表現）
  size?: number;
  sizeTo?: number;
  // 描く範囲（映像エリアの大きさ）
  width?: number;
  height?: number;
};

type GlobeTexture = "earth" | "earth_night" | "moon" | "mars" | "earth_jul" | "earth_dry";

const TEXTURES: Record<GlobeTexture, string> = {
  earth: "footage/earth_texture_5400.jpg",
  // 地形の陰影つき（7月）と、そこから海をなくした地図（scripts/make_dry_earth.py）
  earth_jul: "footage/earth_topo_bathy_jul.jpg",
  earth_dry: "footage/earth_dry_seabed.jpg",
  earth_night: "footage/earth_night_texture.jpg",
  moon: "footage/moon_texture_2k.jpg",
  mars: "footage/mars_texture.jpg",
};

const useTexture = (path: string) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender(`texture ${path}`));
  useEffect(() => {
    new THREE.TextureLoader().load(staticFile(path), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTex(t);
      continueRender(handle);
    });
  }, [path, handle]);
  return tex;
};

// 回転角：stopAt までは一定の速さ、そこから数フレームで急停止して小さく揺れ戻る
const angleAt = (frame: number, speed: number, stopAt?: number) => {
  if (stopAt === undefined || frame < stopAt) {
    return frame * speed;
  }
  const t = frame - stopAt;
  const brake = speed * 6 * (1 - Math.exp(-t / 3));
  const wobble = Math.sin(t * 0.9) * 2 * Math.exp(-t / 10);
  return stopAt * speed + brake + wobble;
};

// 輪の模様：内側から外側へ、明るさと透け具合の違う細い帯を重ねる（すき間も入れる）
const useRingTexture = () =>
  useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 4;
    const ctx = canvas.getContext("2d")!;
    for (let x = 0; x < 1024; x++) {
      const u = x / 1023;
      // 決まった乱数（毎回同じ模様）
      const n =
        0.5 +
        0.25 * Math.sin(u * 91.7) +
        0.15 * Math.sin(u * 233.1 + 1.3) +
        0.1 * Math.sin(u * 517.9 + 0.7);
      const gap = u > 0.62 && u < 0.68 ? 0.08 : 1; // 大きなすき間
      const edge = Math.min(1, u / 0.06, (1 - u) / 0.08);
      const alpha = Math.max(0, Math.min(1, (0.35 + 0.55 * n) * gap * edge));
      const c = Math.round(205 + 40 * n);
      ctx.fillStyle = `rgba(${c},${c - 12},${c - 32},${alpha.toFixed(3)})`;
      ctx.fillRect(x, 0, 1, 4);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

// 平らな輪の UV を、中心からの距離（内側 0 → 外側 1）にする
const useRingGeometry = (inner: number, outer: number) =>
  useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 180, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    return g;
  }, [inner, outer]);

// NASA の地図画像を貼った、本物の写真の地球・月
export const Globe: React.FC<GlobeProps> = ({
  texture,
  speed = 0.6,
  stopAt,
  tilt = texture === "moon" ? 0 : texture === "mars" ? 25.2 : 23.4,
  tiltTo,
  size = 1,
  sizeTo,
  textureTo,
  fade = [0.3, 0.8],
  rings,
  squash = 1,
  squashTo,
  width: w,
  height: h,
}) => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const width = w ?? config.width;
  const height = h ?? config.height;
  const { durationInFrames } = config;
  const map = useTexture(TEXTURES[texture]);
  const mapTo = useTexture(TEXTURES[textureTo ?? texture]);
  const ringTex = useRingTexture();
  const ringGeom = useRingGeometry(1.35, 2.45);
  const fadeT = textureTo
    ? Math.min(
        1,
        Math.max(
          0,
          (frame / durationInFrames - fade[0]) / Math.max(0.01, fade[1] - fade[0]),
        ),
      )
    : 0;
  const deg = Math.PI / 180;
  const tiltNow =
    tiltTo === undefined
      ? tilt
      : tilt + (tiltTo - tilt) * Math.min(1, frame / durationInFrames);
  const night = texture === "earth_night";
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 0, 3.4], fov: 40 }}
      shadows={rings}
    >
      <ambientLight intensity={night ? 0.6 : 0.25} />
      {night ? null : (
        <directionalLight
          position={[-1.6, 1, 3]}
          intensity={2.4}
          castShadow={rings}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.002}
        />
      )}
      <group
        rotation={[0.25, 0, tiltNow * deg]}
        scale={(() => {
          const sc =
            (sizeTo === undefined
              ? size
              : size +
                (sizeTo - size) * Math.min(1, frame / durationInFrames) ** 1.5) *
            0.88;
          const sq =
            squashTo === undefined
              ? squash
              : squash + (squashTo - squash) * Math.min(1, frame / durationInFrames);
          return [sc, sc * sq, sc] as [number, number, number];
        })()}
        position={[0, 0.12, 0]}
      >
        <mesh
          rotation={[0, (angleAt(frame, speed, stopAt) - 90) * deg, 0]}
          castShadow={rings}
          receiveShadow={rings}
        >
          <sphereGeometry args={[1, 96, 96]} />
          {map ? (
            // 地図そのものを少し光らせて、写真の明るさを保ちつつ光で立体感を出す
            <meshStandardMaterial
              map={map}
              emissiveMap={map}
              emissive="#ffffff"
              emissiveIntensity={night ? 1 : 0.55}
              roughness={0.9}
              metalness={0}
            />
          ) : null}
        </mesh>
        {textureTo && mapTo && fadeT > 0 ? (
          // 切り替え先の地図を、少しだけ大きい球に重ねて、だんだん見せる
          <mesh
            rotation={[0, (angleAt(frame, speed, stopAt) - 90) * deg, 0]}
            scale={1.0015}
          >
            <sphereGeometry args={[1, 96, 96]} />
            <meshStandardMaterial
              map={mapTo}
              emissiveMap={mapTo}
              emissive="#ffffff"
              emissiveIntensity={0.55}
              roughness={0.9}
              metalness={0}
              transparent
              opacity={fadeT}
            />
          </mesh>
        ) : null}
        {rings ? (
          // 輪（赤道の面に寝かせる）
          <mesh
            geometry={ringGeom}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              map={ringTex}
              transparent
              alphaTest={0.12}
              side={THREE.DoubleSide}
              roughness={0.8}
              emissive="#ffffff"
              emissiveMap={ringTex}
              emissiveIntensity={0.25}
            />
          </mesh>
        ) : null}
        {texture === "moon" ? null : (
          // 大気のうっすらした光（火星はうすいオレンジ）
          <mesh scale={texture === "mars" ? 1.02 : 1.035}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial
              color={texture === "mars" ? "#ffb27a" : "#5fb0ff"}
              transparent
              opacity={texture === "mars" ? 0.1 : 0.16}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </group>
    </ThreeCanvas>
  );
};
