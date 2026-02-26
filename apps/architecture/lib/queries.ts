import { supabase, isStaticMode } from './supabase';
import type { AppRegistryRow, DataMetricRow, BusinessMetricRow } from './types';

// ─── Static fallback data (used when Supabase not connected) ───
const STATIC_APPS: AppRegistryRow[] = [
  { id: '1',  app_slug: 'monitor',    app_name: 'Monitor',         runtime: 'nextjs',    subtitle: 'foreman',         version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared','ui','auth','ai','agenda','media','timeline','sharing'],    description: 'Supervisão de obra em tempo real',              tech_stack: '8 pkgs · konva, ai, openai',  color_hex: '#F5A623', is_external: false, is_new: false, sort_order: 0,  updated_at: '', created_at: '' },
  { id: '2',  app_slug: 'analytics',  app_name: 'Analytics',       runtime: 'nextjs',    subtitle: 'admin',           version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['supabase','utils','hooks'],                                        description: 'Dashboards de KPIs e métricas',                 tech_stack: '3 pkgs · recharts, xlsx',     color_hex: '#2563EB', is_external: false, is_new: false, sort_order: 1,  updated_at: '', created_at: '' },
  { id: '3',  app_slug: 'dashboard',  app_name: 'Dashboard',       runtime: 'nextjs',    subtitle: 'club hub',        version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['supabase','utils'],                                                description: 'Área de membros OnSite Club',                   tech_stack: '2 pkgs · stripe',             color_hex: '#7C3AED', is_external: false, is_new: false, sort_order: 2,  updated_at: '', created_at: '' },
  { id: '4',  app_slug: 'auth',       app_name: 'Auth',            runtime: 'nextjs',    subtitle: 'login',           version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['supabase'],                                                        description: 'Hub de autenticação',                           tech_stack: '1 pkg · stripe',              color_hex: '#0891B2', is_external: false, is_new: false, sort_order: 3,  updated_at: '', created_at: '' },
  { id: '5',  app_slug: 'sheets',     app_name: 'Sheets',          runtime: 'nextjs',    subtitle: 'jobsite ctrl',    version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared'],                                                          description: 'Planilhas de controle de obra (Avalon)',        tech_stack: '1 pkg',                       color_hex: '#0D9488', is_external: false, is_new: true,  sort_order: 4,  updated_at: '', created_at: '' },
  { id: '6',  app_slug: 'payments',   app_name: 'Payments',        runtime: 'nextjs',    subtitle: 'financeiro',      version: '0.0.1', status: 'development', last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['supabase','auth','shared','hooks','utils'],                        description: 'Pagamentos por casa/lote → QuickBooks',        tech_stack: '5 pkgs',                      color_hex: '#0D9488', is_external: false, is_new: true,  sort_order: 5,  updated_at: '', created_at: '' },
  { id: '7',  app_slug: 'timekeeper', app_name: 'Timekeeper',      runtime: 'expo',      subtitle: 'worker',          version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared','ui','tokens','agenda','media','timeline','offline'],       description: 'Ponto com geofencing GPS',                     tech_stack: '7 pkgs · GPS, offline',       color_hex: '#2BA84A', is_external: false, is_new: false, sort_order: 10, updated_at: '', created_at: '' },
  { id: '8',  app_slug: 'operator',   app_name: 'Operator',        runtime: 'expo',      subtitle: 'máquina',         version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared','auth','camera','timeline','sharing','offline'],            description: 'Equipamentos + câmera + QR',                   tech_stack: '6 pkgs',                      color_hex: '#D4891A', is_external: false, is_new: false, sort_order: 11, updated_at: '', created_at: '' },
  { id: '9',  app_slug: 'field',      app_name: 'Field',           runtime: 'expo',      subtitle: 'foto ops',        version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared','ui','auth'],                                              description: 'Registro fotográfico de obra',                 tech_stack: '3 pkgs',                      color_hex: '#DC2626', is_external: false, is_new: false, sort_order: 12, updated_at: '', created_at: '' },
  { id: '10', app_slug: 'inspect',    app_name: 'Inspect',         runtime: 'expo',      subtitle: 'inspetor',        version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared','ui','auth'],                                              description: 'Inspeções e checklists',                       tech_stack: '3 pkgs',                      color_hex: '#DB2777', is_external: false, is_new: false, sort_order: 13, updated_at: '', created_at: '' },
  { id: '11', app_slug: 'calculator', app_name: 'Calculator',      runtime: 'capacitor', subtitle: 'cálculos',        version: '0.1.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: ['shared','voice','utils'],                                          description: 'Calculadora de construção com voz',            tech_stack: '3 pkgs · voice',              color_hex: '#4F46E5', is_external: false, is_new: false, sort_order: 20, updated_at: '', created_at: '' },
  { id: '12', app_slug: 'sheetchat',  app_name: 'SheetChat',       runtime: 'tbd',       subtitle: 'rede social',     version: '0.0.0', status: 'planned',     last_deploy: null, deploy_env: null, uptime_pct: 0,   packages: [],                                                                  description: 'Twitter + LinkedIn da construção',             tech_stack: 'TBD',                         color_hex: '#9CA3AF', is_external: false, is_new: false, sort_order: 30, updated_at: '', created_at: '' },
  { id: '13', app_slug: 'site',       app_name: 'OnSite Site',     runtime: 'external',  subtitle: 'landing page',    version: '1.0.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: [],                                                                  description: 'Site institucional',                           tech_stack: 'web',                         color_hex: '#F5A623', is_external: true,  is_new: false, sort_order: 40, updated_at: '', created_at: '' },
  { id: '14', app_slug: 'shop',       app_name: 'OnSite Shop',     runtime: 'external',  subtitle: 'e-commerce',      version: '1.0.0', status: 'live',        last_deploy: null, deploy_env: null, uptime_pct: 100, packages: [],                                                                  description: 'Loja online de construção',                    tech_stack: 'web',                         color_hex: '#F5A623', is_external: true,  is_new: false, sort_order: 41, updated_at: '', created_at: '' },
  { id: '15', app_slug: 'academy',    app_name: 'OnSite Academy',  runtime: 'external',  subtitle: 'cursos & carreira', version: '0.0.0', status: 'planned',  last_deploy: null, deploy_env: null, uptime_pct: 0,   packages: [],                                                                  description: 'Certificações, upskilling, transição de carreira', tech_stack: 'web',                  color_hex: '#F5A623', is_external: true,  is_new: false, sort_order: 42, updated_at: '', created_at: '' },
];

// ─── Queries ───

export async function getApps(): Promise<AppRegistryRow[]> {
  if (isStaticMode) return STATIC_APPS;

  const { data, error } = await supabase
    .from('egl_app_registry')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch apps:', error);
    return STATIC_APPS;
  }
  return data;
}

export async function getMetrics(): Promise<DataMetricRow[]> {
  if (isStaticMode) return [];

  const { data, error } = await supabase
    .from('egl_data_metrics')
    .select('*')
    .order('app_slug');

  if (error) {
    console.error('Failed to fetch metrics:', error);
    return [];
  }
  return data;
}

export async function getBusinessMetrics(limit = 30): Promise<BusinessMetricRow[]> {
  if (isStaticMode) return [];

  const { data, error } = await supabase
    .from('egl_business_metrics')
    .select('*')
    .order('metric_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch business metrics:', error);
    return [];
  }
  return data;
}

export async function updateAppStatus(
  appSlug: string,
  updates: { version?: string; status?: string; last_deploy?: string }
) {
  const payload: Record<string, string> = { updated_at: new Date().toISOString() };
  if (updates.version) payload.version = updates.version;
  if (updates.status) payload.status = updates.status;
  if (updates.last_deploy) payload.last_deploy = updates.last_deploy;

  const { error } = await supabase
    .from('egl_app_registry')
    .update(payload as any)
    .eq('app_slug', appSlug);

  if (error) throw error;
}
