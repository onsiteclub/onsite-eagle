/**
 * Helper to call Monitor API endpoints (AI features).
 *
 * Monitor runs on Vercel and exposes API routes for AI operations.
 * Inspect calls these endpoints instead of duplicating server logic.
 */

const MONITOR_API_URL = process.env.EXPO_PUBLIC_MONITOR_API_URL || 'https://monitor.onsiteclub.ca';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

export async function monitorApi<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${MONITOR_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Monitor API ${path}: ${response.status} - ${error}`);
  }

  return response.json();
}
