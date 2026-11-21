import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import Share from "react-native-share";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  getReceiptPrinterType,
  printReceipt,
} from "../../services/printer";

import { buildReceiptHtml } from "../../services/receiptPdf";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PAYMENT_LABELS = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
};

const PAYMENT_ICONS = {
  cash: "cash",
  card: "credit-card-outline",
  upi: "qrcode-scan",
};

const ACCENT = "#16A34A";
const ACCENT_DARK = "#0F3D27";
const AUTO_NAVIGATE_DELAY = 60000;
export default function POSPaymentSuccessScreen({ route, navigation }) {
const {
  amount = 0,
  paymentMethod,
  saleCompleted = null,
  receipt = null,
  isInvoiceUpdated = false,
} = route.params || {};

  // ── Print state ──────────────────────────────────────────────────────────
  // idle -> printing -> done | error. Tapping again from "done" or "error"
  // just reprints (cashiers reprint copies all the time).
  const [printState, setPrintState] = useState("idle");
  const [shareLoading, setShareLoading] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const navigatedRef = useRef(false);
  const autoTimerRef = useRef(null);

  const goToFreshCart = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    // Reset the stack so the cashier lands on a clean, empty cart.
    // POSScreen already listens for route.params?.clearCart to wipe its
    // local cart state (see its useEffect) — we set that flag here, and
    // also forward the completed sale in case you want to persist/log it
    // on the POS screen after returning.
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "POS",
          params: {
            clearCart: true,
            saleCompleted,
          },
        },
      ],
    });
  };

  const handlePrint = async () => {
      console.log("🖨️ PRINT BUTTON PRESSED");

    if (printState === "printing") return;

    if (!receipt) {
      setPrintState("error");
      return;
    }

    // Printing pauses the auto-navigate countdown — we don't want to bounce
    // the cashier back to the cart mid-print, or right after.
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    setPrintState("printing");
    try {
      const outcome = await printReceipt(receipt);
      if (outcome?.success) {
        setPrintState("done");
      } else {
        console.log("PRINT ERROR:", outcome?.error?.message || outcome?.error);
        setPrintState("error");
      }
    } catch (err) {
      console.log("PRINT ERROR:", err?.message || err);
      setPrintState("error");
    } finally {
      autoTimerRef.current = setTimeout(goToFreshCart, AUTO_NAVIGATE_DELAY);
    }
  };


const handleShareReceipt = async () => {
  if (shareLoading) return;

  if (!receipt) {
    Alert.alert("Receipt Missing", "Receipt data is not available.");
    return;
  }

  const rawPhone =
    receipt?.customerNumber ||
    receipt?.customerPhone ||
    receipt?.customerMobile ||
    receipt?.customer?.phone ||
    receipt?.customer?.mobile ||
    receipt?.customer?.contact_no_1 ||
    "";

  const digits = String(rawPhone).replace(/\D/g, "");

  let customerPhone = digits;

  if (digits.length === 12 && digits.startsWith("91")) {
    customerPhone = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    customerPhone = digits.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(customerPhone)) {
    Alert.alert(
      "Invalid Customer Mobile Number",
      "Please add a valid 10-digit customer mobile number."
    );
    return;
  }

  if (autoTimerRef.current) {
    clearTimeout(autoTimerRef.current);
  }

  setShareLoading(true);

  try {
    console.log("STEP 1 - FUNCTION CHECK", {
      printer: typeof getReceiptPrinterType,
      htmlBuilder: typeof buildReceiptHtml,
      pdfGenerator: typeof Print?.printToFileAsync,
      shareSingle: typeof Share?.shareSingle,
      whatsapp: Share?.Social?.WHATSAPP,
    });

    console.log("STEP 2 - DETECT PRINTER");

    const printerType = await getReceiptPrinterType();

    console.log("PRINTER TYPE:", printerType);

    console.log("STEP 3 - BUILD HTML");

    const html = buildReceiptHtml(receipt, printerType);

    console.log("HTML LENGTH:", html?.length);

    console.log("STEP 4 - GENERATE PDF");

    const pdf = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log("PDF RESULT:", pdf);

    if (!pdf?.uri) {
      throw new Error("PDF generation failed.");
    }

    const safeFilePart = (value, fallback) =>
  String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");

const safeCompanyName = safeFilePart(
  receipt.companyName,
  "Company"
);

const safeCustomerName = safeFilePart(
  receipt.customerName || receipt.customer?.name,
  "Customer"
);

const safeInvoiceNo = safeFilePart(
  receipt.invoiceNo,
  "Sale"
);

const fileName =
  `${safeCompanyName}_${safeCustomerName}_Sales_Receipt_${safeInvoiceNo}.pdf`;

const namedPdfUri = `${FileSystem.cacheDirectory}${fileName}`;

// Remove an older file with the same name, if present.
const existingFile = await FileSystem.getInfoAsync(namedPdfUri);

if (existingFile.exists) {
  await FileSystem.deleteAsync(namedPdfUri);
}

// Copy PDF to the meaningful filename.
await FileSystem.copyAsync({
  from: pdf.uri,
  to: namedPdfUri,
});

console.log("✅ NAMED PDF:", namedPdfUri);

    console.log("STEP 5 - WHATSAPP SHARE");

    if (typeof Share?.shareSingle !== "function") {
      throw new Error(
        "Share.shareSingle is unavailable in react-native-share."
      );
    }



const shareUri = `file://${namedPdfUri.replace(/^file:\/\//, "")}`;

console.log("WHATSAPP SHARE DETAILS:", {
  shareUri,
  fileName,
  customerPhone: `91${customerPhone}`,
});

const shareResult = await Share.open({
  title: "Customer Receipt",
  message: "Thank you for shopping with us!",
  url: namedPdfUri,
  type: "application/pdf",
  filename: fileName,
  failOnCancel: false,
});

console.log("GENERAL SHARE RESULT:", shareResult);

console.log("WHATSAPP SHARE RESULT:", shareResult);

    console.log("STEP 6 - SHARE COMPLETED");

  } catch (error) {
    console.log("SHARE ERROR MESSAGE:", error?.message);
    console.log("SHARE ERROR STACK:", error?.stack);
    console.log("SHARE ERROR OBJECT:", error);

    Alert.alert(
      "Share Failed",
      error?.message || "Unable to share receipt."
    );

  } finally {
    setShareLoading(false);
  }
};

  useEffect(() => {
    Animated.sequence([
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const checkTimer = setTimeout(() => {
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 180,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 220);

    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 480);

    autoTimerRef.current = setTimeout(goToFreshCart, AUTO_NAVIGATE_DELAY);

    return () => {
      clearTimeout(checkTimer);
      clearTimeout(textTimer);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

const paymentLabel = PAYMENT_LABELS[paymentMethod] || paymentMethod;
const paymentIcon = PAYMENT_ICONS[paymentMethod] || "wallet-outline";

const isCreditSave = !isInvoiceUpdated && Number(amount) === 0;
const savedOrderAmount = Number(
  saleCompleted?.total_amount ||
  saleCompleted?.totalAmount ||
  0
);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />

      <View style={styles.center}>
        {/* ── Status icon ──────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
        >
          <Svg width="88" height="88" style={styles.svgCircle}>
            <Circle
              cx="44"
              cy="44"
              r="40"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="3"
              fill="none"
            />
            <AnimatedCircle
              cx="44"
              cy="44"
              r="40"
              stroke="#FFFFFF"
              strokeWidth="3"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="44, 44"
            />
          </Svg>

          <Animated.View
            style={[
              styles.checkIcon,
              {
                opacity: checkAnim,
                transform: [
                  { scale: scaleAnim },
                  {
                    translateY: checkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="checkmark" size={46} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>

        {/* ── Card with amount + payment method ───────────────────────── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
      <Text style={styles.eyebrow}>
 {isInvoiceUpdated
  ? "INVOICE UPDATED"
  : isCreditSave
  ? "ORDER SAVED"
  : "PAYMENT SUCCESSFUL"}
</Text>

{!isInvoiceUpdated && (
  <Text style={styles.amount}>
    {"\u20B9"}
    {isCreditSave
      ? savedOrderAmount.toFixed(2)
      : Number(amount).toFixed(2)}
  </Text>
)}

<View style={styles.methodPill}>
  <MaterialCommunityIcons
    name={isCreditSave ? "clock-outline" : paymentIcon}
    size={15}
    color={ACCENT_DARK}
  />

  <Text style={styles.methodPillText}>
   {isInvoiceUpdated
  ? "Invoice Updated — No New Payment Received"
  : isCreditSave
  ? "Full amount added to outstanding"
  : `Paid via ${paymentLabel}`}
  </Text>
</View>

          <View style={styles.divider} />

          {/* ── Print button ──────────────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.printBtn,
              printState === "printing" && styles.printBtnBusy,
              printState === "error" && styles.printBtnError,
            ]}
            activeOpacity={0.85}
            onPress={handlePrint}
            disabled={printState === "printing"}
          >
            {printState === "printing" ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.printBtnText}>Printing…</Text>
              </>
            ) : printState === "done" ? (
              <>
                <Feather name="check" size={18} color="#FFFFFF" />
                <Text style={styles.printBtnText}>Printed — tap to reprint</Text>
              </>
            ) : printState === "error" ? (
              <>
                <Feather name="alert-triangle" size={18} color="#FFFFFF" />
                <Text style={styles.printBtnText}>Couldn't print — tap to retry</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="printer-outline" size={20} color="#FFFFFF" />
                <Text style={styles.printBtnText}>Print Receipt</Text>
              </>
            )}
          </TouchableOpacity>


          {/* Share Receipt Button */}
<TouchableOpacity
  style={styles.shareBtn}
  activeOpacity={0.85}
  onPress={handleShareReceipt}
  disabled={shareLoading}
>
  {shareLoading ? (
    <ActivityIndicator size="small" color="#FFFFFF" />
  ) : (
    <MaterialCommunityIcons
      name="whatsapp"
      size={21}
      color="#FFFFFF"
    />
  )}

  <Text style={styles.shareBtnText}>
    {shareLoading ? "Preparing Receipt..." : "Share Receipt on WhatsApp"}
  </Text>
</TouchableOpacity>

          {/* ── Done button ───────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.8}
            onPress={goToFreshCart}
          >
            <Text style={styles.doneBtnText}>Done</Text>
            <Feather name="arrow-right" size={16} color={ACCENT_DARK} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACCENT,
  },

  // Soft darker arc behind the icon to add depth without extra assets.
  bgAccent: {
    position: "absolute",
    top: -120,
    left: -60,
    right: -60,
    height: 320,
    backgroundColor: "rgba(0,0,0,0.07)",
    borderBottomLeftRadius: 280,
    borderBottomRightRadius: 280,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  iconWrapper: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  svgCircle: { position: "absolute" },

  checkIcon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  amount: {
    fontSize: 38,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  methodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },

  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#F1F5F9",
    marginVertical: 20,
  },

  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#0F172A",
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 12,
  },
  printBtnBusy: {
    backgroundColor: "#334155",
  },
  printBtnError: {
    backgroundColor: "#DC2626",
  },
  printBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  shareBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  backgroundColor: "#25D366",
  paddingVertical: 15,
  borderRadius: 14,
  marginBottom: 12,
},

shareBtnText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "700",
},
});