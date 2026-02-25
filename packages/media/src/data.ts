/**
 * @onsite/media — Data layer for documents and plans.
 *
 * Pure functions receiving supabase client (adapter pattern).
 * Queries egl_documents and egl_document_links tables.
 */

import type { Document, ConstructionPlan } from './types';

// ─── Minimal Supabase client type ───────────────────────────

type SupabaseClient = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (col: string, val: unknown) => unknown;
      is: (col: string, val: unknown) => unknown;
      in: (col: string, vals: unknown[]) => unknown;
      order: (col: string, opts?: { ascending?: boolean }) => unknown;
    };
  };
};

// ─── Fetch Options ──────────────────────────────────────────

export interface FetchDocumentsOptions {
  site_id: string;
  house_id?: string;
  category?: string;
}

export interface FetchPlansOptions {
  site_id: string;
  house_id?: string;
}

// ─── Result type ────────────────────────────────────────────

interface QueryResult<T> {
  data: T[];
  error: string | null;
}

// ─── Helpers ────────────────────────────────────────────────

function mapRowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    site_id: (row.site_id as string) || null,
    house_id: (row.house_id as string) || null,
    name: (row.name as string) || '',
    description: (row.description as string) || null,
    file_url: row.file_url as string,
    file_type: (row.file_type as string) || 'unknown',
    file_size: (row.file_size as number) || null,
    category: (row.category as string as Document['category']) || 'reports',
    uploaded_by: (row.uploaded_by as string) || null,
    created_at: row.created_at as string,
  };
}

function mapRowToPlan(row: Record<string, unknown>): ConstructionPlan {
  return {
    id: row.id as string,
    site_id: (row.site_id as string) || '',
    house_id: (row.house_id as string) || null,
    name: (row.name as string) || '',
    file_url: row.file_url as string,
    file_type: (row.file_type as string as ConstructionPlan['file_type']) || 'pdf',
    phase_id: (row.phase_id as string) || null,
    distributed_at: (row.distributed_at as string) || null,
    distributed_to: (row.distributed_to as string[]) || [],
    created_at: row.created_at as string,
  };
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Fetch documents from egl_documents.
 * Optionally filter by site_id, house_id, and/or category.
 */
export async function fetchDocuments(
  supabase: SupabaseClient,
  options: FetchDocumentsOptions,
): Promise<QueryResult<Document>> {
  try {
    let query = supabase
      .from('egl_documents')
      .select('*')
      .eq('site_id', options.site_id) as unknown as {
        eq: (col: string, val: unknown) => unknown;
        is: (col: string, val: unknown) => unknown;
        order: (col: string, opts?: { ascending?: boolean }) => unknown;
      };

    if (options.house_id) {
      query = query.eq('house_id', options.house_id) as typeof query;
    }

    if (options.category) {
      query = query.eq('category', options.category) as typeof query;
    }

    query = query.is('deleted_at', null) as typeof query;

    const result = await (query.order('created_at', { ascending: false }) as
      Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>);

    if (result.error) {
      return { data: [], error: result.error.message };
    }

    return {
      data: (result.data || []).map(mapRowToDocument),
      error: null,
    };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

/**
 * Fetch construction plans (documents with category 'plan' or 'blueprint').
 * For workers: shows plans assigned to their site/house.
 */
export async function fetchPlans(
  supabase: SupabaseClient,
  options: FetchPlansOptions,
): Promise<QueryResult<ConstructionPlan>> {
  try {
    let query = supabase
      .from('egl_documents')
      .select('*')
      .eq('site_id', options.site_id) as unknown as {
        eq: (col: string, val: unknown) => unknown;
        is: (col: string, val: unknown) => unknown;
        in: (col: string, vals: unknown[]) => unknown;
        order: (col: string, opts?: { ascending?: boolean }) => unknown;
      };

    if (options.house_id) {
      query = query.eq('house_id', options.house_id) as typeof query;
    }

    query = query.in('category', ['plan', 'blueprint']) as typeof query;
    query = query.is('deleted_at', null) as typeof query;

    const result = await (query.order('created_at', { ascending: false }) as
      Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>);

    if (result.error) {
      return { data: [], error: result.error.message };
    }

    return {
      data: (result.data || []).map(mapRowToPlan),
      error: null,
    };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

/**
 * Fetch plans linked to a specific house via egl_document_links.
 * Complements fetchPlans for houses that have plans linked via bulk upload.
 */
export async function fetchLinkedPlans(
  supabase: SupabaseClient,
  houseId: string,
): Promise<QueryResult<ConstructionPlan>> {
  try {
    const result = await (supabase
      .from('v_house_documents')
      .select('*')
      .eq('house_id', houseId) as unknown as
      Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>);

    if (result.error) {
      return { data: [], error: result.error.message };
    }

    return {
      data: (result.data || []).map((row) => ({
        id: row.document_id as string,
        site_id: '',
        house_id: houseId,
        name: (row.file_name as string) || '',
        file_url: row.file_url as string,
        file_type: (row.file_type as string as ConstructionPlan['file_type']) || 'pdf',
        phase_id: null,
        distributed_at: null,
        distributed_to: [],
        created_at: row.uploaded_at as string,
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}
