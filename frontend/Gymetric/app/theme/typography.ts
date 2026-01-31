import { Platform } from "react-native"
import {
  Inter_300Light as interLight,
  Inter_400Regular as interRegular,
  Inter_500Medium as interMedium,
  Inter_600SemiBold as interSemiBold,
  Inter_700Bold as interBold,
} from "@expo-google-fonts/inter"
import {
  Outfit_400Regular as outfitRegular,
  Outfit_500Medium as outfitMedium,
  Outfit_600SemiBold as outfitSemiBold,
  Outfit_700Bold as outfitBold,
} from "@expo-google-fonts/outfit"

export const customFontsToLoad = {
  interLight,
  interRegular,
  interMedium,
  interSemiBold,
  interBold,
  outfitRegular,
  outfitMedium,
  outfitSemiBold,
  outfitBold,
}

const fonts = {
  inter: {
    light: "interLight",
    normal: "interRegular",
    medium: "interMedium",
    semiBold: "interSemiBold",
    bold: "interBold",
  },
  outfit: {
    normal: "outfitRegular",
    medium: "outfitMedium",
    semiBold: "outfitSemiBold",
    bold: "outfitBold",
  },
  helveticaNeue: {
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  sansSerif: {
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
}

export const typography = {
  fonts,
  primary: fonts.inter,
  secondary: fonts.outfit,
  code: Platform.select({ ios: "Courier", android: "monospace" }),
}
