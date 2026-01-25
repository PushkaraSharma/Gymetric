export const formatDDMMYYYY = (date) => {
    const d = new Date(date); // safe even if input is string
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

export const parseDateToLocalMidNight = (startDate) => {
    const [y, m, d] = startDate.split('-').map(Number);
    return new Date(y, m - 1, d);
};
