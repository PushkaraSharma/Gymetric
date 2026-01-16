import { Platform, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { $styles } from '@/theme/styles'
import HeaderbackButton from '@/components/HeaderbackButton'

const CreateEditMembership = () => {
   return (
    <Screen
          preset="auto"
          contentContainerStyle={[$styles.flex1]}
          safeAreaEdges={["bottom"]}
          {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
                  <Header title='Update Client' backgroundColor='#fff' LeftActionComponent={<HeaderbackButton />} />

            </Screen>
  )
}

export default CreateEditMembership

const styles = StyleSheet.create({})