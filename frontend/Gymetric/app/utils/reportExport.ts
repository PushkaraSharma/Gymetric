import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { formatTimeOfDay } from '@/utils/time'

export type ReportColumn = { key: string; label: string; type?: 'text' | 'money' | 'date' | 'datetime' | 'number' }
export type Report = {
  title: string
  from: string
  to: string
  columns: ReportColumn[]
  rows: Record<string, any>[]
  summary: { label: string; value: string | number; money?: boolean }[]
}

export const formatRupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

const shortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatCell = (column: ReportColumn, value: any): string => {
  if (value === null || value === undefined || value === '') return '—'
  switch (column.type) {
    case 'money':
      return formatRupees(Number(value))
    case 'date':
      return shortDate(value)
    case 'datetime':
      return `${shortDate(value)}, ${formatTimeOfDay(value)}`
    default:
      return String(value)
  }
}

const summaryText = (item: Report['summary'][number]) => (item.money ? formatRupees(Number(item.value)) : String(item.value))

const csvCell = (text: string) => (/[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text)

const fileName = (report: Report, ext: string) =>
  `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${report.from}-to-${report.to}.${ext}`

export async function shareReportCsv(report: Report) {
  const lines = [
    report.columns.map((c) => csvCell(c.label)).join(','),
    ...report.rows.map((row) =>
      report.columns
        .map((c) => {
          const value = row[c.key]
          if (c.type === 'money' || c.type === 'number') return String(value ?? 0)
          return csvCell(value === null || value === undefined ? '' : formatCell(c, value))
        })
        .join(','),
    ),
  ]
  const uri = `${FileSystem.cacheDirectory}${fileName(report, 'csv')}`
  await FileSystem.writeAsStringAsync(uri, lines.join('\n'))
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: report.title, UTI: 'public.comma-separated-values-text' })
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function shareReportPdf(report: Report, gymName: string) {
  const numeric = (c: ReportColumn) => c.type === 'money' || c.type === 'number'
  const html = `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, sans-serif; color: #0f172a; padding: 24px; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: #64748b; font-size: 12px; margin: 4px 0 16px; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .chip { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px; }
  .chip b { display: block; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #f1f5f9; padding: 6px; border-bottom: 1px solid #cbd5e1; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
  .num { text-align: right; }
</style></head><body>
<h1>${escapeHtml(report.title)}</h1>
<div class="sub">${escapeHtml(gymName)} · ${shortDate(report.from)} – ${shortDate(report.to)}</div>
<div class="summary">${report.summary.map((s) => `<div class="chip">${escapeHtml(s.label)}<b>${escapeHtml(summaryText(s))}</b></div>`).join('')}</div>
<table><thead><tr>${report.columns.map((c) => `<th class="${numeric(c) ? 'num' : ''}">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
<tbody>${report.rows
    .map((row) => `<tr>${report.columns.map((c) => `<td class="${numeric(c) ? 'num' : ''}">${escapeHtml(formatCell(c, row[c.key]))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>
</body></html>`
  const { uri } = await Print.printToFileAsync({ html })
  const named = `${FileSystem.cacheDirectory}${fileName(report, 'pdf')}`
  await FileSystem.deleteAsync(named, { idempotent: true })
  await FileSystem.copyAsync({ from: uri, to: named })
  await Sharing.shareAsync(named, { mimeType: 'application/pdf', dialogTitle: report.title, UTI: 'com.adobe.pdf' })
}

export { summaryText }

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trial: 'Trial',
  future: 'Starts later',
  paused: 'Frozen',
  expired: 'Expired',
  trial_expired: 'Trial ended',
}

// Every client as a report, so it shares through the same PDF / CSV path as Reports.
export const clientsReport = (clients: any[]): Report => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    title: 'Clients',
    from: today,
    to: today,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
      { key: 'plan', label: 'Plan' },
      { key: 'ends', label: 'Ends', type: 'date' },
      { key: 'balance', label: 'Balance due', type: 'money' },
    ],
    rows: clients.map((client) => ({
      name: client.name,
      phone: client.phoneNumber,
      status: STATUS_LABEL[client.membershipStatus] ?? client.membershipStatus,
      plan: client.activeMembership?.planName,
      ends: client.activeMembership?.endDate,
      balance: client.balance || 0,
    })),
    summary: [
      { label: 'Clients', value: clients.length },
      { label: 'Active', value: clients.filter((c) => c.membershipStatus === 'active').length },
      { label: 'Balance due', value: clients.reduce((total, c) => total + (c.balance || 0), 0), money: true },
    ],
  }
}
