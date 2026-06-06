import { format } from "date-fns/format"
import type { Locale } from "date-fns/locale"
import { parseISO } from "date-fns/parseISO"
import { enUS } from "date-fns/locale/en-US"

type Options = Parameters<typeof format>[2]

const dateFnsLocale: Locale = enUS

export const loadDateFnsLocale = () => {
  // English-only locale
}

export const formatDate = (date: string, dateFormat?: string, options?: Options) => {
  const dateOptions = {
    ...options,
    locale: dateFnsLocale,
  }
  return format(parseISO(date), dateFormat ?? "MMM dd, yyyy", dateOptions)
}
