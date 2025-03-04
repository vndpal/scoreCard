import { router } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  View,
  StyleSheet,
  GestureResponderEvent,
  Text,
  StyleProp,
  ViewStyle,
  Alert,
} from "react-native";
import { Button, TextInput, HelperText } from "react-native-paper";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTheme } from "@/context/ThemeContext";
import { Tournament } from "@/firebase/models/Tournament";
import { Timestamp } from "@react-native-firebase/firestore";
import { Match } from "@/firebase/models/Match";

const createTournamentSchema = Yup.object().shape({
  name: Yup.string().required("Tournament name is required"),
});

export const CreateTournament = ({
  style,
}: {
  style: StyleProp<ViewStyle>;
}) => {
  const { currentTheme, club, updateCurrentTournament } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleSubmit = async () => {
    const { name } = formik.values;

    const lastMatch = await Match.getLatestMatch(club.id);

    if (lastMatch && lastMatch.status === "live") {
      Alert.alert("Complete the match before creating a new tournament.");
      return;
    }

    const latestTournament = await Tournament.getByStatus(
      "ongoing",
      club?.id ?? ""
    );

    if (latestTournament.length > 0) {
      await Tournament.update(latestTournament[0].id, {
        status: "completed",
      });
    }

    const newTournament = await Tournament.create({
      name,
      date: Timestamp.now(),
      clubId: club?.id ?? "",
      status: "ongoing",
    });

    updateCurrentTournament(newTournament.id);

    Keyboard.dismiss();
    router.replace("/explore");
  };

  const formik = useFormik({
    initialValues: {
      name: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
    },
    validationSchema: createTournamentSchema,
    onSubmit: async (values) => {
      await handleSubmit();
    },
  });

  return (
    <View style={[styles.formContainer, style]}>
      <TextInput
        style={styles.input}
        mode="outlined"
        label="Tournament Name"
        placeholderTextColor={"#aaa"}
        value={formik.values.name}
        onChangeText={formik.handleChange("name")}
        onBlur={formik.handleBlur("name")}
        error={!!formik.errors.name && !!formik.touched.name}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.name && !!formik.touched.name}
      >
        {formik.errors.name}
      </HelperText>

      <Button
        textColor="white"
        buttonColor="#0c66e4"
        mode="contained"
        onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
      >
        Create Tournament
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 10,
    backgroundColor: "transparent",
  },
  input: {
    paddingHorizontal: 8,
    color: "white",
    marginBottom: 8,
  },
});

const lightStyles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: "#333",
  },
});
