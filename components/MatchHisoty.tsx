import { match } from '@/types/match';
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const Card = ({ match }: { match: match }) => (
    <View style={styles.card}>
        <Text style={styles.title}>{match.team1} vs {match.team2}</Text>
        <Text>{match.tossWin == 'team1' ? match.team1 : match.team2} won the toss and choose {match.choose}</Text>
        <Text>Overs: {match.overs}</Text>
        <Text style={{ textTransform: 'capitalize' }}>Status: {match.status}</Text>
        {match.status == 'completed' ? <Text>Winner: {match.winner == 'team1' ? match.team1 : match.team2}</Text> : ''}
    </View>
);

const MatchHistory = ({ matches }: { matches: match[] }) => {
    return (
        <ScrollView style={styles.container}>
            {matches && matches.map((item, index) => (
                <Card key={index} match={item} />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#000', // Change background color to match dark theme
        maxHeight: '50%',
    },
    card: {
        backgroundColor: '#a09f9f', // Change card background color to match dark theme
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});

export default MatchHistory;