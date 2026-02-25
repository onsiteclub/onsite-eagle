/**
 * @onsite/voice/recorder — Web voice recorder hook
 *
 * Uses the browser MediaRecorder API to capture audio from the microphone.
 * Outputs a WebM Blob on stop.
 *
 * For React Native (Expo), use expo-av directly in the app —
 * the API surface is too different to share meaningfully.
 *
 * Usage:
 *   import { useVoiceRecorder } from '@onsite/voice/recorder'
 *
 *   const { isRecording, startRecording, stopRecording } = useVoiceRecorder({
 *     onRecordingComplete: (blob) => uploadAudio(blob),
 *     onError: (err) => console.error(err),
 *   })
 */

import { useState, useRef, useCallback } from 'react';
import type { VoiceRecorderOptions, VoiceRecorderReturn } from './types';

export function useVoiceRecorder({
  onRecordingComplete,
  onError,
}: VoiceRecorderOptions): VoiceRecorderReturn {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
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

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
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
