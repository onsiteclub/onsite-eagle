// tests/unit/engine/adversarial.test.ts
// Adversarial test suite — built from the catalog of classic bugs in
// handwritten arithmetic expression evaluators (Dijkstra 1961 onward).
//
// This file is DIAGNOSTIC, not prescriptive. Every test here documents a
// question "does our engine handle X?" — failures pinpoint engineering
// decisions to either fix in-place or delegate to a battle-tested library
// (mathjs, expr-eval, fraction.js).
//
// Running vitest shows which bugs are live. The description of each `it`
// maps to the bug catalog so `vitest -t "#N "` can isolate one class.

import { describe, it, expect } from 'vitest';
import { calculate } from '../../../src/engine';

/** Extract the canonical decimal. null means parse/eval failure. */
function value(expr: string): number | null {
  const r = calculate(expr);
  if (!r) return null;
  return r.valueCanonical;
}

describe('#1 — unary minus', () => {
  it('"-5 + 3" → -2 (leading unary)', () => {
    expect(value('-5 + 3')).toBe(-2);
  });

  it('"5 + -3" → 2 (unary after binary)', () => {
    expect(value('5 + -3')).toBe(2);
  });

  it('"5 * -3" → -15 (unary inside multiplication)', () => {
    expect(value('5 * -3')).toBe(-15);
  });

  it('"5*-3" no spaces → -15', () => {
    expect(value('5*-3')).toBe(-15);
  });

  it('"- 5 + 3" space-separated unary → -2', () => {
    expect(value('- 5 + 3')).toBe(-2);
  });

  it('"--5" double unary → 5', () => {
    expect(value('--5')).toBe(5);
  });
});

describe('#2 — PEMDAS operator precedence', () => {
  it('"4 + 4 * 10" → 44 (not 80)', () => {
    expect(value('4 + 4 * 10')).toBe(44);
  });

  it('"10 - 2 * 3" → 4', () => {
    expect(value('10 - 2 * 3')).toBe(4);
  });

  it('"2 + 3 * 4 - 1" → 13', () => {
    expect(value('2 + 3 * 4 - 1')).toBe(13);
  });
});

describe('#3 — associativity', () => {
  it('"10 - 3 - 2" = 5 (left-assoc subtraction)', () => {
    expect(value('10 - 3 - 2')).toBe(5);
  });

  it('"100 / 10 / 2" = 5 (left-assoc division)', () => {
    expect(value('100 / 10 / 2')).toBe(5);
  });
});

describe('#4 — floating point drift (exact arithmetic required)', () => {
  it('"0.1 + 0.2" === exactly 0.3 (Fraction backbone eliminates IEEE-754 drift)', () => {
    const v = value('0.1 + 0.2');
    // Engine v2 uses fraction.js for all arithmetic; the IEEE-754 drift that
    // would otherwise give 0.30000000000000004 is gone. If this test regresses
    // to toBeCloseTo only, the engine slipped back to native-float ops.
    expect(v).toBe(0.3);
  });

  it('"1/3 + 1/3 + 1/3" === exactly 1 (exact rational)', () => {
    const v = value('1/3 + 1/3 + 1/3');
    // With Fraction math, 1/3 is stored as the rational 1/3, not 0.333...;
    // three of them add to exactly 1 with no rounding step needed.
    expect(v).toBe(1);
  });
});

describe('#5 — divide by zero', () => {
  it('"10 / 0" → Error result, not Infinity leak', () => {
    const r = calculate('10 / 0');
    expect(r?.isError).toBe(true);
  });

  it('"0 / 0" → Error result, not NaN leak', () => {
    const r = calculate('0 / 0');
    expect(r?.isError).toBe(true);
  });
});

describe('#6 — parenthesis support', () => {
  it('"(2 + 3) * 4" → 20 (grouping overrides PEMDAS)', () => {
    expect(value('(2 + 3) * 4')).toBe(20);
  });

  it('"(10 - 3) / (5 - 3)" → 3.5', () => {
    expect(value('(10 - 3) / (5 - 3)')).toBe(3.5);
  });

  it('"((1 + 2) * 3)" → 9 (nested)', () => {
    expect(value('((1 + 2) * 3)')).toBe(9);
  });

  it('"(2 + 3" unbalanced → Error (not silent 5)', () => {
    const r = calculate('(2 + 3');
    expect(r?.isError).toBe(true);
  });
});

describe('#7 — empty / whitespace input', () => {
  it('"" → null', () => {
    expect(calculate('')).toBeNull();
  });

  it('"   " → null', () => {
    expect(calculate('   ')).toBeNull();
  });
});

describe('#8 — whitespace-sensitive mixed-number tokenizer', () => {
  it('"5 1/2" → 5.5 (mixed number, space required)', () => {
    expect(value('5 1/2')).toBe(5.5);
  });

  it('"51/2" WITHOUT space → 25.5 (math-correct: 51 divided by 2)', () => {
    // The v3 spec accepts improper bare fractions (Vol 2 explicitly tests
    // 3/2 + 3/2 = 3). "51/2" is unambiguous arithmetic — 51 ÷ 2 = 25.5. If
    // the user wanted a mixed number they'd write "5 1/2" with a space.
    expect(value('51/2')).toBe(25.5);
  });
});

describe('#9 — large-magnitude precision (informational)', () => {
  it('"1e16 + 1" — IEEE-754 ceiling documented', () => {
    // Not a real construction case; just pins the floor for known behaviour.
    const v = value('1e16 + 1');
    expect(v === 1e16 || v === 1e16 + 1).toBe(true);
  });
});

describe('#10 — percentage semantics', () => {
  it('"100 + 10%" → 110 (tax/markup convention)', () => {
    expect(value('100 + 10%')).toBe(110);
  });

  it('"100 - 20%" → 80 (discount convention)', () => {
    expect(value('100 - 20%')).toBe(80);
  });

  it('"50% + 10%" → 60% of what? should error or disambiguate', () => {
    // This is philosophically ambiguous. A safe engine either errors or has a
    // documented meaning. Silently dropping the '%' chars (parseFloat ignores
    // them) and returning 60 as a raw number is the WORST outcome.
    const r = calculate('50% + 10%');
    // Either it errors, OR it returns 0.6 (fraction interpretation), OR 60%.
    // Returning bare 60 with no % flag is the bug.
    expect([null, 0.6].includes(r?.valueCanonical as number) || r?.isError === true).toBe(true);
  });
});

describe('#11 — modulo placement (if supported)', () => {
  it('"10 % 3" standalone — percent or modulo?', () => {
    // Ambiguous token. Document current behavior.
    const r = calculate('10 % 3');
    expect(r).not.toBeNull();
  });
});

describe('#12 — locale number formats', () => {
  it('"3,5 + 2,5" PT decimal comma — should parse as 6 or error', () => {
    // Engine does NOT normalize commas internally; parser layer does.
    // Test engine direct: this should error OR parse as 6.
    const r = calculate('3,5 + 2,5');
    // parseFloat("3,5") = 3, so engine would see 3+2=5. Document.
    expect(r?.valueCanonical).not.toBe(5);
  });

  it('"1,234 + 1,000" with thousand separators', () => {
    const r = calculate('1,234 + 1,000');
    // Sanitize-expression layer strips these; engine direct would see
    // parseFloat("1,234")=1, parseFloat("1,000")=1, sum=2. Document.
    expect(r?.valueCanonical).not.toBe(2);
  });
});

describe('#13 — trailing / incomplete operator', () => {
  it('"5 +" → Error (not 5, not NaN leak)', () => {
    const r = calculate('5 +');
    expect(r?.isError).toBe(true);
  });

  it('"* 5" leading binary op → Error', () => {
    const r = calculate('* 5');
    expect(r?.isError).toBe(true);
  });
});

describe('#14 — consecutive operators', () => {
  it('"5 ++ 3" → Error (double binary is malformed)', () => {
    const r = calculate('5 ++ 3');
    expect(r?.isError).toBe(true);
  });

  it('"5 -- 3" → 8 (double unary) or Error — both defensible, NOT 2', () => {
    const r = calculate('5 -- 3');
    // If parsed as 5 - (-3) = 8, fine. If error, fine. If it returns 2,
    // the tokenizer silently collapsed "--" to "-".
    expect(r?.valueCanonical).not.toBe(2);
  });
});

describe('#15 — mixed fraction and decimal', () => {
  it('"1/3 + 0.5" silently lossy (documented)', () => {
    const v = value('1/3 + 0.5');
    expect(v).toBeCloseTo(0.833, 2);
    // True rational would give 5/6 exactly; we accept the drift here but
    // flag that it's a limitation for future exact-math work.
  });
});

describe('#16 — malformed numbers', () => {
  it('"1.2.3" → Error (not silently 1.2)', () => {
    const r = calculate('1.2.3');
    // parseFloat("1.2.3") === 1.2; without a numeric validator this leaks.
    expect(r?.isError).toBe(true);
  });

  it('"10..5" double decimal → Error', () => {
    const r = calculate('10..5');
    expect(r?.isError).toBe(true);
  });
});

describe('construction-specific — imperial fraction + feet', () => {
  it('"2\' 6\\" + 3\' 6\\"" → 6\' = 72 inches', () => {
    const r = calculate(`2' 6" + 3' 6"`);
    expect(r?.valueCanonical).toBe(72);
  });

  it('"-2\' 6\\"" negative feet-inches — defines as -(2\'+6\\")', () => {
    // Calculated Industries ConstructionMaster convention: -(2ft + 6in) = -30".
    const r = calculate(`-2' 6"`);
    expect(r?.valueCanonical).toBe(-30);
  });

  it('"2\'-6\\"" dash-separated notation → 30 inches (not subtraction)', () => {
    // Common construction shorthand. Engine likely treats "-" as subtraction.
    const r = calculate(`2'-6"`);
    // If it returns -6 or something weird, that's the bug.
    expect(r?.valueCanonical).toBe(30);
  });

  it('implicit feet-inches multiplication: "12\' * 8\'" is area (sq ft)', () => {
    const r = calculate(`12' * 8'`);
    expect(r?.dimension).toBe('area');
    // 12ft * 8ft = 96 sqft = 13824 sqin
    expect(r?.valueCanonical).toBe(12 * 12 * 8 * 12);
  });
});

describe('safety — no eval() or code injection', () => {
  it('does not execute string as JS', () => {
    // If the engine used eval(), this would leak — asserting it doesn't.
    const r = calculate('Math.PI');
    // Should error or return 0, NOT π.
    expect(r?.valueCanonical).not.toBeCloseTo(Math.PI, 5);
  });

  it('rejects JS-y input without executing it', () => {
    const r = calculate('(function(){return 42})()');
    expect(r?.valueCanonical).not.toBe(42);
  });
});
