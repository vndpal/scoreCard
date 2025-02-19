import { StyleSheet, View, TouchableOpacity, Text, Alert } from "react-native";
import ScoreBoard from "@/components/ScoreBoard";
import { useEffect, useState } from "react";
import { scorePerBall } from "@/types/scorePerBall";
import { scorePerOver } from "@/types/scorePerOver";
import { scorePerInning } from "@/types/scorePerInnig";
import { match } from "@/types/match";
import { getItem, setItem } from "@/utils/asyncStorage";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import { Icon } from "react-native-elements";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { currentTotalScore } from "@/types/currentTotalScore";
import { Dimensions } from "react-native";
import MatchScoreBar from "@/components/MatchScoreBar";
import PickPlayer from "@/components/PickPlayer";
import { player } from "@/types/player";
import MatchPlayerStatsBar from "@/components/MatchPlayerStatsBar";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { updatePlayerCareerStats } from "@/utils/updatePlayerCareerStats";
import { useTheme } from "@/context/ThemeContext";
import { updateManOfTheMatch } from "@/utils/updateManOfTheMatch";
import { matchResult } from "@/types/matchResult";
import MatchTimer from "@/components/MatchTimer";
import { Timestamp } from "@react-native-firebase/firestore";
import { Team } from "@/firebase/models/Team";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { Match } from "@/firebase/models/Match";
import { MatchScore } from "@/firebase/models/MatchScores";
import { undoPlayerCareerStats } from "@/utils/undoPlayerCareerStats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Club } from "@/types/club";
import MatchResult from "@/components/MatchResult";
import { getMatchResultText } from "@/utils/getMatchResultText";
import * as Updates from "expo-updates";

export default function HomeScreen() {
  const router = useRouter();

  const [run, setRun] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [isWideBall, setIsWideBall] = useState(false);

  const [isFirstInning, setIsFirstInning] = useState(true);

  const [match, setMatch] = useState<match>({
    matchId: "",
    team1: "",
    team2: "",
    team1Fullname: "",
    team2Fullname: "",
    tossWin: "team1",
    choose: "batting",
    overs: 0,
    status: "noResult",
    isFirstInning: true,
    startDateTime: Timestamp.now(),
    endDateTime: Timestamp.now(),
    quickMatch: false,
    manOfTheMatch: "",
    currentScore: {
      team1: {
        totalRuns: 0,
        totalWickets: 0,
        totalOvers: 0,
        totalBalls: 0,
      },
      team2: {
        totalRuns: 0,
        totalWickets: 0,
        totalOvers: 0,
        totalBalls: 0,
      },
    },
    clubId: "",
  });
  const [playerMatchStats, setPlayerMatchStats] = useState<playerStats[]>([]);

  const [totalScore, setTotalScore] = useState<scorePerInning>([]);
  const [scoreSecondInnings, setScoreSecondInnings] = useState<scorePerInning>(
    []
  );
  const [scorePerOver, setScorePerOver] = useState<scorePerOver>([]);
  const [totalBalls, setTotalBalls] = useState<number>(0);

  const [finalFirstInningsScore, setFinalFirstInningsScore] =
    useState<currentTotalScore>({
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
    });
  const [finalSecondInningsScore, setFinalSecondInningsScore] =
    useState<currentTotalScore>({
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
    });

  const [batter1, setBatter1] = useState<player>();
  const [batter2, setBatter2] = useState<player>();
  const [outBatter, setOutBatter] = useState<player>();
  const [bowler, setBowler] = useState<player>();

  const [pickPlayerVisible, setPickPlayerVisible] = useState<boolean>(false);
  const [showLoader, setShowLoader] = useState<boolean>(false);
  const [isEntryDone, setIsEntryDone] = useState<boolean>(false);
  const [lastActivityDateTime, setLastActivityDateTime] = useState<Timestamp>(
    Timestamp.now()
  );
  const [manOfTheMatch, setManOfTheMatch] = useState<string>("");

  const { currentTheme, currentSettings } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    try {
      fetchMatch();
    } catch (error) {
      console.log("error", error);
    }
  }, []);

  const fetchMatch = async () => {
    try {
      setShowLoader(true);
      const isNewMatch = await getItem(STORAGE_ITEMS.IS_NEW_MATCH);
      if (!isNewMatch) {
        let club: Club | null = null;
        const clubFromStroage = await AsyncStorage.getItem(
          STORAGE_ITEMS.USER_CLUB
        );
        if (clubFromStroage) {
          club = JSON.parse(clubFromStroage);
        }
        if (!club || !club.id) {
          return;
        }
        const currentMatch = await Match.getLatestMatch(club.id);
        if (!currentMatch) {
          return;
        }

        const matchScoresFirstInning =
          await MatchScore.getByMatchIdInningNumber(currentMatch.matchId, 1);

        const matchScoresSecondInning =
          await MatchScore.getByMatchIdInningNumber(currentMatch.matchId, 2);

        let team1score: scorePerInning = [];
        let team2score: scorePerInning = [];

        if (matchScoresFirstInning) {
          team1score = matchScoresFirstInning.map((score) => score.overSummary);
        }

        if (matchScoresSecondInning) {
          team2score = matchScoresSecondInning.map(
            (score) => score.overSummary
          );
        }

        setMatch(currentMatch);
        setManOfTheMatch(currentMatch.manOfTheMatch);
        setIsFirstInning(currentMatch.isFirstInning);
        setTotalScore(team1score);

        await initiatePlayerMatchStats(currentMatch.matchId);

        if (team1score.length == 0) {
          clearAllState();
          console.log("team1score is empty or not defined");
          return;
        }

        const currnetInningstotalRuns = team1score.reduce(
          (acc: any, subArray: any[]) => {
            return (
              acc +
              subArray.reduce(
                (subAcc, ball: scorePerBall) =>
                  subAcc +
                  ball.run +
                  (ball.isNoBall || ball.isWideBall ? 1 : 0),
                0
              )
            );
          },
          0
        );
        let currnetInningstotalBalls = team1score[0].reduce(
          (acc: any, score: scorePerBall) =>
            acc + (score.isNoBall || score.isWideBall ? 0 : 1),
          0
        );
        let currnetInningstotalOvers = team1score.length - 1;
        currnetInningstotalOvers =
          currnetInningstotalBalls == 6
            ? currnetInningstotalOvers + 1
            : currnetInningstotalOvers;
        currnetInningstotalBalls =
          currnetInningstotalBalls == 6 ? 0 : currnetInningstotalBalls;
        const currnetInningstotalWickets = team1score.reduce(
          (acc: any, subArray: scorePerBall[]) => {
            return (
              acc +
              subArray.reduce(
                (subAcc, ball: scorePerBall) =>
                  subAcc + (ball.isWicket ? 1 : 0),
                0
              )
            );
          },
          0
        );

        setFinalFirstInningsScore({
          totalRuns: currnetInningstotalRuns,
          totalWickets: currnetInningstotalWickets,
          totalOvers: currnetInningstotalOvers,
          totalBalls: currnetInningstotalBalls,
        });
        if (currentMatch.isFirstInning) {
          setTotalBalls(currnetInningstotalBalls);
          if (
            team1score.length > 0 &&
            team1score[0].length > 0 &&
            team1score[0][0].isOverEnd
          ) {
            setScorePerOver([]);
          } else {
            setScorePerOver(team1score[0]);
          }
          if (team1score[0][0].isOverEnd) {
            setBowler(undefined);
          } else {
            setBowler(team1score[0][0].bowler);
          }
          if (team1score[0][0].isWicket) {
            setBatter1(undefined);
          } else {
            setBatter1(team1score[0][0].strikerBatter);
          }
          setBatter2(team1score[0][0].nonStrikerBatter);
        }

        if (!currentMatch.isFirstInning) {
          if (team2score.length == 0) {
            setFinalSecondInningsScore({
              totalRuns: 0,
              totalWickets: 0,
              totalOvers: 0,
              totalBalls: 0,
            });
            setScoreSecondInnings([]);
            setScorePerOver([]);
            setTotalBalls(0);
            console.log("team2score is empty or not defined");
            return;
          }
          setScoreSecondInnings(team2score);
          if (team2score.length == 0) {
            console.log("team2score is empty or not defined");
            return;
          }
          const currnetInningstotalRuns = team2score.reduce(
            (acc: any, subArray: any[]) => {
              return (
                acc +
                subArray.reduce(
                  (subAcc, ball: scorePerBall) =>
                    subAcc +
                    ball.run +
                    (ball.isNoBall || ball.isWideBall ? 1 : 0),
                  0
                )
              );
            },
            0
          );
          let currnetInningstotalBalls = team2score[0].reduce(
            (acc: any, score: scorePerBall) =>
              acc + (score.isNoBall || score.isWideBall ? 0 : 1),
            0
          );
          let currnetInningstotalOvers = team2score.length - 1;
          currnetInningstotalOvers =
            currnetInningstotalBalls == 6
              ? currnetInningstotalOvers + 1
              : currnetInningstotalOvers;
          currnetInningstotalBalls =
            currnetInningstotalBalls == 6 ? 0 : currnetInningstotalBalls;
          const currnetInningstotalWickets = team2score.reduce(
            (acc: any, subArray: scorePerBall[]) => {
              return (
                acc +
                subArray.reduce(
                  (subAcc, ball: scorePerBall) =>
                    subAcc + (ball.isWicket ? 1 : 0),
                  0
                )
              );
            },
            0
          );

          setFinalSecondInningsScore({
            totalRuns: currnetInningstotalRuns,
            totalWickets: currnetInningstotalWickets,
            totalOvers: currnetInningstotalOvers,
            totalBalls: currnetInningstotalBalls,
          });
          setTotalBalls(currnetInningstotalBalls);
          if (
            team2score.length > 0 &&
            team2score[0].length > 0 &&
            team2score[0][0].isOverEnd
          ) {
            setScorePerOver([]);
          } else {
            setScorePerOver(team2score[0]);
          }
          if (team2score[0][0].isOverEnd) {
            setBowler(undefined);
          } else {
            setBowler(team2score[0][0].bowler);
          }

          if (team2score[0][0].isWicket) {
            setBatter1(undefined);
          } else {
            setBatter1(team2score[0][0].strikerBatter);
          }
          setBatter2(team2score[0][0].nonStrikerBatter);
        }
      }
    } finally {
      setShowLoader(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const fetchMatchAfterNewMatch = async () => {
        const isNewMatch = await getItem(STORAGE_ITEMS.IS_NEW_MATCH);
        if (isNewMatch) {
          clearAllState();
          let club: Club | null = null;
          const clubFromStroage = await AsyncStorage.getItem(
            STORAGE_ITEMS.USER_CLUB
          );
          if (clubFromStroage) {
            club = JSON.parse(clubFromStroage);
          }
          if (!club || !club.id) {
            return;
          }
          const latestMatch = await Match.getLatestMatch(club.id);
          if (latestMatch) {
            setMatch(latestMatch);
            await initiatePlayerMatchStats(latestMatch.matchId);
          }
          await setItem(STORAGE_ITEMS.IS_NEW_MATCH, false);
        }
      };
      fetchMatchAfterNewMatch();
    }, [])
  );

  const initiatePlayerMatchStats = async (currentMatchId: string) => {
    const playerMatchStats = await PlayerMatchStats.getByMatchId(
      currentMatchId
    );
    if (playerMatchStats) {
      setPlayerMatchStats(playerMatchStats.playerMatchStats);
    }
  };

  const clearAllState = () => {
    setTotalScore([]);
    setScoreSecondInnings([]);
    setFinalFirstInningsScore({
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
    });
    setFinalSecondInningsScore({
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
    });
    setIsFirstInning(true);
    setScorePerOver([]);
    setTotalBalls(0);
  };

  const handleRunPress = (run: string) => {
    setRun(parseInt(run));
    setIsEntryDone(true);
  };

  const handleWicket = () => {
    if (isWicket) {
      setOutBatter(undefined);
    }
    setIsWicket((prev) => !prev);
    setIsEntryDone(true);
  };

  const handleNoBall = () => {
    setIsNoBall((prev) => !prev);
    setIsWideBall(false);
    setIsEntryDone(true);
  };

  const handleWideBall = () => {
    setIsWideBall((prev) => !prev);
    setIsNoBall(false);
    setIsEntryDone(true);
  };

  const handleSubmit = async () => {
    try {
      setShowLoader(true);
      if (!match.quickMatch) {
        //logic for player pick start
        if (!bowler) {
          setPickPlayerVisible(true);
          return;
        } else if (!batter1) {
          setPickPlayerVisible(true);
          return;
        } else if (!batter2) {
          setPickPlayerVisible(true);
          return;
        }
      }
      //logic for player pick end
      setIsEntryDone(false);
      const extra = (isNoBall ? 1 : 0) + (isWideBall ? 1 : 0);
      const totalRun = run + extra;
      let scoreSecondInningsLocalState;
      let localFinalFirstInningsScore: currentTotalScore =
        finalFirstInningsScore;
      let localFinalSecondInningsScore: currentTotalScore =
        finalSecondInningsScore;
      if (isFirstInning) {
        localFinalFirstInningsScore = {
          ...finalFirstInningsScore,
          totalRuns: finalFirstInningsScore.totalRuns + totalRun,
          totalWickets:
            finalFirstInningsScore.totalWickets + (isWicket ? 1 : 0),
        };
        setFinalFirstInningsScore(localFinalFirstInningsScore);
      } else {
        localFinalSecondInningsScore = {
          ...finalSecondInningsScore,
          totalRuns: finalSecondInningsScore.totalRuns + totalRun,
          totalWickets:
            finalSecondInningsScore.totalWickets + (isWicket ? 1 : 0),
        };
        setFinalSecondInningsScore(localFinalSecondInningsScore);
      }

      let isValidBall = false;
      if (!isNoBall && !isWideBall) {
        const { updatedFirstInningsScore, updatedSecondInningsScore } =
          increaseOver(
            localFinalFirstInningsScore,
            localFinalSecondInningsScore
          );
        localFinalFirstInningsScore = updatedFirstInningsScore;
        localFinalSecondInningsScore = updatedSecondInningsScore;
        isValidBall = true;
      }
      // else if (isNoBall && isWicket) {
      //   increaseOver();
      //   isValidBall = true;
      // }

      const scoreThisBall: scorePerBall = {
        run: run,
        extra: (isNoBall ? 1 : 0) + (isWideBall ? 1 : 0),
        totalRun: totalRun,
        isWicket: isWicket,
        isNoBall: isNoBall,
        isWideBall: isWideBall,
        isOverEnd: isValidBall && totalBalls == 5,
        strikerBatter: batter1,
        nonStrikerBatter: batter2,
        bowler: bowler,
      };

      if (!match.quickMatch) {
        await updatePlayerMatchStats(scoreThisBall);
      }

      const scoreThisOver: scorePerOver = [scoreThisBall, ...scorePerOver];
      if (isFirstInning) {
        if (scorePerOver.length == 0) {
          const latestTotalScore = totalScore;
          latestTotalScore.unshift(scoreThisOver);
          setTotalScore(latestTotalScore);
        } else {
          const latestTotalScore = totalScore;
          latestTotalScore[0] = scoreThisOver;
          setTotalScore(latestTotalScore);
        }
      } else {
        if (scorePerOver.length == 0) {
          scoreSecondInningsLocalState = [scoreThisOver, ...scoreSecondInnings];
          setScoreSecondInnings([scoreThisOver, ...scoreSecondInnings]);
        } else {
          const latestTotalScore = scoreSecondInnings;
          latestTotalScore[0] = scoreThisOver;
          scoreSecondInningsLocalState = latestTotalScore;
          setScoreSecondInnings(latestTotalScore);
        }
      }

      await Match.update(match.matchId, {
        currentScore: {
          team1: localFinalFirstInningsScore,
          team2: localFinalSecondInningsScore,
        },
      });

      if (isFirstInning) {
        if (scorePerOver.length == 0) {
          await MatchScore.create({
            matchId: match.matchId,
            teamId: match.team1,
            inningNumber: 1,
            overNumber: totalScore.length,
            overSummary: [],
          });
        }

        await MatchScore.addBallScore(
          match.matchId,
          match.team1,
          1,
          totalScore.length,
          totalScore[0].length,
          scoreThisBall
        );
      } else {
        if (scorePerOver.length == 0) {
          await MatchScore.create({
            matchId: match.matchId,
            teamId: match.team2,
            inningNumber: 2,
            overNumber: scoreSecondInningsLocalState
              ? scoreSecondInningsLocalState.length
              : 0,
            overSummary: [],
          });
        }

        await MatchScore.addBallScore(
          match.matchId,
          match.team2,
          2,
          scoreSecondInningsLocalState
            ? scoreSecondInningsLocalState.length
            : 0,
          scoreSecondInningsLocalState
            ? scoreSecondInningsLocalState[0].length
            : 0,
          scoreThisBall
        );
      }

      setRun(0);
      setIsWicket(false);
      setIsNoBall(false);
      setIsWideBall(false);
      setOutBatter(undefined);

      // This block of code is to check if current over is completed
      if (isValidBall && totalBalls == 5) {
        setScorePerOver([]);
        setBowler(undefined);
        if (
          isFirstInning &&
          match.overs > 0 &&
          finalFirstInningsScore.totalOvers + 1 == match.overs
        ) {
          console.log("First Inning Completed");
          setIsFirstInning(false);
          setBowler(undefined);
          setBatter1(undefined);
          setBatter2(undefined);

          await Match.update(match.matchId, {
            isFirstInning: false,
          });
        } else if (
          !isFirstInning &&
          finalSecondInningsScore.totalOvers + 1 == match.overs
        ) {
          console.log("Second Inning Completed");
          let winner: "team1" | "team2" | undefined = "team1";
          let matchStatus: matchResult = "completed";
          if (
            finalSecondInningsScore.totalRuns + totalRun >
            finalFirstInningsScore.totalRuns
          ) {
            winner = "team2";
          } else if (
            finalSecondInningsScore.totalRuns + totalRun ==
            finalFirstInningsScore.totalRuns
          ) {
            matchStatus = "tied";
          }
          setMatch({ ...match, winner: winner, status: matchStatus });
          await Match.update(match.matchId, {
            status: matchStatus,
            winner: winner,
            endDateTime: Timestamp.now(),
          });

          if (!match.quickMatch) {
            await updatePlayerCareerStats(playerMatchStats);
            const manOfTheMatch = await updateManOfTheMatch(match.matchId);
            setManOfTheMatch(manOfTheMatch);
          }
          await Updates.reloadAsync();
          return;
        }
      } else {
        setScorePerOver(scoreThisOver);
      }

      if (
        !isFirstInning &&
        finalSecondInningsScore.totalRuns + totalRun >
          finalFirstInningsScore.totalRuns
      ) {
        console.log("Second Inning Completed");
        let winner: "team1" | "team2" | undefined = "team2";
        setMatch({
          ...match,
          status: "completed",
          endDateTime: Timestamp.now(),
          winner: winner,
        });

        await Match.update(match.matchId, {
          status: "completed",
          endDateTime: Timestamp.now(),
          winner: winner,
        });

        if (!match.quickMatch) {
          await updatePlayerCareerStats(playerMatchStats);
          const manOfTheMatch = await updateManOfTheMatch(match.matchId);
          setManOfTheMatch(manOfTheMatch);
        }
        await Updates.reloadAsync();
      }
    } finally {
      setShowLoader(false);
      setLastActivityDateTime(Timestamp.now());
      //todo add a vibrate effet to show action is done
    }
  };

  function increaseOver(
    localFinalFirstInningsScore: currentTotalScore,
    localFinalSecondInningsScore: currentTotalScore
  ): {
    updatedFirstInningsScore: currentTotalScore;
    updatedSecondInningsScore: currentTotalScore;
  } {
    const currentOverBalls = totalBalls + 1;
    if (currentOverBalls == 6) {
      if (isFirstInning) {
        localFinalFirstInningsScore = {
          ...localFinalFirstInningsScore,
          totalOvers: localFinalFirstInningsScore.totalOvers + 1,
          totalBalls: 0,
        };
        setFinalFirstInningsScore(localFinalFirstInningsScore);
      } else {
        localFinalSecondInningsScore = {
          ...localFinalSecondInningsScore,
          totalOvers: localFinalSecondInningsScore.totalOvers + 1,
          totalBalls: 0,
        };
        setFinalSecondInningsScore(localFinalSecondInningsScore);
      }
      setTotalBalls(0);
    } else {
      if (isFirstInning) {
        localFinalFirstInningsScore = {
          ...localFinalFirstInningsScore,
          totalBalls: currentOverBalls,
        };
        setFinalFirstInningsScore(localFinalFirstInningsScore);
      } else {
        localFinalSecondInningsScore = {
          ...localFinalSecondInningsScore,
          totalBalls: currentOverBalls,
        };
        setFinalSecondInningsScore(localFinalSecondInningsScore);
      }
      setTotalBalls(currentOverBalls);
    }
    return {
      updatedFirstInningsScore: localFinalFirstInningsScore,
      updatedSecondInningsScore: localFinalSecondInningsScore,
    };
  }

  const updatePlayerMatchStats = async (scoreThisBall: scorePerBall) => {
    const playerMatchStatsLocalState = playerMatchStats;
    if (playerMatchStatsLocalState && playerMatchStatsLocalState.length > 0) {
      const batterIndex = playerMatchStatsLocalState.findIndex(
        (playerStats: playerStats) =>
          playerStats.playerId == scoreThisBall.strikerBatter?.id
      );

      if (batterIndex > -1) {
        playerMatchStatsLocalState[batterIndex].runs += scoreThisBall.run;
        playerMatchStatsLocalState[batterIndex].ballsFaced +=
          scoreThisBall.isNoBall || scoreThisBall.isWideBall ? 0 : 1;
        playerMatchStatsLocalState[batterIndex].fours +=
          scoreThisBall.run == 4 ? 1 : 0;
        playerMatchStatsLocalState[batterIndex].sixes +=
          scoreThisBall.run == 6 ? 1 : 0;
        playerMatchStatsLocalState[batterIndex].strikeRate =
          (playerMatchStatsLocalState[batterIndex].runs /
            playerMatchStatsLocalState[batterIndex].ballsFaced) *
          100;
      }
      const bowlerIndex = playerMatchStatsLocalState.findIndex(
        (playerStats: playerStats) =>
          playerStats.playerId == scoreThisBall.bowler?.id
      );
      if (bowlerIndex > -1) {
        playerMatchStatsLocalState[bowlerIndex].runsConceded +=
          scoreThisBall.totalRun;
        playerMatchStatsLocalState[bowlerIndex].ballsBowled +=
          scoreThisBall.isNoBall || scoreThisBall.isWideBall ? 0 : 1;

        if (scoreThisBall.isOverEnd) {
          playerMatchStatsLocalState[bowlerIndex].ballsBowled = 0;
          playerMatchStatsLocalState[bowlerIndex].overs += 1;
        }
        playerMatchStatsLocalState[bowlerIndex].extras += scoreThisBall.extra;
        playerMatchStatsLocalState[bowlerIndex].foursConceded +=
          scoreThisBall.run == 4 ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].sixesConceded +=
          scoreThisBall.run == 6 ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].wickets +=
          scoreThisBall.isWicket ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].bowlingEconomy =
          playerMatchStatsLocalState[bowlerIndex].runsConceded /
          (playerMatchStatsLocalState[bowlerIndex].ballsBowled > 0
            ? playerMatchStatsLocalState[bowlerIndex].ballsBowled / 6
            : 1);
        playerMatchStatsLocalState[bowlerIndex].dotBalls +=
          scoreThisBall.run == 0 ? 1 : 0;
      }

      //check which batter is out
      let localBatter1 = batter1;
      let localBatter2 = batter2;

      if (
        scoreThisBall.isWicket &&
        scoreThisBall.strikerBatter?.id == outBatter?.id
      ) {
        localBatter1 = undefined;
        playerMatchStatsLocalState[batterIndex].isOut = true;
      } else if (
        scoreThisBall.isWicket &&
        scoreThisBall.nonStrikerBatter?.id == outBatter?.id
      ) {
        localBatter2 = undefined;
        const nonStrikerBatterIndex = playerMatchStatsLocalState.findIndex(
          (playerStats: playerStats) =>
            playerStats.playerId == scoreThisBall.nonStrikerBatter?.id
        );
        playerMatchStatsLocalState[nonStrikerBatterIndex].isOut = true;
      }

      setPlayerMatchStats(playerMatchStatsLocalState);

      await PlayerMatchStats.update(match.matchId, {
        playerMatchStats: playerMatchStatsLocalState,
      });

      //handle swap logic for batters
      let swap = false;
      if (scoreThisBall.run == 1 || scoreThisBall.run == 3) {
        swap = !swap;
      }
      if (scoreThisBall.isOverEnd) {
        swap = !swap;
      }
      if (swap) {
        setBatter1(localBatter2);
        setBatter2(localBatter1);
      } else {
        setBatter1(localBatter1);
        setBatter2(localBatter2);
      }
    }
  };

  const undoPlayerStatsUpdate = async (scoreThisBall: scorePerBall) => {
    const playerMatchStatsLocalState = playerMatchStats;

    if (playerMatchStatsLocalState && playerMatchStatsLocalState.length > 0) {
      const batterIndex = playerMatchStatsLocalState.findIndex(
        (playerStats: playerStats) =>
          playerStats.playerId == scoreThisBall.strikerBatter?.id
      );

      if (batterIndex > -1) {
        playerMatchStatsLocalState[batterIndex].runs -= scoreThisBall.run;
        playerMatchStatsLocalState[batterIndex].ballsFaced -=
          scoreThisBall.isNoBall || scoreThisBall.isWideBall ? 0 : 1;
        playerMatchStatsLocalState[batterIndex].fours -=
          scoreThisBall.run == 4 ? 1 : 0;
        playerMatchStatsLocalState[batterIndex].sixes -=
          scoreThisBall.run == 6 ? 1 : 0;
        playerMatchStatsLocalState[batterIndex].strikeRate =
          (playerMatchStatsLocalState[batterIndex].runs /
            playerMatchStatsLocalState[batterIndex].ballsFaced) *
          100;
        if (scoreThisBall.isWicket) {
          playerMatchStatsLocalState[batterIndex].isOut = false;
        }
      }
      const bowlerIndex = playerMatchStatsLocalState.findIndex(
        (playerStats: playerStats) =>
          playerStats.playerId == scoreThisBall.bowler?.id
      );
      if (bowlerIndex > -1) {
        playerMatchStatsLocalState[bowlerIndex].runsConceded -=
          scoreThisBall.totalRun;

        if (scoreThisBall.isOverEnd) {
          playerMatchStatsLocalState[bowlerIndex].overs -= 1;
          playerMatchStatsLocalState[bowlerIndex].ballsBowled = 5;
        } else {
          playerMatchStatsLocalState[bowlerIndex].ballsBowled -=
            scoreThisBall.isNoBall || scoreThisBall.isWideBall ? 0 : 1;
        }
        playerMatchStatsLocalState[bowlerIndex].extras -= scoreThisBall.extra;
        playerMatchStatsLocalState[bowlerIndex].wickets -=
          scoreThisBall.isWicket ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].foursConceded -=
          scoreThisBall.run == 4 ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].sixesConceded -=
          scoreThisBall.run == 6 ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].bowlingEconomy =
          playerMatchStatsLocalState[bowlerIndex].runsConceded /
          (playerMatchStatsLocalState[bowlerIndex].ballsBowled > 0
            ? playerMatchStatsLocalState[bowlerIndex].ballsBowled / 6
            : 1);
      }

      setPlayerMatchStats(playerMatchStatsLocalState);

      await PlayerMatchStats.update(match.matchId, {
        playerMatchStats: playerMatchStatsLocalState,
      });
    }
  };

  const handleUndoSubmit = () => {
    Alert.alert(
      "Undo Confirmation",
      "Are you sure you want to undo the last ball?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Undo Cancelled"),
          style: "cancel",
        },
        { text: "OK", onPress: undoAction },
      ],
      { cancelable: false }
    );
  };

  const undoAction = async () => {
    try {
      setShowLoader(true);
      if (!match) {
        return;
      }

      let currentMatchTeam1Score: scorePerInning = totalScore;
      let currentMatchTeam2Score: scorePerInning = scoreSecondInnings;

      if (
        currentMatchTeam1Score.length == 0 &&
        currentMatchTeam2Score.length == 0
      ) {
        return;
      }

      let isLocalFirstInning = isFirstInning;
      if (currentMatchTeam2Score.length == 0 && !isLocalFirstInning) {
        isLocalFirstInning = true;
      }
      if (isLocalFirstInning) {
        if (currentMatchTeam1Score.length == 0) {
          console.log("No ball to undo");
          return;
        }

        if (!match.quickMatch) {
          await undoPlayerStatsUpdate(currentMatchTeam1Score[0][0]);
        }

        if (!isFirstInning) {
          await Match.update(match.matchId, {
            isFirstInning: isLocalFirstInning,
          });
        }
        await MatchScore.deleteBallScore(
          match.matchId,
          match.team1,
          1,
          currentMatchTeam1Score.length,
          currentMatchTeam1Score[0].length
        );
        if (currentMatchTeam1Score[0].length == 1) {
          await MatchScore.delete(
            match.matchId,
            match.team1,
            1,
            currentMatchTeam1Score.length
          );
        }
      } else {
        if (currentMatchTeam2Score.length == 0) {
          console.log("No ball to undo");
          return;
        }

        if (!match.quickMatch) {
          if (match.status !== "live") {
            await undoPlayerCareerStats(match.matchId);
          }
          await undoPlayerStatsUpdate(currentMatchTeam2Score[0][0]);
        }

        if (match.status !== "live") {
          await Match.update(match.matchId, {
            status: "live",
          });
        }
        await MatchScore.deleteBallScore(
          match.matchId,
          match.team2,
          2,
          currentMatchTeam2Score.length,
          currentMatchTeam2Score[0].length
        );
        if (currentMatchTeam2Score[0].length == 1) {
          await MatchScore.delete(
            match.matchId,
            match.team2,
            2,
            currentMatchTeam2Score.length
          );
        }
      }
      await fetchMatch();
    } finally {
      setShowLoader(false);
    }
  };

  const handleMatchSettings = () => {
    router.push("/matchSettings");
  };

  const handlePlayerPick = (value: player | undefined) => {
    if (!bowler) {
      setBowler(value);
    } else if (!batter1) {
      if (batter2 && value?.id == batter2.id) {
        alert(`${value?.name} is already selected`);
        return;
      }
      setBatter1(value);
    } else if (!batter2) {
      if (batter1 && value?.id == batter1.id) {
        alert(`${value?.name} is already selected`);
        return;
      }
      setBatter2(value);
    }
  };

  const swapBatters = () => {
    const temp = batter1;
    setBatter1(batter2);
    setBatter2(temp);
  };

  const isEntryButtonDisabled =
    (!isEntryDone ||
      showLoader ||
      match.status !== "live" ||
      (!match.quickMatch && isWicket && !outBatter)) &&
    (match.status !== "live" ||
      match.quickMatch ||
      !!(batter1 && batter2 && bowler));

  const handleEditPlayer = (
    playerType: "striker" | "nonStriker" | "bowler"
  ) => {
    if (playerType === "striker") {
      setBatter1(undefined);
    } else if (playerType === "nonStriker") {
      setBatter2(undefined);
    } else if (playerType === "bowler") {
      setBowler(undefined);
    }

    setPickPlayerVisible(true);
  };

  const handleNewMatch = () => {
    router.push("/createMatch");
  };

  return (
    <View style={styles.container}>
      <View style={styles.scoreBoardcontainer}>
        <ScoreBoard
          totalScore={finalFirstInningsScore.totalRuns}
          wickets={finalFirstInningsScore.totalWickets}
          overs={finalFirstInningsScore.totalOvers}
          balls={finalFirstInningsScore.totalBalls}
          scorePerInning={totalScore}
        />
        <ScoreBoard
          totalScore={finalSecondInningsScore.totalRuns}
          wickets={finalSecondInningsScore.totalWickets}
          overs={finalSecondInningsScore.totalOvers}
          balls={finalSecondInningsScore.totalBalls}
          scorePerInning={scoreSecondInnings}
        />
        {(bowler || batter1 || batter2) && match.status === "live" ? (
          <MatchPlayerStatsBar
            bowler={bowler}
            strikerBatsman={batter1}
            nonStrikerBatsman={batter2}
            playerMatchStats={playerMatchStats}
            handleSwapBatters={swapBatters}
            isOut={isWicket}
            handleOutBatter={(outBatter: player) => setOutBatter(outBatter)}
            handleEditPlayer={handleEditPlayer}
          />
        ) : null}

        {!isFirstInning && match.status === "live" ? (
          <MatchScoreBar
            match={match}
            finalFirstInningsScore={finalFirstInningsScore}
            finalSecondInningsScore={finalSecondInningsScore}
          />
        ) : (
          ""
        )}
      </View>
      <View style={{ flex: 0.1 }}></View>
      <View style={styles.subContainer}>
        {match.status === "live" || match.status === "noResult" ? (
          <TouchableOpacity
            disabled={isEntryButtonDisabled}
            style={[
              styles.ConfirmationButton,
              themeStyles.ConfirmationButton,
              isEntryButtonDisabled && themeStyles.entryButtonDisabled,
            ]}
            onPress={handleSubmit}
          >
            {bowler || match.quickMatch ? (
              batter1 || match.quickMatch ? (
                batter2 || match.quickMatch ? (
                  <Text
                    style={[
                      styles.confirmationText,
                      isWicket && { fontSize: 30 },
                    ]}
                  >
                    {isNoBall ? "NB + " : isWideBall ? "WD + " : ""}
                    {isWicket
                      ? `W${outBatter ? "(" + outBatter.name + ")" : ""} + `
                      : ""}
                    {run}
                  </Text>
                ) : (
                  <View style={styles.pickPlayerContainer}>
                    <Text style={styles.pickPlayerText}>Select Batsman</Text>
                  </View>
                )
              ) : (
                <View style={styles.pickPlayerContainer}>
                  <Text style={styles.pickPlayerText}>Select Batsman</Text>
                </View>
              )
            ) : (
              <View style={styles.pickPlayerContainer}>
                <Text style={styles.pickPlayerText}>Select Bowler</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.matchResultContainer}>
            <MatchResult
              winner={
                match.winner === "team1"
                  ? match.team1Fullname
                  : match.winner === "team2"
                  ? match.team2Fullname
                  : ""
              }
              matchResultText={getMatchResultText(
                match,
                finalFirstInningsScore,
                finalSecondInningsScore
              )}
              playerStats={playerMatchStats.find(
                (x: playerStats) => x.playerId == manOfTheMatch
              )}
              onNewMatch={handleNewMatch}
              status={match.status}
            />
          </View>
        )}
      </View>
      <View style={{ flex: 0.3 }}></View>
      <View style={styles.subContainer}>
        <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
          {["0", "1", "2", "3", "4", "6"].map((score, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.bubbleButton,
                themeStyles.bubbleButton,
                isEntryDone &&
                  run == parseInt(score) && { backgroundColor: "#019999" },
              ]}
              disabled={showLoader}
              onPress={() => handleRunPress(score)}
            >
              <Text style={styles.buttonText}>{score}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
          <TouchableOpacity
            style={[
              styles.specialBubbleButton,
              isWicket && { backgroundColor: "#019999" },
            ]}
            disabled={showLoader}
            onPress={handleWicket}
          >
            <Text style={styles.buttonText}>Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.specialBubbleButton,
              isNoBall && { backgroundColor: "#019999" },
            ]}
            disabled={showLoader}
            onPress={handleNoBall}
          >
            <Text style={styles.buttonText}>NoBall</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.specialBubbleButton,
              isWideBall && { backgroundColor: "#019999" },
            ]}
            disabled={showLoader}
            onPress={handleWideBall}
          >
            <Text style={styles.buttonText}>Wide</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={showLoader}
            style={[styles.specialBubbleButton]}
            onPress={handleUndoSubmit}
          >
            <Icon name="delete" type="feather" color="black" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={match.status !== "live"}
            style={styles.specialBubbleButton}
            onPress={handleMatchSettings}
          >
            <Icon name="settings" type="ionicon" color="black" size={28} />
          </TouchableOpacity>
        </View>
        {currentSettings.showMatchTimer && match.status === "live" && (
          <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
            <MatchTimer
              matchStartDateTime={match.startDateTime}
              lastActivityDateTime={lastActivityDateTime}
              thresholdIdleTime={
                currentSettings.matchTime.seconds * 1000 +
                currentSettings.matchTime.minutes * 60 * 1000 +
                currentSettings.matchTime.hours * 60 * 60 * 1000
              }
            />
          </View>
        )}
      </View>
      {!bowler || !batter1 || !batter2 ? (
        <PickPlayer
          visible={pickPlayerVisible}
          playerType={!bowler ? "Bowler" : "Batsman"}
          team={
            isFirstInning
              ? bowler
                ? match.team1
                : match.team2
              : bowler
              ? match.team2
              : match.team1
          }
          remainingPlayers={playerMatchStats.filter((x: playerStats) => {
            return !bowler
              ? x.ballsBowled == 0 && x.overs == 0 && x.extras == 0
              : x.isOut == false && x.ballsFaced == 0;
          })}
          onSubmit={handlePlayerPick}
          onDismiss={() => setPickPlayerVisible(false)}
        />
      ) : null}
    </View>
  );
}

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    margin: 1,
    padding: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(50, 50, 50, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  totalScoreContainer: {
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  totalScoreText: {
    fontSize: 50,
    color: "red",
  },
  bubbleButton: {
    margin: 6,
    width: windowWidth * 0.12,
    height: windowWidth * 0.12,
    borderRadius: windowWidth * 0.1,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#aaa",
  },
  specialBubbleButton: {
    marginVertical: 6,
    marginHorizontal: 4,
    width: windowWidth * 0.17,
    height: windowWidth * 0.1,
    backgroundColor: "#e2e6ea",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: "#d3d9e0",
  },
  bubbleButtonDisabled: {
    margin: 5,
    width: windowWidth * 0.15,
    height: windowWidth * 0.15,
    borderRadius: windowWidth * 0.1,
    backgroundColor: "gray",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#343a40",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  ConfirmationButton: {
    margin: 5,
    width: windowWidth * 0.7,
    height: windowWidth * 0.7,
    borderRadius: windowWidth * 0.7,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationText: {
    fontSize: 50,
    textAlign: "center",
  },
  scoreBoardcontainer: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 35,
  },
  subContainer: {
    flex: 1,
    justifyContent: "center",
  },
  pickPlayerContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  pickPlayerText: {
    fontSize: 48,
    color: "black",
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "#555",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  matchResultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 50,
  },
});

const darkStyles = StyleSheet.create({
  entryButtonDisabled: {
    backgroundColor: "#b0b0b0",
    opacity: 0.8,
  },
  scoreContainer: {
    backgroundColor: "#333",
    borderColor: "#555",
  },
  bubbleButton: {
    backgroundColor: "#ddd",
    borderColor: "#aaa",
  },
  ConfirmationButton: {
    backgroundColor: "#ddd",
  },
});
const lightStyles = StyleSheet.create({
  entryButtonDisabled: {
    backgroundColor: "#c0c0c0",
    opacity: 0.8,
  },
  scoreContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  bubbleButton: {
    backgroundColor: "#e2e6ea",
    borderColor: "##d3d9e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0.5,
  },
  ConfirmationButton: {
    backgroundColor: "#fffffe",
  },
});
