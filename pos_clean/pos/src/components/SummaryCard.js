// components/SummaryCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../components/Colors";

/**
 * SummaryCard
 * Checkout button only. Summary rows (subtotal/discount/tax/total) have been
 * moved into CartPanel so the cart box can stay taller.
 *
 * Props:
 * - grandTotal: number
 * - onCheckout: () => void
 * - checkoutDisabled: boolean
 */
export default function SummaryCard({
  grandTotal = 0,
  onCheckout = () => {},
  checkoutDisabled = true,
}) {
  const formatCurrency = (n) => `\u20B9${Number(n).toFixed(2)}`;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={[styles.checkoutBtn, checkoutDisabled && styles.checkoutBtnDisabled]}
        activeOpacity={0.85}
        onPress={onCheckout}
        disabled={checkoutDisabled}
      >
        <MaterialCommunityIcons name="cart-check" size={20} color={colors.white} />
        <Text style={styles.checkoutText}>Checkout</Text>
        <Text style={styles.checkoutAmount}>{formatCurrency(grandTotal)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 16,
    ...shadow.floating,
  },
  checkoutBtnDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.5,
  },
  checkoutText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  checkoutAmount: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.35)',
  },
});