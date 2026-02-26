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

// ─── Static Fallback Data ───
export const RUNTIME_LABELS: Record<string, { label: string; version: string; color: string }> = {
  nextjs:    { label: 'NEXT.JS',    version: 'React 19',      color: '#2563EB' },
  expo:      { label: 'EXPO / RN',  version: 'React 18.3.1',  color: '#2BA84A' },
  capacitor: { label: 'CAPACITOR',  version: 'Ionic',         color: '#4F46E5' },
  external:  { label: 'EXTERNO',    version: 'fora do monorepo', color: '#F5A623' },
  tbd:       { label: 'PLANEJADO',  version: '',               color: '#9CA3AF' },
};
