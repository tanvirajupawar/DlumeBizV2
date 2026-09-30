import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getCreditSummary } from "../../api/invoice";
import { Alert } from "react-native";
import { createSale } from "../../api/sale";
import { useAuth } from "../../context/AuthContext";

// below this width (phones in portrait) the two panes stack vertically
const SPLIT_BREAKPOINT = 600;

export default function CreditSummaryScreen() {
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
  } = route.params || {};

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  const onBack = () => navigation.goBack();

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await getCreditSummary(customer?._id, grandTotal);

        console.log("🔥 CREDIT SUMMARY API RESPONSE:", response);

        setSummary(response.data);
setPaymentAmount("");
      } catch (error) {
        console.log(
          "❌ CREDIT SUMMARY ERROR:",
          error?.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [customer?._id, grandTotal]);


  const saveOrderOnCredit = async () => {
  if (savingOrder) return;

  try {
    setSavingOrder(true);

    const customerId = customer?._id || customer?.id || null;

    const payload = {
      customer_id: customerId,

      source: "POS",
      sale_mode: "CALCULATOR",

      subtotal: Number(subtotal) || 0,
      discount_amount: Number(discount) || 0,
      total_amount: Number(grandTotal) || 0,

      items: cartItems.map((item) => ({
        product_id: null,
        product_name: item.product || item.name || "",
        description: item.description || "",
        qty: Number(item.qty) || 0,
        rate: Number(item.price) || 0,
        amount:
          (Number(item.qty) || 0) *
          (Number(item.price) || 0),
        unit: item.unit || "PCS",
        hsn: "",
        gst_rate: 0,
      })),
    };

    console.log("💾 SAVE ORDER ON CREDIT:", payload);

    const response = await createSale(payload);

    const sale = response.data || response;

    console.log("✅ CREDIT ORDER SAVED:", sale);

   navigation.replace("POSPaymentSuccess", {
  saleId: sale._id || sale.sale_id,
  saleCompleted: sale,
  amount: 0,
  paymentMethod: "CREDIT",

receipt: {
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

  invoiceNo:
    sale.invoice_no ||
    sale.invoiceNo ||
    "",

  invoiceDate:
    sale.invoice_date ||
    sale.order_date ||
    new Date().toLocaleString(),

  customerName:
    customer?.company_name ||
    customer?.name ||
    `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
    "Walk-in",

  paymentMode: "Credit",

  subtotal: Number(subtotal) || 0,
  totalDiscount: Number(discount) || 0,
  totalTax: Number(tax) || 0,

  finalPaymentAmount: Number(grandTotal) || 0,

  // IMPORTANT
  amountReceived: 0,

  receipt_size: "58mm",
  isGSTUser: false,
  isIntraState: true,

  items: cartItems.map((item) => ({
    name: item.isCalculatorItem
      ? item.product || item.name || ""
      : item.product_name ||
        item.item_name ||
        item.productName ||
        item.title ||
        item.name ||
        "",

    product_name:
      item.product_name ||
      item.item_name ||
      item.productName ||
      item.title ||
      item.name ||
      "",

    isCalculatorItem: !!item.isCalculatorItem,

    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    rate: Number(item.price) || 0,

    amount:
      (Number(item.qty) || 0) *
      (Number(item.price) || 0),

    description: item.description || "",
    desc: item.description || "",

    discount: 0,
    gstRate: 0,
    hsn: item.hsn || "",
  })),
},
});

  } catch (error) {
    console.log(
      "❌ SAVE CREDIT ORDER ERROR:",
      error?.response?.data || error?.message || error
    );

    Alert.alert(
      "Unable to Save Order",
      error?.response?.data?.message ||
        "Something went wrong while saving the order."
    );
  } finally {
    setSavingOrder(false);
  }
};

const totalPayable = Number(summary?.total_payable || 0);
const amount = paymentAmount === "" ? 0 : Number(paymentAmount);

const remainingAmount = Math.max(0, totalPayable - amount);

const isInvalid =
  Number.isNaN(amount) ||
  amount < 0 ||
  amount > totalPayable;
  const goToCheckout = () => {
    if (isInvalid) return;

    navigation.navigate("Checkout", {
      cartItems,
      customer,
      subtotal,
      tax,
      discount,
      grandTotal,
      creditSummary: summary,
      paymentAmount: amount,
    });
  };

  const isCreditOnly = amount <= 0;
const isDisabled = isInvalid || savingOrder;

const handleMainAction = () => {
  if (isDisabled) return;

  if (isCreditOnly) {
    const customerName =
      customer?.company_name ||
      customer?.name ||
      `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
      "this customer";

    Alert.alert(
      "Save Order on Credit?",
      `An order of \u20B9${Number(grandTotal || 0).toFixed(2)} will be saved on credit for ${customerName} with no payment received now.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save Order", onPress: saveOrderOnCredit },
      ],
      { cancelable: true }
    );
  } else {
    goToCheckout();
  }
};


  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
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

  /* ───────────── LEFT: account summary ───────────── */
  const leftPane = (
    <ScrollView
      style={[styles.pane, isSplit && styles.leftPane]}
      contentContainerStyle={styles.paneContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerCol}>
        <Text style={styles.sectionTitle}>Account Summary</Text>

        <View style={styles.listCard}>
          <View style={styles.heroBox}>
            <Text style={styles.amountLabel}>
              Current Invoice ({"\u20B9"})
            </Text>
            <Text style={styles.amount}>
              {Number(summary?.current_invoice_amount || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Previous Outstanding</Text>
            <Text style={styles.summaryDiscount}>
              {"\u20B9"}
              {Number(summary?.previous_outstanding || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.payableLabel}>Total Payable</Text>
            <Text style={styles.payableValue}>
              {"\u20B9"}
              {totalPayable.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  /* ───────────── RIGHT: amount to pay ───────────── */
  const rightPane = (
    <ScrollView
      style={styles.pane}
      contentContainerStyle={styles.paneContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerCol}>
        <Text style={styles.sectionTitle}>Payment Details</Text>

        <View style={styles.listCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount to Pay</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.rupeePrefix}>{"\u20B9"}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />
            </View>
       

<View style={styles.remainingRow}>
  <Text style={styles.remainingLabel}>Remaining After Payment</Text>
  <Text style={styles.remainingValue}>
    {"₹"}{remainingAmount.toFixed(2)}
  </Text>
</View>
          </View>
        </View>

{/* Single action: Continue to Payment / Save Order on Credit */}
<TouchableOpacity
  disabled={isDisabled}
  style={[
    styles.continueButton,
    isCreditOnly && styles.creditButton,
    isDisabled && { opacity: 0.5 },
  ]}
  activeOpacity={0.85}
  onPress={handleMainAction}
>
  {savingOrder ? (
    <ActivityIndicator color="#FFFFFF" />
  ) : (
    <Text style={styles.continueText}>
      {isCreditOnly ? "Save Order on Credit" : "Continue to Payment"}
    </Text>
  )}
</TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#242E43" />
      {renderHeader()}

      <View
        style={[
          styles.body,
          styles.content,
          isSplit && styles.bodySplit,
          { paddingBottom: insets.bottom },
        ]}
      >
        {isSplit ? (
          <>
            <View style={styles.half}>{leftPane}</View>
            <View style={styles.half}>{rightPane}</View>
          </>
        ) : (
          // phones in portrait: amount input first, so it stays high on screen
          <>
            <View style={styles.stackedTop}>{rightPane}</View>
            <View style={styles.stackedBottom}>{leftPane}</View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // dark background so the header color extends behind the status bar / notch
  container: {
    flex: 1,
    backgroundColor: "#242E43",
  },
  // white content area below the header (bottom inset added inline)
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 15,
  },

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

  /* two-pane layout */
  body: { flex: 1 },
  bodySplit: { flexDirection: "row" },
  half: { flex: 1 },
  leftPane: {
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  stackedTop: { flexShrink: 0 },
  stackedBottom: { flex: 1 },

  /* centers content in a max-width column — same pattern as Checkout */
  centerCol: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  pane: { flex: 1 },
  paneContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
  },

  amountLabel: {
    color: "#0F172A",
    fontSize: 18,
  },
  amount: {
    marginTop: 6,
    fontSize: 42,
    fontWeight: "800",
    color: "#111827",
  },

  heroBox: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  summaryLabel: { fontSize: 16, color: "#64748B", fontWeight: "500" },
  summaryDiscount: { fontSize: 16, color: "#DC2626", fontWeight: "700" },
  payableLabel: { fontSize: 17, color: "#0F172A", fontWeight: "700" },
  payableValue: { fontSize: 18, color: "#16A34A", fontWeight: "800" },

  sectionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 22,
    marginBottom: 22,
  },

  sectionTitle: {
    marginBottom: 12,
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 19,
  },

  listCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  detailRow: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  detailLabel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingVertical: 0,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
  },

  continueButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  saveOrderButton: {
  height: 54,
  borderRadius: 10,
  backgroundColor: "#16A34A",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 12,
},

saveOrderText: {
  color: "#FFFFFF",
  fontSize: 17,
  fontWeight: "700",
},
remainingRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 14,
  paddingTop: 14,
  borderTopWidth: 1,
  borderTopColor: "#E2E8F0",
},

remainingLabel: {
  fontSize: 15,
  fontWeight: "700",
  color: "#64748B",
},

remainingValue: {
  fontSize: 18,
  fontWeight: "800",
  color: "#DC2626",
},
creditButton: {
  backgroundColor: "#16A34A",
},
});