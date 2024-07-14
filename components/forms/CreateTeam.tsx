import { getItem, setItem } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, View, StyleSheet, Dimensions, GestureResponderEvent } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { Formik, useFormik } from 'formik';
import * as Yup from 'yup';
import { match } from '@/types/match';

const createTeamSchema = Yup.object().shape({
    teamName: Yup.string().required('Team name is required'),
    teamInitials: Yup.string().max(3).required('Short form of the team is required')
});

export const CreateTeam = () => {

    const handleSubmit = async () => {
        alert('Creating a new team');
    };

    const formik = useFormik({
        initialValues: {
            teamName: '',
            teamInitials: ''
        },
        validationSchema: createTeamSchema,
        onSubmit: async (values, { resetForm }) => {
            await handleSubmit();
            resetForm();
        },
    });

    return (
        <View style={styles.formContainer}>
            <TextInput
                style={styles.input}
                label={'Team name'}
                placeholderTextColor={'white'}
                keyboardType="default"
                value={formik.values.teamName}
                onChangeText={formik.handleChange('teamName')}
                onBlur={formik.handleBlur('teamName')}
                mode='outlined'
                error={!!formik.errors.teamName && !!formik.touched.teamName}
            />
            <HelperText type="error" padding='none' visible={!!formik.errors.teamName && !!formik.touched.teamName}>
                {formik.errors.teamName}
            </HelperText>
            <TextInput
                style={styles.input}
                label={'Short form'}
                placeholderTextColor={'white'}
                keyboardType="default"
                value={formik.values.teamInitials}
                onChangeText={(text) => formik.setFieldValue('teamInitials', text.toUpperCase().slice(0, 3))}
                onBlur={formik.handleBlur('teamInitials')}
                mode='outlined'
                error={!!formik.errors.teamInitials && !!formik.touched.teamInitials}
            />
            <HelperText type="error" padding='none' visible={!!formik.errors.teamInitials && !!formik.touched.teamInitials}>
                {formik.errors.teamInitials}
            </HelperText>
            <View style={{ flex: 1 }} />
            <Button textColor='white' buttonColor='#0c66e4' mode='contained' onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void} >Create new team</Button>
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