// src/components/ConversationCard.tsx
// Single turn in the conversational calculator.
// Phase 3.2: display mode — transcription (voice only) → expression → result → actions.
// Phase 3.5: inline edit mode — expression becomes an <input>, Recalcular recomputes
// via the local engine (no GPT round-trip) and replaces the turn in place.

import { useCallback, useEffect, useRef, useState } from 'react';
import { calculate } from '../lib/calculator';
import type { CalculationResult, HistoryEntry } from '../types/calculator';

interface ConversationCardProps {
  entry: HistoryEntry;
  isLatest: boolean;
  onRetry: (entry: HistoryEntry) => void;
  onUpdate: (id: string, result: CalculationResult) => void;
}

export default function ConversationCard({ entry, isLatest, onRetry, onUpdate }: ConversationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.expression);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input the moment edit mode opens — feels like a native inline editor.
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
  // Phase 1 — prefer engine-produced display fields; fall back to legacy for old history entries.
  const primary = entry.displayPrimary ?? (entry.isInchMode ? entry.resultFeetInches : formatDecimal(entry.resultDecimal));
  const secondary = entry.displaySecondary ?? (entry.isInchMode ? entry.resultTotalInches : '—');

  return (
    <article
      className={`conv-card ${isLatest ? 'conv-card--latest' : ''} ${isEditing ? 'conv-card--editing' : ''}`}
      aria-current={isLatest || undefined}
    >
      {/* Header row: input-method chip + semantic dimension chip */}
      <header className="conv-card__meta">
        <span className={`conv-chip conv-chip--${isVoice ? 'voice' : 'manual'}`}>
          {isVoice ? '🎤 voz' : '⌨︎ manual'}
        </span>
        {dimensionLabel && (
          <span className={`conv-chip conv-chip--dim conv-chip--${dimensionLabel.kind}`}>
            ● {dimensionLabel.label}
          </span>
        )}
        {isEditing && <span className="conv-chip conv-chip--pending">editando…</span>}
      </header>

      {/* Optional: raw transcription — only when voice + consent captured it */}
      {!isEditing && isVoice && entry.transcription && (
        <p className="conv-card__transcription">
          <span className="conv-card__muted">Você disse:</span> “{entry.transcription}”
        </p>
      )}

      {/* Expression — either static text or inline editor */}
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
        <p className="conv-card__expression">{entry.expression}</p>
      )}

      {editError && <p className="conv-card__error">{editError}</p>}

      {/* Result — hidden while editing (would be stale) */}
      {!isEditing && (
        <>
          <p className="conv-card__result">{primary}</p>
          {secondary && secondary !== '—' && (
            <p className="conv-card__result-secondary">{secondary}</p>
          )}
        </>
      )}

      {/* Action row — changes shape between display and edit modes */}
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
            <button type="button" className="conv-action" onClick={copyResult}>
              Copiar
            </button>
            <button type="button" className="conv-action" onClick={startEdit}>
              Editar
            </button>
            <button type="button" className="conv-action" onClick={() => onRetry(entry)}>
              Refazer
            </button>
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
