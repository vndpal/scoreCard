import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useTheme } from "@/context/ThemeContext";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";

// Props for the PlayerCareerRecords component
interface PlayerCareerRecordsProps {
  playerId: string;
}

const PlayerCareerRecords: React.FC<PlayerCareerRecordsProps> = ({
  playerId,
}) => {
  const [stats, setStats] = useState<playerCareerStats | null>(null);
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    const fetchStats = async () => {
      const careerStats = await PlayerCareerStats.getByPlayerId(playerId);
      if (careerStats) {
        setStats(careerStats);
      }
    };
    fetchStats();
  }, [playerId]);

  if (!stats) {
    return (
      <Text style={[styles.loadingText, themeStyles.loadingText]}>
        Loading...
      </Text>
    );
  }

  // Data for batting and bowling stats
  const battingData = [
    { header: "Matches", value: stats.matches },
    { header: "Runs", value: stats.runs },
    { header: "Balls", value: stats.ballsFaced },
    { header: "4s", value: stats.fours },
    { header: "6s", value: stats.sixes },
    { header: "SR", value: stats.strikeRate?.toFixed(2) ?? "-" },
    { header: "Avrg", value: stats.average?.toFixed(2) ?? "-" },
  ];

  const bowlingData = [
    { header: "Matches", value: stats.matches },
    { header: "Wickets", value: stats.wickets },
    { header: "Overs", value: stats.overs + "." + stats.ballsBowled },
    { header: "Runs", value: stats.runsConceded },
    { header: "Econ", value: stats.bowlingEconomy?.toFixed(2) ?? "-" },
    { header: "4s", value: stats.foursConceded },
    { header: "6s", value: stats.sixesConceded },
  ];

  const renderTable = (
    title: string,
    data: { header: string; value: string | number }[]
  ) => (
    <View style={[styles.table, themeStyles.table]}>
      <Text style={[styles.tableTitle, themeStyles.tableTitle]}>{title}</Text>
      <ScrollView horizontal>
        <View style={styles.tableContent}>
          <View style={[styles.headerRow, themeStyles.headerRow]}>
            {data.map((item, index) => (
              <Text
                key={index}
                style={[styles.headerCell, themeStyles.headerCell]}
              >
                {item.header}
              </Text>
            ))}
          </View>
          <View style={styles.tableRow}>
            {data.map((item, index) => (
              <Text key={index} style={[styles.cell, themeStyles.cell]}>
                {item.value}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderTable("Batting", battingData)}
      {renderTable("Bowling", bowlingData)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
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
    padding: 4,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#555",
    paddingVertical: 8,
  },
  headerCell: {
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    padding: 4,
    fontSize: 12,
    minWidth: 50,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cell: {
    flex: 1,
    color: "#ffffff",
    textAlign: "center",
    padding: 4,
    fontSize: 12,
    minWidth: 50,
  },
  loadingText: {
    color: "#e0e0e0",
    textAlign: "center",
    marginTop: 20,
  },
});

const darkStyles = StyleSheet.create({
  loadingText: {
    color: "#ffffff",
  },
  table: {
    borderColor: "#888",
    backgroundColor: "#333",
  },
  tableTitle: {
    color: "#ffffff",
  },
  headerCell: {
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    padding: 4,
    fontSize: 12,
    minWidth: 50,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cell: {
    color: "#ffffff",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#555",
    paddingVertical: 8,
  },
});

const lightStyles = StyleSheet.create({
  loadingText: {
    color: "#000000",
  },
  table: {
    borderColor: "#444",
    backgroundColor: "#ffffff",
  },
  tableTitle: {
    color: "#000000",
  },
  headerCell: {
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    padding: 4,
    fontSize: 12,
    minWidth: 50,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cell: {
    color: "#000000",
  },
  headerRow: {
    backgroundColor: "#f0f0f0",
    borderBottomColor: "#555",
  },
});

export default PlayerCareerRecords;
