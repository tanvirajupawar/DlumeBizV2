import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Modal,
  StatusBar,
  ScrollView,
  
} from "react-native";

import { getCompany, getUser, logoutUser } from "../api/AuthApi";
import { useNavigation } from "@react-navigation/native";


import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";


const { width } = Dimensions.get("window");


const menuItems = [
  { id: 1, icon: "🏠", title: "Home", route: "Home" },
  { id: 2, icon: "🛒", title: "Sales", route: "SaleOrders" },
  { id: 3, icon: "👤", title: "Customers", route: "Customers" },
  { id: 4, icon: "📦", title: "Items", route: "Items", disabled: true },
  { id: 5, icon: "🧾", title: "Purchase", route: "PurchaseInvoice", disabled: true },
  { id: 6, icon: "👥", title: "Vendors Account", route: "Vendors", disabled: true },
    // { id: 7, icon: "⚙️", title: "Create Order", route: "CreateOrder" },

  // { id: 8, icon: "📦", title: "Add Stocks", route: "Stocks" },
];





export default function MainLayout({ children, currentRoute = "Home" }) {
  const navigation = useNavigation();

  const [company, setCompany] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [renderMenu, setRenderMenu] = useState(false);

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Animate menu when it becomes visible

 /* ================= LOAD DATA (ONCE) ================= */
  useEffect(() => {
    let mounted = true;

const loadData = async () => {
  try {
    const c = await getCompany();
    const u = await getUser();

    if (!mounted) return;

    setCompany(c);
    setUser(u);
  } catch (err) {
    console.log("Dashboard error:", err);
  } finally {
    if (mounted) setLoading(false);
  }
};

    loadData();

    return () => {
      mounted = false;
    };
  }, []);


/* ================= MENU ANIMATION ================= */
  useEffect(() => {
    if (!renderMenu) return;

    slideAnim.setValue(-width * 0.8);
    overlayAnim.setValue(0);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [renderMenu]);

const filteredMenuItems = menuItems;




 /* ================= ACTIONS ================= */
  const toggleMenu = () => {
    if (!renderMenu) setRenderMenu(true);
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setRenderMenu(false));
  };

  const handleMenuItemPress = (item) => {
    if (item.route && item.route !== currentRoute) {
      navigation.navigate(item.route);
    }
    closeMenu();
  };

const handleLogout = async () => {
  await logoutUser();

  closeMenu();

  navigation.reset({
    index: 0,
    routes: [{ name: "Login" }],
  });
};


  return (

    
    
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
<SafeAreaView edges={["top"]} style={{ backgroundColor: "#1E293B" }} ></SafeAreaView>
      {/* Header - Navy Blue Theme */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={toggleMenu}
              style={styles.menuButton}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <View style={[styles.menuLine, styles.menuLine1]} />
                <View style={[styles.menuLine, styles.menuLine2]} />
                <View style={[styles.menuLine, styles.menuLine3]} />
              </View>
            </TouchableOpacity>

            {/* <View style={styles.logoContainer}>
              <Text style={styles.logoText}>D'LumeBz</Text>
            </View>

            <View style={styles.headerRight}>
              <Text style={styles.daysLeft}>294 days left</Text>
              <View style={styles.userIcon}>
                <Text style={styles.userIconText}>F</Text>
              </View>
            </View> */}
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* Side Menu */}
      {renderMenu && (
        <Modal
          visible={renderMenu}
          transparent
          animationType="none"
          onRequestClose={closeMenu}
          statusBarTranslucent
        >
          <View style={styles.menuContainer}>
            {/* Overlay */}
         <Animated.View
  pointerEvents="box-none"   
  style={[styles.overlay, { opacity: overlayAnim }]}
>
  <TouchableOpacity
    style={styles.overlayTouch}
    activeOpacity={1}
    onPress={closeMenu}
  />
</Animated.View>


            {/* Menu Panel */}
            <Animated.View
              style={[
                styles.menuPanel,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              {/* Menu Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuHeaderContent}>
                  <View style={styles.menuLogoContainer}>
                    <Text style={styles.menuLogoText}>F</Text>
                  </View>
                  <View>
                    <Text style={styles.menuHeaderTitle}>
                      {company?.name || 'Dlume'}
                    </Text>
                    <Text style={styles.menuHeaderSubtitle}>
                      {user?.name || 'Sumit'}  ({user?.role || 'Manager'})
                    </Text>
                  </View>
                </View>
              </View>

              {/* Menu Items */}
              <ScrollView
                style={styles.menuItemsContainer}
                showsVerticalScrollIndicator={false}
              >
                {filteredMenuItems.map((item, index) => {
                  const isActive = item.route === currentRoute;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.menuItem,
                        item.route === currentRoute && styles.menuItemActive,
                      ]}
                    >
                      {/* MAIN MENU CLICK */}
                    <TouchableOpacity
  style={[
    styles.menuItemContent,
    item.disabled && { opacity: 0.35 },
  ]}
  activeOpacity={item.disabled ? 1 : 0.7}
  disabled={item.disabled}
  onPress={() => handleMenuItemPress(item)}
>
                        <View style={styles.menuItemIconContainer}>
                          <Text style={styles.menuItemIcon}>{item.icon}</Text>
                        </View>

                        <Text
                          style={[
                            styles.menuItemText,
                            item.route === currentRoute &&
                              styles.menuItemTextActive,
                          ]}
                        >
                          {item.title}
                        </Text>
                      </TouchableOpacity>

                   {!item.disabled && item.route === currentRoute && (
                        <View style={styles.activeIndicator} />
                      )}
                    </View>
                  );
                })}
              </ScrollView>

{/* LOGOUT */}
<TouchableOpacity
  style={styles.logoutRow}
  activeOpacity={0.7}
  onPress={handleLogout}
>
  <View style={styles.logoutLeft}>
    <Ionicons
      name="log-out-outline"
      size={18}
      color="#E5E7EB"
      style={{ marginRight: 14 }}
    />
    <Text style={styles.logoutText}>Logout</Text>
  </View>
</TouchableOpacity>



              {/* Menu Footer */}
              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterVersion}>Version 1.0.0</Text>
                <Text style={styles.menuFooterSubtext}>© 2025 D'LumeBz</Text>
                <Text style={styles.menuFooterDevText}>
                  Falak Trader & Manufacturer
                </Text>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  
    
  );
}

const styles = StyleSheet.create({
headerWrapper: {
  position: "relative",
  zIndex: 100,
  backgroundColor: "#0F172A",
},

header: {
  height: 56, // standard toolbar height
  backgroundColor: "#0F172A",
  justifyContent: "center",
  elevation: 8,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},

headerContent: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
},

menuButton: {
  padding: 8,
  marginRight: 8,
  justifyContent: "center",
  alignItems: "center",
},

  menuIconContainer: {
    width: 28,
    height: 24,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  menuLine: {
    height: 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  menuLine1: {
    width: 28,
  },
  menuLine2: {
    width: 22,
  },
  menuLine3: {
    width: 28,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -36,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  daysLeft: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  userIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  userIconText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Side Menu Styles
  menuContainer: {
    flex: 1,
  },
overlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  zIndex: 1,
},

  overlayTouch: {
    flex: 1,
  },
menuPanel: {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: width * 0.8,
  maxWidth: 320,
  backgroundColor: "#FFFFFF",
  zIndex: 10,      // 👈 REQUIRED
  elevation: 20,   // Android
},

  menuHeader: {
    backgroundColor: "#F1F5F9", // softer neutral background
    minHeight: 140,
    paddingTop: Platform.OS === "ios" ? 52 : StatusBar.currentHeight + 20,
    paddingBottom: 24,
    paddingHorizontal: 22,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  menuHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#2563EB", // deeper brand blue
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  menuLogoText: {
    fontSize: 30,
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  menuHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: 0.6,
  },

  menuHeaderSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  menuItemsContainer: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10, // ↓ reduced
    paddingHorizontal: 16, // ↓ reduced
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 8,
  },

  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  menuItemIconContainer: {
    width: 34, // ↓ reduced
    height: 34, // ↓ reduced
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  menuItemActive: {
    backgroundColor: "#EEF4FF", // softer active bg
  },

  menuItemIcon: {
    fontSize: 18, // ↓ reduced
  },

  menuItemText: {
    fontSize: 14, // ↓ reduced
    fontWeight: "600",
    color: "#475569",
    letterSpacing: 0.2,
  },

  menuItemTextActive: {
    color: "#2563EB", // deeper blue
    fontWeight: "700",
  },

  activeIndicator: {
    width: 3, // ↓ slimmer
    height: 22, // ↓ shorter
    backgroundColor: "#2563EB",
    borderRadius: 2,
  },

  menuFooter: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  menuFooterDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },

  menuFooterVersion: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  menuFooterSubtext: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },

  menuFooterDevText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  menuAddBtn: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  menuAddBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: -1,
  },
logoutRow: {
  marginHorizontal: 12,
  marginVertical: 6,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 10,
  backgroundColor: "#1F2933", // slightly darker tile
},

logoutLeft: {
  flexDirection: "row",
  alignItems: "center",
},

logoutIcon: {
  fontSize: 16,
  color: "#9CA3AF", // muted grey icon
  marginRight: 14,
},

logoutText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#E5E7EB", // soft white text
},
logoutRow: {
  marginHorizontal: 12,
  marginVertical: 6,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 10,
  backgroundColor: "#3B82F6", // dark tile
},

logoutLeft: {
  flexDirection: "row",
  alignItems: "center",
},

logoutText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#E5E7EB",
},


});
