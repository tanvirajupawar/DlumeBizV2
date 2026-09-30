import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Share,
  Animated,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import API from "../../api/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../../components/Colors";
import Header from "../../components/Header";
import { NativeModules } from "react-native";
import {
  printReceipt,
  printDailySalesSummary,
} from "../../services/printer";

import { getCached, setCached, getCachedSync } from "../../utils/cache";

let AsyncStorage = null;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (e) {
  AsyncStorage = null;
}

const getToken = async () => {
  if (!AsyncStorage) return null;
  try {
    return await AsyncStorage.getItem("access_token");
  } catch (e) {
    return null;
  }
};

const STATUS_COLORS = {
  Paid: "#16A34A",
  Partial: "#D97706",
  Unpaid: "#DC2626",
  Confirmed: "#D97706",
  Closed: "#16A34A",
  Cancelled: "#DC2626",
};

const { SunmiPrinter } = NativeModules;

// ── Date helpers ───────────────────────────────────────────────────────

// Local YYYY-MM-DD key — deliberately NOT toISOString(), so a sale logged
// late at night in the user's local timezone doesn't get bucketed into
// the wrong day.
const dateKey = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateLong = (d) => {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "-";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

// Builds a Sun-first month grid (nulls = leading blank cells) for the
// lightweight date picker below — no new date-picker dependency needed.
const getCalendarCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

const money = (n) => Number(n || 0).toFixed(2);

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  const d = new Date(isoDate);
  if (isNaN(d)) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Section header for the orders list shows the order's actual date
// (DD/MM/YYYY, same as formatDate). Falls back to "No Date" when the order
// has no usable date.
const dateGroupFor = (isoDate) => {
  const formatted = formatDate(isoDate);
  return formatted === "-" ? "No Date" : formatted;
};

const mapInvoice = (inv, returnsBySalesId) => {
  const customer = inv.customer_id || inv.client_id || {};
  const invId = inv._id;

  const totalReturn = returnsBySalesId[invId] || 0;
  const totalAmount = Number(inv.total_amount || 0);
  const paidAmount = Number(inv.paid_amount || 0);
  const pendingAmount = Math.max(totalAmount - paidAmount - totalReturn, 0);

  let status;
  if (pendingAmount <= 0 && totalAmount > 0) {
    status = "Paid";
  } else if (paidAmount > 0 || totalReturn > 0) {
    status = "Partial";
  } else {
    status = "Unpaid";
  }
  if (totalReturn > 0 && status === "Unpaid") {
    status = "Partial";
  }

  const invoiceDate = inv.invoice_date || inv.order_date || "";

  const customerName =
    customer.first_name || customer.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : inv.customer_name || "Walk-in";

  const companyName = customer.company_name || "Walk-in";

  const items = (inv.items || []).map((d) => {
    const prod = d.product_id || {};
    const rate = Number(d.price || d.rate || 0);
    const bags = Number(d.bags || 0);
    const units = Number(d.units || 0);

    let qty;
    if (bags > 0 && units > 0) qty = bags * units;
    else if (units > 0) qty = units;
    else if (bags > 0) qty = bags;
    else qty = Number(d.qty || 0);

    const amount =
      Number(d.amount || d.total) > 0 ? Number(d.amount || d.total) : qty * rate;

    const isCalculatorItem =
      !d.product_id &&
      !prod._id &&
      typeof d.product_name === "string" &&
      d.product_name.startsWith("Item (");

    return {
      id: d._id || prod._id || `${invId}-${Math.random()}`,
      product_id: prod._id || d.product_id || "",

      isCalculatorItem,

      name: isCalculatorItem
        ? `${qty} × ₹${rate}`
        : prod.product ||
          prod.name ||
          d.product_name ||
          d.item_name ||
          "—",

      product_name: isCalculatorItem
        ? ""
        : prod.product ||
          prod.name ||
          d.product_name ||
          d.item_name ||
          "",

      type: isCalculatorItem
        ? ""
        : prod.type || prod.item_type || d.item_type || d.type || "",

      size: prod.size || d.size || d.Size || "",
      hsn: d.hsn || prod.hsn || "",

      description:
        d.description ||
        d.desc ||
        prod.description ||
        prod.desc ||
        "",

      bags,
      units,
      qty,
      rate,
      amount,
    };
  });

  const subTotal = items.reduce((s, it) => s + it.amount, 0);
  const grandTotal = totalAmount > 0 ? totalAmount : subTotal;
  const discount = Number(inv.discount || 0);
  const tax = Number(inv.tax_amount || inv.tax || 0);

  return {
    id: invId,
    invoiceNo: inv.invoice_no || "—",
    customer_id:
      customer._id ||
      inv.customer_id?._id ||
      inv.customer_id ||
      inv.client_id ||
      "",
    customer: customerName,
    companyName,
    total: grandTotal,
    status,
    paymentStatus: status === "Paid" ? "Paid" : "Unpaid",
    paymentMode: inv.payment_method || inv.paymentMode || "",
    fulfillmentStatus: "Fulfilled",
    date: invoiceDate,
    dateGroup: dateGroupFor(invoiceDate),
    items,
    subTotal,
    discount,
    tax,
    grandTotal,
    paidAmount,
    pendingAmount,
    returnAmount: totalReturn,
    customerInfo: {
      _id: customer._id || "",
      company_name: companyName,
      gstin: customer.gstin || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address_line1: customer.address_line1 || customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      pincode: customer.pincode || "",
    },
  };
};

const mapPayment = (col) => ({
  id: col._id,
  receiptNo: col.receipt_no || "-",
  invoiceNo: col.invoice_no || (col.invoice_ids && col.invoice_ids[0]) || "-",
  invoiceIds: col.invoice_ids || [],
  allocations: col.allocations || [],
  date: col.date || col.payment_date || col.createdOn || "",
  method: col.payment_method || "-",
  remarks:
    col.remarks ||
    col.remark ||
    col.note ||
    col.payment_remarks ||
    "",
  amount: Number(col.amount || 0),
});

const mapReturnRecord = (ret) => ({
  id: ret._id,
  returnNo: ret.return_no || "-",
  salesId: (ret.sales_id && ret.sales_id._id) || ret.sales_id || "",
  date: ret.createdAt || ret.date || "",
  total: Number(ret.total_amount || 0),
  reason: ret.reason || "",
  details: (ret.details || []).map((d, idx) => ({
    id: d._id || `${ret._id}-${idx}`,
    product_id: (d.product_id && d.product_id._id) || d.product_id || "",
    name: d.product_name || "Item",
    qty: Number(d.qty || 0),
    rate: Number(d.price || 0),
    amount: Number(d.amount || 0),
  })),
});

const returnBelongsToOrder = (ret, order) => {
  if (!order) return false;
  return ret.salesId === order.id;
};

const paymentBelongsToOrder = (payment, order) => {
  if (!order) return false;
  if (payment.invoiceIds && payment.invoiceIds.includes(order.id)) return true;
  if (payment.invoiceNo && order.invoiceNo && payment.invoiceNo === order.invoiceNo)
    return true;
  return false;
};

// Builds the same `receipt` shape CheckoutScreen/POSPaymentSuccessScreen
// hand to `printReceipt`, but sourced from an already-placed order instead
// of a fresh cart — so reprinting an old invoice uses the exact same
// printer service and layout as the original receipt.
const buildReceiptFromOrder = (order, company, user) => ({
  companyName: company?.name || "D'LumeBiz",

  companyAddress: [
    company?.address,
    company?.area,
    company?.city,
    company?.state,
    company?.country,
    company?.pincode,
  ]
    .filter(Boolean)
    .join(", "),

  companyPhone: company?.mobile || "",
  companyEmail: company?.email || user?.email || "",

  invoiceNo: order.invoiceNo,
  invoiceDate: order.date || new Date().toISOString(),

  customerName:
    order.companyName && order.companyName !== "Walk-in"
      ? order.companyName
      : order.customer,

  paymentMode: order.paymentMode || order.paymentStatus || "",
  subtotal: order.subTotal,
  totalDiscount: order.discount,
  totalTax: order.tax,
  grandTotal: order.grandTotal,
  amountReceived: order.paidAmount,

  receipt_size: "58mm",
  isGSTUser: false,
  isIntraState: true,

  items: order.items.map((it) => ({
    // Keep calculator/normal distinction for Sunmi + Bluetooth
    isCalculatorItem: !!it.isCalculatorItem,

    // Calculator item keeps its existing display.
    // Normal product uses the actual product name.
    name: it.isCalculatorItem
      ? it.name
      : (
          it.product_name ||
          it.name ||
          it.product ||
          "Item"
        ),

    // Preserve actual product name separately
    product_name:
      it.product_name ||
      it.name ||
      it.product ||
      "",

    qty: it.qty,
    price: it.rate,
    rate: it.rate,
    amount: it.amount,

    description: it.description || "",
    desc: it.description || "",

    discount: 0,
    gstRate: 0,
    hsn: it.hsn || "",
  })),
});

const OrderListRow = React.memo(function OrderListRow({ order, isActive, onPress }) {
  const statusColor = STATUS_COLORS[order.status] || colors.textMuted;
  return (
    <TouchableOpacity
      style={[styles.listRow, isActive && styles.listRowActive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.listRowTopLine}>
        <Text style={styles.listRowId} numberOfLines={1}>
          {order.invoiceNo}
        </Text>
        <Text style={styles.listRowAmount}>
          {"\u20B9"}
          {money(order.total)}
        </Text>
      </View>
      <View style={styles.listRowBottomLine}>
        <Text style={styles.listRowCustomer} numberOfLines={1}>
          {order.customer}
          {order.companyName && order.companyName !== "Walk-in"
            ? ` · ${order.companyName}`
            : ""}
        </Text>
      </View>
      <View
        style={[
          styles.statusChip,
          { backgroundColor: `${statusColor}1A`, borderColor: `${statusColor}40` },
        ]}
      >
        <View style={[styles.statusChipDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusChipText, { color: statusColor }]}>{order.status}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── More-menu modal ──────────────────────────────────────────────────────

function MoreMenuModal({
  visible,
  onClose,
  onRefund,
  onDelete,
  hideRefund = false,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.moreMenuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.moreMenuSheet}>
          <View style={styles.moreMenuHandle} />

          {!hideRefund && (
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => {
                onClose();
                onRefund();
              }}
            >
              <View style={styles.moreMenuIconWrap}>
                <MaterialCommunityIcons
                  name="cash-refund"
                  size={22}
                  color={colors.textPrimary}
                />
              </View>

              <Text style={styles.moreMenuItemText}>Refund</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.moreMenuItem}
            onPress={() => { onClose(); onDelete(); }}
          >
            <View style={[styles.moreMenuIconWrap, { backgroundColor: "#FEF2F2" }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.moreMenuItemText, { color: "#DC2626" }]}>Delete Invoice</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Item table (mirrors web InvoiceDetailPanel) ──────────────────────────

function ItemTable({ items }) {
  return (
    <View>
      {/* Header */}
      <View style={styles.itHeader}>
        <Text style={[styles.itHeaderCell, styles.itColItem]}>Item</Text>
        <Text style={[styles.itHeaderCell, styles.itColDesc]}>Desc</Text>
        <Text style={[styles.itHeaderCell, styles.itColSize]}>Size</Text>
        {/* Hidden per request — keep for later, just don't render.
        <Text style={[styles.itHeaderCell, styles.itColNum]}>Bags</Text>
        <Text style={[styles.itHeaderCell, styles.itColNum]}>Units</Text>
        */}
        <Text style={[styles.itHeaderCell, styles.itColNum]}>Qty</Text>
        <Text style={[styles.itHeaderCell, styles.itColPrice]}>Price</Text>
        <Text style={[styles.itHeaderCell, styles.itColTotal]}>Total</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.itEmptyRow}>
          <Text style={styles.itEmptyText}>No items found.</Text>
        </View>
      ) : (
        items.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.itRow,
              idx % 2 === 1 && styles.itRowAlt,
              idx === items.length - 1 && styles.itRowLast,
            ]}
          >
            <View style={styles.itColItem}>
              <Text style={styles.itItemName} numberOfLines={2}>
                {item.name}
              </Text>

              {item.type && !item.isCalculatorItem ? (
                <Text style={styles.itItemType} numberOfLines={1}>
                  {item.type}
                </Text>
              ) : null}
            </View>

            <Text style={[styles.itCell, styles.itColDesc, styles.itMuted]} numberOfLines={2}>
              {item.description || ""}
            </Text>

            <Text style={[styles.itCell, styles.itColSize, styles.itMuted]} numberOfLines={1}>
              {item.size || "—"}
            </Text>

            {/* Hidden per request — keep for later, just don't render.
            <Text style={[styles.itCell, styles.itColNum, styles.itCenter]}>
              {item.bags || 1}
            </Text>

            <Text style={[styles.itCell, styles.itColNum, styles.itCenter]}>
              {item.units || 1}
            </Text>
            */}

            <Text style={[styles.itCell, styles.itColNum, styles.itCenter, styles.itBold]}>
              {item.qty}
            </Text>

            <Text style={[styles.itCell, styles.itColPrice, styles.itRight, styles.itMuted]}>
              {"\u20B9"}{money(item.rate)}
            </Text>

            <Text style={[styles.itColTotal, styles.itRight, styles.itAmountText]}>
              {"\u20B9"}{money(item.amount)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const REFUND_MAX_WIDTH = 720;

/**
 * RefundItemsModal
 *
 * `returns` — the list of refund records that already belong to this order
 * (mapped via mapReturnRecord). We use it to work out, per item, how much
 * quantity has already been refunded in earlier refund transactions, so:
 *   - the stepper max caps at (qty bought - qty already refunded)
 *   - once an item's full quantity has been refunded, its stepper is
 *     disabled and it's flagged "Fully refunded" so the same item/qty
 *     can't be refunded a second time.
 */
function RefundItemsModal({ visible, order, returns, onClose, onConfirm, submitting }) {
  const [qtyMap, setQtyMap] = useState({});
  const [reason, setReason] = useState("");
  // Sum up qty already refunded per item, keyed by product_id (falling back
  // to product name if product_id isn't available on either side).
  const refundedQtyByKey = useMemo(() => {
    const map = {};
    (returns || []).forEach((ret) => {
      (ret.details || []).forEach((d) => {
        const key = d.product_id || d.name;
        if (!key) return;
        map[key] = (map[key] || 0) + (Number(d.qty) || 0);
      });
    });
    return map;
  }, [returns]);

  const itemsWithAvailability = useMemo(() => {
    if (!order) return [];
    return order.items.map((it) => {
      const key = it.product_id || it.name;
      const alreadyRefunded = refundedQtyByKey[key] || 0;
      const availableQty = Math.max(0, it.qty - alreadyRefunded);
      return { ...it, alreadyRefunded, availableQty };
    });
  }, [order, refundedQtyByKey]);

  useEffect(() => {
    if (visible && order) {
      const initial = {};
      order.items.forEach((it) => { initial[it.id] = 0; });
      setQtyMap(initial);
      setReason("");
    }
  }, [visible, order]);

  if (!order) return null;

  const adjustQty = (itemId, maxQty, delta) => {
    setQtyMap((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.min(maxQty, Math.max(0, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  // "Select All" reflects whether every refundable item currently has its
  // full available qty selected. Checking it sets all items to max qty;
  // unchecking resets all items to 0. Individual steppers remain fully
  // usable afterward — this is just a fast-fill shortcut, not a lock.
  const selectableItems = itemsWithAvailability.filter((it) => it.availableQty > 0);
  const allSelectedAtMax =
    selectableItems.length > 0 &&
    selectableItems.every((it) => (qtyMap[it.id] || 0) >= it.availableQty);

  const toggleSelectAll = () => {
    if (allSelectedAtMax) {
      setQtyMap((prev) => {
        const next = { ...prev };
        selectableItems.forEach((it) => { next[it.id] = 0; });
        return next;
      });
    } else {
      setQtyMap((prev) => {
        const next = { ...prev };
        selectableItems.forEach((it) => { next[it.id] = it.availableQty; });
        return next;
      });
    }
  };

  const selectedItems = itemsWithAvailability
    .map((it) => ({ ...it, selectedQty: Math.min(qtyMap[it.id] || 0, it.availableQty) }))
    .filter((it) => it.selectedQty > 0);

  const totalRefund = selectedItems.reduce(
    (sum, it) => sum + it.selectedQty * it.rate,
    0
  );

  const handleConfirm = () => {
    if (selectedItems.length === 0) {
      Alert.alert("Select items", "Choose at least one item and quantity to refund.");
      return;
    }

    Alert.alert(
      "Confirm Refund",
      `Refund ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} for a total of \u20B9${money(totalRefund)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => {
            onConfirm({
              details: selectedItems.map((it) => ({
                product_id: it.product_id || undefined,
                product_name: it.name,
                qty: it.selectedQty,
                price: it.rate,
                amount: it.selectedQty * it.rate,
              })),
              total_amount: totalRefund,
              reason,
            });
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Root fills the whole modal screen. Header gets its own top-safe-area
          wrapper and the footer gets its own bottom-safe-area wrapper, so the
          scrollable middle section is free to size itself to whatever space
          is left and the Confirm button never sits under a home-indicator /
          gesture-bar. */}
      <View style={styles.refundScreenRoot}>
        <SafeAreaView edges={["top", "left", "right"]} style={styles.refundHeaderSafe}>
          <View style={styles.refundHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.refundHeaderIconBtn}>
              <MaterialCommunityIcons name="close" size={26} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.refundHeaderTitleWrap}>
              <Text style={styles.refundHeaderTitle}>Refund Items</Text>
              <Text style={styles.refundHeaderSubtitle}>{order.invoiceNo}</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Centered body: everything between header and footer. flex:1 here
            (with no maxHeight ceiling above it) is what gives the ScrollView
            below a real, bounded height to scroll within. */}
        <View style={styles.refundCenterCol}>
          {selectableItems.length > 0 && (
            <TouchableOpacity
              style={styles.refundSelectAllRow}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
            >
              <View style={[styles.refundCheckbox, allSelectedAtMax && styles.refundCheckboxChecked]}>
                {allSelectedAtMax && (
                  <MaterialCommunityIcons name="check" size={14} color={colors.white} />
                )}
              </View>
              <Text style={styles.refundSelectAllText}>Select all items (full quantity)</Text>
            </TouchableOpacity>
          )}

          <ScrollView
            style={styles.refundItemsScroll}
            contentContainerStyle={styles.refundItemsScrollContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces
          >
            {itemsWithAvailability.map((item) => {
              const selectedQty = Math.min(qtyMap[item.id] || 0, item.availableQty);
              const isFullyRefunded = item.availableQty <= 0;
              const atMax = selectedQty >= item.availableQty;

              return (
                <View
                  key={item.id}
                  style={[styles.refundItemRow, isFullyRefunded && styles.refundItemRowDisabled]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refundItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.refundItemMeta}>
                      Qty bought: {item.qty}
                      {item.alreadyRefunded > 0 ? ` · Refunded: ${item.alreadyRefunded}` : ""}
                      {" · "}{"\u20B9"}{money(item.rate)} each
                    </Text>
                    {isFullyRefunded && (
                      <View style={styles.refundFullyBadge}>
                        <Text style={styles.refundFullyBadgeText}>Fully refunded</Text>
                      </View>
                    )}
                  </View>

                  {/* Qty stepper — styled to match the Manage Cart Item
                      modal's Quantity control: bordered square buttons on
                      either side of a bordered number box. */}
                  <View style={styles.refundStepper}>
                    <TouchableOpacity
                      style={[
                        styles.refundStepBtn,
                        (selectedQty <= 0 || isFullyRefunded) && styles.refundStepBtnDisabled,
                      ]}
                      onPress={() => adjustQty(item.id, item.availableQty, -1)}
                      disabled={selectedQty <= 0 || isFullyRefunded}
                    >
                      <Text
                        style={[
                          styles.refundStepBtnText,
                          (selectedQty <= 0 || isFullyRefunded) && styles.refundStepBtnTextDisabled,
                        ]}
                      >
                        −
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.refundQtyBox}>
                      <Text style={styles.refundQtyBoxText}>{selectedQty}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.refundStepBtn,
                        (atMax || isFullyRefunded) && styles.refundStepBtnDisabled,
                      ]}
                      onPress={() => adjustQty(item.id, item.availableQty, 1)}
                      disabled={atMax || isFullyRefunded}
                    >
                      <Text
                        style={[
                          styles.refundStepBtnText,
                          (atMax || isFullyRefunded) && styles.refundStepBtnTextDisabled,
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.refundItemAmount}>
                    {"\u20B9"}{money(selectedQty * item.rate)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Footer sits in its own bottom-safe-area wrapper so the Confirm
            button clears the home indicator / nav gesture bar on devices
            that need it, instead of relying on the top-only SafeAreaView
            that used to wrap the whole screen. */}
        <SafeAreaView edges={["bottom", "left", "right"]} style={styles.refundFooterSafe}>
          <View style={styles.refundFooterBar}>
            <View>
              <Text style={styles.refundTotalLabel}>Refund Total</Text>
              <Text style={styles.refundTotalValue}>{"\u20B9"}{money(totalRefund)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.refundConfirmBtn,
                (selectedItems.length === 0 || submitting) && styles.refundConfirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedItems.length === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.refundConfirmBtnText}>Confirm Refund</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Order detail panel ───────────────────────────────────────────────────

function OrderDetail({ order, payments, paymentsLoading, paymentsError, onRetryPayments, returns, onRefundSuccess }) {
  const [tab, setTab] = useState("overview");
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { company, user } = useAuth();

  if (!order) {
    return (
      <View style={styles.emptyDetail}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyDetailText}>Select an order to view details</Text>
      </View>
    );
  }

  const orderPayments = (payments || [])
    .filter((p) => {
      if (!order) return false;

      return (p.allocations || []).some(
        (allocation) =>
          String(allocation.sale_order_id || "") === String(order.id) ||
          (
            allocation.invoice_no &&
            order.invoiceNo &&
            allocation.invoice_no === order.invoiceNo
          )
      );
    })
    .sort(
      (a, b) =>
        new Date(b.date || 0) - new Date(a.date || 0)
    );

  const orderReturns = (returns || [])
    .filter((r) => returnBelongsToOrder(r, order))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const isCalculatorOrder =
    order.items?.length > 0 &&
    order.items.every((item) => item.isCalculatorItem);

  // Has every item on this order already been fully refunded? If so there's
  // nothing left to refund at all, regardless of paid amount.
  const fullyRefunded =
    order.items.length > 0 &&
    order.items.every((it) => {
      const key = it.product_id || it.name;
      const refundedQty = orderReturns.reduce((sum, ret) => {
        return (
          sum +
          (ret.details || [])
            .filter((d) => (d.product_id || d.name) === key)
            .reduce((s, d) => s + (Number(d.qty) || 0), 0)
        );
      }, 0);
      return refundedQty >= it.qty;
    });

  const handlePrint = () => {
    if (printing) return;

    Alert.alert(
      "Confirm Print",
      `Do you want to print invoice ${order.invoiceNo}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Print",
          onPress: async () => {
            setPrinting(true);

            try {
              const receipt = buildReceiptFromOrder(order, company, user);

              console.log(
                "ORDERS SCREEN RECEIPT:",
                JSON.stringify(receipt, null, 2)
              );

              const outcome = await printReceipt(receipt);

              if (!outcome?.success) {
                Alert.alert(
                  "Print Failed",
                  outcome?.error?.message ||
                    "Unable to print this invoice."
                );
              }
            } catch (err) {
              Alert.alert(
                "Print Failed",
                err?.message ||
                  "Unable to print this invoice."
              );
            } finally {
              setPrinting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const receipt = buildReceiptFromOrder(order, company, user);
      const isNarrow = receipt.receipt_size === "58mm";
      const pageWidthMm = isNarrow ? 58 : 80;

      const itemsRows = receipt.items
        .map(
          (it) => `
        <tr>
          <td class="name" colspan="4">${it.name}</td>
        </tr>
        <tr>
          <td class="qty">${it.qty} x ${money(it.rate)}</td>
          <td class="amt" colspan="3">${"\u20B9"}${money(it.amount)}</td>
        </tr>
      `
        )
        .join("");

      const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${pageWidthMm}mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${pageWidthMm}mm;
            margin: 0 auto;
            padding: 8px 10px 16px;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .company {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
          }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; font-size: 11.5px; vertical-align: top; }
          td.name { font-weight: 700; padding-top: 6px; }
          td.qty { color: #333; }
          td.amt { text-align: right; }
          .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 2px 0;
          }
          .grand-total {
            font-size: 14px;
            font-weight: 700;
          }
          .footer {
            margin-top: 14px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="center company">${receipt.companyName}</div>
        <div class="center" style="font-size:11px; margin-top:2px;">
          Cashier: ${receipt.cashierName}
        </div>

        <div class="divider"></div>

        <div class="meta-row"><span>Invoice</span><span class="bold">${receipt.invoiceNo}</span></div>
        <div class="meta-row"><span>Date</span><span>${formatDate(receipt.invoiceDate)}</span></div>
        <div class="meta-row"><span>Customer</span><span>${receipt.customerName}</span></div>
        ${receipt.paymentMode ? `<div class="meta-row"><span>Payment</span><span>${receipt.paymentMode}</span></div>` : ""}

        <div class="divider"></div>

        <table>
          ${itemsRows}
        </table>

        <div class="divider"></div>

        <div class="totals-row"><span>Subtotal</span><span>${"\u20B9"}${money(receipt.subtotal)}</span></div>
        ${
          receipt.totalDiscount > 0
            ? `<div class="totals-row"><span>Discount</span><span>-${"\u20B9"}${money(receipt.totalDiscount)}</span></div>`
            : ""
        }
        ${
          receipt.totalTax > 0
            ? `<div class="totals-row"><span>Tax</span><span>${"\u20B9"}${money(receipt.totalTax)}</span></div>`
            : ""
        }

        <div class="divider"></div>

        <div class="totals-row grand-total"><span>TOTAL</span><span>${"\u20B9"}${money(receipt.grandTotal)}</span></div>
        <div class="totals-row"><span>Paid</span><span>${"\u20B9"}${money(receipt.amountReceived)}</span></div>
        <div class="totals-row"><span>Pending</span><span>${"\u20B9"}${money(order.pendingAmount)}</span></div>

        <div class="divider"></div>

        <div class="center footer">Thank you for your business!</div>
      </body>
      </html>
    `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      Alert.alert("Share Failed", err.message);
    }
  };

  const handleGenerateInvoice = () =>
    Alert.alert("Generate Invoice", `Generate invoice for ${order.invoiceNo} (coming soon).`);

  const handleOpenRefundModal = () => {
    if (order.paidAmount <= 0) {
      Alert.alert("Not allowed", "Nothing has been collected on this invoice yet — there's nothing to refund.");
      return;
    }
    if (fullyRefunded) {
      Alert.alert("Already refunded", "Every item on this invoice has already been fully refunded.");
      return;
    }
    setRefundModalVisible(true);
  };

  const handleConfirmRefund = async ({ details, total_amount, reason }) => {
    try {
      setRefunding(true);
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        sales_id: order.id,
        total_amount,
        details,
        reason,
      };
      if (order.customer_id) {
        payload.client_id = order.customer_id;
      }
      await API.post("/sales-return", payload, { headers });
      setRefundModalVisible(false);
      Alert.alert("Refund Recorded", `Refund for ${order.invoiceNo} has been recorded.`);
      onRefundSuccess && onRefundSuccess();
    } catch (err) {
      Alert.alert(
        "Refund Failed",
        err?.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setRefunding(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Invoice",
      `Are you sure you want to delete ${order.invoiceNo}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              const headers = token
                ? { Authorization: `Bearer ${token}` }
                : {};

              await API.delete(`/sales/${order.id}`, {
                headers,
              });

              Alert.alert("Success", "Invoice deleted successfully.");

              onRefundSuccess?.(); // Refresh orders list
            } catch (err) {
              Alert.alert(
                "Delete Failed",
                err?.response?.data?.message || "Unable to delete invoice."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.detailWrap}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === "overview" && styles.tabBtnActive,
          ]}
          onPress={() => setTab("overview")}
        >
          <Text style={[styles.tabText, tab === "overview" && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === "payment-recieved" && styles.tabBtnActive,
          ]}
          onPress={() => setTab("payment-recieved")}
        >
          <Text style={[styles.tabText, tab === "payment-recieved" && styles.tabTextActive]}>
            Payment Received
          </Text>
        </TouchableOpacity>
        {!isCalculatorOrder && (
          <TouchableOpacity
            style={[
              styles.tabBtn,
              tab === "refunds" && styles.tabBtnActive,
            ]}
            onPress={() => setTab("refunds")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "refunds" && styles.tabTextActive,
              ]}
            >
              Refunds{orderReturns.length > 0 ? ` (${orderReturns.length})` : ""}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" ? (
          <>
            {/* Header */}
            <View style={styles.detailHeaderRow}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.detailOrderId}>{order.invoiceNo}</Text>
                <Text style={styles.detailCustomer}>{order.customer}</Text>
                {order.companyName && order.companyName !== "Walk-in" && (
                  <Text style={styles.detailCompany}>{order.companyName}</Text>
                )}
              </View>
              <View style={styles.detailHeaderRight}>
                <Text style={styles.detailAmount}>
                  {"\u20B9"}{money(order.total)}
                </Text>
                <Text style={styles.detailDate}>{formatDate(order.date)}</Text>
              </View>
            </View>

            {/* Pending Amount callout. Return Amount is intentionally not
                shown here anymore — it already has its own dedicated
                "Refunds" tab above, so surfacing it a second time here was
                redundant. */}
            {order.pendingAmount > 0 && (
              <View style={styles.calloutRow}>
                <View style={[styles.calloutBox, styles.calloutBoxDanger]}>
                  <Text style={styles.calloutLabel}>Pending Amount</Text>
                  <Text style={[styles.calloutValue, { color: "#DC2626" }]}>
                    {"\u20B9"}{money(order.pendingAmount)}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Item Summary (new table) ── */}
            <Text style={styles.sectionHeading}>Item Summary</Text>
            <View style={styles.itemTableCard}>
              <ItemTable items={order.items} />
            </View>

            {/* Sales Summary */}
            <Text style={styles.sectionHeading}>Sales Summary</Text>
            <View style={styles.card}>
              <View style={styles.salesSummaryRow}>
                <Text style={styles.salesSummaryLabel}>Sub Total</Text>
                <Text style={styles.salesSummaryValue}>
                  {"\u20B9"}{money(order.subTotal)}
                </Text>
              </View>
              {order.discount > 0 && (
                <View style={styles.salesSummaryRow}>
                  <Text style={styles.salesSummaryLabel}>Discount</Text>
                  <Text style={[styles.salesSummaryValue, styles.discountValue]}>
                    {"\u2212\u20B9"}{money(order.discount)}
                  </Text>
                </View>
              )}
              {order.tax > 0 && (
                <View style={styles.salesSummaryRow}>
                  <Text style={styles.salesSummaryLabel}>Tax</Text>
                  <Text style={styles.salesSummaryValue}>
                    {"\u20B9"}{money(order.tax)}
                  </Text>
                </View>
              )}
              <View style={[styles.salesSummaryRow, styles.salesSummaryTotalRow]}>
                <Text style={styles.salesSummaryTotalLabel}>Grand Total</Text>
                <Text style={styles.salesSummaryTotalValue}>
                  {"\u20B9"}{money(order.grandTotal)}
                </Text>
              </View>
              <View style={styles.salesSummaryRow}>
                <Text style={styles.salesSummaryLabel}>Paid Amount</Text>
                <Text style={[styles.salesSummaryValue, { color: "#16A34A" }]}>
                  {"\u20B9"}{money(order.paidAmount)}
                </Text>
              </View>
              <View style={[styles.salesSummaryRow, { paddingBottom: 0 }]}>
                <Text style={styles.salesSummaryLabel}>Pending Amount</Text>
                <Text style={[styles.salesSummaryValue, { color: "#DC2626" }]}>
                  {"\u20B9"}{money(order.pendingAmount)}
                </Text>
              </View>
            </View>
          </>
        ) : tab === "payment-recieved" ? (
          <View style={styles.paymentsWrap}>
            {paymentsLoading ? (
              <View style={styles.paymentsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.paymentsLoadingText}>Loading payments…</Text>
              </View>
            ) : paymentsError ? (
              <View style={styles.paymentsLoading}>
                <Text style={styles.paymentsErrorText}>{paymentsError}</Text>
                <TouchableOpacity style={styles.retryBtnSmall} onPress={onRetryPayments}>
                  <Text style={styles.retryBtnSmallText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : orderPayments.length === 0 ? (
              <View style={styles.invoicePlaceholder}>
                <MaterialCommunityIcons name="cash-remove" size={48} color={colors.textMuted} />
                <Text style={styles.invoicePlaceholderText}>No payments recorded.</Text>
              </View>
            ) : (
              <View>
                {orderPayments.map((p, idx) => (
                  <View
                    key={p.id}
                    style={[
                      styles.entryRow,
                      idx === orderPayments.length - 1 && styles.entryRowLast,
                    ]}
                  >
                    <View style={styles.entryTopLine}>
                      <Text style={styles.entryDate}>{formatDate(p.date)}</Text>
                      <Text style={styles.entryAmount}>
                        {"\u20B9"}
                        {money(
                          (p.allocations || [])
                            .filter(
                              (allocation) =>
                                String(allocation.sale_order_id || "") === String(order.id) ||
                                (
                                  allocation.invoice_no &&
                                  order.invoiceNo &&
                                  allocation.invoice_no === order.invoiceNo
                                )
                            )
                            .reduce(
                              (sum, allocation) =>
                                sum + Number(allocation.amount || 0),
                              0
                            )
                        )}
                      </Text>
                    </View>
                    <View style={styles.entryBottomLine}>
                      <Text style={styles.entrySubLeft} numberOfLines={1}>
                        Ref. No: {p.receiptNo}
                      </Text>
                      <Text style={styles.entrySubRight}>{p.method}</Text>
                    </View>
                    {p.remarks && p.remarks !== "-" ? (
                      <Text style={styles.itemDescription}>{p.remarks}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.paymentsWrap}>
            {orderReturns.length === 0 ? (
              <View style={styles.invoicePlaceholder}>
                <MaterialCommunityIcons name="cash-refund" size={48} color={colors.textMuted} />
                <Text style={styles.invoicePlaceholderText}>No refunds recorded.</Text>
              </View>
            ) : (
              orderReturns.map((ret, idx) => (
                <View
                  key={ret.id}
                  style={[
                    styles.entryRow,
                    idx === orderReturns.length - 1 && styles.entryRowLast,
                  ]}
                >
                  <View style={styles.entryTopLine}>
                    <Text style={styles.entryDate}>{formatDate(ret.date)}</Text>
                    <Text style={[styles.entryAmount, { color: "#DC2626" }]}>
                      {"\u2212\u20B9"}{money(ret.total)}
                    </Text>
                  </View>
                  <View style={styles.entryBottomLine}>
                    <Text style={styles.entrySubLeft} numberOfLines={1}>
                      Return No: {ret.returnNo}
                    </Text>
                  </View>
                  {ret.reason ? (
                    <Text style={styles.itemDescription}>{ret.reason}</Text>
                  ) : null}

                  {ret.details.map((d) => (
                    <View key={d.id} style={styles.refundHistoryLine}>
                      <Text style={styles.refundHistoryLineName} numberOfLines={1}>
                        {d.name} × {d.qty}
                      </Text>
                      <Text style={styles.refundHistoryLineAmount}>
                        {"\u20B9"}{money(d.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.footerMoreBtn} onPress={() => setMoreMenuVisible(true)}>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.textSecondary} />
          <Text style={styles.footerMoreText}>More</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerTextBtn, printing && { opacity: 0.6 }]}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.footerTextBtnLabel}>Print</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTextBtn} onPress={handleShare}>
          <Text style={styles.footerTextBtnLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      <MoreMenuModal
        visible={moreMenuVisible}
        onClose={() => setMoreMenuVisible(false)}
        onRefund={handleOpenRefundModal}
        onDelete={handleDelete}
        hideRefund={isCalculatorOrder}
      />

      <RefundItemsModal
        visible={refundModalVisible}
        order={order}
        returns={orderReturns}
        onClose={() => setRefundModalVisible(false)}
        onConfirm={handleConfirmRefund}
        submitting={refunding}
      />
    </View>
  );
}

// ─── OrdersScreen ──────────────────────────────────────────────────────────

// Cache keys — bump these if the shape of what you store ever changes, so
// old cached payloads from a previous app version don't get force-fed into
// new state shapes.
const CACHE_KEYS = {
  orders: "orders:list:v1",
  payments: "payments:list:v1",
};

// How many order rows to render up front, and how many more to reveal each
// time the user scrolls near the bottom. This is on top of SectionList's
// own virtualization (which only mounts what's on/near screen) — together
// they mean opening the screen never has to lay out the full history at
// once, and scrolling pulls in more a chunk at a time.
const PAGE_SIZE = 40;

export default function OrdersScreen({ onBack = () => {}, onMenuPress = () => {} }) {
  // ── Order list date filter (null = show all dates) ─────────────────
  // Completely independent from the Daily Sales Summary date below.
  const [listDate, setListDate] = useState(() => new Date());

  // ── Daily Sales Summary date (independent of the order list) ───────
  const [summaryDate, setSummaryDate] = useState(() => new Date());
  const [dailySummaryVisible, setDailySummaryVisible] = useState(false);

  // ── Shared calendar popup ──────────────────────────────────────────
  // pickerTarget decides which filter the popup edits: "list" | "summary"
  const [pickerTarget, setPickerTarget] = useState("list");
  const [summaryPickerVisible, setSummaryPickerVisible] = useState(false);
  const [summaryPickerMonth, setSummaryPickerMonth] = useState(() => new Date());

  // ── Side panel animation ───────────────────────────────────────────
  const SUMMARY_PANEL_WIDTH = 380;
  const summaryPanelAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown

  useEffect(() => {
    Animated.timing(summaryPanelAnim, {
      toValue: dailySummaryVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [dailySummaryVisible]);

  const summaryPanelTranslateX = summaryPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SUMMARY_PANEL_WIDTH, 0],
  });

  const [orders, setOrders] = useState(
    () => getCachedSync(CACHE_KEYS.orders)?.data?.orders || []
  );
  const [ordersLoading, setOrdersLoading] = useState(
    () => !getCachedSync(CACHE_KEYS.orders)?.data
  );
  // Drives ONLY the native pull-to-refresh spinner. Deliberately separate
  // from the automatic background sync below — that one should stay
  // invisible since cached data is already on screen. This only flips on
  // when the user physically pulls the list down themselves.
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  const [payments, setPayments] = useState(
    () => getCachedSync(CACHE_KEYS.payments)?.data || []
  );
  const [paymentsLoading, setPaymentsLoading] = useState(
    () => !getCachedSync(CACHE_KEYS.payments)?.data
  );
  const [paymentsError, setPaymentsError] = useState(null);

  const [returns, setReturns] = useState(
    () => getCachedSync(CACHE_KEYS.orders)?.data?.returns || []
  );

  const [search, setSearch] = useState("");
  const [activeOrderId, setActiveOrderId] = useState(
    () => getCachedSync(CACHE_KEYS.orders)?.data?.orders?.[0]?.id || null
  );

  // How many (already-fetched) orders are currently allowed to render.
  // Grows as the user scrolls to the end of the list (see handleLoadMore).
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const searchInputRef = useRef(null);

  // `silent` = true means "I already have something on screen (from cache
  // or a previous fetch) — refresh quietly without flashing the big
  // full-pane spinner." The list stays interactive the whole time.
  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setOrdersLoading(true);
    }
    setOrdersError(null);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const salesRes = await API.get("/sales", { headers });

      const salesData = salesRes.data.data || salesRes.data || [];
      const returnsData = [];
      const mappedReturns = returnsData.map(mapReturnRecord);
      const returnsBySalesId = {};
      returnsData.forEach((ret) => {
        const sid = (ret.sales_id && ret.sales_id._id) || ret.sales_id || "";
        if (!sid) return;
        returnsBySalesId[sid] =
          (returnsBySalesId[sid] || 0) + (Number(ret.total_amount) || 0);
      });
      const mapped = salesData
        .map((inv) => mapInvoice(inv, returnsBySalesId))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      setOrders(mapped);
      setReturns(mappedReturns);
      setActiveOrderId((prev) => prev || (mapped[0] ? mapped[0].id : null));
      setVisibleCount(PAGE_SIZE);

      // Persist for next time the screen opens — next visit paints
      // instantly from this instead of showing a blank loader.
      setCached(CACHE_KEYS.orders, { orders: mapped, returns: mappedReturns });
    } catch (err) {
      setOrdersError(
        err?.response?.data?.message || "Failed to load orders. Please try again."
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Wrapper used ONLY by the SectionList's pull-to-refresh gesture. This is
  // the one place `pullRefreshing` gets set — the automatic background sync
  // on mount calls fetchOrders directly and never touches this, so it never
  // pops the spinner on its own.
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await fetchOrders({ silent: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchOrders]);

  const fetchPayments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await API.get("/payments", { headers });
      const data = res.data.data || res.data || [];
      const mapped = data.map(mapPayment);
      setPayments(mapped);
      setCached(CACHE_KEYS.payments, mapped);
    } catch (err) {
      setPaymentsError(
        err?.response?.data?.message || "Failed to load payments. Please try again."
      );
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Mount effect — runs once per mount.
  //
  // If the lazy initializers above already found data in the in-memory
  // cache (screen was visited earlier this session), `orders`/`payments`
  // are non-empty on this very first render, so we skip the async disk
  // read entirely and go straight to a SILENT background refresh — the
  // user sees their data immediately with zero loading state.
  //
  // Only on a genuinely cold start (in-memory cache empty) do we fall back
  // to the async, disk-backed getCached() the way the original version
  // always did, and only then decide whether the subsequent fetch should
  // be silent or show the full-pane spinner.
  useEffect(() => {
    let active = true;

    (async () => {
      if (orders.length > 0) {
        fetchOrders({ silent: true });
      } else {
        const cachedOrders = await getCached(CACHE_KEYS.orders);
        if (active && cachedOrders?.data) {
          setOrders(cachedOrders.data.orders || []);
          setReturns(cachedOrders.data.returns || []);
          setActiveOrderId(
            (prev) => prev || (cachedOrders.data.orders?.[0]?.id ?? null)
          );
          setOrdersLoading(false);
        }
        fetchOrders({ silent: !!cachedOrders?.data });
      }

      if (payments.length > 0) {
        fetchPayments({ silent: true });
      } else {
        const cachedPayments = await getCached(CACHE_KEYS.payments);
        if (active && cachedPayments?.data) {
          setPayments(cachedPayments.data);
          setPaymentsLoading(false);
        }
        fetchPayments({ silent: !!cachedPayments?.data });
      }
    })();

    return () => {
      active = false;
    };
    // Intentionally only on mount: `orders`/`payments` are read here only
    // to decide the very first fetch's silent/loud behavior, not to
    // re-trigger this effect as they change afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Order list filter — uses `listDate` (NOT summaryDate). When listDate is
  // null, all dates are shown.
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedDateKey = listDate ? dateKey(listDate) : "";

    return orders.filter((o) => {
      // Date filter
      if (selectedDateKey && dateKey(o.date) !== selectedDateKey) {
        return false;
      }

      // Search filter
      if (!q) return true;

      return (
        (o.invoiceNo || "").toLowerCase().includes(q) ||
        (o.customer || "").toLowerCase().includes(q) ||
        (o.companyName || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, listDate]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, listDate]);

  useEffect(() => {
    if (
      activeOrderId &&
      !filteredOrders.some((o) => o.id === activeOrderId)
    ) {
      setActiveOrderId(null);
    }
  }, [filteredOrders, activeOrderId]);

  const pagedOrders = useMemo(
    () => filteredOrders.slice(0, visibleCount),
    [filteredOrders, visibleCount]
  );
  const hasMoreOrders = visibleCount < filteredOrders.length;

  const handleLoadMoreOrders = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredOrders.length));
  }, [filteredOrders.length]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    pagedOrders.forEach((order) => {
      if (!groups[order.dateGroup]) groups[order.dateGroup] = [];
      groups[order.dateGroup].push(order);
    });
    return groups;
  }, [pagedOrders]);

  // pagedOrders is already sorted newest-first, so the date-group keys are
  // discovered in that same newest-first order as we iterate — no need for
  // a fixed GROUP_ORDER list like the old TODAY/YESTERDAY/OLDER buckets.
  const groupLabels = useMemo(
    () => Object.keys(groupedOrders),
    [groupedOrders]
  );

  const orderSections = useMemo(
    () => groupLabels.map((label) => ({ title: label, data: groupedOrders[label] })),
    [groupLabels, groupedOrders]
  );

  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;

  // ── Stable SectionList render callbacks ────────────────────────────────
  // These are memoized so their identity only changes when something they
  // actually depend on changes. Combined with OrderListRow being
  // React.memo'd, this stops every mounted row from re-rendering on
  // unrelated state changes (typing in search, payments finishing a
  // background fetch, etc.) — that's what was behind the
  // "VirtualizedList: You have a large list that is slow to update"
  // warning.
  const handleSelectOrder = useCallback((id) => {
    setActiveOrderId(id);
  }, []);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderOrderItem = useCallback(
    ({ item }) => (
      <OrderListRow
        order={item}
        isActive={item.id === activeOrderId}
        onPress={() => handleSelectOrder(item.id)}
      />
    ),
    [activeOrderId, handleSelectOrder]
  );

  const renderSectionHeader = useCallback(
    ({ section: { title } }) => <Text style={styles.groupLabel}>{title}</Text>,
    []
  );

  // Item-wise (not invoice-wise) rows for the selected SUMMARY date, built
  // purely from the already-loaded `orders` array — no second data source.
  // Uses `summaryDate`, so it is unaffected by the order list's filter.
  const dailySummaryItems = useMemo(() => {
    const key = dateKey(summaryDate);
    const rows = [];

    orders.forEach((order) => {
      if (dateKey(order.date) !== key) return;

      (order.items || []).forEach((it) => {
        const qty = Number(it.qty || 0);
        const rate = Number(it.rate || 0);
        const amount = Number(it.amount) || qty * rate;

        rows.push({
          id: `${order.id}-${it.id}`,

          // IMPORTANT:
          // Send this to Sunmi so it knows whether this is
          // a calculator item or a normal product.
          isCalculatorItem: !!it.isCalculatorItem,

          // Keep the display name
          name: it.name,

          // Keep the actual product name separately
          product_name:
            it.product_name ||
            it.name ||
            it.product ||
            "",

          qty,
          rate,
          amount,
        });
      });
    });

    return rows;
  }, [orders, summaryDate]);

  const dailySummaryTotals = useMemo(
    () =>
      dailySummaryItems.reduce(
        (acc, it) => {
          acc.totalItems += it.qty;
          acc.totalSales += it.amount;
          return acc;
        },
        { totalItems: 0, totalSales: 0 }
      ),
    [dailySummaryItems]
  );

  const handlePrintDailySummary = () => {
    if (dailySummaryItems.length === 0) {
      Alert.alert(
        "No Sales",
        "There are no sales to print for this date."
      );
      return;
    }

    Alert.alert(
      "Confirm Print",
      `Print Daily Sales Summary for ${formatDateLong(summaryDate)}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Print",
          onPress: async () => {
            try {
              console.log(
                "========== PRINT DAILY SALES SUMMARY =========="
              );

              console.log("DATE:", dateKey(summaryDate));
              console.log("ITEMS:", dailySummaryItems);
              console.log("TOTALS:", dailySummaryTotals);

              const result = await printDailySalesSummary({
                date: dateKey(summaryDate),
                items: dailySummaryItems,
                totalItems: dailySummaryTotals.totalItems,
                totalSales: dailySummaryTotals.totalSales,
              });

              console.log("DAILY SUMMARY PRINT RESULT:", result);

              if (!result?.success) {
                Alert.alert(
                  "Print Failed",
                  result?.error?.message ||
                    "Unable to print daily sales summary."
                );
              }
            } catch (error) {
              console.log("DAILY SUMMARY PRINT ERROR:", error);

              Alert.alert(
                "Print Failed",
                error?.message ||
                  "Unable to print daily sales summary."
              );
            }
          },
        },
      ]
    );
  };

  // Opens the shared calendar for either the order list or the summary.
  const openPicker = (target) => {
    setPickerTarget(target);
    setSummaryPickerMonth(
      (target === "list" ? listDate : summaryDate) || new Date()
    );
    setSummaryPickerVisible(true);
  };

  const handleSelectPickerDate = (d) => {
    if (pickerTarget === "list") setListDate(d);
    else setSummaryDate(d);
    setSummaryPickerVisible(false);
  };

  // Which date the calendar should highlight as "selected"
  const pickerActiveDate = pickerTarget === "list" ? listDate : summaryDate;

  return (
    <View style={styles.screen}>
      <Header
        title="Orders"
        leftWidth={380}
        onMenuPress={onMenuPress}
        searchInputRef={searchInputRef}
        searchValue={search}
        onSearchChange={setSearch}
        hideScanner
        hideCustomer
        hideHeldCarts
        hideViewHeldCarts
        hideMore
        rightExtra={
          <TouchableOpacity
            style={styles.dailySummaryTriggerBtn}
            onPress={() => setDailySummaryVisible((v) => !v)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="calendar-text-outline" size={18} color={colors.white} />
            <Text style={styles.dailySummaryTriggerText}>Daily Summary</Text>
            <MaterialCommunityIcons
              name={dailySummaryVisible ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.white}
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        {/* Left pane */}
        <View style={styles.listPane}>
          {/* ── Order list date filter ── */}
          <View style={styles.listFilterBar}>
            <TouchableOpacity
              style={styles.listFilterChip}
              onPress={() => openPicker("list")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.listFilterText}>
                {listDate ? formatDateLong(listDate) : "All dates"}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setListDate(listDate ? null : new Date())}
              hitSlop={8}
            >
              <Text style={styles.listFilterAction}>{listDate ? "Show all" : "Today"}</Text>
            </TouchableOpacity>
          </View>

          {ordersLoading && orders.length === 0 ? (
            // First ever load, nothing cached yet — full-pane spinner.
            <View style={styles.emptyList}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.emptyListText, { marginTop: 10 }]}>Loading orders…</Text>
            </View>
          ) : ordersError && orders.length === 0 ? (
            // Failed with nothing to fall back on — show the retry state.
            <View style={styles.emptyList}>
              <Text style={styles.errorText}>{ordersError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchOrders()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* If a background refresh fails but we still have cached/
                  stale data on screen, don't blank the list — just show a
                  small inline notice above it. */}
              {ordersError ? (
                <View style={styles.inlineErrorBanner}>
                  <Text style={styles.inlineErrorBannerText} numberOfLines={2}>
                    {ordersError}
                  </Text>
                </View>
              ) : null}

              <SectionList
                sections={orderSections}
                keyExtractor={keyExtractor}
                renderItem={renderOrderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                // Virtualization: only rows near the visible area are
                // actually mounted, regardless of how many are in `data`.
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={10}
                removeClippedSubviews
                // Pagination on top of virtualization: reveal more of the
                // already-fetched order history in chunks as the user
                // nears the bottom, instead of laying every row out at once.
                onEndReached={handleLoadMoreOrders}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                  hasMoreOrders ? (
                    <View style={styles.loadMoreFooter}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>No orders found</Text>
                  </View>
                }
                // Pull-to-refresh manually re-hits the API and refreshes
                // the cache, in case the person wants the latest data
                // right now instead of waiting for the background fetch.
                refreshing={pullRefreshing}
                onRefresh={handlePullRefresh}
              />
            </>
          )}
        </View>

        {/* Right pane */}
        <View style={styles.detailPane}>
          <OrderDetail
            order={activeOrder}
            payments={payments}
            paymentsLoading={paymentsLoading}
            paymentsError={paymentsError}
            onRetryPayments={fetchPayments}
            returns={returns}
            onRefundSuccess={fetchOrders}
          />
        </View>
      </View>

      {/* ── Shared date picker (order list + daily summary) ── */}
      <Modal
        visible={summaryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSummaryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.summaryPickerOverlay}
          activeOpacity={1}
          onPress={() => setSummaryPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.summaryPickerCard}>
            <Text style={styles.summaryPickerTitle}>
              {pickerTarget === "list" ? "Filter orders by date" : "Daily summary date"}
            </Text>

            <View style={styles.summaryPickerHeader}>
              <TouchableOpacity
                hitSlop={8}
                onPress={() =>
                  setSummaryPickerMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.summaryPickerMonthLabel}>
                {summaryPickerMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={() =>
                  setSummaryPickerMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryPickerWeekRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <Text key={i} style={styles.summaryPickerWeekDay}>{d}</Text>
              ))}
            </View>

            <View style={styles.summaryPickerGrid}>
              {getCalendarCells(summaryPickerMonth).map((cell, idx) => {
                if (!cell) return <View key={idx} style={styles.summaryPickerCell} />;
                const isSelected =
                  !!pickerActiveDate && dateKey(cell) === dateKey(pickerActiveDate);
                const isToday = dateKey(cell) === dateKey(new Date());
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.summaryPickerCell, isSelected && styles.summaryPickerCellSelected]}
                    onPress={() => handleSelectPickerDate(cell)}
                  >
                    <Text
                      style={[
                        styles.summaryPickerCellText,
                        isToday && styles.summaryPickerCellTextToday,
                        isSelected && styles.summaryPickerCellTextSelected,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.summaryPickerTodayBtn}
              onPress={() => handleSelectPickerDate(new Date())}
            >
              <Text style={styles.summaryPickerTodayBtnText}>Today</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Daily Sales Summary side panel ── */}
      {dailySummaryVisible && (
        <TouchableOpacity
          style={styles.dailySummaryBackdrop}
          activeOpacity={1}
          onPress={() => setDailySummaryVisible(false)}
        />
      )}

      <Animated.View
        pointerEvents={dailySummaryVisible ? "auto" : "none"}
        style={[
          styles.dailySummaryPanel,
          { width: SUMMARY_PANEL_WIDTH, transform: [{ translateX: summaryPanelTranslateX }] },
        ]}
      >
        <SafeAreaView edges={["top", "right", "bottom"]} style={{ flex: 1 }}>
          <View style={styles.dailySummaryHeaderRow}>
            <Text style={styles.dailySummaryTitle}>Daily Sales Summary</Text>
            <TouchableOpacity onPress={() => setDailySummaryVisible(false)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dailySummaryDateRow}>
            <View style={styles.dailySummaryDateLeft}>
              <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.dailySummaryDateText}>{formatDateLong(summaryDate)}</Text>
            </View>
            <TouchableOpacity
              style={styles.dailySummaryChangeBtn}
              onPress={() => openPicker("summary")}
            >
              <Text style={styles.dailySummaryChangeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dailySummaryActionRow}>
            <TouchableOpacity
              style={styles.dailySummaryPrintBtn}
              onPress={handlePrintDailySummary}
            >
              <MaterialCommunityIcons name="printer-outline" size={17} color={colors.primary} />
              <Text style={styles.dailySummaryPrintBtnText}>Print</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.dailySummaryBody, { flex: 1 }]}>
            {dailySummaryItems.length === 0 ? (
              <Text style={styles.dailySummaryEmptyText}>No sales found for this date.</Text>
            ) : (
              <>
                <ScrollView
                  style={[styles.dailySummaryList, { maxHeight: undefined, flex: 1 }]}
                  showsVerticalScrollIndicator={false}
                >
                  {dailySummaryItems.map((it) => (
                    <View key={it.id} style={styles.dailySummaryItemRow}>
                      <Text style={styles.dailySummaryItemName} numberOfLines={1}>
                        {it.name}
                      </Text>
                      <View style={styles.dailySummaryItemBottomLine}>
                        <Text style={styles.dailySummaryItemQtyRate}>
                          {it.qty} × {"\u20B9"}{money(it.rate)}
                        </Text>
                        <Text style={styles.dailySummaryItemAmount}>
                          {"\u20B9"}{money(it.amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.dailySummaryTotalsBox}>
                  <View style={styles.dailySummaryTotalsRow}>
                    <Text style={styles.dailySummaryTotalsLabel}>TOTAL ITEMS</Text>
                    <Text style={styles.dailySummaryTotalsValue}>
                      {dailySummaryTotals.totalItems}
                    </Text>
                  </View>
                  <View style={styles.dailySummaryTotalsRow}>
                    <Text style={styles.dailySummaryTotalsLabel}>TOTAL SALES</Text>
                    <Text style={styles.dailySummaryTotalsValue}>
                      {"\u20B9"}{money(dailySummaryTotals.totalSales)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// ─── Column widths for item table ─────────────────────────────────────────
const COL = {
  item:  180,
  desc:  120,
  size:   70,
  num:    56,
  price:  90,
  total:  90,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.primaryDark,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerIconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.white },

  body: { flex: 1, flexDirection: "row" },

  // ── Left pane ───────────────────────────────────────────────────────
  listPane: {
    width: 380,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: spacing.md,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary },

  // ── Order list date filter bar (new) ──
  listFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },
  listFilterText: { fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  listFilterAction: { fontSize: 13.5, fontWeight: "700", color: colors.primary },

  groupLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary, // dark, not muted gray
    letterSpacing: 0.3,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9", // light gray band behind the date
  },
  listRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  listRowActive: { backgroundColor: colors.primarySoft },
  listRowTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRowId: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, flex: 1, paddingRight: 10 },
  listRowAmount: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  listRowBottomLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRowCustomer: { fontSize: 14.5, color: colors.textSecondary, flex: 1 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm || 8,
    borderWidth: 1,
  },
  statusChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText: { fontSize: 12.5, fontWeight: "700" },
  emptyList: { padding: spacing.xl, alignItems: "center" },
  emptyListText: { fontSize: 15, color: colors.textMuted },
  errorText: { fontSize: 15, color: "#DC2626", textAlign: "center", marginBottom: 14 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  retryBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  inlineErrorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  inlineErrorBannerText: { fontSize: 12.5, color: "#DC2626", fontWeight: "600" },
  loadMoreFooter: { paddingVertical: 18, alignItems: "center" },

  // ── Right pane ──────────────────────────────────────────────────────
  detailPane: { flex: 1 },
  detailWrap: { flex: 1 },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.xl,
  },
  tabBtn: {
    paddingVertical: 18,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: { fontSize: 16, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  detailScroll: { flex: 1 },
  detailContent: { padding: spacing.xl, paddingBottom: spacing.xl * 1.5 },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  detailHeaderRight: { alignItems: "flex-end" },
  detailOrderId: { fontSize: 24, fontWeight: "800", color: colors.textPrimary },
  detailCustomer: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },
  detailCompany: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  detailAmount: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  detailDate: { fontSize: 14, color: colors.textMuted, marginTop: 5 },
  statusPillRow: { flexDirection: "row", gap: 20, marginBottom: spacing.lg },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 9, height: 9, borderRadius: 4.5 },
  statusPillText: { fontSize: 15, fontWeight: "700" },
  calloutRow: { flexDirection: "row", gap: 14, marginBottom: spacing.lg },
  calloutBox: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  calloutBoxDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  calloutBoxWarn: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  calloutLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "700" },
  calloutValue: { fontSize: 19, fontWeight: "800", marginTop: 5 },
  sectionHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // ── Item table card wrapper ─────────────────────────────────────────
  itemTableCard: {
    borderRadius: radii.lg || 16,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },

  // ── Item table internals ────────────────────────────────────────────
  itHeader: {
    flexDirection: "row",
    backgroundColor: colors.primarySoft || "#EEF2FF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itHeaderCell: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  itRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },
  itRowAlt: { backgroundColor: "#FFFFFF" },
  itRowLast: { borderBottomWidth: 0 },
  itEmptyRow: { paddingVertical: 24, alignItems: "center" },
  itEmptyText: { fontSize: 15, color: colors.textMuted, fontStyle: "italic" },
  itCell: { fontSize: 15, color: colors.textPrimary },
  itRight: { textAlign: "right" },
  itCenter: { textAlign: "center" },
  itBold: { fontWeight: "700" },
  itMuted: { color: colors.textMuted },
  itItemName: { fontSize: 17, fontWeight: "700", color: colors.primary, lineHeight: 20 },
  itItemType: { fontSize: 16, color: colors.textMuted, marginTop: 2 },
  // Item Summary "Total" column amount — bumped up from the shared itCell
  // size (15) so the per-item total reads clearly at a glance.
  itAmountText: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  // flex column ratios — sum = ~10 units wide
  itColItem:  { flex: 2.5 },          // Item name + type
  itColDesc:  { flex: 1.5 },          // Description
  itColSize:  { flex: 0.8 },          // Size
  itColNum:   { flex: 0.6 },          // Bags / Units / Qty
  itColPrice: { flex: 1.1, textAlign: "right" },  // Unit Price
  itColTotal: { flex: 1.1, textAlign: "right" },  // Total

  // grand total strip
  itGrandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.divider,
    backgroundColor: "#F0F4F8",
  },
  itGrandTotalLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  itGrandTotalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  // ── Shared card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: radii.lg || 16,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs || 4,
  },
  itemSummaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: 4,
  },
  itemSummaryHeaderLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  itemRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8 },
  itemRowLast: { borderBottomWidth: 0, paddingBottom: 14 },
  itemRowTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemName: { fontSize: 16, fontWeight: "700", color: colors.primary, flex: 1, paddingRight: 12, lineHeight: 22 },
  itemAmount: { fontSize: 19, fontWeight: "800", color: colors.textPrimary },
  itemDescription: { fontSize: 13.5, color: colors.textMuted, fontStyle: "italic", lineHeight: 19 },
  itemMetaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  itemMetaPill: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.sm || 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  itemMetaText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },

  totalsLine: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 14,
    marginBottom: 4,
  },

  // ── Sales summary ───────────────────────────────────────────────────
  salesSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  salesSummaryLabel: { fontSize: 15, color: colors.textSecondary },
  salesSummaryValue: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  discountValue: { color: "#DC2626" },
  salesSummaryTotalRow: { borderTopWidth: 0, marginTop: 2, paddingVertical: 14, borderBottomColor: colors.divider },
  salesSummaryTotalLabel: { fontSize: 16.5, fontWeight: "800", color: colors.textPrimary },
  salesSummaryTotalValue: { fontSize: 19, fontWeight: "800", color: colors.primary },

  invoicePlaceholder: { alignItems: "center", paddingVertical: 80, gap: 14 },
  invoicePlaceholderText: { fontSize: 15.5, color: colors.textMuted },
  paymentsWrap: { flex: 1 },
  paymentsLoading: { alignItems: "center", paddingVertical: 60, gap: 14 },
  paymentsLoadingText: { fontSize: 15, color: colors.textMuted },
  paymentsErrorText: { fontSize: 15, color: "#DC2626", textAlign: "center" },
  retryBtnSmall: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: radii.md,
  },
  retryBtnSmallText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  paymentRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8 },

  emptyDetail: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyDetailText: { fontSize: 16, color: colors.textMuted },

  // ── Footer ──────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.lg,
  },
  footerMoreBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: "auto" },
  footerMoreText: { fontSize: 15.5, color: colors.textSecondary, fontWeight: "600" },
  footerTextBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  footerTextBtnLabel: { fontSize: 16, color: colors.primary, fontWeight: "700" },
  generateInvoiceBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  generateInvoiceText: { fontSize: 15, fontWeight: "700", color: colors.white },

  // ── More menu ────────────────────────────────────────────────────────
  moreMenuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  moreMenuSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg || 20,
    borderTopRightRadius: radii.lg || 20,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  moreMenuHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.divider,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
  },
  moreMenuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  moreMenuItemText: { fontSize: 16.5, fontWeight: "600", color: colors.textPrimary },

  refundHistoryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  refundHistoryLineName: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
    paddingRight: 10,
  },
  refundHistoryLineAmount: { fontSize: 17, fontWeight: "500", color: colors.textPrimary },

  refundScreenRoot: {
    flex: 1,
    backgroundColor: colors.white,
  },

  refundHeaderSafe: {
    backgroundColor: colors.primaryDark,
  },
  refundHeader: {
    height: 72,
    paddingTop: 8,
    backgroundColor: colors.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  refundHeaderIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  refundHeaderTitleWrap: { flex: 1 },
  refundHeaderTitle: { fontSize: 20, fontWeight: "700", color: colors.white },
  refundHeaderSubtitle: { fontSize: 13.5, color: colors.white, opacity: 0.75, marginTop: 2 },

  refundCenterCol: {
    flex: 1,
    // minHeight: 0 lets this flex:1 column actually shrink to the available
    // space instead of growing to fit its content — required for the
    // ScrollView inside it to receive a bounded height and scroll.
    minHeight: 0,
    width: "100%",
    maxWidth: REFUND_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  // The scrollable item list — takes remaining space, everything below it
  // (reason box, footer) stays fixed on screen.
  refundItemsScroll: {
    flex: 1,
    minHeight: 0,
  },
  refundItemsScrollContent: {
    paddingBottom: spacing.md,
    flexGrow: 1,
  },

  refundItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  refundItemRowDisabled: {
    opacity: 0.55,
  },
  refundItemName: { fontSize: 21, fontWeight: "700", color: colors.textPrimary },
  refundItemMeta: { fontSize: 18, color: colors.textMuted, marginTop: 3 },
  refundFullyBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.sm || 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  refundFullyBadgeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Qty stepper — matches the Manage Cart Item modal's Quantity control:
  // bordered square step buttons flanking a bordered number box.
  refundStepper: {
    flexDirection: "row",
    alignItems: "center",
  },
  refundStepBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  refundStepBtnDisabled: {
    borderColor: colors.divider,
  },
  refundStepBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.primary,
  },
  refundStepBtnTextDisabled: {
    color: colors.textMuted,
  },
  refundQtyBox: {
    minWidth: 48,
    height: 40,
    marginHorizontal: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  refundQtyBoxText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  refundItemAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    minWidth: 70,
    textAlign: "right",
  },

  // Fixed section below the scrollable list, still inside refundCenterCol
  refundReasonWrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  refundReasonLabel: { fontSize: 13.5, fontWeight: "700", color: colors.textMuted, marginBottom: 6 },
  refundReasonInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.textPrimary,
  },

  // Footer's own safe-area wrapper — keeps the Confirm button clear of the
  // home indicator / gesture bar on iOS and Android.
  refundFooterSafe: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.white,
  },
  refundFooterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: REFUND_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  refundTotalLabel: { fontSize: 19, color: colors.textMuted, fontWeight: "700" },
  refundTotalValue: { fontSize: 22, fontWeight: "800", color: "#DC2626", marginTop: 2 },
  refundConfirmBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radii.md,
    minWidth: 160,
    alignItems: "center",
  },
  refundConfirmBtnDisabled: { backgroundColor: colors.textMuted },
  refundConfirmBtnText: { color: colors.white, fontSize: 19, fontWeight: "700" },
  entryRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 6,
  },
  entryRowLast: { borderBottomWidth: 0 },
  entryTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDate: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  entryAmount: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  entryBottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entrySubLeft: { fontSize: 14.5, color: colors.textMuted, flex: 1, paddingRight: 10 },
  entrySubRight: { fontSize: 14.5, color: colors.textMuted },
  refundSelectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: spacing.md,
  },
  refundCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  refundCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  refundSelectAllText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  // ── Daily Sales Summary ─────────────────────────────────────────────
  dailySummaryCard: {
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.white,
    borderRadius: radii.lg || 16,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
  },
  dailySummaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dailySummaryTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  dailySummaryDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dailySummaryDateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dailySummaryDateText: { fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  dailySummaryChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm || 8,
    backgroundColor: colors.primarySoft || "#EEF2FF",
  },
  dailySummaryChangeBtnText: { fontSize: 12.5, fontWeight: "700", color: colors.primary },
  dailySummaryActionRow: { flexDirection: "row", gap: 10 },
  dailySummaryViewBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  dailySummaryViewBtnText: { fontSize: 13.5, fontWeight: "700", color: colors.white },
  dailySummaryPrintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dailySummaryPrintBtnText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
  dailySummaryBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dailySummaryEmptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
  dailySummaryList: { maxHeight: 260 },
  dailySummaryItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 3,
  },
  dailySummaryItemName: { fontSize: 13.5, fontWeight: "700", color: colors.textPrimary },
  dailySummaryItemBottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dailySummaryItemQtyRate: { fontSize: 12.5, color: colors.textMuted },
  dailySummaryItemAmount: { fontSize: 13.5, fontWeight: "800", color: colors.textPrimary },
  dailySummaryTotalsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.divider,
    gap: 4,
  },
  dailySummaryTotalsRow: { flexDirection: "row", justifyContent: "space-between" },
  dailySummaryTotalsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  dailySummaryTotalsValue: { fontSize: 14.5, fontWeight: "800", color: colors.primary },

  // ── Shared date picker modal ────────────────────────────────────────
  summaryPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPickerCard: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: radii.lg || 16,
    padding: spacing.lg,
  },
  summaryPickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 10,
  },
  summaryPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryPickerMonthLabel: { fontSize: 15.5, fontWeight: "700", color: colors.textPrimary },
  summaryPickerWeekRow: { flexDirection: "row", marginBottom: 4 },
  summaryPickerWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  summaryPickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  summaryPickerCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPickerCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  summaryPickerCellText: { fontSize: 14, color: colors.textPrimary },
  summaryPickerCellTextToday: { fontWeight: "800", color: colors.primary },
  summaryPickerCellTextSelected: { color: colors.white, fontWeight: "800" },
  summaryPickerTodayBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryPickerTodayBtnText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },

  // ── Header trigger button ──
  dailySummaryTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  dailySummaryTriggerText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },

  // ── Side panel — replaces the old Modal popover ─────────────────────
  dailySummaryBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 40,
  },
  dailySummaryPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: colors.white,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
});