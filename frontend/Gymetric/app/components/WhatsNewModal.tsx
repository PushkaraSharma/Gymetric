import React from 'react'
import { Modal, View, ScrollView, TouchableWithoutFeedback, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { OTA_VERSION } from '@/utils/Constants'
import { CURRENT_WHATS_NEW } from '@/utils/whatsNewContent'

type Props = {
  visible: boolean
  onClose: () => void
}

export const WhatsNewModal = ({ visible, onClose }: Props) => {
  const { themed, theme: { colors } } = useAppTheme()
  const content = CURRENT_WHATS_NEW

  if (!content) return null

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={themed($overlay)}>
          <TouchableWithoutFeedback>
            <View style={themed($box)}>
              <View style={themed($badge)}>
                <Text size="xxs" weight="semiBold" style={{ color: colors.primary }}>v{OTA_VERSION}</Text>
              </View>
              <Text preset="heading" weight="bold" style={{ marginBottom: spacing.xs }}>{content.title}</Text>
              <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.md }}>
                Here's what changed in this update
              </Text>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {content.highlights.map((item, index) => (
                  <View key={index} style={$bulletRow}>
                    <Text style={{ color: colors.primary, marginRight: spacing.sm }}>•</Text>
                    <Text style={{ flex: 1, color: colors.text }} size="sm">{item}</Text>
                  </View>
                ))}
              </ScrollView>
              <Button title="Got it" onPress={onClose} style={{ marginTop: spacing.lg }} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.lg,
})

const $box: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderRadius: 20,
  padding: spacing.lg,
  width: '100%',
  maxWidth: 360,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignSelf: 'flex-start',
  backgroundColor: colors.primaryBackground,
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: 8,
  marginBottom: spacing.sm,
})

const $bulletRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: spacing.sm,
}
