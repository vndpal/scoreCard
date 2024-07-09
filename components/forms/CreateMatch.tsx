import { getItem, setItem } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, View, StyleSheet, Dimensions, GestureResponderEvent } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { Formik, useFormik } from 'formik';
import * as Yup from 'yup';

const createMatchSchema = Yup.object().shape({
    team1: Yup.string().required('Batting team is required'),
    team2: Yup.string().required('Fielding team is required'),
    overs: Yup.number().required('Overs are required'),
    wickets: Yup.number().required('Wickets are required'),
});

export const CreateMatch = () => {


    const handleSubmit = async () => {
        console.log(`Creating a match with ${formik.values.overs} overs and ${formik.values.wickets} wickets.`);
        const matches = await getItem('matches');
        const { overs, wickets, team1, team2 } = formik.values;
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

    const formik = useFormik({
        initialValues: {
            team1: '',
            team2: '',
            overs: '',
            wickets: ''
        },
        validationSchema: createMatchSchema,
        onSubmit: async (values, { resetForm }) => {
            await handleSubmit();
            resetForm();
        },
    });

    return (
        <View style={styles.formContainer}>
            <TextInput
                style={styles.input}
                label={'Batting team'}
                placeholderTextColor={'white'}
                keyboardType="default"
                value={formik.values.team1}
                onChangeText={formik.handleChange('team1')}
                mode='outlined'
                error={!!formik.errors.team1}
            />
            <HelperText type="error" padding='none' visible={!!formik.errors.team1}>
                {formik.errors.team1}
            </HelperText>
            <TextInput
                style={styles.input}
                label={'Fielding team'}
                placeholderTextColor={'white'}
                keyboardType="default"
                value={formik.values.team2}
                onChangeText={formik.handleChange('team2')}
                mode='outlined'
                error={!!formik.errors.team2}
            />
            <HelperText type="error" padding='none' visible={!!formik.errors.team2}>
                {formik.errors.team2}
            </HelperText>
            <TextInput
                style={styles.input}
                mode='outlined'
                label={'Overs'}
                placeholderTextColor={'white'}
                keyboardType="numeric"
                value={formik.values.overs}
                onChangeText={formik.handleChange('overs')}
                error={!!formik.errors.overs}
            />
            <HelperText type="error" padding='none' visible={!!formik.errors.overs}>
                {formik.errors.overs}
            </HelperText>
            <TextInput
                style={styles.input}
                mode='outlined'
                label={'Wickets'}
                placeholderTextColor={'white'}
                keyboardType="numeric"
                value={formik.values.wickets}
                onChangeText={formik.handleChange('wickets')}
                error={!!formik.errors.wickets}
            />
            <HelperText type="error" padding='none' visible={!!formik.errors.wickets}>
                {formik.errors.wickets}
            </HelperText>
            <View style={{ flex: 1 }} />
            <Button textColor='white' buttonColor='#0c66e4' mode='contained' onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void} >Create Match </Button>
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
        paddingHorizontal: 8,
        color: 'white',
    },

});