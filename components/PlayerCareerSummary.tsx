import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { player } from "@/types/player";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";

const PlayerCareerSummary = () => {
  const [battingStats, setBattingStats] = useState<playerCareerStats[]>([]);
  const [bowlingStats, setBowlingStats] = useState<playerCareerStats[]>([]);
  const [playersMap, setPlayersMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const careerStats = await getItem(STORAGE_ITEMS.PLAYER_CAREER_STATS);
      const players = await getItem(STORAGE_ITEMS.PLAYERS);
      if (careerStats && players) {
        const playersMap = new Map<string, string>();
        players.forEach((p: player) => {
          playersMap.set(p.id.toString(), p.name);
        });
        setPlayersMap(playersMap);
        // Sort battingStats by most runs
        const sortedBattingStats = [...careerStats].sort(
          (a: playerCareerStats, b: playerCareerStats) => b.runs - a.runs
        );

        const sortedBowlingStats = [...careerStats].sort(
          (a: playerCareerStats, b: playerCareerStats) => b.wickets - a.wickets
        );

        setBattingStats(sortedBattingStats);
        setBowlingStats(sortedBowlingStats);
      }
    })();
  }, []);

  const renderItem = ({
    item,
    type,
  }: {
    item: playerCareerStats;
    type: string;
  }) => (
    <View style={styles.row} key={item.playerId}>
      <Text style={styles.nameCell}>
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
      {type === "batting" ? (
        <>
          <Text style={styles.cell}>{item.runs}</Text>
          <Text style={styles.cell}>{item.ballsFaced}</Text>
          <Text style={styles.cell}>{item.fours}</Text>
          <Text style={styles.cell}>{item.sixes}</Text>
          <Text style={styles.cell}>
            {item.strikeRate ? item.strikeRate.toFixed(2) : 0.0}
          </Text>
          <Text style={styles.cell}>
            {item.average ? item.average.toFixed(2) : 0.0}
          </Text>
          <Text style={styles.cell}>{item.matches}</Text>
        </>
      ) : (
        <>
          <Text style={styles.cell}>{item.overs}</Text>
          <Text style={styles.cell}>{item.runsConceded}</Text>
          <Text style={styles.cell}>{item.wickets}</Text>
          <Text style={styles.cell}>
            {item.bowlingEconomy ? item.bowlingEconomy.toFixed(2) : 0.0}
          </Text>
          <Text style={styles.cell}>{item.foursConceded}</Text>
          <Text style={styles.cell}>{item.sixesConceded}</Text>
          <Text style={styles.cell}>{item.matches}</Text>
        </>
      )}
    </View>
  );

  const renderTable = (
    title: string,
    data: playerCareerStats[],
    type: string,
    id: string
  ) => (
    <View key={id} style={styles.table}>
      <Text style={styles.tableTitle}>{title}</Text>
      <ScrollView horizontal>
        <View style={styles.tableContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>Player</Text>
            {type === "batting" ? (
              <>
                <Text style={styles.headerCell}>Runs</Text>
                <Text style={styles.headerCell}>Balls</Text>
                <Text style={styles.headerCell}>Fours</Text>
                <Text style={styles.headerCell}>Sixes</Text>
                <Text style={styles.headerCell}>SR</Text>
                <Text style={styles.headerCell}>Avg</Text>
                <Text style={styles.headerCell}>Matches</Text>
              </>
            ) : (
              <>
                <Text style={styles.headerCell}>Overs</Text>
                <Text style={styles.headerCell}>Runs</Text>
                <Text style={styles.headerCell}>Wickets</Text>
                <Text style={styles.headerCell}>Eco</Text>
                <Text style={styles.headerCell}>4s</Text>
                <Text style={styles.headerCell}>6s</Text>
                <Text style={styles.headerCell}>Matches</Text>
              </>
            )}
          </View>
          {data.map((item) => renderItem({ item, type }))}
        </View>
      </ScrollView>
    </View>
  );

  const data = [
    {
      id: "1",
      title: "Batting Records",
      data: battingStats,
      type: "batting",
    },
    {
      id: "2",
      title: "Bowling Records",
      data: bowlingStats,
      type: "bowling",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {data.map((item) =>
        renderTable(item.title, item.data, item.type, item.id)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#1f1f1f",
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginVertical: 12,
    textAlign: "center",
  },
  tableContent: {
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#555",
    paddingVertical: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    padding: 6,
    fontSize: 14,
    minWidth: 60, // Increase the minimum width
  },
  cell: {
    flex: 1,
    color: "#ffffff",
    textAlign: "center",
    padding: 6,
    fontSize: 14,
    minWidth: 60, // Increase the minimum width
  },
  nameCell: {
    flex: 1,
    color: "#ffffff",
    textAlign: "left",
    padding: 6,
    fontSize: 14,
    minWidth: 60, // Increase the minimum width
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});

export default PlayerCareerSummary;
