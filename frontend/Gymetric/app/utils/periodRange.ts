import { addDays, addMonths, format, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns'

export type PeriodId =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'last_6_months'
  | 'custom'

export type PeriodOption = { id: PeriodId; label: string }

export const REVENUE_PERIODS: PeriodOption[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_6_months', label: 'Last 6 months' },
]

export const ACTIVITY_PERIODS: PeriodOption[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
]

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export function periodBounds(id: PeriodId, customFrom?: Date, customTo?: Date) {
  const today = startOfDay(new Date())
  let from = today
  let toInclusive = today
  switch (id) {
    case 'today':
      break
    case 'yesterday':
      from = subDays(today, 1)
      toInclusive = from
      break
    case 'last_7_days':
      from = subDays(today, 6)
      break
    case 'this_month':
      from = startOfMonth(today)
      break
    case 'last_month': {
      from = startOfMonth(subMonths(today, 1))
      toInclusive = subDays(startOfMonth(today), 1)
      break
    }
    case 'last_6_months':
      from = startOfMonth(subMonths(today, 5))
      break
    case 'custom':
      from = startOfDay(customFrom || today)
      toInclusive = startOfDay(customTo || today)
      break
  }
  return { from: ymd(from), to: ymd(toInclusive), fromDate: from, toDate: toInclusive }
}

export function rangeError(from: Date, to: Date) {
  const a = startOfDay(from)
  const b = startOfDay(to)
  if (b < a) return 'End date must be on or after start date'
  if (b > addMonths(a, 6)) return 'Range cannot exceed 6 months'
  return null
}

export function periodLabel(id: PeriodId, customFrom?: Date, customTo?: Date) {
  if (id === 'custom' && customFrom && customTo) {
    return `${format(customFrom, 'd MMM')} – ${format(customTo, 'd MMM')}`
  }
  const match = [...REVENUE_PERIODS, ...ACTIVITY_PERIODS].find((o) => o.id === id)
  return match?.label || 'This month'
}

export const customMinDate = () => subMonths(startOfDay(new Date()), 6)
export const customMaxDate = () => new Date()
