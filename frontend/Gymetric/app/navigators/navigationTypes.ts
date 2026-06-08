import { ComponentProps } from "react"
import { NavigationContainer } from "@react-navigation/native"

export type AppStackParamList = {
  Onboarding: undefined
  Main: undefined
  PhoneLogin: undefined
  OTPVerification: { confirmation: any; phoneNumber: string }
  GymOnboarding: { idToken: string; phoneNumber: string }
  PasswordLogin: { phoneNumber?: string }
  "Add Client": undefined
  "Client Profile": { data: { _id: string } }
  "Update Basic Information": { client: any }
  "Renew Membership": { client: any }
  "Edit Membership": { client: any; membership: any }
  "Search Client": undefined
  Memberships: undefined
  "Create Edit Membership": { membership?: any }
  "Business Profile": undefined
  "Help Center": undefined
  "Notification Settings": undefined
  "WhatsApp Premium": undefined
  Revenue: undefined
  "Change Password": undefined
  "Receipt Settings": undefined
  "Push Notification Settings": undefined
  "Seed Data": undefined
}

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
