// Fonte única de parse/format monetário (pt-BR).

// "1.234,56" | "1234,56" | "1234.56" | 1234.56 -> 1234.56 (Number)
export function parseMoney(value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;
    const s = value.trim();
    if (!s) return 0;
    // formato pt-BR: remove separador de milhar ".", troca "," decimal por "."
    if (s.includes(',')) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(s) || 0;
}

// 1234.56 -> "1.234,56"
export function formatMoney(value) {
    const n = typeof value === 'number' ? value : parseMoney(value);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Divide um total em N parcelas que somam exatamente o total (centavos na 1ª)
export function splitInstallments(total, count) {
    const n = Math.max(1, Math.floor(count) || 1);
    const cents = Math.round(parseMoney(total) * 100);
    const base = Math.floor(cents / n);
    const remainder = cents - base * n;
    return Array.from({ length: n }, (_, i) => (base + (i === 0 ? remainder : 0)) / 100);
}
