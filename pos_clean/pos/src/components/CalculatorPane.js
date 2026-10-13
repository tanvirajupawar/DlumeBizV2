import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "./Colors";

let calcCounter = 0;
const makeCalcId = () => `calc-${Date.now()}-${calcCounter++}`;

const MAX_LEN = 9;

function appendChar(current, char) {
  if (char === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : current + ".";
  }
  if (char === "00") {
    // Never produce a leading "00"
    if (current === "" || current === "0") return "0";
    if (current.length + 2 > MAX_LEN) return current;
    return current + "00";
  }
  if (current.length >= MAX_LEN) return current;
  if (current === "0") return char;
  return current + char;
}

// Layout (4 columns):
//   7   8   9   AC
//   4   5   6   ×
//   1   2   3   =   <- "=" is one tall key spanning the last two rows
//   00  .   0   =
// "=" adds the item to the cart. There is no separate Add control.
const DIGIT_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["00", ".", "0"],
];

export default function CalculatorPane({ onAddToCart }) {
  const [qtyStr, setQtyStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [stage, setStage] = useState("qty"); // 'qty' | 'price'

  const qtyNum = parseFloat(qtyStr) || 0;
  const priceNum = parseFloat(priceStr) || 0;
  const total = qtyNum * priceNum;

  const reset = () => {
    setQtyStr("");
    setPriceStr("");
    setStage("qty");
  };

  const handleDigit = (char) => {
    if (stage === "qty") setQtyStr((prev) => appendChar(prev, char));
    else setPriceStr((prev) => appendChar(prev, char));
  };

  const handleMultiply = () => {
    if (stage === "qty" && qtyStr !== "") setStage("price");
  };

  // "=" is enabled once both quantity and price have real values.
  const canAdd =
    stage === "price" &&
    qtyStr !== "" &&
    priceStr !== "" &&
    qtyNum > 0 &&
    priceNum > 0;

  const handleEquals = () => {
    if (!canAdd) return;
    const id = makeCalcId();
    onAddToCart({
      id,
      _id: id,
      product: `Item (${qtyNum} × ₹${priceNum})`,
      description: "",
      qty: qtyNum,
      price: priceNum,
      isCalculatorItem: true,
    });
    reset();
  };

  const topLine = stage === "qty" ? "Enter Quantity" : "Quantity × Price";

  const bottomLine =
    stage === "qty" ? qtyStr || "0" : `${qtyStr || "0"} \u00D7 ${priceStr}`;

  // Small live total preview once a price has actually been typed.
  const showTotalPreview = stage === "price" && priceStr !== "";

  const isMultiplyActive = stage !== "qty";

  return (
    <View style={styles.container}>
      {/* Display */}
      <View style={styles.display}>
        <Text style={styles.topLine} numberOfLines={1}>
          {topLine}
        </Text>
        <Text style={styles.bottomLine} numberOfLines={1} adjustsFontSizeToFit>
          {bottomLine}
        </Text>
        {showTotalPreview && (
          <Text style={styles.totalPreview} numberOfLines={1}>
            {"= \u20B9"}
            {total.toFixed(2)}
          </Text>
        )}
      </View>

      {/* Keypad: digits on the left, AC / × / tall "=" in the right column */}
      <View style={styles.keypad}>
        <View style={styles.digitBlock}>
          {DIGIT_ROWS.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keyRow}>
              {row.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={styles.key}
                  onPress={() => handleDigit(label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.sideCol}>
          <TouchableOpacity
            style={[styles.key, styles.keyFunc]}
            onPress={reset}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, styles.keyTextFunc]}>AC</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.key,
              styles.keyOp,
              isMultiplyActive && styles.keyOpActive,
            ]}
            onPress={handleMultiply}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>×</Text>
          </TouchableOpacity>

          {/* Tall "=" — spans the last two rows, adds the item to the cart */}
          <TouchableOpacity
            style={[
              styles.key,
              styles.equalsKey,
              !canAdd && styles.equalsKeyDisabled,
            ]}
            onPress={handleEquals}
            disabled={!canAdd}
            activeOpacity={0.8}
            accessibilityLabel="Add to cart"
          >
            <Text style={styles.equalsText}>=</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const KEY_BG = "#2b2f36";
const FUNC_BG = "#3a3f47";
const OP_BG = "#3a3f47";
const OP_ACTIVE_BG = COLORS.blue || "#2f6fed";
const SCREEN_BG = "#14161a";
const DISPLAY_BG = "#1c1f24";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    padding: SPACING.sm,
  },

  display: {
    flex: 1,
    backgroundColor: DISPLAY_BG,
    borderRadius: RADIUS.md || 12,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  topLine: {
    color: "#8a8f98",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "right",
    marginBottom: 4,
  },
  bottomLine: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    textAlign: "right",
  },
  totalPreview: {
    color: OP_ACTIVE_BG,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 4,
  },

  // Keypad fills the remaining space: 3 digit columns + 1 side column.
  // Both sides use the same 4 equal row units, so the tall "=" lines up
  // exactly with the last two digit rows.
  keypad: {
    flex: 4,
    flexDirection: "row",
  },
  digitBlock: {
    flex: 3,
  },
  sideCol: {
    flex: 1,
  },
  keyRow: {
    flex: 1,
    flexDirection: "row",
  },
  key: {
    flex: 1,
    margin: 4,
    backgroundColor: KEY_BG,
    borderRadius: RADIUS.sm || 10,
    alignItems: "center",
    justifyContent: "center",
  },
  keyFunc: {
    backgroundColor: FUNC_BG,
  },
  keyOp: {
    backgroundColor: OP_BG,
  },
  keyOpActive: {
    backgroundColor: OP_ACTIVE_BG,
  },
  keyText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },
  keyTextFunc: {
    fontSize: 18,
    color: "#d0d3d8",
  },

  // Tall "=" spans two row units
  equalsKey: {
    flex: 2,
    backgroundColor: OP_ACTIVE_BG,
  },
  equalsKeyDisabled: {
    opacity: 0.3,
  },
  equalsText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 40,
  },
});