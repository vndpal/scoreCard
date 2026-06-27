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
  teamName,
  isLiveMatch = false,
  isActiveInning = false,
}: {
  totalScore: Number;
  wickets: Number;
  overs: Number;
  balls: Number;
  scorePerInning: scorePerInning;
  teamName: string;
  isLiveMatch?: boolean;
  isActiveInning?: boolean;
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
          {scorePerInning.map((over, index) => {
            // Bowler for this over (same across the over; fall back to the
            // first ball that actually carries a bowler).
            const bowlerName =
              over.find((ball) => ball.bowler)?.bowler?.name ?? "";
            const overRuns = over.reduce((sum, ball) => sum + ball.totalRun, 0);

            // Over label in cricket notation. Wides/no-balls don't count
            // toward the over's six deliveries, so count only legal balls.
            // While the over is in progress show "<completed overs>.<balls>"
            // (e.g. 3 balls into the 3rd over -> "2.3"); once six legal balls
            // are bowled the over is complete and we show the whole number.
            const overNumber = scorePerInning.length - index;
            const legalBalls = over.filter(
              (ball) => !ball.isNoBall && !ball.isWideBall
            ).length;
            const overLabel =
              legalBalls >= 6
                ? `${overNumber}`
                : `${overNumber - 1}.${legalBalls}`;

            // Group consecutive balls faced by the same batsman so the name is
            // shown once per group. This keeps the ball circles the same size
            // while still labelling who faced each ball.
            const groups: { batsman: string; balls: scorePerBall[] }[] = [];
            over.forEach((ball) => {
              const batsman = ball.strikerBatter?.name ?? "";
              const lastGroup = groups[groups.length - 1];
              if (lastGroup && lastGroup.batsman === batsman) {
                lastGroup.balls.push(ball);
              } else {
                groups.push({ batsman, balls: [ball] });
              }
            });

            const isOngoingOver = isLiveMatch && isActiveInning && index === 0;

            return (
              <View
                style={[styles.oversContainer, themeStyles.oversContainer]}
                key={index}
              >
                {/* Over header: OV n · bowler · runs */}
                <View style={styles.overHeaderRow}>
                  <View style={[styles.overNumPill, themeStyles.overNumPill]}>
                    <Text style={[styles.overNumText, themeStyles.overNumText]}>
                      OV {overLabel}
                    </Text>
                  </View>
                  {bowlerName ? (
                    <View style={styles.bowlerWrap}>
                      <View style={[
                        styles.bowlerDot, 
                        themeStyles.bowlerDot,
                        isOngoingOver && { backgroundColor: "#4caf50" }
                      ]} />
                      <Text
                        style={[styles.bowlerText, themeStyles.bowlerText]}
                        numberOfLines={1}
                      >
                        {bowlerName}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.overRunsText, themeStyles.overRunsText]}>
                    {overRuns}
                    <Text style={styles.overRunsLabel}>
                      {` ${overRuns === 1 ? "run" : "runs"}`}
                    </Text>
                  </Text>
                </View>

                {/* Balls grouped by batsman */}
                <View style={styles.groupsRow}>
                  {groups.map((group, groupIndex) => (
                    <View style={styles.group} key={groupIndex}>
                      <View style={styles.groupBalls}>
                        {group.balls.map(
                          (score: scorePerBall, ballIndex: number) => {
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
                              <View
                                key={ballIndex}
                                style={[
                                  styles.ballScore,
                                  themeStyles.ballScore,
                                  ballStyle, // Apply dynamic style
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.ballScoreText,
                                    themeStyles.ballScoreText,
                                    textStyle, // Apply dynamic text style
                                  ]}
                                >
                                  {score.isNoBall
                                    ? "NB "
                                    : score.isWideBall
                                      ? "WD "
                                      : ""}
                                  {score.isWicket ? "W " : ""}
                                  {score.run > 0 ||
                                  (!score.isNoBall &&
                                    !score.isWideBall &&
                                    !score.isWicket)
                                    ? score.run.toString()
                                    : ""}
                                </Text>
                              </View>
                            );
                          }
                        )}
                      </View>
                      {/* bracket tying the group's balls to the batsman name */}
                      <View style={[styles.bracket, themeStyles.bracket]} />
                      <Text
                        style={[styles.batsmanName, themeStyles.batsmanName]}
                        numberOfLines={1}
                      >
                        {group.batsman}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
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
    alignItems: "center",
    justifyContent: "center",
  },
  oversContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    marginRight: 8,
    marginLeft: 2,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1.5,
    elevation: 4, // slightly higher elevation for card feel
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  // ---- Over header (OV pill · bowler · runs) ----
  overHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 6,
    marginBottom: 5,
  },
  overNumPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overNumText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  bowlerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  bowlerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bowlerText: {
    fontSize: 10,
    fontWeight: "600",
  },
  overRunsText: {
    fontSize: 11,
    fontWeight: "800",
  },
  overRunsLabel: {
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  // ---- Balls grouped by batsman ----
  groupsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  group: {
    flexDirection: "column",
    alignItems: "center",
  },
  groupBalls: {
    flexDirection: "row",
    gap: 5,
  },
  bracket: {
    alignSelf: "stretch",
    height: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginTop: 2,
  },
  batsmanName: {
    fontSize: 7,
    fontWeight: "600",
    lineHeight: 9,
    marginTop: 1,
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
    backgroundColor: "#333842", // Distinct card background for dark mode
    borderColor: "#5c6370",
    shadowColor: "#000",
  },
  overNumPill: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  overNumText: {
    color: "#dcdcdc",
  },
  bowlerDot: {
    backgroundColor: "#7f8794",
  },
  bowlerText: {
    color: "#cdd3db",
  },
  overRunsText: {
    color: "#ffffff",
  },
  bracket: {
    borderColor: "#565c64",
  },
  batsmanName: {
    color: "#9aa1ab",
  },
  // Dark Mode Specific Event Styles
  ballSix: {
    backgroundColor: "#4caf50", // Green
    borderColor: "#388e3c",
  },
  ballTextSix: {
    color: "#ffffff",
  },
  ballFour: {
    backgroundColor: "#81c784", // Less green (Light Green)
    borderColor: "#66bb6a",
  },
  ballTextFour: {
    color: "#000000", // Better contrast on light green
  },
  ballWicket: {
    backgroundColor: "#ef5350", // Red
    borderColor: "#e53935",
  },
  ballTextWicket: {
    color: "#ffffff",
  },
  ballNoBall: {
    backgroundColor: "#fdd835", // Yellowish Warning
    borderColor: "#fbc02d",
  },
  ballTextNoBall: {
    color: "#000000",
  },
});
const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderBottomColor: "#e9ecef",
    shadowColor: "#adb5bd",
  },
  scoreContainer: {},
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
    backgroundColor: "#ffffff", // Distinct card background for light mode
    borderColor: "#ced4da",
    shadowColor: "#adb5bd",
  },
  overNumPill: {
    backgroundColor: "#eef1f4",
  },
  overNumText: {
    color: "#5b626b",
  },
  bowlerDot: {
    backgroundColor: "#9aa1a9",
  },
  bowlerText: {
    color: "#3a3f47",
  },
  overRunsText: {
    color: "#2b2f36",
  },
  bracket: {
    borderColor: "#d9dde2",
  },
  batsmanName: {
    color: "#7a828c",
  },
  // Light Mode Specific Event Styles
  ballSix: {
    backgroundColor: "#2e7d32", // Darker Green for light mode contrast
    borderColor: "#1b5e20",
  },
  ballTextSix: {
    color: "#ffffff",
  },
  ballFour: {
    backgroundColor: "#4caf50", // Standard Green (less "deep" than 6)
    borderColor: "#388e3c",
  },
  ballTextFour: {
    color: "#ffffff",
  },
  ballWicket: {
    backgroundColor: "#d32f2f", // Red
    borderColor: "#c62828",
  },
  ballTextWicket: {
    color: "#ffffff",
  },
  ballNoBall: {
    backgroundColor: "#ffeb3b", // Yellow
    borderColor: "#fbc02d",
  },
  ballTextNoBall: {
    color: "#000000",
  },
});

export default ScoreBoard;
