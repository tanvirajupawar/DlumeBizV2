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
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./Colors";
import HeaderButton from "./HeaderButton";

// at/above this width, Amount and Date sit side by side
const WIDE_BREAKPOINT = 600;

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
 *
 * Layout: a slim info bar (customer + outstanding, shown once) and a single
 * compact form. The Receive button is pinned in a footer.
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
  const isWide = width >= WIDE_BREAKPOINT;

  // Track the keyboard ourselves: KeyboardAvoidingView is unreliable inside a
  // Modal (esp. Android), so we shrink the body by the keyboard height instead.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKbHeight(e?.endCoordinates?.height || 0)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
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
  const overLimit = validEntered > outstanding;
  const canSubmit = !loading && !fetching && validEntered > 0 && !overLimit;
  const isToday = isSameDay(date, new Date());

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#242E43" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive Payment</Text>
          {fetching ? (
            <View style={{ width: 24 }} />
          ) : (
            <HeaderButton
              title="Receive"
              onPress={handleSubmit}
              loading={loading}
              testID="customer-payment-receive-button"
            />
          )}
        </View>

        <View
          style={[
            styles.content,
            { paddingBottom: kbHeight > 0 ? kbHeight : insets.bottom },
          ]}
        >
          {fetching ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading account balance...</Text>
            </View>
          ) : (
            <>
              {/* Info bar: customer + outstanding, shown once */}
              <View style={styles.infoBar}>
                <View style={styles.infoLeft}>
                  <Text style={styles.infoName} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.infoLabel}>Outstanding</Text>
                  <Text
                    style={[
                      styles.infoAmount,
                      outstanding > 0 && { color: COLORS.danger },
                    ]}
                  >
                    {money(outstanding)}
                  </Text>
                </View>
                <View style={styles.infoDate}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabelNoMargin}>Payment Date</Text>
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
                    style={styles.selectBoxSm}
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
              </View>

              {/* Form */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.formContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.centerCol}>
                  {/* Row 1: Amount + Date */}
                  <View style={[styles.row, !isWide && styles.rowStack]}>
                    <View style={styles.colAmount}>
                      <Text style={styles.fieldLabel}>Amount Received</Text>
                      <View
                        style={[styles.amountBox, { borderColor: amountBorder }]}
                      >
                        <Text style={styles.rupeePrefix}>{"\u20B9"}</Text>
                        <TextInput
                          value={amount}
                          onChangeText={setAmount}
                          placeholder="0.00"
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
                          Cannot exceed outstanding amount.
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.colDate}>
                      <Text style={styles.fieldLabel}>Remarks</Text>
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

                  {/* Row 2: Method chips */}
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                    Payment Method
                  </Text>
                  <View style={styles.methodRow}>
                    {METHODS.map((m) => {
                      const active = method === m.key;
                      return (
                        <Pressable
                          key={m.key}
                          disabled={loading}
                          onPress={() => setMethod(m.key)}
                          style={[
                            styles.methodChip,
                            active && styles.methodChipActive,
                          ]}
                        >
                          <Ionicons
                            name={m.icon}
                            size={18}
                            color={active ? "#FFFFFF" : COLORS.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.methodText,
                              active && styles.methodTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {m.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                </View>
              </ScrollView>
            </>
          )}
        </View>

        {/* Date picker popup (same calendar as OrdersScreen) */}
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
          supportedOrientations={["portrait", "landscape"]}
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
  container: { flex: 1, backgroundColor: "#242E43" },
  content: { flex: 1, backgroundColor: "#FFFFFF" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 15 },

  // ── Header ──
  header: {
    height: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#242E43",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Info bar ──
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  infoLeft: { flex: 1, marginRight: 16 },
  infoName: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  infoLabel: { marginTop: 6, fontSize: 12, fontWeight: "600", color: "#64748B" },
  infoAmount: { marginTop: 1, fontSize: 24, fontWeight: "800", color: "#111827" },
  infoDate: { width: 230 },
  selectBoxSm: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: "#FFFFFF",
  },

  // ── Form ──
  formContent: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12 },
  centerCol: { width: "100%", maxWidth: 820, alignSelf: "center" },

  row: { flexDirection: "row", gap: 16 },
  rowStack: { flexDirection: "column", gap: 14 },
  colAmount: { flex: 1.2 },
  colDate: { flex: 1 },

  fieldLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldLabelNoMargin: { fontSize: 13, color: "#64748B", fontWeight: "700" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  link: { fontSize: 13, fontWeight: "700", color: "#2563EB" },

  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  rupeePrefix: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    paddingVertical: 8,
  },
  errorText: { marginTop: 6, fontSize: 12, color: "#DC2626" },

  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    backgroundColor: "#FFFFFF",
  },
  selectText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0F172A" },

  // ── Method chips ──
  methodRow: { flexDirection: "row", gap: 10 },
  methodChip: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
  },
  methodChipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  methodText: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  methodTextActive: { color: "#FFFFFF", fontWeight: "700" },

  remarksInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    textAlignVertical: "top",
  },

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