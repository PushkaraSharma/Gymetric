import { addDays, isAfter, isBefore, isSameDay, parseISO, startOfMonth } from 'date-fns'

export const STATUS_FILTER_IDS = [
  'All Clients',
  'Active',
  'Expiring Today',
  'Expiring Soon',
  'Has Balance',
  'Expired',
  'Recently Expired',
  'New this month',
  'Trial',
  'Paused',
] as const

export type StatusFilterId = (typeof STATUS_FILTER_IDS)[number]

export type SortKey = 'name_asc' | 'name_desc' | 'expiry_soonest' | 'newest_joined'

export type GenderFilter = 'All' | 'Male' | 'Female' | 'Other'

export const isExpiringToday = (c: any, now: Date) => {
  if (c.membershipStatus !== 'active' || !c.activeMembership?.endDate) return false
  return isSameDay(parseISO(c.activeMembership.endDate), now)
}

export const isExpiringSoon = (c: any, now: Date, sevenDays: Date) => {
  if (c.membershipStatus !== 'active' || !c.activeMembership?.endDate) return false
  const end = parseISO(c.activeMembership.endDate)
  return isAfter(end, now) && isBefore(end, sevenDays)
}

export const isRecentlyExpired = (c: any, now: Date) => {
  if (c.membershipStatus !== 'expired' && c.membershipStatus !== 'trial_expired') return false
  if (!c.activeMembership?.endDate) return false
  const end = parseISO(c.activeMembership.endDate)
  const cutoff = addDays(now, -14)
  return (isAfter(end, cutoff) || isSameDay(end, cutoff)) && (isBefore(end, now) || isSameDay(end, now))
}

export const isNewThisMonth = (c: any, now: Date) => {
  if (!c.createdAt) return false
  const created = new Date(c.createdAt)
  return !Number.isNaN(created.getTime()) && !isBefore(created, startOfMonth(now))
}

export const matchesStatusFilter = (c: any, filter: StatusFilterId, now: Date, sevenDaysFromNow: Date) => {
  switch (filter) {
    case 'Active':
      return c.membershipStatus === 'active'
    case 'Expired':
      return c.membershipStatus === 'expired' || c.membershipStatus === 'trial_expired'
    case 'Trial':
      return c.membershipStatus === 'trial'
    case 'Has Balance':
      return (c.balance || 0) > 0
    case 'Paused':
      return c.membershipStatus === 'paused'
    case 'Expiring Today':
      return isExpiringToday(c, now)
    case 'Expiring Soon':
      return isExpiringSoon(c, now, sevenDaysFromNow)
    case 'Recently Expired':
      return isRecentlyExpired(c, now)
    case 'New this month':
      return isNewThisMonth(c, now)
    default:
      return true
  }
}

export const matchesGenderFilter = (c: any, gender: GenderFilter) => {
  if (gender === 'All') return true
  return c.gender === gender
}

export const matchesPlanFilter = (c: any, selectedPlans: string[]) => {
  if (!selectedPlans.length) return true
  const plan = c.activeMembership?.planName
  return plan ? selectedPlans.includes(plan) : false
}

export const sortClients = (list: any[], sortKey: SortKey) => {
  const copy = [...list]
  copy.sort((a, b) => {
    switch (sortKey) {
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '')
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '')
      case 'expiry_soonest': {
        const aEnd = a.activeMembership?.endDate ? parseISO(a.activeMembership.endDate).getTime() : Infinity
        const bEnd = b.activeMembership?.endDate ? parseISO(b.activeMembership.endDate).getTime() : Infinity
        return aEnd - bEnd
      }
      case 'newest_joined': {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bCreated - aCreated
      }
      default:
        return 0
    }
  })
  return copy
}

export const computeFilterCounts = (clients: any[]) => {
  const now = new Date()
  const sevenDays = addDays(now, 7)
  const counts: Record<string, number> = { 'All Clients': clients.length }
  clients.forEach((c: any) => {
    if (c.membershipStatus === 'active') counts['Active'] = (counts['Active'] || 0) + 1
    if (c.membershipStatus === 'expired' || c.membershipStatus === 'trial_expired') counts['Expired'] = (counts['Expired'] || 0) + 1
    if (c.membershipStatus === 'trial') counts['Trial'] = (counts['Trial'] || 0) + 1
    if ((c.balance || 0) > 0) counts['Has Balance'] = (counts['Has Balance'] || 0) + 1
    if (c.membershipStatus === 'paused') counts['Paused'] = (counts['Paused'] || 0) + 1
    if (isExpiringToday(c, now)) counts['Expiring Today'] = (counts['Expiring Today'] || 0) + 1
    if (isExpiringSoon(c, now, sevenDays)) counts['Expiring Soon'] = (counts['Expiring Soon'] || 0) + 1
    if (isRecentlyExpired(c, now)) counts['Recently Expired'] = (counts['Recently Expired'] || 0) + 1
    if (isNewThisMonth(c, now)) counts['New this month'] = (counts['New this month'] || 0) + 1
  })
  return counts
}
