// Datas seguras para lançamentos mensais.

// Soma meses SEM overflow de fim de mês (31/jan +1 -> 28/fev, não 03/mar)
export function addMonths(date, months) {
    const d = new Date(date);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d;
}

// Date -> "YYYY-MM-DD" (local, sem surpresa de timezone)
export function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
