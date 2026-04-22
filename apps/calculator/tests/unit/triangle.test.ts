// tests/unit/triangle.test.ts
// Phase 4.4 — triangle math beyond Pythagoras.

import { describe, it, expect } from 'vitest';
import {
  toPitch,
  pitchToAngle,
  angleToPitch,
  miterAngle,
  isSquare,
  legsFromHypAndAngle,
} from '../../src/lib/calculator/triangle';

describe('toPitch — rise/run → N-12 notation', () => {
  it('converts 7" rise over 12" run → 7-12', () => {
    expect(toPitch(7, 12).notation).toBe('7-12');
    expect(toPitch(7, 12).rise).toBe(7);
  });

  it('converts 6" rise over 24" run → 3-12 (scales down)', () => {
    expect(toPitch(6, 24).notation).toBe('3-12');
  });

  it('converts 4.25" rise over 12" run → 4 1/4-12', () => {
    expect(toPitch(4.25, 12).notation).toBe('4 1/4-12');
  });

  it('rounds to quarter-inch — 4.1 → 4 — 4.38 → 4 1/2', () => {
    // 4.1 * 4 = 16.4 → round to 16 → 4. 4.38 * 4 = 17.52 → 18 → 4.5.
    expect(toPitch(4.1, 12).rise).toBe(4);
    expect(toPitch(4.38, 12).rise).toBe(4.5);
  });

  it('returns Error for invalid input', () => {
    expect(toPitch(NaN, 12).notation).toBe('Error');
    expect(toPitch(5, 0).notation).toBe('Error');
  });
});

describe('pitchToAngle / angleToPitch — round trip', () => {
  it('7-12 pitch ≈ 30.26°', () => {
    expect(pitchToAngle({ rise: 7, run: 12, notation: '7-12' })).toBeCloseTo(30.26, 1);
  });

  it('12-12 pitch = 45°', () => {
    expect(pitchToAngle({ rise: 12, run: 12, notation: '12-12' })).toBeCloseTo(45, 1);
  });

  it('45° angle → 12-12 pitch', () => {
    expect(angleToPitch(45).notation).toBe('12-12');
  });

  it('30° angle → ~7-12 pitch (round to quarter)', () => {
    const p = angleToPitch(30);
    // 12 * tan(30°) = 6.928… → rounds to 7.
    expect(p.rise).toBe(7);
  });
});

describe('miterAngle — cut angle for right-triangle corner', () => {
  it('3-4 legs → ~53.13° miter at A (opposite leg B=4)', () => {
    expect(miterAngle(3, 4)).toBeCloseTo(53.13, 1);
  });

  it('symmetric 1-1 → 45°', () => {
    expect(miterAngle(1, 1)).toBe(45);
  });

  it('returns NaN for invalid legs', () => {
    expect(miterAngle(-1, 4)).toBeNaN();
    expect(miterAngle(0, 4)).toBeNaN();
    expect(miterAngle(3, NaN)).toBeNaN();
  });
});

describe('isSquare — 3-4-5 trick', () => {
  it('3-4-5 is square', () => {
    expect(isSquare(3, 4, 5)).toBe(true);
  });

  it('6-8-10 is square (scaled)', () => {
    expect(isSquare(6, 8, 10)).toBe(true);
  });

  it('9-12-15 is square', () => {
    expect(isSquare(9, 12, 15)).toBe(true);
  });

  it('5-12-13 is square (another common triple)', () => {
    expect(isSquare(5, 12, 13)).toBe(true);
  });

  it('3-4-6 is NOT square (6 > 5)', () => {
    expect(isSquare(3, 4, 6)).toBe(false);
  });

  it('accepts order-independent input', () => {
    // Same triangle, sides in any order.
    expect(isSquare(5, 3, 4)).toBe(true);
    expect(isSquare(4, 5, 3)).toBe(true);
  });

  it('tolerates real-world measurement imprecision (default 0.5%)', () => {
    // Squared tolerance is ~2× linear tolerance — 5.01" vs 5" is 0.2% linear ≈ 0.4% squared.
    expect(isSquare(3, 4, 5.01)).toBe(true);
    // Off by 5% linear → far outside tolerance.
    expect(isSquare(3, 4, 5.25)).toBe(false);
  });
});

describe('legsFromHypAndAngle — rafter layout', () => {
  it('hypotenuse 10 at 45° → legs ~7.07 each', () => {
    const { adjacent, opposite } = legsFromHypAndAngle(10, 45);
    expect(adjacent).toBeCloseTo(7.07, 2);
    expect(opposite).toBeCloseTo(7.07, 2);
  });

  it('hypotenuse 5 at ~53.13° → 3-4-5 triangle', () => {
    const { adjacent, opposite } = legsFromHypAndAngle(5, 53.13);
    expect(adjacent).toBeCloseTo(3, 1);
    expect(opposite).toBeCloseTo(4, 1);
  });

  it('invalid input returns NaN legs', () => {
    const { adjacent, opposite } = legsFromHypAndAngle(-5, 45);
    expect(adjacent).toBeNaN();
    expect(opposite).toBeNaN();
  });
});
