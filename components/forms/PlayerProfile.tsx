// app/player/[id].tsx
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, Icon } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import PlayerCareerRecords from "../PlayerCareerRecords";
import { useTheme } from "@/context/ThemeContext";

export default function PlayerProfile() {
  const router = useRouter();
  const { playerId, playerName } = useLocalSearchParams();
  const [name, setName] = useState(playerName?.toString());
  const [isEditing, setIsEditing] = useState(false);

  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleSave = async () => {
    const players = await getItem(STORAGE_ITEMS.PLAYERS);
    const player = players.find((p: any) => p.id == playerId);
    player.name = name;
    await setItem(STORAGE_ITEMS.PLAYERS, players);
    router.back();
  };

  const handleDelete = async () => {
    const players = await getItem(STORAGE_ITEMS.PLAYERS);
    const updatedPlayers = players.filter((p: any) => p.id != playerId);
    await removePlayerStats(playerId?.toString());
    await setItem(STORAGE_ITEMS.PLAYERS, updatedPlayers);
    setIsEditing(false);
    router.back();
  };

  const removePlayerStats = async (playerId: string | undefined) => {
    const playerStats = await getItem(STORAGE_ITEMS.PLAYER_CAREER_STATS);
    const updatedPlayerStats = playerStats.filter(
      (p: any) => p.playerId != playerId
    );
    await setItem(STORAGE_ITEMS.PLAYER_CAREER_STATS, updatedPlayerStats);
  };

  return (
    <View style={styles.container}>
      {isEditing ? (
        <>
          <TextInput
            label="Player Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
          />
          <View style={{ flex: 1 }} />
          <View style={styles.iconContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.actionButton}
            >
              <Icon
                source="content-save-check"
                color={currentTheme == "dark" ? "black" : "white"}
                size={20}
              />{" "}
              Save
            </Button>
            <Button
              mode="contained"
              onPress={() => setIsEditing(false)}
              style={styles.actionButton}
            >
              <Icon
                source="close-thick"
                color={currentTheme == "dark" ? "black" : "white"}
                size={20}
              />{" "}
              Cancel
            </Button>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.text, themeStyles.text]}>{playerName}</Text>
          <PlayerCareerRecords
            playerId={playerId ? playerId?.toString() : ""}
          />

          <View style={styles.iconContainer}>
            <Button
              mode="contained"
              onPress={() => setIsEditing(true)}
              style={styles.actionButton}
            >
              <Icon
                source="pencil"
                color={currentTheme == "dark" ? "black" : "white"}
                size={20}
              />{" "}
              Edit
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              style={styles.actionButton}
            >
              <Icon
                source="delete"
                color={currentTheme == "dark" ? "black" : "white"}
                size={20}
              />{" "}
              Delete
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  button: {
    marginTop: 16,
  },
  iconContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  text: {
    fontSize: 24,
    marginBottom: 16,
    padding: 8,
    color: "white",
    textAlign: "center",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

const lightStyles = StyleSheet.create({
  text: {
    fontSize: 24,
    marginBottom: 16,
    padding: 8,
    color: "black",
    textAlign: "center",
  },
});

const darkStyles = StyleSheet.create({
  text: {
    fontSize: 24,
    marginBottom: 16,
    padding: 8,
    color: "white",
    textAlign: "center",
  },
});
