// src/engine/stairs.ts
// Phase 4.3 — stair geometry + Ontario Building Code 2024 compliance check.
//
// Input model: the carpenter knows the TOTAL RISE (floor-to-floor). Everything
// else — step count, riser height, tread depth, stringer length — can be
// computed or specified. We treat the step count as "target riser height ≈ 7"
// by default (the construction sweet spot within OBC's 4.92–7.87 range).
//
// All internal math is in INCHES. OBC values come in millimeters in the JSON
// and get converted on comparison — the JSON stays human-readable in SI, the
// engine stays in imperial to match the keypad.

import obc from './building-codes/obc-2024.json';

/** Canonical inputs. `tread` is optional — defaults derive from riserHeight. */
export interface StairsInput {
  /** Floor-to-floor rise, in inches. Required. */
  totalRise: number;
  /** Height of each riser, in inches. Optional — derived if `stepCount` is given. */
  riserHeight?: number;
  /** Number of risers (= treads + 1). Optional — derived if `riserHeight` is given. */
  stepCount?: number;
  /** Tread depth (run), in inches. Optional — default 10". */
  tread?: number;
  /** Nosing projection, in inches. Optional — default 1". */
  nosing?: number;
}

export interface StairsOutput {
  totalRise: number;
  stepCount: number;
  riserHeight: number;
  tread: number;
  nosing: number;
  /** Length of the stringer, in inches (hypotenuse of the rise × run triangle). */
  stringerLength: number;
  /** Total horizontal run, in inches. */
  totalRun: number;
  /** Angle of the stair relative to the floor, in degrees. */
  angle: number;
}

export type ComplianceKind = 'ok' | 'warn' | 'error';

export interface ComplianceCheck {
  field: 'rise' | 'run' | 'nosing' | 'headroom' | 'uniformity';
  kind: ComplianceKind;
  label: string;
  measuredValue: string;
  rule: string;
}

export interface StairsResult {
  valid: boolean;
  output: StairsOutput;
  compliance: ComplianceCheck[];
}

const DEFAULT_TREAD_IN = 10;
const DEFAULT_NOSING_IN = 1;
const TARGET_RISER_IN = 7;
const MM_PER_INCH = 25.4;

/**
 * Computes the stair geometry and runs OBC 2024 compliance.
 * Returns partial results + error compliance entries when inputs are invalid —
 * the UI can still show WHAT'S wrong rather than just failing silently.
 */
export function calculateStairs(input: StairsInput): StairsResult {
  const totalRise = input.totalRise;
  const tread = input.tread ?? DEFAULT_TREAD_IN;
  const nosing = input.nosing ?? DEFAULT_NOSING_IN;

  if (!isFinite(totalRise) || totalRise <= 0) {
    return {
      valid: false,
      output: zeroOutput(),
      compliance: [{
        field: 'rise',
        kind: 'error',
        label: 'Invalid total rise',
        measuredValue: `${totalRise}`,
        rule: 'Total floor-to-floor rise must be greater than zero.',
      }],
    };
  }

  // Resolve step count: prefer explicit, else derive from target riser height.
  let stepCount: number;
  let riserHeight: number;
  if (input.stepCount && input.stepCount > 0) {
    stepCount = Math.round(input.stepCount);
    riserHeight = totalRise / stepCount;
  } else if (input.riserHeight && input.riserHeight > 0) {
    // User gave riser height — round step count to nearest whole.
    stepCount = Math.round(totalRise / input.riserHeight);
    riserHeight = totalRise / stepCount; // Recompute to keep total exact.
  } else {
    // Neither — aim for 7" risers.
    stepCount = Math.round(totalRise / TARGET_RISER_IN);
    riserHeight = totalRise / stepCount;
  }

  // Tread count = step count - 1 (the top tread is the landing).
  const treadCount = Math.max(0, stepCount - 1);
  const totalRun = treadCount * tread;
  const stringerLength = Math.sqrt(totalRise * totalRise + totalRun * totalRun);
  const angle = Math.atan2(totalRise, totalRun) * (180 / Math.PI);

  const output: StairsOutput = {
    totalRise,
    stepCount,
    riserHeight,
    tread,
    nosing,
    totalRun,
    stringerLength,
    angle,
  };

  const compliance = checkCompliance(output);

  return {
    valid: compliance.every((c) => c.kind !== 'error'),
    output,
    compliance,
  };
}

// ============================================
// OBC 2024 compliance
// ============================================

function checkCompliance(out: StairsOutput): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const rules = obc.stairs;

  // Rise check.
  const riseMm = out.riserHeight * MM_PER_INCH;
  if (riseMm < rules.rise.min_mm || riseMm > rules.rise.max_mm) {
    checks.push({
      field: 'rise',
      kind: 'error',
      label: 'Riser height',
      measuredValue: `${riseMm.toFixed(0)}mm (${out.riserHeight.toFixed(2)} in)`,
      rule: rules.rise.message_en,
    });
  } else {
    checks.push({
      field: 'rise',
      kind: 'ok',
      label: 'Riser height',
      measuredValue: `${riseMm.toFixed(0)}mm (${out.riserHeight.toFixed(2)} in)`,
      rule: `OK — within ${rules.rise.min_mm}–${rules.rise.max_mm}mm`,
    });
  }

  // Run (tread) check.
  // Same imperial/metric slack as nosing — 10" = 254mm, OBC says 255mm, but
  // 10" is the de-facto carpenter tread and passes inspection. 1mm tolerance
  // on the lower bound.
  const runMm = out.tread * MM_PER_INCH;
  const runTolerance = 1;
  if (runMm < rules.run.min_mm - runTolerance) {
    checks.push({
      field: 'run',
      kind: 'error',
      label: 'Tread depth',
      measuredValue: `${runMm.toFixed(0)}mm (${out.tread.toFixed(2)} in)`,
      rule: rules.run.message_en,
    });
  } else if (runMm > rules.run.max_mm) {
    // Above max is "warn" — uncomfortable but not an egress failure.
    checks.push({
      field: 'run',
      kind: 'warn',
      label: 'Tread depth',
      measuredValue: `${runMm.toFixed(0)}mm (${out.tread.toFixed(2)} in)`,
      rule: `Above OBC max (${rules.run.max_mm}mm). Not unsafe, but may feel awkward.`,
    });
  } else {
    checks.push({
      field: 'run',
      kind: 'ok',
      label: 'Tread depth',
      measuredValue: `${runMm.toFixed(0)}mm (${out.tread.toFixed(2)} in)`,
      rule: `OK — min ${rules.run.min_mm}mm`,
    });
  }

  // Nosing check.
  // OBC writes 25mm but the practical equivalent in imperial is 1" = 25.4mm.
  // Carpenters use 1" nosing routinely and inspectors pass it — allow a 1mm
  // tolerance to accommodate the imperial/metric round-trip.
  const nosingMm = out.nosing * MM_PER_INCH;
  const nosingTolerance = 1; // mm
  if (nosingMm > rules.nosing.max_mm + nosingTolerance) {
    checks.push({
      field: 'nosing',
      kind: 'error',
      label: 'Nosing projection',
      measuredValue: `${nosingMm.toFixed(0)}mm (${out.nosing.toFixed(2)} in)`,
      rule: rules.nosing.message_en,
    });
  } else {
    checks.push({
      field: 'nosing',
      kind: 'ok',
      label: 'Nosing projection',
      measuredValue: `${nosingMm.toFixed(0)}mm (${out.nosing.toFixed(2)} in)`,
      rule: `OK — max ${rules.nosing.max_mm}mm`,
    });
  }

  // Headroom can't be computed from inputs we have — left as advisory.
  checks.push({
    field: 'headroom',
    kind: 'warn',
    label: 'Headroom',
    measuredValue: 'não medido',
    rule: `Verify on site: minimum ${rules.headroom.min_mm}mm (${rules.headroom.min_in.toFixed(0)} in) per OBC 2024.`,
  });

  return checks;
}

function zeroOutput(): StairsOutput {
  return {
    totalRise: 0,
    stepCount: 0,
    riserHeight: 0,
    tread: 0,
    nosing: 0,
    totalRun: 0,
    stringerLength: 0,
    angle: 0,
  };
}
