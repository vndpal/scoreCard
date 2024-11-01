import { getItem, setItem } from "./asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { playerCareerStats } from "@/types/playerCareerStats";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";

export const undoPlayerCareerStats = async (matchId: string) => {
  const playerCareerStats: playerCareerStats[] = await getItem(
    STORAGE_ITEMS.PLAYER_CAREER_STATS
  );

  let playerMatchStats: playerStats[] = [];
  const playerMatchStatsFromDb = await getItem(
    STORAGE_ITEMS.PLAYER_MATCH_STATS
  );
  if (playerMatchStatsFromDb) {
    const playerMatchStatsIndex = playerMatchStatsFromDb.findIndex(
      (playerStats: playerMatchStats) => playerStats.matchId == matchId
    );
    if (playerMatchStatsIndex > -1) {
      playerMatchStats =
        playerMatchStatsFromDb[playerMatchStatsIndex].playerMatchStats;
    }
  }

  if (playerCareerStats && playerCareerStats.length > 0) {
    playerMatchStats.forEach(async (playerMatchStat: playerStats) => {
      const playerCareerStatIndex = playerCareerStats.findIndex(
        (playerCareerStat: playerCareerStats) =>
          playerCareerStat.playerId == playerMatchStat.playerId
      );

      if (playerCareerStatIndex > -1) {
        const careerStat = playerCareerStats[playerCareerStatIndex];

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
      }
    });

    await setItem(STORAGE_ITEMS.PLAYER_CAREER_STATS, playerCareerStats);
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
