// src/components/Visor.tsx
// Pure visor — `CalculationResult → DOM`. Implements the decision matrix
// from cenarios-visor-calculadora-onsite-v3.html:
//
//   dim 0 / scalar         → primary only
//   dim 1 / length / single→ primary only (imperial OR metric)
//   dim 1 / length / mixed → dual, labels "imperial" / "métrico"
//   dim ≥ 2 / area|volume  → dual, labels "sq ft" / "m²" etc.
//   isError                → "Erro" + errorMessage
//
// No internal state, no event handlers beyond an optional long-press → copy.
// Style is inherited from `.visor*` classes in App.css (cream background,
// JetBrains Mono, right-aligned).

import { useCallback, useRef } from 'react';
import type { CalculationResult } from '../engine/types';

interface VisorProps {
  result: CalculationResult | null;
  /** Long-press the result block to copy. Optional callback runs after the
   *  clipboard call resolves; UI uses it to show a toast. */
  onCopied?: () => void;
}

const LONG_PRESS_MS = 500;

export default function Visor({ result, onCopied }: VisorProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(async () => {
    if (!result || result.isError) return;
    const text = result.secondary
      ? `${result.primary.value} (${result.secondary.value})`
      : result.primary.value;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        onCopied?.();
      }
    } catch {
      /* clipboard blocked — silent */
    }
  }, [result, onCopied]);

  const startPress = () => {
    pressTimer.current = setTimeout(copyToClipboard, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Empty state — visor renders the placeholder hint.
  if (!result) {
    return (
      <div className="visor visor--empty">
        <div className="visor-label">Ready</div>
        <div className="visor-result">0</div>
      </div>
    );
  }

  // Error state — Vol 8.
  if (result.isError) {
    return (
      <div className="visor visor-error">
        {result.expression && <div className="visor-expr">{result.expression}</div>}
        <div className="visor-result">Error</div>
        {result.errorMessage && (
          <div className="visor-error-msg">{result.errorMessage}</div>
        )}
      </div>
    );
  }

  // Decision matrix — secondary present iff mixedSystems OR dim ≥ 2.
  const showDual = result.secondary !== null;

  return (
    <div
      className="visor"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      title="Long-press to copy"
    >
      {result.expression && (
        <div className="visor-expr">{result.expression}</div>
      )}

      {showDual ? (
        <div className="visor-dual">
          <div className="visor-dual-block">
            {result.primary.unitLabel && (
              <div className="visor-dual-ulabel">{result.primary.unitLabel}</div>
            )}
            <div className="visor-dual-value">{result.primary.value}</div>
          </div>
          {result.secondary && (
            <div className="visor-dual-block">
              {result.secondary.unitLabel && (
                <div className="visor-dual-ulabel">{result.secondary.unitLabel}</div>
              )}
              <div className="visor-dual-value">{result.secondary.value}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="visor-result">{result.primary.value || '—'}</div>
      )}

      {result.exactForm && (
        <div className="visor-hint">≈ · exact: {result.exactForm}</div>
      )}
      {result.isApproximate && !result.exactForm && (
        <div className="visor-hint">≈ approximate</div>
      )}
    </div>
  );
}
