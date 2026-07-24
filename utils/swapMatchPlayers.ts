import { Match } from "@/firebase/models/Match";
import { MatchScore } from "@/firebase/models/MatchScores";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { PlayerTournamentStats } from "@/firebase/models/PlayerTournamentStats";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { playerStats } from "@/types/playerStats";
import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";
import { rebuildPlayerMatchStats } from "./rebuildPlayerMatchStats";
import { computeManOfTheMatch } from "./updateManOfTheMatch";
import {
  applyDelta,
  ballNumberOf,
  BallDoc,
  swapBallRefs,
  SwapMode,
} from "./swapMatchPlayers.core";

export type { SwapMode };

/**
 * Rewrites a *completed* match so two same-team players are swapped, then
 * rebuilds every derived figure from the ball-by-ball source of truth:
 *  - matchScores balls (the batting refs for a batsman swap, or the bowler ref
 *    for a bowler swap — including the bowler's name)
 *  - playerMatchStats (rebuilt from the swapped balls)
 *  - playerTournamentStats + playerCareerStats (adjusted for A and B only)
 *  - match.manOfTheMatch (recomputed)
 *
 * Team totals, winner and tournamentStandings are intentionally untouched: a
 * swap within one team changes nothing at team level.
 *
 * Fielding/catches are never moved — a batsman swap only touches batting refs
 * and a bowler swap only touches the bowler ref (see the plan's known-limitation
 * note about caught & bowled).
 */
export const swapMatchPlayers = async (
  matchId: string,
  aId: string,
  bId: string,
  mode: SwapMode
): Promise<void> => {
  if (!matchId) throw new Error("Missing match id.");
  if (aId === bId) throw new Error("Pick two different players.");

  const [match, matchStats, inning1, inning2] = await Promise.all([
    Match.getById(matchId),
    PlayerMatchStats.getByMatchId(matchId),
    MatchScore.getByMatchIdInningNumber(matchId, 1),
    MatchScore.getByMatchIdInningNumber(matchId, 2),
  ]);

  if (!match) throw new Error("Match not found.");
  if (match.status !== "completed") {
    throw new Error("Only completed matches can be edited.");
  }
  if (!matchStats) throw new Error("Match scorecard not found.");

  const oldStats = matchStats.playerMatchStats;
  const statA = oldStats.find((s) => s.playerId === aId);
  const statB = oldStats.find((s) => s.playerId === bId);
  if (!statA || !statB) {
    throw new Error("Both players must be in this match's scorecard.");
  }
  if (statA.team !== statB.team) {
    throw new Error("Players must be from the same team.");
  }

  const aName = statA.name;
  const bName = statB.name;

  // --- 1. Swap the relevant refs in the balls (in memory) + collect writes ---
  const ballWrites: Promise<void>[] = [];

  const processOvers = (overs: MatchScore[] | null): scorePerInning => {
    if (!overs) return [];
    return overs.map((over) => {
      const swappedBalls = (over.overSummary as BallDoc[]).map((original) => {
        const ball: BallDoc = { ...original };
        const write = swapBallRefs(ball, mode, aId, bId, aName, bName);
        if (write) {
          const ballNumber = ballNumberOf(ball.id);
          if (ballNumber > 0) {
            ballWrites.push(
              MatchScore.updateBallScore(
                matchId,
                over.teamId,
                over.inningNumber,
                over.overNumber,
                ballNumber,
                write
              )
            );
          }
        }
        return ball as scorePerBall;
      });
      return swappedBalls;
    });
  };

  const swappedInning1 = processOvers(inning1);
  const swappedInning2 = processOvers(inning2);

  await Promise.all(ballWrites);

  // --- 2. Rebuild playerMatchStats from the swapped balls ---
  const newStats = rebuildPlayerMatchStats(
    oldStats,
    swappedInning1,
    swappedInning2
  );
  await PlayerMatchStats.update(matchId, { playerMatchStats: newStats });

  // --- 3. Adjust tournament + career aggregates for A and B only ---
  await adjustAggregatesForSwap(
    match.tournamentId,
    oldStats,
    newStats,
    [aId, bId]
  );

  // --- 4. Recompute Man of the Match from the rebuilt (in-memory) stats ---
  const manOfTheMatch = computeManOfTheMatch(newStats);
  if (manOfTheMatch) {
    await Match.update(matchId, { manOfTheMatch });
  }
};

const adjustAggregatesForSwap = async (
  tournamentId: string,
  oldStats: playerStats[],
  newStats: playerStats[],
  ids: string[]
): Promise<void> => {
  for (const pid of ids) {
    const oldM = oldStats.find((s) => s.playerId === pid);
    const newM = newStats.find((s) => s.playerId === pid);
    if (!oldM || !newM) continue;

    if (tournamentId) {
      const tStat = await PlayerTournamentStats.getByPlayerIdAndTournamentId(
        pid,
        tournamentId
      );
      if (tStat) {
        applyDelta(tStat as any, oldM, newM);
        await PlayerTournamentStats.update(tStat.id || "", tStat);
      }
    }

    const cStat = await PlayerCareerStats.getByPlayerId(pid);
    if (cStat) {
      applyDelta(cStat as any, oldM, newM);
      await PlayerCareerStats.update(cStat.playerId, cStat);
    }
  }
};
