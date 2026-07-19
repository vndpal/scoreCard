import { playerStats } from "@/types/playerStats";
import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";

/**
 * Rebuilds every ball-derived counter in playerMatchStats by replaying the
 * ball-by-ball data (the source of truth). Used on undo instead of
 * decrementing the stored figures, so the stats can never drift from the
 * recorded balls no matter how undos interleave with writes/reloads.
 *
 * Identity and non-ball fields (playerId, name, team, retired, average) are
 * preserved from baseStats. Innings arrays are newest-first at both levels,
 * matching how they are held in state.
 */
export const rebuildPlayerMatchStats = (
  baseStats: playerStats[],
  team1Score: scorePerInning,
  team2Score: scorePerInning
): playerStats[] => {
  const rebuilt: playerStats[] = baseStats.map((stat) => ({
    ...stat,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    wickets: 0,
    overs: 0,
    ballsBowled: 0,
    extras: 0,
    runsConceded: 0,
    foursConceded: 0,
    sixesConceded: 0,
    maidens: 0,
    bowlingEconomy: 0,
    dotBalls: 0,
    catches: 0,
    stumpings: 0,
    runOuts: 0,
  }));

  const byId = new Map<string, playerStats>(
    rebuilt.map((stat) => [stat.playerId, stat])
  );

  const applyBall = (ball: scorePerBall) => {
    const isExtra = ball.isNoBall || ball.isWideBall;

    const batter = ball.strikerBatter
      ? byId.get(ball.strikerBatter.id)
      : undefined;
    if (batter) {
      batter.runs += ball.run;
      batter.ballsFaced += isExtra ? 0 : 1;
      batter.fours += ball.run == 4 ? 1 : 0;
      batter.sixes += ball.run == 6 ? 1 : 0;
      batter.strikeRate =
        batter.ballsFaced > 0 ? (batter.runs / batter.ballsFaced) * 100 : 0;
    }

    const bowler = ball.bowler ? byId.get(ball.bowler.id) : undefined;
    if (bowler) {
      bowler.runsConceded += ball.totalRun;
      bowler.ballsBowled += isExtra ? 0 : 1;
      if (ball.isOverEnd) {
        bowler.ballsBowled = 0;
        bowler.overs += 1;
      }
      bowler.extras += ball.extra;
      bowler.foursConceded += ball.run == 4 ? 1 : 0;
      bowler.sixesConceded += ball.run == 6 ? 1 : 0;
      // Run-outs are not credited to the bowler; every other dismissal is.
      bowler.wickets +=
        ball.isWicket && ball.outType !== "runout" ? 1 : 0;
      bowler.bowlingEconomy =
        bowler.runsConceded /
        (bowler.ballsBowled > 0 ? bowler.ballsBowled / 6 : 1);
      bowler.dotBalls += ball.run == 0 ? 1 : 0;
    }

    if (ball.isWicket) {
      // The dismissed batter may be the non-striker on a run-out; legacy
      // balls recorded before outBatterId existed fall back to the striker.
      const outId = ball.outBatterId || ball.strikerBatter?.id;
      const outPlayer = outId ? byId.get(outId) : undefined;
      if (outPlayer) {
        outPlayer.isOut = true;
      }
    }

    if (ball.isWicket && ball.fielder?.id) {
      const fielder = byId.get(ball.fielder.id);
      if (fielder) {
        if (ball.outType == "caught") {
          fielder.catches += 1;
        } else if (ball.outType == "stumped") {
          fielder.stumpings += 1;
        } else if (ball.outType == "runout") {
          fielder.runOuts += 1;
        }
      }
    }
  };

  const replayInning = (inning: scorePerInning) => {
    for (let overIdx = inning.length - 1; overIdx >= 0; overIdx--) {
      const over = inning[overIdx];
      for (let ballIdx = over.length - 1; ballIdx >= 0; ballIdx--) {
        applyBall(over[ballIdx]);
      }
    }
  };

  replayInning(team1Score);
  replayInning(team2Score);

  return rebuilt;
};

/**
 * Returns a copy of the innings with its newest ball ([0][0]) removed,
 * dropping the over row entirely if that was its only ball. Does not mutate
 * the input (state arrays are passed in directly).
 */
export const removeNewestBall = (inning: scorePerInning): scorePerInning => {
  if (inning.length == 0 || inning[0].length == 0) {
    return inning;
  }
  const remainingOverBalls = inning[0].slice(1);
  return remainingOverBalls.length > 0
    ? [remainingOverBalls, ...inning.slice(1)]
    : inning.slice(1);
};
