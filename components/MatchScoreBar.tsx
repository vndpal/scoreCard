import { View, Text, StyleSheet } from "react-native";
import { match } from "@/types/match";
import { currentTotalScore } from "@/types/currentTotalScore";

const MatchScoreBar = ({
  match,
  finalFirstInningsScore,
  finalSecondInningsScore,
}: {
  match: match;
  finalFirstInningsScore: currentTotalScore;
  finalSecondInningsScore: currentTotalScore;
}) => {
  return (
    <View style={styles.statusBar}>
      {match.status == "completed" ? (
        match.winner == "team1" ? (
          <Text style={styles.resultText}>
            {match.team1} won by{" "}
            {finalFirstInningsScore.totalRuns -
              finalSecondInningsScore.totalRuns}{" "}
            runs
          </Text>
        ) : (
          <Text style={styles.resultText}>
            {match.team2} won by{" "}
            {match.wickets! - finalSecondInningsScore.totalWickets} wickets &{" "}
            {match.overs * 6 -
              (finalSecondInningsScore.totalOvers * 6 +
                finalSecondInningsScore.totalBalls)}{" "}
            balls left
          </Text>
        )
      ) : (
        <Text style={styles.inProgressText}>
          {match.team2} need{" "}
          {finalFirstInningsScore.totalRuns -
            finalSecondInningsScore.totalRuns +
            1}{" "}
          runs in{" "}
          {match.overs * 6 -
            (finalSecondInningsScore.totalOvers * 6 +
              finalSecondInningsScore.totalBalls)}{" "}
          balls | R.R.{" "}
          {(
            (finalFirstInningsScore.totalRuns -
              finalSecondInningsScore.totalRuns +
              1) /
            (match.overs - finalSecondInningsScore.totalOvers)
          ).toFixed(2)}
        </Text>
      )}
    </View>
  );
};

export default MatchScoreBar;

import { Dimensions } from "react-native";

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8, // Reduced padding
    backgroundColor: "#f4f4f4",
    width: windowWidth,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  resultText: {
    fontSize: 15, // Reduced font size
    fontWeight: "bold",
    color: "#1b5e20",
  },
  inProgressText: {
    fontSize: 15, // Reduced font size
    color: "#0d47a1",
    fontWeight: "bold",
  },
});
