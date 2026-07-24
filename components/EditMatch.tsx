import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, SegmentedButtons } from "react-native-paper";
import { Dropdown } from "react-native-paper-dropdown";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppContext } from "@/context/AppContext";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { playerStats } from "@/types/playerStats";
import { swapMatchPlayers, SwapMode } from "@/utils/swapMatchPlayers";
import Loader from "./Loader";

type Option = { label: string; value: string };

const EditMatch = () => {
  const { matchId, team1, team2 } = useLocalSearchParams<{
    matchId: string;
    team1: string;
    team2: string;
  }>();
  const router = useRouter();
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const insets = useSafeAreaInsets();

  const [players, setPlayers] = useState<playerStats[]>([]);
  const [mode, setMode] = useState<SwapMode>("batsman");
  const [team, setTeam] = useState<string>(team1 ?? "");
  const [playerA, setPlayerA] = useState<string>("");
  const [playerB, setPlayerB] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const stats = await PlayerMatchStats.getByMatchId(matchId as string);
      setPlayers(stats?.playerMatchStats ?? []);
    })();
  }, [matchId]);

  const teamOptions: Option[] = useMemo(
    () =>
      [team1, team2]
        .filter(Boolean)
        .map((t) => ({ label: t as string, value: t as string })),
    [team1, team2]
  );

  const teamPlayers = useMemo(
    () => players.filter((p) => p.team === team),
    [players, team]
  );

  const optionsA: Option[] = useMemo(
    () => teamPlayers.map((p) => ({ label: p.name, value: p.playerId })),
    [teamPlayers]
  );

  // B can be anyone on the team except whoever is chosen as A.
  const optionsB: Option[] = useMemo(
    () =>
      teamPlayers
        .filter((p) => p.playerId !== playerA)
        .map((p) => ({ label: p.name, value: p.playerId })),
    [teamPlayers, playerA]
  );

  const nameOf = (id: string) =>
    players.find((p) => p.playerId === id)?.name ?? id;

  const onTeamChange = (value?: string) => {
    if (!value || value === team) return;
    setTeam(value);
    setPlayerA("");
    setPlayerB("");
  };

  const doSwap = async () => {
    try {
      setLoading(true);
      await swapMatchPlayers(
        matchId as string,
        playerA,
        playerB,
        mode
      );
      setLoading(false);
      // Fresh Match Summary so it re-reads the corrected data.
      router.replace({
        pathname: "/matchSummary",
        params: { matchId, team1, team2 },
      });
    } catch (e: any) {
      setLoading(false);
      Alert.alert(
        "Could not swap",
        e?.message ?? "Something went wrong. Please try again."
      );
    }
  };

  const handleConfirm = () => {
    if (!playerA || !playerB) {
      Alert.alert("Pick players", "Choose both players to swap.");
      return;
    }
    if (playerA === playerB) {
      Alert.alert("Pick players", "Choose two different players.");
      return;
    }
    const roleLabel = mode === "batsman" ? "batsmen" : "bowlers";
    Alert.alert(
      "Confirm swap",
      `Swap ${roleLabel} ${nameOf(playerA)} and ${nameOf(
        playerB
      )}? This rewrites the match ball-by-ball and both players' stats.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Swap", style: "destructive", onPress: doSwap },
      ]
    );
  };

  return (
    <View
      style={[styles.container, themeStyles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: 80 + insets.bottom },
        ]}
      >
        <Text style={[styles.helpText, themeStyles.subtleText]}>
          Correct a wrongly recorded player in this completed match. Every ball
          where one player {mode === "batsman" ? "batted" : "bowled"} is moved to
          the other, and all stats are recomputed.
        </Text>

        <Text style={[styles.label, themeStyles.label]}>What to swap</Text>
        <SegmentedButtons
          value={mode}
          onValueChange={(v) => {
            setMode(v as SwapMode);
            setPlayerA("");
            setPlayerB("");
          }}
          buttons={[
            { value: "batsman", label: "Batsmen" },
            { value: "bowler", label: "Bowlers" },
          ]}
          style={styles.segment}
        />

        <Text style={[styles.label, themeStyles.label]}>Team</Text>
        <View style={styles.field}>
          <Dropdown
            label="Team"
            options={teamOptions}
            value={team}
            onSelect={onTeamChange}
            mode="outlined"
          />
        </View>

        <Text style={[styles.label, themeStyles.label]}>
          {mode === "batsman" ? "Batsman A" : "Bowler A"} (wrongly recorded)
        </Text>
        <View style={styles.field}>
          <Dropdown
            label="Select player"
            options={optionsA}
            value={playerA}
            onSelect={(v) => setPlayerA(v ?? "")}
            mode="outlined"
          />
        </View>

        <Text style={[styles.label, themeStyles.label]}>
          {mode === "batsman" ? "Batsman B" : "Bowler B"} (who actually played)
        </Text>
        <View style={styles.field}>
          <Dropdown
            label="Select player"
            options={optionsB}
            value={playerB}
            onSelect={(v) => setPlayerB(v ?? "")}
            mode="outlined"
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.buttonContainer,
          themeStyles.buttonContainer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Button
          textColor="white"
          buttonColor="#0c66e4"
          mode="contained"
          onPress={handleConfirm}
          disabled={loading}
        >
          Swap players
        </Button>
      </View>

      {loading && (
        <View style={styles.loaderOverlay}>
          <Loader />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  segment: {
    marginBottom: 4,
  },
  field: {
    marginBottom: 4,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  loaderOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
  },
  label: {
    color: "#ffffff",
  },
  subtleText: {
    color: "#b0b0b0",
  },
  buttonContainer: {
    backgroundColor: "#121212",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
  label: {
    color: "#000000",
  },
  subtleText: {
    color: "#555555",
  },
  buttonContainer: {
    backgroundColor: "#f5f5f5",
  },
});

export default EditMatch;
