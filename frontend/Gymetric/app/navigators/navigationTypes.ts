import { ComponentProps } from "react"
import { NavigationContainer, NavigatorScreenParams } from "@react-navigation/native"

export type MainTabParamList = {
  Home: undefined
  Clients: { filter?: string } | undefined
  WhatsApp: undefined
  More: undefined
}

export type AppStackParamList = {
  Onboarding: undefined
  Main: NavigatorScreenParams<MainTabParamList> | undefined
  PhoneLogin: undefined
  OTPVerification: { confirmation: any; phoneNumber: string }
  GymOnboarding: { idToken: string; phoneNumber: string }
  PasswordLogin: { phoneNumber?: string }
  "Add Client": undefined
  "Client Profile": { data: { _id: string } }
  "Update Basic Information": { client: any }
  "Renew Membership": { client: any }
  "Edit Membership": { client: any; membership: any }
  "Search Client": { intent?: "message"; index?: number; handleSelect?: (...args: any[]) => void } | undefined
  Memberships: undefined
  "Create Edit Membership": { membership?: any }
  "Gym Info": undefined
  Settings: undefined
  "Help Center": undefined
  "Notification Settings": undefined
  "WhatsApp Premium": undefined
  "WhatsApp Messages": undefined
  "WhatsApp Chat": { memberId?: string | null; phone?: string; name?: string | null }
  Revenue: undefined
  Activity: undefined
  "Change Password": undefined
  "Receipt Settings": undefined
  "Push Notification Settings": undefined
  "Seed Data": undefined
  "My Profile": undefined
  Plans: undefined
  Entrance: undefined
  Attendance: undefined
  Reports: undefined
  Staff: undefined
  "Staff Member": { staff?: any }
  "Staff Profile": { staffId: string }
  "Access Control": undefined
  Role: { role?: any; catalog: any[] }
}

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
