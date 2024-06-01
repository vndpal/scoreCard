import { Image, StyleSheet, Platform, View, TouchableOpacity, Text } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ScoreBoard from '@/components/ScoreBoard';
import { useState } from 'react';
import { scorePerBall } from '@/types/scorePerBall';


export default function HomeScreen() {

  const [run, setRun] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [isDotBall, setIsDotBall] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [isWideBall, setIsWideBall] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);

  const [totalScore, setTotalScore] = useState<scorePerBall[]>([]);
  const [totalRuns, setTotalRuns] = useState<number>(0);
  const [totalWickets, setTotalWickets] = useState<number>(0);

  const [totalOvers, setTotalOvers] = useState<number>(0);
  const [totalBalls, setTotalBalls] = useState<number>(0);

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

  const handleSubmit = () => {
    if (!isConfirm) {
      setIsConfirm(true);
      return
    }
    else {
      const extra = (isNoBall ? 1 : 0) + (isWideBall ? 1 : 0);
      const totalRun = run + extra;
      setTotalRuns((prev) => prev + totalRun);
      setTotalWickets(totalWickets + (isWicket ? 1 : 0));
      let isOverEnd = false;
      if (!isNoBall && !isWideBall) {
        increaseOver();
        isOverEnd = true;
      }
      else if (isNoBall && isWicket) {
        increaseOver();
        isOverEnd = true;
      }

      const scoreThisBall: scorePerBall = {
        run: run,
        extra: (isNoBall ? 1 : 0) + (isWideBall ? 1 : 0),
        totalRun: totalRun,
        isWicket: isWicket,
        isNoBall: isNoBall,
        isWideBall: isWideBall,
        isOverEnd: isOverEnd && totalBalls === 5,
      }

      setTotalScore([scoreThisBall, ...totalScore]);
      setIsConfirm(false);
      setRun(0);
      setIsWicket(false);
      setIsDotBall(false);
      setIsNoBall(false);
      setIsWideBall(false);
    }

    function increaseOver() {
      const currentOverBalls = totalBalls + 1;
      if (currentOverBalls === 6) {
        setTotalOvers(totalOvers + 1);
        setTotalBalls(0);
      }
      else {
        setTotalBalls(currentOverBalls);
      }
    }
  }

  return (
    <View style={styles.container}>
      <ScoreBoard totalScore={totalRuns} wickets={totalWickets} overs={totalOvers} balls={totalBalls} ballScores={totalScore} />
      <View>
        <TouchableOpacity style={[styles.ConfirmationButton, { backgroundColor: isConfirm ? 'lightgreen' : '#ddd' }]} onPress={handleSubmit}>
          <Text style={styles.confirmationText}>{isNoBall ? 'NB + ' : isWideBall ? 'WD + ' : ''}{isWicket ? 'W + ' : ''}{run}</Text>
        </TouchableOpacity>
      </View>
      <View>
        <View style={styles.scoreContainer}>
          {['.', '1', '2', '4'].map((score, index) => (
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
        </View>
      </View>
    </View>

  );
}

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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
  },
  ConfirmationButton: {
    margin: 5,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationText: {
    fontSize: 50,
  }
});
