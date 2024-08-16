import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";

// Props for the PlayerCareerRecords component
interface PlayerCareerRecordsProps {
  playerId: string;
}

const PlayerCareerRecords: React.FC<PlayerCareerRecordsProps> = ({
  playerId,
}) => {
  const [stats, setStats] = useState<playerCareerStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const careerStats = await getItem(STORAGE_ITEMS.PLAYER_CAREER_STATS);
      if (careerStats) {
        const playerStats = careerStats.find(
          (stat: playerCareerStats) => stat.playerId === playerId
        );
        setStats(playerStats || null);
      }
    };
    fetchStats();
  }, [playerId]);

  if (!stats) {
    return <Text style={styles.loadingText}>Loading...</Text>;
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
    <View style={styles.table}>
      <Text style={styles.tableTitle}>{title}</Text>
      <ScrollView horizontal>
        <View style={styles.tableContent}>
          <View style={styles.headerRow}>
            {data.map((item, index) => (
              <Text key={index} style={styles.headerCell}>
                {item.header}
              </Text>
            ))}
          </View>
          <View style={styles.tableRow}>
            {data.map((item, index) => (
              <Text key={index} style={styles.cell}>
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

export default PlayerCareerRecords;
