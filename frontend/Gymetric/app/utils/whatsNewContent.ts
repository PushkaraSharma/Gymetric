import { OTA_VERSION } from './Constants'

export interface WhatsNewEntry {
  version: number
  title: string
  highlights: string[]
}

export const WHATS_NEW_CONTENT: WhatsNewEntry[] = [
  {
    version: OTA_VERSION,
    title: 'What\'s New',
    highlights: [
      'UI improvements',
      'User settings moved to avatar menu',
      'Revenue for this month, last month, last 6 months, or a custom range',
      'Full activity history with date filters',
      'Whatsapp onboarding message image can be uploaded',
      'Top Selling Plans breakdown in dashboard',
    ],
  },
]

export const getWhatsNewForVersion = (version: number) =>
  WHATS_NEW_CONTENT.find((entry) => entry.version === version)

export const CURRENT_WHATS_NEW = getWhatsNewForVersion(OTA_VERSION)
