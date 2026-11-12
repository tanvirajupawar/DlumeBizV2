import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  Alert,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import COLORS from "../../constants/colors";
import { addPayment } from "../../api/CustomerApi";
import MainLayout from "../../layouts/MainLayout";

export default function PaymentScreen({ route, navigation }) {
  const { clientId, outstanding, companyName, customerName } = route.params;

  const exceededOnceRef = useRef(false);
  const lastValidAmountRef = useRef("");
  const scrollViewRef = useRef(null);

  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [paymentData, setPaymentData] = useState({
    amount: "",
    date: today,
    remarks: "",
    paymentMode: "",
    transactionId: "",
    client_id: clientId,
    outstanding: Number(outstanding || 0),
  });

  useEffect(() => {
    if (!paymentData.amount) {
      exceededOnceRef.current = false;
      lastValidAmountRef.current = "";
    }
  }, [paymentData.amount]);

  const handleSubmit = async () => {
    const amount = Number(paymentData.amount);
    const outstandingVal = Number(paymentData.outstanding);

    if (!amount || !paymentData.paymentMode) {
      Alert.alert("Missing Fields", "Please enter amount and select payment method.");
      return;
    }

    if (amount > outstandingVal) {
      Alert.alert("Invalid Amount", `Payment amount cannot exceed ₹${outstandingVal}`);
      return;
    }

    try {
      setLoadingPayment(true);
      const result = await addPayment(paymentData);
      console.log("🟣 PAYMENT RESPONSE:", result);
      navigation.replace("PaymentSuccess", { amount, routes: 'Customers' });
    } catch (err) {
      console.log("🔴 PAYMENT ERROR:", err);
      navigation.replace("PaymentFailed", { amount , routes: 'Customers'});
    } finally {
      setLoadingPayment(false);
    }
  };

  const isSubmitDisabled =
    !paymentData.amount ||
    !paymentData.paymentMode ||
    !paymentData.remarks ||
    loadingPayment;

  const confirmCancel = () => {
    Alert.alert("Cancel", "Discard changes?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: navigation.goBack },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <MainLayout navigation={navigation} currentRoute="PaymentScreen">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 26,
              paddingBottom: 80,
              paddingTop: 10,
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              {(companyName || customerName) && (
                <Text style={styles.title}>{companyName || customerName}</Text>
              )}
            </View>

            {/* Outstanding Balance Card */}
            <View style={styles.outstandingCard}>
              <View style={styles.outstandingHeader}>
                <Ionicons name="wallet-outline" size={18} color="#DC2626" />
                <Text style={styles.outstandingLabel}>Outstanding Balance</Text>
              </View>
              <Text style={styles.outstandingAmount}>
                ₹{Number(paymentData.outstanding).toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Payment Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Details</Text>

              {/* Payment Amount */}
              <View style={styles.floatingInputWrap}>
                <Text style={styles.floatingLabel}>
                  Payment Amount <Text style={styles.asterisk}>*</Text>
                </Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={paymentData.amount}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    style={styles.floatingInput}
                    onChangeText={(t) => {
                      const numeric = Number(t);

                      if (t === "") {
                        lastValidAmountRef.current = "";
                        exceededOnceRef.current = false;
                        setPaymentData({ ...paymentData, amount: "" });
                        return;
                      }

                      if (isNaN(numeric)) return;

                      if (numeric > paymentData.outstanding) {
                        if (!exceededOnceRef.current) {
                          Alert.alert(
                            "Limit Exceeded",
                            `Maximum payable amount is ₹${paymentData.outstanding}`
                          );
                          exceededOnceRef.current = true;
                        }
                        setPaymentData({
                          ...paymentData,
                          amount: lastValidAmountRef.current,
                        });
                        return;
                      }

                      exceededOnceRef.current = false;
                      lastValidAmountRef.current = t;
                      setPaymentData({ ...paymentData, amount: t });
                    }}
                  />
                </View>
              </View>
              <Text style={styles.helperText}>
                Maximum: ₹{paymentData.outstanding.toLocaleString("en-IN")}
              </Text>

              {/* Payment Method */}
              <Text style={[styles.label, { marginTop: 16 }]}>
                Payment Method <Text style={styles.asterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowMethodDropdown(!showMethodDropdown)}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    paymentData.paymentMode
                      ? styles.dropdownText
                      : styles.dropdownPlaceholder
                  }
                >
                  {paymentData.paymentMode || "Select payment method"}
                </Text>
                <Text style={styles.dropdownIcon}>▾</Text>
              </TouchableOpacity>

              {showMethodDropdown && (
                <View style={styles.dropdownMenu}>
                  {["Cash", "UPI"].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setPaymentData({ ...paymentData, paymentMode: method });
                        setShowMethodDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={method === "Cash" ? "cash-outline" : "card-outline"}
                        size={20}
                        color="#2563EB"
                      />
                      <Text style={styles.dropdownItemText}>{method}</Text>
                      {paymentData.paymentMode === method && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color="#2563EB"
                          style={{ marginLeft: "auto" }}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Payment Date */}
              <Text style={[styles.label, { marginTop: 16 }]}>Payment Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {new Date(paymentData.date).toLocaleDateString("en-IN")}
                </Text>
                <Text style={styles.dropdownIcon}>📅</Text>
              </TouchableOpacity>

              {/* Transaction ID */}
              {/* <Text style={[styles.label, { marginTop: 16 }]}>
                Transaction ID (Optional)
              </Text> */}
              {/* <TextInput
                value={paymentData.transactionId}
                onChangeText={(t) =>
                  setPaymentData({ ...paymentData, transactionId: t })
                }
                style={styles.input}
                placeholder="Enter transaction reference"
                placeholderTextColor="#94A3B8"
              /> */}

              {/* Remarks */}
              <Text style={[styles.label, { marginTop: 16 }]}>
                Remarks <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                value={paymentData.remarks}
                onChangeText={(t) => setPaymentData({ ...paymentData, remarks: t })}
                style={[styles.input, styles.textArea]}
                placeholder="Add payment notes or remarks"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Summary Card */}
            {/* <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount Paying</Text>
                <Text style={styles.summaryValue}>
                  ₹{paymentData.amount ? Number(paymentData.amount).toLocaleString("en-IN") : "0"}
                </Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 8 }]}>
                <Text style={styles.summaryLabel}>Remaining Balance</Text>
                <Text style={styles.remainingValue}>
                  ₹{(paymentData.outstanding - (Number(paymentData.amount) || 0)).toLocaleString("en-IN")}
                </Text>
              </View>
            </View> */}

            {/* Action Buttons */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={confirmCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitDisabled && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryText}>
                  {loadingPayment ? "Processing..." : "Submit Payment"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Picker - Android */}
        {Platform.OS === "android" && showDatePicker && (
          <DateTimePicker
            value={paymentData.date ? new Date(paymentData.date) : new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === "dismissed") return;
              if (date) {
                setPaymentData({
                  ...paymentData,
                  date: date.toISOString().split("T")[0],
                });
              }
            }}
          />
        )}

        {/* Date Picker Modal - iOS */}
        {Platform.OS === "ios" && (
          <Modal visible={showDatePicker} transparent animationType="fade">
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowDatePicker(false)}
            >
              <Pressable style={[styles.modalCard, { padding: 0 }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={paymentData.date ? new Date(paymentData.date) : new Date()}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    if (date) {
                      setPaymentData({
                        ...paymentData,
                        date: date.toISOString().split("T")[0],
                      });
                    }
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </MainLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
  },

  // Outstanding Card
  outstandingCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  outstandingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  outstandingLabel: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
  },
  outstandingAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },

  // Labels
  label: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
    fontWeight: "500",
  },
  asterisk: {
    color: "#DC2626",
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  // Floating Input (for amount)
  floatingInputWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    height: 54,
  },
  floatingLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 6,
  },
  floatingInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    padding: 0,
    margin: 0,
  },

  // Regular Input
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 50,
    textAlignVertical: "top",
    paddingTop: 12,
  },

  // Dropdown
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dropdownText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#94A3B8",
  },
  dropdownIcon: {
    fontSize: 16,
  },

  // Dropdown Menu
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Form Actions
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 0,
    marginBottom: 20,
  },
  secondaryBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  primaryBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
  },

  // Date Picker
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  datePickerCancel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  datePickerDone: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563EB",
  },
});