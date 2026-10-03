
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { createSale } from "../../api/sale";
import { createPayment } from "../../api/payment";


const PAYMENT_OPTIONS = [
  { id: "cash", title: "Cash" },
  { id: "card", title: "Card" },
  { id: "upi", title: "UPI" },
];

// same centering pattern as ManageCartItemModal — caps content width and
// centers it horizontally so it doesn't stretch edge-to-edge on wide screens
const MAX_CONTENT_WIDTH = 720;

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();

const { user, company } = useAuth();
const paymentGatewayEnabled =
  user?.company?.features?.payment_gateway ?? false;

  // POSScreen pushes this screen via navigation.navigate("Checkout", {...}),
  // so the data lives in route.params, not in component props.
const {
  cartItems = [],
  customer = null,
  subtotal = 0,
  tax = 0,
  discount: incomingDiscount = 0,
  grandTotal = 0,
  creditSummary = null,
  paymentAmount = null,
} = route.params || {};

const finalPaymentAmount =
  paymentAmount !== null
    ? Number(paymentAmount)
    : Number(grandTotal || 0);

  const onBack = () => navigation.goBack();

const [discount, setDiscount] = useState(
  String(incomingDiscount || "")
);
const [note, setNote] = useState("");   
const [processingMethod, setProcessingMethod] = useState(null);
  const discountValue = Math.min(
    Number(discount) || 0,
    Number(finalPaymentAmount) || 0
  );
  const payableTotal = Math.max(0, Number(finalPaymentAmount) - discountValue);




const handleSelectPayment = async (paymentId) => {
  if (processingMethod) return;

  setProcessingMethod(paymentId);

let payment = null;
let sale;
let actualPaidAmount = 0;

  try {
    const customerId = customer?._id || customer?.id || null;

    console.log("========== CHECKOUT CUSTOMER ==========");
    console.log("CUSTOMER:", customer);
    console.log("CUSTOMER ID:", customerId);
    console.log("=======================================");

    const payload = {
      customer_id: customerId,

      source: "POS",
      sale_mode: "CALCULATOR",

      subtotal: Number(subtotal) || 0,
      discount_amount: discountValue,
      total_amount: payableTotal,

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

    const response = await createSale(payload);
    sale = response.data || response;

const paymentPayload = {
 sale_id: sale.sale_id,
  amount: payableTotal,
  payment_method:
    paymentId === "cash"
      ? "CASH"
      : paymentId === "card"
      ? "CARD"
      : "UPI",
};
const paymentResponse = await createPayment(paymentPayload);

console.log("🔥 V2 PAYMENT RESPONSE:", paymentResponse);

actualPaidAmount =
  Number(
    paymentResponse?.data?.payment_amount ??
    paymentResponse?.payment_amount ??
    payableTotal
  );



  } catch (err) {
      console.log(
    "❌ V2 SALE ERROR:",
    JSON.stringify(err?.response?.data, null, 2)
  );
    setProcessingMethod(null);

    alert(
      err?.message ||
      err?.response?.data?.message ||
      "Unable to complete sale."
    );
    return;
  }

  // ── Sale succeeded from here on — printing and navigation are best-effort ──
const receipt = {
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

  companyEmail:
    company?.email ||
    user?.email ||
    "",


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
    "Walk-in",

  paymentMode:
    paymentId === "cash"
      ? "Cash"
      : paymentId === "card"
      ? "Card"
      : "UPI",

subtotal,
totalDiscount: discountValue,
totalTax: tax,
finalPaymentAmount: payableTotal,
amountReceived: actualPaidAmount,

remainingOutstanding: Math.max(
  0,
  Number(customer?.outstanding || 0) +
    Number(payableTotal || 0) -
    Number(actualPaidAmount || 0)
),
  receipt_size: "58mm",
  isGSTUser: false,
  isIntraState: true,

items: cartItems.map(item => ({
  name:
    item.isCalculatorItem
      ? (item.product || item.name || "")
      : (
          item.product_name ||
          item.item_name ||
          item.productName ||
          item.title ||
          item.name ||
          ""
        ),

  product_name:
    item.product_name ||
    item.item_name ||
    item.productName ||
    item.title ||
    item.name ||
    "",

  isCalculatorItem: !!item.isCalculatorItem,

  qty: item.qty,
  price: item.price,
  rate: item.price,
  amount: item.qty * item.price,

  description: item.description || "",
  desc: item.description || "",

  discount: 0,
  gstRate: 0,
  hsn: item.hsn || "",
})),
};

  // Printing now happens on the success screen when the cashier taps
  // "Print Receipt" — not automatically here. We forward the exact
  // receipt payload so the success screen doesn't have to rebuild it
  // from the raw sale record.
  navigation.replace("POSPaymentSuccess", {
    saleId: sale._id,
    saleCompleted: sale,
    receipt,
    amount: payableTotal,
    paymentMethod: paymentId,
  });
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Checkout</Text>

        <View style={{ width: 24 }} />
      </View>

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
            {/* Amount */}
            <Text style={styles.amountLabel}>Total Amount ({"\u20B9"})</Text>
            <Text style={styles.amount}>
              {Number(finalPaymentAmount).toFixed(2)}
            </Text>

            {discountValue > 0 && (
              <View style={styles.summaryBlock}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryDiscount}>
                    {"\u2212\u20B9"}
                    {discountValue.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.payableLabel}>Payable</Text>
                  <Text style={styles.payableValue}>
                    {"\u20B9"}
                    {payableTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.sectionDivider} />

            {/* Discount + Note — same flat list styling as Checkout Options below */}
            <Text style={styles.sectionTitle}>Sale Details</Text>
            <View style={styles.listCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount</Text>
                <View style={styles.discountInputRow}>
                  <Text style={styles.rupeePrefix}>{"\u20B9"}</Text>
                  <TextInput
                    style={styles.discountInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={discount}
                    onChangeText={setDiscount}
                  />
                </View>
              </View>

              <View style={styles.rowDivider} />

          
            </View>

            <Text style={styles.sectionTitle}>Checkout Options</Text>

            <View style={styles.listCard}>
              {PAYMENT_OPTIONS.map((item, index) => (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    disabled={processingMethod !== null}
                    style={[
                      styles.optionRow,
                      processingMethod !== null && { opacity: 0.6 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPayment(item.id)}
                  >
                    <Text style={styles.optionTitle}>
                      {processingMethod === item.id
                        ? "Processing..."
                        : item.title}
                    </Text>

                    {processingMethod === item.id ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#94A3B8"
                      />
                    )}
                  </TouchableOpacity>
                  {index < PAYMENT_OPTIONS.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </React.Fragment>
              ))}
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

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 32,
  },

  /* centers content in a max-width column — same pattern as ManageCartItemModal */
  centerCol: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
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

  summaryBlock: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
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

  /* single bordered container with dividers between rows — matches the
     reference screenshot's flat list style (no shadows, no icon circles) */
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
  discountInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rupeePrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 4,
  },
  discountInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingVertical: 0,
  },
  noteInput: {
    fontSize: 17,
    color: "#0F172A",
    minHeight: 24,
    paddingVertical: 0,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 64,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#0F172A",
  },
});