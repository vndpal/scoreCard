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
import {
  Button,
  TextInput,
  HelperText,
  Switch,
  Card,
} from "react-native-paper";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppContext } from "@/context/AppContext";
import { Tournament } from "@/firebase/models/Tournament";
import { Timestamp } from "@react-native-firebase/firestore";
import { Match } from "@/firebase/models/Match";

const createTournamentSchema = Yup.object().shape({
  name: Yup.string().required("Tournament name is required"),
  isBoxCricket: Yup.boolean().required("Box Cricket is required"),
});

export const CreateTournament = ({
  style,
}: {
  style: StyleProp<ViewStyle>;
}) => {
  const { currentTheme, club, updateCurrentTournament } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleSubmit = async () => {
    const { name, isBoxCricket } = formik.values;

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
      isBoxCricket,
    });

    updateCurrentTournament(newTournament.id);

    Keyboard.dismiss();
    router.replace("/teamLineup");
  };

  const formik = useFormik({
    initialValues: {
      name: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      isBoxCricket: false,
    },
    validationSchema: createTournamentSchema,
    onSubmit: async (values) => {
      await handleSubmit();
    },
  });

  return (
    <Card style={[styles.card, themeStyles.card, style]}>
      <Card.Content>
        <TextInput
          style={[styles.input, themeStyles.input]}
          mode="outlined"
          label="Tournament Name"
          placeholderTextColor={"#aaa"}
          value={formik.values.name}
          onChangeText={formik.handleChange("name")}
          onBlur={formik.handleBlur("name")}
          error={!!formik.errors.name && !!formik.touched.name}
        />

        <View style={[styles.switchContainer, themeStyles.switchContainer]}>
          <Text style={[styles.label, themeStyles.label]}>
            Box Cricket Rules
          </Text>
          <Switch
            value={formik.values.isBoxCricket}
            style={[styles.switch]}
            onValueChange={(value) =>
              void formik.setFieldValue("isBoxCricket", value)
            }
          />
        </View>

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
          Create New Tournament
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
    borderRadius: 8,
  },
  formContainer: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 10,
    backgroundColor: "transparent",
  },
  input: {},
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginHorizontal: 8,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginVertical: 16,
    paddingHorizontal: 4,
    height: 48,
  },
  switch: {
    minWidth: 60,
    minHeight: 30,
    transform: [{ scaleX: 1.4 }, { scaleY: 1.1 }],
  },
});

const lightStyles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
  },
  label: {
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
  },
  switchContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: "#1e1e1e",
  },
  label: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#2d2d2d",
  },
  switchContainer: {
    backgroundColor: "#1e1e1e",
    borderRadius: 4,
  },
});
