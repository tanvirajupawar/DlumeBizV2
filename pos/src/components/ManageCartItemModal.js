// src/components/ManageCartItemModal.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "./Colors";

/**
 * Full-screen modal matching Zoho's "Manage Cart Item":
 *   dark header: Manage Cart Item (title only)
 *   item row: avatar + name
 *   Quantity: [ - ] [ input ] [ + ]
 *   Price (₹): underline input
 *   Description: underline input
 *   [ Cancel ] [ Apply ]  <- side by side, right below Description
 *
 * Content is capped at MAX_CONTENT_WIDTH and centered horizontally so it
 * doesn't stretch edge-to-edge on wide/tablet screens. The whole screen
 * sits inside a SafeAreaView, and the form body is a ScrollView inside a
 * KeyboardAvoidingView so the Description field (and the buttons right
 * after it) scroll into view above the keyboard instead of being hidden
 * behind it.
 *
 * Props:
 *   visible  — bool
 *   item     — { id, name, qty, price, description? } or null (modal renders nothing if null)
 *   onClose  — called on Cancel / hardware back
 *   onApply  — called with { qty, price, description } (numbers for qty/price) on Apply
 */
const MAX_CONTENT_WIDTH = 720;

export default function ManageCartItemModal({ visible, item, onClose, onApply }) {
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");

useEffect(() => {
  if (!visible || !item) return;

  setQty(String(item.qty ?? 1));
  setPrice(String(item.price ?? 0));
  setDescription(item.description ?? item.note ?? "");
}, [visible, item?.id]);

  if (!item) return null;

  const step = (delta) => {
    setQty((q) => {
      const next = Math.max(0, (parseFloat(q) || 0) + delta);
      // keep it tidy — avoid long float tails like 2.0000000001
      return String(Math.round(next * 100) / 100);
    });
  };

  const handleApply = () => {
    onApply?.({
      qty: parseFloat(qty) || 0,
      price: parseFloat(price) || 0,
      description,
    });
  };

  const initial = item.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      testID="manage-cart-item-modal"
    >
      <SafeAreaView style={styles.safe} testID="manage-cart-safe-area">
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Manage Cart Item
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.itemRow}>
              <View style={styles.centerCol}>
                <View style={styles.itemRowInner}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.bodyWrap}>
              <View style={styles.centerCol}>
                <Text style={styles.label}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => step(-1)}
                    testID="manage-cart-qty-minus"
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>
                 <TextInput
  style={styles.qtyInput}
  value={qty}
  onChangeText={(text) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setQty(cleaned);
  }}
  keyboardType="numeric"
  textAlign="center"
/>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => step(1)}
                    testID="manage-cart-qty-plus"
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { marginTop: SPACING.xl }]}>
                  Price (₹)
                </Text>
              <TextInput
  style={styles.underlineInput}
  value={price}
  onChangeText={(text) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setPrice(cleaned);
  }}
  keyboardType="numeric"
/>

                <Text style={[styles.label, { marginTop: SPACING.xl }]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.underlineInput, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add Description"
                  placeholderTextColor={COLORS.textMuted ?? "#9AA3AF"}
                  multiline
                  testID="manage-cart-description-input"
                />

                <View style={styles.buttonsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelBtn,
                      pressed && styles.cancelBtnPressed,
                    ]}
                    onPress={onClose}
                    testID="manage-cart-cancel"
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.applyBtn,
                      pressed && styles.applyBtnPressed,
                    ]}
                    onPress={handleApply}
                    testID="manage-cart-apply"
                  >
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </Pressable>
                </View>

                {/* breathing room so buttons clear the keyboard when scrolled */}
                <View style={{ height: 40 }} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242E43",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
  },

  scrollContent: {
    flexGrow: 1,
  },

  /* centers content in a max-width column, like the reference screenshot */
  centerCol: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  itemRow: {
    backgroundColor: COLORS.chipBg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  itemRowInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: "#E3E7EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 21,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  itemName: {
    fontSize: 21,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  bodyWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBtn: {
    width: 60,
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.primary,
  },
  qtyInput: {
    flex: 1,
    height: 52,
    marginHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    fontSize: 21,
    color: COLORS.textPrimary,
  },
  underlineInput: {
    fontSize: 21,
    color: COLORS.textPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider ?? "#E2E5EA",
    paddingVertical: SPACING.md,
  },
  descriptionInput: {
    minHeight: 48,
    textAlignVertical: "top",
  },

  buttonsRow: {
    flexDirection: "row",
    marginTop: SPACING.xl,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.md ?? 8,
    borderWidth: 1,
    borderColor: COLORS.divider ?? "#E2E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnPressed: {
    backgroundColor: COLORS.chipBg ?? "#F0F2F5",
  },
  cancelBtnText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  applyBtn: {
    flex: 1,
    height: 52,
    marginLeft: SPACING.md ?? 12,
    borderRadius: RADIUS.md ?? 8,
    backgroundColor: COLORS.primary ?? "#3D6BF0",
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnPressed: {
    opacity: 0.9,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
});