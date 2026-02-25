import type { AIRequest, AIResponse } from './types';

const FALLBACK_RESPONSE: AIResponse = {
  action: 'error',
  data: {},
  response_text: 'AI unavailable',
};

/**
 * Call the AI gateway Edge Function with a specialist request.
 * Always non-blocking — returns fallback on any error.
 */
export async function callAI(
  request: AIRequest,
  supabaseClient: { functions: { invoke: (name: string, options: { body: unknown }) => Promise<{ data: unknown; error: unknown }> } },
): Promise<AIResponse> {
  try {
    const { data, error } = await supabaseClient.functions.invoke('ai-gateway', {
      body: request,
    });

    if (error || !data || (data as Record<string, unknown>).fallback) {
      return FALLBACK_RESPONSE;
    }

    return data as AIResponse;
  } catch (err) {
    console.warn('[AI] Call failed:', err);
    return FALLBACK_RESPONSE;
  }
}
