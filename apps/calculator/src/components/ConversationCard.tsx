// src/components/ConversationCard.tsx
// Single turn in the conversational calculator.
// Two visual variants:
//   - 'chat'  — default. Compact card inside the mobile scroll feed.
//   - 'focal' — desktop's central "hero" card. Bigger typography, equivalence
//               line, and an extra "Explicar" action.
// Inline edit mode works in both variants.

import { useCallback, useEffect, useRef, useState } from 'react';
import { calculate } from '../lib/calculator';
import type { CalculationResult, HistoryEntry } from '../types/calculator';

interface ConversationCardProps {
  entry: HistoryEntry;
  isLatest: boolean;
  onRetry: (entry: HistoryEntry) => void;
  onUpdate: (id: string, result: CalculationResult) => void;
  /** Visual variant. 'focal' is the desktop hero version; 'chat' the scroll feed. */
  variant?: 'chat' | 'focal';
  /** Optional — when provided (focal only today), renders an "Explicar" button. */
  onExplain?: (entry: HistoryEntry) => void;
}

export default function ConversationCard({
  entry,
  isLatest,
  onRetry,
  onUpdate,
  variant = 'chat',
  onExplain,
}: ConversationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.expression);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const copyResult = useCallback(() => {
    const text = entry.isInchMode ? entry.resultFeetInches : String(entry.resultDecimal);
    void navigator.clipboard?.writeText(text);
  }, [entry]);

  const startEdit = useCallback(() => {
    setDraft(entry.expression);
    setEditError(null);
    setIsEditing(true);
  }, [entry.expression]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditError(null);
    setDraft(entry.expression);
  }, [entry.expression]);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setEditError('Expressão vazia.');
      return;
    }
    const result = calculate(trimmed);
    if (!result || result.resultFeetInches === 'Error') {
      setEditError('Não consegui calcular.');
      return;
    }
    onUpdate(entry.id, result);
    setIsEditing(false);
    setEditError(null);
  }, [draft, entry.id, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [commitEdit, cancelEdit]);

  const isVoice = entry.inputMethod === 'voice';
  const dimensionLabel = classifyDimension(entry);
  const primary = entry.displayPrimary ?? (entry.isInchMode ? entry.resultFeetInches : formatDecimal(entry.resultDecimal));
  const secondary = entry.displaySecondary ?? (entry.isInchMode ? entry.resultTotalInches : '—');
  const equivalence = variant === 'focal' ? buildEquivalenceLine(entry) : null;

  // Focal variant splits the primary display into "value" and "unit" so we can
  // typeset the unit at a smaller size next to the number (see .conv-card--focal).
  const focalSplit = variant === 'focal' ? splitValueAndUnit(primary) : null;

  return (
    <article
      className={[
        'conv-card',
        variant === 'focal' && 'conv-card--focal',
        isLatest && variant !== 'focal' && 'conv-card--latest',
        isEditing && 'conv-card--editing',
      ].filter(Boolean).join(' ')}
      aria-current={isLatest || undefined}
    >
      {/* Header — chips */}
      <header className="conv-card__meta">
        {variant === 'focal' && dimensionLabel ? (
          <span className={`conv-chip conv-chip--dim conv-chip--${dimensionLabel.kind} conv-chip--dim-focal`}>
            ● {dimensionLabel.label.toUpperCase()}
          </span>
        ) : (
          <>
            <span className={`conv-chip conv-chip--${isVoice ? 'voice' : 'manual'}`}>
              {isVoice ? '🎤 voz' : '⌨︎ manual'}
            </span>
            {dimensionLabel && (
              <span className={`conv-chip conv-chip--dim conv-chip--${dimensionLabel.kind}`}>
                ● {dimensionLabel.label}
              </span>
            )}
          </>
        )}
        {isEditing && <span className="conv-chip conv-chip--pending">editando…</span>}
      </header>

      {/* Voice transcription (only when voice + consent captured it) */}
      {!isEditing && isVoice && entry.transcription && (
        <p className="conv-card__transcription">
          <span className="conv-card__muted">você disse</span>
          <span className="conv-card__quoted">“{entry.transcription}”</span>
        </p>
      )}

      {/* Expression — static or inline editor */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="conv-card__editor"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setEditError(null); }}
          onKeyDown={handleKeyDown}
          placeholder="ex: 5 1/2 + 3 1/4"
          aria-label="Editar expressão"
          spellCheck={false}
          autoComplete="off"
        />
      ) : (
        <p className="conv-card__expression">
          {variant === 'focal' && <span className="conv-card__muted">entendi</span>}
          <span className="conv-card__expression-text">{entry.expression}</span>
        </p>
      )}

      {editError && <p className="conv-card__error">{editError}</p>}

      {/* Result */}
      {!isEditing && (
        <>
          {variant === 'focal' && focalSplit ? (
            <p className="conv-card__result">
              <span className="conv-card__muted conv-card__result-label">resultado</span>
              <span className="conv-card__result-value">
                {focalSplit.value}
                {focalSplit.unit && <span className="conv-card__result-unit">{focalSplit.unit}</span>}
              </span>
            </p>
          ) : (
            <p className="conv-card__result">{primary}</p>
          )}
          {variant !== 'focal' && secondary && secondary !== '—' && (
            <p className="conv-card__result-secondary">{secondary}</p>
          )}
          {variant === 'focal' && equivalence && (
            <p className="conv-card__equivalence">{equivalence}</p>
          )}
        </>
      )}

      {/* Actions */}
      <footer className="conv-card__actions">
        {isEditing ? (
          <>
            <button type="button" className="conv-action conv-action--primary" onClick={commitEdit}>
              Recalcular
            </button>
            <button type="button" className="conv-action" onClick={cancelEdit}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="button" className="conv-action" onClick={copyResult}>copiar</button>
            <button type="button" className="conv-action" onClick={startEdit}>editar</button>
            <button type="button" className="conv-action" onClick={() => onRetry(entry)}>refazer</button>
            {variant === 'focal' && onExplain && (
              <button type="button" className="conv-action" onClick={() => onExplain(entry)}>
                explicar
              </button>
            )}
          </>
        )}
      </footer>
    </article>
  );
}

function formatDecimal(n: number): string {
  if (!isFinite(n)) return 'Error';
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(2)).toString();
}

/** Split "803.25 sq ft" into { value: "803.25", unit: "sq ft" } for focal typography. */
function splitValueAndUnit(display: string): { value: string; unit: string } {
  if (!display) return { value: '', unit: '' };
  // Match: leading numeric/fraction/feet-inch literal, then whitespace-separated unit text.
  const match = display.match(/^([\d.'"\s/]+[\d])(\s+.+)?$/);
  if (!match) return { value: display, unit: '' };
  return { value: match[1].trim(), unit: (match[2] ?? '').trim() };
}

/**
 * Builds the "equivalente a …" line for the focal card.
 * Length → shows metric (mm/m). Area → m² + total sq in. Volume → m³ + total cu in.
 * Scalar returns null (nothing to equate).
 */
function buildEquivalenceLine(entry: HistoryEntry): string | null {
  if (!entry.dimension || entry.dimension === 'scalar') return null;
  // `resultDecimal` mirrors the engine's `valueCanonical` for all dimensions
  // (inches/sqin/cuin depending on dim) — documented in CalculationResult.
  const v = entry.resultDecimal;
  if (!isFinite(v)) return null;

  const fmt = (n: number, digits = 2) => {
    if (!isFinite(n)) return 'Error';
    return Number(n.toFixed(digits)).toString();
  };

  if (entry.dimension === 'length') {
    // Engine's canonical = inches. Convert to metric.
    const mm = v * 25.4;
    const m = mm / 1000;
    const metric = m >= 1 ? `${fmt(m, 3)} m` : `${fmt(mm, 1)} mm`;
    const secondary = entry.displaySecondary && entry.displaySecondary !== '—'
      ? ` · ${entry.displaySecondary}`
      : '';
    return `equivalente a ${metric}${secondary}`;
  }

  if (entry.dimension === 'area') {
    // sqin → m². 1 m² = 1550.0031 sq in.
    const m2 = v / 1550.0031;
    const secondary = entry.displaySecondary && entry.displaySecondary !== '—'
      ? ` · ${entry.displaySecondary}`
      : '';
    return `equivalente a ${fmt(m2, 2)} m²${secondary}`;
  }

  if (entry.dimension === 'volume') {
    // cuin → m³. 1 m³ = 61023.7 cu in.
    const m3 = v / 61023.7;
    const secondary = entry.displaySecondary && entry.displaySecondary !== '—'
      ? ` · ${entry.displaySecondary}`
      : '';
    return `equivalente a ${fmt(m3, 3)} m³${secondary}`;
  }

  return null;
}

/**
 * Phase 1 — read dimension straight from the engine's output when available.
 * Fallback to a best-effort regex heuristic for history entries persisted before
 * Phase 1 (their `dimension` field is undefined on disk).
 */
function classifyDimension(entry: HistoryEntry): { kind: 'area' | 'length' | 'count' | 'volume'; label: string } | null {
  switch (entry.dimension) {
    case 'area':   return { kind: 'area',   label: 'área' };
    case 'volume': return { kind: 'volume', label: 'volume' };
    case 'length': return { kind: 'length', label: 'comprimento' };
    case 'scalar': return { kind: 'count',  label: 'número' };
  }

  // Legacy fallback — pre-Phase-1 entries don't have `dimension` persisted.
  if (!entry.isInchMode) return { kind: 'count', label: 'número' };
  const hasTwoMeasurements = /['"]\s*[*×]\s*\d.*['"]/g.test(entry.expression);
  if (hasTwoMeasurements) return { kind: 'area', label: 'área' };
  return { kind: 'length', label: 'comprimento' };
}
