// screens/Profile/ProfileScreen.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  NativeModules,
  PermissionsAndroid,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";

const BASE_URL = "http://192.168.1.14:3001";

// 🖨️ Existing native Bluetooth printer module
const { BluetoothPrinter } = NativeModules;

// 🖨️ AsyncStorage key for persisting the selected printer
const PRINTER_STORAGE_KEY = "@dlume_selected_printer";

const DEFAULT_PROFILE = {
  name: "",
  email: "",
  phone: "",
  owner_name: "",
  owner_mobile: "",
  owner_email: "",
  address: "",
  area: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  alt_mobile: "",
  subscription_days_left: 0,
};

// Map the raw API/company shape into the flat shape this screen
// (and the printer receipt) expects.
const mapCompanyToProfile = (companyData, user) => {
  if (!companyData) return DEFAULT_PROFILE;

  return {
    _id: companyData._id,
    name: companyData.name || "",
    email: companyData.email || user?.email || "",
    phone: companyData.mobile || "",
    owner_name: companyData.owner_name || "",
    owner_mobile: companyData.owner_mobile || "",
    owner_email: companyData.owner_email || "",
    address: companyData.address || "",
    area: companyData.area || "",
    city: companyData.city || "",
    state: companyData.state || "",
    country: companyData.country || "India",
    pincode: companyData.pincode || "",
    alt_mobile: companyData.alt_mobile || "",
    subscription_days_left: companyData.subscription_days_left || 0,
  };
};

const MAX_CONTENT_WIDTH = 720;

/**
 * Underline text field — matches CustomerFormScreen's FormField:
 * label (+ red "*" if required) above, thin gray underline that turns
 * blue while focused, and a small "Read-only" tag when needed.
 */
function FormField({
  label,
  required,
  readOnly,
  value,
  onChangeText,
  onFocus,
  placeholder,
  keyboardType,
  multiline,
  inputRef,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
        {readOnly ? <Text style={styles.readOnlyBadge}>  (Read-only)</Text> : null}
      </Text>

      {readOnly ? (
        <View style={[styles.input, styles.readOnlyRow]}>
          <Text style={styles.readOnlyValue}>{value || "—"}</Text>
        </View>
      ) : (
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType || "default"}
          multiline={multiline}
          onFocus={() => {
            setFocused(true);
            onFocus && onFocus();
          }}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { borderBottomColor: focused ? COLORS.blue : COLORS.divider },
          ]}
        />
      )}
    </View>
  );
}

/** Read-only display value shown when the screen isn't in edit mode. */
function StaticField({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.staticRow}>
        <Text style={styles.staticValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ onBack, onClose }) {
  const handleBack = onBack || onClose || (() => {});

  // Company profile comes from AuthContext, so it's available to every
  // other screen (e.g. the printer receipt).
const {
  user,
  accessToken,
  company,
  companyLoading,
  fetchCompany,
} = useAuth();

  const profile = mapCompanyToProfile(company, user);

  const [draft, setDraft] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});

  // ── Printer Settings state ──
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [pairedDevices, setPairedDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

  // Keep draft in sync whenever the context's company changes (initial
  // load, pull-to-refresh, or an update made elsewhere) — but don't
  // clobber the draft while the user is actively editing.
useEffect(() => {
  if (!isEditing) {
    setDraft(mapCompanyToProfile(company, user));
  }
}, [company, user]);

useEffect(() => {
  if (!company && fetchCompany) {
    fetchCompany();
  }
}, []);

useEffect(() => {
  loadSelectedPrinter();
}, []);

  const handleEdit = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(profile);
    setIsEditing(false);
    Keyboard.dismiss();
  };

 const handleSave = async () => {
  try {
    if (!draft.name?.trim()) {
      Alert.alert("Missing info", "Business name cannot be empty.");
      return;
    }

    if (!draft.owner_name?.trim()) {
      Alert.alert("Missing info", "Owner name cannot be empty.");
      return;
    }

    if (!profile?._id) {
      Alert.alert("Error", "Company ID is missing.");
      return;
    }

    setSaving(true);

    console.log("========== SAVE COMPANY ==========");
    console.log("COMPANY ID:", profile._id);
console.log("URL:", `${BASE_URL}/api/companies/me`);
  console.log("TOKEN EXISTS:", !!accessToken);

  const response = await axios.put(
`${BASE_URL}/api/companies/me`,      {
        name: draft.name,
        owner_name: draft.owner_name,
        owner_mobile: draft.owner_mobile,
        owner_email: draft.owner_email,
        address: draft.address,
        area: draft.area,
        city: draft.city,
        state: draft.state,
        country: draft.country,
        pincode: draft.pincode,
        alt_mobile: draft.alt_mobile,
      },
      {
        headers: {
       Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("SAVE RESPONSE:", response.data);

    if (response.data?.success) {
      await fetchCompany();

      setIsEditing(false);
      Keyboard.dismiss();

      Alert.alert(
        "Saved",
        "Profile updated successfully."
      );
    } else {
      Alert.alert(
        "Error",
        response.data?.message || "Failed to save profile."
      );
    }

  } catch (error) {
    console.log("========== SAVE COMPANY ERROR ==========");
    console.log("MESSAGE:", error.message);
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);

    Alert.alert(
      "Error",
      error.response?.data?.message ||
        "Failed to save profile. Please try again."
    );
  } finally {
    setSaving(false);
  }
};

  const updateField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

const handleFieldFocus = (key) => {
  setTimeout(() => {
    const input = inputRefs.current[key];
    const sv = scrollViewRef.current;
    if (!input || !sv) return;

    const inner = sv.getInnerViewNode?.();
    if (!inner) return;

    input.measureLayout(
      inner,
      (x, y) => {
        sv.scrollTo({ y: Math.max(y - 120, 0), animated: true });
      },
      () => {}
    );
  }, 250);
};

  // ============================================================
  // 🖨️ PRINTER SETTINGS LOGIC
  // ============================================================

  const loadSelectedPrinter = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (stored) {
        setSelectedPrinter(JSON.parse(stored));
      }
    } catch (error) {
      console.log("Failed to load selected printer:", error.message);
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS !== "android") {
      return true;
    }

    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const scanGranted =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const connectGranted =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return scanGranted && connectGranted;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const loadPairedDevices = async () => {
    try {
      setLoadingDevices(true);

      if (!BluetoothPrinter || !BluetoothPrinter.getPairedDevices) {
        Alert.alert(
          "Unavailable",
          "Bluetooth printer support is not available on this device."
        );
        setPairedDevices([]);
        return;
      }

      const granted = await requestBluetoothPermissions();

      if (!granted) {
        Alert.alert(
          "Bluetooth Permission Required",
          "Please allow Bluetooth access to find paired printers."
        );
        setPairedDevices([]);
        return;
      }

      const devices = await BluetoothPrinter.getPairedDevices();
      setPairedDevices(Array.isArray(devices) ? devices : []);
    } catch (error) {
      console.log(
        "Failed to load paired devices:",
        error.response?.data || error.message
      );
      Alert.alert("Error", "Failed to load paired Bluetooth printers.");
      setPairedDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const openPrinterModal = () => {
    setPrinterModalVisible(true);
    loadPairedDevices();
  };

  const handleSelectPrinter = async (device) => {
    try {
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(device));
      setSelectedPrinter(device);
      setPrinterModalVisible(false);
    } catch (error) {
      console.log("Failed to save selected printer:", error.message);
      Alert.alert("Error", "Failed to save selected printer.");
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter?.address) return;

    try {
      setTestingPrint(true);

      if (
        !BluetoothPrinter ||
        !BluetoothPrinter.connect ||
        !BluetoothPrinter.testPrint
      ) {
        Alert.alert(
          "Unavailable",
          "Bluetooth printer support is not available on this device."
        );
        return;
      }

      await BluetoothPrinter.connect(selectedPrinter.address);
      await BluetoothPrinter.testPrint();
      Alert.alert("Success", "Test print sent successfully.");
    } catch (error) {
      console.log("Test print error:", error.message);
      Alert.alert("Error", "Unable to connect to printer.");
    } finally {
      setTestingPrint(false);
    }
  };

  // ============================================================

  const subscriptionColor = useMemo(() => {
    if (profile.subscription_days_left > 30) return COLORS.success || "#16A34A";
    if (profile.subscription_days_left > 7) return COLORS.warning || "#D97706";
    return COLORS.danger;
  }, [profile.subscription_days_left]);

  if (companyLoading && !company) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.centerFill]}>
          <ActivityIndicator size="large" color={COLORS.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  style={{ flex: 1 }}
  keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
>
        <View style={styles.container}>
          {/* Header — matches CustomerFormScreen's navy header */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={8} style={styles.headerIconBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textOnDark} />
            </Pressable>

            <Text style={styles.headerTitle}>Business Profile</Text>

            {isEditing ? (
              <View style={styles.headerButtons}>
                <Pressable
                  onPress={handleCancel}
                  disabled={saving}
                  hitSlop={8}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.textOnDark} />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleEdit} hitSlop={8} style={styles.saveBtn}>
                <Text style={styles.saveText}>Edit</Text>
              </Pressable>
            )}
          </View>

<ScrollView
  ref={scrollViewRef}
  style={styles.scroll}
  contentContainerStyle={[
    styles.scrollContent,
    isEditing && { paddingBottom: 280 },
  ]}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {profile.name?.charAt(0)?.toUpperCase() || "A"}
                </Text>
              </View>

              <Text style={styles.avatarCaption}>
                {isEditing ? "Editing profile" : profile.name || "Business"}
              </Text>

              <Text style={[styles.subscriptionText, { color: subscriptionColor }]}>
                {profile.subscription_days_left} Days Left
              </Text>
            </View>

            {/* Business Details */}
            <View style={styles.section}>
              <View style={styles.centerCol}>
                <Text style={styles.sectionTitle}>Business Details</Text>

                {isEditing ? (
                  <FormField
                    label="Business Name"
                    required
                    value={draft.name}
                    onChangeText={(t) => updateField("name", t)}
                    onFocus={() => handleFieldFocus("name")}
                    inputRef={(ref) => (inputRefs.current.name = ref)}
                  />
                ) : (
                  <StaticField label="Business Name" value={profile.name} />
                )}

                <StaticField label="Email (Login ID)" value={profile.email} />
                <StaticField label="Phone (Login ID)" value={profile.phone} />
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Owner Details */}
            <View style={styles.section}>
              <View style={styles.centerCol}>
                <Text style={styles.sectionTitle}>Owner Details</Text>

                {isEditing ? (
                  <>
                    <FormField
                      label="Owner Name"
                      required
                      value={draft.owner_name}
                      onChangeText={(t) => updateField("owner_name", t)}
                      onFocus={() => handleFieldFocus("owner_name")}
                      inputRef={(ref) => (inputRefs.current.owner_name = ref)}
                    />
                    <FormField
                      label="Owner Mobile"
                      value={draft.owner_mobile}
                      onChangeText={(t) => updateField("owner_mobile", t)}
                      onFocus={() => handleFieldFocus("owner_mobile")}
                      keyboardType="phone-pad"
                      inputRef={(ref) => (inputRefs.current.owner_mobile = ref)}
                    />
                    <FormField
                      label="Owner Email"
                      value={draft.owner_email}
                      onChangeText={(t) => updateField("owner_email", t)}
                      onFocus={() => handleFieldFocus("owner_email")}
                      keyboardType="email-address"
                      inputRef={(ref) => (inputRefs.current.owner_email = ref)}
                    />
                    <FormField
                      label="Alternate Mobile"
                      value={draft.alt_mobile}
                      onChangeText={(t) => updateField("alt_mobile", t)}
                      onFocus={() => handleFieldFocus("alt_mobile")}
                      keyboardType="phone-pad"
                      inputRef={(ref) => (inputRefs.current.alt_mobile = ref)}
                    />
                  </>
                ) : (
                  <>
                    <StaticField label="Owner Name" value={profile.owner_name} />
                    <StaticField label="Owner Mobile" value={profile.owner_mobile} />
                    <StaticField label="Owner Email" value={profile.owner_email} />
                    <StaticField label="Alternate Mobile" value={profile.alt_mobile} />
                  </>
                )}
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Address */}
            <View style={styles.section}>
              <View style={styles.centerCol}>
                <Text style={styles.sectionTitle}>Address</Text>

                {isEditing ? (
                  <>
                    <FormField
                      label="Address"
                      value={draft.address}
                      onChangeText={(t) => updateField("address", t)}
                      onFocus={() => handleFieldFocus("address")}
                      multiline
                      inputRef={(ref) => (inputRefs.current.address = ref)}
                    />
                    <FormField
                      label="Area"
                      value={draft.area}
                      onChangeText={(t) => updateField("area", t)}
                      onFocus={() => handleFieldFocus("area")}
                      inputRef={(ref) => (inputRefs.current.area = ref)}
                    />
                    <FormField
                      label="City"
                      value={draft.city}
                      onChangeText={(t) => updateField("city", t)}
                      onFocus={() => handleFieldFocus("city")}
                      inputRef={(ref) => (inputRefs.current.city = ref)}
                    />
                    <FormField
                      label="State"
                      value={draft.state}
                      onChangeText={(t) => updateField("state", t)}
                      onFocus={() => handleFieldFocus("state")}
                      inputRef={(ref) => (inputRefs.current.state = ref)}
                    />
                    <FormField
                      label="Country"
                      value={draft.country}
                      onChangeText={(t) => updateField("country", t)}
                      onFocus={() => handleFieldFocus("country")}
                      inputRef={(ref) => (inputRefs.current.country = ref)}
                    />
                    <FormField
                      label="Pincode"
                      value={draft.pincode}
                      onChangeText={(t) => updateField("pincode", t)}
                      onFocus={() => handleFieldFocus("pincode")}
                      keyboardType="number-pad"
                      inputRef={(ref) => (inputRefs.current.pincode = ref)}
                    />
                  </>
                ) : (
                  <>
                    <StaticField label="Address" value={profile.address} />
                    <StaticField label="Area" value={profile.area} />
                    <StaticField label="City" value={profile.city} />
                    <StaticField label="State" value={profile.state} />
                    <StaticField label="Country" value={profile.country} />
                    <StaticField label="Pincode" value={profile.pincode} />
                  </>
                )}
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Printer Settings */}
            <View style={styles.section}>
              <View style={styles.centerCol}>
                <View style={styles.printerCardHeader}>
                  <Ionicons
                    name="print-outline"
                    size={20}
                    color={COLORS.textPrimary}
                    style={styles.printerIcon}
                  />
                  <Text style={styles.sectionTitle}>Printer Settings</Text>
                </View>

                <View style={styles.printerInfoRow}>
                  <Text style={styles.label}>Receipt Printer</Text>

                  {selectedPrinter ? (
                    <>
                      <Text style={styles.printerName}>{selectedPrinter.name}</Text>
                      <Text style={styles.printerAddress}>{selectedPrinter.address}</Text>
                      <View style={styles.printerStatusRow}>
                        <Text style={styles.printerStatusLabel}>Status: </Text>
                        <Text style={[styles.printerStatusValue, styles.printerStatusSelected]}>
                          Selected
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.printerName}>No printer selected</Text>
                      <View style={styles.printerStatusRow}>
                        <Text style={styles.printerStatusLabel}>Status: </Text>
                        <Text
                          style={[styles.printerStatusValue, styles.printerStatusNotConfigured]}
                        >
                          Not configured
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.printerButtonRow}>
                  <Pressable onPress={openPrinterModal} style={styles.printerActionButton}>
                    <Text style={styles.printerActionButtonText}>Add / Change Printer</Text>
                  </Pressable>

                  {selectedPrinter && (
                    <Pressable
                      onPress={handleTestPrint}
                      disabled={testingPrint}
                      style={styles.testPrintButton}
                    >
                      {testingPrint ? (
                        <ActivityIndicator size="small" color={COLORS.blue} />
                      ) : (
                        <Text style={styles.testPrintButtonText}>Test Print</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            <View style={{ height: SPACING.xxl }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Printer Selection Modal */}
      <Modal
        visible={printerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPrinterModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Select Printer</Text>
                <Text style={styles.modalSubtitle}>Choose a paired Bluetooth printer</Text>
              </View>
              <Pressable
                onPress={() => setPrinterModalVisible(false)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Pressable
              onPress={loadPairedDevices}
              style={styles.refreshRow}
              disabled={loadingDevices}
            >
              <Text style={styles.refreshText}>
                {loadingDevices ? "Refreshing…" : "Refresh"}
              </Text>
            </Pressable>

            {loadingDevices ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={COLORS.blue} />
              </View>
            ) : pairedDevices.length === 0 ? (
              <View style={styles.emptyDevices}>
                <Text style={styles.emptyDevicesText}>
                  No paired Bluetooth printers found.
                </Text>
                <Text style={styles.emptyDevicesHint}>
                  Pair your printer in Android Bluetooth settings first.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.deviceList}>
                {pairedDevices.map((device) => {
                  const isSelected =
                    selectedPrinter && selectedPrinter.address === device.address;
                  return (
                    <Pressable
                      key={device.address}
                      style={styles.deviceRow}
                      onPress={() => handleSelectPrinter(device)}
                    >
                      <View>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceAddress}>{device.address}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={COLORS.blue} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  centerFill: {
    justifyContent: "center",
  },

  // ── Header (matches CustomerFormScreen) ──
  header: {
    height: 72,
    paddingTop: 8,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },

  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },

  headerTitle: {
    flex: 1,
    color: COLORS.textOnDark,
    fontSize: 19,
    fontWeight: "700",
  },

  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  cancelBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },

  cancelText: {
    color: COLORS.textOnDark,
    fontWeight: "600",
    fontSize: 15,
    opacity: 0.8,
  },

  saveBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },

  saveText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Scroll / sections (matches CustomerFormScreen) ──
  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.card,
  },

  centerCol: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },

  sectionDivider: {
    height: 8,
    backgroundColor: COLORS.bg,
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: "center",
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.card,
  },

  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },

  avatarLargeText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textOnDark,
  },

  avatarCaption: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  subscriptionText: {
    marginTop: SPACING.xs,
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Fields (matches CustomerFormScreen FormField) ──
  field: {
    marginBottom: SPACING.xl,
  },

  label: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },

  required: {
    color: COLORS.danger,
  },

  readOnlyBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },

  input: {
    fontSize: 17,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.divider,
  },

  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  readOnlyRow: {
    borderBottomColor: COLORS.divider,
  },

  readOnlyValue: {
    fontSize: 17,
    color: COLORS.textMuted,
  },

  staticRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  staticValue: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },

  // ── Printer Settings ──
  printerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  printerIcon: {
    marginBottom: SPACING.xl,
  },

  printerInfoRow: {
    marginBottom: SPACING.lg,
  },

  printerName: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginTop: SPACING.xs,
  },

  printerAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  printerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
  },

  printerStatusLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  printerStatusValue: {
    fontSize: 13,
    fontWeight: "700",
  },

  printerStatusSelected: {
    color: COLORS.success || "#16A34A",
  },

  printerStatusNotConfigured: {
    color: COLORS.danger,
  },

  printerButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },

  printerActionButton: {
    backgroundColor: COLORS.blueSoft || "#EFF6FF",
    borderWidth: 1,
    borderColor: COLORS.blueBorder || "#BFDBFE",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },

  printerActionButtonText: {
    color: COLORS.blue,
    fontWeight: "600",
    fontSize: 14,
  },

  testPrintButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 90,
    alignItems: "center",
  },

  testPrintButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },

  // ── Printer Modal (matches CustomerFormScreen's Select State sheet) ──
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: "75%",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },

  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.md,
  },

  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  modalCloseButton: {
    padding: SPACING.xs,
  },

  refreshRow: {
    alignSelf: "flex-end",
    marginBottom: SPACING.sm,
  },

  refreshText: {
    color: COLORS.blue,
    fontWeight: "600",
    fontSize: 14,
  },

  modalLoading: {
    paddingVertical: SPACING.xxl,
    alignItems: "center",
  },

  emptyDevices: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },

  emptyDevicesText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
    textAlign: "center",
  },

  emptyDevicesHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: "center",
  },

  deviceList: {
    maxHeight: 300,
  },

  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  deviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  deviceAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});