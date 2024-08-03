import { match } from "@/types/match";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

const Card = ({ match }: { match: match }) => {
  const router = useRouter();

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
    <TouchableOpacity onPress={handlePress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>
          {match.team1} vs {match.team2}
        </Text>
        {match.status === "completed" && (
          <Text style={styles.winner}>
            Winner: {match.winner === "team1" ? match.team1 : match.team2}
          </Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.info}>Overs: {match.overs}</Text>
        <Text style={styles.info}>Status: {match.status}</Text>
        <Text style={styles.info}>
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
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Match History</Text>
      <ScrollView>
        {matches &&
          matches.map((item, index) => <Card key={index} match={item} />)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#1c1c1c", // Slightly lighter dark background
    flex: 1,
  },
  card: {
    backgroundColor: "#2e2e2e", // Calmer dark card background
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 120,
    elevation: 10,
    borderWidth: 2, // Optional border for separation
    borderColor: "#444", // Slightly lighter border color
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#444", // Border between header and body
    paddingBottom: 8,
    marginBottom: 8,
  },
  cardBody: {
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E0E0E0", // Light gray for better contrast
  },
  winner: {
    fontSize: 16,
    color: "#F7E7A6", // Lighter gold color for the winner
    fontWeight: "bold",
    marginTop: 4,
  },
  info: {
    fontSize: 14,
    color: "#B0B0B0", // Softer gray for information text
    marginBottom: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E0E0E0", // Matching header color with title
    marginBottom: 15,
    marginTop: 32,
    textAlign: "center",
  },
});

export default MatchHistory;
