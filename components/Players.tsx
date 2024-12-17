import { Colors } from "@/constants/Colors";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useTheme } from "@/context/ThemeContext";
import { Player } from "@/firebase/models/Player";
import { player } from "@/types/player";
import { getItem } from "@/utils/asyncStorage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Card, Text, FAB } from "react-native-paper";

const Players = () => {
  const router = useRouter();
  const [players, setPlayers] = useState<player[]>([]);
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const { club } = useTheme();

  useEffect(() => {
    (async () => {
      const playersFromDB: player[] = await Player.getAllFromClub(club.id);
      if (playersFromDB) {
        playersFromDB.sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(playersFromDB);
      }
    })();
  }, []);

  const renderItem = ({ item }: { item: player }) => (
    <Card
      style={[styles.card, themeStyles.card]}
      onPress={() =>
        router.push({
          pathname: "/player/[id]",
          params: { playerId: item.id, playerName: item.name },
        })
      }
    >
      <Card.Content>
        <Text style={[styles.text, themeStyles.text]}>{item.name}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={players}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      <FAB
        style={[styles.fab, themeStyles.fab]}
        small
        icon="plus"
        onPress={() => router.push("/createPlayer")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 8,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

const darkStyles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

const lightStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
  },
  text: {
    color: Colors.light.text,
  },
  fab: {
    backgroundColor: Colors.light.tint,
  },
});

export default Players;
