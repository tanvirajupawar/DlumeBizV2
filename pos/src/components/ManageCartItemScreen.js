// screens/ManageCartItemScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../components/Colors";
import Header from "../components/Header";

export default function ManageCartItemScreen({ navigation, route }) {
  const { item, onApply, onRemove } = route.params;

  const [qty, setQty] = useState(String(item.qty ?? 1));
  const [price, setPrice] = useState(Number(item.price ?? 0).toFixed(2));
  const [note, setNote] = useState(item.note ?? "");

  const numericQty = Number(qty) || 0;
  const numericPrice = Number(price) || 0;
  const total = numericQty * numericPrice;

  const decrement = () => setQty(String(Math.max(0, numericQty - 1)));
  const increment = () => setQty(String(numericQty + 1));

  const handleClose = () => navigation.goBack();

  const handleApply = () => {
    const updated = { ...item, qty: Math.max(0, numericQty), price: numericPrice, note };
    if (updated.qty <= 0) onRemove(updated);
    else onApply(updated);
    navigation.goBack();
  };

  const handleRemove = () => {
    onRemove(item);
    navigation.goBack();
  };

  return (
    // edges={["top","bottom"]} so SafeAreaView handles notch + home-bar insets.
    // "bottom" keeps the footer above the home indicator on iPhone.
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>

      {/* Shared Header — productForm variant gives us back-arrow + title */}
      <Header
        screenName="productForm"
        isEditingProduct={false}
        editingProductName={item.name}
        onBack={handleClose}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
        >
          {/* Item name pill */}
          <View style={styles.itemNameWrap}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={15}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>

            {/* Quantity */}
            <View style={styles.row}>
              <Text style={styles.label}>Quantity</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={decrement}>
                  <MaterialCommunityIcons name="minus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <TouchableOpacity style={styles.qtyBtn} onPress={increment}>
                  <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Price */}
            <View style={styles.row}>
              <Text style={styles.label}>Price (₹)</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>

            <View style={styles.divider} />

            {/* Note */}
            <View style={styles.noteRow}>
              <Text style={styles.label}>Note</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add note"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>

          </View>

          {/* Footer inside scroll so keyboard pushes it up */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // ── Content ─────────────────────────────────────────────
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: 10,
  },

  // Item name badge under the header
  itemNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    flexShrink: 1,
  },

  // ── Form card ───────────────────────────────────────────
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  noteRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  // Qty stepper
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    minWidth: 40,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  // Price
  priceInput: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    minWidth: 90,
  },

  // Note
  noteInput: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 4,
    minHeight: 36,
  },

  // Total
  totalLabel: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  totalValue: { fontSize: 16, fontWeight: "800", color: colors.primary },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  removeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  removeBtnText: { fontSize: 14, fontWeight: "700", color: colors.danger },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  applyBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
});