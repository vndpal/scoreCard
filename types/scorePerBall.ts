import { player } from "./player";

type scorePerBall = {
  run: number;
  extra: number;
  totalRun: number;
  isWicket: boolean;
  isNoBall: boolean;
  isWideBall: boolean;
  isOverEnd: boolean;
  strikerBatter: player | undefined;
  nonStrikerBatter: player | undefined;
  bowler: player | undefined;
};

export type { scorePerBall };
