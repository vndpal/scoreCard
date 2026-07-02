import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { useAppContext } from "@/context/AppContext";
import { tournamentStanding } from "@/types/tournamentStanding";

// Points desc, then NRR desc — mirrors the stored ordering but re-applied here
// so the table is correct regardless of read order.
const sortRows = (rows: tournamentStanding[]): tournamentStanding[] =>
  [...rows].sort((a, b) => b.points - a.points || b.nrr - a.nrr);

const formatNrr = (nrr: number): string =>
  `${nrr > 0 ? "+" : ""}${nrr.toFixed(3)}`;

const TournamentStandingsTable = ({
  rows,
  loading = false,
}: {
  rows: tournamentStanding[];
  loading?: boolean;
}) => {
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const sorted = sortRows(rows);

  // The table shell (container + header) is always rendered so the standings
  // area isn't blank; the body shows a spinner while loading, an empty-state
  // message when there are no decisive matches yet, or the rows.
  return (
    <View style={themeStyles.container}>
      <View style={[styles.row, themeStyles.headerRow]}>
        <Text style={[styles.cellTeam, styles.headerText, themeStyles.headerText]}>
          Team
        </Text>
        <Text style={[styles.cell, styles.headerText, themeStyles.headerText]}>P</Text>
        <Text style={[styles.cell, styles.headerText, themeStyles.headerText]}>W</Text>
        <Text style={[styles.cell, styles.headerText, themeStyles.headerText]}>L</Text>
        <Text style={[styles.cell, styles.headerText, themeStyles.headerText]}>Pts</Text>
        <Text style={[styles.cellNrr, styles.headerText, themeStyles.headerText]}>
          NRR
        </Text>
      </View>
      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color="#3498db" />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.stateRow}>
          <Text style={[styles.stateText, themeStyles.dataText]}>
            No standings yet
          </Text>
        </View>
      ) : (
        sorted.map((r, index) => (
        <View
          key={r.teamInitials}
          style={[
            styles.row,
            themeStyles.dataRow,
            index === sorted.length - 1 ? styles.lastRow : undefined,
          ]}
        >
          <Text
            style={[styles.cellTeam, themeStyles.teamText]}
            numberOfLines={1}
          >
            {r.teamName || r.teamInitials}
          </Text>
          <Text style={[styles.cell, themeStyles.dataText]}>{r.played}</Text>
          <Text style={[styles.cell, themeStyles.dataText]}>{r.wins}</Text>
          <Text style={[styles.cell, themeStyles.dataText]}>{r.losses}</Text>
          <Text style={[styles.cell, styles.pointsText, themeStyles.pointsText]}>
            {r.points}
          </Text>
          <Text style={[styles.cellNrr, themeStyles.dataText]}>
            {formatNrr(r.nrr)}
          </Text>
        </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cellTeam: {
    flex: 3,
    fontSize: 14,
    textAlign: "left",
  },
  cell: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
  },
  cellNrr: {
    flex: 2,
    fontSize: 14,
    textAlign: "right",
  },
  headerText: {
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  pointsText: {
    fontWeight: "700",
  },
  stateRow: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    fontSize: 13,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    overflow: "hidden",
  },
  headerRow: {
    backgroundColor: "#1E1E1E",
    borderBottomColor: "#3A3A3A",
  },
  dataRow: {
    borderBottomColor: "#3A3A3A",
  },
  headerText: {
    color: "#9E9E9E",
  },
  teamText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  dataText: {
    color: "#E0E0E0",
  },
  pointsText: {
    color: "#4dabf5",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  headerRow: {
    backgroundColor: "#F5F5F5",
    borderBottomColor: "#E0E0E0",
  },
  dataRow: {
    borderBottomColor: "#E0E0E0",
  },
  headerText: {
    color: "#666666",
  },
  teamText: {
    color: "#222222",
    fontWeight: "600",
  },
  dataText: {
    color: "#333333",
  },
  pointsText: {
    color: "#1a73e8",
  },
});

export default TournamentStandingsTable;
