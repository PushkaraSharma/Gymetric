const palette = {
  // Slate Scale (Dark Mode)
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

  // Indigo Primary (Lighter for Dark mode)
  indigo50: "#EEF2FF",
  indigo100: "#E0E7FF",
  indigo200: "#C7D2FE",
  indigo300: "#A5B4FC",
  indigo400: "#818CF8",
  indigo500: "#6366F1",
  indigo600: "#4F46E5",

  // Success Emerald
  emerald400: "#34D399",
  emerald900: "#064E3B",

  // Error Rose
  rose400: "#FB7185",
  rose900: "#4C0519",

  white: "#FFFFFF",
  black: "#000000",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  /**
   * Semantic Colors
   */
  text: palette.slate50,
  textDim: palette.slate400,
  textContrast: palette.white,

  background: palette.slate950,
  surface: palette.slate900,

  border: palette.slate800,
  borderStrong: palette.slate700,

  primary: palette.indigo400,
  primaryBackground: palette.slate800,

  tint: palette.indigo400,
  tintInactive: palette.slate600,

  cta: palette.white,
  ctaBackground: palette.slate800,

  error: palette.rose400,
  errorBackground: palette.rose900,

  black: palette.black,
  white: palette.white,

  success: palette.emerald400,
  successBackground: palette.emerald900,

  // Compatibility
  activeBg: palette.emerald900,
  activeTxt: palette.emerald400,
  lightgray: palette.slate800,
  separator: palette.slate800,
  angry500: palette.rose400,
} as const
