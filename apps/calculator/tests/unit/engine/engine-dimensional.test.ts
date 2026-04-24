// tests/unit/engine/engine-dimensional.test.ts
// Phase 1 — Dimensional arithmetic regression tests.
// The D1 bug: `25' 6 × 31' 6` used to produce "9900' 9" (lengths multiplied
// as if they were scalars). This suite pins the correct behavior — the result
// is an AREA in square feet, and the engine tracks dim through arbitrary
// nested arithmetic.

import { describe, it, expect } from 'vitest';
import { calculate } from '../../../src/engine';

describe('Phase 1 — Dimensional engine: D1 regression', () => {
  it("25' 6 × 31' 6 = 803.25 sqft (was '9900' 9' under old scalar engine)", () => {
    const r = calculate("25' 6 * 31' 6");
    expect(r).not.toBeNull();
    expect(r!.dimension).toBe('area');
    expect(r!.unitCanonical).toBe('sqin');
    // 306 in × 378 in = 115668 sqin → 803.25 sqft
    expect(r!.valueCanonical).toBeCloseTo(115668, 1);
    expect(r!.displayPrimary).toBe('803.25 sq ft');
    expect(r!.displaySecondary).toBe('115668 sq in');
  });

  it("10' × 10' = 100 sq ft (simple area)", () => {
    const r = calculate("10' * 10'");
    expect(r!.dimension).toBe('area');
    // 120 in × 120 in = 14400 sqin → 100 sqft
    expect(r!.valueCanonical).toBeCloseTo(14400, 1);
    expect(r!.displayPrimary).toBe('100 sq ft');
  });

  it("3' × 4' = 12 sq ft (whole feet)", () => {
    const r = calculate("3' * 4'");
    expect(r!.dimension).toBe('area');
    expect(r!.displayPrimary).toBe('12 sq ft');
  });
});

describe('Phase 1 — Scalar arithmetic (no markers)', () => {
  it("10 * 10 without units is scalar 100", () => {
    const r = calculate('10 * 10');
    expect(r!.dimension).toBe('scalar');
    expect(r!.unitCanonical).toBe('number');
    expect(r!.valueCanonical).toBe(100);
    expect(r!.displayPrimary).toBe('100');
    expect(r!.displaySecondary).toBe('—');
  });

  it("100 + 50 is scalar 150", () => {
    const r = calculate('100 + 50');
    expect(r!.dimension).toBe('scalar');
    expect(r!.valueCanonical).toBe(150);
  });

  it("100 * 3 / 2 is scalar 150", () => {
    const r = calculate('100 * 3 / 2');
    expect(r!.dimension).toBe('scalar');
    expect(r!.valueCanonical).toBe(150);
  });
});

describe('Phase 1 — Length arithmetic (fraction or marker triggers length context)', () => {
  it('1/2 + 1/4 is length 3/4" (fraction alone triggers length)', () => {
    const r = calculate('1/2 + 1/4');
    expect(r!.dimension).toBe('length');
    expect(r!.valueCanonical).toBe(0.75);
    expect(r!.displayPrimary).toBe('3/4"');
  });

  it("5 1/2 + 3 * 2 = 11.5 inches (scalar coerces to length under context)", () => {
    // Carpenter writes `5 1/2 + 3 * 2` meaning "5½" + 6"" — engine must treat
    // the bare 3 and 2 in arithmetic context as a dimensionless multiplier,
    // then promote the resulting 6 to length when adding to the 5½" on the left.
    const r = calculate('5 1/2 + 3 * 2');
    expect(r!.dimension).toBe('length');
    expect(r!.valueCanonical).toBe(11.5);
  });

  it("5 * 3' = 15' (scalar × length = length)", () => {
    const r = calculate("5 * 3'");
    expect(r!.dimension).toBe('length');
    // 5 × 36 = 180 in = 15 feet
    expect(r!.valueCanonical).toBe(180);
    expect(r!.displayPrimary).toBe("15'");
  });

  it("2' × 6 = 12' (length × scalar = length)", () => {
    const r = calculate("2' * 6");
    expect(r!.dimension).toBe('length');
    expect(r!.valueCanonical).toBe(144); // 24 in × 6 = 144 in
    expect(r!.displayPrimary).toBe("12'");
  });
});

describe('Phase 1 — Volume arithmetic (length × length × length)', () => {
  it("10' × 10' × 8' = 800 cu ft (room volume)", () => {
    const r = calculate("10' * 10' * 8'");
    expect(r!.dimension).toBe('volume');
    expect(r!.unitCanonical).toBe('cuin');
    // 120 × 120 × 96 = 1382400 cuin → 800 cuft
    expect(r!.valueCanonical).toBeCloseTo(1382400, 1);
    expect(r!.displayPrimary).toBe('800 cu ft');
  });

  it("2' × 3' × 4' = 24 cu ft", () => {
    const r = calculate("2' * 3' * 4'");
    expect(r!.dimension).toBe('volume');
    expect(r!.displayPrimary).toBe('24 cu ft');
  });
});

describe('Phase 1 — Division lowers dimension', () => {
  it("area ÷ length = length (100 sqft floor ÷ 10' width = 10' depth)", () => {
    // 14400 sqin ÷ 120 in = 120 in = 10'
    const r = calculate("10' * 10' / 10'");
    expect(r!.dimension).toBe('length');
    expect(r!.valueCanonical).toBe(120);
    expect(r!.displayPrimary).toBe("10'");
  });

  it("length ÷ scalar = length (shelf into 4 equal pieces)", () => {
    // 10' ÷ 4 = 30 in = 2' 6"
    const r = calculate("10' / 4");
    expect(r!.dimension).toBe('length');
    expect(r!.valueCanonical).toBe(30);
    expect(r!.displayPrimary).toBe(`2' 6"`);
  });

  it("area ÷ scalar = area", () => {
    // 100 sqft ÷ 2 = 50 sqft
    const r = calculate("10' * 10' / 2");
    expect(r!.dimension).toBe('area');
    expect(r!.displayPrimary).toBe('50 sq ft');
  });
});

describe('Phase 1 — Dimensional mismatch errors', () => {
  it("length + length works (same dim, no coercion needed)", () => {
    const r = calculate("5' + 3'");
    expect(r!.dimension).toBe('length');
    expect(r!.valueCanonical).toBe(96);
  });

  it("area + area works", () => {
    // 25 + 50 sqft when both sides are clearly area expressions
    const r = calculate("5' * 5' + 5' * 10'");
    expect(r!.dimension).toBe('area');
    // 3600 sqin + 7200 sqin = 10800 sqin → 75 sqft
    expect(r!.valueCanonical).toBeCloseTo(10800, 1);
    expect(r!.displayPrimary).toBe('75 sq ft');
  });

  it("area + length would throw — but engine returns error result, not throw", () => {
    // Plan says the algebra throws. calculate() catches and returns an error result
    // (components can't crash). We validate the error surface here.
    const r = calculate("5' * 5' + 5'");
    expect(r).not.toBeNull();
    expect(r!.resultFeetInches).toBe('Error');
    expect(r!.displayPrimary).toBe('Error');
  });

  it("volume × length would exceed 3 dim (no 4D) — error", () => {
    // 2' * 3' * 4' * 5' = would-be 4D, not supported.
    const r = calculate("2' * 3' * 4' * 5'");
    expect(r!.resultFeetInches).toBe('Error');
  });
});

describe('Phase 1 — Edge cases preserved from legacy engine', () => {
  it('division by zero returns Error', () => {
    const r = calculate('5 / 0');
    expect(r!.resultFeetInches).toBe('Error');
  });

  it('empty expression returns null', () => {
    expect(calculate('')).toBeNull();
    expect(calculate('   ')).toBeNull();
  });

  it('percentage addition stays scalar', () => {
    const r = calculate('100 + 10%');
    expect(r!.dimension).toBe('scalar');
    expect(r!.valueCanonical).toBe(110);
  });

  it('unicode operators × and ÷ still work', () => {
    const r = calculate("3' × 4'");
    expect(r!.dimension).toBe('area');
    expect(r!.displayPrimary).toBe('12 sq ft');
  });
});
