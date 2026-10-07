import React, { useEffect, useState } from "react";
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
  texture: "earth" | "earth_night" | "moon";
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

const TEXTURES = {
  earth: "footage/earth_texture_5400.jpg",
  earth_night: "footage/earth_night_texture.jpg",
  moon: "footage/moon_texture_2k.jpg",
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

// NASA の地図画像を貼った、本物の写真の地球・月
export const Globe: React.FC<GlobeProps> = ({
  texture,
  speed = 0.6,
  stopAt,
  tilt = texture === "moon" ? 0 : 23.4,
  tiltTo,
  size = 1,
  sizeTo,
  width: w,
  height: h,
}) => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const width = w ?? config.width;
  const height = h ?? config.height;
  const { durationInFrames } = config;
  const map = useTexture(TEXTURES[texture]);
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
    >
      <ambientLight intensity={night ? 0.6 : 0.25} />
      {night ? null : (
        <directionalLight position={[-1.6, 1, 3]} intensity={2.4} />
      )}
      <group
        rotation={[0.25, 0, tiltNow * deg]}
        scale={
          (sizeTo === undefined
            ? size
            : size +
              (sizeTo - size) * Math.min(1, frame / durationInFrames) ** 1.5) *
          0.88
        }
        position={[0, 0.12, 0]}
      >
        <mesh rotation={[0, (angleAt(frame, speed, stopAt) - 90) * deg, 0]}>
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
        {texture === "moon" ? null : (
          // 大気のうっすらした光
          <mesh scale={1.035}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial
              color="#5fb0ff"
              transparent
              opacity={0.16}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </group>
    </ThreeCanvas>
  );
};
