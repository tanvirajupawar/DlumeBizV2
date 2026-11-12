
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "./Colors";

export default function UnitPickerModal({
  visible,
  product,
  options = [], // [120, 60, 150]
  onPick,
  onOther,
  onClose,
}) {
  const name = product?.product || product?.name || "Item";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* tap outside to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>

          <View style={styles.chips}>
            {options.map((u) => (
              <Pressable
                key={u}
                onPress={() => onPick(u)}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                testID={`unit-chip-${u}`}
              >
                <Text style={styles.chipMain}>{u}</Text>
                <Text style={styles.chipSub}>per bag</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={onOther}
              style={({ pressed }) => [
                styles.chip,
                styles.chipOther,
                pressed && styles.pressed,
              ]}
              testID="unit-chip-other"
            >
              <Text style={styles.chipMain}>Other</Text>
              <Text style={styles.chipSub}>type units</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,16,34,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxWidth: 560,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  chip: {
    minWidth: 104,
    height: 76,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOther: { borderColor: COLORS.divider },
  pressed: { opacity: 0.6 },
  chipMain: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary },
  chipSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
});