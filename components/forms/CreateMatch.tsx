import { getItem, setItem } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Button, Keyboard, TextInput, Text, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

export const CreateMatch = () => {

    const [overs, setOvers] = useState('');
    const [team1, setTeam1] = useState('');
    const [team2, setTeam2] = useState('');
    const [wickets, setWickets] = useState('');


    const handleSubmit = async () => {
        console.log(`Creating a match with ${overs} overs and ${wickets} wickets.`);
        const matches = await getItem('matches');
        if (matches) {
            if (matches[0].status == 'live') {
                alert('There is already a live match. Please complete it before starting a new match.');
                return;
            }
            await setItem('matches', [{ overs, wickets, team1, team2, tossWin: 'team1', choose: 'batting', team1score: [], team2score: [], status: 'live', isFirstInning: true }, ...matches])
        } else {
            await setItem('matches', [{ overs, wickets, team1, team2, tossWin: 'team1', choose: 'batting', team1score: [], team2score: [], status: 'live', isFirstInning: true }])
        }
        await setItem('isNewMatch', true);
        Keyboard.dismiss();
        router.push('/');
    };

    return (
        <View style={styles.formContainer}>
            <TextInput
                style={styles.input}
                placeholder="Team 1"
                placeholderTextColor={'white'}
                keyboardType="default"
                value={team1}
                onChangeText={setTeam1}
            />
            <TextInput
                style={styles.input}
                placeholder="Team 2"
                placeholderTextColor={'white'}
                keyboardType="default"
                value={team2}
                onChangeText={setTeam2}
            />
            <TextInput
                style={styles.input}
                placeholder="Overs"
                placeholderTextColor={'white'}
                keyboardType="numeric"
                value={overs}
                onChangeText={setOvers}
            />
            <TextInput
                style={styles.input}
                placeholder="Wickets"
                placeholderTextColor={'white'}
                keyboardType="numeric"
                value={wickets}
                onChangeText={setWickets}
            />
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.text}>Create Match</Text>
            </TouchableOpacity>
        </View>
    );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 10,
        maxHeight: '100%',
        backgroundColor: 'transparent',
    },
    input: {
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 24,
        paddingHorizontal: 8,
        borderRadius: 15,
        color: 'white',
    },
    button: {
        backgroundColor: '#0c66e4',
        padding: 10,
        color: 'black',
        textAlign: 'center',
        marginTop: 10,
        width: 'auto',
        height: 'auto',
        borderRadius: 20,
    },
    text: {
        color: 'white',
        textAlign: 'center',
        fontSize: 20,
    }
});