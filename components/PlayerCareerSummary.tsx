import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { player } from "@/types/player";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useTheme } from "@/context/ThemeContext";

const PlayerCareerSummary = () => {
  const [battingStats, setBattingStats] = useState<playerCareerStats[]>([]);
  const [bowlingStats, setBowlingStats] = useState<playerCareerStats[]>([]);
  const [playersMap, setPlayersMap] = useState<Map<string, string>>(new Map());

  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

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
      <Text style={[styles.nameCell, themeStyles.nameCell]}>
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
      {type === "batting" ? (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>{item.runs}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.ballsFaced}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.fours}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.sixes}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.strikeRate ? item.strikeRate.toFixed(2) : 0.0}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.average ? item.average.toFixed(2) : 0.0}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.matches}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.overs}
            {item.ballsBowled > 0 ? "." + item.ballsBowled : ""}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.runsConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.wickets}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.bowlingEconomy ? item.bowlingEconomy.toFixed(2) : 0.0}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.foursConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.sixesConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.matches}</Text>
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
    <View key={id} style={[styles.table, themeStyles.table]}>
      <Text style={[styles.tableTitle, themeStyles.tableTitle]}>{title}</Text>
      <ScrollView horizontal>
        <View style={styles.tableContent}>
          <View style={[styles.headerRow, themeStyles.headerRow]}>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Player
            </Text>
            {type === "batting" ? (
              <>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Runs
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Balls
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Fours
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Sixes
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  SR
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Avg
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Matches
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Overs
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Runs
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Wickets
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Eco
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  4s
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  6s
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Matches
                </Text>
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
    <ScrollView style={[styles.container, themeStyles.container]}>
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

export default PlayerCareerSummary;
