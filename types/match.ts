import { matchResult } from "./matchResult";
import { scorePerInning } from "./scorePerInnig";
import { currentTotalScore } from "./currentTotalScore";
import { Timestamp } from "firebase/firestore";

type match = {
  matchId: string;
  team1: string;
  team2: string;
  // team1score: scorePerInning;
  // team2score: scorePerInning;
  tossWin: "team1" | "team2";
  choose: "batting" | "bowling";
  winner?: "team1" | "team2";
  overs: number;
  status: matchResult;
  isFirstInning: boolean;
  wickets?: number;
  startDateTime: Timestamp;
  endDateTime?: Timestamp;
  quickMatch: boolean;
  manOfTheMatch: string;
  currentScore: {
    team1: currentTotalScore;
    team2: currentTotalScore;
  };
};

export type { match };
