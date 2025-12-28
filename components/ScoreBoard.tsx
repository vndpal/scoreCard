import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAppContext } from "@/context/AppContext";

const ScoreBoard = ({
  totalScore,
  wickets,
  overs,
  balls,
  scorePerInning,
  teamName
}: {
  totalScore: Number;
  wickets: Number;
  overs: Number;
  balls: Number;
  scorePerInning: scorePerInning;
  teamName: string;
}) => {
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, themeStyles.container]}>
      <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
        <Text style={[styles.scoreText, themeStyles.scoreText]}>
          {totalScore.toString()}/{wickets.toString()}
        </Text>
        <View style={styles.scoreDetailsRow}>
          <Text style={[styles.teamNameText, themeStyles.teamNameText]}>
            {teamName}
          </Text>
          <Text style={[styles.oversText, themeStyles.oversText]}>
            {overs.toString()}.{balls.toString()}
          </Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.inningsContainer}>
          {scorePerInning.map((overs, index) => (
            <View style={[styles.oversContainer, themeStyles.oversContainer]} key={index}>
              <View style={[styles.overSummaryContainer, themeStyles.overSummaryContainer]}>
                <Text style={[styles.overSummaryText, themeStyles.overSummaryText]}>
                  Ov {scorePerInning.length - index} | {overs.reduce((sum, over) => sum + over.totalRun, 0)} Runs
                </Text>
              </View>
              <View style={styles.ballsRow}>
                {overs.map((score: scorePerBall, ballIndex: number) => {
                  let ballStyle = {};
                  let textStyle = {};

                  // Determine basic event type for styling
                  const isWicket = score.isWicket;
                  const isNoBall = score.isNoBall;
                  const isSix = score.run === 6;
                  const isFour = score.run === 4;

                  // Apply styles based on priority
                  if (isWicket) {
                    ballStyle = themeStyles.ballWicket;
                    textStyle = themeStyles.ballTextWicket;
                  } else if (isNoBall) {
                    ballStyle = themeStyles.ballNoBall;
                    textStyle = themeStyles.ballTextNoBall;
                  } else if (isSix) {
                    ballStyle = themeStyles.ballSix;
                    textStyle = themeStyles.ballTextSix;
                  } else if (isFour) {
                    ballStyle = themeStyles.ballFour;
                    textStyle = themeStyles.ballTextFour;
                  }

                  return (
                    <View style={styles.ballsContainer} key={ballIndex}>
                      <View
                        key={ballIndex}
                        style={[
                          styles.ballScore,
                          themeStyles.ballScore,
                          ballStyle // Apply dynamic style
                        ]}
                      >
                        <Text
                          style={[
                            styles.ballScoreText,
                            themeStyles.ballScoreText,
                            textStyle // Apply dynamic text style
                          ]}
                        >
                          {score.isNoBall
                            ? "NB "
                            : score.isWideBall
                              ? "WD "
                              : ""}
                          {score.isWicket ? "W " : ""}
                          {(score.run > 0 || (!score.isNoBall && !score.isWideBall && !score.isWicket)) ? score.run.toString() : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
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
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    marginRight: 2,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  scoreDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  oversText: {
    fontSize: 12,
    fontWeight: "bold",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  teamNameText: {
    fontSize: 12,
    fontWeight: "bold",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  inningsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ballScore: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
    elevation: 1,
    borderWidth: 1,
    borderRadius: 13,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ballScoreText: {
    fontSize: 9,
    textAlign: "center",
    alignItems: 'center',
    justifyContent: 'center',
  },
  oversContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: 'center',
    marginRight: 8,
    marginLeft: 2,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1.5,
    elevation: 4, // slightly higher elevation for card feel
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  overSummaryContainer: {
    marginBottom: 4,
    paddingHorizontal: 8, // slightly more padding for the pill
    paddingVertical: 2,
    borderRadius: 12, // fully rounded pill
    alignItems: 'center',
    justifyContent: 'center',
  },
  overSummaryText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: 'uppercase',
  },
  ballsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  teamNameText: {
    color: "#ffffff",
    backgroundColor: "#f57f17",
  },
  ballScore: {
    backgroundColor: "#3e4451",
    borderColor: "#565c64",
    shadowColor: "#000000",
  },
  ballScoreText: {
    color: "#abb2bf",
  },
  oversContainer: {
    backgroundColor: '#333842', // Distinct card background for dark mode
    borderColor: '#5c6370',
    shadowColor: "#000",
  },
  overSummaryContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker pill
  },
  overSummaryText: {
    color: '#dcdcdc',
  },
  // Dark Mode Specific Event Styles
  ballSix: {
    backgroundColor: '#4caf50', // Green
    borderColor: '#388e3c',
  },
  ballTextSix: {
    color: '#ffffff',
  },
  ballFour: {
    backgroundColor: '#81c784', // Less green (Light Green)
    borderColor: '#66bb6a',
  },
  ballTextFour: {
    color: '#000000', // Better contrast on light green
  },
  ballWicket: {
    backgroundColor: '#ef5350', // Red
    borderColor: '#e53935',
  },
  ballTextWicket: {
    color: '#ffffff',
  },
  ballNoBall: {
    backgroundColor: '#fdd835', // Yellowish Warning
    borderColor: '#fbc02d',
  },
  ballTextNoBall: {
    color: '#000000',
  },
});
const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderBottomColor: "#e9ecef",
    shadowColor: "#adb5bd",
  },
  scoreContainer: {
  },
  scoreText: {
    color: "#ffffff",
    backgroundColor: "#28a745",
  },
  oversText: {
    color: "#ffffff",
    backgroundColor: "#007bff",
  },
  teamNameText: {
    color: "#ffffff",
    backgroundColor: "#007bff",
  },
  ballScore: {
    backgroundColor: "#ffffff",
    borderColor: "#dee2e6",
    shadowColor: "#adb5bd",
  },
  ballScoreText: {
    color: "#495057",
  },
  oversContainer: {
    backgroundColor: '#ffffff', // Distinct card background for light mode
    borderColor: '#ced4da',
    shadowColor: "#adb5bd",
  },
  overSummaryContainer: {
    backgroundColor: '#e9ecef', // Lighter pill
  },
  overSummaryText: {
    color: '#495057',
  },
  // Light Mode Specific Event Styles
  ballSix: {
    backgroundColor: '#2e7d32', // Darker Green for light mode contrast
    borderColor: '#1b5e20',
  },
  ballTextSix: {
    color: '#ffffff',
  },
  ballFour: {
    backgroundColor: '#4caf50', // Standard Green (less "deep" than 6)
    borderColor: '#388e3c',
  },
  ballTextFour: {
    color: '#ffffff',
  },
  ballWicket: {
    backgroundColor: '#d32f2f', // Red
    borderColor: '#c62828',
  },
  ballTextWicket: {
    color: '#ffffff',
  },
  ballNoBall: {
    backgroundColor: '#ffeb3b', // Yellow
    borderColor: '#fbc02d',
  },
  ballTextNoBall: {
    color: '#000000',
  },
});

export default ScoreBoard;
