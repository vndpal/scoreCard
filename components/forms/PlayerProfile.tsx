// app/player/[id].tsx
import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { TextInput, Button, Text, Icon } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import PlayerCareerRecords from "../PlayerCareerRecords";
import PlayerMatchRecords from "../PlayerMatchRecords";
import { useAppContext } from "@/context/AppContext";

export default function PlayerProfile() {
  const router = useRouter();
  const { playerId, playerName } = useLocalSearchParams();
  const [name, setName] = useState(playerName?.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"career" | "matches" | null>(
    "career"
  );
  const { currentTheme, club } = useAppContext();
  const handleSave = async () => {
    const trimmedName = name?.replace(/\s+/g, " ").trim();
    if (!trimmedName) {
      alert("Player name cannot be empty");
      return;
    }

    if (await Player.isPlayerExists(trimmedName, club.id)) {
      alert("Player with this name already exists");
      return;
    }

    if (playerId) {
      await Player.update(playerId.toString(), { name: trimmedName });
      router.replace("/players");
    }
  };

  const handleDelete = () => {
    Alert.alert(`Delete ${playerName}`, "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          if (playerId) {
            const id = playerId.toString();
            await Promise.all([
              Player.delete(id),
              PlayerCareerStats.delete(id),
            ]);
            router.replace("/players");
          }
        },
      },
    ]);
  };

  const ActionButtons = () => (
    <View style={styles.actions}>
      <Button
        mode="contained"
        onPress={isEditing ? handleSave : () => setIsEditing(true)}
        style={styles.button}
      >
        <Icon
          source={isEditing ? "content-save" : "pencil"}
          color={currentTheme === "dark" ? "black" : "white"}
          size={20}
        />
        {" " + (isEditing ? "Save" : "Edit")}
      </Button>
      <Button
        mode="contained"
        onPress={isEditing ? () => setIsEditing(false) : handleDelete}
        style={styles.button}
      >
        <Icon
          source={isEditing ? "close" : "delete"}
          color={currentTheme === "dark" ? "black" : "white"}
          size={20}
        />
        {" " + (isEditing ? "Cancel" : "Delete")}
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      {isEditing ? (
        <TextInput
          label="Player Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />
      ) : (
        <>
          <Text
            style={[
              styles.subtitle,
              { color: currentTheme === "dark" ? "white" : "black" },
            ]}
          >
            {playerName}
          </Text>
          <View style={styles.tabs}>
            <Button
              mode={activeTab === "career" ? "contained" : "outlined"}
              onPress={() => setActiveTab("career")}
              style={[styles.tab, activeTab === "career" && styles.activeTab]}
              labelStyle={
                activeTab === "career" ? styles.activeTabText : styles.tabText
              }
            >
              Career Stats
            </Button>
            <Button
              mode={activeTab === "matches" ? "contained" : "outlined"}
              onPress={() => setActiveTab("matches")}
              style={[styles.tab, activeTab === "matches" && styles.activeTab]}
              labelStyle={
                activeTab === "matches" ? styles.activeTabText : styles.tabText
              }
            >
              Match Stats
            </Button>
          </View>
          {activeTab === "career" && (
            <>
              <PlayerCareerRecords playerId={playerId?.toString() || ""} />
            </>
          )}
          {activeTab === "matches" && (
            <>
              <PlayerMatchRecords playerId={playerId?.toString() || ""} />
            </>
          )}
        </>
      )}
      <ActionButtons />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: "center",
    opacity: 0.8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  tabs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
  },
  activeTab: {
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
