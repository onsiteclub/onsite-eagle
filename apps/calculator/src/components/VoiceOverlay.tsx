// src/components/VoiceOverlay.tsx
// Fullscreen charcoal overlay shown while the user is speaking (mobile/tablet).
// Tap-to-toggle pattern: the voice button in the composer opens this overlay;
// the CTA at the bottom of the overlay acts as the "stop + calculate" button
// (the original voice button sits beneath the overlay on mobile).
//
// Desktop (≥1024px) hides this overlay entirely via CSS — desktop keeps the
// inline sidebar/focal card approach (voice button lives in the right column).

import type { VoiceState } from '../types/calculator';

interface VoiceOverlayProps {
  state: VoiceState;
  /** Live interim transcript from Web Speech API (may be empty initially). */
  transcript: string | null;
  /** BCP-47-ish language label shown in the header ("pt"/"en"/"es"). Defaults to "pt". */
  language?: string;
  /** Called when user clicks the overlay's CTA to stop recording + compute. */
  onStop: () => void;
}

export default function VoiceOverlay({ state, transcript, language = 'pt', onStop }: VoiceOverlayProps) {
  if (state === 'idle') return null;

  const isRecording = state === 'recording';
  const headerLabel = isRecording ? `ouvindo em ${language}` : `processando em ${language}`;

  return (
    <div
      className={`voice-overlay voice-overlay--${state}`}
      role="dialog"
      aria-modal="true"
      aria-label={headerLabel}
    >
      <header className="voice-overlay__header">
        <span className="voice-overlay__status">
          <span className="voice-overlay__status-dot" aria-hidden="true" />
          {headerLabel.toUpperCase()}
        </span>
      </header>

      <div className="voice-overlay__body">
        <p className="voice-overlay__label">
          {isRecording ? 'transcrevendo…' : 'calculando…'}
        </p>

        {/* Live transcript. Empty while Whisper is processing without Web Speech. */}
        <p className="voice-overlay__transcript" aria-live="polite">
          {transcript && transcript !== '…' ? (
            transcript
          ) : (
            <span className="voice-overlay__transcript--waiting">
              {isRecording ? 'Fale uma medida ou expressão…' : 'Traduzindo para matemática…'}
            </span>
          )}
        </p>
      </div>

      {/* Waveform — purely visual, CSS-animated bars. Breathes slowly during
          processing so the user sees the pipeline hasn't frozen. */}
      <div className="voice-overlay__waveform" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="voice-overlay__bar" style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>

      <div className="voice-overlay__footer">
        <p className="voice-overlay__hint">
          {isRecording
            ? 'toque no botão para calcular'
            : 'aguarde — o engine tá interpretando'}
        </p>
        <button
          type="button"
          className={`voice-overlay__cta voice-overlay__cta--${state}`}
          onClick={onStop}
          disabled={!isRecording}
        >
          <span className="voice-overlay__cta-dot" aria-hidden="true" />
          {isRecording ? 'Toque para calcular' : 'Processando…'}
        </button>
      </div>
    </div>
  );
}
