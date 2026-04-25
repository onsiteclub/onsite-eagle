// src/components/ConversationalCalculator.tsx
// v3 visor-driven Calculator tab.
//
// Responsibilities (post-spec):
//   - Render a single <Visor/> showing the latest CalculationResult.
//   - Composer input (text field + on-screen keypad + fraction pad + voice).
//   - Voice pipeline (record → /api/interpret → engine), kept intact.
//   - Tab routing for stairs/triangle/converter intents.
//   - History persistence: every successful compute is appended; the modal
//     is opened by the HamburgerMenu via a `calc:open-history` window event,
//     and tapping an entry rehydrates the composer.
//
// Removed (per spec):
//   - Stacked card feed in the body
//   - Desktop sidebar with compact recent-history
//   - Pills (manual / dim labels) and per-card buttons (copy / edit / retry)
//   - Empty-state discovery chips (the visor empty state covers this)

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useCalculator, useOnlineStatus, useVoiceRecorder, useCalculatorHistory } from '../hooks';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { logger } from '../lib/logger';
import { logger as pkgLogger } from '@onsite/logger';
import { getLocalConsentStatus } from '../lib/consent';
import { supabase } from '../lib/supabase';
import { parseExpression } from '../parser';
import VoiceConsentModal from './VoiceConsentModal';
import Toast from './Toast';
import { HistoryModal } from './HistoryModal';
import VoiceOverlay from './VoiceOverlay';
import Visor from './Visor';
import type { HistoryEntry, VoiceState, VoiceResponse, RoutedIntent } from '../types/calculator';
import type { TabType } from './TabNavigation';

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

/** Window event the HamburgerMenu dispatches to open the history modal.
 *  Decoupled because the menu lives outside this component's tree. */
const OPEN_HISTORY_EVENT = 'calc:open-history';

interface ConversationalCalculatorProps {
  voiceState: VoiceState;
  setVoiceState: (state: VoiceState) => void;
  hasVoiceAccess: boolean;
  userId?: string | null;
  onVoiceUpgradeClick: () => void;
  onVoiceUsed?: () => void;
  onIntentRouted?: (tab: TabType, intent?: RoutedIntent) => void;
  onAltInterpretation?: (tab: TabType) => void;
}

function tabForIntent(intent: string | undefined): TabType | null {
  switch (intent) {
    case 'stairs':     return 'stairs';
    case 'triangle':   return 'triangle';
    case 'conversion': return 'converter';
    default: return null;
  }
}

export default function ConversationalCalculator({
  voiceState,
  setVoiceState,
  hasVoiceAccess,
  userId,
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
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [pendingTranscription, setPendingTranscription] = useState<string | null>(null);

  const { history, addToHistory, clearHistory } = useCalculatorHistory();
  const {
    expression,
    setExpression,
    setExpressionAndCompute,
    lastResult,
    clear,
    backspace,
    appendKey,
    appendFraction,
    appendOperator,
  } = useCalculator();

  // Open history when the HamburgerMenu fires the event.
  useEffect(() => {
    const handler = () => setShowFullHistory(true);
    window.addEventListener(OPEN_HISTORY_EVENT, handler);
    return () => window.removeEventListener(OPEN_HISTORY_EVENT, handler);
  }, []);

  // Microphone consent check on mount.
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
    setPendingTranscription('…');

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

      if (onIntentRouted) {
        const targetTab = tabForIntent(data.intent);
        if (targetTab) {
          onIntentRouted(targetTab, {
            expression: data.expression,
            parameters: data.parameters,
            transcription: hasVoiceTrainingConsent ? data.expression : undefined,
          });
          setVoiceState('idle');
          setPendingTranscription(null);
          return;
        }
      }

      if (data.expression) {
        const result = setExpressionAndCompute(data.expression, {
          inputMethod: 'voice',
          voiceLogId: data.voice_log_id,
          userId: userId ?? undefined,
        });
        logger.voice.apiCall(duration, true, {
          status: response.status,
          expression: data.expression,
          result: result?.primary.value,
        });
        if (result && !result.isError) {
          addToHistory(result, {
            inputMethod: 'voice',
            transcription: hasVoiceTrainingConsent ? data.expression : undefined,
            voiceLogId: data.voice_log_id,
          });
          setExpression('');
        } else {
          setToast({
            message: result?.errorMessage ?? 'Could not calculate.',
            type: 'info',
          });
        }
        onVoiceUsed?.();
      } else if (data.error) {
        logger.voice.apiCall(duration, false, { status: response.status, apiError: data.error });
        setToast({ message: 'Could not understand. Try again.', type: 'info' });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.voice.error('Voice API timeout after 20s', { duration_ms: duration });
        setToast({ message: 'Timed out. Please try again.', type: 'error' });
      } else {
        logger.voice.error('API request failed', { error: String(error), duration_ms: duration });
        setToast({ message: 'Voice recognition failed.', type: 'error' });
      }
    } finally {
      setVoiceState('idle');
      setPendingTranscription(null);
    }
  }, [setExpressionAndCompute, setExpression, setVoiceState, addToHistory, hasVoiceTrainingConsent, onVoiceUsed, userId, onIntentRouted]);

  const { startRecording, stopRecording } = useVoiceRecorder({
    onRecordingComplete: handleAudioUpload,
    onError: (error) => {
      logger.voice.error('Recording error', { error: String(error) });
      setVoiceState('idle');
      setPendingTranscription(null);
      const isDenied = /denied|permission/i.test(String(error));
      setToast({
        message: isDenied
          ? 'Microphone denied. Check device permissions.'
          : 'Could not start recording.',
        type: 'error',
      });
    },
  });

  const speech = useSpeechRecognition({
    onInterim: (text) => setPendingTranscription(text),
    onFinal: (text) => setPendingTranscription(text),
    onError: (error) => {
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
      if (speech.isSupported) speech.start();
    } else if (voiceState === 'recording') {
      logger.voice.stop();
      stopRecording();
      if (speech.isSupported) speech.stop();
    }
  };

  /** Commit current expression — runs through the parser when the input
   *  contains words ("dez pés mais três polegadas"), otherwise straight to
   *  the engine. */
  const handleCommit = useCallback(() => {
    const raw = expression.trim();
    if (!raw) return;

    const hasWords = /[a-zA-ZÀ-ÿ]{2,}/.test(raw);
    let exprToCompute = raw;
    if (hasWords) {
      const parsed = parseExpression(raw);
      if (!parsed.ok) {
        const msg = parsed.suggestion ? `${parsed.reason} ${parsed.suggestion}` : parsed.reason;
        setToast({ message: msg, type: 'info' });
        return;
      }
      exprToCompute = parsed.expression;
    }

    const result = setExpressionAndCompute(exprToCompute, {
      inputMethod: 'keypad',
      userId: userId ?? undefined,
    });
    if (result && !result.isError) {
      addToHistory(result, { inputMethod: 'manual' });
      setExpression('');
    }
    // On error: keep the input intact so the user can fix it. The Visor
    // already shows "Erro" + errorMessage from `result`.
  }, [expression, setExpressionAndCompute, addToHistory, setExpression, userId]);

  const handleKeyClick = (key: string) => {
    switch (key) {
      case '=': return handleCommit();
      case 'C': return clear();
      case '⌫': return backspace();
      case '÷': return appendOperator('/');
      case '×': return appendOperator('*');
      case '+':
      case '-': return appendOperator(key);
      case '%': return appendOperator('%');
      default:  return appendKey(key);
    }
  };

  const handleFractionClick = (frac: string) => {
    if (frac === "'ft") return appendKey("' ");
    appendFraction(frac);
  };

  /** Tap a history entry → rehydrate composer with its expression. */
  const handleHistoryEntryClick = useCallback((entry: HistoryEntry) => {
    setExpression(entry.expression);
  }, [setExpression]);

  const handleClearHistory = useCallback(() => {
    if (history.length === 0) return;
    if (!window.confirm(`Clear ${history.length} calculation(s) from history?`)) return;
    void clearHistory();
  }, [history.length, clearHistory]);

  const voiceButtonText = !isOnline
    ? 'Offline'
    : voiceState === 'recording'
    ? 'Tap to stop'
    : voiceState === 'processing'
    ? 'Processing…'
    : hasVoiceAccess
    ? 'Tap to speak'
    : 'Voice — sign in';

  const voiceButtonClass = [
    'voice-btn',
    voiceState === 'recording' && 'listening',
    voiceState === 'processing' && 'processing',
    !hasVoiceAccess && 'locked',
  ].filter(Boolean).join(' ');

  return (
    <>
      <main className="conv-main">
        {/* =================================================================
            FOCUS — single visor + composer. Same column on mobile/desktop.
            ================================================================= */}
        <section className="conv-focus">
          <Visor
            result={lastResult}
            onCopied={() => setToast({ message: 'Result copied.', type: 'success' })}
          />

          {/* Live transcription preview — only while voice pipeline is active. */}
          {voiceState !== 'idle' && pendingTranscription && pendingTranscription !== '…' && (
            <p className="conv-transcript-preview">
              {voiceState === 'recording' ? 'You:' : 'Heard:'} “{pendingTranscription}”
            </p>
          )}

          {/* Composer — text input wired to the engine via handleCommit on Enter. */}
          <div className="conv-composer-input">
            <div className="expression-wrapper">
              <div className="expression-input">
                <span className="conv-composer-input__dot" aria-hidden="true" />
                <input
                  type="text"
                  className="expression-text expression-text--input"
                  value={expression}
                  placeholder='5 1/2 + 3 1/4  ·  ten feet plus three inches'
                  onChange={(e) => setExpression(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCommit();
                    }
                  }}
                  aria-label="Expression"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <span className="conv-composer-input__hint" aria-hidden="true">↵</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            CONTROLS — fraction pad + keypad + voice button.
            ================================================================= */}
        <aside className="conv-controls" aria-label="Keypad">
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

      <VoiceOverlay
        state={voiceState}
        transcript={pendingTranscription}
        onStop={handleVoiceToggle}
      />

      {showConsentModal && <VoiceConsentModal onConsent={handleConsentResponse} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Full history modal — opened by HamburgerMenu via window event. */}
      <HistoryModal
        history={history}
        isOpen={showFullHistory}
        onClose={() => setShowFullHistory(false)}
        onEntryClick={(entry) => {
          handleHistoryEntryClick(entry);
          setShowFullHistory(false);
        }}
        onClearAll={handleClearHistory}
      />
    </>
  );
}
