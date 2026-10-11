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
  import HeaderButton from "./HeaderButton";

  
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
  onBackPress,
  onSearchPress,
    leftContent,
  onScanPress,
  onCustomerPress,
  customerSelected = false,
  onMorePress,
  onHeldCartsPress,
   onAddPress,
  heldCartsCount = 0,
  onViewHeldCartsPress,
  
  rightExtra,
  returnButton,
  onReturnPress,
  isReturnMode = false,
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
  <Ionicons
    name="menu"
    size={30}
    color={COLORS.textOnDark}
  />
</Pressable>

    {/* ▼ ADD THIS ▼ */}
        {onBackPress && (
          <Pressable
            onPress={onBackPress}
            hitSlop={8}
            style={styles.iconBtn}
            testID="header-back-button"
          >
            <Ionicons name="arrow-back" size={28} color={COLORS.textOnDark} />
          </Pressable>
        )}





        {/* ▲ ADD THIS ▲ */}
{leftContent ? (
  <View style={styles.leftContent}>
    {leftContent}
  </View>
) : title === "Customers" ? (
  <Text style={styles.leftTitle}>Customers</Text>
) : null}

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

          {returnButton && (
  <View style={styles.returnButtonWrap}>
    <Pressable
      style={[
        styles.returnBtn,
        isReturnMode && styles.returnBtnActive,
      ]}
      onPress={onReturnPress}
      hitSlop={8}
      testID="header-return-button"
    >
      <MaterialCommunityIcons
        name={isReturnMode ? "close" : "swap-horizontal"}
        size={20}
        color={isReturnMode ? "#FFFFFF" : COLORS.textOnDark}
      />
      <Text
        style={[
          styles.returnBtnText,
          isReturnMode && styles.returnBtnTextActive,
        ]}
      >
        {isReturnMode ? "Cancel Return" : "Return"}
      </Text>
    </Pressable>
  </View>
)}
        </View>

        {/* RIGHT — cart side */}
      <View style={styles.right}>
  <View style={styles.titleRow}>
 
    {children}
    {title !== "Customers" && (
      <Text style={styles.cartTitle}>{title}</Text>
    )}

  </View>

  <View style={styles.rightTools}>
    {rightExtra}

    {!hideHeldCarts && heldCartsCount > 0 && (
      <Pressable
        onPress={onHeldCartsPress}
        style={styles.iconBtn}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="cart-arrow-down"
          size={24}
          color={COLORS.textOnDark}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{heldCartsCount}</Text>
        </View>
      </Pressable>
    )}

    {!hideViewHeldCarts && heldCartsCount > 0 && (
      <Pressable
        onPress={onViewHeldCartsPress}
        style={styles.iconBtn}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="format-list-bulleted"
          size={24}
          color={COLORS.textOnDark}
        />
      </Pressable>
    )}

    {!hideCustomer && (
      <Pressable
        onPress={onCustomerPress}
        style={styles.iconBtn}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="account-outline"
          size={26}
          color={COLORS.textOnDark}
        />
        {customerSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        )}
      </Pressable>
    )}

    {!hideMore && (
      <Pressable
        onPress={onMorePress}
        style={styles.iconBtn}
        hitSlop={8}
      >
        <Feather
          name="more-vertical"
          size={26}
          color={COLORS.textOnDark}
        />
      </Pressable>
    )}

    {!hideAdd && onAddPress && (
   
<HeaderButton
  title={addLabel || "Add"}
  onPress={onAddPress}
  testID="header-add-customer-button"
/>

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
  flexShrink: 0,
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

 
leftTitle: {
  color: COLORS.textOnDark,
  fontSize: 22,
  fontWeight: "600",
  marginLeft: SPACING.sm,
},
leftContent: {
  flex: 1,
  minWidth: 0,
  marginLeft: SPACING.sm,
},

returnBtn: {
  height: 40,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 12,
  borderRadius: 20,
  borderWidth: 1.5,
  borderColor: COLORS.textOnDark,
  backgroundColor: "transparent",
},
returnBtnActive: {
  backgroundColor: "#DC2626",
  borderColor: "#DC2626",
},
returnBtnText: {
  fontSize: 13,
  fontWeight: "700",
  color: COLORS.textOnDark,
},
returnBtnTextActive: {
  color: "#FFFFFF",
},
returnButtonWrap: {
  marginLeft: "auto",
  flexShrink: 0,
  alignItems: "flex-end",
  justifyContent: "center",
},
  });