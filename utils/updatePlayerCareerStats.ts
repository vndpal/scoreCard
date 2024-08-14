import { getItem, setItem } from "./asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { playerCareerStats } from "@/types/playerCareerStats";
import { playerStats } from "@/types/playerStats";

export const updatePlayerCareerStats = async (
  playerMatchStats: playerStats[]
) => {
  const playerCareerStats: playerCareerStats[] = await getItem(
    STORAGE_ITEMS.PLAYER_CAREER_STATS
  );

  if (playerCareerStats && playerCareerStats.length > 0) {
    playerMatchStats.forEach(async (playerMatchStat: playerStats) => {
      const playerCareerStatIndex = playerCareerStats.findIndex(
        (playerCareerStat: playerCareerStats) =>
          playerCareerStat.playerId == playerMatchStat.playerId
      );
      if (playerCareerStatIndex > -1) {
        playerCareerStats[playerCareerStatIndex].matches += 1;
        playerCareerStats[playerCareerStatIndex].runs += playerMatchStat.runs;
        playerCareerStats[playerCareerStatIndex].ballsFaced +=
          playerMatchStat.ballsFaced;
        playerCareerStats[playerCareerStatIndex].fours += playerMatchStat.fours;
        playerCareerStats[playerCareerStatIndex].sixes += playerMatchStat.sixes;
        playerCareerStats[playerCareerStatIndex].notOuts +=
          playerMatchStat.isOut ? 0 : 1;
        playerCareerStats[playerCareerStatIndex].strikeRate =
          (playerCareerStats[playerCareerStatIndex].runs /
            playerCareerStats[playerCareerStatIndex].ballsFaced) *
          100;

        const totalInnings =
          playerCareerStats[playerCareerStatIndex].matches -
          playerCareerStats[playerCareerStatIndex].notOuts;
        playerCareerStats[playerCareerStatIndex].average =
          playerCareerStats[playerCareerStatIndex].runs /
          (totalInnings === 0 ? 1 : totalInnings);

        playerCareerStats[playerCareerStatIndex].wickets +=
          playerMatchStat.wickets;
        playerCareerStats[playerCareerStatIndex].overs += playerMatchStat.overs;
        playerCareerStats[playerCareerStatIndex].ballsBowled +=
          playerMatchStat.ballsBowled;
        if (playerCareerStats[playerCareerStatIndex].ballsBowled > 5) {
          playerCareerStats[playerCareerStatIndex].overs += 1;
          playerCareerStats[playerCareerStatIndex].ballsBowled =
            playerCareerStats[playerCareerStatIndex].ballsBowled % 6;
        }
        playerCareerStats[playerCareerStatIndex].extras +=
          playerMatchStat.extras;
        playerCareerStats[playerCareerStatIndex].runsConceded +=
          playerMatchStat.runsConceded;
        playerCareerStats[playerCareerStatIndex].foursConceded +=
          playerMatchStat.foursConceded;
        playerCareerStats[playerCareerStatIndex].sixesConceded +=
          playerMatchStat.sixesConceded;
        playerCareerStats[playerCareerStatIndex].maidens +=
          playerMatchStat.maidens;
        playerCareerStats[playerCareerStatIndex].bowlingEconomy =
          playerCareerStats[playerCareerStatIndex].runsConceded /
          playerCareerStats[playerCareerStatIndex].overs;
      }
    });
    await setItem(STORAGE_ITEMS.PLAYER_CAREER_STATS, playerCareerStats);
  }
};
