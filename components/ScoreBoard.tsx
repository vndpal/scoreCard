import { scorePerBall } from '@/types/scorePerBall';
import { scorePerInning } from '@/types/scorePerInnig';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const ScoreBoard = ({ totalScore, wickets, overs, balls, scorePerInning }: { totalScore: Number, wickets: Number, overs: Number, balls: Number, scorePerInning: scorePerInning }) => {
    console.log(scorePerInning);
    return (
        <View style={styles.container}>
            <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{totalScore.toString()}/{wickets.toString()}</Text>
                <Text style={styles.oversText}>{overs.toString()}.{balls.toString()}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.inningsContainer}>
                    {scorePerInning.map((overs, index) => (
                        <View style={styles.oversContainer} key={index}>
                            {overs.map((score: scorePerBall, ballIndex: number) => (
                                <View style={styles.ballsContainer} key={ballIndex}>
                                    {score.isOverEnd ?
                                        <View style={styles.overSummary}>
                                            <Text style={styles.ballScoreText}>{overs.reduce((sum, over) => sum + over.totalRun, 0)}</Text>
                                        </View>
                                        : ''}
                                    <View key={ballIndex} style={styles.ballScore}>
                                        <Text style={styles.ballScoreText}>{score.isNoBall ? 'NB + ' : score.isWideBall ? 'WD + ' : ''}{score.isWicket ? 'W + ' : ''}{score.run.toString()}</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 5,
        backgroundColor: '#333',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreText: {
        color: '#fff',
        fontSize: 20,
        marginRight: 1,
        padding: 5,
        backgroundColor: 'skyblue',
    },
    oversText: {
        color: '#fff',
        fontSize: 20,
        backgroundColor: 'orange',
        padding: 5,
    },
    inningsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ballScore: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
        textAlign: 'center',
    },
    ballScoreText: {
        fontSize: 10,
        textAlign: 'center',
    },
    overSummary: {
        width: 40,
        height: 40,
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
        textAlign: 'center',
    },
    oversContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ballsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});

export default ScoreBoard;