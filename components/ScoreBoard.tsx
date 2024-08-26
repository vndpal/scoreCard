import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";

const ScoreBoard = ({
  totalScore,
  wickets,
  overs,
  balls,
  scorePerInning,
}: {
  totalScore: Number;
  wickets: Number;
  overs: Number;
  balls: Number;
  scorePerInning: scorePerInning;
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, themeStyles.container]}>
      <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
        <Text style={[styles.scoreText, themeStyles.scoreText]}>
          {totalScore.toString()}/{wickets.toString()}
        </Text>
        <Text style={[styles.oversText, themeStyles.oversText]}>
          {overs.toString()}.{balls.toString()}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.inningsContainer}>
          {scorePerInning.map((overs, index) => (
            <View style={styles.oversContainer} key={index}>
              {overs.map((score: scorePerBall, ballIndex: number) => (
                <View style={styles.ballsContainer} key={ballIndex}>
                  {score.isOverEnd ? (
                    <View style={[styles.overSummary, themeStyles.overSummary]}>
                      <Text
                        style={[
                          styles.ballScoreText,
                          themeStyles.ballScoreText,
                        ]}
                      >
                        {overs.reduce((sum, over) => sum + over.totalRun, 0)}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    key={ballIndex}
                    style={[styles.ballScore, themeStyles.ballScore]}
                  >
                    <Text
                      style={[styles.ballScoreText, themeStyles.ballScoreText]}
                    >
                      {score.isNoBall
                        ? "NB + "
                        : score.isWideBall
                        ? "WD + "
                        : ""}
                      {score.isWicket ? "W + " : ""}
                      {score.run.toString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  oversText: {
    fontSize: 18,
    fontWeight: "bold",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  inningsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ballScore: {
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    elevation: 2,
    borderWidth: 1, // Slightly thicker border for definition
    borderRadius: 6, // Rounded corners for a modern look
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  ballScoreText: {
    fontSize: 10,
    textAlign: "center",
  },
  overSummary: {
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    elevation: 2,
  },
  oversContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ballsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#282c34",
    borderBottomColor: "#444c56",
    shadowColor: "#000000",
  },
  scoreContainer: {
    backgroundColor: "#1c1e22",
  },
  scoreText: {
    color: "#ffffff",
    backgroundColor: "#00796b",
  },
  oversText: {
    color: "#ffffff",
    backgroundColor: "#f57f17",
  },
  ballScore: {
    backgroundColor: "#f5f5f5", // Very light gray background for contrast
    borderColor: "#cccccc", // Light gray border for subtle contrast
    shadowColor: "#000000", // Dark shadow for depth
  },
  ballScoreText: {
    color: "#000000",
    fontWeight: "bold",
  },
  overSummary: {
    backgroundColor: "#b0b0b0",
  },
});
const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff", // Bright white background
    borderBottomColor: "#e0e0e0", // Subtle border
    shadowColor: "#b0b0b0", // Light shadow
  },
  scoreContainer: {
    backgroundColor: "#f0f4f8", // Light, cool background
  },
  scoreText: {
    color: "#333333", // Dark gray for readability
    backgroundColor: "#4caf50", // Vibrant green for score
  },
  oversText: {
    color: "#333333", // Dark gray for readability
    backgroundColor: "#2196f3", // Bright blue for overs
  },
  ballScore: {
    backgroundColor: "#ffffff", // Clean white background
    borderColor: "#dcdcdc", // Light gray border for a modern look
    shadowColor: "#b0b0b0", // Light shadow for subtle depth
  },
  ballScoreText: {
    color: "#333333", // Dark gray text for contrast
    fontWeight: "bold",
  },
  overSummary: {
    backgroundColor: "#e3f2fd", // Light blue for summary
  },
});

export default ScoreBoard;
