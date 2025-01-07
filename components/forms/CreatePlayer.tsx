import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { player } from "@/types/player";
import { useTheme } from "@/context/ThemeContext";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";

export const CreatePlayer = () => {
  const [name, setName] = useState("");
  const router = useRouter();
  const { currentTheme, club } = useTheme();

  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleSave = async () => {
    if (name == "") {
      alert("Player name cannot be empty");
      return;
    }
    const trimmedName = name?.replace(/\s+/g, " ").trim();
    const isPlayerExists = await Player.isPlayerExists(trimmedName, club.id);

    if (isPlayerExists) {
      alert("Player with this name already exists");
      return;
    }

    const player = await Player.create({ name: trimmedName, clubId: club.id });
    if (player) {
      await insertPlayerCareerStats(player.id);
    }

    router.dismissAll();
    router.push("/players");
  };

  const insertPlayerCareerStats = async (playerId: string) => {
    const playerCareerStats = await PlayerCareerStats.create({
      playerId,
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
      foursConceded: 0,
      sixesConceded: 0,
      dotBalls: 0,
      clubId: club.id,
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Player Name"
        value={name}
        onChangeText={setName}
        style={[{ backgroundColor: "#fff" }, themeStyles.input]}
        mode="outlined"
      />
      <Button mode="contained" onPress={handleSave} style={styles.button}>
        Add new player
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
    backgroundColor: "#fff",
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: "#151718",
  },
});
