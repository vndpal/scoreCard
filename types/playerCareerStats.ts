type playerCareerStats = {
  id?: string;
  playerId: string;
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  average: number;
  notOuts: number;
  wickets: number;
  overs: number;
  ballsBowled: number;
  extras: number;
  runsConceded: number;
  foursConceded: number;
  sixesConceded: number;
  maidens: number;
  bowlingEconomy: number;
  dotBalls: number;
};

export type { playerCareerStats };
