import type { WhisperResult } from './types';

/**
 * Transcribe audio via the ai-whisper Edge Function (mobile).
 * Accepts base64-encoded audio.
 */
export async function transcribeAudio(
  base64Audio: string,
  supabaseClient: { functions: { invoke: (name: string, options: { body: unknown }) => Promise<{ data: unknown; error: unknown }> } },
): Promise<WhisperResult | null> {
  try {
    const { data, error } = await supabaseClient.functions.invoke('ai-whisper', {
      body: { audio: base64Audio, format: 'm4a' },
    });

    if (error || !data) {
      console.warn('[Whisper] Transcription failed:', error);
      return null;
    }

    return data as WhisperResult;
  } catch (err) {
    console.warn('[Whisper] Transcription error:', err);
    return null;
  }
}
