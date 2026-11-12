// components/QuickQtyModal.js
// "Bags × Units × Price = Amount" entry screen shown when a product is tapped.
// Styled to match CustomerSearchScreen / Transportation Details:
// navy header (close · title · action) + white centered body.
// - Keyboard opens on Bags immediately.
// - Price is prefilled with the product's list price and can be edited.
// - Enter moves Bags → Units → Price, and Enter on Price adds the item.
// - Total quantity / amount sit under the product name so the keyboard never hides them.
// - Bags, Units and Price are all on one row.
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ToastAndroid,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getListPrice } from "../utils/unitOptions";
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
  onClose,
  onAdd, // ({ bags, units, price }) => void
  initialUnits, // optional: prefill units per bag
}) {
  const [bags, setBags] = useState("1");
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [focused, setFocused] = useState("bags");
  const bagsRef = useRef(null);
  const unitsRef = useRef(null);
  const priceRef = useRef(null);

  // Reset every time the screen opens for a product.
useEffect(() => {
  if (!visible) return;

  const u = initialUnits ? String(initialUnits) : "";
  const p = String(getListPrice(product) || "");

  setBags("1");
  setUnits(u);
  setPrice(p);

  const first = !u ? "units" : !p ? "price" : "bags";
  setFocused(first);

  const t = setTimeout(
    () =>
      ({ bags: bagsRef, units: unitsRef, price: priceRef })[first].current?.focus(),
    300
  );
  return () => clearTimeout(t);
}, [visible, product, initialUnits]);

  const bagsNum = toNumber(bags);
  const unitsNum = toNumber(units);
  const priceNum = toNumber(price);
  const total = round3(bagsNum * unitsNum);
  const amount = round3(total * priceNum);
  const canAdd = bagsNum > 0 && unitsNum > 0 && priceNum > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd({ bags: bagsNum, units: unitsNum, price: priceNum });
  };

  const onBagsSubmit = () => unitsRef.current?.focus();
  const onUnitsSubmit = () => priceRef.current?.focus();

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

              {/* Totals (replaces the old "List price" line) */}
              <View style={styles.totalsRow}>
                <View style={styles.totalCol}>
                  <Text style={styles.totalLabel}>Total quantity</Text>
                  <Text style={styles.totalValueSm}>{total || 0}</Text>
                </View>

                <View style={[styles.totalCol, styles.totalColRight]}>
                  <Text style={styles.totalLabel}>Total amount</Text>
                  <Text
                    style={styles.totalValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    ₹
                    {amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>

              {/* Bags × Units × Price */}
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label} numberOfLines={1}>
                    Bags
                  </Text>
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
                  <Text style={styles.label} numberOfLines={1}>
                    Units/bag
                  </Text>
                  <TextInput
                    ref={unitsRef}
                    value={units}
                    onChangeText={(t) => setUnits(cleanNumber(t))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    selectTextOnFocus
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={onUnitsSubmit}
                    onFocus={() => setFocused("units")}
                    style={[
                      styles.input,
                      focused === "units" && styles.inputFocused,
                    ]}
                    testID="quick-qty-units-input"
                  />
                </View>

                <Text style={styles.operator}>×</Text>

                <View style={styles.field}>
                  <Text style={styles.label} numberOfLines={1}>
                    Price (₹)
                  </Text>
                  <TextInput
                    ref={priceRef}
                    value={price}
                    onChangeText={(t) => setPrice(cleanNumber(t))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    selectTextOnFocus
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    onFocus={() => setFocused("price")}
                    style={[
                      styles.input,
                      focused === "price" && styles.inputFocused,
                    ]}
                    testID="quick-qty-price-input"
                  />
                </View>
              </View>
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

  // ── Totals (top, where list price used to be) ──
  totalsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  totalCol: {
    flex: 1,
  },
  totalColRight: {
    alignItems: "flex-end",
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  totalValueSm: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.blue,
  },

  // ── Inputs (all three on one row) ──
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
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.divider,
  },
  inputFocused: { borderBottomColor: COLORS.blue },
  operator: {
    fontSize: 22,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm + 4,
  },
});