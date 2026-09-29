// src/components/Header.js
  import React, { useState } from "react";
  import {
    View,
    Text,
    Pressable,
    StyleSheet,
    TextInput,
  } from "react-native";
  import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
  import { COLORS, SPACING, RADIUS } from "./Colors";

  /**
   * Dark-navy top header. Left region hosts menu + order dropdown + search/scan
   * tools. Right region hosts (optional `children`, e.g. a filter dropdown) +
   * the title + held-carts badge + view-all-held button + customer + more.
   *
   * All handlers are optional so this can be dropped into POSScreen without
   * changing its business logic.
   */
export default function Header({
  title = "Cart",
  leftWidth,
    alwaysShowSearch = false,
  hideSearch = false,
  hideScanner = false,
  hideCustomer = false,
  hideHeldCarts = false,
  hideViewHeldCarts = false,
  hideMore = false,
  hideAdd = true,
  addLabel,
  onMenuPress,
  onSearchPress,
  onScanPress,
  onCustomerPress,
  customerSelected = false,
  onMorePress,
  onHeldCartsPress,
   onAddPress,
  heldCartsCount = 0,
  onViewHeldCartsPress,
  rightExtra,
  searchInputRef,
  searchValue,
  onSearchChange,
  onSubmitEditing,
  children, // rendered immediately to the left of the title text
}) {
const [searchActive, setSearchActive] = useState(alwaysShowSearch);
    const activateSearch = () => {
      setSearchActive(true);
      searchInputRef?.current?.focus();
      onSearchPress?.();
    };

const closeSearch = () => {
  if (alwaysShowSearch) return;

  searchInputRef?.current?.blur();
  onSearchChange?.("");
  setSearchActive(false);
};

    return (
    <View style={styles.container} testID="pos-header">
        {/* LEFT — products side */}
      <View style={[styles.left, leftWidth ? { flex: 0, width: leftWidth } : null]}>
               <Pressable
            onPress={onMenuPress}
            hitSlop={8}
            style={styles.iconBtn}
            testID="header-menu-button"
            focusable={false}
            android_disableSound={true}
          >
            <Ionicons name="menu" size={30} color={COLORS.textOnDark} />
          </Pressable>

          <View style={styles.leftTools}>
         {!hideSearch && (
  searchActive ? (
    <View style={styles.searchFieldWrap}>
      {!alwaysShowSearch && (
        <Pressable
          onPress={closeSearch}
          hitSlop={8}
          style={styles.searchBackBtn}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textOnDark}
          />
        </Pressable>
      )}

      <TextInput
        ref={searchInputRef}
        value={searchValue}
        onChangeText={onSearchChange}
        onSubmitEditing={onSubmitEditing}
        placeholder="Search"
        placeholderTextColor={COLORS.textOnDarkDim}
        cursorColor={COLORS.textOnDark}
        selectionColor={COLORS.textOnDark}
        style={styles.searchField}
      />
    </View>
  ) : (
    <Pressable
      onPress={activateSearch}
      style={styles.iconBtn}
      testID="header-search-button"
    >
      <Ionicons
        name="search"
        size={26}
        color={COLORS.textOnDark}
      />
    </Pressable>
  )
)}
{!hideScanner && (
  <Pressable
    onPress={onScanPress}
    style={styles.iconBtn}
    hitSlop={8}
    testID="header-scan-button"
  >
    <MaterialCommunityIcons
      name="barcode-scan"
      size={26}
      color={COLORS.textOnDark}
    />
  </Pressable>
)}

          </View>
        </View>

        {/* RIGHT — cart side */}
        <View style={styles.right}>
          <View style={styles.titleRow}>
            {children}
            <Text style={styles.cartTitle}>{title}</Text>
          </View>
          <View style={styles.rightTools}>
            {rightExtra}

           {!hideHeldCarts && heldCartsCount > 0 && (
              <Pressable
                onPress={onHeldCartsPress}
                style={styles.iconBtn}
                hitSlop={8}
                testID="header-held-carts-button"
              >
                <Feather name="archive" size={24} color={COLORS.textOnDark} />
                <View style={styles.badge} testID="header-held-carts-badge">
                  <Text style={styles.badgeText}>{heldCartsCount}</Text>
                </View>
              </Pressable>
            )}

            {/* View all held carts — opens a list/modal of every held cart */}
           {!hideViewHeldCarts && heldCartsCount > 0 && (
              <Pressable
                onPress={onViewHeldCartsPress}
                style={styles.iconBtn}
                hitSlop={8}
                testID="header-view-held-carts-button"
              >
                <Feather name="list" size={24} color={COLORS.textOnDark} />
              </Pressable>
            )}

         {!hideCustomer && (
  <Pressable
    onPress={onCustomerPress}
    style={styles.iconBtn}
    hitSlop={8}
    testID="header-customer-button"
  >
    <Feather name="user" size={26} color={COLORS.textOnDark} />
    {customerSelected && (
      <View style={styles.checkBadge}>
        <Feather name="check" size={10} color={COLORS.textOnDark} />
      </View>
    )}
  </Pressable>
)}
{!hideMore && (
            <Pressable
              onPress={onMorePress}
              style={styles.iconBtn}
              hitSlop={8}
              testID="header-more-button"
            >
              <Feather name="more-vertical" size={26} color={COLORS.textOnDark} />
            </Pressable>
          )}

          {/* Add button — right-most corner */}
     {!hideAdd && (
  <Pressable
    onPress={onAddPress}
    style={styles.addBtn}
    hitSlop={8}
    testID="header-add-button"
  >
    <Feather
      name="plus"
      size={22}
      color={COLORS.textOnDark}
    />

    {!!addLabel && (
      <Text style={styles.addBtnText}>
        {addLabel}
      </Text>
    )}
  </Pressable>
)}
        </View>
      </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      height: 72,
      backgroundColor: COLORS.navy,
      flexDirection: "row",
      alignItems: "center",
    },
   left: {
  flex: 6,
  marginRight: SPACING.md,
  height: "100%",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: SPACING.lg,
  borderRightWidth: StyleSheet.hairlineWidth,
  borderRightColor: COLORS.navyMid,
},
 right: {
  flex: 4,
  height: "100%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: SPACING.lg,
},
    iconBtn: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: RADIUS.md,
    },
    orderBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: SPACING.sm,
      marginLeft: SPACING.xs,
    },
    orderText: {
      color: COLORS.textOnDark,
      fontSize: 17,
      fontWeight: "600",
    },
    leftTools: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      justifyContent: "flex-end",
    },
  titleRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: SPACING.sm,
},
    cartTitle: {
      color: COLORS.textOnDark,
      fontSize: 22,
      fontWeight: "600",
    },
    rightTools: {
      flexDirection: "row",
      alignItems: "center",
    },

    // ── Held-carts badge ──
    badge: {
      position: "absolute",
      top: 6,
      right: 6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: COLORS.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: COLORS.textOnDark,
      fontSize: 11,
      fontWeight: "700",
    },

    // ── Customer-selected check badge ──
    checkBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: COLORS.success ?? "#2FB35A",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLORS.navy,
    },

    // ── Visible search field ──
    // marginLeft creates the gap so it doesn't sit flush against
    // whatever precedes it in leftTools.
    searchFieldWrap: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginLeft: SPACING.lg,
      marginRight: SPACING.sm,
      height: 46,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.navyMid,
    },
    searchBackBtn: {
      marginRight: SPACING.xs,
    },
    searchField: {
      flex: 1,
      color: COLORS.textOnDark,
      fontSize: 18,
      padding: 0,
    },

    addBtn: {
  minHeight: 52,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.md,
  gap: 5,
},

addBtnText: {
  color: COLORS.textOnDark,
  fontSize: 17,
  fontWeight: "700",
},
  });