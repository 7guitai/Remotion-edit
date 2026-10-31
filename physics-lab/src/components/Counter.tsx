import React from "react";
import { interpolate } from "remotion";
import { TEAMS, type TeamId } from "../physics/teams";
import { useStyle } from "../styles/context";
import { Card } from "./Card";
import { TeamBallIcon } from "./TeamBallIcon";

type Props = {
  alive: number;
  total: number;
  teamAlive: Record<TeamId, number>;
  /** 直近で残数が減ってからのフレーム数（ポップ演出用） */
  framesSinceChange: number;
};

/** 画面上部: タイトル・残数・色ごとの残数 */
export const Counter: React.FC<Props> = ({ alive, total, teamAlive, framesSinceChange }) => {
  const s = useStyle();
  const pop = interpolate(framesSinceChange, [0, 4, 12], [1.25, 1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Card style={{ position: "absolute", top: 56, left: 60, right: 60, padding: "26px 40px 30px" }}>
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 46, letterSpacing: 3 }}>LAST BALL STANDING</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 250 }}>
          <span style={{ display: "inline-block", fontWeight: 800, fontSize: 112, lineHeight: 1, color: alive <= 1 ? s.accent : s.text, transform: `scale(${pop})`, transformOrigin: "left bottom" }}>
            {alive}
          </span>
          <span style={{ fontWeight: 800, fontSize: 44, color: s.sub }}>/{total}</span>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          {TEAMS.map((t) => {
            const n = teamAlive[t.id];
            return (
              <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: n === 0 ? 0.45 : 1 }}>
                <TeamBallIcon color={s.teams[t.id].color} size={62} dim={n === 0} />
                <span style={{ fontWeight: 800, fontSize: 38, lineHeight: 1, color: n === 0 ? s.sub : s.text }}>{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
