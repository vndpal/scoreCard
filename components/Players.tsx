import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { player } from "@/types/player";
import { getItem } from "@/utils/asyncStorage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Card, Button, Text, FAB, useTheme } from "react-native-paper";

const Players = ({ navigation }: any) => {
  const router = useRouter();
  const [players, setPlayers] = useState<player[]>([]);

  useEffect(() => {
    (async () => {
      const players: player[] = await getItem(STORAGE_ITEMS.PLAYERS);
      if (players) {
        setPlayers(players);
      }
    })();
  });

  const renderItem = ({ item }: { item: player }) => (
    <Card
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: `/player/${item.id}`,
          params: { playerId: item.id, playerName: item.name },
        })
      }
    >
      <Card.Content>
        <Text style={styles.text}>{item.name}</Text>
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
        style={styles.fab}
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
    color: "white",
  },
});

export default Players;
