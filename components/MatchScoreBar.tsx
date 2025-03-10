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
        <Text style={[styles.inProgressText, themeStyles.inProgressText]}>
          {match.team2} need{" "}
          {finalFirstInningsScore.totalRuns -
            finalSecondInningsScore.totalRuns +
            1}{" "}
          runs in{" "}
          {match.overs * 6 -
            (finalSecondInningsScore.totalOvers * 6 +
              finalSecondInningsScore.totalBalls)}{" "}
          balls | R.R. {calculateRequiredRate()}
        </Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    width: windowWidth,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  resultText: {
    fontSize: 15,
    fontWeight: "500",
  },
  inProgressText: {
    fontSize: 15,
    fontWeight: "500",
  },
  noResultText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

const darkStyles = StyleSheet.create({
  statusBar: {
    backgroundColor: "#282c34",
    borderBottomColor: "#444c56",
    shadowColor: "#000000",
  },
  resultText: {
    color: "#cddc39", // Light lime green for completed results
  },
  inProgressText: {
    color: "#64b5f6", // Light blue for in-progress status
  },
  noResultText: {
    color: "#ffeb3b", // Yellow for no result status
  },
});

const lightStyles = StyleSheet.create({
  statusBar: {
    backgroundColor: "#f9f9f9",
    borderBottomColor: "#cccccc",
    shadowColor: "#888888",
  },
  resultText: {
    color: "#4caf50", // Green for completed results
  },
  inProgressText: {
    color: "#1976d2", // Blue for in-progress status
  },
  noResultText: {
    color: "#ff9800", // Orange for no result status
  },
});
