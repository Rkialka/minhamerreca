import { describe, it, expect } from 'vitest';
import { parseMoney, formatMoney, splitInstallments } from './money';
import { addMonths, toISODate } from './dates';

describe('parseMoney', () => {
    it('pt-BR com milhar', () => expect(parseMoney('1.234,56')).toBe(1234.56));
    it('pt-BR simples', () => expect(parseMoney('300,00')).toBe(300));
    it('formato ponto decimal', () => expect(parseMoney('1234.56')).toBe(1234.56));
    it('número puro', () => expect(parseMoney(99.9)).toBe(99.9));
    it('vazio/lixo', () => { expect(parseMoney('')).toBe(0); expect(parseMoney(null)).toBe(0); });
});

describe('formatMoney', () => {
    it('formata pt-BR', () => expect(formatMoney(1234.5)).toBe('1.234,50'));
});

describe('splitInstallments', () => {
    it('divide exato', () => expect(splitInstallments(300, 3)).toEqual([100, 100, 100]));
    it('centavos na primeira', () => {
        const parts = splitInstallments(100, 3);
        expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
        expect(parts[0]).toBeGreaterThan(parts[1]);
    });
    it('n inválido vira 1', () => expect(splitInstallments(50, 0)).toEqual([50]));
});

describe('addMonths', () => {
    it('sem overflow de fim de mês', () => {
        expect(toISODate(addMonths(new Date('2026-01-31T12:00:00'), 1))).toBe('2026-02-28');
    });
    it('mês normal', () => {
        expect(toISODate(addMonths(new Date('2026-08-12T12:00:00'), 2))).toBe('2026-10-12');
    });
});
