import { currentTotalScore } from "@/types/currentTotalScore";
import { match } from "@/types/match";

export const getMatchResultText = (
  match: match,
  finalFirstInningsScore: currentTotalScore,
  finalSecondInningsScore: currentTotalScore
): string => {
  if (match.winner === "team1") {
    return `${match.team1Fullname} won by ${
      finalFirstInningsScore.totalRuns - finalSecondInningsScore.totalRuns
    } runs`;
  }

  const remainingWickets =
    match.wickets! - finalSecondInningsScore.totalWickets;
  const remainingBalls =
    match.overs * 6 -
    (finalSecondInningsScore.totalOvers * 6 +
      finalSecondInningsScore.totalBalls);

  return `${match.team2Fullname} won by ${remainingWickets} wickets & ${remainingBalls} balls left`;
};
