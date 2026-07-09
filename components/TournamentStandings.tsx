import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppContext } from "@/context/AppContext";
import { Ionicons } from "@expo/vector-icons";

// Net Run Rate is stored with a leading sign so a glance reads +/- at once.
const formatNrr = (nrr: number) => `${nrr > 0 ? "+" : ""}${nrr.toFixed(2)}`;

const TournamentStandings = ({
  matchStandings,
  nrrByInitials,
}: {
  matchStandings: { initials: string; name: string; wins: number }[];
  // Team NRR keyed by teamInitials. Absent for older tournaments with no
  // stored standings, in which case the NRR line is simply hidden.
  nrrByInitials?: Record<string, number>;
}) => {
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const team0 = matchStandings?.[0];
  const team1 = matchStandings?.[1];
  const nrr0 = team0 ? nrrByInitials?.[team0.initials] : undefined;
  const nrr1 = team1 ? nrrByInitials?.[team1.initials] : undefined;

  return (
    <View style={themeStyles.container}>
      <View style={themeStyles.matchContainer}>
        <View style={themeStyles.teamContainer}>
          <Text style={themeStyles.teamName}>{team0?.name}</Text>
          <Text style={themeStyles.score}>{team0?.wins}</Text>
          {typeof nrr0 === "number" && (
            <Text style={themeStyles.nrr}>NRR {formatNrr(nrr0)}</Text>
          )}
        </View>
        <View style={themeStyles.centerContainer}>
          <View style={themeStyles.vsContainer}>
            <Ionicons
              name="trophy-outline"
              size={48}
              color={themeStyles.vsText.color}
            />
          </View>
        </View>
        <View style={themeStyles.teamContainer}>
          <Text style={themeStyles.teamName}>{team1?.name}</Text>
          <Text style={themeStyles.score}>{team1?.wins}</Text>
          {typeof nrr1 === "number" && (
            <Text style={themeStyles.nrr}>NRR {formatNrr(nrr1)}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const darkStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
  },
  matchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
    flexShrink: 1,
    width: 120,
  },
  score: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4dabf5",
  },
  nrr: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8A8A8A",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  centerContainer: {
    alignItems: "center",
  },
  vsContainer: {
    marginBottom: 8,
  },
  vsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff8c00",
  },
  timeText: {
    fontSize: 12,
    color: "#4dabf5",
    fontWeight: "600",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
  },
  matchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
    textAlign: "center",
    flexShrink: 1,
    width: 120,
  },
  score: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a73e8",
  },
  nrr: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888888",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  centerContainer: {
    alignItems: "center",
  },
  vsContainer: {
    marginBottom: 8,
  },
  vsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ce1126",
  },
  timeText: {
    fontSize: 12,
    color: "#1a73e8",
    fontWeight: "600",
  },
});

export default TournamentStandings;
