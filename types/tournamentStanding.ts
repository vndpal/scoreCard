// One row per team per tournament. Materialized from the tournament's decisive
// matches (see utils/tournamentStandings.ts) and refreshed whenever a match is
// completed or undone (see utils/recomputeTournamentStandings.ts).
type tournamentStanding = {
  id?: string; // deterministic: `${tournamentId}_${teamInitials}`
  tournamentId: string;
  clubId: string;
  // Immutable join key — the teamInitials stored in match.team1 / match.team2.
  teamInitials: string;
  // Latest display name for the team (from the most recent match).
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  // NRR inputs, kept for transparency / analytics. Overs are true decimals
  // (overs + balls/6), never cricket .balls notation.
  totalRunsScored: number;
  totalOversFaced: number;
  totalRunsConceded: number;
  totalOversBowled: number;
  nrr: number;
};

export type { tournamentStanding };
