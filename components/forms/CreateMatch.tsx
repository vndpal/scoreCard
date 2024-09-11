import { getItem, setItem } from "@/utils/asyncStorage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  View,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
  Alert,
  Text,
} from "react-native";
import { Button, TextInput, HelperText, Switch } from "react-native-paper";
import { Formik, useFormik } from "formik";
import * as Yup from "yup";
import { match } from "@/types/match";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { team } from "@/types/team";
import { Dropdown } from "react-native-paper-dropdown";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { useTheme } from "@/context/ThemeContext";

const createMatchSchema = Yup.object().shape({
  team1: Yup.string().required("Batting team is required"),
  team2: Yup.string().required("Fielding team is required"),
  overs: Yup.number().required("Overs are required"),
  wickets: Yup.number(),
  quickMatch: Yup.boolean(),
});

type items = {
  label: string;
  value: string;
};

export const CreateMatch = () => {
  const [teams, setTeams] = useState<items[]>([]);
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    (async () => {
      const matches: match[] = await getItem(STORAGE_ITEMS.MATCHES);
      if (matches && matches.length > 0) {
        const lastMatch: match = matches[0];
        if (lastMatch && lastMatch.status == "completed") {
          const winner =
            lastMatch.winner == "team1" ? lastMatch.team1 : lastMatch.team2;
          const looser =
            lastMatch.winner == "team1" ? lastMatch.team2 : lastMatch.team1;
          formik.setValues({
            team1: winner,
            team2: looser,
            overs: lastMatch.overs.toString(),
            wickets: lastMatch.wickets?.toString() ?? "",
            quickMatch: false,
          });
        }
      }

      const teams = await getItem(STORAGE_ITEMS.TEAMS);
      if (teams) {
        setTeams(
          teams.map((team: team) => ({
            label: team.teamName,
            value: team.teamInitials,
          }))
        );
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (formik.values.team1 === formik.values.team2) {
      alert("Batting and fielding team should be different.");
      return;
    }

    const matches = await getItem(STORAGE_ITEMS.MATCHES);
    const teamPlayerMapping = await getItem(STORAGE_ITEMS.TEAM_PLAYER_MAPPING);
    const { overs, wickets, team1, team2, quickMatch } = formik.values;

    let matchId = "1";
    if (matches) {
      if (matches[0].status == "live") {
        alert(
          "There is already a live match. Please complete it before starting a new match."
        );
        return;
      }

      if (!quickMatch) {
        const team1PlayerCount =
          teamPlayerMapping && teamPlayerMapping.hasOwnProperty(team1)
            ? teamPlayerMapping[team1]?.length
            : 0;
        const team2PlayerCount =
          teamPlayerMapping && teamPlayerMapping.hasOwnProperty(team2)
            ? teamPlayerMapping[team2]?.length
            : 0;
        if (
          team1PlayerCount == 0 ||
          team2PlayerCount == 0 ||
          Math.abs(team1PlayerCount - team2PlayerCount) > 1
        ) {
          Alert.alert(
            "Team is not created properly",
            `Teams must have equal players or differ by at most 1 player!\n\n${team1}: ${team1PlayerCount}\n${team2}: ${team2PlayerCount}`
          );
          return;
        }
      }

      matchId = Number.isNaN(matches[0].matchId)
        ? "1"
        : (parseInt(matches[0].matchId) + 1).toString();

      await setItem(STORAGE_ITEMS.MATCHES, [
        {
          matchId,
          overs,
          wickets,
          team1,
          team2,
          tossWin: "team1",
          choose: "batting",
          team1score: [],
          team2score: [],
          status: "live",
          isFirstInning: true,
          startDateTime: new Date().toString(),
          quickMatch: quickMatch,
        },
        ...matches,
      ]);
    } else {
      await setItem(STORAGE_ITEMS.MATCHES, [
        {
          matchId,
          overs,
          wickets,
          team1,
          team2,
          tossWin: "team1",
          choose: "batting",
          team1score: [],
          team2score: [],
          status: "live",
          isFirstInning: true,
          startDateTime: new Date().toString(),
          quickMatch: quickMatch,
        },
      ]);
    }

    if (!quickMatch) {
      const playerStats: playerStats[] = [];
      const playerIds: { playerId: string; team: string }[] = [];
      teamPlayerMapping[team1].forEach((player: string) => {
        playerIds.push({ playerId: player, team: team1 });
      });
      teamPlayerMapping[team2].forEach((player: string) => {
        playerIds.push({ playerId: player, team: team2 });
      });
      playerIds.forEach((player: { playerId: string; team: string }) => {
        playerStats.push({
          playerId: player.playerId,
          team: player.team,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          average: 0,
          isOut: false,
          strikeRate: 0,
          wickets: 0,
          ballsBowled: 0,
          overs: 0,
          runsConceded: 0,
          maidens: 0,
          bowlingEconomy: 0,
          extras: 0,
          foursConceded: 0,
          sixesConceded: 0,
          dotBalls: 0,
        });
      });

      const playerStatsInMatch: playerMatchStats = {
        matchId,
        playerMatchStats: playerStats,
      };

      const playerMatchStatsList = await getItem(
        STORAGE_ITEMS.PLAYER_MATCH_STATS
      );
      if (playerMatchStatsList && playerMatchStatsList.length > 0) {
        await setItem(STORAGE_ITEMS.PLAYER_MATCH_STATS, [
          playerStatsInMatch,
          ...playerMatchStatsList,
        ]);
      } else {
        await setItem(STORAGE_ITEMS.PLAYER_MATCH_STATS, [playerStatsInMatch]);
      }
    }

    await setItem(STORAGE_ITEMS.IS_NEW_MATCH, true);
    Keyboard.dismiss();
    router.push("/");
  };

  const formik = useFormik({
    initialValues: {
      team1: "",
      team2: "",
      overs: "",
      wickets: "",
      quickMatch: false,
    },
    validationSchema: createMatchSchema,
    onSubmit: async (values) => {
      await handleSubmit();
    },
  });

  return (
    <View style={styles.formContainer}>
      <Dropdown
        label="Batting team"
        options={teams}
        value={formik.values.team1}
        onSelect={formik.handleChange("team1")}
        mode="outlined"
        error={!!formik.errors.team1 && !!formik.touched.team1}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.team1 && !!formik.touched.team1}
      >
        {formik.errors.team1}
      </HelperText>
      <Dropdown
        label="Fielding team"
        options={teams}
        value={formik.values.team2}
        onSelect={formik.handleChange("team2")}
        mode="outlined"
        error={!!formik.errors.team2 && !!formik.touched.team2}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.team2 && !!formik.touched.team2}
      >
        {formik.errors.team2}
      </HelperText>
      <TextInput
        style={styles.input}
        mode="outlined"
        label={"Overs"}
        placeholderTextColor={"#aaa"}
        keyboardType="numeric"
        value={formik.values.overs}
        onChangeText={formik.handleChange("overs")}
        onBlur={formik.handleBlur("overs")}
        error={!!formik.errors.overs && !!formik.touched.overs}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.overs && !!formik.touched.overs}
      >
        {formik.errors.overs}
      </HelperText>
      <TextInput
        style={styles.input}
        mode="outlined"
        label={"Wickets"}
        placeholderTextColor={"#aaa"}
        keyboardType="numeric"
        value={formik.values.wickets}
        onChangeText={formik.handleChange("wickets")}
        onBlur={formik.handleBlur("wickets")}
        error={!!formik.errors.wickets && !!formik.touched.wickets}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.wickets && !!formik.touched.wickets}
      >
        {formik.errors.wickets}
      </HelperText>
      <View style={styles.settingItem}>
        <View style={styles.quickMatchContainer}>
          <Text style={[styles.label, themeStyles.label]}>Quick match</Text>
          <HelperText
            type="info"
            visible={true}
            style={[styles.quickMatch, themeStyles.quickMatch]}
          >
            If you turn this on, player details will be skipped and only the
            match score will be tracked.
          </HelperText>
        </View>
        <Switch
          value={formik.values.quickMatch}
          onValueChange={(value) => {
            formik.setFieldValue("quickMatch", value);
          }}
          trackColor={{ false: "#767577", true: "#4CAF50" }}
          thumbColor={formik.values.quickMatch ? "#81C784" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          style={styles.switch}
        />
      </View>
      <View style={{ flex: 1 }} />
      <Button
        textColor="white"
        buttonColor="#0c66e4"
        mode="contained"
        onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
      >
        Start new match
      </Button>
    </View>
  );
};

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 10,
    backgroundColor: "transparent",
  },
  input: {
    paddingHorizontal: 8,
    color: "white",
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  quickMatchContainer: {
    flex: 1,
    flexDirection: "column",
  },
  label: {
    fontSize: 16,
    color: "#fff",
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  quickMatch: {
    fontSize: 10,
    color: "#B3E5FC",
    paddingLeft: 0,
  },
});

const lightStyles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
  },
  quickMatch: {
    fontWeight: "bold",
    color: "black",
  },
  label: {
    color: "black",
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: "#333",
  },
  quickMatch: {
    color: "#B3E5FC",
  },
  label: {
    color: "#fff",
  },
});
