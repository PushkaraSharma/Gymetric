const pad = (n: number) => String(n).padStart(2, "0")

// Shifts are stored as 24-hour "HH:mm" and shown as "6:00 AM".
export const formatClock = (hhmm?: string | null) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return ""
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${suffix}`
}

export const formatShift = (shift?: { start: string; end: string } | null) =>
  shift ? `${formatClock(shift.start)} – ${formatClock(shift.end)}` : ""

export const toHHmm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

export const fromHHmm = (hhmm: string) => {
  const date = new Date()
  const [h, m] = (hhmm || "09:00").split(":").map(Number)
  date.setHours(h, m, 0, 0)
  return date
}

export const formatTimeOfDay = (value: string | Date) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })

export const isoDay = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const isoMonth = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
