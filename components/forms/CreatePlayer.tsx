import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, useTheme } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { player } from "@/types/player";
import { useTheme as currentSelectedTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";

export const CreatePlayer = () => {
  const { colors } = useTheme();
  const { currentTheme } = currentSelectedTheme();
  const [name, setName] = useState("");
  const router = useRouter();

  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleSave = async () => {
    const players: player[] = await getItem(STORAGE_ITEMS.PLAYERS);
    if (players && players.length > 0) {
      if (players.find((p: any) => p.name == name)) {
        alert("Player with this name already exists");
        return;
      }
      const playerId = Number.isNaN(players[players.length - 1].id)
        ? "1"
        : (parseInt(players[players.length - 1].id) + 1).toString();

      players.push({ name, id: playerId });
      await setItem(STORAGE_ITEMS.PLAYERS, players);
      await insertPlayerCareerStats(playerId);
    } else {
      const newPlayer = [{ name, id: "1" }];
      await setItem(STORAGE_ITEMS.PLAYERS, newPlayer);
      await insertPlayerCareerStats("1");
    }

    router.back();
  };

  const insertPlayerCareerStats = async (playerId: string) => {
    const playerCareerStats = await getItem(STORAGE_ITEMS.PLAYER_CAREER_STATS);
    console.log(playerCareerStats);
    console.log(playerId);
    if (playerCareerStats) {
      playerCareerStats.push({
        playerId: playerId,
        matches: 0,
        innings: 0,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        average: 0,
        notOuts: 0,
        wickets: 0,
        overs: 0,
        ballsBowled: 0,
        extras: 0,
        runsConceded: 0,
        maidens: 0,
        bowlingEconomy: 0,
      });
      await setItem(STORAGE_ITEMS.PLAYER_CAREER_STATS, playerCareerStats);
    } else {
      const newPlayerCareerStats = [
        {
          playerId: playerId,
          matches: 0,
          innings: 0,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          average: 0,
          notOuts: 0,
          wickets: 0,
          overs: 0,
          ballsBowled: 0,
          extras: 0,
          runsConceded: 0,
          maidens: 0,
          bowlingEconomy: 0,
        },
      ];
      await setItem(STORAGE_ITEMS.PLAYER_CAREER_STATS, newPlayerCareerStats);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Player Name"
        value={name}
        onChangeText={setName}
        style={[{ backgroundColor: colors.background }, themeStyles.input]}
        mode="outlined"
      />
      <Button mode="contained" onPress={handleSave} style={styles.button}>
        Save
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  button: {
    marginTop: 16,
  },
});

const lightStyles = StyleSheet.create({
  input: {
    backgroundColor: Colors.light.background,
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: Colors.dark.background,
  },
});
