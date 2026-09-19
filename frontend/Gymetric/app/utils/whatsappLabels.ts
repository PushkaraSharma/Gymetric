export const WHATSAPP_TEMPLATE_LABELS: Record<string, string> = {
  onboarding: 'Welcome',
  renewal_complete: 'Renewal',
  expired: 'Expired',
  renewal: 'Reminder',
}

export const WHATSAPP_STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  skipped: 'Skipped',
}

export const WHATSAPP_STATUS_CHIPS = [
  { id: 'all', label: 'All status' },
  ...Object.entries(WHATSAPP_STATUS_LABELS).map(([id, label]) => ({ id, label })),
]

export const WHATSAPP_TEMPLATE_CHIPS = [
  { id: 'all', label: 'All' },
  ...Object.entries(WHATSAPP_TEMPLATE_LABELS).map(([id, label]) => ({ id, label })),
]

export const whatsappTemplateLabel = (template?: string) =>
  (template && WHATSAPP_TEMPLATE_LABELS[template]) || template || 'WhatsApp'

export const whatsappStatusLabel = (status?: string) =>
  (status && WHATSAPP_STATUS_LABELS[status]) || status || 'Unknown'
