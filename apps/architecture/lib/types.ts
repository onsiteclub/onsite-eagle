// ─── Database Types ───
export interface Database {
  public: {
    Tables: {
      egl_app_registry: {
        Row: AppRegistryRow;
        Insert: Partial<AppRegistryRow>;
        Update: Partial<AppRegistryRow>;
      };
      egl_data_metrics: {
        Row: DataMetricRow;
        Insert: Partial<DataMetricRow>;
        Update: Partial<DataMetricRow>;
      };
      egl_business_metrics: {
        Row: BusinessMetricRow;
        Insert: Partial<BusinessMetricRow>;
        Update: Partial<BusinessMetricRow>;
      };
    };
  };
}

export interface AppRegistryRow {
  id: string;
  app_slug: string;
  app_name: string;
  runtime: 'nextjs' | 'expo' | 'capacitor' | 'external' | 'tbd';
  subtitle: string | null;
  version: string;
  status: 'live' | 'beta' | 'development' | 'planned';
  last_deploy: string | null;
  deploy_env: string | null;
  uptime_pct: number;
  packages: string[];
  description: string | null;
  tech_stack: string | null;
  color_hex: string;
  is_external: boolean;
  is_new: boolean;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

export interface DataMetricRow {
  id: string;
  app_slug: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  metric_label: string | null;
  updated_at: string;
}

export interface BusinessMetricRow {
  id: string;
  metric_date: string;
  mrr: number;
  total_users: number;
  active_users: number;
  new_signups: number;
  churn_rate: number;
  total_data_gb: number;
  apps_live: number;
  apps_dev: number;
  created_at: string;
}

// ─── Grouped for UI ───
export interface AppWithMetrics extends AppRegistryRow {
  metrics: DataMetricRow[];
}

export type RuntimeGroup = {
  label: string;
  version: string;
  color: string;
  apps: AppRegistryRow[];
};

// ─── Portal Types ───

export interface SchemaTable {
  table_name: string;
  col_count: number;
  row_estimate: number;
  prefix: string;
}

export interface SchemaPolicy {
  tablename: string;
  policyname: string;
  cmd: string;
  qual: string | null;
}

export interface SchemaGroup {
  prefix: string;
  tables: SchemaTable[];
  policyCount: number;
}

export interface HealthFinding {
  severity: 'critical' | 'warning' | 'info';
  category: 'rls' | 'naming' | 'docs' | 'orphan' | 'drift';
  title: string;
  description: string;
  suggestion: string;
  table?: string;
  package?: string;
  doc?: string;
}

export interface DocEntry {
  relativePath: string;
  title: string;
  category: string;
  headings: string[];
  wordCount: number;
  lineCount: number;
  modifiedAt: string;
  tableRefs: string[];
}

export interface MigrationEntry {
  filename: string;
  name: string;
  date: string | null;
  lineCount: number;
  statements: {
    createTable: number;
    alterTable: number;
    createPolicy: number;
    dropPolicy: number;
    createFunction: number;
    createView: number;
    createIndex: number;
  };
  tablesCreated: string[];
  tablesAltered: string[];
}

export interface DepGraph {
  nodes: { id: string; type: 'app' | 'package'; name: string; runtime?: string; layer?: string }[];
  edges: { from: string; to: string; type: string }[];
  orphans: string[];
  hubs: { id: string; consumers: number }[];
}

export interface PkgEntry {
  slug: string;
  name: string;
  version: string;
  layer: string;
  internalDeps: string[];
  externalDeps: string[];
  hasReadme: boolean;
  hasSrc: boolean;
  exports: string[];
}

// ─── Static Fallback Data ───
export const RUNTIME_LABELS: Record<string, { label: string; version: string; color: string }> = {
  nextjs:    { label: 'NEXT.JS',    version: 'React 19',      color: '#2563EB' },
  expo:      { label: 'EXPO / RN',  version: 'React 18.3.1',  color: '#2BA84A' },
  capacitor: { label: 'CAPACITOR',  version: 'Ionic',         color: '#4F46E5' },
  external:  { label: 'EXTERNO',    version: 'fora do monorepo', color: '#F5A623' },
  tbd:       { label: 'PLANEJADO',  version: '',               color: '#9CA3AF' },
};
