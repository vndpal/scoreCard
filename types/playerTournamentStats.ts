type playerTournamentStats = {
  id?: string;
  tournamentId: string;
  playerId: string;
  matches: number;
  matchesWon: number;
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
  clubId: string;
};

export type { playerTournamentStats };
