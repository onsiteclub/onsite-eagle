// src/components/StairsCalculator.tsx
// Phase 4.3 — stairs panel with Ontario Building Code 2024 compliance.
//
// This is the restored/rewritten version (archive/StairsCalculator-v1.tsx.bak
// was the pre-pressure-plate implementation). The new one delegates all math
// to src/engine/stairs.ts and renders live compliance chips.

import { useEffect, useMemo, useState } from 'react';
import {
  calculateStairs,
  parseToInches,
  formatInches,
  type ComplianceKind,
} from '../engine';
import type { RoutedIntent } from '../types/calculator';

interface StairsCalculatorProps {
  voiceEnabled?: boolean;
  isRecording?: boolean;
  /** Optional pre-filled values from voice intent routing (Phase 4.1). */
  initialParameters?: { totalRise?: number; riserHeight?: number; stepCount?: number; tread?: number };
  /** Step 2 — carries `{totalRise, riserHeight, tread, stepCount}` when the
   *  Calculator tab auto-routes a stairs voice query here. */
  routedIntent?: RoutedIntent | null;
  onRoutedIntentConsumed?: () => void;
}

export default function StairsCalculator({
  initialParameters,
  routedIntent,
  onRoutedIntentConsumed,
}: StairsCalculatorProps) {
  // Inputs stored as strings so the user can type fractions ("9' 2 1/2") — the
  // engine's parser turns them into inches on compute.
  const [totalRiseInput, setTotalRiseInput] = useState(
    initialParameters?.totalRise ? String(initialParameters.totalRise) : "9'"
  );
  const [riserHeightInput, setRiserHeightInput] = useState(
    initialParameters?.riserHeight ? String(initialParameters.riserHeight) : '7'
  );
  const [treadInput, setTreadInput] = useState(
    initialParameters?.tread ? String(initialParameters.tread) : '10'
  );
  const [nosingInput, setNosingInput] = useState('1');

  // Step 2 — consume routed voice intent. Accepts same field names as
  // `initialParameters` (api/interpret.ts uses those for the stairs intent).
  useEffect(() => {
    if (!routedIntent?.parameters) return;
    const p = routedIntent.parameters as {
      totalRise?: unknown; riserHeight?: unknown; tread?: unknown; stepCount?: unknown;
    };
    if (typeof p.totalRise === 'number' && isFinite(p.totalRise)) {
      setTotalRiseInput(String(p.totalRise));
    } else if (typeof p.totalRise === 'string') {
      setTotalRiseInput(p.totalRise);
    }
    if (typeof p.riserHeight === 'number' && isFinite(p.riserHeight)) {
      setRiserHeightInput(String(p.riserHeight));
    }
    if (typeof p.tread === 'number' && isFinite(p.tread)) {
      setTreadInput(String(p.tread));
    }
    onRoutedIntentConsumed?.();
  }, [routedIntent, onRoutedIntentConsumed]);

  const result = useMemo(() => {
    const totalRise = parseToInches(totalRiseInput);
    const riserHeight = riserHeightInput ? parseToInches(riserHeightInput) : undefined;
    const tread = treadInput ? parseToInches(treadInput) : undefined;
    const nosing = nosingInput ? parseToInches(nosingInput) : undefined;
    return calculateStairs({ totalRise, riserHeight, tread, nosing });
  }, [totalRiseInput, riserHeightInput, treadInput, nosingInput]);

  return (
    <div className="stairs-panel tab-desktop-3col">
      <section className="stairs-panel__inputs">
        <Row label="Altura total (piso a piso)" hint="Ex: 9', 108&quot;, 2740mm">
          <input
            type="text"
            value={totalRiseInput}
            onChange={(e) => setTotalRiseInput(e.target.value)}
            className="stairs-input"
            placeholder="9'"
            spellCheck={false}
          />
        </Row>
        <Row label="Altura do espelho (riser)" hint="Alvo 7&quot;, OBC 4.92-7.87&quot;">
          <input
            type="text"
            value={riserHeightInput}
            onChange={(e) => setRiserHeightInput(e.target.value)}
            className="stairs-input"
            placeholder="7"
            spellCheck={false}
          />
        </Row>
        <Row label="Profundidade do piso (tread)" hint="Mínimo 10&quot; (255mm)">
          <input
            type="text"
            value={treadInput}
            onChange={(e) => setTreadInput(e.target.value)}
            className="stairs-input"
            placeholder="10"
            spellCheck={false}
          />
        </Row>
        <Row label="Saliência (nosing)" hint="Máximo 1&quot; (25mm)">
          <input
            type="text"
            value={nosingInput}
            onChange={(e) => setNosingInput(e.target.value)}
            className="stairs-input"
            placeholder="1"
            spellCheck={false}
          />
        </Row>
      </section>

      <section className="stairs-panel__output">
        <h3 className="stairs-panel__section-title">Cálculo</h3>
        <ul className="stairs-output">
          <li><span>Degraus</span><strong>{result.output.stepCount || '—'}</strong></li>
          <li><span>Altura espelho</span><strong>{formatInches(result.output.riserHeight)}</strong></li>
          <li><span>Run total</span><strong>{formatInches(result.output.totalRun)}</strong></li>
          <li><span>Stringer</span><strong>{formatInches(result.output.stringerLength)}</strong></li>
          <li><span>Ângulo</span><strong>{result.output.angle.toFixed(1)}°</strong></li>
        </ul>
      </section>

      <section className="stairs-panel__compliance">
        <h3 className="stairs-panel__section-title">
          OBC 2024
          {result.valid ? (
            <span className="stairs-compliance-badge stairs-compliance-badge--ok">Conforme</span>
          ) : (
            <span className="stairs-compliance-badge stairs-compliance-badge--error">Não conforme</span>
          )}
        </h3>
        <ul className="stairs-compliance">
          {result.compliance.map((check) => (
            <li key={check.field} className={`stairs-compliance__item stairs-compliance__item--${check.kind}`}>
              <span className="stairs-compliance__icon" aria-hidden="true">
                {complianceIcon(check.kind)}
              </span>
              <div className="stairs-compliance__text">
                <div className="stairs-compliance__label">
                  <strong>{check.label}</strong>
                  <span className="stairs-compliance__value">{check.measuredValue}</span>
                </div>
                <div className="stairs-compliance__rule">{check.rule}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="stairs-row">
      <span className="stairs-row__label">
        {label}
        {hint && <em className="stairs-row__hint">{hint}</em>}
      </span>
      {children}
    </label>
  );
}

function complianceIcon(kind: ComplianceKind): string {
  if (kind === 'ok') return '✓';
  if (kind === 'warn') return '⚠';
  return '✗';
}
