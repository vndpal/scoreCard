// app/player/[id].tsx
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  TextInput,
  Button,
  useTheme,
  Text,
  IconButton,
  Icon,
} from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";

export default function PlayerProfile() {
  const { colors } = useTheme();
  const router = useRouter();
  const { playerId, playerName } = useLocalSearchParams();
  const [name, setName] = useState(playerName?.toString());
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    const players = await getItem(STORAGE_ITEMS.PLAYERS);
    console.log(players);
    const player = players.find((p: any) => p.id == playerId);
    player.name = name;
    await setItem(STORAGE_ITEMS.PLAYERS, players);
    setIsEditing(false);
    router.push("/players");
  };

  const handleDelete = async () => {
    const players = await getItem(STORAGE_ITEMS.PLAYERS);
    const updatedPlayers = players.filter((p: any) => p.id != playerId);
    await setItem(STORAGE_ITEMS.PLAYERS, updatedPlayers);
    setIsEditing(false);
    router.push("/players");
  };

  return (
    <View style={styles.container}>
      {isEditing ? (
        <>
          <TextInput
            label="Player Name"
            value={name}
            onChangeText={setName}
            style={{ backgroundColor: colors.background }}
            mode="outlined"
          />
          <View style={{ flex: 1 }} />
          <View style={styles.iconContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.actionButton}
            >
              <Icon source="content-save-check" color="black" size={20} /> Save
            </Button>
            <Button
              mode="contained"
              onPress={() => setIsEditing(false)}
              style={styles.actionButton}
            >
              <Icon source="close-thick" color="black" size={20} /> Cancel
            </Button>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.text}>{playerName}</Text>
          <View style={{ flex: 1 }} />
          <View style={styles.iconContainer}>
            <Button
              mode="contained"
              onPress={() => setIsEditing(true)}
              style={styles.actionButton}
            >
              <Icon source="pencil" color="black" size={20} /> Edit
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              style={styles.actionButton}
            >
              <Icon source="delete" color="black" size={20} /> Delete
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
    fontSize: 18,
    color: "white",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
