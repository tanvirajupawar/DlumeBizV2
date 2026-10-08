import React, { forwardRef } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../components/Colors";

const SearchBar = forwardRef(({
  value,
  onChangeText,
  onSubmitEditing = () => {},
  onScanPress,
  placeholder = "Search products by name or SKU",
  compact = false,
  showScan = true,
}, ref) => {
  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={[styles.searchBox, compact && styles.searchBoxCompact]}>
        <MaterialCommunityIcons
          name="magnify"
          size={compact ? 20 : 22}
          color={colors.textMuted}
        />

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          blurOnSubmit={false}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, compact && styles.inputCompact]}
        />
      </View>

      {showScan && (
        <TouchableOpacity
          onPress={onScanPress}
          style={[styles.scanButton, compact && styles.scanButtonCompact]}
        >
          <MaterialCommunityIcons
            name="barcode-scan"
            size={20}
            color={colors.primaryDark}
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default SearchBar;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  wrapperCompact: {
    marginBottom: 0,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    height: 50,
    ...shadow.cardSm,
  },
  searchBoxCompact: {
    backgroundColor: colors.background,
    height: 42,
    paddingHorizontal: spacing.md,
    shadowOpacity: 0,
    elevation: 0,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14.5,
    color: colors.textPrimary,
    height: '100%',
  },
  inputCompact: {
    fontSize: 13.5,
  },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadow.cardSm,
  },
  scanButtonCompact: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    shadowOpacity: 0,
    elevation: 0,
  },
});