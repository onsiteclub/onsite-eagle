// tests/unit/engine/visor-scenarios.test.ts
// One snapshot test per scenario from cenarios-visor-calculadora-onsite-v3.html.
// Validates the engine → CalculationResult contract end-to-end so the visor
// can render any scenario from the spec without per-case logic.

import { describe, it, expect } from 'vitest';
import { calculate } from '../../../src/engine';
import type { CalculationResult } from '../../../src/engine';

function ok(input: string): CalculationResult {
  const r = calculate(input);
  if (!r) throw new Error(`calculate(${JSON.stringify(input)}) returned null`);
  if (r.isError) throw new Error(`expected ok, got error: ${r.errorMessage}`);
  return r;
}

function err(input: string): CalculationResult {
  const r = calculate(input);
  if (!r) throw new Error(`calculate(${JSON.stringify(input)}) returned null`);
  if (!r.isError) throw new Error(`expected error, got ok: ${r.primary.value}`);
  return r;
}

// ============================================================================
// VOLUME 1 — ESCALAR PURO
// ============================================================================

describe('Vol 1 — escalar puro', () => {
  it('1.1 adição de inteiros: 2 + 2 = 4', () => {
    const r = ok('2 + 2');
    expect(r.dim).toBe(0);
    expect(r.dimension).toBe('scalar');
    expect(r.primary.value).toBe('4');
    expect(r.primary.unitLabel).toBeNull();
    expect(r.secondary).toBeNull();
    expect(r.mixedSystems).toBe(false);
  });

  it('1.3 tradução de operador: 100 * 3 → armação 100 × 3', () => {
    const r = ok('100 * 3');
    expect(r.expression).toContain('×');
    expect(r.primary.value).toBe('300');
  });

  it('1.4 dízima: 10 / 3 → ≈ 3.3333 + exactForm 10/3', () => {
    const r = ok('10 / 3');
    expect(r.dim).toBe(0);
    expect(r.isApproximate).toBe(true);
    expect(r.exactForm).toBe('10/3');
    // Display gets locale-formatted; we just assert it starts with "3" and
    // contains the truncation rather than pinning the locale separator here.
    expect(r.primary.value.startsWith('3')).toBe(true);
  });

  it('1.5 parênteses explícitos: (2 + 3) × 4 = 20', () => {
    const r = ok('(2 + 3) * 4');
    expect(r.primary.value).toBe('20');
    expect(r.expression).toContain('×');
  });

  it('1.6 PEMDAS implícito: 4 + 4 × 10 = 44', () => {
    const r = ok('4 + 4 * 10');
    expect(r.primary.value).toBe('44');
  });
});

// ============================================================================
// VOLUME 2 — FRAÇÕES PURAS
// ============================================================================

describe('Vol 2 — frações puras', () => {
  it('2.1 frações próprias: 1/2 + 1/4 = 3/4', () => {
    const r = ok('1/2 + 1/4');
    expect(r.dim).toBe(1);  // bare fraction defaults to length (inches)
    // 1/2" + 1/4" = 3/4"
    expect(r.primary.value).toBe(`3/4"`);
  });

  it('2.2 números mistos: 5 1/2 + 3 1/4 = 8 3/4 inches', () => {
    const r = ok('5 1/2 + 3 1/4');
    expect(r.primary.value).toBe(`8 3/4"`);
    expect(r.valueCanonical).toBeCloseTo(8.75, 5);
  });

  it('2.3 fração que vira inteiro: 3/2 + 3/2 = 3 inches', () => {
    const r = ok('3/2 + 3/2');
    expect(r.valueCanonical).toBeCloseTo(3, 5);
  });
});

// ============================================================================
// VOLUME 3 — COMPRIMENTO IMPERIAL
// ============================================================================

describe('Vol 3 — comprimento imperial', () => {
  it(`3.1 soma feet-inches: 2' 6" + 3' 6" = 6' 0"`, () => {
    const r = ok(`2' 6" + 3' 6"`);
    expect(r.dim).toBe(1);
    expect(r.primary.value).toBe(`6' 0"`);
    expect(r.secondary).toBeNull();
    expect(r.valueCanonical).toBe(72);
  });

  it(`3.2 dash-separated: 2'-6" + 1'-6" = 4' 0"`, () => {
    const r = ok(`2'-6" + 1'-6"`);
    expect(r.primary.value).toBe(`4' 0"`);
    expect(r.valueCanonical).toBe(48);
  });

  it(`3.3 polegadas com fração < 12": 5 1/2" + 3 1/4" = 8 3/4"`, () => {
    const r = ok(`5 1/2" + 3 1/4"`);
    expect(r.primary.value).toBe(`8 3/4"`);
    expect(r.valueCanonical).toBeCloseTo(8.75, 5);
  });

  it(`3.4 feet-inches com fração: 7' 2 1/2" + 0' 2 1/8" = 7' 4 5/8"`, () => {
    const r = ok(`7' 2 1/2" + 0' 2 1/8"`);
    expect(r.primary.value).toBe(`7' 4 5/8"`);
  });

  it(`3.5 resultado negativo: 2' - 3' = -1' 0" with Unicode minus`, () => {
    const r = ok(`2' - 3'`);
    expect(r.primary.value).toBe(`−1' 0"`);
    expect(r.valueCanonical).toBe(-12);
  });
});

// ============================================================================
// VOLUME 4 — COMPRIMENTO MÉTRICO
// ============================================================================

describe('Vol 4 — comprimento métrico', () => {
  it('4.1 metros com vírgula decimal: 3,5 m + 2,5 m = 6 m', () => {
    const r = ok('3,5 m + 2,5 m');
    expect(r.dim).toBe(1);
    expect(r.primary.value).toMatch(/^6\s*m$/);
    expect(r.secondary).toBeNull();
  });

  it('4.2 cm preserved when result fits: 50 cm + 30 cm = 80 cm', () => {
    const r = ok('50 cm + 30 cm');
    expect(r.primary.value).toMatch(/^80\s*cm$/);
  });

  it('4.3 cm scales to m at ≥ 100 cm: 75 cm + 80 cm shows in m', () => {
    const r = ok('75 cm + 80 cm');
    expect(r.primary.value.endsWith('m')).toBe(true);
    expect(r.primary.value).not.toContain('cm');
  });

  it('4.4 mm preserved: 8 mm + 5 mm = 13 mm', () => {
    const r = ok('8 mm + 5 mm');
    expect(r.primary.value).toMatch(/^13\s*mm$/);
  });
});

// ============================================================================
// VOLUME 5 — ÁREA
// ============================================================================

describe('Vol 5 — área (length × length)', () => {
  it(`5.1 área imperial: 12' × 8' → 96 sq ft + m²`, () => {
    const r = ok(`12' * 8'`);
    expect(r.dim).toBe(2);
    expect(r.dimension).toBe('area');
    expect(r.primary.unitLabel).toBe('sq ft');
    expect(r.primary.value).toBe('96');
    expect(r.secondary).not.toBeNull();
    expect(r.secondary?.unitLabel).toBe('m²');
  });

  it(`5.2 área métrica: 3,5 m × 4 m → 14 m² + sq ft`, () => {
    const r = ok('3,5 m * 4 m');
    expect(r.dim).toBe(2);
    expect(r.primary.unitLabel).toBe('m²');
    expect(r.primary.value).toBe('14');
    expect(r.secondary?.unitLabel).toBe('sq ft');
  });
});

// ============================================================================
// VOLUME 6 — VOLUME
// ============================================================================

describe('Vol 6 — volume (length × length × length)', () => {
  it(`6.1 volume imperial: 10' × 8' × 9' → 720 cu ft + m³`, () => {
    const r = ok(`10' * 8' * 9'`);
    expect(r.dim).toBe(3);
    expect(r.dimension).toBe('volume');
    expect(r.primary.unitLabel).toBe('cu ft');
    expect(r.primary.value).toBe('720');
    expect(r.secondary?.unitLabel).toBe('m³');
  });

  it(`6.2 volume métrico: 3 m × 4 m × 2,5 m → 30 m³ + cu ft`, () => {
    const r = ok('3 m * 4 m * 2,5 m');
    expect(r.dim).toBe(3);
    expect(r.primary.unitLabel).toBe('m³');
    expect(r.primary.value).toBe('30');
    expect(r.secondary?.unitLabel).toBe('cu ft');
  });
});

// ============================================================================
// VOLUME 7 — SISTEMAS MISTOS
// ============================================================================

describe('Vol 7 — sistemas mistos', () => {
  it(`7.1 length mixed: 2' 6" + 76 cm → dual com labels imperial/métrico`, () => {
    const r = ok(`2' 6" + 76 cm`);
    expect(r.dim).toBe(1);
    expect(r.mixedSystems).toBe(true);
    expect(r.primary.unitLabel).toBe('imperial');
    expect(r.secondary?.unitLabel).toBe('métrico');
  });

  it(`7.3 multiplicação mista → área: 2 m × 4' → m² + sq ft`, () => {
    const r = ok(`2 m * 4'`);
    expect(r.dim).toBe(2);
    // dim ≥ 2 → labels são unidades, não sistemas, mesmo com mixedSystems true
    expect(r.primary.unitLabel === 'm²' || r.primary.unitLabel === 'sq ft').toBe(true);
    expect(r.secondary).not.toBeNull();
  });
});

// ============================================================================
// VOLUME 8 — ERROS
// ============================================================================

describe('Vol 8 — erros', () => {
  it('8.1 expressão incompleta: 5 + → "incomplete"', () => {
    const r = err('5 +');
    expect(r.errorKind).toBe('incomplete');
    expect(r.errorMessage).toBeTruthy();
    expect(r.primary.value).toBe('');
  });

  it('8.2 parêntese não fechado: (2 + 3 → "unbalanced_paren"', () => {
    const r = err('(2 + 3');
    expect(r.errorKind).toBe('unbalanced_paren');
    expect(r.errorMessage).toMatch(/parênt/i);
  });

  it('8.3 número malformado: 1.2.3 → "malformed_number"', () => {
    const r = err('1.2.3');
    expect(r.errorKind).toBe('malformed_number');
    expect(r.errorMessage).toContain('1.2.3');
  });

  it('8.4 divisão por zero: 10 / 0 → "division_by_zero"', () => {
    const r = err('10 / 0');
    expect(r.errorKind).toBe('division_by_zero');
    expect(r.errorMessage).toMatch(/zero/i);
  });

  it('8.5 operadores duplicados: 5 ++ 3 → "duplicate_operators"', () => {
    const r = err('5 ++ 3');
    expect(r.errorKind).toBe('duplicate_operators');
  });
});

// ============================================================================
// MATRIZ DE DECISÃO — verificação cruzada
// ============================================================================

describe('Decision matrix — invariantes', () => {
  it('error result: primary.value is empty + secondary is null', () => {
    const r = err('5 +');
    expect(r.primary.value).toBe('');
    expect(r.secondary).toBeNull();
    expect(r.valueCanonical).toBeNull();
  });

  it('scalar result: secondary is null', () => {
    const r = ok('2 + 2');
    expect(r.secondary).toBeNull();
  });

  it('dim ≥ 2 result: secondary is non-null', () => {
    const r = ok(`12' * 8'`);
    expect(r.secondary).not.toBeNull();
  });

  it('mixed-systems length: secondary is non-null with sistema labels', () => {
    const r = ok(`2' 6" + 76 cm`);
    expect(r.secondary).not.toBeNull();
    expect(['imperial', 'métrico']).toContain(r.primary.unitLabel ?? '');
  });

  it('exact arithmetic: 0.1 + 0.2 = 0.3 sem drift', () => {
    const r = ok('0.1 + 0.2');
    expect(r.valueCanonical).toBe(0.3);
  });

  it('exact rational: 1/3 + 1/3 + 1/3 = 1', () => {
    const r = ok('1/3 + 1/3 + 1/3');
    expect(r.valueCanonical).toBeCloseTo(1, 10);
  });
});
