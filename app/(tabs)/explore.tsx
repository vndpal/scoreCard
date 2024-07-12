import { StyleSheet, View, TextInput, Button, KeyboardAvoidingView, Keyboard } from 'react-native';

import { useCallback, useEffect, useState } from 'react';
import { red } from 'react-native-reanimated/lib/typescript/reanimated2/Colors';
import { getItem, setItem } from '@/utils/asyncStorage';
import MatchHistory from '@/components/MatchHisoty';
import { router, useFocusEffect } from 'expo-router';
import DropDownPicker from 'react-native-dropdown-picker';
import { FloatingMenu } from '@/components/navigation/FloatingMenu';
import { CreateMatch } from '@/components/forms/CreateMatch';
import PopUpWindow from '@/components/forms/PopUpWindow';

export default function TabTwoScreen() {

  const [matches, setMatches] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const fetchMatch = async () => {
        const matches = await getItem('matches');
        setMatches(matches);
      }
      fetchMatch();
    }, [])
  );


  return (
    <>
      <View style={styles.container}>
        {<MatchHistory matches={matches} />}

      </View>
      <FloatingMenu />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: '100%',
  }
});
