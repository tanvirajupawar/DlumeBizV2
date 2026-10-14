import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getCreditSummary } from "../../api/invoice";
import { createSale } from "../../api/sale";
import { useAuth } from "../../context/AuthContext";
import { buildReceipt } from "../../utils/buildReceipt";

const SPLIT_BREAKPOINT = 600;
const MAX_CONTENT_WIDTH = 720;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fmt = (n) => `\u20B9${(Number(n) || 0).toFixed(2)}`;

const sanitizeDecimal = (text) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
};

export default function PaymentSummaryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSplit = width >= SPLIT_BREAKPOINT;
  const { user, company } = useAuth();

  const {
    cartItems = [],
    customer = null,
    subtotal = 0,
    tax = 0,
    discount = 0,
    grandTotal = 0,
    transportationDetails = "",
  } = route.params || {};

  const customerId = customer?._id || customer?.id || null;
  const isWalkIn = !customerId;
  const invoiceTotal = Number(grandTotal) || 0;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(!isWalkIn);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // null = pay in full (follows the total); string = typed / half
  const [customAmount, setCustomAmount] = useState(null);

  /* ───────────── discount ───────────── */
  const [discountMode, setDiscountMode] = useState("amount");
  const [discountInput, setDiscountInput] = useState(
    discount ? String(discount) : ""
  );
  const [discountCapped, setDiscountCapped] = useState(false);

  const rawDiscount = Number(discountInput) || 0;
  const discountValue = round2(
    discountMode === "percent"
      ? (invoiceTotal * Math.min(rawDiscount, 100)) / 100
      : Math.min(rawDiscount, invoiceTotal)
  );
  const discountedGrandTotal = Math.max(0, round2(invoiceTotal - discountValue));
  const hasDiscount = discountValue > 0;
  const discountPercentLabel =
    invoiceTotal > 0 ? round2((discountValue / invoiceTotal) * 100) : 0;

  const onChangeDiscount = (text) => {
    const value = sanitizeDecimal(text);
    const num = Number(value) || 0;
    const max = discountMode === "percent" ? 100 : invoiceTotal;
    if (num > max) {
      setDiscountInput(String(max));
      setDiscountCapped(true);
      return;
    }
    setDiscountCapped(false);
    setDiscountInput(value);
  };

  const switchMode = (mode) => {
    if (mode === discountMode) return;
    if (!hasDiscount) setDiscountInput("");
    else if (mode === "percent") setDiscountInput(String(discountPercentLabel));
    else setDiscountInput(String(discountValue));
    setDiscountCapped(false);
    setDiscountMode(mode);
  };

  /* ───────────── load credit summary (customers only) ───────────── */
  const firstLoad = useRef(true);

  useEffect(() => {
    if (isWalkIn) return;
    let cancelled = false;

    const timer = setTimeout(
      async () => {
        try {
          setRefreshing(true);
          const response = await getCreditSummary(customerId, discountedGrandTotal);
          if (cancelled) return;
          setSummary(response.data);
          setLoadError(false);
          setCustomAmount(null);
        } catch (error) {
          console.log("❌ CREDIT SUMMARY ERROR:", error?.response?.data || error.message);
          if (!cancelled) setLoadError(true);
        } finally {
          if (!cancelled) {
            setRefreshing(false);
            setLoading(false);
            firstLoad.current = false;
          }
        }
      },
      firstLoad.current ? 0 : 450
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerId, discountedGrandTotal, isWalkIn]);

  /* ───────────── payment maths ───────────── */
  const previousOutstanding = isWalkIn ? 0 : Number(summary?.previous_outstanding || 0);
  const totalPayable = isWalkIn ? discountedGrandTotal : Number(summary?.total_payable || 0);

  const amount = isWalkIn
    ? totalPayable
    : customAmount === null
    ? totalPayable
    : Number(customAmount) || 0;

  const remainingAmount = Math.max(0, round2(totalPayable - amount));
  const exceedsPayable = amount > totalPayable;
  const notReady = refreshing || loadError || (!isWalkIn && !summary);

  const canPay = !notReady && !savingOrder && amount > 0 && !exceedsPayable;
  const canCredit = !isWalkIn && !notReady && !savingOrder && totalPayable > 0;

  /* ───────────── actions ───────────── */
  const goToCheckout = () => {
    if (!canPay) return;
    navigation.navigate("Checkout", {
      cartItems,
      customer,
      subtotal,
      tax,
      discount: discountValue,
      discountedGrandTotal,
      previousOutstanding,
      totalPayable,
      paymentAmount: round2(amount),
      transportationDetails,
    });
  };

  const saveOrderOnCredit = async () => {
    if (savingOrder) return;
    try {
      setSavingOrder(true);

      const payload = {
        customer_id: customerId,
        source: "POS",
        sale_mode: "CALCULATOR",
        subtotal: Number(subtotal) || 0,
        discount_amount: discountValue,
        total_amount: discountedGrandTotal,
        transportation_details: transportationDetails,
        items: cartItems.map((item) => ({
          product_id: null,
          product_name: item.product || item.name || "",
          description: item.description || "",
          qty: Number(item.qty) || 0,
          rate: Number(item.price) || 0,
          amount: (Number(item.qty) || 0) * (Number(item.price) || 0),
          unit: item.unit || "PCS",
          hsn: "",
          gst_rate: 0,
        })),
      };

      const response = await createSale(payload);
      const sale = response.data || response;

      navigation.replace("POSPaymentSuccess", {
        saleId: sale._id || sale.sale_id,
        saleCompleted: sale,
        amount: 0,
        paymentMethod: "CREDIT",
        receipt: buildReceipt({
          company,
          user,
          customer,
          sale,
          cartItems,
          paymentMode: "Credit",
          transportationDetails,
          subtotal,
          discountValue,
          tax,
          invoiceAmount: discountedGrandTotal,
          previousOutstanding,
          totalPayable,
          amountPaid: 0,
        }),
      });
    } catch (error) {
      console.log("❌ SAVE CREDIT ORDER ERROR:", error?.response?.data || error);
      Alert.alert(
        "Unable to Save Order",
        error?.response?.data?.message || "Something went wrong while saving the order."
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const confirmCredit = () => {
    if (!canCredit) return;
    const name =
      customer?.company_name ||
      customer?.name ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      "this customer";

    Alert.alert(
      "Save Order on Credit?",
      `An order of ${fmt(discountedGrandTotal)} will be saved on credit for ${name} with no payment received now.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save Order", onPress: saveOrderOnCredit },
      ],
      { cancelable: true }
    );
  };

  /* ───────────── render ───────────── */
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Payment Summary</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#242E43" />
        {renderHeader()}
        <View style={[styles.content, { paddingBottom: insets.bottom }]}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading account balance...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const customerLabel = isWalkIn
    ? "Walk-in"
    : customer?.company_name ||
      customer?.name ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      "Customer";

  /* ── Bill card ── */
  const billContent = (
    <View style={styles.centerCol}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Bill Summary</Text>
        <View style={styles.customerChip}>
          <MaterialCommunityIcons
            name={isWalkIn ? "walk" : "account-outline"}
            size={14}
            color="#242E43"
          />
          <Text style={styles.customerChipText} numberOfLines={1}>
            {customerLabel}
          </Text>
        </View>
      </View>

      <View style={styles.listCard}>
        {/* Invoice */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Invoice Amount</Text>
          <View style={styles.rowRight}>
            {hasDiscount && <Text style={styles.strikeText}>{fmt(invoiceTotal)}</Text>}
            <Text style={styles.summaryValue}>{fmt(discountedGrandTotal)}</Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Discount – single row */}
        <View style={styles.discountBox}>
          <View style={styles.discountLine}>
            <View style={styles.discountLabelWrap}>
              <MaterialCommunityIcons name="tag-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabelInline}>Discount</Text>
            </View>

            <View style={styles.segment}>
              {[
                { key: "amount", label: "\u20B9" },
                { key: "percent", label: "%" },
              ].map((opt) => {
                const active = discountMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.8}
                    onPress={() => switchMode(opt.key)}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.smallInput, discountCapped && styles.inputBoxWarn]}>
              <TextInput
                style={styles.smallInputText}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={discountInput}
                onChangeText={onChangeDiscount}
                selectTextOnFocus
              />
              {discountInput !== "" && (
                <TouchableOpacity
                  onPress={() => {
                    setDiscountInput("");
                    setDiscountCapped(false);
                  }}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {discountCapped ? (
            <Text style={styles.warnText}>
              {discountMode === "percent"
                ? "Discount can't be more than 100%."
                : `Can't exceed the invoice amount (${fmt(invoiceTotal)}).`}
            </Text>
          ) : hasDiscount ? (
            <Text style={styles.helperText}>
              {discountMode === "amount"
                ? `${discountPercentLabel}% off the invoice`
                : `${fmt(discountValue)} off the invoice`}
            </Text>
          ) : null}
        </View>

        {/* Previous outstanding – customers only */}
        {!isWalkIn && (
          <>
            <View style={styles.rowDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Previous Outstanding</Text>
              <Text style={[styles.outstandingValue, refreshing && styles.dimmed]}>
                {fmt(previousOutstanding)}
              </Text>
            </View>
          </>
        )}

        {/* Total payable */}
        <View style={styles.rowDivider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          {refreshing ? (
            <ActivityIndicator size="small" color="#16A34A" />
          ) : (
            <Text style={styles.totalValue}>{fmt(totalPayable)}</Text>
          )}
        </View>
      </View>
    </View>
  );

  /* ── Payment card ── */
  const payInputValue = isWalkIn
    ? totalPayable.toFixed(2)
    : customAmount !== null
    ? customAmount
    : totalPayable
    ? String(totalPayable)
    : "";

  const paymentContent = (
    <View style={styles.centerCol}>
      <Text style={styles.sectionTitle}>Payment</Text>

      <View style={styles.listCard}>
        <View style={styles.payBox}>
          <View style={styles.payHeader}>
            <Text style={styles.detailLabelInline}>Amount to Pay</Text>

            {!isWalkIn && (
              <View style={styles.segment}>
                {[
                  { key: "full", label: "Full" },
                  { key: "half", label: "Half" },
                ].map((opt) => {
                  const active =
                    opt.key === "full"
                      ? customAmount === null
                      : customAmount !== null &&
                        Number(customAmount) === round2(totalPayable / 2);
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.8}
                      onPress={() =>
                        setCustomAmount(
                          opt.key === "full" ? null : String(round2(totalPayable / 2))
                        )
                      }
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View
            style={[
              styles.inputBox,
              exceedsPayable && styles.inputBoxWarn,
              isWalkIn && styles.inputBoxLocked,
            ]}
          >
            <Text style={styles.rupeePrefix}>{"\u20B9"}</Text>
            <TextInput
              style={styles.amountInput}
              editable={!isWalkIn}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={payInputValue}
              onChangeText={(t) => setCustomAmount(sanitizeDecimal(t))}
              selectTextOnFocus
            />
            {isWalkIn && (
              <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" />
            )}
          </View>

          {isWalkIn && (
            <Text style={styles.helperText}>Walk-in pays in full. Credit is not available.</Text>
          )}
          {loadError && (
            <Text style={styles.warnText}>
              Couldn't load the account balance. Go back and try again.
            </Text>
          )}
          {exceedsPayable && (
            <Text style={styles.warnText}>
              Can't be more than the total payable ({fmt(totalPayable)}).
            </Text>
          )}
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining After Payment</Text>
          <Text
            style={[
              styles.remainingValue,
              remainingAmount === 0 && { color: "#16A34A" },
            ]}
          >
            {fmt(remainingAmount)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#242E43" />
      {renderHeader()}

      <KeyboardAvoidingView
        style={[styles.content, { paddingBottom: insets.bottom }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.pane}
          contentContainerStyle={[
            styles.scrollContent,
            isSplit && styles.scrollContentSplit,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isSplit ? (
            <>
              <View style={[styles.half, styles.splitLeft]}>{billContent}</View>
              <View style={[styles.half, styles.splitRight]}>{paymentContent}</View>
            </>
          ) : (
            <>
              {billContent}
              {paymentContent}
            </>
          )}
        </ScrollView>

        {/* Pinned footer */}
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <TouchableOpacity
              disabled={!canCredit}
              activeOpacity={0.85}
              onPress={confirmCredit}
              style={[styles.creditButton, !canCredit && styles.disabledBtn]}
            >
              {savingOrder ? (
                <ActivityIndicator color="#16A34A" />
              ) : (
                <>
                  <MaterialCommunityIcons name="notebook-outline" size={20} color="#16A34A" />
                  <Text style={styles.creditText}>Credit</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!canPay}
              activeOpacity={0.85}
              onPress={goToCheckout}
              style={[styles.payButton, !canPay && styles.disabledBtn]}
            >
              <Text style={styles.payText}>
                {amount > 0 && !notReady ? `Pay ${fmt(amount)}` : "Pay"}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#242E43" },
  content: { flex: 1, backgroundColor: "#FFFFFF" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 15 },

  header: {
    height: 62,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#242E43",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },

  half: { flex: 1 },
  centerCol: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },

  pane: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  scrollContentSplit: { flexDirection: "row", alignItems: "flex-start" },
  splitLeft: { paddingRight: 12, borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  splitRight: { paddingLeft: 12 },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { marginBottom: 10, color: "#0F172A", fontWeight: "700", fontSize: 18 },
  customerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "55%",
    marginBottom: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  customerChipText: { fontSize: 13, fontWeight: "600", color: "#242E43" },

  listCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  rowDivider: { height: 1, backgroundColor: "#E2E8F0" },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  summaryLabel: { fontSize: 15, color: "#64748B", fontWeight: "500" },
  summaryValue: { fontSize: 17, color: "#0F172A", fontWeight: "700" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  strikeText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  outstandingValue: { fontSize: 16, color: "#DC2626", fontWeight: "700" },
  dimmed: { opacity: 0.4 },

  /* discount row */
  discountBox: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#F8FAFC" },
  discountLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  discountLabelWrap: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  detailLabelInline: { fontSize: 15, color: "#64748B", fontWeight: "600" },

  segment: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    padding: 2,
  },
  segmentItem: {
    minWidth: 40,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  segmentItemActive: { backgroundColor: "#242E43" },
  segmentText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  segmentTextActive: { color: "#FFFFFF" },

  smallInput: {
    width: 104,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  smallInputText: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* total */
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#F0FDF4",
  },
  totalLabel: { fontSize: 17, color: "#0F172A", fontWeight: "700" },
  totalValue: { fontSize: 28, color: "#16A34A", fontWeight: "800" },

  /* payment */
  payBox: { paddingHorizontal: 18, paddingVertical: 14 },
  payHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  inputBoxWarn: { borderColor: "#DC2626" },
  inputBoxLocked: { backgroundColor: "#F1F5F9" },
  rupeePrefix: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginRight: 6 },
  amountInput: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    height: "100%",
    paddingVertical: 0,
  },
  helperText: { marginTop: 6, fontSize: 13, color: "#64748B" },
  warnText: { marginTop: 6, fontSize: 13, color: "#DC2626", fontWeight: "600" },
  remainingValue: { fontSize: 17, fontWeight: "800", color: "#DC2626" },

  /* footer */
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  footerInner: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  creditButton: {
    flex: 1,
    height: 54,
    flexDirection: "row",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#16A34A",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  creditText: { color: "#16A34A", fontSize: 17, fontWeight: "700" },
  payButton: {
    flex: 2,
    height: 54,
    flexDirection: "row",
    gap: 8,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  payText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  disabledBtn: { opacity: 0.4 },
});