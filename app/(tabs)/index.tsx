import { Image, StyleSheet, Platform, View, TouchableOpacity, Text, Alert } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ScoreBoard from '@/components/ScoreBoard';
import { useEffect, useState } from 'react';
import { scorePerBall } from '@/types/scorePerBall';
import { scorePerOver } from '@/types/scorePerOver';
import { scorePerInning } from '@/types/scorePerInnig';
import { match, matchStatus } from '@/types/match';
import { getItem, setItem } from '@/utils/asyncStorage';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { Icon } from 'react-native-elements';

type currentTotalScore = {
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  totalBalls: number;
};

export default function HomeScreen() {

  const [run, setRun] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [isDotBall, setIsDotBall] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [isWideBall, setIsWideBall] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);

  const [isFirstInning, setIsFirstInning] = useState(true);

  const [match, setMatch] = useState<match>({ team1: '', team2: '', team1score: [], team2score: [], tossWin: 'team1', choose: 'batting', winner: 'team1', overs: 0, status: 'completed', isFirstInning: true });
  const [totalScore, setTotalScore] = useState<scorePerInning>([]);
  const [scoreSecondInnings, setScoreSecondInnings] = useState<scorePerInning>([]);
  const [scorePerOver, setScorePerOver] = useState<scorePerOver>([]);
  const [scorePerBall, setScorePerBall] = useState<scorePerBall>();

  const [totalRuns, setTotalRuns] = useState<number>(0);
  const [totalWickets, setTotalWickets] = useState<number>(0);
  const [totalOvers, setTotalOvers] = useState<number>(0);
  const [totalBalls, setTotalBalls] = useState<number>(0);

  const [finalFirstInningsScore, setFinalFirstInningsScore] = useState<currentTotalScore>({ totalRuns: 0, totalWickets: 0, totalOvers: 0, totalBalls: 0 });
  const [finalSecondInningsScore, setFinalSecondInningsScore] = useState<currentTotalScore>({ totalRuns: 0, totalWickets: 0, totalOvers: 0, totalBalls: 0 });

  useEffect(() => {
    fetchMatch();
  }, []);

  const fetchMatch = async () => {
    const isNewMatch = await getItem('isNewMatch');
    if (!isNewMatch) {
      const matches = await getItem('matches');
      if (!matches) {
        return;
      }
      const currentMatch = matches[0];
      setMatch(currentMatch);
      setIsFirstInning(currentMatch.isFirstInning);
      setTotalScore(currentMatch.team1score);
      if (currentMatch.team1score.length == 0) {
        clearAllState();
        console.log('team1score is empty or not defined');
        return;
      }
      else if (!currentMatch.isFirstInning && currentMatch.team2score.length == 0) {
        setFinalSecondInningsScore({ totalRuns: 0, totalWickets: 0, totalOvers: 0, totalBalls: 0 });
        setScoreSecondInnings([]);
        setScorePerOver([]);
        setTotalRuns(0);
        setTotalBalls(0);
        setTotalOvers(0);
        setTotalWickets(0);
        console.log('team2score is empty or not defined');
        return;
      }
      const currnetInningstotalRuns = currentMatch.team1score.reduce((acc: any, subArray: any[]) => {
        return acc + subArray.reduce((subAcc, ball: scorePerBall) => subAcc + ball.run + (ball.isNoBall || ball.isWideBall ? 1 : 0), 0);
      }, 0);
      let currnetInningstotalBalls = currentMatch.team1score[0].reduce((acc: any, score: scorePerBall) => acc + (score.isNoBall || score.isWideBall ? 0 : 1), 0);
      let currnetInningstotalOvers = currentMatch.team1score.length - 1;
      currnetInningstotalOvers = currnetInningstotalBalls === 6 ? currnetInningstotalOvers + 1 : currnetInningstotalOvers;
      currnetInningstotalBalls = currnetInningstotalBalls === 6 ? 0 : currnetInningstotalBalls;
      const currnetInningstotalWickets = currentMatch.team1score.reduce((acc: any, subArray: scorePerBall[]) => {
        return acc + subArray.reduce((subAcc, ball: scorePerBall) => subAcc + (ball.isWicket ? 1 : 0), 0);
      }, 0);

      setFinalFirstInningsScore({ totalRuns: currnetInningstotalRuns, totalWickets: currnetInningstotalWickets, totalOvers: currnetInningstotalOvers, totalBalls: currnetInningstotalBalls });
      if (currentMatch.isFirstInning) {
        setTotalRuns(currnetInningstotalRuns);
        setTotalBalls(currnetInningstotalBalls);
        setTotalOvers(currnetInningstotalOvers);
        setTotalWickets(currnetInningstotalWickets);
        setScorePerOver(currentMatch.team1score[0]);
      }


      if (!currentMatch.isFirstInning) {
        setScoreSecondInnings(currentMatch.team2score);
        if (currentMatch.team2score.length === 0) {
          console.log('team2score is empty or not defined');
          return;
        }
        const currnetInningstotalRuns = currentMatch.team2score.reduce((acc: any, subArray: any[]) => {
          return acc + subArray.reduce((subAcc, ball: scorePerBall) => subAcc + ball.run + (ball.isNoBall || ball.isWideBall ? 1 : 0), 0);
        }, 0);
        let currnetInningstotalBalls = currentMatch.team2score[0].reduce((acc: any, score: scorePerBall) => acc + (score.isNoBall || score.isWideBall ? 0 : 1), 0);
        let currnetInningstotalOvers = currentMatch.team2score.length - 1;
        currnetInningstotalOvers = currnetInningstotalBalls === 6 ? currnetInningstotalOvers + 1 : currnetInningstotalOvers;
        currnetInningstotalBalls = currnetInningstotalBalls === 6 ? 0 : currnetInningstotalBalls;
        const currnetInningstotalWickets = currentMatch.team2score.reduce((acc: any, subArray: scorePerBall[]) => {
          return acc + subArray.reduce((subAcc, ball: scorePerBall) => subAcc + (ball.isWicket ? 1 : 0), 0);
        }, 0);

        setFinalSecondInningsScore({ totalRuns: currnetInningstotalRuns, totalWickets: currnetInningstotalWickets, totalOvers: currnetInningstotalOvers, totalBalls: currnetInningstotalBalls });
        setTotalRuns(currnetInningstotalRuns);
        setTotalBalls(currnetInningstotalBalls);
        setTotalOvers(currnetInningstotalOvers);
        setTotalWickets(currnetInningstotalWickets);
        setScorePerOver(currentMatch.team2score[0]);

      }

    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const fetchMatch = async () => {
        const isNewMatch = await getItem('isNewMatch');
        if (isNewMatch) {
          clearAllState();
          const matches = await getItem('matches');
          if (matches) {
            setMatch(matches[0]);
          }
          await setItem('isNewMatch', false);
        }

      }
      fetchMatch();
    }, [])
  );

  const clearAllState = () => {
    setTotalScore([]);
    setScoreSecondInnings([]);
    setFinalFirstInningsScore({ totalRuns: 0, totalWickets: 0, totalOvers: 0, totalBalls: 0 });
    setFinalSecondInningsScore({ totalRuns: 0, totalWickets: 0, totalOvers: 0, totalBalls: 0 });
    setIsFirstInning(true);
    setScorePerOver([]);
    setTotalRuns(0);
    setTotalBalls(0);
    setTotalOvers(0);
    setTotalWickets(0);
  }

  const handleRunPress = (run: string) => {
    if (run === '.') {
      setRun(0);
    }
    else {
      setRun(parseInt(run))
    }
    setIsConfirm(false);
  }

  const handleWicket = () => {
    setIsWicket((prev) => !prev);
    setIsConfirm(false);
  }

  const handleNoBall = () => {
    setIsNoBall((prev) => !prev);
    setIsWideBall(false)
    setIsConfirm(false);
  }

  const handleWideBall = () => {
    setIsWideBall((prev) => !prev);
    setIsNoBall(false);
    setIsConfirm(false);
  }

  const handleSubmit = async () => {
    if (!isConfirm) {
      setIsConfirm(true);
      return
    }
    else {
      const extra = (isNoBall ? 1 : 0) + (isWideBall ? 1 : 0);
      const totalRun = run + extra;
      // setTotalRuns((prev) => prev + totalRun);
      if (isFirstInning) {
        setFinalFirstInningsScore((prev) => ({ ...prev, totalRuns: prev.totalRuns + totalRun }));
        setFinalFirstInningsScore((prev) => ({ ...prev, totalWickets: prev.totalWickets + (isWicket ? 1 : 0) }));
      }
      else {
        setFinalSecondInningsScore((prev) => ({ ...prev, totalRuns: prev.totalRuns + totalRun }));
        setFinalSecondInningsScore((prev) => ({ ...prev, totalWickets: prev.totalWickets + (isWicket ? 1 : 0) }));
      }
      // setTotalWickets(totalWickets + (isWicket ? 1 : 0));
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
        isOverEnd: isValidBall && totalBalls === 5,
      }

      const scoreThisOver: scorePerOver = [scoreThisBall, ...scorePerOver];

      if (isFirstInning) {
        if (scorePerOver.length === 0) {
          const latestTotalScore = totalScore;
          latestTotalScore.unshift(scoreThisOver);
          setTotalScore(latestTotalScore);
        }
        else {
          const latestTotalScore = totalScore;
          latestTotalScore[0] = scoreThisOver;
          setTotalScore(latestTotalScore);
        }
      }
      else {
        if (scorePerOver.length === 0) {
          setScoreSecondInnings([scoreThisOver, ...scoreSecondInnings])
        }
        else {
          const latestTotalScore = scoreSecondInnings;
          latestTotalScore[0] = scoreThisOver;
          setScoreSecondInnings(latestTotalScore);
        }
      }

      const matches = await getItem('matches');
      if (matches) {
        const latestMatch = matches[0];
        if (latestMatch) {
          let updatedMatch;
          if (isFirstInning) {
            updatedMatch = { ...latestMatch, team1score: totalScore };
          }
          else {
            updatedMatch = { ...latestMatch, team2score: scoreSecondInnings };
          }
          matches[0] = updatedMatch;
          await setItem('matches', matches);
        }
      }


      setIsConfirm(false);
      setRun(0);
      setIsWicket(false);
      setIsDotBall(false);
      setIsNoBall(false);
      setIsWideBall(false);

      if (isValidBall && totalBalls === 5) {
        setScorePerOver([]);

        if (isFirstInning && match.overs > 0 && finalFirstInningsScore.totalOvers + 1 == match.overs) {
          console.log('First Inning Completed');
          setIsFirstInning(false);

          const matches = await getItem('matches');
          if (matches) {
            const latestMatch = matches[0];
            if (latestMatch) {
              const updatedMatch = { ...latestMatch, isFirstInning: false };

              matches[0] = updatedMatch;
              await setItem('matches', matches);
            }
          }
        }
        else if (!isFirstInning && finalSecondInningsScore.totalOvers + 1 == match.overs) {
          console.log('Second Inning Completed');
          let winner = 'team1';
          if (finalSecondInningsScore.totalRuns >= finalFirstInningsScore.totalRuns) {
            winner = 'team2';
          }
          setMatch({ ...match, status: 'completed' });
          const matches = await getItem('matches');
          if (matches) {
            const latestMatch = matches[0];
            if (latestMatch) {
              const updatedMatch = { ...latestMatch, team1score: totalScore, team2score: scoreSecondInnings, status: 'completed', winner: winner };

              matches[0] = updatedMatch;
              await setItem('matches', matches);
            }
          }
        }
      }
      else {
        setScorePerOver(scoreThisOver);
      }
    }

    function increaseOver() {
      const currentOverBalls = totalBalls + 1;
      if (currentOverBalls === 6) {
        if (isFirstInning) {
          setFinalFirstInningsScore((prev) => ({ ...prev, totalOvers: prev.totalOvers + 1, totalBalls: 0 }));
        }
        else {
          setFinalSecondInningsScore((prev) => ({ ...prev, totalOvers: prev.totalOvers + 1, totalBalls: 0 }));
        }
        // setTotalOvers(totalOvers + 1);
        setTotalBalls(0);
      }
      else {
        if (isFirstInning) {
          setFinalFirstInningsScore((prev) => ({ ...prev, totalBalls: currentOverBalls }));
        }
        else {
          setFinalSecondInningsScore((prev) => ({ ...prev, totalBalls: currentOverBalls }));
        }
        setTotalBalls(currentOverBalls);
      }
    }
  }

  const handleUndoSubmit = () => {
    Alert.alert(
      "Undo Confirmation",
      "Are you sure you want to undo the last action?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Undo Cancelled"),
          style: "cancel"
        },
        { text: "OK", onPress: undoAction }
      ],
      { cancelable: false }
    );
  }

  const undoAction = async () => {
    const allMatches: match[] = await getItem('matches');
    if (!allMatches || allMatches.length === 0) {
      return;
    }
    const currentMath: match = allMatches[0];
    const currentMatchTeam1Score: scorePerInning = currentMath.team1score;
    const currentMatchTeam2Score: scorePerInning = currentMath.team2score;
    if (currentMatchTeam1Score.length === 0 && currentMatchTeam2Score.length === 0) {
      return;
    }

    if (currentMatchTeam2Score.length === 0 && !currentMath.isFirstInning) {
      currentMath.isFirstInning = true;
    }

    if (currentMath.isFirstInning) {
      if (currentMatchTeam1Score.length === 0) {
        console.log('No ball to undo');
        return;
      }

      currentMatchTeam1Score[0].shift();
      if (currentMatchTeam1Score[0].length === 0) {
        currentMatchTeam1Score.shift();
      }

      const updatedMatch = { ...currentMath, team1score: currentMatchTeam1Score };
      allMatches[0] = updatedMatch;
      console.log('after', JSON.stringify(updatedMatch));
      await setItem('matches', allMatches);
    }
    else {
      if (currentMatchTeam2Score.length === 0) {
        console.log('No ball to undo');
        return;
      }

      currentMatchTeam2Score[0].shift();
      if (currentMatchTeam2Score[0].length === 0) {
        currentMatchTeam2Score.shift();
      }


      const currentMatchStatus: matchStatus = currentMath.status == 'completed' ? 'live' : currentMath.status;
      const updatedMatch = { ...currentMath, team2score: currentMatchTeam2Score, status: currentMatchStatus };
      allMatches[0] = updatedMatch;
      await setItem('matches', allMatches);

    }
    await fetchMatch();
  }

  return (
    <View style={styles.container}>
      <View style={styles.scoreBoardcontainer}>
        <ScoreBoard totalScore={finalFirstInningsScore.totalRuns} wickets={finalFirstInningsScore.totalWickets} overs={finalFirstInningsScore.totalOvers} balls={finalFirstInningsScore.totalBalls} scorePerInning={totalScore} />
        <ScoreBoard totalScore={finalSecondInningsScore.totalRuns} wickets={finalSecondInningsScore.totalWickets} overs={finalSecondInningsScore.totalOvers} balls={finalSecondInningsScore.totalBalls} scorePerInning={scoreSecondInnings} />

        {!isFirstInning ? <View style={styles.subContainer1}>
          <Text>{match.team2} need {finalFirstInningsScore.totalRuns - finalSecondInningsScore.totalRuns + 1} runs in {(match.overs * 6) - ((finalSecondInningsScore.totalOvers * 6) + finalSecondInningsScore.totalBalls)} balls | R.R. {(finalFirstInningsScore.totalRuns - finalSecondInningsScore.totalRuns + 1) / (match.overs - finalSecondInningsScore.totalOvers)}</Text>
        </View>
          : ''}
      </View>

      <View style={styles.subContainer}>
        <TouchableOpacity disabled={match.status == 'completed'} style={[styles.ConfirmationButton, { backgroundColor: isConfirm ? 'lightgreen' : '#ddd' }]} onPress={handleSubmit}>
          <Text style={styles.confirmationText}>{isNoBall ? 'NB + ' : isWideBall ? 'WD + ' : ''}{isWicket ? 'W + ' : ''}{run}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.subContainer}>
        <View style={styles.scoreContainer}>
          {['.', '1', '2', '4', '6'].map((score, index) => (
            <TouchableOpacity key={index} style={styles.bubbleButton} onPress={() => handleRunPress(score)}>
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
          <TouchableOpacity style={styles.bubbleButton} onPress={handleWideBall}>
            <Text style={styles.buttonText}>WB</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bubbleButton} onPress={handleUndoSubmit}>
            <Icon
              name='arrow-undo'
              type='ionicon'
              color='black'
              size={48}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>

  );
}

import { Dimensions } from 'react-native';

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  totalScoreContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  totalScoreText: {
    fontSize: 50,
    color: 'red',
  },
  bubbleButton: {
    margin: 5,
    width: windowWidth * 0.15,
    height: windowWidth * 0.15,
    borderRadius: windowWidth * 0.1,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleButtonDisabled: {
    margin: 5,
    width: windowWidth * 0.15,
    height: windowWidth * 0.15,
    borderRadius: windowWidth * 0.1,
    backgroundColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
  },
  ConfirmationButton: {
    margin: 5,
    width: windowWidth * 0.8,
    height: windowWidth * 0.8,
    borderRadius: windowWidth * 0.8,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationText: {
    fontSize: 50,
  },
  scoreBoardcontainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 35
  },
  subContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  subContainer1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
    alignContent: 'flex-start',
    backgroundColor: 'white',
    width: windowWidth,
  }
});
