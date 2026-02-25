/**
 * @onsite/offline — Lightweight AsyncStorage-based offline queue.
 *
 * Stores pending writes (INSERT/UPDATE/DELETE) and flushes them
 * when the device comes back online.
 *
 * Design: Simple, no SQLite dependency. Good for < 200 queued items.
 * For heavier loads (Timekeeper entries), apps use their own SQLite sync.
 */

// We use dynamic import patterns so the package can be typechecked
// without requiring AsyncStorage at compile time.
type AsyncStorageStatic = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export interface QueueItem {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  /** For UPDATE/DELETE: the column to match (default 'id') */
  match_column?: string;
  /** For UPDATE/DELETE: the value to match */
  match_value?: string;
  created_at: string;
  retries: number;
  last_error?: string;
}

export interface FlushResult {
  flushed: number;
  failed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
}

/** Minimal Supabase client interface for flushing */
interface SupabaseFlushClient {
  from: (table: string) => {
    insert: (data: unknown) => { select: () => Promise<{ error: { message: string } | null }> };
    update: (data: unknown) => { eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }> };
    delete: () => { eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }> };
  };
}

const QUEUE_STORAGE_KEY = '@onsite/offline_queue';
const MAX_RETRIES = 5;

let _storage: AsyncStorageStatic | null = null;

/**
 * Initialize the queue with an AsyncStorage implementation.
 * Must be called once before using enqueue/flush.
 */
export function initQueue(storage: AsyncStorageStatic): void {
  _storage = storage;
}

function getStorage(): AsyncStorageStatic {
  if (!_storage) {
    throw new Error(
      '@onsite/offline: queue not initialized. Call initQueue(AsyncStorage) first.',
    );
  }
  return _storage;
}

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Read/Write Queue ─────────────────────────────────────────

async function readQueue(): Promise<QueueItem[]> {
  const raw = await getStorage().getItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  await getStorage().setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Add a write operation to the offline queue.
 */
export async function enqueue(
  item: Omit<QueueItem, 'id' | 'created_at' | 'retries'>,
): Promise<string> {
  const queue = await readQueue();
  const id = generateId();
  queue.push({
    ...item,
    id,
    created_at: new Date().toISOString(),
    retries: 0,
  });
  await writeQueue(queue);
  return id;
}

/**
 * Flush all pending items by executing them against Supabase.
 * Items that succeed are removed. Items that fail get retries incremented.
 * Items exceeding MAX_RETRIES are discarded.
 */
export async function flush(supabase: SupabaseFlushClient): Promise<FlushResult> {
  const queue = await readQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0, remaining: 0, errors: [] };

  const remaining: QueueItem[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await executeItem(supabase, item);
      flushed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      item.retries++;
      item.last_error = errMsg;

      if (item.retries >= MAX_RETRIES) {
        // Discard after max retries
        failed++;
        errors.push({ id: item.id, error: `Max retries exceeded: ${errMsg}` });
      } else {
        remaining.push(item);
        errors.push({ id: item.id, error: errMsg });
      }
    }
  }

  await writeQueue(remaining);
  return { flushed, failed, remaining: remaining.length, errors };
}

/**
 * Get current queue size without reading full data.
 */
export async function getQueueSize(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Clear the entire queue (for logout/reset).
 */
export async function clearQueue(): Promise<void> {
  await getStorage().removeItem(QUEUE_STORAGE_KEY);
}

/**
 * Get all pending items (for UI display).
 */
export async function getQueueItems(): Promise<QueueItem[]> {
  return readQueue();
}

// ─── Execute Single Item ──────────────────────────────────────

async function executeItem(
  supabase: SupabaseFlushClient,
  item: QueueItem,
): Promise<void> {
  const table = supabase.from(item.table);

  switch (item.operation) {
    case 'INSERT': {
      const { error } = await table.insert(item.data).select();
      if (error) throw new Error(error.message);
      break;
    }
    case 'UPDATE': {
      const col = item.match_column || 'id';
      const val = item.match_value || (item.data as Record<string, unknown>)[col];
      const { error } = await table.update(item.data).eq(col, val);
      if (error) throw new Error(error.message);
      break;
    }
    case 'DELETE': {
      const col = item.match_column || 'id';
      const val = item.match_value;
      if (!val) throw new Error('DELETE requires match_value');
      const { error } = await table.delete().eq(col, val);
      if (error) throw new Error(error.message);
      break;
    }
    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }
}
