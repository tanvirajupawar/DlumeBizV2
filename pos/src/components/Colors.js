

export const COLORS = {
  // Primary
  navy: "#1E2A3A",
  navyDeep: "#161F2C",
  navyMid: "#2A374A",

  // Accent
  blue: "#2E7BE0",
  blueDisabled: "#BBD3F3",
  blueSoft: "#E7F0FC",

  // Surface
  bg: "#F4F6F8",
  card: "#FFFFFF",
  divider: "#E6EAF0",
  chipBg: "#EEF2F6",

  // Text
  textPrimary: "#1E2A3A",
  textSecondary: "#5B6675",
  textMuted: "#8A97A6",
  textOnDark: "#FFFFFF",
  textOnDarkDim: "#B7C0CC",

  // States
  danger: "#E5484D",
  dangerSoft: "#FDECEC",
  success: "#12B76A",

  // Product price chip
  priceChipBg: "#98A2B3",
  priceChipText: "#FFFFFF",

  // ------------------------------------------------
  // Compatibility names for copied old POS screens
  // ------------------------------------------------
  background: "#F4F6F8",
  white: "#FFFFFF",

  primary: "#2E7BE0",
  primaryDark: "#161F2C",
  primaryLight: "#2E7BE0",
  primarySoft: "#E7F0FC",

  warning: "#F5A623",

  textOnPrimary: "#FFFFFF",

  border: "#E6EAF0",

  shadow: "#0B1220",

  overlay: "rgba(0,0,0,0.35)",

  chipInactiveBg: "#FFFFFF",
  chipActiveBg: "#2E7BE0",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const SHADOW = {
  card: {
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  soft: {
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
};

// ------------------------------------------------
// Compatibility exports for copied old POS screens
// ------------------------------------------------

export const colors = {
  background: COLORS.background,
  white: COLORS.white,

  primary: COLORS.primary,
  primaryDark: COLORS.primaryDark,
  primaryLight: COLORS.primaryLight,
  primarySoft: COLORS.primarySoft,

  danger: COLORS.danger,
  dangerSoft: COLORS.dangerSoft,
  success: COLORS.success,
  warning: COLORS.warning,

  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  textMuted: COLORS.textMuted,
  textOnPrimary: COLORS.textOnPrimary,

  border: COLORS.border,
  divider: COLORS.divider,

  shadow: COLORS.shadow,
  overlay: COLORS.overlay,

  chipInactiveBg: COLORS.chipInactiveBg,
  chipActiveBg: COLORS.chipActiveBg,
};

export const spacing = SPACING;
export const radii = RADIUS;
export const shadow = SHADOW;

export default COLORS;