import { useAppSelector } from "@/redux/Hooks"
import { selectGymInfo } from "@/redux/state/GymStates"

// Same keys as server/src/utils/permissions.ts (CoreWave names where the two products overlap).
export type Permission =
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.archive"
  | "clients.renew"
  | "clients.freeze"
  | "clients.collect"
  | "clients.upgrade"
  | "bill.discount"
  | "dashboard.revenue"
  | "reports.view"
  | "staff.view"
  | "staff.manage"
  | "attendance.manage"
  | "door.open"
  | "entrance.manage"
  | "whatsapp.chat"
  | "whatsapp.settings"
  | "settings.branch"
  | "settings.plans"
  | "settings.access"
  | "data.delete"

// GymKarta subscription. Mirrors server/src/utils/plans.ts.
export type SubscriptionPlan = "free" | "pro" | "max"
export type Feature = "whatsapp" | "staff" | "reports" | "biometric"
export type Subscription = { plan: SubscriptionPlan; expiresAt: string | null; features: Feature[] }

// The lowest plan that includes each feature, for PRO / MAX chips and the plans sheet.
export const FEATURE_PLAN: Record<Feature, Exclude<SubscriptionPlan, "free">> = {
  whatsapp: "pro",
  staff: "pro",
  reports: "pro",
  biometric: "max",
}

// A server from before plans sends gym info without `subscription` and gates nothing, so nothing is locked.
const UNGATED: Subscription = { plan: "max", expiresAt: null, features: ["whatsapp", "staff", "reports", "biometric"] }
// Until gym info has loaded, nothing paid is assumed, so background calls (the unread badge) don't hit locked endpoints.
const LOADING: Subscription = { plan: "free", expiresAt: null, features: [] }

export function useSubscription(): Subscription {
  const gymInfo = useAppSelector(selectGymInfo)
  if (!gymInfo) return LOADING
  return (gymInfo.subscription as Subscription) ?? UNGATED
}

export function useFeatures() {
  const { features } = useSubscription()
  return (feature: Feature) => features.includes(feature)
}

export function useFeature(feature: Feature) {
  return useFeatures()(feature)
}

export type Viewer = {
  userId?: string
  name?: string
  photo?: string | null
  phoneNumber?: string | null
  roleKey: string | null
  roleName: string
  permissions: Permission[]
}

// Builds released before access control get no `viewer`; treat them as the owner, as the server did.
const OWNER_FALLBACK: Viewer = { roleKey: "owner", roleName: "Owner", permissions: [] }

export function useViewer(): Viewer {
  const gymInfo = useAppSelector(selectGymInfo)
  return (gymInfo?.viewer as Viewer) ?? OWNER_FALLBACK
}

export function usePermission(permission: Permission) {
  const viewer = useViewer()
  return viewer.roleKey === "owner" || viewer.permissions.includes(permission)
}

export function usePermissions() {
  const viewer = useViewer()
  return (permission: Permission) => viewer.roleKey === "owner" || viewer.permissions.includes(permission)
}
