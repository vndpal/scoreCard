import { scorePerOver } from "./scorePerOver";

type MatchScoresData = {
  matchId: string;
  teamId: string;
  inningNumber: number;
  overNumber: number;
  overSummary: scorePerOver;
  clubId: string;
  tournamentId: string;
};

export type { MatchScoresData };
