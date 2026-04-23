// src/components/ResultPanel.tsx
// Registry that picks the right result layout based on the entry's dimension.
// Called by ConversationCard's focal variant. Each dim gets its own sub-component
// so future panels (percentage, dual-unit, conversion, material estimate) can
// slot in without touching ConversationCard.
//
// Behavior today = exact parity with the inline focal rendering that used to
// live inside ConversationCard. This step is pure refactor — zero visual change.

import type { DimensionType, HistoryEntry } from '../types/calculator';

interface ResultPanelProps {
  entry: HistoryEntry;
}

/**
 * Top-level dispatcher. Picks the sub-panel based on the engine's dimension.
 * Falls back to LengthResult for legacy entries without a `dimension` field.
 */
export default function ResultPanel({ entry }: ResultPanelProps) {
  const dim = resolveDimension(entry);
  switch (dim) {
    case 'scalar': return <ScalarResult entry={entry} />;
    case 'area':   return <AreaResult entry={entry} />;
    case 'volume': return <VolumeResult entry={entry} />;
    case 'length':
    default:       return shouldShowDualUnit(entry)
      ? <DualUnitLengthResult entry={entry} />
      : <LengthResult entry={entry} />;
  }
}

/**
 * Step 5 — dual-unit trigger. Activates when either:
 *   (a) the source expression mentions metric units (mm/cm/m or Portuguese
 *       equivalents) — future-ready for when the engine parses metric input
 *       and for voice/GPT flows that echo metric back.
 *   (b) the length crosses 12 feet / ~3.66 m — a room-scale measurement
 *       where Canadian blueprints typically annotate both systems.
 *
 * Short lengths (stud spacings, trim widths) stay single-unit to avoid
 * noise; their metric equivalent still shows in the equivalence line below.
 */
function shouldShowDualUnit(entry: HistoryEntry): boolean {
  const inches = entry.resultDecimal;
  if (isFinite(inches) && inches >= 144) return true; // ≥12 ft
  return /\b(mm|cm|m|milimetros?|centimetros?|metros?)\b/i.test(entry.expression);
}

// ============================================================================
// Sub-panels — one per dimension
// ============================================================================

function ScalarResult({ entry }: ResultPanelProps) {
  const value = formatDecimal(entry.resultDecimal);
  return (
    <>
      <p className="conv-card__result">
        <span className="conv-card__muted conv-card__result-label">resultado</span>
        <span className="conv-card__result-value">
          <span>{value}</span>
        </span>
      </p>
    </>
  );
}

function LengthResult({ entry }: ResultPanelProps) {
  const primary = entry.displayPrimary ?? entry.resultFeetInches;
  const { value, unit } = splitValueAndUnit(primary);
  return (
    <>
      <p className="conv-card__result">
        <span className="conv-card__muted conv-card__result-label">resultado</span>
        <span className="conv-card__result-value">
          <span>{value}</span>
          {unit && <span className="conv-card__result-unit">{unit}</span>}
        </span>
      </p>
      <EquivalenceLine entry={entry} />
    </>
  );
}

/**
 * Step 5 — dual-unit length. Imperial (primary) and metric sit side-by-side
 * at the same visual tier so a Brazilian carpenter on a Canadian site can
 * read either system at a glance. Falls back to LengthResult when the
 * metric conversion isn't informative (short lengths).
 */
function DualUnitLengthResult({ entry }: ResultPanelProps) {
  const imperial = entry.displayPrimary ?? entry.resultFeetInches;
  const { value: impValue, unit: impUnit } = splitValueAndUnit(imperial);
  const mm = entry.resultDecimal * 25.4;
  const metric = mm >= 1000 ? `${trimTrailingZeros(mm / 1000, 3)} m` : `${trimTrailingZeros(mm, 1)} mm`;
  const { value: metValue, unit: metUnit } = splitValueAndUnit(metric);
  return (
    <>
      <p className="conv-card__result conv-card__result--dual">
        <span className="conv-card__muted conv-card__result-label">resultado</span>
        <span className="conv-card__result-value">
          <span>{impValue}</span>
          {impUnit && <span className="conv-card__result-unit">{impUnit}</span>}
        </span>
        <span className="conv-card__result-divider" aria-hidden="true">·</span>
        <span className="conv-card__result-value conv-card__result-value--metric">
          <span>{metValue}</span>
          {metUnit && <span className="conv-card__result-unit">{metUnit}</span>}
        </span>
      </p>
      {/* No equivalence line — the metric equivalent is already the co-primary. */}
    </>
  );
}

function trimTrailingZeros(n: number, digits: number): string {
  if (!isFinite(n)) return 'Error';
  return Number(n.toFixed(digits)).toString();
}

function AreaResult({ entry }: ResultPanelProps) {
  const primary = entry.displayPrimary ?? entry.resultFeetInches;
  const { value, unit } = splitValueAndUnit(primary);
  return (
    <>
      <p className="conv-card__result">
        <span className="conv-card__muted conv-card__result-label">resultado</span>
        <span className="conv-card__result-value">
          <span>{value}</span>
          {unit && <span className="conv-card__result-unit">{unit}</span>}
        </span>
      </p>
      <EquivalenceLine entry={entry} />
    </>
  );
}

function VolumeResult({ entry }: ResultPanelProps) {
  const primary = entry.displayPrimary ?? entry.resultFeetInches;
  const { value, unit } = splitValueAndUnit(primary);
  return (
    <>
      <p className="conv-card__result">
        <span className="conv-card__muted conv-card__result-label">resultado</span>
        <span className="conv-card__result-value">
          <span>{value}</span>
          {unit && <span className="conv-card__result-unit">{unit}</span>}
        </span>
      </p>
      <EquivalenceLine entry={entry} />
    </>
  );
}

// ============================================================================
// Shared pieces
// ============================================================================

/**
 * Equivalence line like "equivalente a 74.63 m² · 115668 sq in".
 * Returns null for scalar (no unit to equate) and for entries without dim info.
 */
function EquivalenceLine({ entry }: ResultPanelProps) {
  const dim = resolveDimension(entry);
  if (dim === 'scalar') return null;

  const v = entry.resultDecimal;
  if (!isFinite(v)) return null;

  const fmt = (n: number, digits = 2) => {
    if (!isFinite(n)) return 'Error';
    return Number(n.toFixed(digits)).toString();
  };

  const secondarySuffix =
    entry.displaySecondary && entry.displaySecondary !== '—'
      ? ` · ${entry.displaySecondary}`
      : '';

  let text: string | null = null;

  if (dim === 'length') {
    const mm = v * 25.4;
    const m = mm / 1000;
    const metric = m >= 1 ? `${fmt(m, 3)} m` : `${fmt(mm, 1)} mm`;
    text = `equivalente a ${metric}${secondarySuffix}`;
  } else if (dim === 'area') {
    // 1 m² = 1550.0031 sq in.
    const m2 = v / 1550.0031;
    text = `equivalente a ${fmt(m2, 2)} m²${secondarySuffix}`;
  } else if (dim === 'volume') {
    // 1 m³ = 61023.7 cu in.
    const m3 = v / 61023.7;
    text = `equivalente a ${fmt(m3, 3)} m³${secondarySuffix}`;
  }

  if (!text) return null;
  return <p className="conv-card__equivalence">{text}</p>;
}

// ============================================================================
// Helpers
// ============================================================================

function resolveDimension(entry: HistoryEntry): DimensionType {
  if (entry.dimension) return entry.dimension;
  // Legacy entries pre-Phase-1 — infer from what we have.
  if (!entry.isInchMode) return 'scalar';
  return 'length';
}

function formatDecimal(n: number): string {
  if (!isFinite(n)) return 'Error';
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(2)).toString();
}

/** Split "803.25 sq ft" into { value: "803.25", unit: "sq ft" }. */
function splitValueAndUnit(display: string): { value: string; unit: string } {
  if (!display) return { value: '', unit: '' };
  const match = display.match(/^([\d.'"\s/]+[\d])(\s+.+)?$/);
  if (!match) return { value: display, unit: '' };
  return { value: match[1].trim(), unit: (match[2] ?? '').trim() };
}
