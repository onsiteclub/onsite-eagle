// src/components/ConversationCard.tsx
// Single turn in the conversational calculator.
// Two visual variants:
//   - 'chat'  — default. Compact card inside the mobile scroll feed.
//   - 'focal' — desktop's central "hero" card. Bigger typography, equivalence
//               line, and an extra "Explicar" action.
// Inline edit mode works in both variants.

import { useCallback, useEffect, useRef, useState } from 'react';
import { calculate } from '../lib/calculator';
import ResultPanel from './ResultPanel';
import type { CalculationResult, HistoryEntry } from '../types/calculator';
import type { TabType } from './TabNavigation';

interface ConversationCardProps {
  entry: HistoryEntry;
  isLatest: boolean;
  onRetry: (entry: HistoryEntry) => void;
  onUpdate: (id: string, result: CalculationResult) => void;
  /** Visual variant. 'focal' is the desktop hero version; 'chat' the scroll feed. */
  variant?: 'chat' | 'focal';
  /** Optional — when provided (focal only today), renders an "Explicar" button. */
  onExplain?: (entry: HistoryEntry) => void;
  /** Step 6 — when GPT's interpretation missed the mark, the user can swap
   *  to one of the other tools. Focal-only affordance. */
  onAltInterpretation?: (tab: TabType) => void;
}

// Step 6 — alternatives the "não foi isso?" picker offers. Calculator stays
// out of the list because we're already on it. Keep it tight — three chips
// fit in the focal actions row without becoming noise.
const ALT_INTERPRETATIONS: ReadonlyArray<{ tab: TabType; label: string }> = [
  { tab: 'stairs',    label: 'escada' },
  { tab: 'triangle',  label: 'triângulo' },
  { tab: 'converter', label: 'conversor' },
];

export default function ConversationCard({
  entry,
  isLatest,
  onRetry,
  onUpdate,
  variant = 'chat',
  onExplain,
  onAltInterpretation,
}: ConversationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.expression);
  const [editError, setEditError] = useState<string | null>(null);
  // Step 6 — toggle for the inline alternatives palette.
  const [showAlts, setShowAlts] = useState(false);
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

      {/* Result — focal variant delegates to ResultPanel registry; chat keeps compact inline layout. */}
      {!isEditing && (
        variant === 'focal' ? (
          <ResultPanel entry={entry} />
        ) : (
          <>
            <p className="conv-card__result">{primary}</p>
            {secondary && secondary !== '—' && (
              <p className="conv-card__result-secondary">{secondary}</p>
            )}
          </>
        )
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
            {variant === 'focal' && onAltInterpretation && (
              <button
                type="button"
                className={`conv-action ${showAlts ? 'conv-action--active' : ''}`}
                onClick={() => setShowAlts((v) => !v)}
                aria-expanded={showAlts}
                aria-controls="alt-interpretations"
              >
                não foi isso?
              </button>
            )}
          </>
        )}
      </footer>

      {/* Step 6 — alternative-interpretation palette. Reveals on demand so the
          default card stays quiet; the user only sees the alts when they
          believe GPT missed the interpretation. */}
      {variant === 'focal' && onAltInterpretation && showAlts && !isEditing && (
        <div id="alt-interpretations" className="conv-card__alts" role="group" aria-label="Outras interpretações">
          <span className="conv-card__alts-hint">era sobre:</span>
          {ALT_INTERPRETATIONS.map((alt) => (
            <button
              key={alt.tab}
              type="button"
              className="conv-action conv-action--alt"
              onClick={() => {
                onAltInterpretation(alt.tab);
                setShowAlts(false);
              }}
            >
              {alt.label}
            </button>
          ))}
        </div>
      )}
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
