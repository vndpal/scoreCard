type playerStats = {
  playerId: string;
  team: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  average: number;
  isOut: boolean;
  wickets: number;
  overs: number;
  ballsBowled: number;
  extras: number;
  runsConceded: number;
  maidens: number;
  bowlingEconomy: number;
};

export type { playerStats };
