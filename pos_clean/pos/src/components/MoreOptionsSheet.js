// src/components/MoreOptionsSheet.js

import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "./Colors";

export default function MoreOptionsSheet({
  visible,
  onClose,
  onHoldCart,
}) {
  const handleHoldCart = () => {
    onHoldCart?.();
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      testID="more-options-sheet"
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          testID="more-options-backdrop"
        />

        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>More Options</Text>

          <Pressable
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}
            onPress={handleHoldCart}
            testID="more-options-hold-cart"
          >
            <Ionicons
              name="hand-left-outline"
              size={22}
              color={COLORS.textPrimary}
              style={styles.rowIcon}
            />

            <Text style={styles.rowText}>Hold Cart</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,

    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,

    // Increase this if it's still behind the POS navigation bar
    paddingBottom: 44,

    // Push sheet above Android navigation bar
    marginBottom: 16,
  },

  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.md,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },

  rowPressed: {
    backgroundColor: COLORS.chipBg,
  },

  rowIcon: {
    marginRight: SPACING.md,
  },

  rowText: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
});