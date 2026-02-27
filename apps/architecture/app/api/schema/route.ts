import { NextResponse } from 'next/server';
import { supabase, isStaticMode } from '../../../lib/supabase';

// In-memory cache (5 min TTL)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchLiveSchema() {
  // Get tables with column counts
  const { data: tables, error: tablesErr } = await supabase.rpc('get_schema_tables').select('*');

  // If RPC doesn't exist, fallback to raw SQL
  if (tablesErr) {
    const { data: rawTables, error: rawErr } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (rawErr) throw rawErr;
    return { tables: rawTables || [], policies: [], source: 'fallback_query' };
  }

  return { tables, policies: [], source: 'rpc' };
}

export async function GET() {
  try {
    // Return cache if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({ source: 'cache', ...cache.data as object });
    }

    if (isStaticMode) {
      return NextResponse.json({ source: 'static', tables: [], policies: [], message: 'Supabase not configured' });
    }

    // Try live query — using execute_sql pattern for introspection
    const { data: tableData, error: tableErr } = await supabase.rpc('execute_sql' as any, {
      query: `
        SELECT t.table_name,
               COUNT(c.column_name)::int as col_count,
               COALESCE(pg_stat.n_live_tup, 0)::int as row_estimate
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c
          ON c.table_name = t.table_name AND c.table_schema = 'public'
        LEFT JOIN pg_stat_user_tables pg_stat
          ON pg_stat.relname = t.table_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name, pg_stat.n_live_tup
        ORDER BY t.table_name
      `
    });

    const { data: policyData, error: policyErr } = await supabase.rpc('execute_sql' as any, {
      query: `
        SELECT tablename, policyname, cmd, qual::text
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `
    });

    // Group tables by prefix
    const tables = (tableData || []) as Array<{ table_name: string; col_count: number; row_estimate: number }>;
    const policies = (policyData || []) as Array<{ tablename: string; policyname: string; cmd: string; qual: string }>;

    const prefixMap = new Map<string, typeof tables>();
    for (const t of tables) {
      const parts = t.table_name.split('_');
      const prefix = parts.length > 1 ? parts[0] + '_' : 'other_';
      if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
      prefixMap.get(prefix)!.push(t);
    }

    const policyCountMap = new Map<string, number>();
    for (const p of policies) {
      policyCountMap.set(p.tablename, (policyCountMap.get(p.tablename) || 0) + 1);
    }

    const groups = [...prefixMap.entries()].map(([prefix, tbls]) => ({
      prefix,
      tables: tbls,
      policyCount: tbls.reduce((s, t) => s + (policyCountMap.get(t.table_name) || 0), 0),
    })).sort((a, b) => b.tables.length - a.tables.length);

    const result = {
      groups,
      totalTables: tables.length,
      totalPolicies: policies.length,
      policies,
    };

    cache = { data: result, ts: Date.now() };
    return NextResponse.json({ source: 'live', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ source: 'error', error: message, groups: [], totalTables: 0, totalPolicies: 0, policies: [] }, { status: 500 });
  }
}
