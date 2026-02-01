// src/hooks/useVoiceRecorder.ts
// Hook para gravação de áudio - SPEC V7

import { useState, useRef, useCallback } from 'react';
import { logger } from '../lib/logger';

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
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      // Solicita acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
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

    } catch (err) {
      logger.voice.error('Error accessing microphone', { error: String(err) });
      const error = err instanceof Error ? err : new Error('Failed to access microphone');
      onError?.(error);
    }
  }, [onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
