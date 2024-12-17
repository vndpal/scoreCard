import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

const TournamentStandings = ({
  matchStandings,
}: {
  matchStandings: Record<string, number>;
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={themeStyles.container}>
      <View style={themeStyles.matchContainer}>
        <View style={themeStyles.teamContainer}>
          <Text style={themeStyles.teamName}>
            {matchStandings && Object.keys(matchStandings)[0]}
          </Text>
          <Text style={themeStyles.score}>
            {matchStandings && Object.values(matchStandings)[0]}
          </Text>
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
          <Text style={themeStyles.teamName}>
            {matchStandings && Object.keys(matchStandings)[1]}
          </Text>
          <Text style={themeStyles.score}>
            {matchStandings && Object.values(matchStandings)[1]}
          </Text>
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
