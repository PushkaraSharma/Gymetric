import { colors as colorsLight } from "./colors"
import { colors as colorsDark } from "./colorsDark"
import { spacing as spacingLight } from "./spacing"
import { spacing as spacingDark } from "./spacingDark"
import { timing } from "./timing"
import type { Theme } from "./types"
import { typography } from "./typography"

const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}

export const lightTheme: Theme = {
  colors: colorsLight,
  spacing: spacingLight,
  typography,
  timing,
  shadows,
  isDark: false,
}

export const darkTheme: Theme = {
  colors: colorsDark,
  spacing: spacingDark,
  typography,
  timing,
  shadows,
  isDark: true,
}

