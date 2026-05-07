// app/player/[id].tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextInput, Button, Text, Icon } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import PlayerCareerRecords from "../PlayerCareerRecords";
import PlayerMatchRecords from "../PlayerMatchRecords";
import { useAppContext } from "@/context/AppContext";
import { PlayerRole } from "@/types/player";
import { ROLE_META, getPlayerRole } from "@/constants/playerRoles";
import RolePicker from "@/components/RolePicker";

export default function PlayerProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const playerId =
    params.playerId?.toString() || params.id?.toString() || "";
  const playerName = params.playerName?.toString() || "";

  const [name, setName] = useState(playerName);
  const [role, setRole] = useState<PlayerRole>("BAT");
  const [originalName, setOriginalName] = useState(playerName);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"career" | "matches" | null>(
    "career"
  );
  const { currentTheme, club } = useAppContext();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      if (!playerId) return;
      const fetched = await Player.getById(playerId);
      if (fetched) {
        setName(fetched.name);
        setOriginalName(fetched.name);
        setRole(getPlayerRole(fetched));
      }
    })();
  }, [playerId]);

  const handleSave = async () => {
    const trimmedName = name?.replace(/\s+/g, " ").trim();
    if (!trimmedName) {
      alert("Player name cannot be empty");
      return;
    }

    if (
      trimmedName !== originalName &&
      (await Player.isPlayerExists(trimmedName, club.id))
    ) {
      alert("Player with this name already exists");
      return;
    }

    if (playerId) {
      await Player.update(playerId, { name: trimmedName, role });
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
            await Promise.all([
              Player.delete(playerId),
              PlayerCareerStats.delete(playerId),
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

  const roleMeta = ROLE_META[role];
  const isDark = currentTheme === "dark";

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      {isEditing ? (
        <>
          <TextInput
            label="Player Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
          />
          <Text
            style={[
              styles.sectionLabel,
              { color: isDark ? "#9AA39F" : "#6B7571" },
            ]}
          >
            ROLE
          </Text>
          <RolePicker value={role} onChange={setRole} />
        </>
      ) : (
        <>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? "white" : "black" },
            ]}
          >
            {name || playerName}
          </Text>
          <View style={styles.roleBadgeWrap}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: `${roleMeta.color}14` },
              ]}
            >
              <View style={[styles.roleDot, { backgroundColor: roleMeta.color }]} />
              <Text style={[styles.roleBadgeText, { color: roleMeta.color }]}>
                {roleMeta.label}
              </Text>
            </View>
          </View>
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
              <PlayerCareerRecords playerId={playerId} />
            </>
          )}
          {activeTab === "matches" && (
            <>
              <PlayerMatchRecords playerId={playerId} />
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
    marginBottom: 8,
    textAlign: "center",
    opacity: 0.8,
  },
  roleBadgeWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
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
