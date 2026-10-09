// src/screens/ProductCatalog/ProductFormScreen.js
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  UIManager,
  findNodeHandle,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Reuse the dropdown + sheet already built for this purpose.
import { CategoryDropdown } from "./ProductCatalogScreen";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";

const MAX_CONTENT_WIDTH = 720;

const emptyForm = {
  product: "",
  barcode: "",
  image: "",
  type: "",
  size: "",
  hsn: "",
  purchase_price: "",
  mrp: "",
  stock: "",
  unit: "",
  barcode_qty: "",
  is_active: true,
};

const buildInitialForm = (product) => {
  if (!product) return emptyForm;
  return {
    product: product.product ?? "",
    barcode: product.barcode ?? "",
    image: product.image ?? "",
    type: product.type ?? "",
    size: product.size ?? "",
    hsn: product.hsn ?? "",
    purchase_price:
      product.purchase_price != null ? String(product.purchase_price) : "",
    mrp: product.mrp != null ? String(product.mrp) : "",
    stock: product.stock != null ? String(product.stock) : "",
    unit: product.unit ?? "",
    barcode_qty:
      product.barcode_qty != null ? String(product.barcode_qty) : "",
    is_active: product.is_active ?? true,
  };
};

/**
 * A single underline text field, styled to match CustomerFormScreen's
 * FormField exactly: label (+ red "*" if required) above, thin gray
 * underline that turns blue while focused.
 *
 * Supports an `editable` flag (defaults to true) so fields like the
 * auto-generated Barcode can be shown but not typed into, and an
 * optional `hint` line rendered under the input when there's no error.
 */
function FormField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  onFocus,
  editable = true,
  hint,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View
        style={[
          !editable && styles.inputDisabledWrap,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            !editable && styles.inputDisabled,
            {
              borderBottomColor: error
                ? COLORS.danger
                : focused
                ? COLORS.blue
                : editable
                ? COLORS.divider
                : "transparent",
            },
          ]}
        />
      </View>
      {!!hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const ProductFormScreen = ({
  product = null,
  categories = [],
  initialCategoryId = "",
  onSave,
  onCancel,
  loading: loadingParam = false,
}) => {
  const scrollRef = useRef(null);

  const [form, setForm] = useState(() => buildInitialForm(product));
  const [errors, setErrors] = useState({});
  const [categoryId, setCategoryId] = useState(
    product
      ? (product.category_id || product.category?._id || initialCategoryId || "")
      : initialCategoryId
  );
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
  }, []);

  // Tracks whichever input is currently focused so the keyboard listener
  // below knows what to scroll to once the keyboard finishes animating.
  const focusedInputRef = useRef(null);

  const scrollFocusedInputIntoView = useCallback(() => {
    const target = focusedInputRef.current;
    const inputHandle = findNodeHandle(target);
    const scrollHandle = findNodeHandle(scrollRef.current);
    if (!target || !inputHandle || !scrollHandle) return;

    UIManager.measureLayout(
      inputHandle,
      scrollHandle,
      () => {
        // Measurement failed silently — not critical, just skip scrolling.
      },
      (x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
      }
    );
  }, []);

  // Fire the scroll exactly when the keyboard has finished showing, instead
  // of guessing with a fixed delay — avoids a second animation competing
  // with the keyboard's own show animation.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(showEvent, scrollFocusedInputIntoView);
    return () => subscription.remove();
  }, [scrollFocusedInputIntoView]);

  // Attach to onFocus on any TextInput inside the ScrollView.
  const handleFieldFocus = useCallback((event) => {
    focusedInputRef.current = event.target;
    // If the keyboard is already up (e.g. moving between fields), the
    // keyboardDidShow/keyboardWillShow event won't fire again, so scroll now.
    scrollFocusedInputIntoView();
  }, [scrollFocusedInputIntoView]);

  // This is the ONLY place in the app the product image can be changed —
  // the catalog's category-tab cards are read-only for images.
  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploadingImage(true);
      const imageUri = result.assets[0].uri;

      // Show local preview immediately
      updateField("image", imageUri);

      // Convert to Base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });

      const response = await fetch(
        "http://192.168.1.14:3001/api/upload/product-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: `data:image/jpeg;base64,${base64}`,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        updateField("image", data.image.url);
        setUploadingImage(false);
        Alert.alert("Success", "Image uploaded successfully.");
      } else {
        setUploadingImage(false);
        Alert.alert("Upload Failed", data.message);
      }
    } catch (err) {
      setUploadingImage(false);
      Alert.alert("Error", "Failed to upload image.");
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.product || !form.product.trim()) {
      nextErrors.product = "Product name is required.";
    }
 
    if (form.purchase_price && isNaN(Number(form.purchase_price))) {
      nextErrors.purchase_price = "Must be a number.";
    }
    if (form.mrp && isNaN(Number(form.mrp))) {
      nextErrors.mrp = "Must be a number.";
    }
    if (form.stock && isNaN(Number(form.stock))) {
      nextErrors.stock = "Must be a number.";
    }
    if (form.barcode_qty && isNaN(Number(form.barcode_qty))) {
      nextErrors.barcode_qty = "Must be a number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const selectedCategory = categories.find((c) => c._id === categoryId);

  const handleSave = async () => {
    if (uploadingImage) {
      Alert.alert("Please wait", "Image is still uploading.");
      return;
    }
    if (!validate()) return;

const payload = {
  product: form.product.trim(),
  barcode: form.barcode.trim(),
  image: form.image,
  type: form.type.trim(),
  size: form.size.trim(),
  hsn: form.hsn.trim(),
  purchase_price: form.purchase_price
    ? Number(form.purchase_price)
    : 0,
  mrp: form.mrp
    ? Number(form.mrp)
    : 0,
  stock: form.stock
    ? Number(form.stock)
    : 0,
  unit: form.unit.trim(),
  barcode_qty: form.barcode_qty
    ? Number(form.barcode_qty)
    : 0,
  is_active: form.is_active,
};

// Only attach category when one is actually selected
if (categoryId) {
  payload.category_id = categoryId;
  payload.category =
    selectedCategory?.category ||
    selectedCategory?.category_name ||
    "";
}

    try {
      setSaving(true);
      if (onSave) {
        await onSave(payload);
      }
      if (onCancel) onCancel(); // return to the catalog tab on success
    } catch {
      // Caller's onSave shows its own error Alert; just stop here.
    } finally {
      setSaving(false);
    }
  };

  const isLoading = saving || loadingParam;
  const saveDisabled = isLoading || uploadingImage;

  const saveLabel = uploadingImage
    ? "Uploading..."
    : isLoading
    ? "Saving..."
    : "Save";

  return (
    <SafeAreaView style={styles.safe} testID="product-form-safe-area">
      {/* Header — matches CustomerFormScreen / CategoryModal exactly */}
      <View style={styles.header}>
        <Pressable
          onPress={onCancel}
          hitSlop={8}
          style={styles.headerIconBtn}
          testID="product-form-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textOnDark} />
        </Pressable>
        <Text style={styles.headerTitle}>{product ? "Edit Product" : "New Product"}</Text>
        <Pressable
          onPress={handleSave}
          hitSlop={8}
          style={styles.saveBtn}
          disabled={saveDisabled}
          testID="product-form-save-button"
        >
          <Text style={[styles.saveText, saveDisabled && styles.saveTextDisabled]}>
            {saveLabel}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Product Details */}
          <View style={styles.section}>
            <View style={styles.centerCol}>
              <Text style={styles.sectionTitle}>Product Details</Text>

              {/* Product Image — the only editable image surface in the app */}
              <View style={styles.field}>
                <Text style={styles.label}>Product Image</Text>

                <Pressable
                  style={styles.imagePicker}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {form.image ? (
                    <Image source={{ uri: form.image }} style={styles.productImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                    </View>
                  )}

                  {uploadingImage && (
                    <View style={styles.imageUploadingOverlay}>
                      <ActivityIndicator size="small" color={COLORS.textOnDark} />
                    </View>
                  )}

                  <View style={styles.imageEditBadge}>
                    <Text style={styles.imageEditBadgeText}>Edit</Text>
                  </View>
                </Pressable>
              </View>

              {/* Category */}
              <View style={styles.field}>
               <Text style={styles.label}>
  Category
</Text>
             <CategoryDropdown
  categories={categories}
  value={categoryId}
  onChange={(id) => {
    setCategoryId(id);
    setErrors((prev) =>
      prev.category
        ? { ...prev, category: null }
        : prev
    );
  }}
/>
                {!!errors.category && (
                  <Text style={styles.errorText}>{errors.category}</Text>
                )}
              </View>

              <FormField
                label="Product Name"
                required
                value={form.product}
                onChangeText={(v) => updateField("product", v)}
                placeholder="e.g. Cotton Saree"
                onFocus={handleFieldFocus}
                error={errors.product}
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormField
                    label="Type"
                    value={form.type}
                    onChangeText={(v) => updateField("type", v)}
                    placeholder="e.g. Saree, Kurti"
                    onFocus={handleFieldFocus}
                  />
                </View>
                <View style={styles.halfField}>
                  <FormField
                    label="Size"
                    value={form.size}
                    onChangeText={(v) => updateField("size", v)}
                    placeholder="e.g. M, L, Free"
                    onFocus={handleFieldFocus}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  {/* Barcode is auto-generated elsewhere and shown here
                      read-only so it stays visible but can't be edited. */}
                  <FormField
                    label="Barcode"
                    value={form.barcode}
                    onChangeText={(v) => updateField("barcode", v)}
                    placeholder="Auto-generated"
                    editable={false}
                    hint="Auto-generated"
                    onFocus={handleFieldFocus}
                  />
                </View>
                <View style={styles.halfField}>
                  <FormField
                    label="HSN"
                    value={form.hsn}
                    onChangeText={(v) => updateField("hsn", v)}
                    placeholder="HSN code"
                    onFocus={handleFieldFocus}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Section separator strip */}
          <View style={styles.sectionDivider} />

          {/* Pricing & Stock */}
          <View style={styles.section}>
            <View style={styles.centerCol}>
              <Text style={styles.sectionTitle}>Pricing &amp; Stock</Text>

              <View style={styles.row}>
                <View style={styles.thirdField}>
                  <FormField
                    label="Purchase Price"
                    value={form.purchase_price}
                    onChangeText={(v) => updateField("purchase_price", v)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onFocus={handleFieldFocus}
                    error={errors.purchase_price}
                  />
                </View>
                <View style={styles.thirdField}>
                  <FormField
                    label="MRP"
                    value={form.mrp}
                    onChangeText={(v) => updateField("mrp", v)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onFocus={handleFieldFocus}
                    error={errors.mrp}
                  />
                </View>
                <View style={styles.thirdField}>
                  <FormField
                    label="Opening Stock"
                    value={form.stock}
                    onChangeText={(v) => updateField("stock", v)}
                    placeholder="0"
                    keyboardType="number-pad"
                    onFocus={handleFieldFocus}
                    error={errors.stock}
                  />
                </View>
              </View>

              <View style={styles.row}>
                {/* <View style={styles.halfField}>
                  <FormField
                    label="Unit"
                    value={form.unit}
                    onChangeText={(v) => updateField("unit", v)}
                    placeholder="e.g. pcs, kg"
                    onFocus={handleFieldFocus}
                  />
                </View> */}
                <View style={styles.halfField}>
                  <FormField
                    label="Barcode Qty"
                    value={form.barcode_qty}
                    onChangeText={(v) => updateField("barcode_qty", v)}
                    placeholder="e.g. 1"
                    keyboardType="number-pad"
                    onFocus={handleFieldFocus}
                    error={errors.barcode_qty}
                  />
                </View>
              </View>

              {/* Active toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.label}>Active</Text>
                  <Text style={styles.toggleHint}>
                    {form.is_active ? "Visible and sellable in POS" : "Hidden from POS"}
                  </Text>
                </View>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) => updateField("is_active", v)}
                  trackColor={{ false: COLORS.divider, true: COLORS.blue }}
                  thumbColor={form.is_active ? COLORS.card : "#F1F5F9"}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  // ── Header — matches CustomerFormScreen / CategoryModal ──
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
  sectionDivider: {
    height: 8,
    backgroundColor: COLORS.bg,
  },

  // ── Fields ──
  field: {
    marginBottom: SPACING.xl,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.lg,
  },
  halfField: {
    flex: 1,
  },
  thirdField: {
    flex: 1,
    minWidth: 0,
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
  inputDisabledWrap: {
    backgroundColor: "#F1F5F9",
    borderRadius: RADIUS.sm ?? 6,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: SPACING.sm,
  },
  inputDisabled: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    borderBottomWidth: 0,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    fontWeight: "500",
  },

  // ── Active toggle ──
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  toggleHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // ── Product image ──
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  imagePlaceholderText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imageEditBadgeText: {
    color: COLORS.textOnDark,
    fontSize: 10,
    fontWeight: "700",
  },
});

export default ProductFormScreen;