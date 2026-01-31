import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current time in IST
 */
export const getNowIST = () => {
    return dayjs().tz(IST_TIMEZONE);
};

/**
 * Returns a UTC Date object representing 00:00:00 IST for "Today"
 */
export const getISTMidnightToday = () => {
    return dayjs().tz(IST_TIMEZONE).startOf('day').toDate();
};

/**
 * Parses a date string (YYYY-MM-DD) and returns a UTC Date at 00:00:00 IST
 */
export const parseToISTMidnight = (dateStr: string) => {
    return dayjs.tz(dateStr, IST_TIMEZONE).startOf('day').toDate();
};

/**
 * Formats a date for display (DD-MM-YYYY)
 */
export const formatDisplayDate = (date: Date | string) => {
    return dayjs(date).format('DD-MM-YYYY');
};

/**
 * Formats a date for WhatsApp/Logs (DD Mon YYYY)
 */
export const formatShortDate = (date: Date | string) => {
    return dayjs(date).format('DD MMM YYYY');
};

/**
 * Calculates expiry date based on duration.
 * Set to 23:59:59 IST of the end day.
 */
export const calculateMembershipExpiry = (startDate: Date, months: number, days: number) => {
    let date = dayjs(startDate).tz(IST_TIMEZONE);

    if (months > 0) {
        date = date.add(months, 'month').subtract(1, 'day');
    } else {
        date = date.add(days - 1, 'day');
    }

    return date.endOf('day').toDate();
};

// Aliases for dashboard and older code compatibility
export const utcStartOfDay = (d: Date = new Date()) => dayjs(d).tz(IST_TIMEZONE).startOf('day').toDate();
export const utcStartOfMonth = (d: Date = new Date()) => dayjs(d).tz(IST_TIMEZONE).startOf('month').toDate();
export const addUtcDays = (d: Date, days: number) => dayjs(d).add(days, 'day').toDate();
export const formatDateDDMonYYY = (date: Date | string) => dayjs(date).format('DD MMM YYYY');
export const formatDDMMYYYY = (date: Date | string) => dayjs(date).format('DD-MM-YYYY');
export const parseDateToUTCMidnight = (dateStr: string) => parseToISTMidnight(dateStr);
export const textParam = (value: any) => ({
    type: 'text',
    text: String(value),
});
