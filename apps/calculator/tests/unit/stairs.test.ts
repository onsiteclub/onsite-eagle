// tests/unit/stairs.test.ts
// Phase 4.3 — stair geometry + OBC 2024 compliance.

import { describe, it, expect } from 'vitest';
import { calculateStairs } from '../../src/lib/calculator/stairs';

describe('calculateStairs — geometry', () => {
  it('derives step count from default 7" target (108" rise → 15 steps, ~7.2" each)', () => {
    const { output } = calculateStairs({ totalRise: 108 });
    expect(output.stepCount).toBe(15);
    expect(output.riserHeight).toBeCloseTo(7.2, 1);
  });

  it('derives step count from explicit riserHeight', () => {
    // 108" / 8" = 13.5 → rounds to 14 → 108/14 = 7.71" each (within OBC).
    const { output } = calculateStairs({ totalRise: 108, riserHeight: 8 });
    expect(output.stepCount).toBe(14);
    expect(output.riserHeight).toBeCloseTo(7.71, 2);
  });

  it('preserves explicit step count exactly', () => {
    const { output } = calculateStairs({ totalRise: 108, stepCount: 12 });
    expect(output.stepCount).toBe(12);
    expect(output.riserHeight).toBe(9);
  });

  it('computes stringer length via Pythagorean theorem', () => {
    // 15 steps at 7.2" rise = 108" rise.
    // 14 treads at 10" = 140" run.
    // stringer = sqrt(108² + 140²) ≈ sqrt(11664 + 19600) ≈ 176.82"
    const { output } = calculateStairs({ totalRise: 108 });
    expect(output.totalRun).toBe(140);
    expect(output.stringerLength).toBeCloseTo(176.82, 1);
  });

  it('stair angle is the arctan of rise/run', () => {
    const { output } = calculateStairs({ totalRise: 108 });
    // atan(108/140) * 180/π ≈ 37.64°
    expect(output.angle).toBeCloseTo(37.64, 1);
  });

  it('rejects non-positive totalRise', () => {
    const r = calculateStairs({ totalRise: 0 });
    expect(r.valid).toBe(false);
    expect(r.compliance[0].kind).toBe('error');
  });
});

describe('calculateStairs — OBC 2024 compliance', () => {
  it('rise within 125-200mm → compliant rise check', () => {
    // 108" / 15 = 7.2" ≈ 183mm — within OBC.
    const { compliance } = calculateStairs({ totalRise: 108 });
    const riseCheck = compliance.find((c) => c.field === 'rise')!;
    expect(riseCheck.kind).toBe('ok');
  });

  it('rise below 125mm → error', () => {
    // Target 20 steps for 60" rise = 3" each = 76mm (below 125mm minimum).
    const { compliance, valid } = calculateStairs({ totalRise: 60, stepCount: 20 });
    const riseCheck = compliance.find((c) => c.field === 'rise')!;
    expect(riseCheck.kind).toBe('error');
    expect(valid).toBe(false);
  });

  it('rise above 200mm → error', () => {
    // 120" rise in 12 steps = 10" each = 254mm (above 200mm maximum).
    const { compliance, valid } = calculateStairs({ totalRise: 120, stepCount: 12 });
    const riseCheck = compliance.find((c) => c.field === 'rise')!;
    expect(riseCheck.kind).toBe('error');
    expect(valid).toBe(false);
  });

  it('run below 255mm → error (tread too shallow)', () => {
    // Default 10" = 254mm — just below threshold.
    const { compliance } = calculateStairs({ totalRise: 108, tread: 9 });
    const runCheck = compliance.find((c) => c.field === 'run')!;
    expect(runCheck.kind).toBe('error');
  });

  it('run above 355mm → warn (not unsafe, just uncomfortable)', () => {
    const { compliance } = calculateStairs({ totalRise: 108, tread: 16 });
    const runCheck = compliance.find((c) => c.field === 'run')!;
    expect(runCheck.kind).toBe('warn');
  });

  it('default 1" nosing is compliant (max 25mm)', () => {
    const { compliance } = calculateStairs({ totalRise: 108 });
    const nosingCheck = compliance.find((c) => c.field === 'nosing')!;
    expect(nosingCheck.kind).toBe('ok');
  });

  it('nosing over 25mm → error', () => {
    // 1.5" = 38mm, above 25mm max.
    const { compliance } = calculateStairs({ totalRise: 108, nosing: 1.5 });
    const nosingCheck = compliance.find((c) => c.field === 'nosing')!;
    expect(nosingCheck.kind).toBe('error');
  });

  it('headroom is always reported as advisory (cannot be derived)', () => {
    const { compliance } = calculateStairs({ totalRise: 108 });
    const head = compliance.find((c) => c.field === 'headroom')!;
    expect(head.kind).toBe('warn');
    expect(head.rule).toContain('1950mm');
  });

  it('canonical carpenter spec — 9ft rise, 7" riser, 10" tread — is fully compliant', () => {
    // 108" rise, explicit 7" riser → 15 steps → 7.2" each (close enough to 7").
    // Actually: 108/7 = 15.43 → rounds to 15 → 108/15 = 7.2" → 183mm (OK).
    const { compliance, valid } = calculateStairs({ totalRise: 108, riserHeight: 7 });
    expect(valid).toBe(true);
    const errors = compliance.filter((c) => c.kind === 'error');
    expect(errors).toHaveLength(0);
  });
});
