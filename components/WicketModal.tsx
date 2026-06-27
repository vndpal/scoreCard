import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { Icon } from "react-native-elements";
import { player } from "@/types/player";
import { playerStats } from "@/types/playerStats";
import { useAppContext } from "@/context/AppContext";

export type OutType = "bowled" | "caught" | "stumped" | "runout";

export interface WicketResult {
  outType: OutType;
  outBatterId: string;
  fielder?: { id: string; name: string };
}

interface WicketModalProps {
  visible: boolean;
  striker?: player;
  nonStriker?: player;
  fielders: playerStats[];
  onConfirm: (result: WicketResult) => void;
  onCancel: () => void;
}

// `icon` names are interim placeholders from the MaterialCommunityIcons set —
// the bundled icon fonts have no cricket-specific glyphs (fallen stumps,
// keeper-behind-stumps, batsman running with bat). Swap to custom image assets
// once provided (see ICON SPEC in the modal docstring / PR notes).
const OUT_TYPES: { value: OutType; label: string; icon: string; needsFielder: boolean }[] =
  [
    { value: "bowled", label: "Bowled", icon: "cricket", needsFielder: false },
    { value: "caught", label: "Caught", icon: "hand-back-right", needsFielder: true },
    { value: "stumped", label: "Stumping", icon: "account", needsFielder: true },
    { value: "runout", label: "Run Out", icon: "run-fast", needsFielder: true },
  ];

const fielderActionLabel: Record<OutType, string> = {
  bowled: "",
  caught: "Caught by",
  stumped: "Stumped by",
  runout: "Run out by",
};

const WicketModal: React.FC<WicketModalProps> = ({
  visible,
  striker,
  nonStriker,
  fielders,
  onConfirm,
  onCancel,
}) => {
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const insets = useSafeAreaInsets();

  const [outType, setOutType] = useState<OutType | null>(null);
  const [batter, setBatter] = useState<"striker" | "nonStriker">("striker");
  const [fielderId, setFielderId] = useState<string | null>(null);

  // Reset every time the sheet opens so a previous selection never leaks in.
  useEffect(() => {
    if (visible) {
      setOutType(null);
      setBatter("striker");
      setFielderId(null);
    }
  }, [visible]);

  const needsFielder = OUT_TYPES.find((t) => t.value === outType)?.needsFielder ?? false;

  const selectedBatterExists = batter === "striker" ? !!striker : !!nonStriker;

  const confirmDisabled =
    !outType || !selectedBatterExists || (needsFielder && !fielderId);

  const handleConfirm = () => {
    if (confirmDisabled || !outType) return;
    const outBatterId = (batter === "striker" ? striker?.id : nonStriker?.id) || "";
    let fielder: { id: string; name: string } | undefined;
    if (needsFielder && fielderId) {
      const f = fielders.find((p) => p.playerId === fielderId);
      if (f) fielder = { id: f.playerId, name: f.name };
    }
    onConfirm({ outType, outBatterId, fielder });
  };

  const renderBatterButton = (
    type: "striker" | "nonStriker",
    p: player | undefined
  ) => {
    const active = batter === type;
    if (!p) return null;
    return (
      <TouchableOpacity
        key={type}
        style={[
          styles.batterButton,
          themeStyles.choiceButton,
          active && themeStyles.choiceButtonActive,
        ]}
        onPress={() => setBatter(type)}
      >
        <Text
          style={[
            styles.batterLabel,
            themeStyles.choiceLabel,
            active && styles.activeText,
          ]}
        >
          {type === "striker" ? "Striker" : "Non-striker"}
        </Text>
        <Text
          style={[
            styles.batterName,
            themeStyles.choiceName,
            active && styles.activeText,
          ]}
          numberOfLines={1}
        >
          {p.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFielder = ({ item }: { item: playerStats }) => {
    const active = fielderId === item.playerId;
    return (
      <TouchableOpacity
        style={[
          styles.fielderItem,
          themeStyles.choiceButton,
          active && themeStyles.choiceButtonActive,
        ]}
        onPress={() => setFielderId(item.playerId)}
      >
        <Text
          style={[
            styles.fielderName,
            themeStyles.choiceName,
            active && styles.activeText,
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {active && <Icon name="check" type="feather" size={16} color="#fff" />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onCancel}
      transparent
      animationType="slide"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.container,
              themeStyles.container,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={styles.headerRow}>
              <Icon name="alert-octagon" type="feather" size={20} color="#ef4444" />
              <Text style={[styles.headerText, themeStyles.headerText]}>
                Wicket!
              </Text>
            </View>

            {/* How out */}
            <Text style={[styles.sectionLabel, themeStyles.sectionLabel]}>
              How out?
            </Text>
            <View style={styles.outTypeGrid}>
              {OUT_TYPES.map((t) => {
                const active = outType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.outTypeChip,
                      themeStyles.choiceButton,
                      active && themeStyles.choiceButtonActive,
                    ]}
                    onPress={() => {
                      setOutType(t.value);
                      setFielderId(null);
                    }}
                  >
                    <Icon
                      name={t.icon}
                      type="material-community"
                      size={18}
                      color={active ? "#fff" : currentTheme === "dark" ? "#cbd5e1" : "#475569"}
                    />
                    <Text
                      style={[
                        styles.outTypeText,
                        themeStyles.choiceLabel,
                        active && styles.activeText,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Fielder (shown right after the out type, before the batsman) */}
            {needsFielder && (
              <>
                <Text style={[styles.sectionLabel, themeStyles.sectionLabel]}>
                  {outType ? fielderActionLabel[outType] : ""}
                </Text>
                <FlatList
                  data={fielders}
                  renderItem={renderFielder}
                  keyExtractor={(item) => item.playerId}
                  style={styles.fielderList}
                  showsVerticalScrollIndicator
                  persistentScrollbar
                />
              </>
            )}

            {/* Who's out */}
            <Text style={[styles.sectionLabel, themeStyles.sectionLabel]}>
              Who's out?
            </Text>
            <View style={styles.batterRow}>
              {renderBatterButton("striker", striker)}
              {renderBatterButton("nonStriker", nonStriker)}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.confirmButton,
                  confirmDisabled && styles.confirmDisabled,
                ]}
                disabled={confirmDisabled}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>Confirm Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  outTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  outTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    width: "47.5%",
  },
  outTypeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  batterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  batterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  batterLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  batterName: {
    fontSize: 18,
    fontWeight: "800",
  },
  fielderList: {
    maxHeight: 200,
    marginBottom: 6,
  },
  fielderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  fielderName: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  activeText: {
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#64748B",
  },
  cancelText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmButton: {
    backgroundColor: "#ef4444",
  },
  confirmDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.7,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    color: "#0F172A",
  },
  sectionLabel: {
    color: "#64748B",
  },
  choiceButton: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  choiceButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#dc2626",
  },
  choiceLabel: {
    color: "#475569",
  },
  choiceName: {
    color: "#0F172A",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
  },
  headerText: {
    color: "#F8FAFC",
  },
  sectionLabel: {
    color: "#94A3B8",
  },
  choiceButton: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  choiceButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#f87171",
  },
  choiceLabel: {
    color: "#94A3B8",
  },
  choiceName: {
    color: "#F1F5F9",
  },
});

export default WicketModal;
