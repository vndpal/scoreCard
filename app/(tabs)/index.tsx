import { StyleSheet, View, TouchableOpacity, Text, Alert } from "react-native";
import ScoreBoard from "@/components/ScoreBoard";
import { useEffect, useRef, useState } from "react";
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
import { useAppContext } from "@/context/AppContext";
import { useCelebration } from "@/context/CelebrationContext";
import { detectCelebrations } from "@/utils/detectCelebrations";
import { updateManOfTheMatch } from "@/utils/updateManOfTheMatch";
import { matchResult } from "@/types/matchResult";
import MatchTimer from "@/components/MatchTimer";
import { Timestamp } from "@react-native-firebase/firestore";
import { Team } from "@/firebase/models/Team";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { Match } from "@/firebase/models/Match";
import { MatchScore } from "@/firebase/models/MatchScores";
import { undoPlayerCareerStats } from "@/utils/undoPlayerCareerStats";
import {
  rebuildPlayerMatchStats,
  removeNewestBall,
} from "@/utils/rebuildPlayerMatchStats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Club } from "@/types/club";
import MatchResult from "@/components/MatchResult";
import { getMatchResultText } from "@/utils/getMatchResultText";
import { updatePlayerTournamentStats } from "@/utils/updatePlayerTournamentStat";
import { undoPlayerTournamentStats } from "@/utils/undoPlayerTournamentStats";
import { recomputeTournamentStandings } from "@/utils/recomputeTournamentStandings";
import { updateTournamentStandings } from "@/utils/updateTournamentStandings";
import Loader from "@/components/Loader";
import { Tournament } from "@/firebase/models/Tournament";
import ScoringControls from "@/components/ScoringControls";
import WicketModal, { OutType, WicketResult } from "@/components/WicketModal";
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from "expo-keep-awake";

// Scopes our wake lock so it can't clash with other keep-awake consumers.
const KEEP_AWAKE_LIVE_MATCH_TAG = "live-match";

export default function HomeScreen() {
  const router = useRouter();

  const [run, setRun] = useState(0);
  const [isDeclared, setIsDeclared] = useState(false);
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
    tournamentId: "",
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
  const [outType, setOutType] = useState<OutType>();
  const [fielder, setFielder] = useState<{ id: string; name: string }>();
  const [wicketModalVisible, setWicketModalVisible] = useState<boolean>(false);
  // Set when the wicket popup is confirmed so the ball auto-submits once the
  // wicket state has committed (avoids reading stale state in handleSubmit).
  const [pendingWicketSubmit, setPendingWicketSubmit] = useState<boolean>(false);
  const [bowler, setBowler] = useState<player>();

  const [pickPlayerVisible, setPickPlayerVisible] = useState<boolean>(false);
  const [showLoader, setShowLoader] = useState<boolean>(false);
  const [isEntryDone, setIsEntryDone] = useState<boolean>(false);
  const [lastActivityDateTime, setLastActivityDateTime] = useState<Timestamp>(
    Timestamp.now()
  );
  const [manOfTheMatch, setManOfTheMatch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Guards against a second undo running while one is in flight (stacked
  // confirmation alerts would otherwise undo the same ball twice).
  const undoInProgressRef = useRef(false);
  const [possibleRuns, setPossibleRuns] = useState<string[]>([
    "0",
    "1",
    "2",
    "3",
    "4",
    "6",
  ]);

  const { currentTheme, currentSettings, club, currentTournament } =
    useAppContext();
  const { celebrate } = useCelebration();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    try {
      fetchMatch();
    } catch (error) {
      console.log("error", error);
    }
  }, []);

  // Keep the screen awake while a live match is in progress. This tab stays
  // mounted for the whole session, so the lock holds anywhere in the app and
  // is released when the match ends or the app is closed.
  useEffect(() => {
    if (match.status !== "live") {
      return;
    }
    activateKeepAwakeAsync(KEEP_AWAKE_LIVE_MATCH_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_LIVE_MATCH_TAG).catch(() => {});
    };
  }, [match.status]);

  const fetchMatch = async () => {
    try {
      setShowLoader(true);
      if (currentTournament) {
        const tournament = await Tournament.getById(currentTournament);
        if (tournament) {
          if (tournament.isBoxCricket) {
            setPossibleRuns(["0", "1d", "1", "2", "3", "4"]);
          }
        }
      }
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
        if (currentTournament) {
          const tournament = await Tournament.getById(currentTournament);
          if (tournament) {
            if (tournament.isBoxCricket) {
              setPossibleRuns(["0", "1d", "1", "2", "3", "4"]);
            }
          }
        }
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
    // Ball-entry flags and player selections carry over from whatever the
    // previous match's screen instance last had them set to (this screen is
    // reused across matches, not remounted) — reset everything a fresh mount
    // would otherwise have started with.
    setRun(0);
    setIsDeclared(false);
    setIsWicket(false);
    setIsNoBall(false);
    setIsWideBall(false);
    setIsEntryDone(false);
    setBatter1(undefined);
    setBatter2(undefined);
    setBowler(undefined);
    setOutBatter(undefined);
    setOutType(undefined);
    setFielder(undefined);
    setWicketModalVisible(false);
    setPendingWicketSubmit(false);
    setPickPlayerVisible(false);
    setManOfTheMatch("");
    setLastActivityDateTime(Timestamp.now());
  };

  const handleRunPress = (run: string) => {
    setIsDeclared(run.includes("d"));
    setRun(parseInt(run));
    setIsEntryDone(true);
  };

  const handleWicket = () => {
    if (match.status !== "live") {
      return;
    }

    if (!match.quickMatch) {
      if (!bowler || !batter1 || !batter2) {
        setPickPlayerVisible(true);
        return;
      }
    }
    // Quick matches don't track per-player stats, so keep the simple toggle
    // (no out-type / fielder capture).
    if (match.quickMatch) {
      if (isWicket) {
        setOutBatter(undefined);
      }
      setIsWicket((prev) => !prev);
      setIsEntryDone(true);
      return;
    }

    // Tapping "Out" again while a wicket is staged clears it.
    if (isWicket) {
      setIsWicket(false);
      setOutBatter(undefined);
      setOutType(undefined);
      setFielder(undefined);
      setIsEntryDone(true);
      return;
    }

    setWicketModalVisible(true);
  };

  const handleWicketConfirm = (result: WicketResult) => {
    const outBatterPlayer =
      result.outBatterId === batter1?.id
        ? batter1
        : result.outBatterId === batter2?.id
          ? batter2
          : undefined;
    setIsWicket(true);
    setOutType(result.outType);
    setOutBatter(outBatterPlayer);
    setFielder(result.fielder);
    setIsEntryDone(true);
    setWicketModalVisible(false);
    // Submit this ball automatically once the above state commits.
    setPendingWicketSubmit(true);
  };

  const handleWicketCancel = () => {
    setWicketModalVisible(false);
  };

  // --- "All out?" handlers (squad exhausted; full matches only) -----------
  // Shown automatically once the last available batsman is out. First innings
  // -> end the innings (same effect as declaring from Match Settings). Second
  // innings -> end the match. Tapping "No" just dismisses and leaves the wicket
  // in place so the scorer can undo it / bring back a retired batsman.
  const promptAllOutFirstInnings = () => {
    Alert.alert(
      "All out?",
      "The batting side has no batsmen left. End the innings?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, end innings", onPress: () => endFirstInningsAllOut() },
      ]
    );
  };

  const endFirstInningsAllOut = async () => {
    // Mirror of the overs-based first-innings transition, but for a mid-over
    // all-out we must also reset the current-over buffers so the second innings
    // starts fresh. No navigation (in-screen transition, same as overs path).
    setScorePerOver([]);
    setTotalBalls(0);
    setBowler(undefined);
    setBatter1(undefined);
    setBatter2(undefined);
    setIsFirstInning(false);
    await Match.update(match.matchId, { isFirstInning: false });
  };

  const promptAllOutSecondInnings = (
    winner: "team1" | "team2",
    matchStatus: matchResult,
    localFirst: currentTotalScore,
    localSecond: currentTotalScore
  ) => {
    Alert.alert(
      "All out?",
      "The batting side has no batsmen left. End the match?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, end match",
          onPress: () =>
            endMatchAllOut(winner, matchStatus, localFirst, localSecond),
        },
      ]
    );
  };

  const endMatchAllOut = async (
    winner: "team1" | "team2",
    matchStatus: matchResult,
    localFirst: currentTotalScore,
    localSecond: currentTotalScore
  ) => {
    // Identical side-effects to the existing second-innings end path.
    setMatch({ ...match, winner: winner, status: matchStatus });
    await Match.update(match.matchId, {
      status: matchStatus,
      winner: winner,
      endDateTime: Timestamp.now(),
    });

    if (!match.quickMatch) {
      const winningTeam =
        matchStatus === "completed"
          ? winner === "team1"
            ? match.team1
            : match.team2
          : "";
      await updatePlayerCareerStats(playerMatchStats, winningTeam);
      await updatePlayerTournamentStats(
        playerMatchStats,
        match.tournamentId,
        match.clubId,
        winningTeam
      );
      const manOfTheMatch = await updateManOfTheMatch(match.matchId);
      setManOfTheMatch(manOfTheMatch);
    }
    // Standings are a derived table; keep this light and never let it block.
    try {
      await updateTournamentStandings(match.tournamentId, match.clubId, {
        ...match,
        status: matchStatus,
        winner: matchStatus === "completed" ? winner : undefined,
        currentScore: {
          team1: localFirst,
          team2: localSecond,
        },
      });
    } catch (e) {
      console.error("updateTournamentStandings failed", e);
    }
  };

  // Fielders are the bowling side. In the first innings team1 bats / team2
  // bowls; reversed in the second. Includes the current bowler (caught & bowled
  // / bowler-effected run-outs).
  const bowlingTeamInitials = isFirstInning ? match.team2 : match.team1;
  const fielderOptions = playerMatchStats.filter(
    (p: playerStats) => p.team === bowlingTeamInitials
  );

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
      // Set true when this ball also ends the innings/match via overs or chase,
      // so the "All out?" prompt below doesn't double-fire.
      let inningsEndedThisBall = false;
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
        outType: isWicket ? outType : undefined,
        outBatterId: isWicket ? outBatter?.id : undefined,
        fielder:
          isWicket && fielder
            ? { id: fielder.id, name: fielder.name, clubId: match.clubId }
            : undefined,
      };

      if (!match.quickMatch) {
        await updatePlayerMatchStats(scoreThisBall);
      }

      // Squad-exhaustion check: after this wicket commits (updatePlayerMatchStats
      // mutates playerMatchStats in place, so isOut is already set), is there any
      // batsman left to come in? Exclude the pair currently at the crease
      // (batter1/batter2 closure values = the pre-clear pair) so a last man who
      // just arrived with 0 balls faced isn't mis-counted as still available.
      let noBatsmenLeft = false;
      if (!match.quickMatch && isWicket) {
        const battingTeam = isFirstInning ? match.team1 : match.team2;
        const eligibleBatsmen = playerMatchStats.filter(
          (x: playerStats) =>
            x.team === battingTeam &&
            x.playerId !== batter1?.id &&
            x.playerId !== batter2?.id &&
            ((x.isOut === false && x.ballsFaced === 0) || x.retired === true)
        );
        noBatsmenLeft = eligibleBatsmen.length === 0;
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
            clubId: match.clubId,
            tournamentId: match.tournamentId,
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
            clubId: match.clubId,
            tournamentId: match.tournamentId,
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
      setIsDeclared(false);
      setIsWicket(false);
      setIsNoBall(false);
      setIsWideBall(false);
      setOutBatter(undefined);
      setOutType(undefined);
      setFielder(undefined);

      // --- Celebrations (delight-only; wrapped so it can never break scoring) ---
      if (currentSettings.celebrations) {
        try {
          const inningsScore = isFirstInning ? totalScore : scoreSecondInnings;
          // playerMatchStats was mutated in place by updatePlayerMatchStats above
          // (full matches only); an undefined runs total disables the batting
          // milestones, which is exactly right for quick matches.
          const striker = playerMatchStats?.find(
            (p: playerStats) => p.playerId === scoreThisBall.strikerBatter?.id
          );
          const strikerRunsAfter = striker?.runs;
          const strikerRunsBefore =
            typeof strikerRunsAfter === "number"
              ? strikerRunsAfter - scoreThisBall.run
              : undefined;
          const events = detectCelebrations({
            scoreThisBall,
            scoreThisOver,
            inningsScore,
            strikerRunsBefore,
            strikerRunsAfter,
            strikerName: scoreThisBall.strikerBatter?.name,
            strikerBalls: striker?.ballsFaced,
            strikerFours: striker?.fours,
            strikerSixes: striker?.sixes,
            bowlerId: scoreThisBall.bowler?.id,
            bowlerName: scoreThisBall.bowler?.name,
            // Pre-ball total is still in the render closure; local* holds the new total.
            teamBefore: (isFirstInning
              ? finalFirstInningsScore
              : finalSecondInningsScore
            ).totalRuns,
            teamAfter: (isFirstInning
              ? localFinalFirstInningsScore
              : localFinalSecondInningsScore
            ).totalRuns,
            isOverEnd: scoreThisBall.isOverEnd,
          });
          if (events.length) celebrate(events);
        } catch (e) {
          console.error("detectCelebrations failed", e);
        }
      }

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
          inningsEndedThisBall = true;
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
            await updatePlayerCareerStats(
              playerMatchStats,
              matchStatus === "completed"
                ? winner === "team1"
                  ? match.team1
                  : match.team2
                : ""
            );
            await updatePlayerTournamentStats(
              playerMatchStats,
              match.tournamentId,
              match.clubId,
              matchStatus === "completed"
                ? winner === "team1"
                  ? match.team1
                  : match.team2
                : ""
            );
            const manOfTheMatch = await updateManOfTheMatch(match.matchId);
            setManOfTheMatch(manOfTheMatch);
          }
          // Standings are a derived table; keep this light (only touches the two
          // teams' rows) and never let it block the post-match reload.
          try {
            await updateTournamentStandings(
              match.tournamentId,
              match.clubId,
              {
                ...match,
                status: matchStatus,
                winner: matchStatus === "completed" ? winner : undefined,
                currentScore: {
                  team1: localFinalFirstInningsScore,
                  team2: localFinalSecondInningsScore,
                },
              }
            );
          } catch (e) {
            console.error("updateTournamentStandings failed", e);
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
        inningsEndedThisBall = true;
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
          await updatePlayerCareerStats(playerMatchStats, match.team2);
          await updatePlayerTournamentStats(
            playerMatchStats,
            match.tournamentId,
            match.clubId,
            match.team2
          );
          const manOfTheMatch = await updateManOfTheMatch(match.matchId);
          setManOfTheMatch(manOfTheMatch);
        }
        // Standings are a derived table; keep this light (only touches the two
        // teams' rows) and never let it block the post-match reload.
        try {
          await updateTournamentStandings(match.tournamentId, match.clubId, {
            ...match,
            status: "completed",
            winner: winner,
            currentScore: {
              team1: localFinalFirstInningsScore,
              team2: localFinalSecondInningsScore,
            },
          });
        } catch (e) {
          console.error("updateTournamentStandings failed", e);
        }
      }

      // Squad exhausted and the innings didn't already end via overs/chase this
      // ball -> ask to end the innings (1st) or match (2nd).
      if (!match.quickMatch && isWicket && noBatsmenLeft && !inningsEndedThisBall) {
        if (isFirstInning) {
          promptAllOutFirstInnings();
        } else {
          // Mirror the existing second-innings result logic, using the LOCAL
          // final scores (state setters are async; locals already include this
          // ball's runs). The batting side can't win by being bowled out.
          let winner: "team1" | "team2" = "team1";
          let matchStatus: matchResult = "completed";
          if (
            localFinalSecondInningsScore.totalRuns >
            localFinalFirstInningsScore.totalRuns
          ) {
            winner = "team2";
          } else if (
            localFinalSecondInningsScore.totalRuns ===
            localFinalFirstInningsScore.totalRuns
          ) {
            matchStatus = "tied";
          }
          promptAllOutSecondInnings(
            winner,
            matchStatus,
            localFinalFirstInningsScore,
            localFinalSecondInningsScore
          );
        }
      }
    } finally {
      setShowLoader(false);
      setLastActivityDateTime(Timestamp.now());
    }
  };

  // After the wicket popup is confirmed, the dismissal state is set
  // asynchronously; submit the ball only once it has committed so handleSubmit
  // reads the correct isWicket/outType/outBatter/fielder values.
  useEffect(() => {
    if (pendingWicketSubmit && isWicket) {
      setPendingWicketSubmit(false);
      handleSubmit();
    }
  }, [pendingWicketSubmit, isWicket]);

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
        // Run-outs are not credited to the bowler; every other dismissal is.
        playerMatchStatsLocalState[bowlerIndex].wickets +=
          scoreThisBall.isWicket && scoreThisBall.outType !== "runout" ? 1 : 0;
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

      // Credit the fielding contribution (caught / stumped / run out).
      if (scoreThisBall.isWicket && scoreThisBall.fielder?.id) {
        const fielderIndex = playerMatchStatsLocalState.findIndex(
          (playerStats: playerStats) =>
            playerStats.playerId == scoreThisBall.fielder?.id
        );
        if (fielderIndex > -1) {
          const f = playerMatchStatsLocalState[fielderIndex];
          if (scoreThisBall.outType == "caught") {
            f.catches = (f.catches || 0) + 1;
          } else if (scoreThisBall.outType == "stumped") {
            f.stumpings = (f.stumpings || 0) + 1;
          } else if (scoreThisBall.outType == "runout") {
            f.runOuts = (f.runOuts || 0) + 1;
          }
        }
      }

      setPlayerMatchStats(playerMatchStatsLocalState);

      await PlayerMatchStats.update(match.matchId, {
        playerMatchStats: playerMatchStatsLocalState,
      });

      //handle swap logic for batters
      let swap = false;
      if (!isDeclared && (scoreThisBall.run == 1 || scoreThisBall.run == 3)) {
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

  // Rebuilds all player stats from the balls that remain after the undo,
  // instead of decrementing the stored figures — decrements could drift
  // (double-run undo, half-applied failures) into impossible values like
  // "0 overs, -5 balls", and nothing ever reconciled them with the balls.
  const undoRebuildPlayerStats = async (
    postUndoTeam1: scorePerInning,
    postUndoTeam2: scorePerInning
  ) => {
    if (!playerMatchStats || playerMatchStats.length == 0) {
      return;
    }
    const rebuilt = rebuildPlayerMatchStats(
      playerMatchStats,
      postUndoTeam1,
      postUndoTeam2
    );
    setPlayerMatchStats(rebuilt);
    await PlayerMatchStats.update(match.matchId, {
      playerMatchStats: rebuilt,
    });
  };

  const handleUndoSubmit = () => {
    if (undoInProgressRef.current) {
      return;
    }
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
    // Ref-based guard: confirmation alerts can stack under rapid tapping and
    // each OK would re-run undo against the same pre-undo state, undoing the
    // same ball twice. The ref is immune to render timing, unlike showLoader.
    if (undoInProgressRef.current) {
      return;
    }
    undoInProgressRef.current = true;
    try {
      setShowLoader(true);
      setIsLoading(true);
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
          return;
        }

        if (!match.quickMatch) {
          await undoRebuildPlayerStats(
            removeNewestBall(currentMatchTeam1Score),
            currentMatchTeam2Score
          );
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
          return;
        }

        if (!match.quickMatch) {
          if (match.status !== "live") {
            await undoPlayerCareerStats(match.matchId);
            await undoPlayerTournamentStats(match.matchId);
          }
          await undoRebuildPlayerStats(
            currentMatchTeam1Score,
            removeNewestBall(currentMatchTeam2Score)
          );
        }

        const wasDecisive = match.status !== "live";
        if (wasDecisive) {
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
        if (wasDecisive) {
          // The match is no longer decisive; recompute drops its contribution
          // (finalizedMatch passed as "live" so it's excluded from the set).
          // Runs after the core undo and never blocks it on failure.
          try {
            await recomputeTournamentStandings(
              match.tournamentId,
              match.clubId,
              { ...match, status: "live" }
            );
          } catch (e) {
            console.error("recomputeTournamentStandings failed", e);
          }
        }
      }
      await fetchMatch();
    } catch (error) {
      // Without this, a failure here was invisible: the ball survived in the
      // DB while in-memory stats were already changed, and the next tap
      // undid the same ball again.
      console.error("undoAction failed", error);
      Alert.alert(
        "Undo failed",
        "Something went wrong while undoing the last ball. Please try again."
      );
    } finally {
      undoInProgressRef.current = false;
      setShowLoader(false);
      setIsLoading(false);
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
      clearRetiredFlag(value);
    } else if (!batter2) {
      if (batter1 && value?.id == batter1.id) {
        alert(`${value?.name} is already selected`);
        return;
      }
      setBatter2(value);
      clearRetiredFlag(value);
    }
  };

  // When a previously declared (retired not out) batsman returns to bat, clear
  // their retired flag so they no longer appear in the picker. Their runs/balls
  // are left untouched so the innings resumes from where they left off.
  const clearRetiredFlag = async (value: player | undefined) => {
    if (!value) return;
    const target = playerMatchStats.find(
      (p: playerStats) => p.playerId == value.id
    );
    if (!target?.retired) return;
    const updated = playerMatchStats.map((p: playerStats) =>
      p.playerId == value.id ? { ...p, retired: false } : p
    );
    setPlayerMatchStats(updated);
    await PlayerMatchStats.update(match.matchId, {
      playerMatchStats: updated,
    });
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

  const handleDeclareBatter = (
    declaredBatter: player,
    playerType: "striker" | "nonStriker"
  ) => {
    Alert.alert(
      "Declare Batsman",
      `Declare ${declaredBatter.name}? They'll be marked not out and can bat again later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Declare",
          onPress: async () => {
            const updated = playerMatchStats.map((p: playerStats) =>
              p.playerId == declaredBatter.id ? { ...p, retired: true } : p
            );
            setPlayerMatchStats(updated);
            await PlayerMatchStats.update(match.matchId, {
              playerMatchStats: updated,
            });
            handleEditPlayer(playerType);
          },
        },
      ]
    );
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
          teamName={match.team1ShortName ?? match.team1}
          isLiveMatch={match.status === "live"}
          isActiveInning={isFirstInning}
        />
        {!isFirstInning && (
          <ScoreBoard
            totalScore={finalSecondInningsScore.totalRuns}
            wickets={finalSecondInningsScore.totalWickets}
            overs={finalSecondInningsScore.totalOvers}
            balls={finalSecondInningsScore.totalBalls}
            scorePerInning={scoreSecondInnings}
            teamName={match.team2ShortName ?? match.team2}
            isLiveMatch={match.status === "live"}
            isActiveInning={!isFirstInning}
          />
        )}
        {(bowler || batter1 || batter2) && match.status === "live" ? (
          <MatchPlayerStatsBar
            bowler={bowler}
            strikerBatsman={batter1}
            nonStrikerBatsman={batter2}
            playerMatchStats={playerMatchStats}
            handleSwapBatters={swapBatters}
            handleEditPlayer={handleEditPlayer}
            handleDeclareBatter={handleDeclareBatter}
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
      <View
        style={{
          flex:
            match.status === "live" || match.status === "noResult" ? 0.6 : 0.1,
        }}
      ></View>
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
                    {run + (isDeclared ? "d" : "")}
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
      <View
        style={{
          flex:
            match.status === "live" || match.status === "noResult" ? 0.15 : 0.3,
        }}
      ></View>
      <View style={styles.subContainer}>
        <ScoringControls
          possibleRuns={possibleRuns}
          run={run}
          isDeclared={isDeclared}
          isEntryDone={isEntryDone}
          showLoader={showLoader}
          isWicket={isWicket}
          isNoBall={isNoBall}
          isWideBall={isWideBall}
          matchStatus={match.status}
          onRunPress={handleRunPress}
          onWicketPress={handleWicket}
          onNoBallPress={handleNoBall}
          onWideBallPress={handleWideBall}
          onUndoPress={handleUndoSubmit}
          onSettingsPress={handleMatchSettings}
        />
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
              : (x.isOut == false && x.ballsFaced == 0) || x.retired == true;
          })}
          onSubmit={handlePlayerPick}
          onDismiss={() => setPickPlayerVisible(false)}
        />
      ) : null}
      <WicketModal
        visible={wicketModalVisible}
        striker={batter1}
        nonStriker={batter2}
        fielders={fielderOptions}
        onConfirm={handleWicketConfirm}
        onCancel={handleWicketCancel}
      />
      {isLoading && <Loader />}
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
  totalScoreContainer: {
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  totalScoreText: {
    fontSize: 50,
    color: "red",
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
  ConfirmationButton: {
    margin: 5,
    width: windowWidth * 0.6,
    height: windowWidth * 0.6,
    borderRadius: windowWidth * 0.6,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationText: {
    fontSize: 50,
    textAlign: "center",
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
  scoreBoardcontainer: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 35,
  },
  subContainer: {
    flex: 1,
    justifyContent: "flex-end",
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
  ConfirmationButton: {
    backgroundColor: "#fffffe",
  },
});
