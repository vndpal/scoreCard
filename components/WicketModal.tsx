import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

// Accent used for attribute selection (out type / fielder). Kept distinct from
// the destructive red so tapping a chip never reads as "confirm".
const ACCENT = "#2F6BEA";
const DANGER = "#E23744";

// `icon` names are interim placeholders from the MaterialCommunityIcons set —
// the bundled icon fonts have no cricket-specific glyphs (fallen stumps,
// keeper-behind-stumps, batsman running with bat). Swap to custom image assets
// once provided (see ICON SPEC in the modal docstring / PR notes).
const OUT_TYPES: {
  value: OutType;
  label: string;
  icon: string;
  needsFielder: boolean;
}[] = [
  {
    value: "caught",
    label: "Catch",
    icon: "hand-back-right",
    needsFielder: true,
  },
  { value: "bowled", label: "Bowled", icon: "cricket", needsFielder: false },
  { value: "runout", label: "Run Out", icon: "run-fast", needsFielder: true },
  { value: "stumped", label: "Stumping", icon: "account", needsFielder: true },
];

const fielderActionLabel: Record<OutType, string> = {
  bowled: "",
  caught: "Catch by",
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
  const dark = currentTheme === "dark";
  const themeStyles = dark ? darkStyles : lightStyles;
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

  const needsFielder =
    OUT_TYPES.find((t) => t.value === outType)?.needsFielder ?? false;

  const selectedBatterExists = batter === "striker" ? !!striker : !!nonStriker;

  const confirmDisabled =
    !outType || !selectedBatterExists || (needsFielder && !fielderId);

  const handleConfirm = () => {
    if (confirmDisabled || !outType) return;
    const outBatterId =
      (batter === "striker" ? striker?.id : nonStriker?.id) || "";
    let fielder: { id: string; name: string } | undefined;
    if (needsFielder && fielderId) {
      const f = fielders.find((p) => p.playerId === fielderId);
      if (f) fielder = { id: f.playerId, name: f.name };
    }
    onConfirm({ outType, outBatterId, fielder });
  };

  const renderBatterButton = (
    type: "striker" | "nonStriker",
    p: player | undefined,
  ) => {
    const active = batter === type;
    if (!p) return null;
    return (
      <TouchableOpacity
        key={type}
        style={[styles.segment, active && styles.segmentActive]}
        onPress={() => setBatter(type)}
      >
        <Text
          style={[
            styles.segmentLabel,
            themeStyles.segmentLabel,
            active && styles.activeText,
          ]}
        >
          {type === "striker" ? "STRIKER" : "NON-STRIKER"}
        </Text>
        <Text
          style={[
            styles.segmentName,
            themeStyles.segmentName,
            active && styles.activeText,
          ]}
          numberOfLines={1}
        >
          {p.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFielder = (item: playerStats) => {
    const active = fielderId === item.playerId;
    return (
      <TouchableOpacity
        key={item.playerId}
        style={[
          styles.fielderPill,
          themeStyles.fielderPill,
          active && styles.fielderPillActive,
        ]}
        onPress={() => setFielderId(item.playerId)}
      >
        {active && <Icon name="check" type="feather" size={15} color="#fff" />}
        <Text
          style={[
            styles.fielderName,
            themeStyles.fielderName,
            active && styles.activeText,
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
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
          <View style={[styles.container, themeStyles.container]}>
            {/* Header */}
            <View style={styles.headerWrap}>
              <View style={[styles.handle, themeStyles.handle]} />
              <View style={styles.headerRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>!</Text>
                </View>
                <Text style={[styles.headerText, themeStyles.headerText]}>
                  Wicket!
                </Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onCancel}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name="x"
                    type="feather"
                    size={22}
                    color={dark ? "#64748B" : "#9AA3B2"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable body */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator
            >
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
                        themeStyles.outTypeChip,
                        active && styles.outTypeChipActive,
                      ]}
                      onPress={() => {
                        setOutType(t.value);
                        setFielderId(null);
                      }}
                    >
                      <Icon
                        name={t.icon}
                        type="material-community"
                        size={21}
                        color={active ? "#fff" : dark ? "#cbd5e1" : "#5A6675"}
                      />
                      <Text
                        style={[
                          styles.outTypeText,
                          themeStyles.outTypeText,
                          active && styles.activeText,
                        ]}
                        numberOfLines={1}
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
                  <View style={styles.fielderWrap}>
                    {[...fielders]
                      .sort((a, b) =>
                        a.name.localeCompare(b.name, undefined, {
                          sensitivity: "base",
                        }),
                      )
                      .map(renderFielder)}
                  </View>
                </>
              )}

              {/* Who's out */}
              <Text style={[styles.sectionLabel, themeStyles.sectionLabel]}>
                Who's out?
              </Text>
              <View style={[styles.segmentGroup, themeStyles.segmentGroup]}>
                {renderBatterButton("striker", striker)}
                {renderBatterButton("nonStriker", nonStriker)}
              </View>
            </ScrollView>

            {/* Footer actions */}
            <View
              style={[
                styles.footer,
                themeStyles.footer,
                { paddingBottom: insets.bottom + 16 },
              ]}
            >
              <TouchableOpacity
                style={[styles.cancelButton, themeStyles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, themeStyles.cancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  confirmDisabled && styles.confirmDisabled,
                ]}
                disabled={confirmDisabled}
                onPress={handleConfirm}
              >
                <Text
                  style={[
                    styles.confirmText,
                    confirmDisabled && styles.confirmTextDisabled,
                  ]}
                >
                  Confirm Out
                </Text>
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
    backgroundColor: "rgba(20, 24, 30, 0.52)",
  },
  container: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 12,
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  headerText: {
    fontSize: 21,
    fontWeight: "800",
  },
  closeBtn: {
    marginLeft: "auto",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 18,
  },
  outTypeGrid: {
    flexDirection: "row",
    gap: 7,
  },
  outTypeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  outTypeChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  outTypeText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  fielderWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fielderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  fielderPillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  fielderName: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  segmentGroup: {
    flexDirection: "row",
    borderRadius: 13,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: DANGER,
  },
  segmentLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  segmentName: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  activeText: {
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
  },
  confirmButton: {
    flex: 1.4,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER,
    shadowColor: DANGER,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmDisabled: {
    backgroundColor: "#E7EAF0",
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  confirmTextDisabled: {
    color: "#A7AEBA",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  handle: {
    backgroundColor: "#E5E8EF",
  },
  headerText: {
    color: "#151A21",
  },
  sectionLabel: {
    color: "#9AA3B2",
  },
  outTypeChip: {
    backgroundColor: "#F6F8FB",
    borderColor: "#E7EBF1",
  },
  outTypeText: {
    color: "#33414F",
  },
  fielderPill: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E1E6EE",
  },
  fielderName: {
    color: "#3A4657",
  },
  segmentGroup: {
    backgroundColor: "#EEF1F6",
  },
  segmentLabel: {
    color: "#8A94A6",
  },
  segmentName: {
    color: "#33414F",
  },
  footer: {
    borderTopColor: "#EEF1F6",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E1E5EC",
  },
  cancelText: {
    color: "#4A5666",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
  },
  handle: {
    backgroundColor: "#334155",
  },
  headerText: {
    color: "#F8FAFC",
  },
  sectionLabel: {
    color: "#94A3B8",
  },
  outTypeChip: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  outTypeText: {
    color: "#E2E8F0",
  },
  fielderPill: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  fielderName: {
    color: "#E2E8F0",
  },
  segmentGroup: {
    backgroundColor: "#1E293B",
  },
  segmentLabel: {
    color: "#94A3B8",
  },
  segmentName: {
    color: "#E2E8F0",
  },
  footer: {
    borderTopColor: "#1E293B",
  },
  cancelButton: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  cancelText: {
    color: "#CBD5E1",
  },
});

export default WicketModal;
