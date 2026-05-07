type PlayerRole = "BAT" | "BOWL";

type player = {
  id: string;
  name: string;
  clubId: string;
  role?: PlayerRole;
};

export type { player, PlayerRole };
