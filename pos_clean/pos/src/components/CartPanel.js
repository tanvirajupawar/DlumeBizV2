// src/components/CartPanel.js
import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "./Colors";
import CartFooter from "./CartFooter";

const formatPrice = (n) =>
  `₹${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCalculatorPrice = (n) =>
  `₹${Number(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

/* -------------------------- Customer bar -------------------------- */
/**
 * Shown above the item list once a customer has been attached to the
 * cart — name (blue) + phone number, with a "Remove" link on the right,
 * matching the reference screenshot. Selecting a customer happens
 * elsewhere (header's customer button), so "Remove" just clears the
 * selection back to null.
 */
function CustomerBar({ customer, onRemove }) {
  if (!customer) return null;

  const customerName =
    customer.name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    customer.company_name ||
    customer.customer_name ||
    "Customer";

  const customerPhone =
    customer.phone ||
    customer.mobile ||
    customer.mobile_no ||
    customer.contact ||
    "";

  return (
    <View style={styles.customerBar} testID="cart-customer-bar">
      <View style={{ flex: 1 }}>
        <Text style={styles.customerName} numberOfLines={1}>
          {customerName}
        </Text>

        {customerPhone ? (
          <Text style={styles.customerPhone}>
            {customerPhone}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onRemove}
        hitSlop={8}
        testID="cart-customer-remove"
      >
        <Text style={styles.customerRemove}>Remove</Text>
      </Pressable>
    </View>
  );
}

/* -------------------------- Empty state -------------------------- */
function CartEmpty() {
  return (
    <View style={styles.emptyWrap} testID="cart-empty">
      <View style={styles.emptyIcon}>
        <Feather name="shopping-cart" size={64} color="#B7C0CC" />
        <View style={styles.sparkleWrap}>
          <Ionicons name="sparkles" size={16} color="#B7C0CC" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Yet to add items to the cart!</Text>
      <Text style={styles.emptySubtitle}>
        Search or scan items to add them to your cart.
      </Text>
    </View>
  );
}


function CartRow({ item, onPress, onLongPress }) {
  const isCalculatorItem = item.isCalculatorItem === true;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
      testID={`cart-row-${item.id}`}
    >
      <View style={{ flex: 1 }}>

        {/* ITEM NAME */}
        {isCalculatorItem ? (
          <Text
            numberOfLines={1}
            style={styles.rowName}
          >
            {item.qty} × {formatCalculatorPrice(item.price)}
          </Text>
        ) : (
          <Text
            numberOfLines={1}
            style={styles.rowName}
          >
            {item.name}{" "}
            <Text style={styles.rowQty}>
              x {item.qty}
            </Text>
          </Text>
        )}

        {/* RATE - NORMAL ITEMS ONLY */}
        {!isCalculatorItem ? (
          <Text style={styles.rowRate}>
            RATE: {formatPrice(item.price)}
          </Text>
        ) : null}

        {/* DESCRIPTION - ALL ITEMS */}
        {item.description ? (
          <Text
            style={styles.rowDescription}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

      </View>

      {/* TOTAL PRICE */}
      <Text style={styles.rowPrice}>
        {formatPrice(item.price * item.qty)}
      </Text>
    </Pressable>
  );
}

/* -------------------------- Panel -------------------------- */
/**
 * Right (~40%) cart pane. Composes:
 *   - customer bar (name/phone + Remove), shown once selectedCustomer is set
 *   - empty state OR itemised rows
 *   - CartFooter (expandable Sub Total/Round Off + clear + hold + checkout)
 *   - ManageCartItemModal (opened by tapping a row)
 *
 * Props (matches POSScreen wiring):
 *   cartItems:        cart line items [{ id, name, sku?, price, qty, note? }]
 *   onClearCart:      clears every item from the cart
 *   onIncrement / onDecrement: kept for API compatibility, unused by row UI now
 *   onRemove:         fired after the user confirms the remove alert
 *   onOpenManageItem: (item) => void — opens the Manage Cart Item modal
 *   onHoldCart:       hold-cart handler
 *   customers:        full customer list (available for a future in-panel
 *                      picker; not rendered directly by this component today —
 *                      selection currently happens via the header's customer
 *                      button)
 *   selectedCustomer: { name, phone } | null — attached to this cart
 *   onSelectCustomer: (customer | null) => void — also used to clear
 *   grandTotal:       final total computed upstream (tax/discount already applied)
 *   checkoutDisabled: whether the Checkout button should be disabled
 *   onCheckout:       fired on Checkout press
 */
export default function CartPanel({
  cartItems = [],
  onClearCart,
  onIncrement,
  onDecrement,
  onRemove,
  onOpenManageItem,
  onHoldCart,
  customers = [],
  selectedCustomer = null,
  onSelectCustomer,
  grandTotal = 0,
  checkoutDisabled = false,
  checkoutLabel = "Checkout",
   isReturnMode = false, 
  onCheckout,
}) {

  const totalQty = cartItems.reduce((a, b) => a + b.qty, 0);
  const subtotal = cartItems.reduce((a, b) => a + b.price * b.qty, 0);
  const roundOff = grandTotal - subtotal;
  const isEmpty = cartItems.length === 0;

  const handleRowPress = (item) => {
    onOpenManageItem?.(item);
  };

const handleRowLongPress = (item) => {
const itemLabel = item.isCalculatorItem
  ? `${item.qty} × ${formatCalculatorPrice(item.price)}`
  : item.name;

  Alert.alert(
    "Remove item?",
    `Remove "${itemLabel}" from the cart?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => onRemove?.(item),
      },
    ]
  );
};

  const handleRemoveCustomer = () => {
    onSelectCustomer?.(null);
  };

  return (
    <View style={styles.container} testID="cart-panel">
          <View style={styles.body}>
        {isReturnMode ? (
          <View style={styles.returnBanner}>
            <Ionicons name="return-up-back" size={18} color="#B91C1C" />
            <Text style={styles.returnBannerText}>
              RETURN MODE · items will be returned to the customer
            </Text>
          </View>
        ) : null}

        <CustomerBar customer={selectedCustomer} onRemove={handleRemoveCustomer} />

        {isEmpty ? (
          <CartEmpty />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingVertical: SPACING.md }}
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((it) => (
              <CartRow
                key={it.id}
                item={it}
                onPress={handleRowPress}
                onLongPress={handleRowLongPress}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <CartFooter
        itemCount={cartItems.length}
        totalQty={totalQty}
        subtotal={subtotal}
        roundOff={roundOff}
        total={grandTotal}
        isEmpty={isEmpty}
        checkoutDisabled={checkoutDisabled}
        onClear={onClearCart}
        onHold={onHoldCart}
        checkoutLabel={checkoutLabel}
         isReturnMode={isReturnMode} 
        onCheckout={onCheckout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: COLORS.divider,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  /* customer bar */
  customerBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  customerName: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.blue,
  },
  customerPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerRemove: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.blue,
    marginLeft: SPACING.md,
  },

  /* empty state */
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 140,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleWrap: {
    position: "absolute",
    top: 6,
    right: 22,
  },
  emptyTitle: {
    marginTop: SPACING.lg,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  rowPressed: {
    backgroundColor: COLORS.chipBg,
  },
  rowName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  rowQty: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  rowRate: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  rowPrice: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  rowDescription: {
  fontSize: 14,
  color: COLORS.textSecondary,
  marginTop: 4,
  lineHeight: 19,
},
  returnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  returnBannerText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#B91C1C" },
});