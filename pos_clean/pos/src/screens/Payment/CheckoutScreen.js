import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { createSale } from "../../api/sale";
import { createPayment } from "../../api/payment";
import { buildReceipt } from "../../utils/buildReceipt";

const THEME = "#242E43";
const MAX_CONTENT_WIDTH = 720;

const PAYMENT_OPTIONS = [
  { id: "cash", title: "Cash", icon: "cash", mode: "Cash", api: "CASH" },
  { id: "upi", title: "UPI", icon: "qrcode-scan", mode: "UPI", api: "UPI" },
   { id: "card", title: "Card", icon: "credit-card-outline", mode: "Card", api: "CARD" },
];

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, company } = useAuth();

const companyConfig = company || user?.company || {};
const saleMode = String(companyConfig.pos_mode || "").toUpperCase();


const {
  cartItems = [],
  customer = null,
  subtotal = 0,
  tax = 0,
  discount = 0,
  discountedGrandTotal = 0,
  previousOutstanding = 0,
  totalPayable = 0,
  paymentAmount = 0,
  transportationDetails = "",
  saleDate = null,
} = route.params || {};


  const [processingMethod, setProcessingMethod] = useState(null);

  // if the sale is created but the payment fails, a retry must not create a 2nd sale
  const saleRef = useRef(null);

  const handleSelectPayment = async (option) => {
    if (processingMethod) return;
    if (!["PRODUCT", "CALCULATOR"].includes(saleMode)) {
  setProcessingMethod(null);
  Alert.alert(
    "Configuration Error",
    "The company's POS mode is missing or invalid. Please reload your company details and try again."
  );
  return;
}

    let sale;
    let actualPaidAmount = Number(paymentAmount) || 0;

    try {
      if (!saleRef.current) {
        const customerId = customer?._id || customer?.id || null;


const payload = {
  customer_id: customerId,
  source: "POS",
  sale_mode: saleMode,

invoice_date: saleDate || new Date().toLocaleDateString("en-CA"),
  subtotal: Number(subtotal) || 0,

          discount_amount: Number(discount) || 0,
          total_amount: Number(discountedGrandTotal) || 0,
          transportation_details: transportationDetails,

items: cartItems.map((item) => ({
  ...(saleMode === "PRODUCT"
    ? { product_id: item._id || item.id || item.product_id }
    : {}),
  product_name: item.product || item.name || item.product_name || "",
  description: item.description || "",
  qty: Number(item.qty) || 0,
  rate: Number(item.price ?? item.salePrice ?? item.mrp ?? item.rate ?? 0),
  amount:
    (Number(item.qty) || 0) *
    Number(item.price ?? item.salePrice ?? item.mrp ?? item.rate ?? 0),
  unit: item.unit || "PCS",
  hsn: item.hsn || "",
  gst_rate: 0,

  // Preserve bag information for the backend
  bags: Number(item.bags) || 0,
  units_per_bag: Number(item.units_per_bag) || 0,
})),

        };

        console.log("📅 SELECTED SALE DATE:", saleDate);
console.log("📅 DATE SENT TO BACKEND:", payload.invoice_date);
console.log("📦 FULL SALE PAYLOAD:", JSON.stringify(payload, null, 2));

        const response = await createSale(payload);

        console.log(
  "🛍️ CHECK BAG VALUES:",
  cartItems.map((item) => ({
    product: item.product || item.name || item.product_name,
    qty: item.qty,
    bags: item.bags,
    units_per_bag: item.units_per_bag,
  }))
);

        
        saleRef.current = response.data || response;
      }
      sale = saleRef.current;

   
const paymentDate =
  saleDate ||
  sale.invoice_date ||
  new Date().toISOString().slice(0, 10);

console.log("📅 PAYMENT DATE SENT TO BACKEND:", paymentDate);

const paymentResponse = await createPayment({
  sale_id: sale.sale_id || sale._id,
  amount: Number(paymentAmount) || 0,
  payment_method: option.api,
  payment_date: paymentDate,
});


      actualPaidAmount = Number(
        paymentResponse?.data?.payment_amount ??
          paymentResponse?.payment_amount ??
          paymentAmount
      );
    } catch (err) {
      console.log("❌ CHECKOUT ERROR:", JSON.stringify(err?.response?.data, null, 2));
      setProcessingMethod(null);
      Alert.alert(
        "Unable to complete sale",
        err?.response?.data?.message || err?.message || "Please try again."
      );
      return;
    }

    // Sale succeeded – printing happens on the success screen
    navigation.replace("POSPaymentSuccess", {
      saleId: sale._id,
      saleCompleted: sale,
      receipt: buildReceipt({
        company,
        user,
        customer,
        sale,
        saleDate,
        cartItems,
        paymentMode: option.mode,
        transportationDetails,
        subtotal,
        discountValue: Number(discount) || 0,
        tax,
        invoiceAmount: Number(discountedGrandTotal) || 0,
        previousOutstanding: Number(previousOutstanding) || 0,
        totalPayable: Number(totalPayable) || 0,
        amountPaid: actualPaidAmount,
      }),
      amount: actualPaidAmount,
      paymentMethod: option.id,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={!!processingMethod}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.centerCol}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>

            <View style={styles.listCard}>
              {PAYMENT_OPTIONS.map((item, index) => {
                const busy = processingMethod === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity
                      disabled={processingMethod !== null}
                      style={[
                        styles.optionRow,
                        processingMethod !== null && !busy && { opacity: 0.5 },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSelectPayment(item)}
                    >
                      <View style={styles.optionLeft}>
                     <MaterialCommunityIcons name={item.icon} size={30} color={THEME} />
                        <Text style={styles.optionTitle}>
                          {busy ? "Processing..." : item.title}
                        </Text>
                      </View>

                      {busy ? (
                        <ActivityIndicator size="small" color={THEME} />
                      ) : (
                     <MaterialCommunityIcons name="chevron-right" size={30} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                    {index < PAYMENT_OPTIONS.length - 1 && <View style={styles.rowDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME },
  content: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    height: 62,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },

scrollContent: {
  paddingHorizontal: 22,
  paddingTop: 28,
  paddingBottom: 36,
},
  centerCol: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },

  sectionTitle: { marginBottom: 12, color: "#0F172A", fontWeight: "700", fontSize: 18 },

  listCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  rowDivider: { height: 1, backgroundColor: "#E2E8F0" },

optionRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 24,
  height: 82,
},
optionLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 20,
},
optionTitle: {
  fontSize: 21,
  fontWeight: "600",
  color: "#0F172A",
},
});