import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EscalationSpec, ShotKind } from "./types";
import { makeTimeline, rateAt, realTime, simTime } from "./timeline";
import { Caption, Countdown, Hud, Note, SpeedTag } from "./Hud";
import { TownCamera, TownEvents, TownScene } from "./TownScene";
import { EarthScene } from "./EarthScene";
import { simulateTown } from "./townSim";
import { earthAngle, force, omega, pressure, P0, windSpeed } from "./fanPhysics";
import { FAN_SPEC } from "./fanSpec";
import fanVoice from "./voice/escalate-fan-short.json";

// 「指数関数エスカレーション」動画の本体（9:16 フルスクリーン）。
// 実時間 → シミュレーション内時間 t をタイムラインで変換し、t から HUD・字幕・場面・音をすべて決める。

type VoiceInfo = { theme: number; captions: number[]; shouts: number[] };
export const ESCALATIONS: Record<string, { spec: EscalationSpec; voice: VoiceInfo }> = {
  [FAN_SPEC.id]: { spec: FAN_SPEC, voice: fanVoice as VoiceInfo },
};

const TOWN_KINDS: ShotKind[] = ["closeup", "plaza", "street", "front", "back", "rooftop"];
const EV: TownEvents = { hatT: 3, fleeT: 5, glassT: 8.6, drillT: 12.8, reactionT: 19.3 };
const BEAM_START = 21.6;

export const escalationDuration = (id: string, fps: number) => Math.ceil(makeTimeline(ESCALATIONS[id].spec.timeline).total * fps) + Math.round(fps * 0.5);

// 揺れ：t のまわりの事件ほど大きく
const shakeAt = (t: number) => {
  const bumps: [number, number, number][] = [
    [12.8, 0.04, 0.8],
    [16.9, 0.12, 2.5],
    [19.3, 0.18, 2],
    [91.7, 0.05, 1.5],
  ];
  let s = 0;
  for (const [at, amp, len] of bumps) {
    const d = t - at;
    if (d >= 0 && d < len) s = Math.max(s, amp * (1 - d / len));
  }
  return s;
};

// 音の予定表を作る（ナレーションが重ならないように、前の読み上げが終わるまで待つ）
const voiceSchedule = (spec: EscalationSpec, voice: VoiceInfo, tl: ReturnType<typeof makeTimeline>) => {
  const out: { file: string; at: number }[] = [];
  let end = 0;
  if (voice.theme > 0) {
    out.push({ file: `voice/${spec.id}/000.wav`, at: 0.05 });
    end = 0.05 + voice.theme;
  }
  spec.captions.forEach((c, i) => {
    const sec = voice.captions[i];
    if (!sec || c.speech === "-") return;
    const at = Math.max(realTime(tl, c.t), end + 0.05);
    out.push({ file: `voice/${spec.id}/${String(i + 1).padStart(3, "0")}.wav`, at });
    end = at + sec;
  });
  return out;
};

export const EscalationVideo: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { spec, voice } = ESCALATIONS[id];
  const tl = useMemo(() => makeTimeline(spec.timeline), [spec]);
  const town = useMemo(() => simulateTown({ force, reactionT: EV.reactionT, t0: 12, t1: 25 }), []);
  const voices = useMemo(() => voiceSchedule(spec, voice, tl), [spec, voice, tl]);
  const r = frame / fps;
  const t = simTime(tl, r);
  const rate = rateAt(tl, r);
  const fast = rate > 1;
  // 早送りが終わってからの時間（「▶ ふつうの速さ」を少しだけ出す）
  let sinceNormal = -1;
  for (let i = 1; i < tl.segments.length; i++) if (tl.segments[i].rate === 1 && tl.segments[i - 1].rate > 1 && r >= tl.starts[i]) sinceNormal = r - tl.starts[i];

  // 場面
  let si = 0;
  spec.shots.forEach((s, i) => {
    if (t >= s.t) si = i;
  });
  const shot = spec.shots[si];
  const next = spec.shots[si + 1];
  const u = next ? Math.min(1, (t - shot.t) / (next.t - shot.t)) : Math.min(1, (t - shot.t) / 10);
  const isTown = TOWN_KINDS.includes(shot.kind);
  const P = pressure(t);
  const strength = Math.min(1, Math.max(0, Math.log2(P / P0) / 20));
  const v = windSpeed(t);
  const spin = Math.min(0.9, 0.18 + v * 0.03);
  const shake = shakeAt(t) * (isTown ? 1 : 0.05);
  const perFrame = (omega(t) * Math.max(rate, 1)) / fps;
  // 場面の切り替わりの白いフラッシュ
  const cutAge = r - realTime(tl, shot.t);
  const cutFlash = si > 1 ? interpolate(cutAge, [0, 0.25], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const bigFlash = [16.9, 19.3, 91.7].reduce((a, at) => a + interpolate(t - at, [0, 0.05, 0.5], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);

  // 字幕
  const inCountdown = r < tl.countdown;
  let cap: { text: string; age: number } | null = null;
  if (inCountdown) cap = { text: spec.theme, age: r };
  else {
    for (const c of spec.captions) if (t >= c.t) cap = { text: c.text, age: r - realTime(tl, c.t) };
  }
  const noteAge = r - realTime(tl, spec.note.t);
  const sec = Math.floor(t + 1e-6);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 空（3D の背景は透明なので、うしろに空の色をしく） */}
      <AbsoluteFill style={{ background: isTown ? "linear-gradient(180deg, #4f9be8 0%, #9fd0f7 55%, #dff0fb 100%)" : "#02030a" }} />
      <ThreeCanvas width={width} height={height} shadows={isTown} camera={{ fov: 55, near: 0.05, far: 20000 }} key={isTown ? "town" : "earth"} gl={{ antialias: true, logarithmicDepthBuffer: isTown }}>
        {isTown ? (
          <>
            <TownCamera kind={shot.kind} u={u} shake={shake} frame={frame} />
            <TownScene sim={town} t={t} frame={frame} ev={EV} strength={strength} speed={v} spin={spin} />
          </>
        ) : (
          <EarthScene kind={shot.kind} u={u} T={t} frame={frame} angleAt={earthAngle} perFrame={perFrame} beamStart={BEAM_START} shake={shake} />
        )}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, cutFlash + bigFlash), pointerEvents: "none" }} />
      <Hud seconds={`${sec}秒${fast ? "（早送り）" : ""}`} label={spec.label} value={spec.value(t)} sub={spec.sub(t)} badge={inCountdown ? null : spec.badge(t)} />
      <SpeedTag fast={fast} sinceNormal={sinceNormal} />
      {inCountdown ? <Countdown frame={frame} fps={fps} seconds={tl.countdown} /> : null}
      {cap ? <Caption text={cap.text} age={cap.age} size={inCountdown ? 74 : 60} /> : null}
      {noteAge >= 0 ? <Note text={spec.note.text} age={noteAge} /> : null}

      {/* ---- 音 ---- */}
      {[0, 1, 2].map((k) => (
        <Sequence key={`b${k}`} from={Math.round(k * fps)} durationInFrames={Math.round(fps * 0.5)}>
          <Audio src={staticFile("sfx/esc_beep.wav")} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={Math.round(tl.countdown * fps)} durationInFrames={Math.round(fps)}>
        <Audio src={staticFile("sfx/esc_go.wav")} volume={0.35} />
      </Sequence>
      {/* 風の音（町の場面）：強くなるほど大きく、音速をこえると轟音が重なる */}
      <Sequence from={Math.round(tl.countdown * fps)} durationInFrames={Math.round((realTime(tl, 24.6) - tl.countdown) * fps)}>
        <Audio loop src={staticFile("sfx/esc_wind.wav")} volume={(f) => 0.05 + 0.3 * Math.min(1, simTime(tl, tl.countdown + f / fps) / 14)} />
      </Sequence>
      <Sequence from={Math.round(realTime(tl, 12.8) * fps)} durationInFrames={Math.round((realTime(tl, 24.6) - realTime(tl, 12.8)) * fps)}>
        <Audio loop src={staticFile("sfx/esc_jet.wav")} volume={(f) => Math.min(0.4, f / fps / 2)} />
      </Sequence>
      {/* 宇宙の低いうなり */}
      <Sequence from={Math.round(realTime(tl, 24.6) * fps)}>
        <Audio loop src={staticFile("sfx/esc_drone.wav")} volume={0.35} />
      </Sequence>
      {spec.sfx.map((s, k) => (
        <Sequence key={`s${k}`} from={Math.round(realTime(tl, s.t) * fps)} durationInFrames={Math.round((s.seconds ?? 4) * fps)}>
          <Audio src={staticFile(s.file)} volume={s.volume ?? 0.5} />
        </Sequence>
      ))}
      {spec.shouts.map((s, k) =>
        voice.shouts[k] ? (
          <Sequence key={`h${k}`} from={Math.round(realTime(tl, s.t) * fps)} durationInFrames={Math.round(fps * 2)}>
            <Audio src={staticFile(`voice/${spec.id}/${s.file}.wav`)} volume={0.5} />
          </Sequence>
        ) : null,
      )}
      {voices.map((vv, k) => (
        <Sequence key={`v${k}`} from={Math.round(vv.at * fps)}>
          <Audio src={staticFile(vv.file)} volume={1} />
        </Sequence>
      ))}
      {spec.bgm ? <Audio src={staticFile(`bgm/${spec.bgm.file}`)} volume={spec.bgm.volume} loop /> : null}
    </AbsoluteFill>
  );
};
