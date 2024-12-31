import { getItem, setItem } from "./asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { playerCareerStats } from "@/types/playerCareerStats";
import { playerStats } from "@/types/playerStats";

export const updatePlayerCareerStats = async (
  playerMatchStats: playerStats[]
) => {
  const updatePromises = playerMatchStats.map(async (playerMatchStat) => {
    const playerCareerStat = await PlayerCareerStats.getByPlayerId(
      playerMatchStat.playerId
    );

    if (playerCareerStat) {
      const careerStat = playerCareerStat;

      careerStat.matches += 1;
      careerStat.runs += playerMatchStat.runs;
      careerStat.ballsFaced += playerMatchStat.ballsFaced;
      careerStat.fours += playerMatchStat.fours;
      careerStat.sixes += playerMatchStat.sixes;
      careerStat.notOuts +=
        playerMatchStat.ballsFaced == 0 && playerMatchStat.runs == 0
          ? 0
          : playerMatchStat.isOut
          ? 0
          : 1;

      careerStat.strikeRate = (careerStat.runs / careerStat.ballsFaced) * 100;

      careerStat.innings += playerMatchStat.ballsFaced > 0 ? 1 : 0;

      const totalInnings =
        careerStat.innings > 0 ? careerStat.innings - careerStat.notOuts : 0;
      careerStat.average =
        careerStat.runs / (totalInnings === 0 ? 1 : totalInnings);

      careerStat.wickets += playerMatchStat.wickets;
      careerStat.overs += playerMatchStat.overs;
      careerStat.ballsBowled += playerMatchStat.ballsBowled;

      if (careerStat.ballsBowled > 5) {
        careerStat.overs += 1;
        careerStat.ballsBowled = careerStat.ballsBowled % 6;
      }

      careerStat.extras += playerMatchStat.extras;
      careerStat.runsConceded += playerMatchStat.runsConceded;
      careerStat.foursConceded += playerMatchStat.foursConceded;
      careerStat.sixesConceded += playerMatchStat.sixesConceded;
      careerStat.maidens += playerMatchStat.maidens;

      careerStat.bowlingEconomy = calculateBowlingEconomy(
        careerStat.overs,
        careerStat.ballsBowled,
        careerStat.runsConceded
      );

      careerStat.dotBalls += playerMatchStat.dotBalls;
      return PlayerCareerStats.update(careerStat.playerId, careerStat);
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
