import { execute, query } from '../client'
import { now } from '../id'
import type { TemplateRow } from '../schema'

export async function upsertTemplate(
  transition: string,
  items: Array<{ itemCode: string; itemLabel: string; sortOrder: number; isBlocking: boolean }>,
): Promise<void> {
  const ts = now()
  await execute(`DELETE FROM templates WHERE transition = ?`, [transition])
  for (const item of items) {
    await execute(
      `INSERT INTO templates (
         transition, item_code, item_label, sort_order, is_blocking, fetched_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [transition, item.itemCode, item.itemLabel, item.sortOrder, item.isBlocking ? 1 : 0, ts],
    )
  }
}

export async function findTemplate(transition: string): Promise<TemplateRow[]> {
  return query<TemplateRow>(
    `SELECT * FROM templates WHERE transition = ? ORDER BY sort_order ASC`,
    [transition],
  )
}

export async function templateAgeMs(transition: string): Promise<number | null> {
  const rows = await query<{ fetched_at: number }>(
    `SELECT fetched_at FROM templates WHERE transition = ? LIMIT 1`,
    [transition],
  )
  if (!rows.length) return null
  return now() - rows[0].fetched_at
}
