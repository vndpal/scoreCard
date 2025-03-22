import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { getItem, setItem } from "./asyncStorage";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { PlayerTournamentStats } from "@/firebase/models/PlayerTournamentStats";
import { Match } from "@/firebase/models/Match";

export const undoPlayerTournamentStats = async (matchId: string) => {
  let matchStatsForPlayers = await PlayerMatchStats.getByMatchId(matchId);
  const lastMatch = await Match.getById(matchId);
  const teamWon =
    lastMatch?.status === "completed"
      ? lastMatch?.winner === "team1"
        ? lastMatch?.team1
        : lastMatch?.team2
      : "";
  let playerMatchStats: playerStats[] = matchStatsForPlayers
    ? matchStatsForPlayers.playerMatchStats
    : [];

  for (const playerMatchStat of playerMatchStats) {
    const playerTournamentStat =
      await PlayerTournamentStats.getByPlayerIdAndTournamentId(
        playerMatchStat.playerId,
        lastMatch?.tournamentId || ""
      );
    if (playerTournamentStat) {
      const tournamentStat = playerTournamentStat;

      tournamentStat.matches -= 1;
      tournamentStat.matchesWon -= teamWon === playerMatchStat.team ? 1 : 0;
      tournamentStat.runs -= playerMatchStat.runs;
      tournamentStat.ballsFaced -= playerMatchStat.ballsFaced;
      tournamentStat.fours -= playerMatchStat.fours;
      tournamentStat.sixes -= playerMatchStat.sixes;
      tournamentStat.notOuts -=
        playerMatchStat.ballsFaced == 0 && playerMatchStat.runs == 0
          ? 0
          : playerMatchStat.isOut
          ? 0
          : 1;

      tournamentStat.strikeRate =
        (tournamentStat.runs / tournamentStat.ballsFaced) * 100;

      const totalInnings = tournamentStat.matches - tournamentStat.notOuts;
      tournamentStat.average =
        tournamentStat.runs / (totalInnings === 0 ? 1 : totalInnings);

      tournamentStat.innings -= playerMatchStat.ballsFaced > 0 ? 1 : 0;

      tournamentStat.wickets -= playerMatchStat.wickets;
      tournamentStat.overs -= playerMatchStat.overs;
      tournamentStat.ballsBowled -= playerMatchStat.ballsBowled;

      if (tournamentStat.ballsBowled > 5) {
        tournamentStat.overs -= 1;
        tournamentStat.ballsBowled = tournamentStat.ballsBowled % 6;
      }

      tournamentStat.extras -= playerMatchStat.extras;
      tournamentStat.runsConceded -= playerMatchStat.runsConceded;
      tournamentStat.foursConceded -= playerMatchStat.foursConceded;
      tournamentStat.sixesConceded -= playerMatchStat.sixesConceded;
      tournamentStat.maidens -= playerMatchStat.maidens;

      tournamentStat.bowlingEconomy = calculateBowlingEconomy(
        tournamentStat.overs,
        tournamentStat.ballsBowled,
        tournamentStat.runsConceded
      );

      tournamentStat.dotBalls -= playerMatchStat.dotBalls;
      await PlayerTournamentStats.update(
        tournamentStat.id || "",
        tournamentStat
      );
    }
  }
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
