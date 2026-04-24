// src/engine/index.ts
// Public API of the pure calculator engine.
//
// This module has zero runtime dependencies on React, Supabase, network I/O
// or logger side effects. Consumers wrap it with whatever telemetry, UI or
// persistence layer they need.

// Core expression engine — imperial arithmetic, fractions, percentages,
// dimensional coercion (length × length = area, etc.).
export {
  calculate,
  parseToInches,
  formatInches,
  formatTotalInches,
  tokenize,
  evaluateTokens,
} from './engine';

// Stair geometry + Ontario Building Code 2024 compliance.
export { calculateStairs } from './stairs';
export type {
  StairsInput,
  StairsOutput,
  StairsResult,
  ComplianceCheck,
  ComplianceKind,
} from './stairs';

// Triangle helpers — roof pitch, miter cuts, 3-4-5 squareness.
export {
  toPitch,
  pitchToAngle,
  angleToPitch,
  miterAngle,
  isSquare,
  legsFromHypAndAngle,
} from './triangle';
export type { Degrees, Pitch } from './triangle';

// Engine contract types.
export type {
  CalculationResult,
  DimensionType,
  Dim,
  OriginalUnit,
  System,
  EngineErrorKind,
  VisorSide,
  Token,
} from './types';
