// src/engine/triangle.ts
// Phase 4.4 — triangle math beyond Pythagoras.
//
// Construction-specific helpers the carpenter actually uses on site:
//   - pitch:       rise/run expressed as "N-12" (roof pitch grammar)
//   - miter:       angle of the cut given the two legs of a right triangle
//   - squareness:  validate that three measured sides form a 90° triangle
//     (the 3-4-5, 6-8-10, 9-12-15 tricks).

/** All angles in this module are expressed in DEGREES. */
export type Degrees = number;

/**
 * Roof pitch expressed as N-over-12 (rise over 12 in horizontal run).
 * A "7-12 pitch" means 7" of rise for every 12" of run.
 */
export interface Pitch {
  /** The rise component. 12 is the standard denominator; the rise is what varies. */
  rise: number;
  /** The run (always 12 in the standard form). */
  run: 12;
  /** Human-readable form: "7-12". */
  notation: string;
}

/** Converts rise and run (any same unit) to a 12-denominator pitch notation. */
export function toPitch(rise: number, run: number): Pitch {
  if (!isFinite(rise) || !isFinite(run) || run <= 0) {
    return { rise: NaN, run: 12, notation: 'Error' };
  }
  const riseOver12 = (rise / run) * 12;
  // Round to quarter-inch to match how pitches are actually called on site.
  const quarterRounded = Math.round(riseOver12 * 4) / 4;
  return {
    rise: quarterRounded,
    run: 12,
    notation: `${formatQuarter(quarterRounded)}-12`,
  };
}

/** Converts a pitch notation ("7-12", "10/12") or angle back to an angle in degrees. */
export function pitchToAngle(pitch: Pitch | number): Degrees {
  const rise = typeof pitch === 'number' ? pitch : pitch.rise;
  if (!isFinite(rise)) return NaN;
  return Math.atan2(rise, 12) * (180 / Math.PI);
}

/** Converts an angle in degrees back to an N-12 pitch. */
export function angleToPitch(angle: Degrees): Pitch {
  if (!isFinite(angle)) return { rise: NaN, run: 12, notation: 'Error' };
  // tan(angle) = rise/run → rise = 12 * tan(angle)
  const rise = 12 * Math.tan(angle * (Math.PI / 180));
  return toPitch(rise, 12);
}

/**
 * Miter angle for a butt cut in a right triangle.
 * Given the two legs, returns the angle at the leg-A corner (the angle the saw
 * blade needs to be tilted from 0° to match the hypotenuse cleanly).
 *
 * Example: 3-4-5 triangle, leg A = 3, leg B = 4 → miter at A ≈ 53.13°.
 */
export function miterAngle(legA: number, legB: number): Degrees {
  if (!isFinite(legA) || !isFinite(legB) || legA <= 0 || legB <= 0) return NaN;
  // Angle opposite leg B: tan(theta) = B / A
  return Math.atan2(legB, legA) * (180 / Math.PI);
}

/**
 * Checks whether three side lengths form a right triangle (within tolerance).
 * The "3-4-5 trick" carpenters use to square a layout: any scaled version of
 * a Pythagorean triple is a 90°.
 *
 * @param tolerance fractional tolerance (default 0.5% — very tight for construction).
 */
export function isSquare(a: number, b: number, c: number, tolerance = 0.005): boolean {
  if (![a, b, c].every((x) => isFinite(x) && x > 0)) return false;
  const sides = [a, b, c].sort((x, y) => x - y);
  const [s1, s2, hyp] = sides;
  const pythagoreanSq = s1 * s1 + s2 * s2;
  const hypSq = hyp * hyp;
  const diff = Math.abs(pythagoreanSq - hypSq);
  return diff / hypSq <= tolerance;
}

/**
 * Given a right triangle's hypotenuse and one angle (degrees), return the two legs.
 * Useful for laying out rafters given a known ridge-to-eave length and a pitch.
 */
export function legsFromHypAndAngle(hypotenuse: number, angle: Degrees): { adjacent: number; opposite: number } {
  if (!isFinite(hypotenuse) || !isFinite(angle) || hypotenuse <= 0) {
    return { adjacent: NaN, opposite: NaN };
  }
  const rad = angle * (Math.PI / 180);
  return {
    adjacent: hypotenuse * Math.cos(rad),
    opposite: hypotenuse * Math.sin(rad),
  };
}

// ============================================
// Helpers
// ============================================

/** Formats a number to a quarter-inch precision string: 7.25 → "7 1/4", 7 → "7". */
function formatQuarter(n: number): string {
  if (!isFinite(n)) return 'Error';
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 4);
  if (frac === 0) return String(whole);
  if (frac === 4) return String(whole + 1);
  // Simplify: 2/4 = 1/2.
  const num = frac;
  const den = 4;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const d = gcd(num, den);
  const w = whole === 0 ? '' : `${whole} `;
  return `${w}${num / d}/${den / d}`;
}
