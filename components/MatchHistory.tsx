import { match } from "@/types/match";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { player } from "@/types/player";

const { width } = Dimensions.get("window");

const Card = ({ match, players }: { match: match; players: player[] }) => {
  const router = useRouter();
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (match.status === "live") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [match.status]);

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
    <TouchableOpacity onPress={handlePress}>
      <LinearGradient
        colors={
          currentTheme === "dark"
            ? ["#2c3e50", "#34495e"]
            : ["#ecf0f1", "#bdc3c7"]
        }
        style={themeStyles.card}
      >
        <View style={themeStyles.cardHeader}>
          <Text style={themeStyles.title}>
            {match.team1} vs {match.team2}
          </Text>
          {match.status === "completed" && (
            <View style={themeStyles.winnerContainer}>
              <Ionicons
                name="trophy"
                size={18}
                color={currentTheme === "dark" ? "#F7E7A6" : "#f39c12"}
              />
              <Text style={themeStyles.winner}>
                {match.winner === "team1" ? match.team1 : match.team2}
              </Text>
            </View>
          )}
          {match.status === "live" && (
            <View style={themeStyles.winnerContainer}>
              <Animated.Text
                style={[themeStyles.live, { opacity: opacityAnim }]}
              >
                Live
              </Animated.Text>
            </View>
          )}
        </View>
        <View style={themeStyles.cardBody}>
          <View style={themeStyles.infoRow}>
            <Ionicons
              name="baseball"
              size={16}
              color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
            />
            <Text style={themeStyles.info}>Overs: {match.overs}</Text>
          </View>
          {match.status === "completed" ? (
            <View style={themeStyles.infoRow}>
              <Ionicons
                name="trophy"
                size={16}
                color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
              />
              <Text style={themeStyles.info}>
                Man of the match:{" "}
                {
                  players.find((player) => player.id == match.manOfTheMatch)
                    ?.name
                }
              </Text>
            </View>
          ) : (
            ""
          )}
          <View style={themeStyles.infoRow}>
            <Ionicons
              name="calendar"
              size={16}
              color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
            />
            <Text style={themeStyles.info}>
              {new Date(match.date).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const MatchHistory = ({
  matches,
  players,
}: {
  matches: match[];
  players: player[];
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={themeStyles.container}>
      <Text style={themeStyles.header}>Match History</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {matches &&
          matches.map((item, index) => (
            <Card key={index} match={item} players={players} />
          ))}
      </ScrollView>
    </View>
  );
};

const darkStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#121212",
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardBody: {
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  winner: {
    fontSize: 16,
    color: "#F7E7A6",
    fontWeight: "bold",
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: "#B0B0B0",
    marginLeft: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
  live: {
    fontSize: 16,
    color: "red",
    fontWeight: "bold",
    marginLeft: 6,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardBody: {
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  winner: {
    fontSize: 16,
    color: "#f39c12",
    fontWeight: "bold",
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
  live: {
    fontSize: 16,
    color: "red",
    fontWeight: "bold",
    marginLeft: 6,
  },
});

export default MatchHistory;
