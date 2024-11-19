import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, VirtualizedList } from "react-native";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { player } from "@/types/player"; // Import the player type
import { getItem } from "@/utils/asyncStorage";
import { useTheme } from "@/context/ThemeContext";
import { Player } from "@/firebase/models/Player";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";

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

  const renderItem = ({
    item,
    type,
  }: {
    item: playerStats;
    type: "batting" | "bowling";
  }) => (
    <View style={[styles.row, themeStyles.row]} key={item.playerId}>
      <Text style={[styles.cell, themeStyles.cell]}>
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
      {type === "batting" ? (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.runs} ({item.ballsFaced})
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.strikeRate ? item.strikeRate.toFixed(2) : "-"}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.sixes} / {item.fours}
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.overs}
            {item.ballsBowled > 0 ? "." + item.ballsBowled : ""}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.wickets}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.runsConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.extras}</Text>
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
    <View key={id} style={[styles.table, themeStyles.table]}>
      <Text style={[styles.tableTitle, themeStyles.tableTitle]}>{title}</Text>
      <View style={[styles.headerRow, themeStyles.headerRow]}>
        <Text style={[styles.headerCell, themeStyles.headerCell]}>Player</Text>
        {type === "batting" ? (
          <>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Runs
            </Text>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>SR</Text>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              6s / 4s
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Overs
            </Text>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Wickets
            </Text>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Runs
            </Text>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Extras
            </Text>
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
      style={[styles.container, themeStyles.container]}
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

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
  },
  table: {
    backgroundColor: "#1f1f1f",
  },
  tableTitle: {
    color: "#ffffff",
  },
  headerRow: {
    backgroundColor: "#333",
    borderBottomColor: "#555",
  },
  headerCell: {
    color: "#ffffff",
  },
  cell: {
    color: "#ffffff",
  },
  nameCell: {
    color: "#ffffff",
  },
  row: {
    borderBottomColor: "#444",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
  table: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 16,
    elevation: 2,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginVertical: 12,
    textAlign: "center",
  },
  tableContent: {
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#dcdcdc", // Darker gray background
    borderBottomColor: "#b0b0b0", // Darker border color
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  headerCell: {
    flex: 1,
    fontWeight: "500",
    color: "#333333",
    textAlign: "center",
    paddingVertical: 8,
    fontSize: 12,
    minWidth: 60,
  },
  cell: {
    flex: 1,
    color: "#333333",
    textAlign: "center",
    paddingVertical: 8,
    fontSize: 12,
    minWidth: 60,
  },
  nameCell: {
    flex: 1,
    color: "#333333",
    textAlign: "left",
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "500",
    minWidth: 60,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
});
export default MatchSummary;
