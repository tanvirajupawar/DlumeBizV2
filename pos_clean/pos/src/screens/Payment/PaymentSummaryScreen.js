import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getCreditSummary } from "../../api/invoice";
import { createSale } from "../../api/sale";
import { useAuth } from "../../context/AuthContext";
import { buildReceipt } from "../../utils/buildReceipt";

const MAX_CONTENT_WIDTH = 720;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const fmt = (n) => {
  const amount = Number(n) || 0;
  return `₹${
    Number.isInteger(amount)
      ? amount
      : amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
  }`;
};

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
  const [customAmount, setCustomAmount] = useState(null);
  const [amountFocused, setAmountFocused] = useState(false);
  const [discountFocused, setDiscountFocused] = useState(false);

  // Discount (amount only)
  const [discountInput, setDiscountInput] = useState(
    discount ? String(discount) : ""
  );
  const [discountCapped, setDiscountCapped] = useState(false);

  const discountValue = round2(
    Math.min(Number(discountInput) || 0, invoiceTotal)
  );

  const discountedGrandTotal = Math.max(0, round2(invoiceTotal - discountValue));

  const onChangeDiscount = (text) => {
    const value = sanitizeDecimal(text);
    const num = Number(value) || 0;

    if (num > invoiceTotal) {
      setDiscountInput(String(invoiceTotal));
      setDiscountCapped(true);
      return;
    }
    setDiscountCapped(false);
    setDiscountInput(value);
  };

  // Load the saved customer's account summary.
  const firstLoad = useRef(true);

  useEffect(() => {
    if (isWalkIn) return;

    let cancelled = false;

    const timer = setTimeout(
      async () => {
        try {
          setRefreshing(true);
          const response = await getCreditSummary(
            customerId,
            discountedGrandTotal
          );
          if (cancelled) return;
          setSummary(response.data);
          setLoadError(false);
          setCustomAmount(null);
        } catch (error) {
          console.log(
            "❌ CREDIT SUMMARY ERROR:",
            error?.response?.data || error.message
          );
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

  // Payment calculations
  const previousOutstanding = isWalkIn
    ? 0
    : Number(summary?.previous_outstanding || 0);

  const totalPayable = isWalkIn
    ? discountedGrandTotal
    : Number(summary?.total_payable || 0);

  const currentInvoiceAmount = discountedGrandTotal;

  // The invoice amount is the amount paid now (editable for customers).
  const amount =
    customAmount === null ? currentInvoiceAmount : Number(customAmount) || 0;

const maxAllowedAmount = isWalkIn
  ? currentInvoiceAmount
  : totalPayable;

const exceedsPayable = amount > maxAllowedAmount;

  const notReady = refreshing || loadError || (!isWalkIn && !summary);

const canPay =
  !notReady &&
  !savingOrder &&
  amount > 0 &&
  !exceedsPayable;
  // Credit is never available for walk-in
  const canCredit = !isWalkIn && !notReady && !savingOrder && totalPayable > 0;

  const amountInputValue =
    customAmount !== null
      ? customAmount
      : currentInvoiceAmount
        ? String(currentInvoiceAmount)
        : "";

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
        error?.response?.data?.message ||
          "Something went wrong while saving the order."
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const customerLabel = isWalkIn
    ? "Walk-in"
    : customer?.company_name ||
      customer?.name ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      "Customer";

  const confirmCredit = () => {
    if (!canCredit) return;

    Alert.alert(
      "Save Order on Credit?",
      `An order of ${fmt(
        discountedGrandTotal
      )} will be saved on credit for ${customerLabel} with no payment received now.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save Order", onPress: saveOrderOnCredit },
      ],
      { cancelable: true }
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Payment Summary</Text>

      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#242E43" />
          <Text style={styles.loadingText}>Loading account balance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.centerCol}>
   
{/* Horizontal breakdown */}
<View style={styles.breakdownRow}>
  {/* Invoice amount */}
  <View
    style={[
      styles.breakdownCol,
      styles.invoiceCol,
      isWalkIn && styles.invoiceColWalkIn,
    ]}
  >
    <Text style={styles.colLabel}>Invoice Amount</Text>

    <View
      style={[
        styles.amountField,
        isWalkIn && styles.amountFieldLocked,
        !isWalkIn && amountFocused && styles.amountFieldFocused,
        exceedsPayable && styles.amountFieldError,
      ]}
    >
      <Text
        style={[
          styles.amountCurrency,
          isWalkIn && styles.inputLocked,
          exceedsPayable && styles.inputError,
        ]}
      >
        ₹
      </Text>

      <TextInput
        style={[
          styles.amountInput,
          isWalkIn && styles.inputLocked,
          exceedsPayable && styles.inputError,
        ]}
        editable={!isWalkIn}
        keyboardType="decimal-pad"
        value={
          isWalkIn
            ? currentInvoiceAmount.toFixed(2)
            : amountInputValue
        }
        onChangeText={(text) =>
          setCustomAmount(sanitizeDecimal(text))
        }
        onFocus={() => setAmountFocused(true)}
        onBlur={() => setAmountFocused(false)}
        placeholder="0.00"
        placeholderTextColor="#94A3B8"
        selectTextOnFocus
        underlineColorAndroid="transparent"
      />

      <MaterialCommunityIcons
        name={isWalkIn ? "lock-outline" : "pencil-outline"}
        size={18}
        color={
          exceedsPayable
            ? "#DC2626"
            : isWalkIn
              ? "#94A3B8"
              : "#242E43"
        }
        style={styles.amountIcon}
      />
    </View>

    <Text style={styles.editHint}>
      {isWalkIn ? "Fixed for walk-in" : "Tap to edit amount"}
    </Text>
  </View>

  {/* Breakdown — saved customers only */}
  {!isWalkIn && (
    <View style={[styles.breakdownCol, styles.sideCol]}>
      <View style={styles.calculationLabels}>
        <Text style={styles.breakdownLabel}>Previous</Text>
        <Text style={styles.breakdownLabel}>Invoice</Text>
      </View>

      <View style={styles.calculationRow}>
        <Text style={styles.calculationValue}>
          {fmt(previousOutstanding)}
        </Text>

        <Text style={styles.operator}>+</Text>

        <Text style={styles.calculationValue}>
          {fmt(currentInvoiceAmount)}
        </Text>
      </View>

      <View style={styles.payableBox}>
        <Text style={styles.payableLabel}>Total Payable</Text>
        <Text style={styles.payableValue}>{fmt(totalPayable)}</Text>
      </View>
    </View>
  )}
</View>



            {isWalkIn && (
              <Text style={styles.inputHint}>
                Walk-in invoices must be paid in full.
              </Text>
            )}

            {exceedsPayable && (
              <Text style={styles.errorText}>
              Amount cannot exceed {fmt(maxAllowedAmount)}.
              </Text>
            )}

            {loadError && (
              <Text style={styles.errorText}>
                Could not load customer balance. Please go back and retry.
              </Text>
            )}

            {/* Discount */}
            <View
              style={[styles.listCard, discountFocused && styles.listCardFocused]}
            >
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount</Text>

                <View style={styles.discountInputRow}>
                  <Text style={styles.rupeePrefix}>{"₹"}</Text>

                  <TextInput
                    style={styles.discountInput}
                    value={discountInput}
                    onChangeText={onChangeDiscount}
                    onFocus={() => setDiscountFocused(true)}
                    onBlur={() => setDiscountFocused(false)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    selectTextOnFocus
                    returnKeyType="done"
                    underlineColorAndroid="transparent"
                  />
                </View>

                {discountCapped && (
                  <Text style={styles.errorText}>
                    Discount exceeds the allowed amount.
                  </Text>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                disabled={!canCredit}
                onPress={confirmCredit}
                style={[styles.creditButton, !canCredit && styles.disabled]}
                activeOpacity={0.8}
              >
                {savingOrder ? (
                  <ActivityIndicator size="small" color="#242E43" />
                ) : (
                  <Text style={styles.creditButtonText}>Credit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!canPay}
                onPress={goToCheckout}
                style={[styles.payButton, !canPay && styles.disabled]}
                activeOpacity={0.8}
              >
                <Text style={styles.payButtonText}>
                  Pay Now · {fmt(amount)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: { flex: 1 },

  header: {
    height: 62,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#242E43",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 32,
  },
  centerCol: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  /* Horizontal breakdown: Invoice | Previous + Invoice = Total Payable */
  breakdownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  breakdownCol: {
    justifyContent: "flex-start",
  },
  invoiceCol: {
    flex: 1.5,
    paddingRight: 12,
  },
  sideCol: {
    flex: 1,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
  },

  colLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },

  /* Editable amount field */
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 64,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  amountFieldFocused: {
    borderColor: "#242E43",
    backgroundColor: "#FFFFFF",
  },
  amountFieldLocked: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
  },
  amountFieldError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  amountCurrency: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "900",
    color: "#111827",
    paddingVertical: 0,
    textAlign: "center",
    minWidth: 0,
  },
  amountIcon: {
    marginLeft: 6,
  },
  editHint: {
    marginTop: 6,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textAlign: "center",
  },

  inputLocked: { color: "#64748B" },
  inputError: { color: "#DC2626" },
  inputHint: { fontSize: 12, color: "#64748B", marginTop: 10 },
  errorText: {
    marginTop: 8,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Calculation column */
  calculationLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  calculationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    gap: 3,
    width: "100%",
  },
  calculationValue: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
    flexShrink: 0,
    includeFontPadding: false,
  },
  operator: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    flexShrink: 0,
  },
  payableBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "stretch",
  },
  payableLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 2,
  },
  payableValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#15803D",
    textAlign: "center",
  },

  /* Discount */
  listCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 18,
    marginBottom: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  listCardFocused: {
    borderColor: "#242E43",
  },
  detailRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 3,
  },
  discountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
  },
  rupeePrefix: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 3,
  },
  discountInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    paddingVertical: 0,
    minHeight: 30,
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  creditButton: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242E43",
    backgroundColor: "#FFFFFF",
  },
  creditButtonText: {
    color: "#242E43",
    fontSize: 17,
    fontWeight: "700",
  },
  payButton: {
    flex: 1.6,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#16A34A",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  disabled: { opacity: 0.4 },
  invoiceColWalkIn: {
  flex: 1,
  paddingRight: 0,
  alignItems: "center",
},
});