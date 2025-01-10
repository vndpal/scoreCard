import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { useTheme } from "@/context/ThemeContext";
import Table from "./ui/table";
import { Divider } from "react-native-elements";

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
      <ActivityIndicator
        size="large"
        color={currentTheme === "dark" ? "#ffffff" : "#000000"}
      />
    );
  }

  const battingColumns = [
    { key: "matches", label: "Matches" },
    { key: "runs", label: "Runs" },
    { key: "ballsFaced", label: "Balls" },
    { key: "fours", label: "4s" },
    { key: "sixes", label: "6s" },
    { key: "strikeRate", label: "SR" },
    { key: "average", label: "Avrg" },
  ];

  const bowlingColumns = [
    { key: "matches", label: "Matches" },
    { key: "wickets", label: "Wickets" },
    { key: "overs", label: "Overs" },
    { key: "runsConceded", label: "Runs" },
    { key: "bowlingEconomy", label: "Econ" },
    { key: "foursConceded", label: "4s" },
    { key: "sixesConceded", label: "6s" },
  ];

  return (
    <ScrollView style={styles.container}>
      <Table
        columns={battingColumns}
        data={[
          {
            matches: stats.matches,
            runs: stats.runs,
            ballsFaced: stats.ballsFaced,
            fours: stats.fours,
            sixes: stats.sixes,
            strikeRate: stats.strikeRate?.toFixed(2) ?? "-",
            average: stats.average?.toFixed(2) ?? "-",
          },
        ]}
        title="Batting"
      />
      <Divider style={styles.divider} />
      <Table
        columns={bowlingColumns}
        data={[
          {
            matches: stats.matches,
            wickets: stats.wickets,
            overs: `${stats.overs}.${stats.ballsBowled}`,
            runsConceded: stats.runsConceded,
            bowlingEconomy: stats.bowlingEconomy?.toFixed(2) ?? "-",
            foursConceded: stats.foursConceded,
            sixesConceded: stats.sixesConceded,
          },
        ]}
        title="Bowling"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  divider: {
    marginTop: 16,
    marginBottom: 16,
    borderColor: "#cbd5e1",
    borderWidth: 1,
  },
});

const darkStyles = StyleSheet.create({});

const lightStyles = StyleSheet.create({});

export default PlayerCareerRecords;
