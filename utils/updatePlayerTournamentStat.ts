import { PlayerTournamentStats } from "@/firebase/models/PlayerTournamentStats";
import { playerStats } from "@/types/playerStats";

export const updatePlayerTournamentStats = async (
  playerMatchStats: playerStats[],
  tournamentId: string,
  clubId: string
) => {
  const updatePromises = playerMatchStats.map(async (playerMatchStat) => {
    const playerTournamentStat =
      await PlayerTournamentStats.getByPlayerIdAndTournamentId(
        playerMatchStat.playerId,
        tournamentId
      );

    if (playerTournamentStat) {
      const tournamentStat = playerTournamentStat;

      tournamentStat.matches += 1;
      tournamentStat.runs += playerMatchStat.runs;
      tournamentStat.ballsFaced += playerMatchStat.ballsFaced;
      tournamentStat.fours += playerMatchStat.fours;
      tournamentStat.sixes += playerMatchStat.sixes;
      tournamentStat.notOuts +=
        playerMatchStat.ballsFaced == 0 && playerMatchStat.runs == 0
          ? 0
          : playerMatchStat.isOut
          ? 0
          : 1;

      tournamentStat.strikeRate =
        (tournamentStat.runs / tournamentStat.ballsFaced) * 100;

      tournamentStat.innings += playerMatchStat.ballsFaced > 0 ? 1 : 0;

      const totalInnings =
        tournamentStat.innings > 0
          ? tournamentStat.innings - tournamentStat.notOuts
          : 0;
      tournamentStat.average =
        tournamentStat.runs / (totalInnings === 0 ? 1 : totalInnings);

      tournamentStat.wickets += playerMatchStat.wickets;
      tournamentStat.overs += playerMatchStat.overs;
      tournamentStat.ballsBowled += playerMatchStat.ballsBowled;

      if (tournamentStat.ballsBowled > 5) {
        tournamentStat.overs += 1;
        tournamentStat.ballsBowled = tournamentStat.ballsBowled % 6;
      }

      tournamentStat.extras += playerMatchStat.extras;
      tournamentStat.runsConceded += playerMatchStat.runsConceded;
      tournamentStat.foursConceded += playerMatchStat.foursConceded;
      tournamentStat.sixesConceded += playerMatchStat.sixesConceded;
      tournamentStat.maidens += playerMatchStat.maidens;

      tournamentStat.bowlingEconomy = calculateBowlingEconomy(
        tournamentStat.overs,
        tournamentStat.ballsBowled,
        tournamentStat.runsConceded
      );

      tournamentStat.dotBalls += playerMatchStat.dotBalls;
      return PlayerTournamentStats.update(
        playerTournamentStat.id || "",
        tournamentStat
      );
    } else {
      const tournamentStat = await PlayerTournamentStats.create({
        playerId: playerMatchStat.playerId,
        tournamentId: tournamentId,
        matches: 1,
        innings: playerMatchStat.ballsFaced > 0 ? 1 : 0,
        notOuts:
          playerMatchStat.ballsFaced == 0 && playerMatchStat.runs == 0
            ? 0
            : playerMatchStat.isOut
            ? 0
            : 1,
        runs: playerMatchStat.runs,
        ballsFaced: playerMatchStat.ballsFaced,
        fours: playerMatchStat.fours,
        sixes: playerMatchStat.sixes,
        strikeRate: (playerMatchStat.runs / playerMatchStat.ballsFaced) * 100,
        average: playerMatchStat.runs,
        wickets: playerMatchStat.wickets,
        overs: playerMatchStat.overs,
        ballsBowled: playerMatchStat.ballsBowled,
        extras: playerMatchStat.extras,
        runsConceded: playerMatchStat.runsConceded,
        foursConceded: playerMatchStat.foursConceded,
        sixesConceded: playerMatchStat.sixesConceded,
        maidens: playerMatchStat.maidens,
        bowlingEconomy: calculateBowlingEconomy(
          playerMatchStat.overs,
          playerMatchStat.ballsBowled,
          playerMatchStat.runsConceded
        ),
        dotBalls: playerMatchStat.dotBalls,
        clubId: clubId,
      });
      return tournamentStat;
    }
  });
  await Promise.all(updatePromises.filter(Boolean));
};

const calculateBowlingEconomy = (
  overs: number,
  balls: number,
  runsConceded: number
): number => {
  const oversLeft = overs + balls / 6;
  const ecom = parseFloat((runsConceded / oversLeft).toFixed(2));
  return ecom;
};
