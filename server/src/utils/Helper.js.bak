export const formatDDMMYYYY = (date) => {
    const d = new Date(date); // safe even if input is string
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

export const parseDateToUTCMidnight = (startDate) => {
  const [y, m, d] = startDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const utcStartOfDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const utcStartOfMonth = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

export const addUtcDays = (d, days) =>
  new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

export const formatDateDDMonYYY = (date) => {
  return date.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
};

export const textParam = (value) => ({
  type: 'text',
  text: String(value),
});