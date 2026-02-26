// src/components/Calculator.tsx
// Componente principal da calculadora

import { useCallback, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useCalculator, useOnlineStatus, useVoiceRecorder, useCalculatorHistory } from '../hooks';
import { logger } from '../lib/logger';
import { getLocalConsentStatus } from '../lib/consent';
import { HistoryModal } from './HistoryModal';
import VoiceConsentModal from './VoiceConsentModal';
import Toast from './Toast';
import AutoFitText from './AutoFitText';
import type { VoiceState, VoiceResponse } from '../types/calculator';

// Teclado de frações
const FRACTION_PAD = [
  ['1/8"', '1/4"', '3/8"', '1/2"'],
  ['5/8"', '3/4"', '7/8"', "'ft"],
];

// Teclado numérico
const KEYPAD = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

// API endpoint - use production URL for native apps, relative path for web
const getApiEndpoint = () => {
  // If explicitly set in env, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // For native apps (Capacitor), use full production URL
  if (Capacitor.isNativePlatform()) {
    return 'https://onsite-calculator.vercel.app/api/interpret';
  }

  return '/api/interpret';
};

const API_ENDPOINT = getApiEndpoint();

interface CalculatorProps {
  voiceState: VoiceState;
  setVoiceState: (state: VoiceState) => void;
  hasVoiceAccess: boolean;
  onVoiceUpgradeClick: () => void;
  onVoiceUsed?: () => void;
}

export default function Calculator({
  voiceState,
  setVoiceState,
  hasVoiceAccess,
  onVoiceUpgradeClick,
  onVoiceUsed,
}: CalculatorProps) {
  const isOnline = useOnlineStatus();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [voiceConsentChecked, setVoiceConsentChecked] = useState(false);
  const [hasVoiceConsent, setHasVoiceConsent] = useState<boolean | null>(null);
  const [hasVoiceTrainingConsent, setHasVoiceTrainingConsent] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const { history, addToHistory } = useCalculatorHistory();

  // Check microphone consent when component mounts
  // microphone_usage is REQUIRED for App Store compliance
  useEffect(() => {
    if (voiceConsentChecked) return;

    const status = getLocalConsentStatus('microphone_usage');
    setHasVoiceConsent(status);
    const trainingStatus = getLocalConsentStatus('voice_training');
    setHasVoiceTrainingConsent(trainingStatus === true);
    setVoiceConsentChecked(true);
    console.log('[Calculator] Microphone consent status:', status, 'Voice training:', trainingStatus);
  }, [voiceConsentChecked]);

  const {
    expression,
    setExpressionAndCompute,
    displayValue,
    lastResult,
    compute,
    clear,
    backspace,
    appendKey,
    appendFraction,
    appendOperator,
    loadResult,
  } = useCalculator();

  // Handler para quando gravação terminar
  const handleAudioUpload = useCallback(async (audioBlob: Blob) => {
    const startTime = Date.now();

    if (audioBlob.size === 0) {
      logger.voice.error('Empty audio blob - recording may have failed', { blobSize: 0 });
      setVoiceState('idle');
      return;
    }

    setVoiceState('processing');

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('voice_training_consent', hasVoiceTrainingConsent ? '1' : '0');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        logger.voice.apiCall(duration, false, {
          status: response.status,
          error: errorText,
        });
        throw new Error(`API Error: ${response.status}`);
      }

      const data: VoiceResponse = await response.json();

      if (data.expression) {
        // Usa setExpressionAndCompute para atualizar expressão E calcular o resultado
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
          addToHistory(result);
        } else {
          // API returned text that isn't a valid calculation
          setToast({ message: 'Could not understand. Try saying a calculation like "5 and a half plus 3".', type: 'info' });
        }
        // Incrementa contador de uso de voz (para trial)
        if (onVoiceUsed) {
          onVoiceUsed();
        }
      } else if (data.error) {
        logger.voice.apiCall(duration, false, {
          status: response.status,
          apiError: data.error,
        });
        setToast({ message: 'Could not understand. Please try again.', type: 'info' });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.voice.error('Voice API timeout after 20s', { duration_ms: duration });
        setToast({ message: 'Voice request timed out. Please try again.', type: 'error' });
      } else {
        logger.voice.error('API request failed', { error: String(error), duration_ms: duration });
        setToast({ message: 'Voice recognition failed. Please try again.', type: 'error' });
      }
    } finally {
      setVoiceState('idle');
    }
  }, [setExpressionAndCompute, setVoiceState, addToHistory]);

  const { startRecording, stopRecording } = useVoiceRecorder({
    onRecordingComplete: handleAudioUpload,
    onError: (error) => {
      logger.voice.error('Recording error', { error: String(error) });
      setVoiceState('idle');
      const isDenied = String(error).toLowerCase().includes('denied') || String(error).toLowerCase().includes('permission');
      setToast({
        message: isDenied
          ? 'Microphone access denied. Check device settings.'
          : 'Could not start recording. Please try again.',
        type: 'error',
      });
    },
  });

  // Handler for consent modal response
  // microphoneGranted: whether user allowed microphone access
  // voiceTrainingGranted: whether user opted in to help improve recognition
  const handleConsentResponse = (microphoneGranted: boolean, voiceTrainingGranted: boolean) => {
    setHasVoiceConsent(microphoneGranted);
    setHasVoiceTrainingConsent(voiceTrainingGranted);
    setShowConsentModal(false);

    // If microphone was granted, start recording automatically
    if (microphoneGranted && voiceState === 'idle') {
      logger.voice.start();
      setVoiceState('recording');
      startRecording();
    }
  };

  // Voice button handler - click to toggle recording
  // 1st click = start recording, 2nd click = stop and process
  const handleVoiceToggle = () => {
    // Block if offline or processing
    if (!isOnline || voiceState === 'processing') return;

    // If no premium access, redirect to checkout
    if (!hasVoiceAccess) {
      onVoiceUpgradeClick();
      return;
    }

    // If user previously declined, re-show consent modal to give another chance
    if (hasVoiceConsent === false) {
      logger.consent.prompted('microphone_usage');
      setShowConsentModal(true);
      return;
    }

    // If consent status is unknown (null), show consent modal BEFORE accessing microphone
    // This is required for App Store compliance - must ask BEFORE getUserMedia()
    if (hasVoiceConsent === null) {
      logger.consent.prompted('microphone_usage');
      setShowConsentModal(true);
      return;
    }

    // Toggle: if idle → start, if recording → stop
    if (voiceState === 'idle') {
      logger.voice.start();
      setVoiceState('recording');
      startRecording();
    } else if (voiceState === 'recording') {
      logger.voice.stop();
      stopRecording();
    }
  };

  // Keypad handler
  const handleKeyClick = (key: string) => {
    switch (key) {
      case '=': {
        const result = compute({ inputMethod: 'keypad' });
        if (result) {
          addToHistory(result);
        }
        break;
      }
      case 'C':
        clear();
        break;
      case '⌫':
        backspace();
        break;
      case '÷':
        appendOperator('/');
        break;
      case '×':
        appendOperator('*');
        break;
      case '+':
      case '-':
        appendOperator(key);
        break;
      case '%':
        appendOperator('%');
        break;
      default:
        appendKey(key);
    }
  };

  // Fraction handler
  const handleFractionClick = (frac: string) => {
    if (frac === "'ft") {
      appendKey("' ");
    } else {
      appendFraction(frac);
    }
  };

  // Texto do botão de voz baseado no estado
  const getVoiceButtonText = () => {
    if (!isOnline) return 'Offline';
    if (voiceState === 'recording') return 'Tap to Stop';
    if (voiceState === 'processing') return 'Processing...';
    return 'Tap to Speak';
  };

  // Classes CSS do botão
  const getVoiceButtonClass = () => {
    const classes = ['voice-btn'];
    if (voiceState === 'recording') classes.push('listening');
    if (voiceState === 'processing') classes.push('processing');
    if (!hasVoiceAccess) classes.push('locked');
    return classes.join(' ');
  };

  // Handler para quando clicar em entrada do histórico
  const handleHistoryEntryClick = (entry: any) => {
    // Converte HistoryEntry para CalculationResult
    const result = {
      expression: entry.expression,
      resultDecimal: entry.resultDecimal,
      resultFeetInches: entry.resultFeetInches,
      resultTotalInches: entry.resultTotalInches,
      isInchMode: entry.isInchMode,
    };

    // Carrega o resultado na calculadora
    loadResult(result);

    console.log('[Calculator] Loaded result from history:', entry.expression);
  };

  return (
    <>
      <main className="main">
        {/* Left Card: Display & Voice */}
        <div className="card left-card">
          <div className="display-section">
            <div className="display-row">
              {/* Display ESQUERDO */}
              <div className="display-box equal">
                <AutoFitText className={`display-value ${voiceState}`}>
                  {lastResult?.isInchMode
                    ? lastResult.resultFeetInches  // Modo inches: mostra feet/inches (ex: "1' 6 1/2"")
                    : displayValue                 // Modo decimal: mostra resultado decimal (ex: "887.3")
                  }
                </AutoFitText>
              </div>
              {/* Display DIREITO */}
              <div className="display-box equal">
                <AutoFitText className={`display-value ${voiceState}`}>
                  {lastResult?.isInchMode
                    ? lastResult.resultTotalInches // Modo inches: mostra total inches (ex: "18 1/2 In")
                    : '—'                          // Modo decimal: mostra traço (não aplicável)
                  }
                </AutoFitText>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Expression display com botão M */}
          <div className="expression-wrapper">
            <div className="expression-input">
              <AutoFitText className={`expression-text ${!expression ? 'placeholder' : ''}`} maxFontSize={18} minFontSize={10}>
                {expression || 'Type or speak: 5 1/2 + 3 1/4 - 2'}
              </AutoFitText>
            </div>
            <button
              className="history-btn"
              onClick={() => setShowHistoryModal(true)}
              title="Histórico"
            >
              M
            </button>
          </div>

          <button
            className={getVoiceButtonClass()}
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
            <span className="voice-text">{getVoiceButtonText()}</span>
          </button>
        </div>

        {/* Right Card: Keypad & Fractions */}
        <div className="card right-card">
          <div className="fraction-container">
            <div className="fraction-pad">
              {FRACTION_PAD.flat().map((frac, i) => (
                <button
                  key={i}
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
                    className={`key ${key === '=' ? 'equals' : ''} ${key === 'C' || key === '⌫' ? 'danger' : ''} ${'÷×-+%'.includes(key) ? 'operator' : ''}`}
                    onClick={() => handleKeyClick(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal de Histórico */}
      <HistoryModal
        history={history}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onEntryClick={handleHistoryEntryClick}
      />

      {/* Voice Consent Modal - shown BEFORE accessing microphone (App Store compliance) */}
      {showConsentModal && (
        <VoiceConsentModal
          onConsent={handleConsentResponse}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
