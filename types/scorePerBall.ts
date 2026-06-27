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
  // Dismissal details, stored against each ball the same way bowler/striker are.
  // Optional for backward compatibility with balls recorded before this feature.
  outType?: "bowled" | "caught" | "stumped" | "runout";
  outBatterId?: string;
  fielder?: player;
};

export type { scorePerBall };
