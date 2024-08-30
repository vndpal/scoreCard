import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { player } from "@/types/player";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

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
    <View style={[styles.row, themeStyles.row]} key={item.playerId}>
      <Text
        style={[styles.nameCell, themeStyles.nameCell]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
      {type === "batting" ? (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>{item.runs}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.ballsFaced}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.fours}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.sixes}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.strikeRate ? item.strikeRate.toFixed(2) : "-"}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.average ? item.average.toFixed(2) : "-"}
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
            {item.bowlingEconomy ? item.bowlingEconomy.toFixed(2) : "-"}
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
      <LinearGradient
        colors={
          currentTheme === "dark"
            ? ["#2c3e50", "#34495e"]
            : ["#ecf0f1", "#bdc3c7"]
        }
        style={styles.tableHeader}
      >
        <Text style={[styles.tableTitle, themeStyles.tableTitle]}>{title}</Text>
      </LinearGradient>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
    padding: 16,
  },
  table: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    padding: 16,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  tableContent: {
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,
    minWidth: 70,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    padding: 8,
    fontSize: 14,
    minWidth: 70,
  },
  nameCell: {
    flex: 1.5,
    textAlign: "left",
    padding: 8,
    fontSize: 14,
    minWidth: 100,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    backgroundColor: "#2c3e50",
  },
  headerCell: {
    color: "#ecf0f1",
  },
  cell: {
    color: "#ffffff",
  },
  nameCell: {
    color: "#3498db",
  },
  row: {
    borderBottomColor: "#2c3e50",
    borderBottomWidth: 1,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
  table: {
    backgroundColor: "#ffffff",
  },
  tableTitle: {
    color: "#2c3e50",
  },
  headerRow: {
    backgroundColor: "#ecf0f1",
  },
  headerCell: {
    color: "#2c3e50",
  },
  cell: {
    color: "#34495e",
  },
  nameCell: {
    color: "#2980b9",
  },
  row: {
    borderBottomColor: "#ecf0f1",
    borderBottomWidth: 1,
  },
});

export default PlayerCareerSummary;
