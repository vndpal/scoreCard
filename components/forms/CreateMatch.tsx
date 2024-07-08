import { getItem, setItem } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, View, StyleSheet, Dimensions } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

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
                label={'Batting team'}
                placeholderTextColor={'white'}
                keyboardType="default"
                value={team1}
                onChangeText={setTeam1}
                mode='outlined'
            />
            <TextInput
                style={styles.input}
                label={'Fielding team'}
                placeholderTextColor={'white'}
                keyboardType="default"
                value={team2}
                onChangeText={setTeam2}
                mode='outlined'
            />
            <TextInput
                style={styles.input}
                mode='outlined'
                label={'Overs'}
                placeholderTextColor={'white'}
                keyboardType="numeric"
                value={overs}
                onChangeText={setOvers}
            />
            <TextInput
                style={styles.input}
                mode='outlined'
                label={'Wickets'}
                placeholderTextColor={'white'}
                keyboardType="numeric"
                value={wickets}
                onChangeText={setWickets}
            />
            <View style={{ flex: 1 }} />
            <Button textColor='white' buttonColor='#0c66e4' mode='contained' onPress={handleSubmit} >Create Match </Button>
        </View>
    );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 10,
        backgroundColor: 'transparent',
    },
    input: {
        marginBottom: 24,
        paddingHorizontal: 8,
        color: 'white',
    },

});