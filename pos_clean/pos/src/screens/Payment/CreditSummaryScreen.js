import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getCreditSummary } from "../../api/invoice";
import { createSale } from "../../api/sale";
import { useAuth } from "../../context/AuthContext";

// below this width (phones in portrait) the two panes stack vertically
const SPLIT_BREAKPOINT = 600;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// keep only digits and a single decimal point
const sanitizeDecimal = (text) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
};

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

  const invoiceTotal = Number(grandTotal) || 0;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true); // first load only
  const [refreshing, setRefreshing] = useState(false); // re-fetch after discount change
  const [paymentAmount, setPaymentAmount] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  // discount: user types either a rupee amount or a percentage
  const [discountMode, setDiscountMode] = useState("amount"); // "amount" | "percent"
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

  const onBack = () => navigation.goBack();

  /* ───────────── keyboard handling ───────────── */
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const payBoxRef = useRef(null);
  const discountInputRef = useRef(null);
  const payInputRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      keyboardTopRef.current = e?.endCoordinates?.screenY || 0;
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // after the keyboard opens, scroll only as much as needed so the payment
  // field and the action button below it sit just above the keyboard
  const ensurePayFieldVisible = () => {
    setTimeout(() => {
      const kbTop = keyboardTopRef.current;
      if (!kbTop || !payBoxRef.current) return;

      payBoxRef.current.measureInWindow((_x, y, _w, h) => {
        const needed = y + h + 110; // field + hint space + button (54) + margin
        const overflow = needed - kbTop;
        if (overflow > 0) {
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + overflow,
            animated: true,
          });
        }
      });
    }, 300);
  };

  /* ───────────── discount handlers ───────────── */
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
    // convert so the discount stays the same, just shown in the other unit
    if (!hasDiscount) {
      setDiscountInput("");
    } else if (mode === "percent") {
      setDiscountInput(String(discountPercentLabel));
    } else {
      setDiscountInput(String(discountValue));
    }
    setDiscountCapped(false);
    setDiscountMode(mode);
  };

  const clearDiscount = () => {
    setDiscountInput("");
    setDiscountCapped(false);
  };

  /* ───────────── load credit summary (debounced) ───────────── */
  const firstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(
      async () => {
        try {
          setRefreshing(true);
          const response = await getCreditSummary(
            customer?._id,
            discountedGrandTotal
          );

          console.log("🔥 CREDIT SUMMARY API RESPONSE:", response);

          if (cancelled) return;
          setSummary(response.data);
          setPaymentAmount("");
        } catch (error) {
          console.log(
            "❌ CREDIT SUMMARY ERROR:",
            error?.response?.data || error.message
          );
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
  }, [customer?._id, discountedGrandTotal]);

  /* ───────────── save on credit ───────────── */
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
        discount_amount: discountValue,
        total_amount: discountedGrandTotal,

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

          invoiceNo: sale.invoice_no || sale.invoiceNo || "",

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
          totalDiscount: discountValue,
          totalTax: Number(tax) || 0,

          finalPaymentAmount: discountedGrandTotal,

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

            amount: (Number(item.qty) || 0) * (Number(item.price) || 0),

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

  /* ───────────── payment maths ───────────── */
  const previousOutstanding = Number(summary?.previous_outstanding || 0);
  const totalPayable = Number(summary?.total_payable || 0);

  const amount = paymentAmount === "" ? 0 : Number(paymentAmount);
  const remainingAmount = Math.max(0, totalPayable - amount);

  const isInvalid = Number.isNaN(amount) || amount < 0 || amount > totalPayable;
  const exceedsPayable = !Number.isNaN(amount) && amount > totalPayable;

  const goToCheckout = () => {
    if (isInvalid) return;

navigation.navigate("Checkout", {
  cartItems,
  customer,
  subtotal,
  tax,
  discount: discountValue,
  grandTotal,
  discountedGrandTotal,
  creditSummary: summary,
  paymentAmount: amount,
});
  };

  const isCreditOnly = amount <= 0;
  const isDisabled = isInvalid || savingOrder || refreshing;

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
        `An order of \u20B9${Number(discountedGrandTotal || 0).toFixed(
          2
        )} will be saved on credit for ${customerName} with no payment received now.`,
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

  /* ───────────── ACCOUNT SUMMARY (invoice + discount) ───────────── */
  const summaryContent = (
    <View style={styles.centerCol}>
      <Text style={styles.sectionTitle}>Account Summary</Text>

      <View style={styles.listCard}>
        {/* Invoice amount – updates live with the discount */}
        <View style={styles.heroBox}>
          <View style={styles.heroTopRow}>
            <Text style={styles.amountLabel}>Invoice Amount</Text>
            {hasDiscount && (
              <View style={styles.savingChip}>
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={14}
                  color="#16A34A"
                />
                <Text style={styles.savingChipText}>
                  {"\u20B9"}
                  {discountValue.toFixed(2)} off
                </Text>
              </View>
            )}
          </View>

          {hasDiscount && (
            <Text style={styles.strikeAmount}>
              {"\u20B9"}
              {invoiceTotal.toFixed(2)}
            </Text>
          )}

          <Text style={styles.amount}>
            {"\u20B9"}
            {discountedGrandTotal.toFixed(2)}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        {/* Discount – lives right under the invoice amount */}
        <View style={styles.discountBox}>
          <View style={styles.discountHeader}>
            <Text style={styles.detailLabelInline}>Discount</Text>

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
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={() => discountInputRef.current?.focus()}
            style={[
              styles.inputBox,
              discountCapped && styles.inputBoxWarn,
            ]}
          >
            <Text style={styles.rupeePrefix}>
              {discountMode === "percent" ? "%" : "\u20B9"}
            </Text>
            <TextInput
              ref={discountInputRef}
              style={styles.amountInput}
              placeholder={discountMode === "percent" ? "0" : "0.00"}
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={discountInput}
              onChangeText={onChangeDiscount}
              selectTextOnFocus
            />
            {discountInput !== "" && (
              <TouchableOpacity onPress={clearDiscount} hitSlop={10}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            )}
          </Pressable>

          {discountCapped ? (
            <Text style={styles.warnText}>
              {discountMode === "percent"
                ? "Discount can't be more than 100%."
                : `Discount can't be more than the invoice amount (\u20B9${invoiceTotal.toFixed(
                    2
                  )}).`}
            </Text>
          ) : hasDiscount && discountMode === "amount" ? (
            <Text style={styles.helperText}>
              That's {discountPercentLabel}% off the invoice.
            </Text>
          ) : hasDiscount && discountMode === "percent" ? (
            <Text style={styles.helperText}>
              That's {"\u20B9"}
              {discountValue.toFixed(2)} off the invoice.
            </Text>
          ) : null}

        </View>

        <View style={styles.rowDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Previous Outstanding</Text>
          <Text style={[styles.summaryDiscount, refreshing && styles.dimmed]}>
            {"\u20B9"}
            {previousOutstanding.toFixed(2)}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        <View style={[styles.summaryRow, styles.payableRow]}>
          <Text style={styles.payableLabel}>Total Payable</Text>
          {refreshing ? (
            <ActivityIndicator size="small" color="#16A34A" />
          ) : (
            <Text style={styles.payableValue}>
              {"\u20B9"}
              {totalPayable.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  /* ───────────── PAYMENT DETAILS ───────────── */
  const paymentContent = (
    <View style={styles.centerCol}>
      <Text style={styles.sectionTitle}>Payment Details</Text>

      <View style={styles.listCard}>
        <View style={styles.detailRow}>
          <View style={styles.discountHeader}>
            <Text style={styles.detailLabelInline}>Amount to Pay</Text>
          </View>

          <Pressable
            ref={payBoxRef}
            collapsable={false}
            onPress={() => payInputRef.current?.focus()}
            style={[styles.inputBox, exceedsPayable && styles.inputBoxWarn]}
          >
            <Text style={styles.rupeePrefix}>{"\u20B9"}</Text>
            <TextInput
              ref={payInputRef}
              style={styles.amountInput}
              placeholder="Enter amount (leave empty for credit)"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={paymentAmount}
              onFocus={ensurePayFieldVisible}
              onChangeText={(t) => setPaymentAmount(sanitizeDecimal(t))}
            />
          </Pressable>

          {exceedsPayable && (
            <Text style={styles.warnText}>
              Amount can't be more than the total payable ({"\u20B9"}
              {totalPayable.toFixed(2)}).
            </Text>
          )}

          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>Remaining After Payment</Text>
            <Text style={styles.remainingValue}>
              {"\u20B9"}
              {remainingAmount.toFixed(2)}
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
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#242E43" />
      {renderHeader()}

      <View
        style={[
          styles.body,
          styles.content,
          { paddingBottom: insets.bottom },
        ]}
      >
        {/* One scroll for the whole page, on phones and tablets */}
        <ScrollView
          ref={scrollRef}
          style={styles.pane}
          contentContainerStyle={[
            styles.scrollContent,
            isSplit && styles.scrollContentSplit,
            { paddingBottom: 40 + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {isSplit ? (
            <>
              <View style={[styles.half, styles.splitLeft]}>{summaryContent}</View>
              <View style={[styles.half, styles.splitRight]}>{paymentContent}</View>
            </>
          ) : (
            <>
              {summaryContent}
              {paymentContent}
            </>
          )}
        </ScrollView>
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

  /* centers content in a max-width column — same pattern as Checkout */
  centerCol: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  pane: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  scrollContentSplit: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  splitLeft: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  splitRight: {
    paddingLeft: 12,
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

  /* invoice hero */
  heroBox: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountLabel: {
    color: "#0F172A",
    fontSize: 18,
  },
  strikeAmount: {
    marginTop: 8,
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  amount: {
    marginTop: 4,
    fontSize: 42,
    fontWeight: "800",
    color: "#111827",
  },
  savingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingChipText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* discount block */
  discountBox: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8FAFC",
  },
  discountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabelInline: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

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
  segmentItemActive: {
    backgroundColor: "#242E43",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#FFFFFF",
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
  inputBoxWarn: {
    borderColor: "#DC2626",
  },
  rupeePrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 6,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    height: "100%", // whole row is tappable, not just the text line
    paddingVertical: 0,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
  },
  warnText: {
    marginTop: 8,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },

  /* summary rows */
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  summaryLabel: { fontSize: 16, color: "#64748B", fontWeight: "500" },
  summaryDiscount: { fontSize: 16, color: "#DC2626", fontWeight: "700" },
  payableRow: { backgroundColor: "#F0FDF4" },
  payableLabel: { fontSize: 17, color: "#0F172A", fontWeight: "700" },
  payableValue: { fontSize: 18, color: "#16A34A", fontWeight: "800" },
  dimmed: { opacity: 0.4 },

  /* payment details */
  detailRow: {
    paddingHorizontal: 20,
    paddingVertical: 18,
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
  creditButton: {
    backgroundColor: "#16A34A",
  },
});