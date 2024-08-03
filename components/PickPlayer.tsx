import React, { useEffect, useState } from "react";
import { View, StyleSheet, GestureResponderEvent } from "react-native";
import { Button, Dialog, HelperText } from "react-native-paper";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { Dropdown } from "react-native-paper-dropdown";
import { player } from "@/types/player";

// Define validation schema with Yup
const pickPlayerSchema = Yup.object().shape({
  selectedPlayer: Yup.string().required("Player is required"),
});

type items = {
  label: string;
  value: string;
  disabled: boolean;
};

// Define the props for the PopupForm component
interface PopupFormProps {
  visible: boolean;
  team: string;
  playerType: string;
  remainingPlayersId: string[];
  onDismiss: () => void;
  onSubmit: (values: player | undefined) => void;
}

// Define the PopupForm component
const PickPlayer: React.FC<PopupFormProps> = ({
  visible,
  team,
  remainingPlayersId,
  playerType,
  onDismiss,
  onSubmit,
}) => {
  const [items, setItems] = useState<items[]>([]);
  const [players, setPlayers] = useState<player[]>([]);

  useEffect(() => {
    (async () => {
      const teamPlayerMapping = await getItem(
        STORAGE_ITEMS.TEAM_PLAYER_MAPPING
      );

      if (teamPlayerMapping && team) {
        const playerIds = teamPlayerMapping[team];
        let playersFromDb = await getItem(STORAGE_ITEMS.PLAYERS);
        if (playersFromDb) {
          playersFromDb = playersFromDb.filter((p: player) =>
            playerIds.includes(p.id.toString())
          );
          playersFromDb = playersFromDb.filter((p: player) =>
            remainingPlayersId.includes(p.id.toString())
          );
          setPlayers(playersFromDb);
          setItems(
            playersFromDb.map((p: player) => ({
              label: p.name,
              value: p.id,
              disabled: false,
            }))
          );
        }
      }
    })();
  }, [visible]);

  const formik = useFormik({
    initialValues: {
      selectedPlayer: "",
    },
    validationSchema: pickPlayerSchema,
    onSubmit: async (values, { resetForm }) => {
      await handleSubmit();
    },
  });

  const handleSubmit = async () => {
    const result = players.find(
      (player) => player.id === formik.values.selectedPlayer
    );
    onSubmit(result);
    onDismiss();
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Content>
        <View>
          <Dropdown
            label={
              playerType == "Bowler" ? "Select Bowler" : "Select Next Batsman"
            }
            options={items}
            value={formik.values.selectedPlayer}
            onSelect={(value) => {
              formik.setFieldValue("selectedPlayer", value);
            }}
            mode="outlined"
            error={
              !!formik.errors.selectedPlayer && !!formik.touched.selectedPlayer
            }
          />
          <HelperText
            type="error"
            padding="none"
            visible={
              !!formik.errors.selectedPlayer && !!formik.touched.selectedPlayer
            }
          >
            {formik.errors.selectedPlayer}
          </HelperText>
          <Button
            textColor="white"
            buttonColor="#0c66e4"
            mode="contained"
            onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
          >
            {playerType == "Bowler" ? "Select Bowler" : "Select Next Batsman"}
          </Button>
        </View>
      </Dialog.Content>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
  },
  error: {
    color: "red",
  },
});

export default PickPlayer;
