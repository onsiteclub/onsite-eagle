// src/hooks/useSpeechRecognition.ts
// Phase 3.3 — thin wrapper over the browser's Web Speech API.
//
// Purpose: show LIVE transcript in the ghost card while the user is speaking.
// The authoritative transcription still comes from Whisper (via useVoiceRecorder
// + /api/interpret) — Web Speech is a UX preview, not a replacement.
//
// Availability:
//   Chrome/Edge/Android WebView: prefixed `webkitSpeechRecognition` available.
//   Safari/iOS WebKit:            available from iOS 14.5+.
//   Firefox:                      not available. `isSupported === false`.
// On unsupported browsers the hook returns `isSupported: false` and no-ops;
// callers should skip the live preview and rely on Whisper alone.

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger as pkgLogger } from '@onsite/logger';

// Minimal shape of the Web Speech API — typed inline because `lib.dom` ships
// types for `SpeechRecognition` but not for the `webkit` prefix or the
// cross-browser union that works today.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) ?? null;
}

interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag. Defaults to browser autodetect-ish via ''. */
  lang?: string;
  /** Called when the engine produces a new interim transcript (live UX). */
  onInterim?: (text: string) => void;
  /** Called when the engine commits the final transcript (end of utterance). */
  onFinal?: (text: string) => void;
  /** Called on engine error (e.g. 'no-speech', 'not-allowed', 'network'). */
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  lang = '',
  onInterim,
  onFinal,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);

  // Keep latest callbacks in refs so the SpeechRecognition instance — created
  // once per mount — can dispatch the newest handler without being re-created.
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Lazily build the recognition instance on first `start()`. Creating at mount
  // prematurely asks for microphone access on browsers that gate the ctor.
  const ensureInstance = useCallback((): SpeechRecognitionLike | null => {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;

    const rec = new Ctor();
    rec.continuous = false;   // Stop on silence — a construction calc request is one utterance.
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    if (lang) rec.lang = lang;

    rec.onstart = () => {
      setIsListening(true);
      setInterim('');
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event) => {
      pkgLogger.debug('VOICE', 'SpeechRecognition error', { error: event.error });
      setIsListening(false);
      onErrorRef.current?.(event.error);
    };

    rec.onresult = (event) => {
      // Accumulate interim + final transcripts from the in-flight event.
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        setInterim(interimText);
        onInterimRef.current?.(interimText);
      }
      if (finalText) {
        setInterim(finalText);
        onFinalRef.current?.(finalText);
      }
    };

    recognitionRef.current = rec;
    return rec;
  }, [lang]);

  const start = useCallback(() => {
    const rec = ensureInstance();
    if (!rec) return;
    try {
      // start() throws InvalidStateError if already running — swallow to keep
      // caller code simple (taps during listening re-call start()).
      rec.start();
    } catch (err) {
      pkgLogger.debug('VOICE', 'SpeechRecognition start() threw (already running?)', { error: String(err) });
    }
  }, [ensureInstance]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  // Cleanup on unmount — avoid dangling recognition sessions holding the mic.
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try { rec.abort(); } catch { /* noop */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isSupported, isListening, interim, start, stop };
}
