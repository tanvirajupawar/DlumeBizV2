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
  if (current.length >= MAX_LEN) return current;
  if (current === "0") return char;
  return current + char;
}

// "=" is gone. The old third key in the last row is now "00" — a quick
// double-zero entry key, a normal calculator convenience. Add to Cart is
// handled ONLY by the big button below; there's no second Add control.
const KEYS = [
  [{ label: "AC", type: "func" }, { label: "⌫", type: "func" }, { label: "×", type: "op" }],
  [{ label: "7" }, { label: "8" }, { label: "9" }],
  [{ label: "4" }, { label: "5" }, { label: "6" }],
  [{ label: "1" }, { label: "2" }, { label: "3" }],
  [{ label: "." }, { label: "0" }, { label: "00" }],
];

export default function CalculatorPane({ onAddToCart }) {
  const [qtyStr, setQtyStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  // Only two stages now — no separate "result" stage waiting on "=".
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

  const handleBackspace = () => {
    if (stage === "qty") setQtyStr((prev) => prev.slice(0, -1));
    else setPriceStr((prev) => prev.slice(0, -1));
  };

  const handleMultiply = () => {
    if (stage === "qty" && qtyStr !== "") setStage("price");
  };

  // Add to Cart is enabled purely once both quantity and price have real
  // values — no separate "confirm" step needed.
  const canAdd = stage === "price" && qtyStr !== "" && priceStr !== "" && qtyNum > 0 && priceNum > 0;

  const handleAdd = () => {
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

  const handleKeyPress = (key) => {
    if (key.label === "AC") return reset();
    if (key.label === "⌫") return handleBackspace();
    if (key.label === "×") return handleMultiply();
    return handleDigit(key.label);
  };

  // Single-line, always-visible expression: "2" while entering qty, then
  // "2 ×" the instant × is pressed, then "2 × 3" as the price is typed —
  // nothing ever collapses back to a bare "0".
  const topLine = stage === "qty" ? "Enter Quantity" : "Quantity × Price";

  const bottomLine =
    stage === "qty"
      ? qtyStr || "0"
      : `${qtyStr || "0"} \u00D7 ${priceStr}`;

  // Small live total preview once a price has actually been typed.
  const showTotalPreview = stage === "price" && priceStr !== "";

  return (
    <View style={styles.container}>
      {/* Display — fixed proportion of height, never gets pushed off */}
      <View style={styles.display}>
        <Text style={styles.topLine} numberOfLines={1}>
          {topLine}
        </Text>
        <Text style={styles.bottomLine} numberOfLines={1} adjustsFontSizeToFit>
          {bottomLine}
        </Text>
        {showTotalPreview && (
          <Text style={styles.totalPreview} numberOfLines={1}>
            {"= \u20B9"}{total.toFixed(2)}
          </Text>
        )}
      </View>

      {/* Keypad — fills remaining space, rows/keys split evenly, no aspectRatio */}
      <View style={styles.keypad}>
        {KEYS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keyRow}>
            {row.map((key) => {
              const isOp = key.type === "op";
              const isFunc = key.type === "func";
              const isActiveOp = key.label === "×" && stage !== "qty";

              return (
                <TouchableOpacity
                  key={key.label}
                  style={[
                    styles.key,
                    isFunc && styles.keyFunc,
                    isOp && styles.keyOp,
                    isActiveOp && styles.keyOpActive,
                  ]}
                  onPress={() => handleKeyPress(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.keyText,
                      isFunc && styles.keyTextFunc,
                      (isOp || isActiveOp) && styles.keyTextOp,
                    ]}
                  >
                    {key.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Add to cart — the ONLY add action, fixed height, always fully visible */}
      <TouchableOpacity
        style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
        onPress={handleAdd}
        disabled={!canAdd}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>Add to Cart</Text>
      </TouchableOpacity>
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

  // ~22% of pane height, fixed — display never competes with keys for space
  display: {
    flex: 0.9,
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

  // Keypad fills all remaining space; each row is an equal flex slice
  keypad: {
    flex: 4,
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
  keyTextOp: {
    color: "#fff",
  },

  // Fixed height — not flex — so it can never be squeezed off-screen
  addButton: {
    height: 52,
    backgroundColor: OP_ACTIVE_BG,
    borderRadius: RADIUS.md || 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  addButtonDisabled: {
    opacity: 0.3,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});