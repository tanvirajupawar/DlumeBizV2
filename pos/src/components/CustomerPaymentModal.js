// src/components/CustomerPaymentModal.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "./Colors";

// below this width (phones in portrait) the two panes stack vertically
const SPLIT_BREAKPOINT = 600;

const METHODS = [
  { key: "CASH", label: "Cash", icon: "cash-outline" },
  { key: "CARD", label: "Card", icon: "card-outline" },
  { key: "UPI", label: "UPI", icon: "phone-portrait-outline" },
  { key: "OTHER", label: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

const money = (v) =>
  "\u20B9" +
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (d) =>
  d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Local YYYY-MM-DD (avoids the UTC shift that toISOString() causes in IST)
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Sun-first month grid (nulls = leading blank cells) — same helper as OrdersScreen.
const getCalendarCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

/**
 * Receive-payment screen for a customer.
 *
 * Props:
 *  - visible   : boolean
 *  - customer  : customer object (uses customer.outstanding)
 *  - fetching  : boolean  still loading invoice data
 *  - loading   : boolean  submitting the payment
 *  - onClose   () => void
 *  - onSubmit  ({ amount, method, date, remarks }) => void
 *      date is a "YYYY-MM-DD" string (can be today or a back date)
 */
export default function CustomerPaymentModal({
  visible,
  customer,
  fetching = false,
  loading = false,
  onClose,
  onSubmit,
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSplit = width >= SPLIT_BREAKPOINT;

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [methodOpen, setMethodOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [remarks, setRemarks] = useState("");
  const [remarksFocused, setRemarksFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setMethod("CASH");
      setMethodOpen(false);
      setDate(new Date());
      setShowPicker(false);
      setRemarks("");
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
  const isToday = isSameDay(date, new Date());
  const selectedMethod = METHODS.find((m) => m.key === method) || METHODS[0];

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
    onSubmit?.({
      amount: validEntered,
      method,
      date: toYMD(date),
      remarks: remarks.trim(),
    });
  };

  const handleOpenPicker = () => {
    setPickerMonth(date);
    setShowPicker(true);
  };

  const handleDateSelect = (selected) => {
    setDate(selected);
    setShowPicker(false);
  };

  const nextMonthDisabled =
    new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1) >
    startOfDay(new Date());

  const amountBorder = overLimit
    ? COLORS.danger
    : focused
    ? COLORS.blue
    : COLORS.divider;

  /* ───────────── Summary pane ───────────── */
  const summaryPane = (
    <ScrollView
      style={[styles.pane, isSplit && styles.leftPane]}
      contentContainerStyle={styles.paneContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerCol}>
        <Text style={styles.sectionTitle}>Account Summary</Text>

        <View style={styles.listCard}>
          <View style={styles.heroBox}>
            <Text style={styles.heroLabel} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.heroSub}>Outstanding ({"\u20B9"})</Text>
            <Text
              style={[
                styles.heroAmount,
                outstanding > 0 && { color: COLORS.danger },
              ]}
            >
              {outstanding.toFixed(2)}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Receiving</Text>
            <Text style={styles.summaryValue}>{money(validEntered)}</Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.payableLabel}>Balance After Payment</Text>
            <Text style={styles.payableValue}>{money(balanceAfter)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  /* ───────────── Payment details pane ───────────── */
  const detailsPane = (
    <ScrollView
      style={styles.pane}
      contentContainerStyle={styles.paneContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerCol}>
        <Text style={styles.sectionTitle}>Payment Details</Text>

        <View style={styles.listCard}>
          {/* Amount */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Received</Text>
            <View
              style={[styles.amountInputRow, { borderBottomColor: amountBorder }]}
            >
              <Text style={styles.rupeePrefix}>{"\u20B9"}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                editable={!loading && !fetching}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={styles.amountInput}
              />
            </View>
            {overLimit ? (
              <Text style={styles.errorText}>
                Cannot exceed outstanding of {money(outstanding)}.
              </Text>
            ) : (
              <Text style={styles.helperText}>
                Maximum receivable: {money(outstanding)}
              </Text>
            )}
          </View>

          <View style={styles.rowDivider} />

          {/* Payment date */}
          <View style={styles.detailRow}>
            <View style={styles.labelRow}>
              <Text style={styles.detailLabelNoMargin}>Payment Date</Text>
              {!isToday ? (
                <Pressable
                  onPress={() => setDate(new Date())}
                  disabled={loading}
                  hitSlop={8}
                >
                  <Text style={styles.link}>Set to today</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={handleOpenPicker}
              disabled={loading || fetching}
              style={styles.selectBox}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.textSecondary}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.selectText}>
                {formatDate(date)}
                {isToday ? "  (Today)" : ""}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.rowDivider} />

          {/* Payment method dropdown */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>

            <Pressable
              onPress={() => setMethodOpen((o) => !o)}
              disabled={loading}
              style={[styles.selectBox, methodOpen && styles.selectBoxOpen]}
            >
              <Ionicons
                name={selectedMethod.icon}
                size={20}
                color={COLORS.textSecondary}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.selectText}>{selectedMethod.label}</Text>
              <Ionicons
                name={methodOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={COLORS.textSecondary}
              />
            </Pressable>

            {methodOpen ? (
              <View style={styles.dropdownList}>
                {METHODS.map((m, i) => {
                  const active = method === m.key;
                  return (
                    <React.Fragment key={m.key}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <Pressable
                        onPress={() => {
                          setMethod(m.key);
                          setMethodOpen(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          active && styles.dropdownItemActive,
                        ]}
                      >
                        <Ionicons
                          name={m.icon}
                          size={20}
                          color={active ? COLORS.blue : COLORS.textSecondary}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={[
                            styles.dropdownText,
                            active && styles.dropdownTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                        {active ? (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={COLORS.blue}
                          />
                        ) : null}
                      </Pressable>
                    </React.Fragment>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.rowDivider} />

          {/* Remarks */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Remarks</Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add a note (optional)"
              placeholderTextColor={COLORS.textMuted}
              editable={!loading && !fetching}
              multiline
              maxLength={250}
              onFocus={() => setRemarksFocused(true)}
              onBlur={() => setRemarksFocused(false)}
              style={[
                styles.remarksInput,
                remarksFocused && { borderColor: COLORS.blue },
              ]}
            />
          </View>
        </View>

        {/* Receive button */}
        <TouchableOpacity
          disabled={!canSubmit}
          style={[styles.continueButton, !canSubmit && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueText}>Receive Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#242E43" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Body */}
        <View
          style={[
            styles.content,
            isSplit && styles.bodySplit,
            { paddingBottom: insets.bottom },
          ]}
        >
          {fetching ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading account balance...</Text>
            </View>
          ) : isSplit ? (
            <>
              <View style={styles.half}>{summaryPane}</View>
              <View style={styles.half}>{detailsPane}</View>
            </>
          ) : (
            // phones in portrait: form first, summary below
            <>
              <View style={styles.stackedTop}>{detailsPane}</View>
              <View style={styles.stackedBottom}>{summaryPane}</View>
            </>
          )}
        </View>

        {/* Date picker popup (same calendar as OrdersScreen) */}
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowPicker(false)}
          >
            <Pressable style={styles.pickerCard} onPress={() => {}}>
              <View style={styles.pickerHeader}>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    setPickerMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                    )
                  }
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </Pressable>

                <Text style={styles.pickerMonthLabel}>
                  {pickerMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>

                <Pressable
                  hitSlop={8}
                  disabled={nextMonthDisabled}
                  onPress={() =>
                    setPickerMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                    )
                  }
                  style={nextMonthDisabled && styles.pickerNavDisabled}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </Pressable>
              </View>

              <View style={styles.pickerWeekRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Text key={i} style={styles.pickerWeekDay}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={styles.pickerGrid}>
                {getCalendarCells(pickerMonth).map((cell, idx) => {
                  if (!cell) {
                    return <View key={idx} style={styles.pickerCell} />;
                  }
                  const disabled = cell > startOfDay(new Date());
                  const isSelected = toYMD(cell) === toYMD(date);
                  const isTodayCell = toYMD(cell) === toYMD(new Date());
                  return (
                    <Pressable
                      key={idx}
                      disabled={disabled}
                      style={[
                        styles.pickerCell,
                        isSelected && styles.pickerCellSelected,
                      ]}
                      onPress={() => handleDateSelect(cell)}
                    >
                      <Text
                        style={[
                          styles.pickerCellText,
                          isTodayCell && styles.pickerCellTextToday,
                          disabled && styles.pickerCellTextDisabled,
                          isSelected && styles.pickerCellTextSelected,
                        ]}
                      >
                        {cell.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={styles.pickerTodayBtn}
                onPress={() => handleDateSelect(new Date())}
              >
                <Text style={styles.pickerTodayBtnText}>Today</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // dark background so the header color extends behind the status bar / notch
  container: { flex: 1, backgroundColor: "#242E43" },
  // white content area below the header (bottom inset added inline)
  content: { flex: 1, backgroundColor: "#FFFFFF" },
  bodySplit: { flexDirection: "row" },
  half: { flex: 1 },
  stackedTop: { flexShrink: 0 },
  stackedBottom: { flex: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 15 },

  // ── Header ──
  header: {
    height: 62,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#242E43",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },

  // ── Panes ──
  pane: { flex: 1 },
  leftPane: { borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  paneContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
  },
  centerCol: { width: "100%", maxWidth: 720, alignSelf: "center" },

  sectionTitle: {
    marginBottom: 12,
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 19,
  },

  // ── Cards ──
  listCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  rowDivider: { height: 1, backgroundColor: "#E2E8F0" },

  // ── Summary card ──
  heroBox: { paddingHorizontal: 20, paddingVertical: 18 },
  heroLabel: { color: "#0F172A", fontSize: 18, fontWeight: "700" },
  heroSub: { marginTop: 10, color: "#64748B", fontSize: 14 },
  heroAmount: {
    marginTop: 4,
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  summaryLabel: { fontSize: 16, color: "#64748B", fontWeight: "500" },
  summaryValue: { fontSize: 16, color: "#0F172A", fontWeight: "700" },
  payableLabel: { fontSize: 17, color: "#0F172A", fontWeight: "700" },
  payableValue: { fontSize: 18, color: "#16A34A", fontWeight: "800" },

  // ── Details card ──
  detailRow: { paddingHorizontal: 20, paddingVertical: 18 },
  detailLabel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 8,
  },
  detailLabelNoMargin: { fontSize: 15, color: "#64748B", fontWeight: "600" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  link: { fontSize: 14, fontWeight: "600", color: "#2563EB" },

  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
  },
  rupeePrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 4,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingVertical: 8,
  },
  helperText: { marginTop: 8, fontSize: 13, color: "#64748B" },
  errorText: { marginTop: 8, fontSize: 13, color: "#DC2626" },

  // ── Select / dropdown ──
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: "#FFFFFF",
  },
  selectBoxOpen: { borderColor: "#2563EB" },
  selectText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0F172A" },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 48,
  },
  dropdownItemActive: { backgroundColor: "#EFF6FF" },
  dropdownText: { flex: 1, fontSize: 16, color: "#0F172A" },
  dropdownTextActive: { color: "#2563EB", fontWeight: "700" },

  // ── Remarks ──
  remarksInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
    textAlignVertical: "top",
  },

  // ── Button ──
  continueButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },

  // ── Date picker popup ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCard: {
    width: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pickerNavDisabled: { opacity: 0.25 },
  pickerMonthLabel: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  pickerWeekRow: { flexDirection: "row", marginBottom: 4 },
  pickerWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  pickerCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCellSelected: { backgroundColor: "#2563EB", borderRadius: 999 },
  pickerCellText: { fontSize: 16, color: "#0F172A" },
  pickerCellTextToday: { fontWeight: "800", color: "#2563EB" },
  pickerCellTextDisabled: { color: "#94A3B8", opacity: 0.4 },
  pickerCellTextSelected: { color: "#FFFFFF", fontWeight: "800" },
  pickerTodayBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerTodayBtnText: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
});