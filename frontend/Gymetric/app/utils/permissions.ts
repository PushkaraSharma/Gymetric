import { useAppSelector } from "@/redux/Hooks"
import { selectGymInfo } from "@/redux/state/GymStates"

export type Permission =
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
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
  | "settings.gym"
  | "settings.plans"
  | "settings.access"

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
