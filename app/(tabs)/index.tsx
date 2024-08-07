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
import { playerCareerStats } from "@/types/playerCareerStats";
import { updatePlayerCareerStats } from "@/utils/updatePlayerCareerStats";

export default function HomeScreen() {
  const router = useRouter();

  const [run, setRun] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [isWideBall, setIsWideBall] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);

  const [isFirstInning, setIsFirstInning] = useState(true);

  const [match, setMatch] = useState<match>({
    matchId: "",
    team1: "",
    team2: "",
    team1score: [],
    team2score: [],
    tossWin: "team1",
    choose: "batting",
    overs: 0,
    status: "completed",
    isFirstInning: true,
    date: new Date().toDateString(),
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
  const [bowler, setBowler] = useState<player>();

  const [pickPlayerVisible, setPickPlayerVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchMatch();
  }, []);

  const fetchMatch = async () => {
    const isNewMatch = await getItem(STORAGE_ITEMS.IS_NEW_MATCH);
    if (!isNewMatch) {
      const matches = await getItem(STORAGE_ITEMS.MATCHES);
      if (!matches) {
        return;
      }
      const currentMatch = matches[0];
      setMatch(currentMatch);
      setIsFirstInning(currentMatch.isFirstInning);
      setTotalScore(currentMatch.team1score);

      await initiatePlayerMatchStats(currentMatch.matchId);

      if (currentMatch.team1score.length == 0) {
        clearAllState();
        console.log("team1score is empty or not defined");
        return;
      }

      const currnetInningstotalRuns = currentMatch.team1score.reduce(
        (acc: any, subArray: any[]) => {
          return (
            acc +
            subArray.reduce(
              (subAcc, ball: scorePerBall) =>
                subAcc + ball.run + (ball.isNoBall || ball.isWideBall ? 1 : 0),
              0
            )
          );
        },
        0
      );
      let currnetInningstotalBalls = currentMatch.team1score[0].reduce(
        (acc: any, score: scorePerBall) =>
          acc + (score.isNoBall || score.isWideBall ? 0 : 1),
        0
      );
      let currnetInningstotalOvers = currentMatch.team1score.length - 1;
      currnetInningstotalOvers =
        currnetInningstotalBalls == 6
          ? currnetInningstotalOvers + 1
          : currnetInningstotalOvers;
      currnetInningstotalBalls =
        currnetInningstotalBalls == 6 ? 0 : currnetInningstotalBalls;
      const currnetInningstotalWickets = currentMatch.team1score.reduce(
        (acc: any, subArray: scorePerBall[]) => {
          return (
            acc +
            subArray.reduce(
              (subAcc, ball: scorePerBall) => subAcc + (ball.isWicket ? 1 : 0),
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
        setScorePerOver(currentMatch.team1score[0]);
        if (currentMatch.team1score[0][0].isOverEnd) {
          setBowler(undefined);
        } else {
          setBowler(currentMatch.team1score[0][0].bowler);
        }
        if (currentMatch.team1score[0][0].isWicket) {
          setBatter1(undefined);
        } else {
          setBatter1(currentMatch.team1score[0][0].strikerBatter);
        }
        setBatter2(currentMatch.team1score[0][0].nonStrikerBatter);
      }

      if (!currentMatch.isFirstInning) {
        if (currentMatch.team2score.length == 0) {
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
        setScoreSecondInnings(currentMatch.team2score);
        if (currentMatch.team2score.length == 0) {
          console.log("team2score is empty or not defined");
          return;
        }
        const currnetInningstotalRuns = currentMatch.team2score.reduce(
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
        let currnetInningstotalBalls = currentMatch.team2score[0].reduce(
          (acc: any, score: scorePerBall) =>
            acc + (score.isNoBall || score.isWideBall ? 0 : 1),
          0
        );
        let currnetInningstotalOvers = currentMatch.team2score.length - 1;
        currnetInningstotalOvers =
          currnetInningstotalBalls == 6
            ? currnetInningstotalOvers + 1
            : currnetInningstotalOvers;
        currnetInningstotalBalls =
          currnetInningstotalBalls == 6 ? 0 : currnetInningstotalBalls;
        const currnetInningstotalWickets = currentMatch.team2score.reduce(
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
        setScorePerOver(currentMatch.team2score[0]);
        if (currentMatch.team2score[0][0].isOverEnd) {
          setBowler(undefined);
        } else {
          setBowler(currentMatch.team2score[0][0].bowler);
        }

        if (currentMatch.team2score[0][0].isWicket) {
          setBatter1(undefined);
        } else {
          setBatter1(currentMatch.team2score[0][0].strikerBatter);
        }
        setBatter2(currentMatch.team2score[0][0].nonStrikerBatter);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const fetchMatchAfterNewMatch = async () => {
        const isNewMatch = await getItem(STORAGE_ITEMS.IS_NEW_MATCH);
        if (isNewMatch) {
          clearAllState();
          const matches = await getItem(STORAGE_ITEMS.MATCHES);
          if (matches) {
            setMatch(matches[0]);
            await initiatePlayerMatchStats(matches[0].matchId);
          }
          await setItem(STORAGE_ITEMS.IS_NEW_MATCH, false);
        }
      };
      fetchMatchAfterNewMatch();
    }, [])
  );

  const initiatePlayerMatchStats = async (currentMatchId: string) => {
    const playerMatchStats = await getItem(STORAGE_ITEMS.PLAYER_MATCH_STATS);
    if (playerMatchStats) {
      const currentMatchPlayerStats: playerMatchStats = playerMatchStats.find(
        (playerStats: playerMatchStats) => playerStats.matchId == currentMatchId
      );
      if (currentMatchPlayerStats) {
        setPlayerMatchStats(currentMatchPlayerStats.playerMatchStats);
      }
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
    if (run == ".") {
      setRun(0);
    } else {
      setRun(parseInt(run));
    }
    setIsConfirm(false);
  };

  const handleWicket = () => {
    setIsWicket((prev) => !prev);
    setIsConfirm(false);
  };

  const handleNoBall = () => {
    setIsNoBall((prev) => !prev);
    setIsWideBall(false);
    setIsConfirm(false);
  };

  const handleWideBall = () => {
    setIsWideBall((prev) => !prev);
    setIsNoBall(false);
    setIsConfirm(false);
  };

  const handleSubmit = async () => {
    //logic for player pick start
    if (!bowler) {
      setPickPlayerVisible(true);
      setIsConfirm(false);
      return;
    } else if (!batter1) {
      setPickPlayerVisible(true);
      setIsConfirm(false);
      return;
    } else if (!batter2) {
      setPickPlayerVisible(true);
      setIsConfirm(false);
      return;
    }
    //logic for player pick end
    if (!isConfirm) {
      setIsConfirm(true);
      return;
    } else {
      const extra = (isNoBall ? 1 : 0) + (isWideBall ? 1 : 0);
      const totalRun = run + extra;
      let scoreSecondInningsLocalState;
      // setTotalRuns((prev) => prev + totalRun);
      if (isFirstInning) {
        setFinalFirstInningsScore((prev) => ({
          ...prev,
          totalRuns: prev.totalRuns + totalRun,
          totalWickets: prev.totalWickets + (isWicket ? 1 : 0),
        }));
      } else {
        setFinalSecondInningsScore((prev) => ({
          ...prev,
          totalRuns: prev.totalRuns + totalRun,
          totalWickets: prev.totalWickets + (isWicket ? 1 : 0),
        }));
      }

      let isValidBall = false;
      if (!isNoBall && !isWideBall) {
        increaseOver();
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

      if (isWicket) {
        setBatter1(undefined);
      }
      await updatePlayerMatchStats(scoreThisBall);

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

      const matches = await getItem(STORAGE_ITEMS.MATCHES);
      if (matches) {
        const latestMatch = matches[0];
        if (latestMatch) {
          let updatedMatch;
          if (isFirstInning) {
            updatedMatch = { ...latestMatch, team1score: totalScore };
          } else {
            updatedMatch = {
              ...latestMatch,
              team2score: scoreSecondInningsLocalState,
            };
          }
          matches[0] = updatedMatch;
          await setItem(STORAGE_ITEMS.MATCHES, matches);
        }
      }

      setIsConfirm(false);
      setRun(0);
      setIsWicket(false);
      setIsNoBall(false);
      setIsWideBall(false);

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

          const matches = await getItem(STORAGE_ITEMS.MATCHES);
          if (matches) {
            const latestMatch = matches[0];
            if (latestMatch) {
              const updatedMatch = { ...latestMatch, isFirstInning: false };

              matches[0] = updatedMatch;
              await setItem(STORAGE_ITEMS.MATCHES, matches);
            }
          }
        } else if (
          !isFirstInning &&
          finalSecondInningsScore.totalOvers + 1 == match.overs
        ) {
          console.log("Second Inning Completed");
          let winner: "team1" | "team2" | undefined = "team1";
          if (
            finalSecondInningsScore.totalRuns + totalRun >
            finalFirstInningsScore.totalRuns
          ) {
            winner = "team2";
          }
          setMatch({ ...match, winner: winner, status: "completed" });
          const matches = await getItem(STORAGE_ITEMS.MATCHES);
          if (matches) {
            const latestMatch = matches[0];
            if (latestMatch) {
              const updatedMatch = {
                ...latestMatch,
                team1score: totalScore,
                team2score: scoreSecondInningsLocalState,
                status: "completed",
                winner: winner,
              };

              matches[0] = updatedMatch;
              await setItem(STORAGE_ITEMS.MATCHES, matches);
              await updatePlayerCareerStats(playerMatchStats);
            }
          }
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
        let winner = "team2";
        setMatch({ ...match, status: "completed" });
        const matches = await getItem(STORAGE_ITEMS.MATCHES);
        if (matches) {
          const latestMatch = matches[0];
          if (latestMatch) {
            const updatedMatch = {
              ...latestMatch,
              team1score: totalScore,
              team2score: scoreSecondInningsLocalState,
              status: "completed",
              winner: winner,
            };

            matches[0] = updatedMatch;
            await setItem(STORAGE_ITEMS.MATCHES, matches);
            await updatePlayerCareerStats(playerMatchStats);
          }
        }
      }
    }
  };

  function increaseOver() {
    const currentOverBalls = totalBalls + 1;
    if (currentOverBalls == 6) {
      if (isFirstInning) {
        setFinalFirstInningsScore((prev) => ({
          ...prev,
          totalOvers: prev.totalOvers + 1,
          totalBalls: 0,
        }));
      } else {
        setFinalSecondInningsScore((prev) => ({
          ...prev,
          totalOvers: prev.totalOvers + 1,
          totalBalls: 0,
        }));
      }
      // setTotalOvers(totalOvers + 1);
      setTotalBalls(0);
    } else {
      if (isFirstInning) {
        setFinalFirstInningsScore((prev) => ({
          ...prev,
          totalBalls: currentOverBalls,
        }));
      } else {
        setFinalSecondInningsScore((prev) => ({
          ...prev,
          totalBalls: currentOverBalls,
        }));
      }
      setTotalBalls(currentOverBalls);
    }
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
        playerMatchStatsLocalState[batterIndex].isOut = scoreThisBall.isWicket;
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
        playerMatchStatsLocalState[bowlerIndex].wickets +=
          scoreThisBall.isWicket ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].bowlingEconomy =
          playerMatchStatsLocalState[bowlerIndex].runsConceded /
          (playerMatchStatsLocalState[bowlerIndex].ballsBowled > 0
            ? playerMatchStatsLocalState[bowlerIndex].ballsBowled / 6
            : 1);
      }

      setPlayerMatchStats(playerMatchStatsLocalState);

      const playerMatchStatsFromDb = await getItem(
        STORAGE_ITEMS.PLAYER_MATCH_STATS
      );
      if (playerMatchStatsFromDb) {
        const playerMatchStatsIndex = playerMatchStatsFromDb.findIndex(
          (playerStats: playerMatchStats) =>
            playerStats.matchId == match.matchId
        );
        if (playerMatchStatsIndex > -1) {
          playerMatchStatsFromDb[playerMatchStatsIndex].playerMatchStats =
            playerMatchStatsLocalState;
          await setItem(
            STORAGE_ITEMS.PLAYER_MATCH_STATS,
            playerMatchStatsFromDb
          );
        }
      }

      let localBatter1 = batter1;
      let localBatter2 = batter2;
      localBatter1 = scoreThisBall.isWicket ? undefined : localBatter1;
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
        playerMatchStatsLocalState[batterIndex].fours -= run == 4 ? 1 : 0;
        playerMatchStatsLocalState[batterIndex].sixes -= run == 6 ? 1 : 0;
        playerMatchStatsLocalState[batterIndex].strikeRate =
          (playerMatchStatsLocalState[batterIndex].runs /
            playerMatchStatsLocalState[batterIndex].ballsFaced) *
          100;
        playerMatchStatsLocalState[batterIndex].isOut = !scoreThisBall.isWicket;
      }
      const bowlerIndex = playerMatchStatsLocalState.findIndex(
        (playerStats: playerStats) =>
          playerStats.playerId == scoreThisBall.bowler?.id
      );
      if (bowlerIndex > -1) {
        playerMatchStatsLocalState[bowlerIndex].runsConceded -=
          scoreThisBall.totalRun;
        playerMatchStatsLocalState[bowlerIndex].ballsBowled -=
          scoreThisBall.isNoBall || scoreThisBall.isWideBall ? 0 : 1;

        if (scoreThisBall.isOverEnd) {
          playerMatchStatsLocalState[bowlerIndex].overs -= 1;
        }
        playerMatchStatsLocalState[bowlerIndex].extras -= scoreThisBall.extra;
        playerMatchStatsLocalState[bowlerIndex].wickets -=
          scoreThisBall.isWicket ? 1 : 0;
        playerMatchStatsLocalState[bowlerIndex].bowlingEconomy =
          playerMatchStatsLocalState[bowlerIndex].runsConceded /
          (playerMatchStatsLocalState[bowlerIndex].ballsBowled > 0
            ? playerMatchStatsLocalState[bowlerIndex].ballsBowled / 6
            : 1);
      }

      setPlayerMatchStats(playerMatchStatsLocalState);

      const playerMatchStatsFromDb = await getItem(
        STORAGE_ITEMS.PLAYER_MATCH_STATS
      );
      if (playerMatchStatsFromDb) {
        const playerMatchStatsIndex = playerMatchStatsFromDb.findIndex(
          (playerStats: playerMatchStats) =>
            playerStats.matchId == match.matchId
        );
        if (playerMatchStatsIndex > -1) {
          playerMatchStatsFromDb[playerMatchStatsIndex].playerMatchStats =
            playerMatchStatsLocalState;
          await setItem(
            STORAGE_ITEMS.PLAYER_MATCH_STATS,
            playerMatchStatsFromDb
          );
        }
      }
    }
  };

  const handleUndoSubmit = () => {
    Alert.alert(
      "Undo Confirmation",
      "Are you sure you want to undo the last action?",
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
    const allMatches: match[] = await getItem(STORAGE_ITEMS.MATCHES);
    if (!allMatches || allMatches.length == 0) {
      return;
    }
    const currentMath: match = allMatches[0];
    const currentMatchTeam1Score: scorePerInning = currentMath.team1score;
    const currentMatchTeam2Score: scorePerInning = currentMath.team2score;
    if (
      currentMatchTeam1Score.length == 0 &&
      currentMatchTeam2Score.length == 0
    ) {
      return;
    }

    if (currentMatchTeam2Score.length == 0 && !currentMath.isFirstInning) {
      currentMath.isFirstInning = true;
    }
    if (currentMath.isFirstInning) {
      if (currentMatchTeam1Score.length == 0) {
        console.log("No ball to undo");
        return;
      }

      await undoPlayerStatsUpdate(currentMatchTeam1Score[0][0]);

      currentMatchTeam1Score[0].shift();
      if (currentMatchTeam1Score[0].length == 0) {
        currentMatchTeam1Score.shift();
      }

      const updatedMatch = {
        ...currentMath,
        team1score: currentMatchTeam1Score,
      };
      allMatches[0] = updatedMatch;
      await setItem(STORAGE_ITEMS.MATCHES, allMatches);
    } else {
      if (currentMatchTeam2Score.length == 0) {
        console.log("No ball to undo");
        return;
      }

      await undoPlayerStatsUpdate(currentMatchTeam2Score[0][0]);

      currentMatchTeam2Score[0].shift();
      if (currentMatchTeam2Score[0].length == 0) {
        currentMatchTeam2Score.shift();
      }

      const currentMatchStatus =
        currentMath.status == "completed" ? "live" : currentMath.status;
      const updatedMatch = {
        ...currentMath,
        team2score: currentMatchTeam2Score,
        status: currentMatchStatus,
      };
      allMatches[0] = updatedMatch;
      await setItem(STORAGE_ITEMS.MATCHES, allMatches);
    }
    await fetchMatch();
  };

  const handleMatchSettings = () => {
    router.push("matchSettings");
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
        {bowler || batter1 || batter2 ? (
          <MatchPlayerStatsBar
            bowler={bowler}
            strikerBatsman={batter1}
            nonStrikerBatsman={batter2}
            playerMatchStats={playerMatchStats}
          />
        ) : null}

        {!isFirstInning ? (
          <MatchScoreBar
            match={match}
            finalFirstInningsScore={finalFirstInningsScore}
            finalSecondInningsScore={finalSecondInningsScore}
          />
        ) : (
          ""
        )}
      </View>

      <View style={styles.subContainer}>
        <TouchableOpacity
          disabled={match.status == "completed"}
          style={[
            styles.ConfirmationButton,
            { backgroundColor: isConfirm ? "lightgreen" : "#ddd" },
          ]}
          onPress={handleSubmit}
        >
          {bowler ? (
            batter1 ? (
              batter2 ? (
                <Text style={styles.confirmationText}>
                  {isNoBall ? "NB + " : isWideBall ? "WD + " : ""}
                  {isWicket ? "W + " : ""}
                  {run}
                </Text>
              ) : (
                <View style={styles.pickPlayerContainer}>
                  <Icon
                    name="sports-cricket"
                    type="material-icon"
                    size={180}
                    color="black"
                  />
                  {/* <Text style={styles.pickPlayerText}>Select Batsman</Text> */}
                </View>
              )
            ) : (
              <View style={styles.pickPlayerContainer}>
                <Icon
                  name="sports-cricket"
                  type="material-icon"
                  size={180}
                  color="#5D3A1B"
                />
                {/* <Text style={styles.pickPlayerText}>Select Batsman</Text> */}
              </View>
            )
          ) : (
            <View style={styles.pickPlayerContainer}>
              <Icon
                name="tennisball-sharp"
                type="ionicon"
                size={180}
                color="#4CAF50"
              />
              {/* <Text style={styles.pickPlayerText}>Select Bowler</Text> */}
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.subContainer}>
        <View style={styles.scoreContainer}>
          {[".", "1", "2", "3", "4", "6"].map((score, index) => (
            <TouchableOpacity
              key={index}
              style={styles.bubbleButton}
              onPress={() => handleRunPress(score)}
            >
              <Text style={styles.buttonText}>{score}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.scoreContainer}>
          <TouchableOpacity style={styles.bubbleButton} onPress={handleWicket}>
            <Text style={styles.buttonText}>W</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bubbleButton} onPress={handleNoBall}>
            <Text style={styles.buttonText}>NB</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bubbleButton}
            onPress={handleWideBall}
          >
            <Text style={styles.buttonText}>WB</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bubbleButton} onPress={swapBatters}>
            <Icon name="swap" type="entypo" color="black" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bubbleButton}
            onPress={handleUndoSubmit}
          >
            <Icon name="arrow-undo" type="ionicon" color="black" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bubbleButton}
            onPress={handleMatchSettings}
          >
            <Icon name="settings" type="ionicon" color="black" size={28} />
          </TouchableOpacity>
        </View>
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
          remainingPlayersId={playerMatchStats
            .filter((x: playerStats) => {
              return !bowler
                ? x.ballsBowled == 0 && x.overs == 0 && x.extras == 0
                : x.isOut == false && x.ballsFaced == 0;
            })
            .map((x: playerStats) => x.playerId)}
          onSubmit={handlePlayerPick}
          onDismiss={() => setPickPlayerVisible(false)}
        />
      ) : null}
    </View>
  );
}

const windowWidth = Dimensions.get("window").width;

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
    margin: 5,
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
    margin: 5,
    width: windowWidth * 0.12,
    height: windowWidth * 0.12,
    borderRadius: windowWidth * 0.1,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 16,
    fontWeight: "bold",
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
    fontSize: 40,
  },
  pickPlayerText: {
    fontSize: 22,
    color: "black",
    marginTop: 10,
    fontWeight: "bold",
    alignContent: "center",
  },
});
