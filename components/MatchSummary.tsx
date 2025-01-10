import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  VirtualizedList,
  ScrollView,
} from "react-native";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { player } from "@/types/player"; // Import the player type
import { getItem } from "@/utils/asyncStorage";
import { useTheme } from "@/context/ThemeContext";
import { Player } from "@/firebase/models/Player";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import Table from "./ui/table";
import { Divider } from "react-native-elements";

const MatchSummary = () => {
  const { matchId, team1, team2 } = useLocalSearchParams();
  const [battingRecordsTeamA, setBattingRecordsTeamA] = useState<playerStats[]>(
    []
  );
  const [bowlingRecordsTeamA, setBowlingRecordsTeamA] = useState<playerStats[]>(
    []
  );
  const [battingRecordsTeamB, setBattingRecordsTeamB] = useState<playerStats[]>(
    []
  );
  const [bowlingRecordsTeamB, setBowlingRecordsTeamB] = useState<playerStats[]>(
    []
  );
  const [playersMap, setPlayersMap] = useState<Map<string, string>>(new Map());

  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const battingColumns = [
    { key: "playerId", label: "Player" },
    { key: "runs", label: "Runs" },
    { key: "ballsFaced", label: "Balls" },
    { key: "fours", label: "4s" },
    { key: "sixes", label: "6s" },
    { key: "strikeRate", label: "SR" },
  ];

  const bowlingColumns = [
    { key: "playerId", label: "Player" },
    { key: "overs", label: "Overs" },
    { key: "wickets", label: "Wickets" },
    { key: "runsConceded", label: "Runs" },
    { key: "extras", label: "Extras" },
  ];

  useEffect(() => {
    (async () => {
      const players = await Player.getAll();
      // Filter and sort records based on match and team
      const matchStats = await PlayerMatchStats.getByMatchId(matchId as string);
      if (matchStats && players) {
        // Create a map from player IDs to player names
        const playersMap = new Map<string, string>();
        players.forEach((p: player) => {
          playersMap.set(p.id.toString(), p.name);
        });
        setPlayersMap(playersMap);

        if (matchStats) {
          const sortByRuns = (a: playerStats, b: playerStats) =>
            b.runs - a.runs;
          const sortByWickets = (a: playerStats, b: playerStats) =>
            b.wickets - a.wickets;

          setBattingRecordsTeamA(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team1)
              .sort(sortByRuns)
          );
          setBowlingRecordsTeamA(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team1)
              .sort(sortByWickets)
          );
          setBattingRecordsTeamB(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team2)
              .sort(sortByRuns)
          );
          setBowlingRecordsTeamB(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team2)
              .sort(sortByWickets)
          );
        }
      }
    })();
  }, [matchId]);

  return (
    <ScrollView style={[styles.container, themeStyles.container]}>
      <Table
        columns={battingColumns}
        data={battingRecordsTeamA.map((x) => ({
          playerId: playersMap.get(x.playerId) || x.playerId,
          runs: x.runs,
          ballsFaced: x.ballsFaced,
          fours: x.fours,
          sixes: x.sixes,
          strikeRate: x.strikeRate.toFixed(2),
        }))}
        title={`${team1} - Batting`}
      />
      <Divider style={styles.divider} />
      <Table
        columns={bowlingColumns}
        data={bowlingRecordsTeamA.map((x) => ({
          playerId: playersMap.get(x.playerId) || x.playerId,
          overs: x.ballsBowled > 0 ? `${x.overs}.${x.ballsBowled}` : x.overs,
          wickets: x.wickets,
          runsConceded: x.runsConceded,
          extras: x.extras,
        }))}
        title={`${team1} - Bowling`}
      />
      <Divider style={styles.divider} />
      <Table
        columns={battingColumns}
        data={battingRecordsTeamB.map((x) => ({
          playerId: playersMap.get(x.playerId) || x.playerId,
          runs: x.runs,
          ballsFaced: x.ballsFaced,
          fours: x.fours,
          sixes: x.sixes,
          strikeRate: x.strikeRate.toFixed(2),
        }))}
        title={`${team2} - Batting`}
      />
      <Divider style={styles.divider} />
      <Table
        columns={bowlingColumns}
        data={bowlingRecordsTeamB.map((x) => ({
          playerId: playersMap.get(x.playerId) || x.playerId,
          overs: x.ballsBowled > 0 ? `${x.overs}.${x.ballsBowled}` : x.overs,
          wickets: x.wickets,
          runsConceded: x.runsConceded,
          extras: x.extras,
        }))}
        title={`${team2} - Bowling`}
      />
      <Divider style={styles.divider} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
    paddingBottom: 32,
  },
  divider: {
    marginVertical: 10,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
});
export default MatchSummary;
