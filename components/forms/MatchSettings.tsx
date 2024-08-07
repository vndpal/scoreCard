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
  TextInput,
  ScrollView,
  Keyboard,
} from "react-native";
import { Switch, Button } from "react-native-paper";
import { Dropdown } from "react-native-paper-dropdown";

type items = {
  label: string;
  value: string;
};

const MatchSettings = () => {
  const [overs, setOvers] = useState<string>("");
  const [declareInnings, setDeclareInnings] = useState<boolean>(false);
  const [currentMatch, setCurrentMatch] = useState<match>();
  const [items, setItems] = useState<items[]>([]);
  const [winner, setWinner] = useState<string>("");

  useEffect(() => {
    fetchMatch();
  }, []);

  const fetchMatch = async () => {
    console.log("Fetching match settings...");
    const matches = await getItem(STORAGE_ITEMS.MATCHES);
    if (!matches) {
      return;
    }
    if (matches.length === 0) {
      return;
    }
    setCurrentMatch(matches[0]);
    setOvers(matches[0].overs);
    const items: items[] = [
      { label: matches[0].team1, value: matches[0].team1 },
      { label: matches[0].team2, value: matches[0].team2 },
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
      const matches = await getItem(STORAGE_ITEMS.MATCHES);
      if (matches) {
        const latestMatch: match = matches[0];

        if (declareInnings) {
          // declare innings handling
          if (latestMatch) {
            if (latestMatch.isFirstInning) {
              const updatedMatch: match = {
                ...latestMatch,
                isFirstInning: !latestMatch.isFirstInning,
              };

              matches[0] = updatedMatch;
              await setItem(STORAGE_ITEMS.MATCHES, matches);
              Keyboard.dismiss();
              router.push("/");
            } else {
              if (winner === "") {
                alert("Winner cannot be empty");
                return;
              }

              const updatedMatch: match = {
                ...latestMatch,
                status: "completed",
                winner: winner === latestMatch.team1 ? "team1" : "team2",
              };

              matches[0] = updatedMatch;
              await setItem(STORAGE_ITEMS.MATCHES, matches);

              const playerMatchStats = await getItem(
                STORAGE_ITEMS.PLAYER_MATCH_STATS
              );
              await updatePlayerCareerStats(playerMatchStats);

              Keyboard.dismiss();
              router.push("/");
            }
          }
        } else {
          // overs change handling
          if (overs === "" || parseInt(overs) != currentMatch.overs) {
            if (overs === "") {
              alert("Overs cannot be empty");
              return;
            } else if (!latestMatch.isFirstInning) {
              alert("Overs can only be changed during first innings only");
              return;
            } else if (parseInt(overs) < currentMatch.team1score.length) {
              alert(
                `${currentMatch.team1score.length} overs have already been bowled. Overs cannot be less than that`
              );
              return;
            }
          }

          if (latestMatch) {
            const updatedMatch: match = {
              ...latestMatch,
              overs: parseInt(overs),
            };

            matches[0] = updatedMatch;
            await setItem(STORAGE_ITEMS.MATCHES, matches);
            Keyboard.dismiss();
            router.push("/");
          }
        }
      }
    }
  };

  const handleDdlChange = (value: string) => {
    setWinner(value);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Change overs</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            onChangeText={handleOversChange}
            value={overs.toString()}
            placeholder="Enter overs"
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Declare innings</Text>
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
          <View style={styles.settingItem}>
            <Text style={styles.label}>Winner</Text>
            <Dropdown
              label="Winner"
              options={items}
              value={winner}
              onSelect={handleDdlChange}
              mode="outlined"
            />
          </View>
        )}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button
          textColor="white"
          buttonColor="#0c66e4"
          mode="contained"
          onPress={handleSaveSettings}
        >
          Save settings
        </Button>
      </View>
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
    padding: 4,
    minWidth: 50,
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
});

export default MatchSettings;
