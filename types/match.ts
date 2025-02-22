import { matchResult } from "./matchResult";
import { scorePerInning } from "./scorePerInnig";
import { currentTotalScore } from "./currentTotalScore";
import { Timestamp } from "@react-native-firebase/firestore";

type match = {
  matchId: string;
  team1: string;
  team2: string;
  team1Fullname: string;
  team2Fullname: string;
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
  clubId: string;
  tournamentId: string;
};

export type { match };
