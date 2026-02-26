// tests/unit/thousands-separator.test.ts
// Verifica que o sanitizador de separador de milhar funciona corretamente

import { describe, it, expect } from 'vitest';

// Replica a regex usada em api/interpret.ts para testar isoladamente
function sanitizeThousandsSeparator(expr: string): string {
  // Aplicar repetidamente para "1.000.000" → "1000.000" → "1000000"
  let result = expr;
  let prev;
  do {
    prev = result;
    result = result.replace(/(\d)\.(\d{3})(?=\D|$)/g, '$1$2');
  } while (result !== prev);
  return result;
}

describe('Thousands separator sanitization', () => {
  // Separadores de milhar devem ser removidos
  it('removes dot as thousands separator: 10.052 → 10052', () => {
    expect(sanitizeThousandsSeparator('10.052')).toBe('10052');
  });

  it('removes dot: 1.325 → 1325', () => {
    expect(sanitizeThousandsSeparator('1.325')).toBe('1325');
  });

  it('removes dot: 20.000 → 20000', () => {
    expect(sanitizeThousandsSeparator('20.000')).toBe('20000');
  });

  it('handles multiple thousands separators: 1.000.000 → 1000000', () => {
    expect(sanitizeThousandsSeparator('1.000.000')).toBe('1000000');
  });

  it('handles in expressions: 10.052 + 5.000 → 10052 + 5000', () => {
    expect(sanitizeThousandsSeparator('10.052 + 5.000')).toBe('10052 + 5000');
  });

  it('handles mixed: 10.052 + 2.5 → 10052 + 2.5', () => {
    expect(sanitizeThousandsSeparator('10.052 + 2.5')).toBe('10052 + 2.5');
  });

  // Decimais legítimos NÃO devem ser afetados
  it('preserves valid decimal: 10.5 stays 10.5', () => {
    expect(sanitizeThousandsSeparator('10.5')).toBe('10.5');
  });

  it('preserves valid decimal: 2.5 stays 2.5', () => {
    expect(sanitizeThousandsSeparator('2.5')).toBe('2.5');
  });

  it('preserves valid decimal: 3.14 stays 3.14', () => {
    expect(sanitizeThousandsSeparator('3.14')).toBe('3.14');
  });

  it('preserves metric with decimal: 2.5m stays 2.5m', () => {
    expect(sanitizeThousandsSeparator('2.5m')).toBe('2.5m');
  });

  it('preserves valid decimal: 0.75 stays 0.75', () => {
    expect(sanitizeThousandsSeparator('0.75')).toBe('0.75');
  });

  // Frações e feet não devem ser afetados
  it('preserves fractions: 5 1/2 stays 5 1/2', () => {
    expect(sanitizeThousandsSeparator('5 1/2')).toBe('5 1/2');
  });

  it('preserves feet: 3\' 6 stays 3\' 6', () => {
    expect(sanitizeThousandsSeparator("3' 6")).toBe("3' 6");
  });

  // Números simples não devem ser afetados
  it('preserves plain integers: 10052 stays 10052', () => {
    expect(sanitizeThousandsSeparator('10052')).toBe('10052');
  });

  it('preserves plain integer: 100 stays 100', () => {
    expect(sanitizeThousandsSeparator('100')).toBe('100');
  });
});
