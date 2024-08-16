import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, VirtualizedList } from "react-native";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { player } from "@/types/player"; // Import the player type
import { getItem } from "@/utils/asyncStorage";

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

  useEffect(() => {
    (async () => {
      const playerMatchStats = await getItem(STORAGE_ITEMS.PLAYER_MATCH_STATS);
      const players = await getItem(STORAGE_ITEMS.PLAYERS); // Adjust this to the actual key if needed

      if (playerMatchStats && players) {
        // Create a map from player IDs to player names
        const playersMap = new Map<string, string>();
        players.forEach((p: player) => {
          playersMap.set(p.id.toString(), p.name);
        });
        setPlayersMap(playersMap);

        // Filter and sort records based on match and team
        const matchStats = playerMatchStats.find(
          (stats: playerMatchStats) => stats.matchId === matchId
        );
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

  const renderItem = ({
    item,
    type,
  }: {
    item: playerStats;
    type: "batting" | "bowling";
  }) => (
    <View style={styles.row} key={item.playerId}>
      <Text style={styles.cell}>
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
      {type === "batting" ? (
        <>
          <Text style={styles.cell}>{item.runs}</Text>
          <Text style={styles.cell}>{item.ballsFaced}</Text>
          <Text style={styles.cell}>
            {item.strikeRate ? item.strikeRate.toFixed(2) : "-"}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.cell}>
            {item.overs}
            {item.ballsBowled > 0 ? "." + item.ballsBowled : ""}
          </Text>
          <Text style={styles.cell}>{item.runsConceded}</Text>
          <Text style={styles.cell}>{item.wickets}</Text>
          <Text style={styles.cell}>
            {item.bowlingEconomy ? item.bowlingEconomy.toFixed(2) : "-"}
          </Text>
        </>
      )}
    </View>
  );

  const renderTable = (
    title: string,
    data: playerStats[],
    type: "batting" | "bowling",
    id: string
  ) => (
    <View key={id} style={styles.table}>
      <Text style={styles.tableTitle}>{title}</Text>
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Player</Text>
        {type === "batting" ? (
          <>
            <Text style={styles.headerCell}>Runs</Text>
            <Text style={styles.headerCell}>Balls</Text>
            <Text style={styles.headerCell}>SR</Text>
          </>
        ) : (
          <>
            <Text style={styles.headerCell}>Overs</Text>
            <Text style={styles.headerCell}>Runs</Text>
            <Text style={styles.headerCell}>Wickets</Text>
            <Text style={styles.headerCell}>Eco</Text>
          </>
        )}
      </View>
      {data.map((item) => renderItem({ item, type }))}
    </View>
  );

  const data = [
    {
      id: "1",
      title: `${team1} Batting`,
      data: battingRecordsTeamA,
      type: "batting",
    },
    {
      id: "2",
      title: `${team2} Bowling`,
      data: bowlingRecordsTeamB,
      type: "bowling",
    },
    {
      id: "3",
      title: `${team2} Batting`,
      data: battingRecordsTeamB,
      type: "batting",
    },
    {
      id: "4",
      title: `${team1} Bowling`,
      data: bowlingRecordsTeamA,
      type: "bowling",
    },
  ];

  const getItemLocal = (data: any[], index: number) => data[index];
  const getItemCount = (data: any[]) => data.length;

  return (
    <VirtualizedList
      data={data}
      initialNumToRender={4}
      renderItem={({ item }) =>
        renderTable(item.title, item.data, item.type, item.id)
      }
      keyExtractor={(item) => item.id}
      getItem={getItemLocal}
      getItemCount={getItemCount}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", // Dark background color
    padding: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: "#444", // Darker border color
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#1f1f1f", // Slightly lighter dark background for table
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff", // Light text color
    marginVertical: 12,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#333", // Dark background for header
    borderBottomWidth: 1,
    borderBottomColor: "#555", // Slightly lighter border color
    paddingVertical: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "600",
    color: "#ffffff", // Light text color
    textAlign: "center",
    padding: 6,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#444", // Darker border color for rows
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cell: {
    flex: 1,
    color: "#ffffff", // Light text color
    textAlign: "center",
    padding: 6,
    fontSize: 14,
  },
});

export default MatchSummary;
