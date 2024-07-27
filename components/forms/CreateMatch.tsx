import { getItem, setItem } from "@/utils/asyncStorage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  View,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
} from "react-native";
import { Button, TextInput, HelperText } from "react-native-paper";
import { Formik, useFormik } from "formik";
import * as Yup from "yup";
import { match } from "@/types/match";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { team } from "@/types/team";
import Dropdown from "../dropdown/dropdown";

const createMatchSchema = Yup.object().shape({
  team1: Yup.string().required("Batting team is required"),
  team2: Yup.string().required("Fielding team is required"),
  overs: Yup.number().required("Overs are required"),
  wickets: Yup.number(),
});

type items = {
  label: string;
  value: string;
};

export const CreateMatch = () => {
  const [teams, setTeams] = useState<items[]>([]);

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
          });
        }
      }

      const teams = await getItem(STORAGE_ITEMS.TEAMS);
      if (teams) {
        setTeams(
          teams.map((team: team) => ({
            label: team.teamName,
            value: team.teamName,
          }))
        );
      }
    })();
  }, []);

  const handleSubmit = async () => {
    console.log(
      `Creating a match with ${formik.values.overs} overs and ${formik.values.wickets} wickets.`
    );

    if (formik.values.team1 === formik.values.team2) {
      alert("Batting and fielding team should be different.");
      return;
    }

    const matches = await getItem(STORAGE_ITEMS.MATCHES);
    const { overs, wickets, team1, team2 } = formik.values;
    if (matches) {
      if (matches[0].status == "live") {
        alert(
          "There is already a live match. Please complete it before starting a new match."
        );
        return;
      }
      await setItem(STORAGE_ITEMS.MATCHES, [
        {
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
          date: new Date().toString(),
        },
        ...matches,
      ]);
    } else {
      await setItem(STORAGE_ITEMS.MATCHES, [
        {
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
          date: new Date().toString(),
        },
      ]);
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
    },
    validationSchema: createMatchSchema,
    onSubmit: async (values) => {
      await handleSubmit();
    },
  });

  return (
    <View style={styles.formContainer}>
      <Dropdown
        label="Battting team"
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
        placeholderTextColor={"white"}
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
        placeholderTextColor={"white"}
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
  },
});
