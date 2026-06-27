import React, { useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAppContext } from "@/context/AppContext";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { PlayerRole } from "@/types/player";
import RolePicker from "@/components/RolePicker";

export const CreatePlayer = () => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<PlayerRole>("BAT");
  const router = useRouter();
  const { currentTheme, club } = useAppContext();
  const insets = useSafeAreaInsets();

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

    const player = await Player.create({
      name: trimmedName,
      clubId: club.id,
      role,
    });
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
      matchesWon: 0,
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
      catches: 0,
      stumpings: 0,
      runOuts: 0,
      clubId: club.id,
    });
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <TextInput
        label="Player Name"
        value={name}
        onChangeText={setName}
        style={[{ backgroundColor: "#fff" }, themeStyles.input]}
        mode="outlined"
      />
      <Text style={[styles.sectionLabel, themeStyles.sectionLabel]}>ROLE</Text>
      <RolePicker value={role} onChange={setRole} />
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
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },
});

const lightStyles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
  },
  sectionLabel: {
    color: "#6B7571",
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: "#151718",
  },
  sectionLabel: {
    color: "#9AA39F",
  },
});
