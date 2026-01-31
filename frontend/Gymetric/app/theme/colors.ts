const palette = {
  // Slate Scale
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1E293B",
  slate900: "#0F172A",
  slate950: "#020617",

  // Indigo Primary
  indigo50: "#EEF2FF",
  indigo100: "#E0E7FF",
  indigo200: "#C7D2FE",
  indigo300: "#A5B4FC",
  indigo400: "#818CF8",
  indigo500: "#6366F1",
  indigo600: "#4F46E5",
  indigo700: "#4338CA",

  // Success Emerald
  emerald50: "#ECFDF5",
  emerald100: "#D1FAE5",
  emerald600: "#059669",
  emerald700: "#047857",

  // Error Rose
  rose50: "#FFF1F2",
  rose100: "#FFE4E6",
  rose600: "#E11D48",
  rose700: "#BE123C",

  white: "#FFFFFF",
  black: "#000000",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  /**
   * Semantic Colors
   */
  text: palette.slate900,
  textDim: palette.slate500,
  textContrast: palette.white,

  background: palette.slate50,
  surface: palette.white,

  border: palette.slate200,
  borderStrong: palette.slate300,

  primary: palette.indigo600,
  primaryBackground: palette.indigo50,

  tint: palette.indigo600,
  tintInactive: palette.slate400,

  cta: palette.black,
  ctaBackground: palette.slate100,

  error: palette.rose600,
  errorBackground: palette.rose50,

  black: palette.black,
  white: palette.white,

  success: palette.emerald600,
  successBackground: palette.emerald50,

  // Compatibility with existing code if needed
  activeBg: palette.emerald50,
  activeTxt: palette.emerald600,
  lightgray: palette.slate100,
  separator: palette.slate200,
  angry500: palette.rose600,
} as const
