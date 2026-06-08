import { OTA_VERSION } from './Constants'

export interface WhatsNewEntry {
  version: number
  title: string
  highlights: string[]
}

export const WHATS_NEW_CONTENT: WhatsNewEntry[] = [
  {
    version: 2,
    title: 'What\'s New',
    highlights: [
      'New updated UI',
      'Membership pause/edit',
      'Member balances clear',
      'Rent Receipts now can be generated and shared',
      'More detailed dashboard for better insights',
      'Push Notifications ',
    ],
  },
]

export const getWhatsNewForVersion = (version: number) =>
  WHATS_NEW_CONTENT.find((entry) => entry.version === version)

export const CURRENT_WHATS_NEW = getWhatsNewForVersion(OTA_VERSION)
