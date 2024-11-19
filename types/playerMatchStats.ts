import { playerStats } from "./playerStats";

type playerMatchStats = {
  id?: string;
  matchId: string;
  playerMatchStats: playerStats[];
};

export type { playerMatchStats };
