import { loadString, saveString } from '@/utils/LocalStorage'

export type ReceiptFormatPreference = 'ask' | 'image' | 'pdf'

export const RECEIPT_FORMAT_PREF_KEY = 'receiptFormatPreference'
export const AUTO_SHARE_RECEIPT_KEY = 'autoShareReceiptAfterMembership'

export const RECEIPT_FORMAT_OPTIONS: { label: string; value: ReceiptFormatPreference }[] = [
    { label: 'Ask Every Time', value: 'ask' },
    { label: 'Always Image', value: 'image' },
    { label: 'Always PDF', value: 'pdf' },
]

export const getReceiptFormatPreference = (): ReceiptFormatPreference => {
    const stored = loadString(RECEIPT_FORMAT_PREF_KEY)
    return stored === 'image' || stored === 'pdf' || stored === 'ask' ? stored : 'ask'
}

export const saveReceiptFormatPreference = (value: ReceiptFormatPreference) => {
    saveString(RECEIPT_FORMAT_PREF_KEY, value)
}

export const getAutoShareReceiptPreference = () => {
    const stored = loadString(AUTO_SHARE_RECEIPT_KEY)
    return stored === 'false' ? false : true
}

export const saveAutoShareReceiptPreference = (value: boolean) => {
    saveString(AUTO_SHARE_RECEIPT_KEY, value ? 'true' : 'false')
}

export const getReceiptFormatLabel = (value: ReceiptFormatPreference) => {
    return RECEIPT_FORMAT_OPTIONS.find((option) => option.value === value)?.label ?? RECEIPT_FORMAT_OPTIONS[0].label
}
