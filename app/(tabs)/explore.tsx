import React from "react";
import { StyleSheet, View } from "react-native";
import { useCallback, useState } from "react";
import { getItem } from "@/utils/asyncStorage";
import { useFocusEffect } from "expo-router";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import MatchHistory from "@/components/MatchHistory";
import { Player } from "@/firebase/models/Player";
import { Match } from "@/firebase/models/Match";
import { match } from "@/types/match";
import { useTheme } from "@/context/ThemeContext";

export default function TabTwoScreen() {
  const [matches, setMatches] = useState<match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const { club } = useTheme();
  useFocusEffect(
    useCallback(() => {
      const fetchMatch = async () => {
        const matches = await Match.getAllOrderby(
          club.id,
          "startDateTime",
          "desc"
        );
        const playersFromDB = await Player.getAll();
        setMatches(matches);
        if (playersFromDB && playersFromDB.length > 0) {
          setPlayers(playersFromDB);
        }
      };
      fetchMatch();
    }, [])
  );

  return (
    <>
      <View style={styles.container}>
        {<MatchHistory matches={matches} players={players} />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    maxHeight: "100%",
  },
});
