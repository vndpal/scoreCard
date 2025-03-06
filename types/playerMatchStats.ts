import { playerStats } from "./playerStats";

type playerMatchStats = {
  id?: string;
  matchId: string;
  tournamentId: string;
  playerMatchStats: playerStats[];
  timestamp: number;
};

export type { playerMatchStats };
