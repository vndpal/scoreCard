import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { getItem, setItem } from "./asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { playerCareerStats } from "@/types/playerCareerStats";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";

export const undoPlayerCareerStats = async (matchId: string) => {
  let matchStatsForPlayers = await PlayerMatchStats.getByMatchId(matchId);
  let playerMatchStats: playerStats[] = matchStatsForPlayers
    ? matchStatsForPlayers.playerMatchStats
    : [];

  for (const playerMatchStat of playerMatchStats) {
    const playerCareerStat = await PlayerCareerStats.getByPlayerId(
      playerMatchStat.playerId
    );
    if (playerCareerStat) {
      const careerStat = playerCareerStat;

      careerStat.matches -= 1;
      careerStat.runs -= playerMatchStat.runs;
      careerStat.ballsFaced -= playerMatchStat.ballsFaced;
      careerStat.fours -= playerMatchStat.fours;
      careerStat.sixes -= playerMatchStat.sixes;
      careerStat.notOuts -=
        playerMatchStat.ballsFaced == 0 && playerMatchStat.runs == 0
          ? 0
          : playerMatchStat.isOut
          ? 0
          : 1;

      careerStat.strikeRate = (careerStat.runs / careerStat.ballsFaced) * 100;

      const totalInnings = careerStat.matches - careerStat.notOuts;
      careerStat.average =
        careerStat.runs / (totalInnings === 0 ? 1 : totalInnings);

      careerStat.innings -= playerMatchStat.ballsFaced > 0 ? 1 : 0;

      careerStat.wickets -= playerMatchStat.wickets;
      careerStat.overs -= playerMatchStat.overs;
      careerStat.ballsBowled -= playerMatchStat.ballsBowled;

      if (careerStat.ballsBowled > 5) {
        careerStat.overs -= 1;
        careerStat.ballsBowled = careerStat.ballsBowled % 6;
      }

      careerStat.extras -= playerMatchStat.extras;
      careerStat.runsConceded -= playerMatchStat.runsConceded;
      careerStat.foursConceded -= playerMatchStat.foursConceded;
      careerStat.sixesConceded -= playerMatchStat.sixesConceded;
      careerStat.maidens -= playerMatchStat.maidens;

      careerStat.bowlingEconomy = calculateBowlingEconomy(
        careerStat.overs,
        careerStat.ballsBowled,
        careerStat.runsConceded
      );

      careerStat.dotBalls -= playerMatchStat.dotBalls;
      await PlayerCareerStats.update(careerStat.playerId, careerStat);
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
