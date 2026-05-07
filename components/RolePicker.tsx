import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { PlayerRole } from "@/types/player";
import { ROLE_META } from "@/constants/playerRoles";

interface RolePickerProps {
  value: PlayerRole;
  onChange: (next: PlayerRole) => void;
  style?: ViewStyle;
}

const ROLES: PlayerRole[] = ["BAT", "BOWL"];

const RolePicker: React.FC<RolePickerProps> = ({ value, onChange, style }) => {
  return (
    <View style={[styles.row, style]}>
      {ROLES.map((r) => {
        const meta = ROLE_META[r];
        const active = value === r;
        return (
          <TouchableOpacity
            key={r}
            onPress={() => onChange(r)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? `${meta.color}1A` : "#fff",
                borderColor: active ? meta.color : "#EAEFED",
              },
            ]}
          >
            <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

export default RolePicker;
