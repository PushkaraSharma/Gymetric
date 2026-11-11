import React, { useRef, useState } from "react"
import {
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { storage } from "@/utils/LocalStorage"

const ONBOARDING_BG = "#FFFFFF"
const ONBOARDING_TITLE = "#0F172A"
const ONBOARDING_BODY = "#4B5563"

const slides: { key: string; image: ImageSourcePropType; title: string; body: string }[] = [
  {
    key: "management",
    title: "Seamless Gym Management",
    body: "Effortlessly manage your gym operations, members, and memberships in one place.",
    image: require("../../assets/images/onboarding1.png"),
  },
  {
    key: "memberships",
    title: "Membership Tracking",
    body: "Real-time updates on active, expired, and upcoming memberships at your fingertips.",
    image: require("../../assets/images/onboarding2.png"),
  },
  {
    key: "growth",
    title: "Business Growth",
    body: "Get insights into your gym's performance and grow your fitness community.",
    image: require("../../assets/images/onboarding3.png"),
  },
]

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<(typeof slides)[number]>)

const Slide = ({
  item,
  index,
  scrollX,
  width,
  height,
  imageHeight,
  titleColor,
  bodyColor,
}: {
  item: (typeof slides)[number]
  index: number
  scrollX: SharedValue<number>
  width: number
  height: number
  imageHeight: number
  titleColor: string
  bodyColor: string
}) => {
  const imageStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(scrollX.value, input, [width * 0.18, 0, -width * 0.18], Extrapolation.CLAMP) },
      ],
    }
  })

  const textStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(scrollX.value, input, [14, 0, 14], Extrapolation.CLAMP) }],
    }
  })

  return (
    <View style={[styles.slide, { width, height }]}>
      <View style={styles.slideContent}>
        <Animated.View style={[styles.illustration, { height: imageHeight }, imageStyle]}>
          <Image source={item.image} style={styles.image} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.copy, textStyle]}>
          <Text preset="default" style={[styles.title, { color: titleColor }]}>
            {item.title}
          </Text>
          <Text preset="default" style={[styles.body, { color: bodyColor }]}>
            {item.body}
          </Text>
        </Animated.View>
      </View>
    </View>
  )
}

const Dot = ({
  index,
  scrollX,
  width,
  color,
}: {
  index: number
  scrollX: SharedValue<number>
  width: number
  color: string
}) => {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      width: interpolate(scrollX.value, input, [8, 22, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
      backgroundColor: color,
    }
  })
  return <Animated.View style={[styles.dot, style]} />
}

export const OnboardingScreen = () => {
  const {
    theme: { colors },
  } = useAppTheme()
  const { width, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const listRef = useRef<FlatList<(typeof slides)[number]>>(null)
  const indexRef = useRef(0)
  const leavingRef = useRef(false)
  const scrollX = useSharedValue(0)
  const [index, setIndex] = useState(0)
  const [listHeight, setListHeight] = useState(0)

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  const settleIndex = (offsetX: number) => {
    const next = Math.min(slides.length - 1, Math.max(0, Math.round(offsetX / width)))
    indexRef.current = next
    setIndex(next)
  }

  const finish = () => {
    if (leavingRef.current) return
    leavingRef.current = true
    storage.set("isFirstLaunch", true)
    storage.set("hasSeenOnboarding", true)
  }

  const goNext = () => {
    if (indexRef.current >= slides.length - 1) {
      finish()
      return
    }
    const next = indexRef.current + 1
    listRef.current?.scrollToIndex({ index: next, animated: true })
    indexRef.current = next
    setIndex(next)
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: ONBOARDING_BG,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.list} onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}>
        <AnimatedFlatList
          ref={listRef}
          data={slides}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item, index: slideIndex }) => (
            <Slide
              item={item}
              index={slideIndex}
              scrollX={scrollX}
              width={width}
              height={listHeight}
              imageHeight={Math.min(
                Math.round(windowHeight * 0.3),
                Math.max(listHeight - 240, 160),
              )}
              titleColor={ONBOARDING_TITLE}
              bodyColor={ONBOARDING_BODY}
            />
          )}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
          onMomentumScrollEnd={(event) => settleIndex(event.nativeEvent.contentOffset.x)}
          onScrollEndDrag={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x
            const maxOffset = (slides.length - 1) * width
            if (offsetX > maxOffset + 48) finish()
            else settleIndex(offsetX)
          }}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, dotIndex) => (
            <Dot key={slide.key} index={dotIndex} scrollX={scrollX} width={width} color={colors.primary} />
          ))}
        </View>
        <View style={styles.actions}>
          <Text style={[styles.skip, { color: ONBOARDING_BODY }]} onPress={finish}>
            Skip
          </Text>
          <Pressable style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={goNext}>
            <Text style={styles.nextLabel}>
              {index === slides.length - 1 ? "Get started" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  slideContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: "72%",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  copy: {
    alignSelf: "stretch",
    paddingHorizontal: 20,
    marginTop: 20,
    overflow: "visible",
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 9999,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skip: {
    fontSize: 14,
  },
  nextButton: {
    borderRadius: 9999,
    minWidth: 148,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  nextLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
})
