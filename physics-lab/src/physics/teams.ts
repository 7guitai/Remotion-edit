export type TeamId = "red" | "blue" | "green" | "gold";
export type Team = { id: TeamId; name: string; color: string };

export const TEAMS: readonly Team[] = [
  { id: "red", name: "RED", color: "#e3342f" },
  { id: "blue", name: "BLUE", color: "#2563d9" },
  { id: "green", name: "GREEN", color: "#2fae3f" },
  { id: "gold", name: "GOLD", color: "#d9a326" },
];

export const teamById = (id: TeamId): Team => TEAMS.find((t) => t.id === id)!;
