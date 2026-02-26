// src/hooks/useVoiceRecorder.ts
// Hook para gravação de áudio - SPEC V7

import { useState, useRef, useCallback } from 'react';
import { logger } from '../lib/logger';

const MAX_RECORDING_MS = 30000;

interface UseVoiceRecorderOptions {
  onRecordingComplete: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

/**
 * Hook para gravar áudio do microfone
 * Baseado no Gold Calculator spec V7
 */
export function useVoiceRecorder({
  onRecordingComplete,
  onError,
}: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      // Solicita acesso ao microfone com constraints otimizados para voz
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000 },
          channelCount: { ideal: 1 },
        },
      });
      streamRef.current = stream;

      // Prefere opus codec (melhor qualidade para voz / Whisper)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: recorder.mimeType || 'audio/webm' });
        onRecordingComplete(audioBlob);

        // Limpa o stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Auto-stop after MAX_RECORDING_MS
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
          logger.voice.error('Auto-stopped recording after max duration', { max_ms: MAX_RECORDING_MS });
          mediaRecorder.current.stop();
          setIsRecording(false);
        }
      }, MAX_RECORDING_MS);

    } catch (err) {
      logger.voice.error('Error accessing microphone', { error: String(err) });
      const error = err instanceof Error ? err : new Error('Failed to access microphone');
      onError?.(error);
    }
  }, [onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
