// src/components/ConversationalCalculator.tsx
// Phase 3.2 — chat-style calculator. Scrollable conversation at the top,
// composer (expression + keypad + voice) at the bottom.
// Replaces the classic two-card layout for the Calculator tab.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useCalculator, useOnlineStatus, useVoiceRecorder, useCalculatorHistory } from '../hooks';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { logger } from '../lib/logger';
import { logger as pkgLogger } from '@onsite/logger';
import { getLocalConsentStatus } from '../lib/consent';
import { supabase } from '../lib/supabase';
import VoiceConsentModal from './VoiceConsentModal';
import Toast from './Toast';
import ConversationCard from './ConversationCard';
import { HistoryModal } from './HistoryModal';
import VoiceOverlay from './VoiceOverlay';
import type { HistoryEntry, VoiceState, VoiceResponse } from '../types/calculator';
import type { TabType } from './TabNavigation';

// Same keypad grammar as the classic Calculator — users' muscle memory preserved.
const FRACTION_PAD = [
  ['1/8"', '1/4"', '3/8"', '1/2"'],
  ['5/8"', '3/4"', '7/8"', "'ft"],
];

const KEYPAD = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

const getApiEndpoint = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (Capacitor.isNativePlatform()) return 'https://onsite-calculator.vercel.app/api/interpret';
  return '/api/interpret';
};
const API_ENDPOINT = getApiEndpoint();

interface ConversationalCalculatorProps {
  voiceState: VoiceState;
  setVoiceState: (state: VoiceState) => void;
  hasVoiceAccess: boolean;
  onVoiceUpgradeClick: () => void;
  onVoiceUsed?: () => void;
  /** Phase 4.2 — when voice returns an intent like "stairs" or "triangle", the
   *  parent can auto-switch to that tab. No-op if not provided. */
  onIntentRouted?: (tab: TabType) => void;
}

/** Phase 4.2 — maps GPT's intent field to the tab it corresponds to. */
function tabForIntent(intent: string | undefined): TabType | null {
  switch (intent) {
    case 'stairs':     return 'stairs';
    case 'triangle':   return 'triangle';
    case 'conversion': return 'converter';
    // calculation / area / volume / unclear stay in the main chat.
    default: return null;
  }
}

export default function ConversationalCalculator({
  voiceState,
  setVoiceState,
  hasVoiceAccess,
  onVoiceUpgradeClick,
  onVoiceUsed,
  onIntentRouted,
}: ConversationalCalculatorProps) {
  const isOnline = useOnlineStatus();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [voiceConsentChecked, setVoiceConsentChecked] = useState(false);
  const [hasVoiceConsent, setHasVoiceConsent] = useState<boolean | null>(null);
  const [hasVoiceTrainingConsent, setHasVoiceTrainingConsent] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' | 'success' } | null>(null);
  // Desktop sidebar's "ver todos →" opens the full-history modal (same component
  // the classic UI used — we just keep it around for overflow).
  const [showFullHistory, setShowFullHistory] = useState(false);
  // Live transcription preview — shown while the pipeline is running so the user
  // sees "you said X → we understood Y → result" in real time, not just at the end.
  const [pendingTranscription, setPendingTranscription] = useState<string | null>(null);

  const { history, addToHistory, updateEntry, clearHistory } = useCalculatorHistory();

  const {
    expression,
    setExpression,
    setExpressionAndCompute,
    compute,
    clear,
    backspace,
    appendKey,
    appendFraction,
    appendOperator,
  } = useCalculator();

  // Auto-scroll to the newest card whenever the conversation grows.
  const conversationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = conversationRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, voiceState, pendingTranscription]);

  // Microphone consent check on mount (App Store requirement: ask before getUserMedia).
  useEffect(() => {
    if (voiceConsentChecked) return;
    const status = getLocalConsentStatus('microphone_usage');
    setHasVoiceConsent(status);
    setHasVoiceTrainingConsent(getLocalConsentStatus('voice_training') === true);
    setVoiceConsentChecked(true);
    pkgLogger.debug('VOICE', 'Microphone consent status', { status });
  }, [voiceConsentChecked]);

  const handleAudioUpload = useCallback(async (audioBlob: Blob) => {
    const startTime = Date.now();
    if (audioBlob.size === 0) {
      logger.voice.error('Empty audio blob', { blobSize: 0 });
      setVoiceState('idle');
      return;
    }

    setVoiceState('processing');
    setPendingTranscription('…'); // Shows a ghost card while Whisper runs.

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('voice_training_consent', hasVoiceTrainingConsent ? '1' : '0');

    const headers: HeadersInit = {};
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      if (!response.ok) {
        const errorText = await response.text();
        logger.voice.apiCall(duration, false, { status: response.status, error: errorText });
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json() as VoiceResponse & {
        intent?: string;
        parameters?: Record<string, unknown>;
      };

      // Phase 4.2 — route to the right tab if the GPT intent says so.
      // The parent swaps view; this component stops being mounted a tick later.
      if (onIntentRouted) {
        const targetTab = tabForIntent(data.intent);
        if (targetTab) {
          onIntentRouted(targetTab);
          // Don't also update the composer — the destination tab owns the result now.
          setVoiceState('idle');
          setPendingTranscription(null);
          return;
        }
      }

      if (data.expression) {
        const result = setExpressionAndCompute(data.expression, {
          inputMethod: 'voice',
          voiceLogId: data.voice_log_id,
        });
        logger.voice.apiCall(duration, true, {
          status: response.status,
          expression: data.expression,
          result: result?.resultDecimal,
        });
        if (result) {
          addToHistory(result, {
            inputMethod: 'voice',
            // Only store transcription when the user opted in — privacy.
            transcription: hasVoiceTrainingConsent ? data.expression : undefined,
            voiceLogId: data.voice_log_id,
          });
          // Clear the composer: the result now lives in a card.
          setExpression('');
        } else {
          setToast({
            message: 'Não consegui calcular. Tenta algo como “5 e meio mais 3”.',
            type: 'info',
          });
        }
        onVoiceUsed?.();
      } else if (data.error) {
        logger.voice.apiCall(duration, false, { status: response.status, apiError: data.error });
        setToast({ message: 'Não entendi. Tente de novo.', type: 'info' });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.voice.error('Voice API timeout after 20s', { duration_ms: duration });
        setToast({ message: 'Tempo esgotado. Tente novamente.', type: 'error' });
      } else {
        logger.voice.error('API request failed', { error: String(error), duration_ms: duration });
        setToast({ message: 'Falha no reconhecimento de voz.', type: 'error' });
      }
    } finally {
      setVoiceState('idle');
      setPendingTranscription(null);
    }
  }, [setExpressionAndCompute, setExpression, setVoiceState, addToHistory, hasVoiceTrainingConsent, onVoiceUsed]);

  const { startRecording, stopRecording } = useVoiceRecorder({
    onRecordingComplete: handleAudioUpload,
    onError: (error) => {
      logger.voice.error('Recording error', { error: String(error) });
      setVoiceState('idle');
      setPendingTranscription(null);
      const isDenied = /denied|permission/i.test(String(error));
      setToast({
        message: isDenied
          ? 'Microfone negado. Verifique permissões do dispositivo.'
          : 'Não consegui começar a gravar.',
        type: 'error',
      });
    },
  });

  // Phase 3.3 — live transcription preview via Web Speech API.
  // Runs in PARALLEL with MediaRecorder. The browser's engine updates the
  // ghost card as the user speaks; Whisper (via /api/interpret) still
  // produces the authoritative transcript that feeds GPT. On unsupported
  // browsers (Firefox) the hook no-ops and users see Whisper's final only.
  const speech = useSpeechRecognition({
    onInterim: (text) => setPendingTranscription(text),
    onFinal: (text) => setPendingTranscription(text),
    onError: (error) => {
      // 'no-speech' fires on silence — harmless. Other errors just log.
      if (error !== 'no-speech') {
        pkgLogger.debug('VOICE', 'SpeechRecognition error (non-fatal)', { error });
      }
    },
  });

  const handleConsentResponse = (microphoneGranted: boolean, voiceTrainingGranted: boolean) => {
    setHasVoiceConsent(microphoneGranted);
    setHasVoiceTrainingConsent(voiceTrainingGranted);
    setShowConsentModal(false);
    if (microphoneGranted && voiceState === 'idle') {
      logger.voice.start();
      setVoiceState('recording');
      startRecording();
      if (speech.isSupported) speech.start();
    }
  };

  const handleVoiceToggle = () => {
    if (!isOnline || voiceState === 'processing') return;
    if (!hasVoiceAccess) return onVoiceUpgradeClick();
    if (hasVoiceConsent === null || hasVoiceConsent === false) {
      logger.consent.prompted('microphone_usage');
      setShowConsentModal(true);
      return;
    }
    if (voiceState === 'idle') {
      logger.voice.start();
      setVoiceState('recording');
      startRecording();
      // Fire SpeechRecognition alongside MediaRecorder — pure UX, non-blocking.
      if (speech.isSupported) speech.start();
    } else if (voiceState === 'recording') {
      logger.voice.stop();
      stopRecording();
      if (speech.isSupported) speech.stop();
    }
  };

  const handleKeyClick = (key: string) => {
    switch (key) {
      case '=': {
        const result = compute({ inputMethod: 'keypad' });
        if (result) {
          addToHistory(result, { inputMethod: 'manual' });
          setExpression(''); // Fresh composer after commit — result lives in the card.
        }
        break;
      }
      case 'C':       return clear();
      case '⌫':       return backspace();
      case '÷':       return appendOperator('/');
      case '×':       return appendOperator('*');
      case '+':
      case '-':       return appendOperator(key);
      case '%':       return appendOperator('%');
      default:        return appendKey(key);
    }
  };

  const handleFractionClick = (frac: string) => {
    if (frac === "'ft") return appendKey("' ");
    appendFraction(frac);
  };

  // "Refazer" action — rehydrates the composer with the past expression so the
  // user can tweak and recompute. If it was a voice turn, they start from the
  // interpreted expression, not the raw transcription.
  const handleRetry = useCallback((entry: HistoryEntry) => {
    setExpression(entry.expression);
  }, [setExpression]);

  // Phase 3.6 — export the conversation as plain text and copy to clipboard.
  // Order: newest → oldest. Columns: timestamp · input · expression · result.
  const handleExport = useCallback(() => {
    if (history.length === 0) return;
    const lines = history.map(h => {
      const when = new Date(h.timestamp).toLocaleString('pt-BR');
      const method = h.inputMethod === 'voice' ? 'voz' : 'manual';
      const value = h.isInchMode ? h.resultFeetInches : String(h.resultDecimal);
      return `${when}\t${method}\t${h.expression}\t= ${value}`;
    });
    const payload = `OnSite Calculator — ${history.length} cálculo(s)\n\n${lines.join('\n')}`;
    void navigator.clipboard?.writeText(payload);
    setToast({ message: `${history.length} cálculo(s) copiados.`, type: 'success' });
  }, [history]);

  // Phase 3.4 — confirmed clear. Uses window.confirm as the simplest guard;
  // a custom modal is overkill for a back-office action on personal data.
  const handleClear = useCallback(() => {
    if (history.length === 0) return;
    if (!window.confirm(`Apagar ${history.length} cálculo(s) do histórico?`)) return;
    void clearHistory();
  }, [history.length, clearHistory]);

  // Phase 4 placeholder — "explicar" button on the focal card. Real impl
  // would ask GPT for a plain-language breakdown of the calculation. For now,
  // surface a toast so the user knows the button is wired but dormant.
  const handleExplain = useCallback(() => {
    setToast({ message: 'Explicação em linguagem natural — em breve.', type: 'info' });
  }, []);

  const voiceButtonText = !isOnline
    ? 'Offline'
    : voiceState === 'recording'
    ? 'Toque para parar'
    : voiceState === 'processing'
    ? 'Processando…'
    : hasVoiceAccess
    ? 'Toque para falar'
    : 'Voz — fazer login';

  const voiceButtonClass = [
    'voice-btn',
    voiceState === 'recording' && 'listening',
    voiceState === 'processing' && 'processing',
    !hasVoiceAccess && 'locked',
  ].filter(Boolean).join(' ');

  // Focal card target — desktop's hero card always shows the most recent turn.
  const focalEntry = history[0] ?? null;
  // Sidebar shows a short list of recent turns (compact), plus a "ver todos" affordance.
  const sidebarEntries = history.slice(0, 4);

  return (
    <>
      <main className="conv-main">
        {/* =================================================================
            SIDEBAR — desktop only. Compact history cards + overflow link.
            Hidden via CSS on mobile/tablet (chat feed takes over there).
            ================================================================= */}
        <aside className="conv-sidebar" aria-label="Histórico recente">
          <header className="conv-sidebar__header">
            <h3 className="conv-sidebar__title">Histórico</h3>
            {history.length > 0 && (
              <div className="conv-sidebar__tools">
                <button type="button" className="conv-sidebar__tool" onClick={handleExport} title="Exportar">
                  Export
                </button>
                <button type="button" className="conv-sidebar__tool conv-sidebar__tool--danger" onClick={handleClear} title="Limpar">
                  Limpar
                </button>
              </div>
            )}
          </header>

          {sidebarEntries.length === 0 ? (
            <p className="conv-sidebar__empty">Nenhum cálculo ainda.</p>
          ) : (
            <ul className="conv-sidebar__list">
              {sidebarEntries.map((entry, idx) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`conv-sidebar-item ${idx === 0 ? 'conv-sidebar-item--latest' : ''}`}
                    onClick={() => handleRetry(entry)}
                    title="Refazer com esta expressão"
                  >
                    <span className="conv-sidebar-item__meta">
                      {relativeTime(entry.timestamp)} · {classifySidebarDim(entry)}
                    </span>
                    <span className="conv-sidebar-item__expression">{entry.expression}</span>
                    <span className="conv-sidebar-item__result">{entry.displayPrimary ?? entry.resultFeetInches}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {history.length > sidebarEntries.length && (
            <button type="button" className="conv-sidebar__all" onClick={() => setShowFullHistory(true)}>
              ver todos →
            </button>
          )}
        </aside>

        {/* =================================================================
            FOCUS COLUMN — chat feed (mobile) OR focal card (desktop) + composer.
            ================================================================= */}
        <section className="conv-focus">
          {/* Empty state (both viewports) */}
          {history.length === 0 && voiceState === 'idle' && (
            <div className="conv-empty">
              <p className="conv-empty__title">Pronto pra calcular</p>
              <p className="conv-empty__hint">
                Digite uma medida (ex: <code>5 1/2 + 3 1/4</code>) ou fale algo como
                <em> “cinco e meio mais três e um quarto”</em>.
              </p>
            </div>
          )}

          {/* Mobile/tablet: full chat feed scroll with all turns + ghost. */}
          <div className="conv-history" ref={conversationRef} aria-live="polite">
            {[...history].reverse().map((entry, idx, arr) => (
              <ConversationCard
                key={entry.id}
                entry={entry}
                isLatest={idx === arr.length - 1}
                onRetry={handleRetry}
                onUpdate={updateEntry}
              />
            ))}

            {voiceState !== 'idle' && (
              <div className="conv-card conv-card--pending">
                <header className="conv-card__meta">
                  <span className="conv-chip conv-chip--voice">🎤 voz</span>
                  <span className="conv-chip conv-chip--pending">
                    {voiceState === 'recording' ? 'ouvindo…' : 'processando…'}
                  </span>
                </header>
                {pendingTranscription && pendingTranscription !== '…' && (
                  <p className="conv-card__transcription">
                    <span className="conv-card__muted">
                      {voiceState === 'recording' ? 'Você:' : 'Entendi:'}
                    </span>{' '}
                    “{pendingTranscription}”
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Desktop: hero card showing only the most recent turn. */}
          {focalEntry && (
            <div className="conv-focal-wrapper">
              <ConversationCard
                key={`focal-${focalEntry.id}`}
                entry={focalEntry}
                isLatest
                variant="focal"
                onRetry={handleRetry}
                onUpdate={updateEntry}
                onExplain={handleExplain}
              />
            </div>
          )}

          {/* Composer — expression input. On mobile the keypad+voice follow in
              `.conv-controls` below (same DOM order, flex-column stack). On
              desktop the keypad goes to the right column via grid placement. */}
          <div className="conv-composer-input">
            <div className="expression-wrapper">
              <div className="expression-input" role="textbox" aria-label="Expressão">
                <span className="conv-composer-input__dot" aria-hidden="true" />
                <span className={`expression-text ${!expression ? 'placeholder' : ''}`}>
                  {expression || 'Digite ou fale: 5 1/2 + 3 1/4'}
                </span>
                <span className="conv-composer-input__hint" aria-hidden="true">space</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            CONTROLS — fraction pad + keypad + voice button.
            Mobile: stacks vertically below the composer input.
            Desktop: becomes the right column of the grid.
            ================================================================= */}
        <aside className="conv-controls" aria-label="Teclado">
          <div className="fraction-container">
            <div className="fraction-pad">
              {FRACTION_PAD.flat().map((frac, i) => (
                <button
                  key={i}
                  type="button"
                  className={`frac-btn ${frac === "'ft" ? 'feet' : ''}`}
                  onClick={() => handleFractionClick(frac)}
                >
                  {frac}
                </button>
              ))}
            </div>
          </div>

          <div className="keypad">
            {KEYPAD.map((row, rowIndex) => (
              <div key={rowIndex} className={`keypad-row ${rowIndex === KEYPAD.length - 1 ? 'last-row' : ''}`}>
                {row.map((key, keyIndex) => (
                  <button
                    key={keyIndex}
                    type="button"
                    className={[
                      'key',
                      key === '=' && 'equals',
                      (key === 'C' || key === '⌫') && 'danger',
                      '÷×-+%'.includes(key) && 'operator',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleKeyClick(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <button
            type="button"
            className={voiceButtonClass}
            disabled={!isOnline || voiceState === 'processing'}
            onClick={handleVoiceToggle}
          >
            <span className="voice-icon">
              {voiceState === 'recording' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              ) : voiceState === 'processing' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="0">
                    <animate attributeName="stroke-dashoffset" values="0;60" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C10.34 2 9 3.34 9 5V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V5C15 3.34 13.66 2 12 2Z" />
                  <path d="M6 11V12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12V11" strokeLinecap="round" />
                  <path d="M12 18V22" strokeLinecap="round" />
                  <path d="M8 22H16" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <span className="voice-text">{voiceButtonText}</span>
          </button>
        </aside>
      </main>

      {/* Fullscreen overlay — mobile/tablet only (desktop hides via CSS).
          The CTA inside the overlay acts as the "stop + calculate" button
          since the original voice button sits beneath the overlay on mobile. */}
      <VoiceOverlay
        state={voiceState}
        transcript={pendingTranscription}
        onStop={handleVoiceToggle}
      />

      {showConsentModal && <VoiceConsentModal onConsent={handleConsentResponse} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Full-history modal — opened via sidebar's "ver todos →". Clicking
          an entry rehydrates the composer (same behavior as "refazer"). */}
      <HistoryModal
        history={history}
        isOpen={showFullHistory}
        onClose={() => setShowFullHistory(false)}
        onEntryClick={(entry) => {
          handleRetry(entry as HistoryEntry);
          setShowFullHistory(false);
        }}
      />
    </>
  );
}

/** Relative time string matching the mockup's sidebar ("Agora", "2 min atrás", "3h atrás"...). */
function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Agora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const days = Math.floor(hr / 24);
  return `${days}d atrás`;
}

/** Sidebar-friendly dimension label. Short words to fit the compact layout. */
function classifySidebarDim(entry: HistoryEntry): string {
  switch (entry.dimension) {
    case 'area':   return 'Área';
    case 'volume': return 'Volume';
    case 'length': return 'Comprimento';
    case 'scalar': return 'Número';
    default:       return entry.isInchMode ? 'Comprimento' : 'Número';
  }
}
