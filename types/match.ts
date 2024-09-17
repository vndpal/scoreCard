import { matchResult } from "./matchResult";
import { scorePerInning } from "./scorePerInnig";

type match = {
  matchId: string;
  team1: string;
  team2: string;
  team1score: scorePerInning;
  team2score: scorePerInning;
  tossWin: "team1" | "team2";
  choose: "batting" | "bowling";
  winner?: "team1" | "team2";
  overs: number;
  status: matchResult;
  isFirstInning: boolean;
  wickets?: number;
  startDateTime: string;
  endDateTime: string;
  quickMatch: boolean;
  manOfTheMatch: string;
};

export type { match };
