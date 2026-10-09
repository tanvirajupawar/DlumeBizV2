// src/components/CartFooter.js
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOW } from "./Colors";

const formatPrice = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Bottom cart footer:
 *   Row 1: item count / qty  +  chevron (tap to expand/collapse summary)
 *   Row 2 (only when expanded): Sub Total, Round Off
 *   Row 3: red "hold cart" square button  +  wide blue Checkout / Save Order
 *          button showing the total.
 *
 * Props:
 *   itemCount, totalQty, total  — numbers
 *   subtotal, roundOff          — numbers, shown only when expanded (default 0)
 *   isEmpty                     — bool, drives disabled state + label
 *   onHold, onCheckout          — handlers (wire to existing hold + checkout)
 *   onToggleSummary             — optional extra callback fired alongside the
 *                                  internal expand/collapse toggle
 */
export default function CartFooter({
  itemCount = 0,
  totalQty = 0,
  subtotal = 0,
  total = 0,
  isEmpty = true,
  onClear,
  onHold,
  onCheckout,
  checkoutLabel = "Checkout",
   isReturnMode = false,  
  onToggleSummary,
}) {
const [expanded, setExpanded] = useState(false);
  const handleToggleSummary = () => {
    setExpanded((e) => !e);
    onToggleSummary?.();
  };

  const handleHold = () => {
    Alert.alert(
      "Clear cart?",
      "This will remove all items from the cart. This action can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => onHold?.() },
      ]
    );
  };

  const handleClear = () => {
  Alert.alert(
    "Clear cart?",
    "This will remove all items from the cart. This action can't be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => onClear?.() },
    ]
  );
};

  return (
    <View style={styles.wrap} testID="cart-footer">
      <Pressable
        onPress={handleToggleSummary}
        style={styles.top}
        testID="cart-footer-summary-toggle"
      >
        <Text style={styles.count}>
          {itemCount} Items, {totalQty} Qty
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.textSecondary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sub Total</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
      
        </View>
      )}

      <View style={styles.actions}>
      <Pressable
  onPress={handleClear}
  style={styles.holdBtn}
  testID="cart-hold-button"
>
  <Feather name="shopping-cart" size={22} color={COLORS.danger} />
</Pressable>

            <Pressable
          onPress={onCheckout}
          disabled={isEmpty}
          style={[
            styles.checkoutBtn,
            isReturnMode && styles.checkoutBtnReturn,
            isEmpty &&
              (isReturnMode
                ? styles.checkoutBtnReturnDisabled
                : styles.checkoutBtnDisabled),
          ]}
          testID="cart-checkout-button"
        >
          <Text style={styles.checkoutText}>
            {isReturnMode ? checkoutLabel : isEmpty ? "Save Order" : checkoutLabel}
          </Text>
          <Text style={styles.checkoutAmount}>{formatPrice(total)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  count: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  summary: {
    paddingHorizontal: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 17,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.md,
  },
  holdBtn: {
    width: 56,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    ...SHADOW.soft,
  },
  checkoutBtnDisabled: {
    backgroundColor: COLORS.blueDisabled,
  },
    checkoutBtnReturn: {
    backgroundColor: "#DC2626",
  },
  checkoutBtnReturnDisabled: {
    backgroundColor: "#FCA5A5",
  },
  checkoutText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
  },
  checkoutAmount: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },
});