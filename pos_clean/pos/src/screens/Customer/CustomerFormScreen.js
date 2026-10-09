// src/components/CustomerFormScreen.js
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import HeaderButton from "../../components/HeaderButton";





const MAX_CONTENT_WIDTH = 720;

// Indian States & Union Territories. Order kept to match the reference
// screenshot for the first entries, remaining items follow alphabetically.
const STATES = [
  "Jammu and Kashmir",
  "Himachal Pradesh",
  "Punjab",
  "Chandigarh",
  "Uttarakhand",
  "Haryana",
  "Delhi",
  "Rajasthan",
  "Uttar Pradesh",
  "Bihar",
  "Sikkim",
  "Arunachal Pradesh",
  "Nagaland",
  "Manipur",
  "Mizoram",
  "Tripura",
  "Meghalaya",
  "Assam",
  "West Bengal",
  "Jharkhand",
  "Odisha",
  "Chhattisgarh",
  "Madhya Pradesh",
  "Gujarat",
  "Daman and Diu",
  "Dadra and Nagar Haveli",
  "Maharashtra",
  "Andhra Pradesh",
  "Karnataka",
  "Goa",
  "Lakshadweep",
  "Kerala",
  "Tamil Nadu",
  "Puducherry",
  "Andaman and Nicobar Islands",
  "Telangana",
  "Ladakh",
];

/**
 * A single underline text field, matching the reference screenshot:
 * label (+ red "*" if required) above, placeholder text below, thin
 * gray underline that turns blue while focused.
 */
function FormField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { borderBottomColor: focused ? COLORS.blue : COLORS.divider },
        ]}
      />
    </View>
  );
}

/** A tappable "select" row styled like a field but with a chevron. */
function SelectField({ label, value, onPress }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={[styles.input, styles.selectRow, { borderBottomColor: COLORS.divider }]}
      >
        <Text style={styles.selectValue}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function CustomerFormScreen({
  values = {},
  onChange = () => {},
  onBack,
  onSave,
}) {
const {
  name = "",
  mobile = "",
  email = "",
  company_name = "",
  address1 = "",
  address2 = "",
  state = "",
  opening_balance = "",
} = values;

 const [saving, setSaving] = useState(false);          

  const handleSave = async () => {                      
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateQuery, setStateQuery] = useState("");

  const filteredStates = useMemo(() => {
    if (!stateQuery.trim()) return STATES;
    const q = stateQuery.trim().toLowerCase();
    return STATES.filter((s) => s.toLowerCase().includes(q));
  }, [stateQuery]);

  const closeStateModal = () => {
    setStateQuery("");
    setStateModalVisible(false);
  };

  const handleSelectState = (selected) => {
    onChange("state", selected);
    closeStateModal();
  };

  return (
  <SafeAreaView
  style={styles.safe}
  edges={["top", "bottom"]}
  testID="customer-form-safe-area"
>
  <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.headerIconBtn}
          testID="customer-form-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textOnDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Customer</Text>
      <HeaderButton
  title="Save"
  onPress={handleSave}
  loading={saving}
  testID="customer-form-save-button"
/>
      </View>

<View style={styles.body}>
  <KeyboardAvoidingView
    style={styles.keyboardContainer}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={0}
  >
<ScrollView
  style={styles.scroll}
  contentContainerStyle={styles.scrollContent}
  keyboardShouldPersistTaps="always"
  keyboardDismissMode="none"
>
        {/* Personal Details */}
        <View style={styles.section}>
          <View style={styles.centerCol}>
            <Text style={styles.sectionTitle}>Personal Details</Text>

            <FormField
              label="Customer Name"
              required
              value={name}
              onChangeText={(t) => onChange("name", t)}
            />
            <FormField
  label="Company Name"
  value={company_name}
  onChangeText={(t) => onChange("company_name", t)}
  placeholder="e.g. ABC Traders"
/>
            <FormField
              label="Mobile Number"
              value={mobile}
              onChangeText={(t) => onChange("mobile", t)}
              placeholder="e.g. 9999999999"
              keyboardType="phone-pad"
            />
            <FormField
              label="E-mail"
              value={email}
              onChangeText={(t) => onChange("email", t)}
              placeholder="e.g. customername@domain.com"
              keyboardType="email-address"
            />
            <FormField
  label="Opening Balance"
  value={opening_balance}
  onChangeText={(t) => onChange("opening_balance", t)}
  placeholder="e.g. 5000"
  keyboardType="numeric"
/>

          </View>
        </View>

        {/* Section separator strip — stays full-width like the reference */}
        <View style={styles.sectionDivider} />

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.centerCol}>
            <Text style={styles.sectionTitle}>Address</Text>

            <FormField
              label="Address Line 1"
              value={address1}
              onChangeText={(t) => onChange("address1", t)}
              placeholder="#House/Apartment no., Street name"
            />
            <FormField
              label="Address Line 2"
              value={address2}
              onChangeText={(t) => onChange("address2", t)}
              placeholder="Area name"
            />
            <SelectField
              label="State"
              value={state || "Select State"}
              onPress={() => setStateModalVisible(true)}
            />
          </View>
        </View>
   </ScrollView>
</KeyboardAvoidingView>
</View>

{/* Select State bottom sheet */}

      {/* Select State bottom sheet */}
      <Modal
        visible={stateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeStateModal}
        testID="state-select-modal"
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeStateModal}
            testID="state-select-backdrop"
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>Select State</Text>

            <View style={styles.searchRow}>
              <Ionicons
                name="search"
                size={18}
                color={COLORS.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                value={stateQuery}
                onChangeText={setStateQuery}
                placeholder="Search State"
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                testID="state-select-search-input"
              />
            </View>

            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === state;
                return (
                  <Pressable
                    onPress={() => handleSelectState(item)}
                    style={styles.stateRow}
                    testID={`state-option-${item}`}
                  >
                    <Text
                      style={[
                        styles.stateRowText,
                        isSelected && styles.stateRowTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={COLORS.blue} />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No states found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
safe: {
  flex: 1,
  backgroundColor: COLORS.navyDeep,
},

  // ── Header ──
header: {
  height: 64,
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
  saveBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  saveText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: "700",
  },  
  body: {
  flex: 1,
  width: "100%",
  backgroundColor: COLORS.card,
},

  // ── Scroll / sections ──
  keyboardContainer: {
  flex: 1,
},

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 120,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  /* centers content in a max-width column, like ManageCartItemModal */
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

  // ── Fields ──
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 21,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.danger,
  },
  input: {
    fontSize: 19,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1.5,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  // ── Select State modal ──
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: "85%",
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
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
  },
  list: {
    marginTop: SPACING.sm,
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
  },
  stateRowText: {
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  stateRowTextSelected: {
    color: COLORS.blue,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: SPACING.xl,
  },
});