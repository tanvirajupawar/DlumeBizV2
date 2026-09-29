// src/components/CategoryModal.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "./Colors";

const MAX_CONTENT_WIDTH = 720;

/**
 * A single underline text field, styled to match CustomerFormScreen's
 * FormField exactly: label (+ red "*" if required) above, thin gray
 * underline that turns blue while focused.
 */
function FormField({ label, required, value, onChangeText, placeholder, editable = true }) {
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        style={[
          styles.input,
          { borderBottomColor: focused ? COLORS.blue : COLORS.divider },
        ]}
      />
    </View>
  );
}

export default function CategoryModal({ visible, category, loading, onClose, onSave, onDelete }) {
  const isEdit = !!category;
  const [name, setName] = useState("");

  useEffect(() => {
    if (visible) {
      setName(category?.category || "");
    }
  }, [visible, category]);

  const handleSave = () => {
    if (!name.trim() || loading) return;
    onSave?.({ category: name.trim() });
  };

  const confirmClose = () => {
    if (!name.trim() || name === category?.category) {
      onClose?.();
      return;
    }
    Alert.alert(
      "Discard changes?",
      "Your changes will not be saved.",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: onClose },
      ],
      { cancelable: true }
    );
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete category?",
      `"${category?.category || "This category"}" will be removed. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  const showDelete = isEdit && !!onDelete;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={confirmClose}>
      <SafeAreaView style={styles.safe} testID="category-form-safe-area">
        {/* Header — matches CustomerFormScreen exactly */}
        <View style={styles.header}>
          <Pressable
            onPress={confirmClose}
            hitSlop={8}
            style={styles.headerIconBtn}
            testID="category-form-back-button"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textOnDark} />
          </Pressable>
          <Text style={styles.headerTitle}>{isEdit ? "Edit Category" : "Add Category"}</Text>
          <Pressable
            onPress={handleSave}
            hitSlop={8}
            style={styles.saveBtn}
            disabled={!name.trim() || loading}
            testID="category-form-save-button"
          >
            <Text style={[styles.saveText, (!name.trim() || loading) && styles.saveTextDisabled]}>
              {loading ? "Saving..." : isEdit ? "Update Category" : "Add Category"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.centerCol}>
              <Text style={styles.sectionTitle}>Category Details</Text>

              <FormField
                label="Category Name"
                required
                value={name}
                onChangeText={setName}
                placeholder="e.g. Beverages"
                editable={!loading}
              />

              {showDelete && (
                <Pressable
                  onPress={handleDeletePress}
                  disabled={loading}
                  style={styles.deleteRow}
                  testID="category-form-delete-button"
                >
                  <Text style={styles.deleteText}>Delete Category</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  // ── Header ──
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
  saveBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  saveText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: "700",
  },
  saveTextDisabled: {
    opacity: 0.5,
  },

  // ── Scroll / sections ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
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

  // ── Delete ──
  deleteRow: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  deleteText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.danger,
  },
});