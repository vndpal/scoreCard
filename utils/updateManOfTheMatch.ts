import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { getItem, setItem } from "./asyncStorage";
import { match } from "@/types/match";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";

export const updateManOfTheMatch = async (matchId: string) => {
  const matches = await getItem(STORAGE_ITEMS.MATCHES);
  const match: match = matches.find(
    (match: match) => match.matchId === matchId
  );
  const playerMatchStats = await getItem(STORAGE_ITEMS.PLAYER_MATCH_STATS);
  const playerMatchStat: playerMatchStats = playerMatchStats.find(
    (playerMatchStat: playerMatchStats) => playerMatchStat.matchId === matchId
  );
  let maxPoints = 0;
  let manOfTheMatch = "";
  if (playerMatchStat && playerMatchStat.playerMatchStats.length > 0) {
    playerMatchStat.playerMatchStats.forEach((playerStats: playerStats) => {
      const points = calculateMathPoints(playerStats);
      if (points > maxPoints) {
        maxPoints = points;
        manOfTheMatch = playerStats.playerId;
      }
    });
    match.manOfTheMatch = manOfTheMatch;
    await setItem(STORAGE_ITEMS.MATCHES, matches);
  }
};

const calculateMathPoints = (stats: playerStats): number => {
  let points = 0;

  // Batting points
  points +=
    (stats.runs || 0) * 1.2 +
    (stats.fours || 0) * 1.5 +
    (stats.sixes || 0) * 3 +
    (stats.ballsFaced || 0) * 0.5;
  points += stats.isOut === false ? 5 : 0;

  // Strike rate points
  if (stats.strikeRate && stats.strikeRate > 0) {
    if (stats.strikeRate < 100) points -= 3;
    else if (stats.strikeRate > 300) points += 5;
    else if (stats.strikeRate > 250) points += 4;
    else if (stats.strikeRate > 200) points += 3;
    else if (stats.strikeRate > 150) points += 2;
  }

  // Bowling points
  points += (stats.wickets || 0) * 8 + (stats.maidens || 0) * 6;
  points -=
    (stats.runsConceded || 0) * 0.4 +
    (stats.sixesConceded || 0) * 1.5 +
    (stats.foursConceded || 0) * 0.5;

  // Economy rate points
  if (stats.bowlingEconomy && stats.bowlingEconomy > 0) {
    if (stats.bowlingEconomy > 20) points -= 4;
    else if (stats.bowlingEconomy > 15) points -= 3;
    else if (stats.bowlingEconomy > 10) points -= 1;
    else if (stats.bowlingEconomy < 6) points += 5;
    else if (stats.bowlingEconomy < 8) points += 3;
    else if (stats.bowlingEconomy < 10) points += 1;
  }

  // Dot balls points
  points += (stats.dotBalls || 0) * 1.5;

  // Extras points
  points -= (stats.extras || 0) * 1.5;
  return points;
};
