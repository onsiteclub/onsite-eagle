import { createClient } from '@onsite/supabase/client'
import { GATE_CHECK_TRANSITIONS, getTemplateItems } from '@onsite/framing'
import type { GateCheckTransition } from '@onsite/framing'
import { isSQLiteAvailable } from '@/lib/db/client'
import { templateAgeMs, upsertTemplate } from '@/lib/db/repositories/templates'

const TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Fetch the server-side gate check templates for every known transition
 * and cache them in the local SQLite store. Safe to call on app startup
 * and after login — duplicates are deduped by `upsertTemplate`.
 *
 * No-op on web (no SQLite); no-op on native when cache is still fresh.
 * Errors are swallowed so network failures don't block the UI.
 */
export async function preflightTemplates(): Promise<void> {
  if (!isSQLiteAvailable()) return

  const supabase = createClient()

  await Promise.all(
    GATE_CHECK_TRANSITIONS.map(async (transition) => {
      try {
        const age = await templateAgeMs(transition)
        if (age !== null && age < TTL_MS) return

        const items = await getTemplateItems(supabase, transition as GateCheckTransition)
        if (items.length === 0) return

        await upsertTemplate(
          transition,
          items.map((r) => ({
            itemCode: r.item_code,
            itemLabel: r.item_label,
            sortOrder: r.sort_order,
            isBlocking: r.is_blocking,
          })),
        )
      } catch (err) {
        console.warn(`[preflight] template ${transition} failed:`, err)
      }
    }),
  )
}
