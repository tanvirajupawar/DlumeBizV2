// src/components/CustomerPaymentModal.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "./Colors";

const MAX_CONTENT_WIDTH = 720;

const METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "UPI", label: "UPI" },
  { key: "OTHER", label: "Other" },
];

const money = (v) =>
  "\u20B9" +
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Receive-payment screen for a customer.
 *
 * Props:
 *  - visible   : boolean
 *  - customer  : customer object (uses customer.outstanding)
 *  - fetching  : boolean  still loading invoice data
 *  - loading   : boolean  submitting the payment
 *  - onClose   () => void
 *  - onSubmit  ({ amount, method }) => void
 *  (an `invoices` prop may still be passed; it is no longer used)
 */
export default function CustomerPaymentModal({
  visible,
  customer,
  fetching = false,
  loading = false,
  onClose,
  onSubmit,
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setMethod("CASH");
    }
  }, [visible, customer?._id, customer?.id]);

  const name =
    customer?.customer_name ||
    `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
    "Customer";

  const outstanding = Number(customer?.outstanding || 0);
  const entered = Number(amount);
  const validEntered = Number.isFinite(entered) && entered > 0 ? entered : 0;
  const balanceAfter = Math.max(0, outstanding - validEntered);
  const overLimit = validEntered > outstanding;
  const canSubmit = !loading && !fetching && validEntered > 0 && !overLimit;

  const handleClose = () => {
    if (!loading) onClose?.();
  };

  const handleSubmit = () => {
    if (!validEntered) {
      Alert.alert("Invalid Amount", "Enter a valid payment amount.");
      return;
    }
    if (overLimit) {
      Alert.alert(
        "Invalid Amount",
        `Maximum payable amount is ${money(outstanding)}.`
      );
      return;
    }
    onSubmit?.({ amount: validEntered, method });
  };

  const underline = overLimit
    ? COLORS.danger
    : focused
    ? COLORS.blue
    : COLORS.divider;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={styles.headerIconBtn}
          >
            <Ionicons name="close" size={26} color={COLORS.textOnDark} />
          </Pressable>
          <Text style={styles.headerTitle}>Receive Payment</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            hitSlop={8}
            style={styles.saveBtn}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.textOnDark} />
            ) : (
              <Text style={[styles.saveText, !canSubmit && styles.saveTextDisabled]}>
                Receive
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer + amount */}
          <View style={styles.section}>
            <View style={styles.centerCol}>
           <View style={styles.headRow}>
  <Text style={styles.headName} numberOfLines={1}>
    {name}
  </Text>
  <View style={styles.headRight}>
    <Text style={styles.headLabel}>Outstanding</Text>
    <Text
      style={[
        styles.headValue,
        outstanding > 0 && { color: COLORS.danger },
      ]}
    >
      {money(outstanding)}
    </Text>
  </View>
</View>

              <View style={styles.field}>
            <Text style={[styles.label, { marginBottom: SPACING.sm }]}>
  Amount Received
</Text>
                <View style={[styles.inputRow, { borderBottomColor: underline }]}>
                  <Text style={styles.rupee}>{"\u20B9"}</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    editable={!loading && !fetching}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={styles.input}
                  />
                </View>
                {overLimit ? (
                  <Text style={styles.errorText}>
                    Cannot exceed outstanding of {money(outstanding)}.
                  </Text>
                ) : null}
              </View>

              <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                <Text style={styles.summaryLabel}>Balance after payment</Text>
                <Text style={styles.summaryValue}>{money(balanceAfter)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* Payment method */}
          <View style={styles.section}>
            <View style={styles.centerCol}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {METHODS.map((m, i) => {
                const active = method === m.key;
                return (
                  <React.Fragment key={m.key}>
                    {i > 0 && <View style={styles.separator} />}
                    <Pressable
                      onPress={() => setMethod(m.key)}
                      disabled={loading}
                      style={styles.optionRow}
                    >
                      <Text
                        style={[styles.optionText, active && styles.optionTextActive]}
                      >
                        {m.label}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={20} color={COLORS.blue} />
                      ) : null}
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },

  // ── Header ──
  header: {
    height: 72,
    paddingTop: 8,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textOnDark,
    fontSize: 19,
    fontWeight: "700",
  },
  saveBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 70,
    alignItems: "flex-end",
  },
  saveText: { color: COLORS.textOnDark, fontSize: 16, fontWeight: "700" },
  saveTextDisabled: { opacity: 0.45 },

  // ── Layout ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  centerCol: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  sectionDivider: { height: 8, backgroundColor: COLORS.bg, marginTop: SPACING.md },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
  },

  // ── Summary rows ──
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryLabel: { fontSize: 18, color: COLORS.textSecondary },
  summaryValue: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },

  // ── Amount field ──
  field: { marginBottom: SPACING.lg },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  label: { fontSize: 21, color: COLORS.textPrimary },
  link: { fontSize: 16, fontWeight: "600", color: COLORS.blue },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
  },
  rupee: { fontSize: 19, color: COLORS.textSecondary, marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontSize: 19,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  errorText: { fontSize: 14, color: COLORS.danger, marginTop: SPACING.xs },

  // ── Method options ──
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
  },
  optionText: { fontSize: 19, color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.blue, fontWeight: "600" },
  headRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: SPACING.lg,
},
headName: {
  flex: 1,
  fontSize: 21,
  fontWeight: "700",
  color: COLORS.textPrimary,
  paddingRight: SPACING.md,
},
headRight: { alignItems: "flex-end" },
headLabel: { fontSize: 13, color: COLORS.textMuted },
headValue: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
});