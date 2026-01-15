import { ViewStyle } from "react-native"

import { spacing } from "./spacing"
import { colors } from "./colors"

/* Use this file to define styles that are used in multiple places in your app. */
export const $styles = {
  row: { flexDirection: "row" } as ViewStyle,
  flex1: { flex: 1 } as ViewStyle,
  flexWrap: { flexWrap: "wrap" } as ViewStyle,

  container: {
    paddingTop: spacing.lg + spacing.xl,
    paddingHorizontal: spacing.lg,
  } as ViewStyle,

  toggleInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  } as ViewStyle,

  card: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 8,
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  } as ViewStyle,

  shadow: {
    shadowColor: colors.palette.neutral800,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12.81,
    elevation: 16,
  }
}
