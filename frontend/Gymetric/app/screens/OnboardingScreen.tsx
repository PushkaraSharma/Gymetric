import React, { useState, useRef, useCallback, memo } from "react"
import { View, TextStyle, ImageStyle, useWindowDimensions, FlatList, TouchableOpacity, Image, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useAppTheme } from "@/theme/context"
import { storage } from "@/utils/LocalStorage"
import { MotiView, MotiText } from "moti"
import { ChevronRight } from "lucide-react-native"
import { Text } from "@/components/Text"

const ONBOARDING_DATA = [
    {
        id: "1",
        title: "Seamless Gym Management",
        description: "Effortlessly manage your gym operations, members, and memberships in one place.",
        image: require("../../assets/images/membershipImage.jpg"),
    },
    {
        id: "2",
        title: "Membership Tracking",
        description: "Real-time updates on active, expired, and upcoming memberships at your fingertips.",
        image: require("../../assets/images/membershipImage.jpg"),
    },
    {
        id: "3",
        title: "Business Growth",
        description: "Get insights into your gym's performance and grow your fitness community.",
        image: require("../../assets/images/membershipImage.jpg"),
    },
]

const Slide = memo(({ item, width, colors, typography }: any) => {
    return (
        <View style={[$slide, { width }]}>
            <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "timing", duration: 600 }}
                style={[
                    $imageContainer,
                    {
                        borderColor: colors.black,
                        shadowColor: colors.black,
                        backgroundColor: colors.surface
                    }
                ]}
            >
                <Image source={item.image} style={$image} resizeMode="cover" />
            </MotiView>
            <MotiText
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 200, type: 'timing' }}
                style={[$title, { color: colors.text, fontFamily: typography.secondary.bold }]}
            >
                {item.title}
            </MotiText>
            <MotiText
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 400, type: 'timing' }}
                style={[$description, { color: colors.textDim, fontFamily: typography.primary.normal }]}
            >
                {item.description}
            </MotiText>
        </View>
    )
})

export const OnboardingScreen = () => {
    const { theme: { colors, spacing, typography } } = useAppTheme()
    const navigation = useNavigation<any>()
    const { width } = useWindowDimensions()
    const [currentIndex, setCurrentIndex] = useState(0)
    const flatListRef = useRef<FlatList>(null)

    const handleNext = useCallback(() => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
            setCurrentIndex(currentIndex + 1)
        } else {
            completeOnboarding()
        }
    }, [currentIndex])

    const completeOnboarding = () => {
        storage.set("hasSeenOnboarding", true)
    }

    const renderItem = useCallback(({ item }: any) => (
        <Slide item={item} width={width} colors={colors} typography={typography} />
    ), [width, colors, typography])

    const keyExtractor = useCallback((item: any) => item.id, [])

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    }), [width])

    const onMomentumScrollEnd = useCallback((e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width)
        if (index !== currentIndex) {
            setCurrentIndex(index)
        }
    }, [width, currentIndex])

    return (
        <View style={[$container, { backgroundColor: colors.background }]}>
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumScrollEnd}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                windowSize={2}
                decelerationRate="fast"
                scrollEventThrottle={16}
            />

            <View style={[$footer, { paddingHorizontal: spacing.md, paddingBottom: spacing.xl }]}>
                <View style={$pagination}>
                    {ONBOARDING_DATA.map((_, index) => (
                        <MotiView
                            key={index}
                            animate={{
                                width: index === currentIndex ? 24 : 8,
                                backgroundColor: index === currentIndex ? colors.primary : colors.border,
                            }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={$dot}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleNext}
                    style={[$button, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                >
                    <Text style={[$buttonText, { color: colors.background, fontFamily: typography.primary.semiBold }]}>
                        {currentIndex === ONBOARDING_DATA.length - 1 ? "Get Started" : "Next"}
                    </Text>
                    <ChevronRight color={colors.background} size={20} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

const $container: ViewStyle = {
    flex: 1,
}

const $slide: ViewStyle = {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
}

const $imageContainer: ViewStyle = {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 4,
    marginBottom: 40,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
}

const $image: ImageStyle = {
    width: "100%",
    height: "100%",
}

const $title: TextStyle = {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 16,
}

const $description: TextStyle = {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
}

const $footer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
}

const $pagination: ViewStyle = {
    flexDirection: "row",
}

const $dot: ViewStyle = {
    height: 8,
    borderRadius: 4,
    marginRight: 4,
}

const $button: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
}

const $buttonText: TextStyle = {
    fontSize: 16,
    marginRight: 8,
}
