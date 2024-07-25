import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, useTheme } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";

export const CreatePlayer = () => {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const router = useRouter();

  const handleSave = async () => {
    const players = await getItem(STORAGE_ITEMS.PLAYERS);
    if (players && players.length > 0) {
      if (players.find((p: any) => p.name === name)) {
        alert("Player with this name already exists");
        return;
      }
      players.push({ name, id: players.length + 1 });
      await setItem(STORAGE_ITEMS.PLAYERS, players);
    } else {
      const newPlayer = [{ name, id: 1 }];
      await setItem(STORAGE_ITEMS.PLAYERS, newPlayer);
    }

    router.push("/players");
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Player Name"
        value={name}
        onChangeText={setName}
        style={{ backgroundColor: colors.background }}
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
