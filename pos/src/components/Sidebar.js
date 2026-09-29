// components/Sidebar.js
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from './Colors';


const EXPANDED_WIDTH = 450;

export default function Sidebar({
  app,
  user,
  activeKey,
  onNavigate,
  onSignOut,
  onProfilePress,
  collapsed = false,
  onToggle = () => {},
}) {
const translateX = useRef(
  new Animated.Value(collapsed ? -EXPANDED_WIDTH : 0)
).current;

  const opacityAnim = useRef(
    new Animated.Value(collapsed ? 0 : 1)
  ).current;

React.useEffect(() => {
  translateX.stopAnimation();
  opacityAnim.stopAnimation();

  Animated.parallel([
    Animated.timing(translateX, {
      toValue: collapsed ? -EXPANDED_WIDTH : 0,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(opacityAnim, {
      toValue: collapsed ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }),
  ]).start();
}, [collapsed, translateX, opacityAnim]);

  const handleToggle = () => {
    onToggle(!collapsed);
  };

const initial = (app?.name || user?.email || "?")
  .trim()
  .charAt(0)
  .toUpperCase();

const isCalculatorMode =
  user?.company?.pos_mode === "CALCULATOR";
  console.log("🔥 POS MODE:", user?.company?.pos_mode);
console.log("🔥 IS CALCULATOR:", isCalculatorMode);

const navItems = isCalculatorMode
  ? [
      {
        key: "cart",
        label: "Quick Sale",
        icon: "calculator-variant-outline",
      },
      {
        key: "customers",
        label: "Customers",
        icon: "account-group-outline",
      },
      {
        key: "orders",
        label: "Orders",
        icon: "clipboard-text-outline",
      },
      {
        key: "payments",
        label: "Payments",
        icon: "cash-multiple",
      },
    ]
  : [
   {
  key: "cart",
  label: "Cart",
  icon: "cart-outline",
},
{
  key: "customers",
  label: "Customers",
  icon: "account-group-outline",
},
{
  key: "categories",
        label: "Items",
        icon: "shape-outline",
      },
      {
        key: "orders",
        label: "Orders",
        icon: "clipboard-text-outline",
      },
      {
        key: "payments",
        label: "Payments",
        icon: "cash-multiple",
      },
      {
        key: "Refund",
        label: "Refund",
        icon: "file-document-edit-outline",
      },
    ];
return (
    <View
      style={styles.wrapper}
      pointerEvents={collapsed ? "box-none" : "auto"}
    >
      {/* Backdrop */}
      {!collapsed && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdrop}
          onPress={() => onToggle(true)}
        />
      )}

      {/* Sidebar panel */}
      <Animated.View
  style={[
    styles.sidebar,
    {
      transform: [{ translateX }],
    },
  ]}
>
        <Animated.View style={[styles.sidebarInner, { opacity: opacityAnim }]}>

          {/* ── Header: app name + user info ── */}
          <View style={styles.header}>
            

            {/* Avatar + app / user names */}
       <TouchableOpacity
  style={styles.avatarRow}
  activeOpacity={0.8}
  onPress={() => {
    onToggle(true);
    onProfilePress?.();
  }}
>
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{initial}</Text>
  </View>

  <View style={styles.identityText}>
    <Text style={styles.appName} numberOfLines={1}>
      {app?.name}
    </Text>

    <Text style={styles.userEmail} numberOfLines={1}>
      {user?.email}
    </Text>

    {app?.registerType ? (
      <Text style={styles.registerType} numberOfLines={1}>
        {app.registerType}
      </Text>
    ) : null}
  </View>
</TouchableOpacity>

          </View>

          {/* ── Navigation items ── */}
          <ScrollView
            style={styles.navScroll}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
          >
          {navItems.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onNavigate(item.key);
                    onToggle(true);
                  }}
                  accessibilityLabel={item.label}
                >
                  {/* Active left bar */}
                  {isActive && <View style={styles.activeBar} />}

                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color={isActive ? COLORS.navy : COLORS.textSecondary}
                    style={styles.navIcon}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Sign Out ── */}
          <View style={styles.footer}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.signOutBtn}
              activeOpacity={0.75}
              onPress={onSignOut}
              accessibilityLabel="Sign Out"
            >
              <MaterialCommunityIcons name="logout" size={18} color={COLORS.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
wrapper: {
  position: "absolute",
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  elevation: 9999,
},

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: -9999,   // covers full screen
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // ── White card panel ──
sidebar: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: EXPANDED_WIDTH,
  overflow: 'hidden',
  backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
    borderTopRightRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },

  sidebarInner: {
    width: EXPANDED_WIDTH,
    flex: 1,
  },

  // ── Header — themed with the brand color ──
  header: {
    paddingTop: 48,        // safe area buffer
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.navy,
  },

  closeButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // sits on the navy header, so it needs to read distinctly —
    // a translucent white tint of the same theme rather than solid navy
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: '700',
  },

  identityText: {
    flex: 1,
  },
  appName: {
    fontSize: 25,
    fontWeight: '700',
    color: COLORS.textOnDark,
  },
  userEmail: {
    fontSize: 15,
    color: COLORS.textOnDark,
    marginTop: 1,
  },
  registerType: {
    fontSize: 11,
    color: COLORS.textOnDark,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.sm,
  },

  // ── Nav ──
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    paddingBottom: SPACING.sm,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    marginBottom: 2,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: COLORS.blueSoft,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 4,
    backgroundColor: COLORS.navy,
  },

  navIcon: {
    marginRight: 14,
  },
  navLabel: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
  },
  navLabelActive: {
    color: COLORS.navy,
    fontWeight: '600',
  },

  // ── Footer / Sign Out ──
  footer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 32,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    gap: 12,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: '600',
  },
});

export { EXPANDED_WIDTH };