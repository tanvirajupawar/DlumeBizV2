// components/QuantityKeypad.js
// Till-style quantity drawer. Docks at the bottom of the product pane (NOT a Modal),
// so the product grid and the cart stay visible. No system keyboard is ever opened.
//
// Left : live sentence "12 bags × 25 = 300 units", price tag, unit chips.
// Right: on-screen keypad (digits, ., 00) + side keys (+5, +10, ⌫, ADD).
//
// Usage (inside the left pane, after <OrderPane />):
//   <QuantityKeypad
//     key={`${productId}-${focus}`}   // remount = fresh state per open
//     product={product}
//     defaultPrice={price}
//     unitOptions={[25, 30, 50]}      // most recent first
//     initialFocus="bags"             // "bags" | "units" | "price"
//     onClose={...}
//     onAdd={({ bags, units, price }) => ...}
//   />
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "./Colors";

const MAX_LEN = 9;
const RED = "#DC2626";

const toNumber = (t) => {
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
};
const round3 = (n) => Math.round(n * 1000) / 1000;
const inr = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DIGIT_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "00"],
];

export default function QuantityKeypad({
  product,
  defaultPrice = 0,
  unitOptions = [],
  initialFocus = "bags",
  onClose,
  onAdd,
}) {
  const [vals, setVals] = useState(() => ({
    bags: "1",
    units: unitOptions[0] ? String(unitOptions[0]) : "",
    price: defaultPrice > 0 ? String(defaultPrice) : "",
  }));
  const [target, setTarget] = useState(initialFocus);
  // "fresh" = next digit replaces the field instead of appending.
  const [fresh, setFresh] = useState(true);

  const setField = (field, v) => setVals((p) => ({ ...p, [field]: v }));
  const focusField = (f) => {
    setTarget(f);
    setFresh(true);
  };

  const bagsNum = toNumber(vals.bags);
  const unitsNum = toNumber(vals.units);
  const priceNum = toNumber(vals.price);
  const totalUnits = round3(bagsNum * unitsNum);
  const amount = round3(totalUnits * priceNum);
  const canAdd = bagsNum > 0 && unitsNum > 0 && priceNum > 0;

  const press = (k) => {
    const cur = fresh ? "" : vals[target];
    let next;
    if (k === ".") {
      if (cur.includes(".")) return;
      next = cur === "" ? "0." : cur + ".";
    } else if (k === "00") {
      if (cur === "" || cur === "0") return;
      next = cur + "00";
    } else {
      next = cur === "0" ? k : cur + k;
    }
    if (next.length > MAX_LEN) return;
    setField(target, next);
    setFresh(false);
  };

  const backspace = () => {
    if (fresh) {
      setField(target, "");
      setFresh(false);
      return;
    }
    setField(target, vals[target].slice(0, -1));
  };

  const bump = (n) => {
    setField("bags", String(round3(toNumber(vals.bags) + n)));
    focusField("bags");
  };

  const pickUnits = (u) => {
    setField("units", String(u));
    focusField("bags");
  };

  const newUnits = () => {
    setField("units", "");
    focusField("units");
  };

  const submit = () => {
    if (!canAdd) {
      // Jump to whatever is missing instead of failing silently.
      if (unitsNum <= 0) focusField("units");
      else if (priceNum <= 0) focusField("price");
      else focusField("bags");
      return;
    }
    onAdd({ bags: bagsNum, units: unitsNum, price: priceNum });
  };

  const side = [
    { label: "+5", onPress: () => bump(5) },
    { label: "+10", onPress: () => bump(10) },
    { icon: "backspace-outline", onPress: backspace },
    { label: "ADD", onPress: submit, primary: true, dim: !canAdd },
  ];

  const Seg = ({ field, label }) => {
    const active = target === field;
    const empty = vals[field] === "";
    return (
      <Pressable
        onPress={() => focusField(field)}
        style={[styles.seg, active && styles.segActive]}
      >
        <Text style={styles.segLabel}>{label}</Text>
        <Text
          style={[styles.segValue, empty && styles.segEmpty]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {empty ? "0" : vals[field]}
        </Text>
      </Pressable>
    );
  };

  const priceActive = target === "price";
  const priceMissing = priceNum <= 0;

   return (
    <View style={styles.overlay}>
      {/* Tap outside the card to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={styles.drawer}>
      {/* ── Left: live display ── */}
      <View style={styles.left}>
        <View style={styles.headRow}>
          <Text style={styles.name} numberOfLines={1}>
            {product?.product || product?.name || "Item"}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={COLORS.textMuted}
            />
          </Pressable>
        </View>

        {/* "12 bags × 25 = 300 units" */}
        <View style={styles.sentence}>
          <Seg field="bags" label="bags" />
          <Text style={styles.op}>×</Text>
          <Seg field="units" label="per bag" />
          <Text style={styles.op}>=</Text>
          <View style={styles.totalBox}>
            <Text style={styles.segLabel}>units</Text>
            <Text style={styles.segValue} numberOfLines={1} adjustsFontSizeToFit>
              {totalUnits || 0}
            </Text>
          </View>
        </View>

        {/* Price tag + amount */}
        <View style={styles.priceRow}>
          <Pressable
            onPress={() => focusField("price")}
            style={[
              styles.priceTag,
              priceActive && styles.priceTagActive,
              priceMissing && styles.priceTagMissing,
            ]}
          >
            <Text
              style={[
                styles.priceText,
                priceMissing && { color: RED },
              ]}
            >
              ₹{vals.price === "" ? "0" : vals.price} ✎
            </Text>
          </Pressable>

          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            ₹{inr(amount)}
          </Text>
        </View>

        {/* Unit chips */}
        <View style={styles.chips}>
          {unitOptions.map((u) => {
            const on = unitsNum === u;
            return (
              <Pressable
                key={u}
                onPress={() => pickUnits(u)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {u}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={newUnits} style={styles.chip}>
            <Text style={styles.chipText}>+ new</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Right: keypad ── */}
      <View style={styles.pad}>
        {DIGIT_ROWS.map((row, i) => (
          <View key={i} style={styles.padRow}>
            {row.map((k) => (
              <Pressable
                key={k}
                onPress={() => press(k)}
                style={({ pressed }) => [styles.key, pressed && styles.keyDown]}
              >
                <Text style={styles.keyText}>{k}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={side[i].onPress}
              style={({ pressed }) => [
                styles.key,
                styles.sideKey,
                side[i].primary && styles.addKey,
                side[i].dim && styles.addKeyDim,
                pressed && styles.keyDown,
              ]}
            >
              {side[i].icon ? (
                <MaterialCommunityIcons
                  name={side[i].icon}
                  size={24}
                  color={COLORS.textPrimary}
                />
              ) : (
                <Text
                  style={[
                    styles.keyText,
                    styles.sideText,
                    side[i].primary && styles.addText,
                  ]}
                >
                  {side[i].label}
                </Text>
              )}
            </Pressable>
          </View>
        ))}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
   overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  drawer: {
    width: "100%",
    maxWidth: 640,
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: SPACING.lg,
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  // Left
  left: { flex: 1, marginRight: SPACING.md },
  headRow: { flexDirection: "row", alignItems: "center" },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  closeBtn: { padding: 2 },

  sentence: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: SPACING.sm,
  },
  seg: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.divider,
  },
  segActive: { borderBottomColor: COLORS.blue },
  totalBox: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  segLabel: { fontSize: 12, color: COLORS.textMuted },
  segValue: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  segEmpty: { color: COLORS.textMuted },
  op: {
    fontSize: 22,
    color: COLORS.textMuted,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  priceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
  },
  priceTagActive: { borderColor: COLORS.blue },
  priceTagMissing: { borderColor: RED },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  amount: {
    flex: 1,
    textAlign: "right",
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.blue,
    marginLeft: SPACING.sm,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    marginRight: 8,
    marginBottom: 6,
  },
  chipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  chipText: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  chipTextOn: { color: "#FFFFFF" },

  // Right (keypad)
  pad: { width: 270 },
  padRow: { flexDirection: "row" },
  key: {
    flex: 1,
    height: 48,
    margin: 3,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  keyDown: { opacity: 0.55 },
  keyText: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary },
  sideKey: { backgroundColor: COLORS.divider },
  sideText: { fontSize: 17 },
  addKey: { backgroundColor: COLORS.blue },
  addKeyDim: { opacity: 0.45 },
  addText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
});