import { StyleSheet, View } from 'react-native';

import { useCallback, useState } from 'react';
import { getItem } from '@/utils/asyncStorage';
import { useFocusEffect } from 'expo-router';
import { FloatingMenu } from '@/components/navigation/FloatingMenu';
import { STORAGE_ITEMS } from '@/constants/StorageItems';
import MatchHistory from '@/components/MatchHistory';

export default function TabTwoScreen() {

  const [matches, setMatches] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const fetchMatch = async () => {
        const matches = await getItem(STORAGE_ITEMS.MATCHES);
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
