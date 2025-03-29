import { View, Text, StyleSheet, Dimensions } from "react-native";
import { match } from "@/types/match";
import { currentTotalScore } from "@/types/currentTotalScore";
import { useAppContext } from "@/context/AppContext";
import { getMatchResultText } from "@/utils/getMatchResultText";

const windowWidth = Dimensions.get("window").width;

const MatchScoreBar = ({
  match,
  finalFirstInningsScore,
  finalSecondInningsScore,
}: {
  match: match;
  finalFirstInningsScore: currentTotalScore;
  finalSecondInningsScore: currentTotalScore;
}) => {
  const { currentTheme } = useAppContext();

  const calculateRequiredRate = () => {
    const runsNeeded =
      finalFirstInningsScore.totalRuns - finalSecondInningsScore.totalRuns + 1;

    const ballsLeft =
      match.overs * 6 -
      (finalSecondInningsScore.totalOvers * 6 +
        finalSecondInningsScore.totalBalls);

    const oversLeft = ballsLeft / 6;

    return (runsNeeded / oversLeft).toFixed(2);
  };

  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={[styles.statusBar, themeStyles.statusBar]}>
      {match.status === "completed" ? (
        <Text style={[styles.resultText, themeStyles.resultText]}>
          {getMatchResultText(
            match,
            finalFirstInningsScore,
            finalSecondInningsScore
          )}
        </Text>
      ) : match.status === "live" ? (
        <View style={styles.liveContainer}>
          <View style={styles.mainInfoContainer}>
            <Text style={[styles.inProgressText, themeStyles.inProgressText]}>
              {match.team2} need{" "}
              <Text style={styles.numberText}>
                {finalFirstInningsScore.totalRuns -
                  finalSecondInningsScore.totalRuns +
                  1}
              </Text>{" "}
              runs in{" "}
              <Text style={styles.numberText}>
                {match.overs * 6 -
                  (finalSecondInningsScore.totalOvers * 6 +
                    finalSecondInningsScore.totalBalls)}
              </Text>{" "}
              balls
            </Text>
          </View>
          <View style={styles.rrContainer}>
            <Text style={[styles.rrText, themeStyles.inProgressText]}>
              RR:{" "}
              <Text style={styles.numberText}>{calculateRequiredRate()}</Text>
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.noResultText, themeStyles.noResultText]}>
          Match {match.status}
        </Text>
      )}
    </View>
  );
};

export default MatchScoreBar;

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: windowWidth,
    borderBottomWidth: 0.5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  liveContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainInfoContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  rrContainer: {
    marginLeft: 20,
    alignItems: "flex-end",
  },
  resultText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inProgressText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  numberText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rrText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  noResultText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

const darkStyles = StyleSheet.create({
  statusBar: {
    backgroundColor: "#18181b",
    borderBottomColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000000",
  },
  resultText: {
    color: "#22c55e",
  },
  inProgressText: {
    color: "#38bdf8",
  },
  noResultText: {
    color: "#fbbf24",
  },
});

const lightStyles = StyleSheet.create({
  statusBar: {
    backgroundColor: "#ffffff",
    borderBottomColor: "rgba(0,0,0,0.08)",
    shadowColor: "rgba(0,0,0,0.25)",
  },
  resultText: {
    color: "#15803d",
  },
  inProgressText: {
    color: "#0369a1",
  },
  noResultText: {
    color: "#b45309",
  },
});
