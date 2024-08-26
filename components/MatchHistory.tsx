import { match } from "@/types/match";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/context/ThemeContext"; // Adjust the import path if necessary

const Card = ({ match }: { match: match }) => {
  const router = useRouter();
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handlePress = () => {
    router.push({
      pathname: `/matchSummary`,
      params: {
        matchId: match.matchId,
        team1: match.team1,
        team2: match.team2,
      },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={themeStyles.card}>
      <View style={themeStyles.cardHeader}>
        <Text style={themeStyles.title}>
          {match.team1} vs {match.team2}
        </Text>
        {match.status === "completed" && (
          <Text style={themeStyles.winner}>
            Winner: {match.winner === "team1" ? match.team1 : match.team2}
          </Text>
        )}
      </View>
      <View style={themeStyles.cardBody}>
        <Text style={themeStyles.info}>Overs: {match.overs}</Text>
        <Text style={themeStyles.info}>Status: {match.status}</Text>
        <Text style={themeStyles.info}>
          Date:{" "}
          {new Date(match.date).toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const MatchHistory = ({ matches }: { matches: match[] }) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={themeStyles.container}>
      <Text style={themeStyles.header}>Match History</Text>
      <ScrollView>
        {matches &&
          matches.map((item, index) => <Card key={index} match={item} />)}
      </ScrollView>
    </View>
  );
};

const darkStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#1c1c1c",
    flex: 1,
  },
  card: {
    backgroundColor: "#2e2e2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 120,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#444",
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingBottom: 8,
    marginBottom: 8,
  },
  cardBody: {
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E0E0E0",
  },
  winner: {
    fontSize: 16,
    color: "#F7E7A6",
    fontWeight: "bold",
    marginTop: 4,
  },
  info: {
    fontSize: 14,
    color: "#B0B0B0",
    marginBottom: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E0E0E0",
    marginBottom: 15,
    marginTop: 32,
    textAlign: "center",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f0f0f0", // Light background for light theme
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff", // Light card background
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#ddd", // Light shadow for light theme
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#ddd", // Light border color for light theme
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd", // Light border between header and body
    paddingBottom: 8,
    marginBottom: 8,
  },
  cardBody: {
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333", // Dark text color for light theme
  },
  winner: {
    fontSize: 16,
    color: "orange", // Gold color for winner
    fontWeight: "bold",
    marginTop: 4,
  },
  info: {
    fontSize: 14,
    color: "#666", // Darker gray for information text
    marginBottom: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333", // Dark text color for header
    marginBottom: 15,
    marginTop: 32,
    textAlign: "center",
  },
});

export default MatchHistory;
