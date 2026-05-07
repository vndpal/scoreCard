import { player, PlayerRole } from "@/types/player";

export const ROLE_META: Record<
  PlayerRole,
  { label: string; short: string; color: string }
> = {
  BAT: { label: "Batter", short: "BAT", color: "#C2410C" },
  BOWL: { label: "Bowler", short: "BOWL", color: "#1E40AF" },
};

export const getPlayerRole = (p: { role?: PlayerRole } | undefined | null): PlayerRole =>
  (p && p.role) || "BAT";

export const isPlayerRole = (v: unknown): v is PlayerRole =>
  v === "BAT" || v === "BOWL";

export type { PlayerRole };
export type { player };
