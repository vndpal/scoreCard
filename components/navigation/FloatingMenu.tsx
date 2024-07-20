import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TouchableOpacity, View, useColorScheme, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import { Button } from 'react-native-elements/dist/buttons/Button';

export const FloatingMenu: React.FC = () => {

    const router = useRouter();

    const colorScheme = useColorScheme();
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const toggleMenu = () => {
        setIsMenuVisible(!isMenuVisible);
    }

    const handleLinkPress = (route: string) => {
        toggleMenu();
        router.push(route)
    }

    return (
        <View>
            <TouchableOpacity
                style={styles.menuButton}
                onPress={toggleMenu}>
                {isMenuVisible ? <Ionicons name="close" size={24} color="white" /> : <Ionicons name="add" size={24} color="white" />}
            </TouchableOpacity>
            {isMenuVisible && (

                <View style={styles.menuOptions}>
                    <TouchableOpacity onPress={() => handleLinkPress('createMatch')}>
                        <Text style={styles.menuOptionText}>🏏 New match</Text>
                    </TouchableOpacity>

                    <View style={styles.horizontalLine} />
                    <TouchableOpacity onPress={() => handleLinkPress('toss')} >
                        <Text style={styles.menuOptionText}>🪙 Toss</Text>
                    </TouchableOpacity>
                    <View style={styles.horizontalLine} />
                    <TouchableOpacity onPress={() => handleLinkPress('createTeam')} >
                        <Text style={styles.menuOptionText}>🙌 New team</Text>
                    </TouchableOpacity>
                    <View style={styles.horizontalLine} />
                    <TouchableOpacity onPress={() => handleLinkPress('teamLineup')} >
                        <Text style={styles.menuOptionText}>📋 Player draft</Text>
                    </TouchableOpacity>
                </View>

            )}
        </View>
    );
};

const styles = StyleSheet.create({
    menuButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007bff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuOptions: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        backgroundColor: '#007bff',
        borderRadius: 8,
        padding: 10,
    },
    menuOptionText: {
        fontSize: 16,
        color: 'white',
        padding: 10,
    },
    horizontalLine: {
        borderBottomColor: 'black',
        borderBottomWidth: 1,
    }
});