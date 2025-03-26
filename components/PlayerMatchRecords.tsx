import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { playerMatchStats } from "@/types/playerMatchStats";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { useAppContext } from "@/context/AppContext";
import { playerStats } from "@/types/playerStats";
import { ActivityIndicator } from "react-native";
import Table from "./ui/table";
import { Divider } from "react-native-elements";
import TournamentDropdown from "./TournamentDropdown";
import { Tournament } from "@/firebase/models/Tournament";
import NotFoundTable from "./ui/notFoundTable";

interface PlayerMatchRecordsProps {
  playerId: string;
}

const PlayerMatchRecords: React.FC<PlayerMatchRecordsProps> = ({
  playerId,
}) => {
  const [matchStats, setMatchStats] = useState<playerStats[]>([]);
  const { currentTheme, club, currentTournament } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament>();

  useEffect(() => {
    const fetchMatchStats = async () => {
      const stats = await PlayerMatchStats.getAllByPlayerId(
        playerId,
        selectedTournament?.id ?? ""
      );
      if (stats) {
        setMatchStats(stats);
      }
      setIsLoading(false);
    };
    fetchMatchStats();
  }, [playerId, selectedTournament]);

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={currentTheme === "dark" ? "#ffffff" : "#000000"}
      />
    );
  }

  const battingColumns = [
    { key: "runs", label: "Runs" },
    { key: "balls", label: "Balls" },
    { key: "sixes", label: "6s" },
    { key: "fours", label: "4s" },
    { key: "strikeRate", label: "SR" },
    { key: "out", label: "Out" },
  ];

  const bowlingColumns = [
    { key: "overs", label: "Overs" },
    { key: "wickets", label: "Wickets" },
    { key: "runsConceded", label: "Runs" },
    { key: "extras", label: "Extras" },
    { key: "6s / 4s", label: "6s / 4s" },
  ];

  return (
    <ScrollView style={styles.container}>
      <TournamentDropdown
        selectedTournament={selectedTournament}
        onTournamentSelect={setSelectedTournament}
      />
      {matchStats.length === 0 ? (
        <NotFoundTable />
      ) : (
        <>
          <Table
            columns={battingColumns}
            data={matchStats.map((stat) => ({
              runs: stat.runs,
              balls: stat.ballsFaced,
              sixes: stat.sixes,
              fours: stat.fours,
              strikeRate: stat.strikeRate.toFixed(2),
              out: stat.isOut ? "" : "*",
            }))}
            title="Batting"
            headerStyle={{ padding: 6, fontSize: 13 }}
            cellStyle={{ padding: 6, fontSize: 13 }}
            tableStyle={{ marginBottom: 8 }}
          />
          <Divider style={styles.divider} />
          <Table
            columns={bowlingColumns}
            data={matchStats.map((stat) => ({
              overs:
                stat.ballsBowled > 0
                  ? `${stat.overs}.${stat.ballsBowled}`
                  : stat.overs,
              wickets: stat.wickets,
              runsConceded: stat.runsConceded,
              extras: stat.extras,
              "6s / 4s": stat.sixesConceded + " / " + stat.foursConceded,
            }))}
            title="Bowling"
            headerStyle={{ padding: 6, fontSize: 13 }}
            cellStyle={{ padding: 6, fontSize: 13 }}
            tableStyle={{ marginBottom: 8 }}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    paddingLeft: 8,
    color: "#2e3d4c",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 8,
    marginTop: 8,
  },
  divider: {
    marginTop: 16,
    marginBottom: 16,
    borderColor: "#cbd5e1",
    borderWidth: 1,
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
