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

  const getTimeDifference = (startDateTime: string, endDateTime: string) => {
    if (!startDateTime || !endDateTime) {
      return "-";
    }
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <LinearGradient
        colors={
          currentTheme === "dark"
            ? ["#2c3e50", "#34495e"]
            : ["#ffffff", "#f5f5f5"]
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
            <View style={themeStyles.liveContainer}>
              <Animated.View
                style={[themeStyles.liveDot, { opacity: opacityAnim }]}
              />
              <Animated.Text
                style={[themeStyles.live, { opacity: opacityAnim }]}
              >
                Live
              </Animated.Text>
            </View>
          )}
          {(match.status === "abandoned" ||
            match.status === "draw" ||
            match.status === "noResult" ||
            match.status === "tied") && (
            <View style={themeStyles.winnerContainer}>
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={currentTheme === "dark" ? "#F7E7A6" : "red"}
              />
              <Text style={themeStyles.noResult}>
                {match.status === "abandoned"
                  ? "Abandoned"
                  : match.status === "draw"
                  ? "Draw"
                  : match.status === "noResult"
                  ? "No Result"
                  : "Tied"}
              </Text>
            </View>
          )}
        </View>
        <View style={themeStyles.cardBody}>
          <View style={themeStyles.row}>
            <View style={themeStyles.column}>
              <View style={themeStyles.infoRow}>
                <Ionicons
                  name="baseball-outline"
                  size={18}
                  color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
                />
                <Text style={themeStyles.info}>{match.overs} overs</Text>
              </View>
            </View>
            <View style={themeStyles.column}>
              <View style={themeStyles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
                />
                <Text style={themeStyles.info}>
                  {new Date(match.startDateTime).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
          <View style={themeStyles.row}>
            <View style={themeStyles.column}>
              {match.status !== "live" ? (
                <View style={themeStyles.infoRow}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
                  />
                  <Text style={themeStyles.info}>
                    {
                      players.find((player) => player.id == match.manOfTheMatch)
                        ?.name
                    }
                  </Text>
                </View>
              ) : (
                ""
              )}
            </View>
            {match.status !== "live" ? (
              <View style={themeStyles.column}>
                <View style={themeStyles.infoRow}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
                  />
                  <Text style={themeStyles.info}>
                    {getTimeDifference(match.startDateTime, match.endDateTime)}
                  </Text>
                </View>
              </View>
            ) : (
              ""
            )}
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  winner: {
    fontSize: 14,
    color: "#F7E7A6",
    fontWeight: "600",
    marginLeft: 6,
  },
  noResult: {
    fontSize: 14,
    color: "#F7E7A6",
    fontWeight: "600",
    marginLeft: 6,
  },
  liveContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4136",
    marginRight: 6,
  },
  live: {
    fontSize: 14,
    color: "#ff4136",
    fontWeight: "600",
  },
  cardBody: {
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    fontSize: 14,
    color: "#B0B0B0",
    marginLeft: 8,
    fontWeight: "500",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "#ffffff",
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 4,
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  winner: {
    fontSize: 14,
    color: "#f39c12",
    fontWeight: "600",
    marginLeft: 6,
  },
  noResult: {
    fontSize: 14,
    color: "red",
    fontWeight: "600",
    marginLeft: 6,
  },
  liveContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4136",
    marginRight: 6,
  },
  live: {
    fontSize: 14,
    color: "#ff4136",
    fontWeight: "600",
  },
  cardBody: {
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 8,
    fontWeight: "500",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
});

export default MatchHistory;
