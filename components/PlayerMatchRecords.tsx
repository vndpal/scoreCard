import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { playerMatchStats } from "@/types/playerMatchStats";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { useTheme } from "@/context/ThemeContext";
import { StatsTable } from "@/components/ui/statsTable";
import { playerStats } from "@/types/playerStats";
import { ActivityIndicator } from "react-native";

interface PlayerMatchRecordsProps {
  playerId: string;
}

const PlayerMatchRecords: React.FC<PlayerMatchRecordsProps> = ({
  playerId,
}) => {
  const [matchStats, setMatchStats] = useState<playerStats[]>([]);
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatchStats = async () => {
      const stats = await PlayerMatchStats.getAllByPlayerId(playerId);
      if (stats) {
        setMatchStats(stats);
      }
      setIsLoading(false);
    };
    fetchMatchStats();
  }, [playerId]);

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={currentTheme === "dark" ? "#ffffff" : "#000000"}
      />
    );
  }

  const battingHeaders = ["Runs", "Balls", "4s", "6s", "SR"];
  const bowlingHeaders = ["Wickets", "Overs", "Runs", "Econ", "Extras"];

  const battingData: (string | number)[][] = [];

  matchStats.forEach((match) => {
    battingData.push([
      match.runs,
      match.ballsFaced,
      match.fours,
      match.sixes,
      match.strikeRate?.toFixed(2) ?? "-",
    ]);
  });

  const bowlingData: (string | number)[][] = [];

  matchStats.forEach((match) => {
    bowlingData.push([
      match.wickets,
      match.overs,
      match.runsConceded,
      match.bowlingEconomy?.toFixed(2) ?? "-",
      match.extras,
    ]);
  });

  return (
    <ScrollView style={styles.container}>
      <React.Fragment>
        <StatsTable
          title="Batting"
          headers={battingHeaders}
          rows={battingData}
        />
        <StatsTable
          title="Bowling"
          headers={bowlingHeaders}
          rows={bowlingData}
        />
      </React.Fragment>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  matchDate: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 8,
    paddingLeft: 8,
  },
});

const darkStyles = StyleSheet.create({
  text: {
    color: "#ffffff",
  },
});

const lightStyles = StyleSheet.create({
  text: {
    color: "#000000",
  },
});

export default PlayerMatchRecords;
