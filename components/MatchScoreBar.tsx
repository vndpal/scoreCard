import { View, Text, StyleSheet, Dimensions } from "react-native";
import { match } from "@/types/match";
import { currentTotalScore } from "@/types/currentTotalScore";

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

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#282c34", // Dark background
    width: windowWidth,
    borderBottomWidth: 1,
    borderBottomColor: "#444c56", // Subtle border color
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  resultText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#cddc39", // Light lime green for completed results
  },
  inProgressText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64b5f6", // Light blue for in-progress status
  },
});
