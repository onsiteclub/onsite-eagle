import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { HealthFinding } from '../../../lib/types';

const VALID_PREFIXES = [
  'core_', 'egl_', 'tmk_', 'ccl_', 'bil_', 'shp_', 'club_',
  'crd_', 'sht_', 'ref_', 'log_', 'agg_', 'int_', 'v_',
];

function readJson(filename: string): unknown {
  const dataPath = path.join(process.cwd(), 'data', filename);
  if (!fs.existsSync(dataPath)) return null;
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function checkOrphans(deps: any): HealthFinding[] {
  if (!deps?.orphans?.length) return [];
  return deps.orphans.map((pkg: string) => ({
    severity: 'warning' as const,
    category: 'orphan' as const,
    title: `Package \u00f3rf\u00e3o: @onsite/${pkg}`,
    description: `Nenhum app importa @onsite/${pkg}. Pode estar obsoleto ou esquecido.`,
    suggestion: `Verificar se o package deveria ser usado por algum app ou se pode ser removido.`,
    package: pkg,
  }));
}

function checkDocFreshness(docs: any[]): HealthFinding[] {
  if (!docs?.length) return [];
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const findings: HealthFinding[] = [];

  for (const doc of docs) {
    if (doc.category === 'memory') continue; // skip auto-memory
    const age = now - new Date(doc.modifiedAt).getTime();
    if (age > THIRTY_DAYS) {
      const days = Math.floor(age / (24 * 60 * 60 * 1000));
      findings.push({
        severity: days > 90 ? 'warning' : 'info',
        category: 'docs',
        title: `Doc desatualizado: ${doc.relativePath}`,
        description: `\u00daltima modifica\u00e7\u00e3o h\u00e1 ${days} dias. Pode conter informa\u00e7\u00f5es obsoletas.`,
        suggestion: `Revisar e atualizar se necess\u00e1rio.`,
        doc: doc.relativePath,
      });
    }
  }

  return findings.sort((a, b) => (a.severity === 'warning' ? -1 : 1));
}

function checkNaming(schema: any): HealthFinding[] {
  if (!schema?.groups) return [];
  const findings: HealthFinding[] = [];

  for (const group of schema.groups) {
    for (const table of group.tables) {
      const name: string = table.table_name;
      const hasValidPrefix = VALID_PREFIXES.some((p) => name.startsWith(p));
      if (!hasValidPrefix) {
        findings.push({
          severity: 'info',
          category: 'naming',
          title: `Naming: ${name}`,
          description: `Tabela n\u00e3o segue DIRECTIVE 2026-02-01 (prefixos v\u00e1lidos: ${VALID_PREFIXES.join(', ')}).`,
          suggestion: `Criar migration para renomear com prefixo correto.`,
          table: name,
        });
      }
    }
  }

  return findings;
}

function checkRls(schema: any): HealthFinding[] {
  if (!schema?.policies || !schema?.groups) return [];
  const findings: HealthFinding[] = [];

  // Build policy count per table
  const policyCounts = new Map<string, number>();
  const policyQuals = new Map<string, string[]>();
  for (const p of schema.policies) {
    policyCounts.set(p.tablename, (policyCounts.get(p.tablename) || 0) + 1);
    if (!policyQuals.has(p.tablename)) policyQuals.set(p.tablename, []);
    policyQuals.get(p.tablename)!.push(p.qual || '');
  }

  // Check all tables
  for (const group of schema.groups) {
    for (const table of group.tables) {
      const name: string = table.table_name;
      if (name.startsWith('v_')) continue; // views don't have RLS

      const count = policyCounts.get(name) || 0;
      if (count === 0) {
        findings.push({
          severity: 'critical',
          category: 'rls',
          title: `RLS: 0 policies em ${name}`,
          description: `Tabela sem nenhuma policy RLS. Acesso pode estar completamente aberto ou bloqueado.`,
          suggestion: `Criar policies RLS ou verificar se RLS est\u00e1 habilitado.`,
          table: name,
        });
      }

      // Check for USING(true) — overly permissive
      const quals = policyQuals.get(name) || [];
      const hasTrueQual = quals.some((q) => q.trim() === 'true' || q.trim() === '(true)');
      if (hasTrueQual) {
        findings.push({
          severity: 'warning',
          category: 'rls',
          title: `USING(true): ${name}`,
          description: `Tabela tem policy com USING(true) \u2014 permite acesso irrestrito a todos os registros.`,
          suggestion: `Substituir por condi\u00e7\u00e3o restritiva (ex: user_id = auth.uid()).`,
          table: name,
        });
      }
    }
  }

  return findings;
}

export async function GET() {
  try {
    const deps = readJson('deps.json');
    const docs = readJson('docs.json') as any[] | null;

    // Try to get schema from /api/schema cache or pass empty
    let schema: any = null;
    try {
      const res = await fetch(`http://localhost:${process.env.PORT || 3060}/api/schema`);
      if (res.ok) schema = await res.json();
    } catch {
      // Schema not available, skip RLS/naming checks
    }

    const findings: HealthFinding[] = [
      ...checkOrphans(deps),
      ...checkDocFreshness(docs || []),
      ...(schema ? checkRls(schema) : []),
      ...(schema ? checkNaming(schema) : []),
    ];

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    const summary = {
      critical: findings.filter((f) => f.severity === 'critical').length,
      warning: findings.filter((f) => f.severity === 'warning').length,
      info: findings.filter((f) => f.severity === 'info').length,
    };

    return NextResponse.json({ source: 'computed', summary, count: findings.length, findings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ source: 'error', error: message, summary: {}, count: 0, findings: [] }, { status: 500 });
  }
}
