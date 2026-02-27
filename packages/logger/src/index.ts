export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogTag =
  | 'ENTER' | 'EXIT' | 'HEARTBEAT' | 'WATCHDOG' | 'SESSION'
  | 'SYNC' | 'AI' | 'VOICE' | 'REPORT' | 'ERROR' | 'BOOT' | 'AUTH'
  | 'GPS' | 'DB' | 'UI' | 'NOTIFY'
  | 'PHOTO' | 'EAGLE' | 'INSPECTION' | 'MATERIAL' | 'OPERATOR' | 'STRIPE'
  | 'USECASE' | 'ENGINE' | 'SDK' | 'EFFECT' | 'STORE' | 'RECOVERY' | 'DAY_SUMMARY';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: LogTag;
  message: string;
  data?: Record<string, unknown>;
}

/** Optional callback for external integrations (e.g., Sentry breadcrumbs) */
export type LogSink = (entry: LogEntry) => void;

const MAX_ENTRIES = 200;
const entries: LogEntry[] = [];
const sinks: LogSink[] = [];

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'accessToken', 'refreshToken',
  'access_token', 'refresh_token', 'secret', 'apiKey',
]);

function sanitize(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function log(level: LogLevel, tag: LogTag, message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    data: sanitize(data),
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();

  // Forward to registered sinks
  for (const sink of sinks) {
    try { sink(entry); } catch { /* sinks must not break logging */ }
  }

  // Console output in dev (works in React Native, Node.js, and browsers)
  const isDev =
    (typeof __DEV__ !== 'undefined' && __DEV__) ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');
  if (isDev) {
    const prefix = `[${tag}]`;
    switch (level) {
      case 'error': console.error(prefix, message, data ?? ''); break;
      case 'warn': console.warn(prefix, message, data ?? ''); break;
      default: console.log(prefix, message, data ?? '');
    }
  }
}

export const logger = {
  debug: (tag: LogTag, msg: string, data?: Record<string, unknown>) => log('debug', tag, msg, data),
  info: (tag: LogTag, msg: string, data?: Record<string, unknown>) => log('info', tag, msg, data),
  warn: (tag: LogTag, msg: string, data?: Record<string, unknown>) => log('warn', tag, msg, data),
  error: (tag: LogTag, msg: string, data?: Record<string, unknown>) => log('error', tag, msg, data),

  /** Get all log entries (copy) */
  getEntries: (): LogEntry[] => [...entries],

  /** Clear all entries */
  clear: () => { entries.length = 0; },

  /** Register an external log sink (e.g., Sentry breadcrumbs) */
  addSink: (sink: LogSink) => { sinks.push(sink); },
};

declare const __DEV__: boolean;
