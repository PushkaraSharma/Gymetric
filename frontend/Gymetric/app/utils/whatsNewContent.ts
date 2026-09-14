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
      'Top Selling Plans breakdown in dashboard',
      'Membership pause/edit',
      'Member balances clear',
      'Rent Receipts now can be generated and shared',
      'More detailed dashboard for better insights',
      'Push Notifications ',
      'Bug fixes and improvements',
    ],
  },
]

export const getWhatsNewForVersion = (version: number) =>
  WHATS_NEW_CONTENT.find((entry) => entry.version === version)

export const CURRENT_WHATS_NEW = getWhatsNewForVersion(OTA_VERSION)
