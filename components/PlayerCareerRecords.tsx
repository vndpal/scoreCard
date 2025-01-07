import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { playerCareerStats } from "@/types/playerCareerStats";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { useTheme } from "@/context/ThemeContext";
import { StatsTable } from "@/components/ui/statsTable";

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

  const battingData: (string | number)[][] = [
    [
      stats.matches,
      stats.runs,
      stats.ballsFaced,
      stats.fours,
      stats.sixes,
      stats.strikeRate?.toFixed(2) ?? "-",
      stats.average?.toFixed(2) ?? "-",
    ],
  ];

  const bowlingData: (string | number)[][] = [
    [
      stats.matches,
      stats.wickets,
      `${stats.overs}.${stats.ballsBowled}`,
      stats.runsConceded,
      stats.bowlingEconomy?.toFixed(2) ?? "-",
      stats.foursConceded,
      stats.sixesConceded,
    ],
  ];

  const battingHeaders = ["Matches", "Runs", "Balls", "4s", "6s", "SR", "Avrg"];
  const bowlingHeaders = [
    "Matches",
    "Wickets",
    "Overs",
    "Runs",
    "Econ",
    "4s",
    "6s",
  ];

  return (
    <ScrollView style={styles.container}>
      <StatsTable title="Batting" headers={battingHeaders} rows={battingData} />
      <StatsTable title="Bowling" headers={bowlingHeaders} rows={bowlingData} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
});

const darkStyles = StyleSheet.create({});

const lightStyles = StyleSheet.create({});

export default PlayerCareerRecords;
