import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Icon } from 'react-native-elements';

// Define the Player type
type Player = {
    id: string;
    name: string;
    team: 'none' | 'team1' | 'team2';
};

// Define the TeamLineup component
const TeamLineup: React.FC = () => {
    // Initialize the state with a list of players
    const [players, setPlayers] = useState<Player[]>([
        { id: '1', name: 'Player 1', team: 'none' },
        { id: '2', name: 'Player 2', team: 'none' },
        { id: '3', name: 'Player 3', team: 'none' },
        { id: '4', name: 'Player 4', team: 'none' },
        { id: '5', name: 'Player 5', team: 'none' },
        { id: '6', name: 'Player 6', team: 'none' },
        { id: '7', name: 'Player 7', team: 'none' },
        { id: '8', name: 'Player 8', team: 'none' },
        { id: '9', name: 'Player 9', team: 'none' },
        { id: '10', name: 'Player 10', team: 'none' },
        { id: '11', name: 'Player 11', team: 'none' },
        { id: '12', name: 'Player 12', team: 'none' },
    ]);

    // Handle assigning a player to a team or making them available
    const assignToTeam = (playerId: string, team: 'team1' | 'team2') => {
        setPlayers(players.map(player =>
            player.id === playerId
                ? { ...player, team: player.team === team ? 'none' : team }
                : player
        ));
    };

    // Handle saving the team assignments
    const saveTeams = () => {
        const team1 = players.filter(player => player.team === 'team1');
        const team2 = players.filter(player => player.team === 'team2');
        // Handle saving logic here (e.g., send to server, store locally, etc.)
        Alert.alert('Teams Saved', `Team 1: ${team1.length} players\nTeam 2: ${team2.length} players`);
    };

    // Sort players based on their team assignment
    const sortedPlayers = players.slice().sort((a, b) => {
        if (a.team === 'none') return -1;
        if (b.team === 'none') return 1;
        if (a.team === 'team1' && b.team === 'team2') return -1;
        if (a.team === 'team2' && b.team === 'team1') return 1;
        return 0;
    });

    // Render a single player card
    const renderPlayer = ({ item }: { item: Player }) => (
        <View style={styles.card}>
            <Text style={styles.playerName}>{item.name}</Text>
            <View style={styles.iconContainer}>
                <TouchableOpacity onPress={() => assignToTeam(item.id, 'team1')}>
                    <Icon
                        name='check-circle'
                        type='EvilIcons'
                        color={item.team === 'team1' ? '#81C784' : '#CCCCCC'}
                        size={30}
                        style={styles.icon}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => assignToTeam(item.id, 'team2')}>
                    <Icon
                        name='check-circle'
                        type='EvilIcons'
                        size={30}
                        color={item.team === 'team2' ? '#64B5F6' : '#CCCCCC'}
                        style={styles.icon}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerText, styles.headerPlayerName]}>Player</Text>
                <View style={styles.headerIcons}>
                    <Text style={styles.headerText}>CSK</Text>
                    <Text style={styles.headerText}>RCB</Text>
                </View>
            </View>
            <FlatList
                data={sortedPlayers}
                keyExtractor={item => item.id}
                renderItem={renderPlayer}
            />
            <View style={styles.buttons}>
                <TouchableOpacity style={styles.configButton} onPress={saveTeams}>
                    <Icon name='swap' type='entypo' color='white' ></Icon><Text style={styles.saveButtonText}> Change team</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.configButton} onPress={saveTeams}>
                    <Icon name='random' type='font-awesome' color='white' ></Icon><Text style={styles.saveButtonText}>Randomize</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.buttons}>
                <TouchableOpacity style={styles.saveButton} onPress={saveTeams}>
                    <Text style={styles.saveButtonText}>Preview and save</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#121212', // Dark background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333', // Darker border
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        color: '#ffffff', // White text color
    },
    headerPlayerName: {
        flex: 2,
        textAlign: 'left',
    },
    headerIcons: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        marginVertical: 5,
        backgroundColor: '#1e1e1e', // Darker card background
        borderRadius: 5,
        elevation: 1,
    },
    playerName: {
        fontSize: 18,
        flex: 2,
        color: '#ffffff', // White text color
    },
    iconContainer: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-around',
    },
    icon: {
        marginHorizontal: 10,
    },
    saveButton: {
        flexDirection: 'row',
        flex: 1,
        backgroundColor: '#0c66e4',
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginHorizontal: 5,
        borderRadius: 25,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    configButton: {
        flexDirection: 'row',
        flex: 1,
        backgroundColor: 'green',
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginHorizontal: 5,
        borderRadius: 25,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 5, // Add space between icon and text
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginVertical: 5,
    },
});


// Export the TeamLineup component
export default TeamLineup;
