import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

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
  return (
    <View style={styles.container}>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>
          {totalScore.toString()}/{wickets.toString()}
        </Text>
        <Text style={styles.oversText}>
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
                    <View style={styles.overSummary}>
                      <Text style={styles.ballScoreText}>
                        {overs.reduce((sum, over) => sum + over.totalRun, 0)}
                      </Text>
                    </View>
                  ) : null}
                  <View key={ballIndex} style={styles.ballScore}>
                    <Text style={styles.ballScoreText}>
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
    backgroundColor: "#282c34",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#009688",
    borderRadius: 6,
  },
  oversText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#ff5722",
    borderRadius: 6,
  },
  inningsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ballScore: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    elevation: 2,
  },
  ballScoreText: {
    fontSize: 10,
    textAlign: "center",
    color: "#000000",
  },
  overSummary: {
    width: 35,
    height: 35,
    // borderRadius: 17.5,
    backgroundColor: "#b0b0b0",
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

export default ScoreBoard;
