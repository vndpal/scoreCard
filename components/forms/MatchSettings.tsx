import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { match } from "@/types/match";
import { getItem, setItem } from "@/utils/asyncStorage";
import { updatePlayerCareerStats } from "@/utils/updatePlayerCareerStats";
import { useRoute } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Switch, Button, TextInput } from "react-native-paper";
import { Dropdown } from "react-native-paper-dropdown";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { useTheme } from "@/context/ThemeContext";
import { updateManOfTheMatch } from "@/utils/updateManOfTheMatch";
import { matchResult } from "@/types/matchResult";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { Match } from "@/firebase/models/Match";
import Loader from "../Loader";
import { Timestamp } from "@react-native-firebase/firestore";
import * as Updates from "expo-updates";
import { updatePlayerTournamentStats } from "@/utils/updatePlayerTournamentStat";
type items = {
  label: string;
  value: string;
};

const MatchSettings = () => {
  const [overs, setOvers] = useState<string>("");
  const [declareInnings, setDeclareInnings] = useState<boolean>(false);
  const [currentMatch, setCurrentMatch] = useState<match>();
  const [items, setItems] = useState<items[]>([]);
  const [matchStatus, setMatchStatus] = useState<matchResult>("completed");
  const [winner, setWinner] = useState<string>("");
  const { currentTheme, club } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchMatch();
  }, []);

  const fetchMatch = async () => {
    const match = await Match.getLatestMatch(club.id);
    if (!match) {
      return;
    }
    setCurrentMatch(match);
    setOvers(match.overs.toString());
    const items: items[] = [
      { label: `${match.team1} won`, value: match.team1 },
      { label: `${match.team2} won`, value: match.team2 },
      { label: "Tied", value: "tied" },
      { label: "Draw", value: "draw" },
      { label: "No Result", value: "noResult" },
      { label: "Cancelled", value: "abandoned" },
    ];
    setItems(items);
  };

  const handleOversChange = (value: string) => {
    if (value) {
      setOvers(value);
    } else {
      setOvers("");
    }
  };

  const handleDeclareInningsToggle = () => {
    setDeclareInnings(!declareInnings);
  };

  const handleSaveSettings = async () => {
    if (currentMatch) {
      setLoading(true);
      if (declareInnings) {
        // declare innings handling
        if (currentMatch.isFirstInning) {
          await Match.update(currentMatch.matchId, {
            isFirstInning: !currentMatch.isFirstInning,
          });
          Keyboard.dismiss();
          router.push("/");
        } else {
          if (winner === "") {
            alert("Winner cannot be empty");
            return;
          }

          const updateData: Partial<Match> = {
            status: matchStatus,
            endDateTime: Timestamp.now(),
          };

          if (matchStatus === "completed") {
            updateData.winner =
              winner === currentMatch.team1 ? "team1" : "team2";
          }

          await Match.update(currentMatch.matchId, updateData);

          const playerMatchStats: playerMatchStats | null =
            await PlayerMatchStats.getByMatchId(currentMatch.matchId);
          if (playerMatchStats) {
            if (matchStatus !== "abandoned") {
              await updatePlayerCareerStats(playerMatchStats.playerMatchStats);
              await updatePlayerTournamentStats(
                playerMatchStats.playerMatchStats,
                currentMatch.tournamentId,
                currentMatch.clubId
              );
            }
            await updateManOfTheMatch(currentMatch.matchId);
          }
          await Updates.reloadAsync();
          Keyboard.dismiss();
          setLoading(false);
          router.push("/");
        }
      } else {
        // overs change handling
        if (overs === "" || parseInt(overs) != currentMatch.overs) {
          if (overs === "") {
            alert("Overs cannot be empty");
            return;
          } else if (!currentMatch.isFirstInning) {
            alert("Overs can only be changed during first innings only");
            return;
          } else if (
            parseInt(overs) < currentMatch.currentScore.team1.totalOvers
          ) {
            alert(
              `${currentMatch.currentScore.team1.totalOvers} overs have already been bowled. Overs cannot be less than that`
            );
            return;
          }
        }

        await Match.update(currentMatch.matchId, { overs: parseInt(overs) });
        Keyboard.dismiss();
        router.push("/");
        setLoading(false);
      }
    }
  };

  const handleDdlChange = (value: string) => {
    if (
      value === "tied" ||
      value === "draw" ||
      value === "noResult" ||
      value === "abandoned"
    ) {
      setMatchStatus(value);
    }
    setWinner(value);
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.settingItem, themeStyles.settingItem]}>
          <Text style={[styles.label, themeStyles.label]}>Change overs</Text>
          <TextInput
            style={[styles.input, themeStyles.input]}
            keyboardType="numeric"
            onChangeText={handleOversChange}
            value={overs.toString()}
            placeholder="Enter overs"
            mode="flat"
            placeholderTextColor={currentTheme === "dark" ? "#fff" : "#000"}
          />
        </View>
        <View style={[styles.settingItem, themeStyles.settingItem]}>
          <Text style={[styles.label, themeStyles.label]}>Declare innings</Text>
          <Switch
            value={declareInnings}
            onValueChange={handleDeclareInningsToggle}
            trackColor={{ false: "#767577", true: "#4CAF50" }}
            thumbColor={declareInnings ? "#81C784" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            style={styles.switch}
          />
        </View>
        {declareInnings && !currentMatch?.isFirstInning && (
          <View style={[styles.settingItem, themeStyles.settingItem]}>
            <Text style={[styles.label, themeStyles.label]}>Result</Text>
            <Dropdown
              label="Result"
              options={items}
              value={winner}
              onSelect={handleDdlChange}
              mode="outlined"
            />
          </View>
        )}
      </ScrollView>
      <View style={[styles.buttonContainer, themeStyles.buttonContainer]}>
        <Button
          textColor="white"
          buttonColor="#0c66e4"
          mode="contained"
          onPress={handleSaveSettings}
        >
          Save settings
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
    backgroundColor: "#121212",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 60, // Ensure there is space for the button
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  label: {
    fontSize: 16,
    color: "#fff",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    fontSize: 16,
    color: "#fff",
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#121212",
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
  settingItem: {
    borderBottomColor: "#444",
  },
  label: {
    color: "#ffffff",
  },
  input: {
    borderBottomColor: "#ffffff",
  },
  buttonContainer: {
    backgroundColor: "#121212",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
  settingItem: {
    borderBottomColor: "#e0e0e0",
  },
  label: {
    color: "#000000",
  },
  input: {
    borderBottomColor: "#000000",
  },
  buttonContainer: {
    backgroundColor: "#f5f5f5",
  },
});

export default MatchSettings;
