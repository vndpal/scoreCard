import { StyleSheet, View, TextInput, Button, KeyboardAvoidingView, Keyboard } from 'react-native';

import { useCallback, useEffect, useState } from 'react';
import { red } from 'react-native-reanimated/lib/typescript/reanimated2/Colors';
import { getItem, setItem } from '@/utils/asyncStorage';
import MatchHistory from '@/components/MatchHisoty';
import { router, useFocusEffect } from 'expo-router';
import DropDownPicker from 'react-native-dropdown-picker';

export default function TabTwoScreen() {

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' }
  ]);

  const [overs, setOvers] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [wickets, setWickets] = useState('');
  const [matches, setMatches] = useState([]);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true); // Set the state to true when keyboard is visible
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false); // Set the state to false when keyboard is hidden
      }
    );

    // Cleanup function to remove the listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchMatch = async () => {
        const matches = await getItem('matches');
        setMatches(matches);
      }
      fetchMatch();
    }, [])
  );

  const handleSubmit = async () => {
    // Create a match with the entered overs and wickets
    console.log(`Creating a match with ${overs} overs and ${wickets} wickets.`);
    const matches = await getItem('matches');
    setMatches(matches);
    console.log(matches);
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
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Team 1 name"
          placeholderTextColor={'white'}
          keyboardType="default"
          value={team1}
          onChangeText={setTeam1}
        />
        <TextInput
          style={styles.input}
          placeholder="Team 2 name"
          placeholderTextColor={'white'}
          keyboardType="default"
          value={team2}
          onChangeText={setTeam2}
        />
        <TextInput
          style={styles.input}
          placeholder="Number of overs"
          placeholderTextColor={'white'}
          keyboardType="numeric"
          value={overs}
          onChangeText={setOvers}
        />
        <TextInput
          style={styles.input}
          placeholder="Number of wickets"
          placeholderTextColor={'white'}
          keyboardType="numeric"
          value={wickets}
          onChangeText={setWickets}
        />
        <Button title="Create Match" onPress={handleSubmit} />
      </View>
      {!isKeyboardVisible && <MatchHistory matches={matches} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: '100%',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    maxHeight: '50%',
    backgroundColor: 'transparent',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
    color: 'white',
  }
});
