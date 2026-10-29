// components/QuickQtyModal.js
// "Bags × Units = Total" entry screen shown when a product is tapped.
// Styled to match CustomerSearchScreen / Transportation Details:
// navy header (close · title · action) + white centered body.
// - Keyboard opens on Bags immediately.
// - Units is prefilled with the last value used for this product.
// - Enter on Bags adds straight away if Units is already filled.
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "./Colors";

const MAX_CONTENT_WIDTH = 720;

// Keep digits and a single decimal point.
const cleanNumber = (text) => {
  const t = String(text).replace(/[^0-9.]/g, "");
  const firstDot = t.indexOf(".");
  if (firstDot === -1) return t;
  return t.slice(0, firstDot + 1) + t.slice(firstDot + 1).replace(/\./g, "");
};

const toNumber = (text) => {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : 0;
};

const round3 = (n) => Math.round(n * 1000) / 1000;

export default function QuickQtyModal({
  visible,
  product,
  initialUnits, // remembered units for this product (number | undefined)
  onClose,
  onAdd, // ({ bags, units }) => void
}) {
  const [bags, setBags] = useState("");
  const [units, setUnits] = useState("");
  const [focused, setFocused] = useState("bags");
  const bagsRef = useRef(null);
  const unitsRef = useRef(null);

  // Reset every time the screen opens for a product.
  useEffect(() => {
    if (!visible) return;
    setBags("");
    setUnits(initialUnits ? String(initialUnits) : "");
    setFocused("bags");
    const t = setTimeout(() => bagsRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [visible, product, initialUnits]);

  const bagsNum = toNumber(bags);
  const unitsNum = toNumber(units);
  const total = round3(bagsNum * unitsNum);
  const canAdd = bagsNum > 0 && unitsNum > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd({ bags: bagsNum, units: unitsNum });
  };

  const onBagsSubmit = () => {
    if (canAdd) submit();
    else unitsRef.current?.focus();
  };

  const price = Number(product?.price) || 0;
  const productName = product?.product || product?.name || "Item";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.headerIconBtn}
            testID="quick-qty-close-button"
          >
            <Ionicons name="close" size={26} color={COLORS.textOnDark} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Add Quantity
          </Text>

          <Pressable
            onPress={submit}
            disabled={!canAdd}
            hitSlop={8}
            style={[styles.headerAction, !canAdd && styles.headerActionOff]}
            testID="quick-qty-add-button"
          >
            <Text style={styles.headerActionText}>Add</Text>
          </Pressable>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.centerCol}>
              <Text style={styles.productName} numberOfLines={2}>
                {productName}
              </Text>
              <Text style={styles.productRate}>
                Rate: ₹{price.toLocaleString("en-IN")} per unit
              </Text>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Bags</Text>
                  <TextInput
                    ref={bagsRef}
                    value={bags}
                    onChangeText={(t) => setBags(cleanNumber(t))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    selectTextOnFocus
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={onBagsSubmit}
                    onFocus={() => setFocused("bags")}
                    style={[
                      styles.input,
                      focused === "bags" && styles.inputFocused,
                    ]}
                    testID="quick-qty-bags-input"
                  />
                </View>

                <Text style={styles.operator}>×</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Units per bag</Text>
                  <TextInput
                    ref={unitsRef}
                    value={units}
                    onChangeText={(t) => setUnits(cleanNumber(t))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    selectTextOnFocus
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    onFocus={() => setFocused("units")}
                    style={[
                      styles.input,
                      focused === "units" && styles.inputFocused,
                    ]}
                    testID="quick-qty-units-input"
                  />
                </View>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total quantity</Text>
                <Text style={styles.totalValue}>{total || 0}</Text>
              </View>

              {canAdd ? (
                <Text style={styles.amountHint}>
                  Amount: ₹
                  {(total * price).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.navyDeep,
  },

  // ── Header (same as Customer Search / Transportation) ──
  header: {
    height: 64,
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
  headerAction: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  headerActionOff: { opacity: 0.4 },
  headerActionText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Body ──
  body: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  centerCol: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  productName: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  productRate: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.xl,
  },

  // ── Inputs ──
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  field: { flex: 1 },
  label: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  input: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.divider,
  },
  inputFocused: { borderBottomColor: COLORS.blue },
  operator: {
    fontSize: 26,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm + 4,
  },

  // ── Total ──
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  totalValue: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.blue,
  },
  amountHint: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: SPACING.xs,
  },
});