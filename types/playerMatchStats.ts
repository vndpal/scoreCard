import { playerStats } from "./playerStats";

type playerMatchStats = {
  id?: string;
  matchId: string;
  playerMatchStats: playerStats[];
  timestamp: number;
};

export type { playerMatchStats };
