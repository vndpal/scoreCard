import { match } from "@/types/match";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Button } from "react-native";
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
import MatchScoreBar from "./MatchScoreBar";
import TournamentStandings from "./TournamentStandings";
import { Timestamp } from "@react-native-firebase/firestore";
import { getMatchResultText } from "@/utils/getMatchResultText";
import { Dropdown } from "react-native-paper-dropdown";
import { Menu } from "react-native-paper";
import { Tournament } from "@/firebase/models/Tournament";
import TournamentDropdown from "./TournamentDropdown";
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

  const getTimeDifference = (
    startDateTime: Timestamp,
    endDateTime: Timestamp | undefined
  ) => {
    if (!startDateTime || !endDateTime) {
      return "-";
    }
    const start = startDateTime.toDate();
    const end = endDateTime.toDate();
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
          <View style={themeStyles.headerRow}>
            <View style={themeStyles.leftColumn}>
              <Text style={themeStyles.title}>
                {match.team1} vs {match.team2}
              </Text>
              {match.status === "completed" && (
                <WinnerBadge
                  winner={match.winner === "team1" ? match.team1 : match.team2}
                />
              )}
            </View>
            <View style={themeStyles.rightColumn}>
              <TeamScore team={match.team1} score={match.currentScore?.team1} />
              <TeamScore team={match.team2} score={match.currentScore?.team2} />
            </View>
          </View>
          <StatusBadge
            status={match.status}
            opacityAnim={opacityAnim}
            match={match}
          />
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
                  {match.startDateTime
                    ? match.startDateTime.toDate().toLocaleDateString()
                    : "NA"}
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
                      players?.find(
                        (player) => player.id == match.manOfTheMatch
                      )?.name
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

const StatusBadge = ({
  status,
  opacityAnim,
  match,
}: {
  status: string;
  opacityAnim: Animated.Value;
  match: match;
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  if (status === "live") {
    return (
      <Animated.View
        style={[
          themeStyles.statusBadge,
          themeStyles.liveBadge,
          { opacity: opacityAnim },
        ]}
      >
        <Animated.Text
          style={[
            themeStyles.statusText,
            themeStyles.liveText,
            { opacity: opacityAnim },
          ]}
        >
          Live
        </Animated.Text>
      </Animated.View>
    );
  }

  if (["abandoned", "draw", "noResult", "tied"].includes(status)) {
    return (
      <View style={[themeStyles.statusBadge, themeStyles.noResultBadge]}>
        <Text style={[themeStyles.statusText, themeStyles.noResultText]}>
          {status === "abandoned"
            ? "Abandoned"
            : status === "draw"
            ? "Draw"
            : status === "noResult"
            ? "No Result"
            : "Tied"}
        </Text>
      </View>
    );
  }

  if (status == "completed") {
    return (
      <View>
        <Text style={themeStyles.resultText}>
          {getMatchResultText(
            match,
            match.currentScore?.team1,
            match.currentScore?.team2
          )}
        </Text>
      </View>
    );
  }

  return null;
};

const TeamScore = ({
  team,
  score,
}: {
  team: string;
  score?: {
    totalRuns: number;
    totalWickets: number;
    totalOvers: number;
    totalBalls: number;
  };
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={themeStyles.scoreContainer}>
      <Text style={themeStyles.teamName}>{team}</Text>
      <Text style={themeStyles.scoreText}>
        <Text style={themeStyles.runsWickets}>
          {score?.totalRuns || 0}/{score?.totalWickets || 0}
        </Text>
        <Text style={themeStyles.overs}>
          {" "}
          ({score?.totalOvers || 0}.{score?.totalBalls || 0})
        </Text>
      </Text>
    </View>
  );
};

const WinnerBadge = ({ winner }: { winner: string }) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={themeStyles.winnerContainer}>
      <Ionicons
        name="trophy"
        size={18}
        color={currentTheme === "dark" ? "#F7E7A6" : "#f39c12"}
      />
      <Text style={themeStyles.winner}>{winner}</Text>
    </View>
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
  const [selectedTournament, setSelectedTournament] = useState<Tournament>();

  const selectedTorunamen = (t: Tournament) => {
    setSelectedTournament(t);
  };

  const filteredMatches = React.useMemo(() => {
    return matches?.filter(
      (match) => match.tournamentId === selectedTournament?.id
    );
  }, [matches, selectedTournament]);

  const matchStandings = React.useMemo(() => {
    return (
      filteredMatches?.reduce((acc, match) => {
        if (match.winner && match.status === "completed") {
          const winningTeam =
            match.winner === "team1"
              ? match.team1Fullname
              : match.team2Fullname;
          const losingTeam =
            match.winner === "team1"
              ? match.team2Fullname
              : match.team1Fullname;
          if (
            typeof winningTeam === "string" &&
            typeof losingTeam === "string"
          ) {
            acc[winningTeam] = (acc[winningTeam] || 0) + 1;
            acc[losingTeam] = acc[losingTeam] || 0;
          }
        }
        return acc;
      }, {} as Record<string, number>) ?? {}
    );
  }, [filteredMatches]);

  return (
    <View style={themeStyles.container}>
      <Text style={themeStyles.header}>Match History</Text>

      {matches && <TournamentStandings matchStandings={matchStandings} />}

      <TournamentDropdown
        selectedTournament={selectedTournament}
        onTournamentSelect={selectedTorunamen}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredMatches?.map((item, index) => (
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
    paddingBottom: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  teamScoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B0B0B0",
    marginRight: 8,
  },
  score: {
    fontSize: 16,
    color: "#B0B0B0",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadge: {
    backgroundColor: "#ff4136",
  },
  noResultBadge: {
    backgroundColor: "#F7E7A6",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  liveText: {
    color: "#FFFFFF",
  },
  noResultText: {
    color: "#34495e",
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  winner: {
    fontSize: 14,
    color: "#F7E7A6",
    fontWeight: "600",
    marginLeft: 6,
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
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    alignItems: "flex-end",
  },
  scoreText: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  runsWickets: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  overs: {
    fontSize: 14,
    color: "#8A8A8A",
  },
  resultText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "300",
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
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    paddingBottom: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  teamScoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginRight: 8,
  },
  score: {
    fontSize: 16,
    color: "#666666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadge: {
    backgroundColor: "#ff4136",
  },
  noResultBadge: {
    backgroundColor: "#F7E7A6",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  liveText: {
    color: "#FFFFFF",
  },
  noResultText: {
    color: "#34495e",
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  winner: {
    fontSize: 14,
    color: "#f39c12",
    fontWeight: "600",
    marginLeft: 6,
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
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    alignItems: "flex-end",
  },
  scoreText: {
    flexDirection: "column",
    alignItems: "baseline",
  },
  runsWickets: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  overs: {
    fontSize: 14,
    color: "#888888",
  },
  resultText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "700",
  },
});

export default MatchHistory;
