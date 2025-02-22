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

const createTournamentSchema = Yup.object().shape({
  name: Yup.string().required("Tournament name is required"),
});

export const CreateTournament = ({
  style,
}: {
  style: StyleProp<ViewStyle>;
}) => {
  const { currentTheme, club } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleSubmit = async () => {
    const { name } = formik.values;

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

    Keyboard.dismiss();
    router.replace("/explore");
  };

  const formik = useFormik({
    initialValues: {
      name: "",
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
