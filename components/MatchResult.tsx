import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppContext } from "@/context/AppContext";
import { playerStats } from "@/types/playerStats";
import Loader from "./Loader";

interface MatchResultProps {
  winner: string;
  matchResultText: string;
  playerStats: playerStats | undefined;
  status: string;
  onNewMatch: () => void;
}

const MatchResult = ({
  winner,
  matchResultText,
  playerStats,
  status,
  onNewMatch,
}: MatchResultProps) => {
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={[styles.card, themeStyles.card]}>
      {/* Match Details */}
      <View style={styles.resultContainer}>
        <View style={styles.winnerContainer}>
          <MaterialIcons
            name="emoji-events"
            size={28}
            color="#FFD700"
            style={{ marginTop: -7 }}
          />
          <Text style={[styles.winner, themeStyles.winner]}>
            {status !== "completed" ? status : `${winner} won!`}
          </Text>
        </View>
        <Text style={[styles.resultText, themeStyles.resultText]}>
          {status !== "completed" ? status : matchResultText}
        </Text>
      </View>

      {/* Player Stats Card */}
      {playerStats ? (
        <View style={[styles.statsCard, themeStyles.statsCard]}>
          {/* Header with MVP */}
          <View style={styles.statsHeader}>
            <MaterialIcons name="stars" size={20} color="#FFD700" />
            <Text style={[styles.mvpName, themeStyles.mvpName]}>
              {playerStats?.name}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Batting Stats */}
            <View style={styles.statColumn}>
              <Text style={[styles.statLabel, themeStyles.statLabel]}>
                Batting
              </Text>
              <Text style={[styles.statValue, themeStyles.statValue]}>
                {playerStats?.runs}
                <Text style={styles.statUnit}>({playerStats?.ballsFaced})</Text>
              </Text>
              <Text style={[styles.statMeta, themeStyles.statMeta]}>
                {playerStats &&
                  `${playerStats.sixes} × 6s • ${playerStats.fours} × 4s`}
              </Text>
            </View>

            {/* Divider */}
            <View style={[styles.statDivider, themeStyles.statDivider]} />

            {/* Bowling Stats */}
            <View style={styles.statColumn}>
              <Text style={[styles.statLabel, themeStyles.statLabel]}>
                Bowling
              </Text>
              <Text style={[styles.statValue, themeStyles.statValue]}>
                {playerStats?.wickets}
                <Text style={styles.statUnit}>
                  -{playerStats?.runsConceded}
                </Text>
              </Text>
              <Text style={[styles.statMeta, themeStyles.statMeta]}>
                {playerStats &&
                  `${playerStats.overs}.${playerStats.ballsBowled} overs`}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.loadingContainer, themeStyles.loadingContainer]}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={[styles.loadingText, themeStyles.loadingText]}>
            Selecting man of the match...
          </Text>
        </View>
      )}

      {/* New Match Button */}
      <TouchableOpacity
        style={[styles.button, themeStyles.button]}
        disabled={!playerStats}
        onPress={onNewMatch}
      >
        <Text style={[styles.buttonText, !playerStats && { opacity: 0.5 }]}>
          Start new match
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;

const styles = StyleSheet.create({
  card: {
    width: windowWidth * 0.9,
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  resultContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  winnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  winner: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    marginLeft: 8,
    textAlign: "center",
  },
  score: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
  mvpContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },

  mvpBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    justifyContent: "center",
  },
  mvpName: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  button: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "700",
  },
  statsContainer: {
    width: "100%",
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  compactStats: {
    alignItems: "center",
  },
  statExtras: {
    fontSize: 14,
    marginTop: 4,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  statsCard: {
    width: "100%",
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "100%",
    marginHorizontal: 16,
  },
  statUnit: {
    fontSize: 14,
    opacity: 0.7,
  },
  statMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

const darkStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E",
    borderColor: "#333",
  },
  title: {
    color: "#FFFFFF",
  },
  winner: {
    color: "#4CAF50",
  },
  score: {
    color: "#FFFFFF",
  },

  mvpBox: {
    backgroundColor: "#2A2A2A",
  },
  mvpName: {
    color: "#FFFFFF",
  },
  button: {
    backgroundColor: "#1976D2",
  },
  resultText: {
    color: "#FFFFFF",
  },
  statsSection: {
    backgroundColor: "#2A2A2A",
  },
  statValue: {
    color: "#FFFFFF",
  },
  statLabel: {
    color: "#AAAAAA",
  },
  statExtras: {
    color: "#AAAAAA",
  },
  statsCard: {
    backgroundColor: "#2A2A2A",
  },
  statsHeader: {
    borderBottomColor: "#404040",
  },
  statDivider: {
    backgroundColor: "#404040",
  },
  statMeta: {
    color: "#888888",
  },
  loadingContainer: {
    backgroundColor: "#2A2A2A",
  },
  loadingText: {
    color: "#FFFFFF",
  },
});

const lightStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E0E0E0",
  },
  title: {
    color: "#333333",
  },
  winner: {
    color: "#2E7D32",
  },
  score: {
    color: "#333333",
  },

  mvpBox: {
    backgroundColor: "#F5F5F5",
  },
  mvpName: {
    color: "#333333",
  },
  button: {
    backgroundColor: "#2196F3",
  },
  resultText: {
    color: "#000000",
  },
  statsSection: {
    backgroundColor: "#F5F5F5",
  },
  statValue: {
    color: "#333333",
  },
  statLabel: {
    color: "#666666",
  },
  statExtras: {
    color: "#666666",
  },
  statsCard: {
    backgroundColor: "#F5F5F5",
  },
  statsHeader: {
    borderBottomColor: "#E0E0E0",
  },
  statDivider: {
    backgroundColor: "#E0E0E0",
  },
  statMeta: {
    color: "#666666",
  },
  loadingContainer: {
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    color: "#333333",
  },
});

export default MatchResult;
