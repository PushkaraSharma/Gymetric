import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns'

export const RENEWAL_GRACE_DAYS = 7

type RenewalClient = {
  membershipStatus?: string
  activeMembership?: { endDate?: string | Date }
}

export function getRenewalStartDate(client: RenewalClient): {
  startDate: Date
  daysSinceEnd: number | null
  showLapseConfirm: boolean
} {
  const today = startOfDay(new Date())
  const status = client?.membershipStatus
  const endRaw = client?.activeMembership?.endDate

  if (['trial', 'trial_expired'].includes(status || '') || !endRaw) {
    return { startDate: today, daysSinceEnd: null, showLapseConfirm: false }
  }

  const end = startOfDay(new Date(endRaw))
  const daysSinceEnd = differenceInCalendarDays(today, end)

  if (status === 'expired' && daysSinceEnd > RENEWAL_GRACE_DAYS) {
    return { startDate: today, daysSinceEnd, showLapseConfirm: true }
  }

  return { startDate: addDays(end, 1), daysSinceEnd, showLapseConfirm: false }
}

export function getRenewalStartDateNote(endDate?: string | Date | null): string | undefined {
  if (!endDate) return undefined

  const today = startOfDay(new Date())
  const end = startOfDay(new Date(endDate))
  const daysSinceEnd = differenceInCalendarDays(today, end)
  const dateLabel = format(end, 'dd MMM yyyy')

  if (daysSinceEnd > 0) {
    const daysLabel = daysSinceEnd === 1 ? '1 day' : `${daysSinceEnd} days`
    return `Membership expired ${daysLabel} ago on ${dateLabel}.`
  }

  if (daysSinceEnd === 0) {
    return `Membership expires today (${dateLabel}).`
  }

  const daysLeft = Math.abs(daysSinceEnd)
  const leftLabel = daysLeft === 1 ? '1 day' : `${daysLeft} days`
  return `Current membership is still active until ${dateLabel} (in ${leftLabel}).`
}
