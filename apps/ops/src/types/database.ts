export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agg_platform_daily: {
        Row: {
          active_users: number | null
          avg_order_value: number | null
          avg_session_duration: number | null
          avg_sessions_per_user: number | null
          calculations_voice_pct: number | null
          churned_users: number | null
          crash_rate: number | null
          created_at: string | null
          date: string
          entries_auto_pct: number | null
          entries_manual_pct: number | null
          new_users: number | null
          total_calculations: number | null
          total_entries: number | null
          total_errors: number | null
          total_orders: number | null
          total_revenue: number | null
          total_users: number | null
          total_work_hours: number | null
          updated_at: string | null
          users_free: number | null
          users_paid: number | null
          voice_success_rate: number | null
        }
        Insert: {
          active_users?: number | null
          avg_order_value?: number | null
          avg_session_duration?: number | null
          avg_sessions_per_user?: number | null
          calculations_voice_pct?: number | null
          churned_users?: number | null
          crash_rate?: number | null
          created_at?: string | null
          date: string
          entries_auto_pct?: number | null
          entries_manual_pct?: number | null
          new_users?: number | null
          total_calculations?: number | null
          total_entries?: number | null
          total_errors?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          total_users?: number | null
          total_work_hours?: number | null
          updated_at?: string | null
          users_free?: number | null
          users_paid?: number | null
          voice_success_rate?: number | null
        }
        Update: {
          active_users?: number | null
          avg_order_value?: number | null
          avg_session_duration?: number | null
          avg_sessions_per_user?: number | null
          calculations_voice_pct?: number | null
          churned_users?: number | null
          crash_rate?: number | null
          created_at?: string | null
          date?: string
          entries_auto_pct?: number | null
          entries_manual_pct?: number | null
          new_users?: number | null
          total_calculations?: number | null
          total_entries?: number | null
          total_errors?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          total_users?: number | null
          total_work_hours?: number | null
          updated_at?: string | null
          users_free?: number | null
          users_paid?: number | null
          voice_success_rate?: number | null
        }
        Relationships: []
      }
      agg_trade_weekly: {
        Row: {
          active_users: number | null
          avg_hours_per_user: number | null
          avg_session_duration: number | null
          common_terms: Json | null
          created_at: string | null
          median_hours_per_user: number | null
          new_users: number | null
          peak_end_hour: number | null
          peak_start_hour: number | null
          province: string
          sample_size: number | null
          top_intents: Json | null
          total_work_hours: number | null
          trade_id: string
          updated_at: string | null
          voice_usage_pct: number | null
          week_start: string
        }
        Insert: {
          active_users?: number | null
          avg_hours_per_user?: number | null
          avg_session_duration?: number | null
          common_terms?: Json | null
          created_at?: string | null
          median_hours_per_user?: number | null
          new_users?: number | null
          peak_end_hour?: number | null
          peak_start_hour?: number | null
          province: string
          sample_size?: number | null
          top_intents?: Json | null
          total_work_hours?: number | null
          trade_id: string
          updated_at?: string | null
          voice_usage_pct?: number | null
          week_start: string
        }
        Update: {
          active_users?: number | null
          avg_hours_per_user?: number | null
          avg_session_duration?: number | null
          common_terms?: Json | null
          created_at?: string | null
          median_hours_per_user?: number | null
          new_users?: number | null
          peak_end_hour?: number | null
          peak_start_hour?: number | null
          province?: string
          sample_size?: number | null
          top_intents?: Json | null
          total_work_hours?: number | null
          trade_id?: string
          updated_at?: string | null
          voice_usage_pct?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "agg_trade_weekly_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "ref_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      agg_user_daily: {
        Row: {
          app_foreground_seconds: number | null
          app_opens: number | null
          app_version: string | null
          calculations_count: number | null
          calculations_manual: number | null
          calculations_voice: number | null
          cart_abandonment: boolean | null
          created_at: string | null
          date: string
          device_model: string | null
          errors_count: number | null
          features_used: Json | null
          geofence_accuracy_avg: number | null
          geofence_triggers: number | null
          geofences_created: number | null
          geofences_deleted: number | null
          notifications_actioned: number | null
          notifications_shown: number | null
          orders_count: number | null
          orders_total: number | null
          os: string | null
          screens_viewed: Json | null
          sessions_count: number | null
          sync_attempts: number | null
          sync_failures: number | null
          updated_at: string | null
          user_id: string
          voice_success_rate: number | null
          work_entries_auto: number | null
          work_entries_count: number | null
          work_entries_manual: number | null
          work_minutes_total: number | null
        }
        Insert: {
          app_foreground_seconds?: number | null
          app_opens?: number | null
          app_version?: string | null
          calculations_count?: number | null
          calculations_manual?: number | null
          calculations_voice?: number | null
          cart_abandonment?: boolean | null
          created_at?: string | null
          date: string
          device_model?: string | null
          errors_count?: number | null
          features_used?: Json | null
          geofence_accuracy_avg?: number | null
          geofence_triggers?: number | null
          geofences_created?: number | null
          geofences_deleted?: number | null
          notifications_actioned?: number | null
          notifications_shown?: number | null
          orders_count?: number | null
          orders_total?: number | null
          os?: string | null
          screens_viewed?: Json | null
          sessions_count?: number | null
          sync_attempts?: number | null
          sync_failures?: number | null
          updated_at?: string | null
          user_id: string
          voice_success_rate?: number | null
          work_entries_auto?: number | null
          work_entries_count?: number | null
          work_entries_manual?: number | null
          work_minutes_total?: number | null
        }
        Update: {
          app_foreground_seconds?: number | null
          app_opens?: number | null
          app_version?: string | null
          calculations_count?: number | null
          calculations_manual?: number | null
          calculations_voice?: number | null
          cart_abandonment?: boolean | null
          created_at?: string | null
          date?: string
          device_model?: string | null
          errors_count?: number | null
          features_used?: Json | null
          geofence_accuracy_avg?: number | null
          geofence_triggers?: number | null
          geofences_created?: number | null
          geofences_deleted?: number | null
          notifications_actioned?: number | null
          notifications_shown?: number | null
          orders_count?: number | null
          orders_total?: number | null
          os?: string | null
          screens_viewed?: Json | null
          sessions_count?: number | null
          sync_attempts?: number | null
          sync_failures?: number | null
          updated_at?: string | null
          user_id?: string
          voice_success_rate?: number | null
          work_entries_auto?: number | null
          work_entries_count?: number | null
          work_entries_manual?: number | null
          work_minutes_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agg_user_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bil_checkout_codes: {
        Row: {
          app: string | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          redirect_url: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          app?: string | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          redirect_url?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          app?: string | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          redirect_url?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bil_checkout_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bil_payments: {
        Row: {
          amount: number | null
          app_name: string
          billing_address_city: string | null
          billing_address_country: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_address_postal_code: string | null
          billing_address_state: string | null
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          created_at: string | null
          currency: string | null
          id: string
          paid_at: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          app_name: string
          billing_address_city?: string | null
          billing_address_country?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_address_postal_code?: string | null
          billing_address_state?: string | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          app_name?: string
          billing_address_city?: string | null
          billing_address_country?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_address_postal_code?: string | null
          billing_address_state?: string | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bil_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bil_products: {
        Row: {
          app_name: string
          billing_interval: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price_amount: number
          price_currency: string | null
          stripe_price_id: string
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          app_name: string
          billing_interval?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price_amount: number
          price_currency?: string | null
          stripe_price_id: string
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string
          billing_interval?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price_amount?: number
          price_currency?: string | null
          stripe_price_id?: string
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bil_subscriptions: {
        Row: {
          app_name: string
          billing_address: Json | null
          billing_address_city: string | null
          billing_address_country: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_address_postal_code: string | null
          billing_address_state: string | null
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          plan_id: string | null
          plan_name: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_name: string
          billing_address?: Json | null
          billing_address_city?: string | null
          billing_address_country?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_address_postal_code?: string | null
          billing_address_state?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          plan_id?: string | null
          plan_name?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_name?: string
          billing_address?: Json | null
          billing_address_city?: string | null
          billing_address_country?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_address_postal_code?: string | null
          billing_address_state?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          plan_id?: string | null
          plan_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bil_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "bil_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bil_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ccl_calculations: {
        Row: {
          calculation_subtype: string | null
          calculation_type: string
          created_at: string | null
          formula_used: string | null
          id: string
          input_method: string
          input_values: Json
          result_unit: string | null
          result_value: number | null
          template_id: string | null
          trade_context: string | null
          user_id: string | null
          voice_log_id: string | null
          was_saved: boolean | null
          was_shared: boolean | null
          was_successful: boolean | null
        }
        Insert: {
          calculation_subtype?: string | null
          calculation_type: string
          created_at?: string | null
          formula_used?: string | null
          id?: string
          input_method: string
          input_values: Json
          result_unit?: string | null
          result_value?: number | null
          template_id?: string | null
          trade_context?: string | null
          user_id?: string | null
          voice_log_id?: string | null
          was_saved?: boolean | null
          was_shared?: boolean | null
          was_successful?: boolean | null
        }
        Update: {
          calculation_subtype?: string | null
          calculation_type?: string
          created_at?: string | null
          formula_used?: string | null
          id?: string
          input_method?: string
          input_values?: Json
          result_unit?: string | null
          result_value?: number | null
          template_id?: string | null
          trade_context?: string | null
          user_id?: string | null
          voice_log_id?: string | null
          was_saved?: boolean | null
          was_shared?: boolean | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ccl_calculations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ccl_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccl_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccl_calculations_voice_log_id_fkey"
            columns: ["voice_log_id"]
            isOneToOne: false
            referencedRelation: "core_voice_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ccl_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by_user_id: string | null
          default_values: Json | null
          description: string | null
          formula: string
          id: string
          input_fields: Json
          is_public: boolean | null
          is_system: boolean | null
          name: string
          trade_id: string | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by_user_id?: string | null
          default_values?: Json | null
          description?: string | null
          formula: string
          id?: string
          input_fields: Json
          is_public?: boolean | null
          is_system?: boolean | null
          name: string
          trade_id?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by_user_id?: string | null
          default_values?: Json | null
          description?: string | null
          formula?: string
          id?: string
          input_fields?: Json
          is_public?: boolean | null
          is_system?: boolean | null
          name?: string
          trade_id?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ccl_templates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccl_templates_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "ref_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      core_access_grants: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          label: string | null
          owner_id: string
          revoked_at: string | null
          status: string | null
          token: string
          viewer_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          label?: string | null
          owner_id: string
          revoked_at?: string | null
          status?: string | null
          token: string
          viewer_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          label?: string | null
          owner_id?: string
          revoked_at?: string | null
          status?: string | null
          token?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_access_grants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_access_grants_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "core_admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      core_admin_users: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_admin_users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "core_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_ai_conversations: {
        Row: {
          archived: boolean | null
          created_at: string | null
          id: string
          messages: Json | null
          starred: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          starred?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          starred?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_app_registry: {
        Row: {
          app_name: string
          app_slug: string
          color_hex: string | null
          created_at: string | null
          deploy_env: string | null
          description: string | null
          id: string
          is_external: boolean | null
          is_new: boolean | null
          last_deploy: string | null
          packages: string[] | null
          runtime: string
          sort_order: number | null
          status: string | null
          subtitle: string | null
          tech_stack: string | null
          updated_at: string | null
          uptime_pct: number | null
          version: string | null
        }
        Insert: {
          app_name: string
          app_slug: string
          color_hex?: string | null
          created_at?: string | null
          deploy_env?: string | null
          description?: string | null
          id?: string
          is_external?: boolean | null
          is_new?: boolean | null
          last_deploy?: string | null
          packages?: string[] | null
          runtime: string
          sort_order?: number | null
          status?: string | null
          subtitle?: string | null
          tech_stack?: string | null
          updated_at?: string | null
          uptime_pct?: number | null
          version?: string | null
        }
        Update: {
          app_name?: string
          app_slug?: string
          color_hex?: string | null
          created_at?: string | null
          deploy_env?: string | null
          description?: string | null
          id?: string
          is_external?: boolean | null
          is_new?: boolean | null
          last_deploy?: string | null
          packages?: string[] | null
          runtime?: string
          sort_order?: number | null
          status?: string | null
          subtitle?: string | null
          tech_stack?: string | null
          updated_at?: string | null
          uptime_pct?: number | null
          version?: string | null
        }
        Relationships: []
      }
      core_consents: {
        Row: {
          app_name: string | null
          app_version: string | null
          collection_method: string | null
          consent_type: string
          created_at: string | null
          document_hash: string | null
          document_url: string | null
          document_version: string | null
          expires_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_name?: string | null
          app_version?: string | null
          collection_method?: string | null
          consent_type: string
          created_at?: string | null
          document_hash?: string | null
          document_url?: string | null
          document_version?: string | null
          expires_at?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_name?: string | null
          app_version?: string | null
          collection_method?: string | null
          consent_type?: string
          created_at?: string | null
          document_hash?: string | null
          document_url?: string | null
          document_version?: string | null
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_devices: {
        Row: {
          app_name: string
          app_version: string | null
          created_at: string | null
          device_id: string
          device_name: string | null
          first_seen_at: string | null
          has_gps: boolean | null
          has_microphone: boolean | null
          has_notifications: boolean | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_active_at: string | null
          manufacturer: string | null
          model: string | null
          os_version: string | null
          platform: string | null
          push_enabled: boolean | null
          push_token: string | null
          push_token_updated_at: string | null
          session_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_name: string
          app_version?: string | null
          created_at?: string | null
          device_id: string
          device_name?: string | null
          first_seen_at?: string | null
          has_gps?: boolean | null
          has_microphone?: boolean | null
          has_notifications?: boolean | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_active_at?: string | null
          manufacturer?: string | null
          model?: string | null
          os_version?: string | null
          platform?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
          push_token_updated_at?: string | null
          session_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_name?: string
          app_version?: string | null
          created_at?: string | null
          device_id?: string
          device_name?: string | null
          first_seen_at?: string | null
          has_gps?: boolean | null
          has_microphone?: boolean | null
          has_notifications?: boolean | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_active_at?: string | null
          manufacturer?: string | null
          model?: string | null
          os_version?: string | null
          platform?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
          push_token_updated_at?: string | null
          session_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_org_memberships: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_org_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organizations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          province: string | null
          slug: string | null
          stripe_customer_id: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          province?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          province?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      core_pending_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          owner_id: string
          owner_name: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          owner_id: string
          owner_name?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          owner_id?: string
          owner_name?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_pending_tokens_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_profiles: {
        Row: {
          avatar_url: string | null
          certifications: string[] | null
          city: string | null
          company_name: string | null
          company_size: string | null
          country: string | null
          created_at: string | null
          date_format: string | null
          date_of_birth: string | null
          email: string | null
          employment_type: string | null
          experience_level: string | null
          experience_years: number | null
          first_active_at: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          hourly_rate_range: string | null
          id: string
          language_origin: string | null
          language_primary: string | null
          language_secondary: string | null
          last_active_at: string | null
          last_name: string | null
          onboarding_completed_at: string | null
          onboarding_source: string | null
          phone: string | null
          postal_code_prefix: string | null
          preferred_name: string | null
          primary_device_id: string | null
          primary_device_model: string | null
          primary_device_platform: string | null
          profile_completeness: number | null
          province: string | null
          referral_code: string | null
          referred_by_user_id: string | null
          time_format: string | null
          timezone: string | null
          total_hours_tracked: number | null
          total_sessions: number | null
          trade_id: string | null
          trade_other: string | null
          units_system: string | null
          updated_at: string | null
          voice_enabled: boolean | null
          voice_language_preference: string | null
          worker_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          certifications?: string[] | null
          city?: string | null
          company_name?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          date_format?: string | null
          date_of_birth?: string | null
          email?: string | null
          employment_type?: string | null
          experience_level?: string | null
          experience_years?: number | null
          first_active_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          hourly_rate_range?: string | null
          id: string
          language_origin?: string | null
          language_primary?: string | null
          language_secondary?: string | null
          last_active_at?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_source?: string | null
          phone?: string | null
          postal_code_prefix?: string | null
          preferred_name?: string | null
          primary_device_id?: string | null
          primary_device_model?: string | null
          primary_device_platform?: string | null
          profile_completeness?: number | null
          province?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          time_format?: string | null
          timezone?: string | null
          total_hours_tracked?: number | null
          total_sessions?: number | null
          trade_id?: string | null
          trade_other?: string | null
          units_system?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
          voice_language_preference?: string | null
          worker_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          certifications?: string[] | null
          city?: string | null
          company_name?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          date_format?: string | null
          date_of_birth?: string | null
          email?: string | null
          employment_type?: string | null
          experience_level?: string | null
          experience_years?: number | null
          first_active_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          hourly_rate_range?: string | null
          id?: string
          language_origin?: string | null
          language_primary?: string | null
          language_secondary?: string | null
          last_active_at?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_source?: string | null
          phone?: string | null
          postal_code_prefix?: string | null
          preferred_name?: string | null
          primary_device_id?: string | null
          primary_device_model?: string | null
          primary_device_platform?: string | null
          profile_completeness?: number | null
          province?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          time_format?: string | null
          timezone?: string | null
          total_hours_tracked?: number | null
          total_sessions?: number | null
          trade_id?: string | null
          trade_other?: string | null
          units_system?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
          voice_language_preference?: string | null
          worker_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_profiles_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_profiles_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "ref_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      core_voice_logs: {
        Row: {
          app_name: string | null
          app_version: string | null
          audio_duration_ms: number | null
          audio_format: string | null
          audio_sample_rate: number | null
          audio_storage_path: string | null
          background_noise_level: string | null
          background_noise_type: string | null
          client_timestamp: string | null
          correction_applied_at: string | null
          created_at: string | null
          device_model: string | null
          dialect_region: string | null
          entities: Json | null
          error_message: string | null
          error_type: string | null
          feature_context: string | null
          id: string
          informal_terms: Json | null
          intent_confidence: number | null
          intent_detected: string | null
          intent_fulfilled: boolean | null
          language_confidence: number | null
          language_detected: string | null
          latitude: number | null
          longitude: number | null
          microphone_type: string | null
          os: string | null
          retry_count: number | null
          retry_of_id: string | null
          session_id: string | null
          speech_clarity: string | null
          transcription_confidence: number | null
          transcription_engine: string | null
          transcription_normalized: string | null
          transcription_raw: string | null
          user_corrected: boolean | null
          user_correction: string | null
          user_id: string | null
          was_successful: boolean | null
        }
        Insert: {
          app_name?: string | null
          app_version?: string | null
          audio_duration_ms?: number | null
          audio_format?: string | null
          audio_sample_rate?: number | null
          audio_storage_path?: string | null
          background_noise_level?: string | null
          background_noise_type?: string | null
          client_timestamp?: string | null
          correction_applied_at?: string | null
          created_at?: string | null
          device_model?: string | null
          dialect_region?: string | null
          entities?: Json | null
          error_message?: string | null
          error_type?: string | null
          feature_context?: string | null
          id?: string
          informal_terms?: Json | null
          intent_confidence?: number | null
          intent_detected?: string | null
          intent_fulfilled?: boolean | null
          language_confidence?: number | null
          language_detected?: string | null
          latitude?: number | null
          longitude?: number | null
          microphone_type?: string | null
          os?: string | null
          retry_count?: number | null
          retry_of_id?: string | null
          session_id?: string | null
          speech_clarity?: string | null
          transcription_confidence?: number | null
          transcription_engine?: string | null
          transcription_normalized?: string | null
          transcription_raw?: string | null
          user_corrected?: boolean | null
          user_correction?: string | null
          user_id?: string | null
          was_successful?: boolean | null
        }
        Update: {
          app_name?: string | null
          app_version?: string | null
          audio_duration_ms?: number | null
          audio_format?: string | null
          audio_sample_rate?: number | null
          audio_storage_path?: string | null
          background_noise_level?: string | null
          background_noise_type?: string | null
          client_timestamp?: string | null
          correction_applied_at?: string | null
          created_at?: string | null
          device_model?: string | null
          dialect_region?: string | null
          entities?: Json | null
          error_message?: string | null
          error_type?: string | null
          feature_context?: string | null
          id?: string
          informal_terms?: Json | null
          intent_confidence?: number | null
          intent_detected?: string | null
          intent_fulfilled?: boolean | null
          language_confidence?: number | null
          language_detected?: string | null
          latitude?: number | null
          longitude?: number | null
          microphone_type?: string | null
          os?: string | null
          retry_count?: number | null
          retry_of_id?: string | null
          session_id?: string | null
          speech_clarity?: string | null
          transcription_confidence?: number | null
          transcription_engine?: string | null
          transcription_normalized?: string | null
          transcription_raw?: string | null
          user_corrected?: boolean | null
          user_correction?: string | null
          user_id?: string | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "core_voice_logs_retry_of_id_fkey"
            columns: ["retry_of_id"]
            isOneToOne: false
            referencedRelation: "core_voice_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_voice_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_ai_reports: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          created_at: string
          full_report: string
          generation_time_ms: number | null
          highlights: Json | null
          id: string
          jobsite_id: string
          lot_id: string | null
          metrics: Json
          organization_id: string | null
          period_end: string
          period_start: string
          recommendations: Json | null
          report_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sections: Json | null
          sent_to: Json | null
          status: string
          summary: string
          title: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          created_at?: string
          full_report: string
          generation_time_ms?: number | null
          highlights?: Json | null
          id?: string
          jobsite_id: string
          lot_id?: string | null
          metrics?: Json
          organization_id?: string | null
          period_end: string
          period_start: string
          recommendations?: Json | null
          report_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections?: Json | null
          sent_to?: Json | null
          status?: string
          summary: string
          title: string
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          created_at?: string
          full_report?: string
          generation_time_ms?: number | null
          highlights?: Json | null
          id?: string
          jobsite_id?: string
          lot_id?: string | null
          metrics?: Json
          organization_id?: string | null
          period_end?: string
          period_start?: string
          recommendations?: Json | null
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections?: Json | null
          sent_to?: Json | null
          status?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_ai_reports_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_ai_reports_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_ai_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_ai_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_alerts: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          message: string | null
          operator_id: string | null
          sent_to_supervisor_at: string | null
          site_id: string | null
          type: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          operator_id?: string | null
          sent_to_supervisor_at?: string | null
          site_id?: string | null
          type: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          operator_id?: string | null
          sent_to_supervisor_at?: string | null
          site_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          expected_end_date: string | null
          expected_start_date: string | null
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          plan_urls: string[] | null
          status: string
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          expected_end_date?: string | null
          expected_start_date?: string | null
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          plan_urls?: string[] | null
          status?: string
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          expected_end_date?: string | null
          expected_start_date?: string | null
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          plan_urls?: string[] | null
          status?: string
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_assignments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_builder_tokens: {
        Row: {
          access_count: number | null
          builder_email: string | null
          builder_name: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          jobsite_id: string
          last_accessed_at: string | null
          organization_id: string | null
          token: string
        }
        Insert: {
          access_count?: number | null
          builder_email?: string | null
          builder_name: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          jobsite_id: string
          last_accessed_at?: string | null
          organization_id?: string | null
          token: string
        }
        Update: {
          access_count?: number | null
          builder_email?: string | null
          builder_name?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          jobsite_id?: string
          last_accessed_at?: string | null
          organization_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_builder_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_builder_tokens_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_builder_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_certifications: {
        Row: {
          cert_number: string | null
          cert_type: string
          created_at: string | null
          document_url: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          organization_id: string | null
          status: string | null
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          cert_number?: string | null
          cert_type: string
          created_at?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          cert_number?: string | null
          cert_type?: string
          created_at?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_certifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_certifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_crew_workers: {
        Row: {
          crew_id: string
          employment_type: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          organization_id: string | null
          role: string | null
          worker_id: string
        }
        Insert: {
          crew_id: string
          employment_type?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          organization_id?: string | null
          role?: string | null
          worker_id: string
        }
        Update: {
          crew_id?: string
          employment_type?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          organization_id?: string | null
          role?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_crew_workers_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "frm_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_crew_workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_crew_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_crews: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          lead_id: string | null
          name: string
          organization_id: string | null
          phone: string | null
          specialty: string[] | null
          status: string | null
          wsib_expires: string | null
          wsib_number: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          organization_id?: string | null
          phone?: string | null
          specialty?: string[] | null
          status?: string | null
          wsib_expires?: string | null
          wsib_number?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          specialty?: string[] | null
          status?: string | null
          wsib_expires?: string | null
          wsib_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_crews_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_crews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_document_batches: {
        Row: {
          completed_at: string | null
          created_at: string | null
          failed_files: number | null
          id: string
          jobsite_id: string
          linked_files: number | null
          organization_id: string | null
          processed_files: number | null
          started_at: string | null
          status: string | null
          total_files: number | null
          unlinked_files: number | null
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          failed_files?: number | null
          id?: string
          jobsite_id: string
          linked_files?: number | null
          organization_id?: string | null
          processed_files?: number | null
          started_at?: string | null
          status?: string | null
          total_files?: number | null
          unlinked_files?: number | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          failed_files?: number | null
          id?: string
          jobsite_id?: string
          linked_files?: number | null
          organization_id?: string | null
          processed_files?: number | null
          started_at?: string | null
          status?: string | null
          total_files?: number | null
          unlinked_files?: number | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_document_batches_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_document_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_document_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_document_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_id: string
          id: string
          link_type: string | null
          lot_id: string
          organization_id: string | null
          show_in_timeline: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_id: string
          id?: string
          link_type?: string | null
          lot_id: string
          organization_id?: string | null
          show_in_timeline?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          id?: string
          link_type?: string | null
          lot_id?: string
          organization_id?: string | null
          show_in_timeline?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_document_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "frm_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_document_links_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_document_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_documents: {
        Row: {
          ai_analyzed: boolean | null
          ai_extracted_data: Json | null
          ai_summary: string | null
          batch_id: string | null
          category: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          jobsite_id: string | null
          lot_id: string | null
          name: string
          organization_id: string | null
          parsed_lot_number: string | null
          parsing_confidence: number | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          ai_analyzed?: boolean | null
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          batch_id?: string | null
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          jobsite_id?: string | null
          lot_id?: string | null
          name: string
          organization_id?: string | null
          parsed_lot_number?: string | null
          parsing_confidence?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          ai_analyzed?: boolean | null
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          batch_id?: string | null
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          jobsite_id?: string | null
          lot_id?: string | null
          name?: string
          organization_id?: string | null
          parsed_lot_number?: string | null
          parsing_confidence?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_documents_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "frm_document_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_documents_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_equipment_requests: {
        Row: {
          completed_at: string | null
          description: string | null
          id: string
          lot_id: string
          operation_type: string
          operator_id: string | null
          organization_id: string | null
          phase_id: string
          priority: string | null
          requested_at: string | null
          requested_by: string
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          description?: string | null
          id?: string
          lot_id: string
          operation_type: string
          operator_id?: string | null
          organization_id?: string | null
          phase_id: string
          priority?: string | null
          requested_at?: string | null
          requested_by: string
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          description?: string | null
          id?: string
          lot_id?: string
          operation_type?: string
          operator_id?: string | null
          organization_id?: string | null
          phase_id?: string
          priority?: string | null
          requested_at?: string | null
          requested_by?: string
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_equipment_requests_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_equipment_requests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_equipment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_equipment_requests_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_equipment_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_external_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          impact_severity: string | null
          jobsite_id: string | null
          lot_id: string | null
          organization_id: string | null
          source: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          impact_severity?: string | null
          jobsite_id?: string | null
          lot_id?: string | null
          organization_id?: string | null
          source?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          impact_severity?: string | null
          jobsite_id?: string | null
          lot_id?: string | null
          organization_id?: string | null
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_external_events_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_external_events_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_external_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_gate_check_items: {
        Row: {
          deficiency_id: string | null
          gate_check_id: string
          id: string
          item_code: string
          item_label: string
          notes: string | null
          photo_url: string | null
          result: string | null
        }
        Insert: {
          deficiency_id?: string | null
          gate_check_id: string
          id?: string
          item_code: string
          item_label: string
          notes?: string | null
          photo_url?: string | null
          result?: string | null
        }
        Update: {
          deficiency_id?: string | null
          gate_check_id?: string
          id?: string
          item_code?: string
          item_label?: string
          notes?: string | null
          photo_url?: string | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_gate_check_items_deficiency_id_fkey"
            columns: ["deficiency_id"]
            isOneToOne: false
            referencedRelation: "frm_house_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_gate_check_items_gate_check_id_fkey"
            columns: ["gate_check_id"]
            isOneToOne: false
            referencedRelation: "frm_gate_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_gate_check_templates: {
        Row: {
          id: string
          is_blocking: boolean | null
          item_code: string
          item_label: string
          sort_order: number | null
          transition: string
        }
        Insert: {
          id?: string
          is_blocking?: boolean | null
          item_code: string
          item_label: string
          sort_order?: number | null
          transition: string
        }
        Update: {
          id?: string
          is_blocking?: boolean | null
          item_code?: string
          item_label?: string
          sort_order?: number | null
          transition?: string
        }
        Relationships: []
      }
      frm_gate_checks: {
        Row: {
          checked_by: string
          completed_at: string | null
          id: string
          lot_id: string
          organization_id: string | null
          released_at: string | null
          started_at: string | null
          status: string | null
          transition: string
        }
        Insert: {
          checked_by: string
          completed_at?: string | null
          id?: string
          lot_id: string
          organization_id?: string | null
          released_at?: string | null
          started_at?: string | null
          status?: string | null
          transition: string
        }
        Update: {
          checked_by?: string
          completed_at?: string | null
          id?: string
          lot_id?: string
          organization_id?: string | null
          released_at?: string | null
          started_at?: string | null
          status?: string | null
          transition?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_gate_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_gate_checks_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_gate_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_house_items: {
        Row: {
          blocking: boolean | null
          crew_id: string | null
          description: string | null
          gate_check_id: string | null
          id: string
          lot_id: string
          organization_id: string | null
          phase_id: string | null
          photo_url: string
          reported_at: string | null
          reported_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_photo: string | null
          severity: string | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          blocking?: boolean | null
          crew_id?: string | null
          description?: string | null
          gate_check_id?: string | null
          id?: string
          lot_id: string
          organization_id?: string | null
          phase_id?: string | null
          photo_url: string
          reported_at?: string | null
          reported_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_photo?: string | null
          severity?: string | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          blocking?: boolean | null
          crew_id?: string | null
          description?: string | null
          gate_check_id?: string | null
          id?: string
          lot_id?: string
          organization_id?: string | null
          phase_id?: string | null
          photo_url?: string
          reported_at?: string | null
          reported_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_photo?: string | null
          severity?: string | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_house_items_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "frm_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_house_items_gate_check_id_fkey"
            columns: ["gate_check_id"]
            isOneToOne: false
            referencedRelation: "frm_gate_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_house_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_house_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_house_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_house_items_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_house_items_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_jobsites: {
        Row: {
          address: string | null
          builder_name: string
          city: string | null
          completed_lots: number | null
          created_at: string | null
          expected_end_date: string | null
          foreman_id: string | null
          id: string
          lumberyard_notes: string | null
          machine_down: boolean | null
          machine_down_at: string | null
          machine_down_reason: string | null
          name: string
          organization_id: string | null
          original_plan_url: string | null
          refuel_needed: boolean | null
          refuel_needed_at: string | null
          start_date: string | null
          status: string | null
          svg_data: string | null
          total_lots: number | null
          tz: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          builder_name: string
          city?: string | null
          completed_lots?: number | null
          created_at?: string | null
          expected_end_date?: string | null
          foreman_id?: string | null
          id?: string
          lumberyard_notes?: string | null
          machine_down?: boolean | null
          machine_down_at?: string | null
          machine_down_reason?: string | null
          name: string
          organization_id?: string | null
          original_plan_url?: string | null
          refuel_needed?: boolean | null
          refuel_needed_at?: string | null
          start_date?: string | null
          status?: string | null
          svg_data?: string | null
          total_lots?: number | null
          tz?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          builder_name?: string
          city?: string | null
          completed_lots?: number | null
          created_at?: string | null
          expected_end_date?: string | null
          foreman_id?: string | null
          id?: string
          lumberyard_notes?: string | null
          machine_down?: boolean | null
          machine_down_at?: string | null
          machine_down_reason?: string | null
          name?: string
          organization_id?: string | null
          original_plan_url?: string | null
          refuel_needed?: boolean | null
          refuel_needed_at?: string | null
          start_date?: string | null
          status?: string | null
          svg_data?: string | null
          total_lots?: number | null
          tz?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_jobsites_foreman_id_fkey"
            columns: ["foreman_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_jobsites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_lots: {
        Row: {
          address: string | null
          block: string | null
          blueprint_url: string | null
          buyer_contact: string | null
          buyer_name: string | null
          closing_date: string | null
          completed_at: string | null
          coordinates: Json | null
          created_at: string | null
          current_phase: string | null
          has_capping: boolean | null
          id: string
          is_issued: boolean | null
          is_sold: boolean | null
          issued_at: string | null
          issued_to_worker_id: string | null
          issued_to_worker_name: string | null
          jobsite_id: string
          lot_number: string
          model: string | null
          notes: string | null
          organization_id: string | null
          priority_score: number | null
          progress_percentage: number | null
          qr_code_data: string | null
          registered_workers: string[] | null
          released_at: string | null
          schedule_notes: string | null
          sqft_basement: number | null
          sqft_main_floors: number | null
          sqft_roof: number | null
          started_at: string | null
          status: string | null
          target_date: string | null
          total_sqft: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          block?: string | null
          blueprint_url?: string | null
          buyer_contact?: string | null
          buyer_name?: string | null
          closing_date?: string | null
          completed_at?: string | null
          coordinates?: Json | null
          created_at?: string | null
          current_phase?: string | null
          has_capping?: boolean | null
          id?: string
          is_issued?: boolean | null
          is_sold?: boolean | null
          issued_at?: string | null
          issued_to_worker_id?: string | null
          issued_to_worker_name?: string | null
          jobsite_id: string
          lot_number: string
          model?: string | null
          notes?: string | null
          organization_id?: string | null
          priority_score?: number | null
          progress_percentage?: number | null
          qr_code_data?: string | null
          registered_workers?: string[] | null
          released_at?: string | null
          schedule_notes?: string | null
          sqft_basement?: number | null
          sqft_main_floors?: number | null
          sqft_roof?: number | null
          started_at?: string | null
          status?: string | null
          target_date?: string | null
          total_sqft?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          block?: string | null
          blueprint_url?: string | null
          buyer_contact?: string | null
          buyer_name?: string | null
          closing_date?: string | null
          completed_at?: string | null
          coordinates?: Json | null
          created_at?: string | null
          current_phase?: string | null
          has_capping?: boolean | null
          id?: string
          is_issued?: boolean | null
          is_sold?: boolean | null
          issued_at?: string | null
          issued_to_worker_id?: string | null
          issued_to_worker_name?: string | null
          jobsite_id?: string
          lot_number?: string
          model?: string | null
          notes?: string | null
          organization_id?: string | null
          priority_score?: number | null
          progress_percentage?: number | null
          qr_code_data?: string | null
          registered_workers?: string[] | null
          released_at?: string | null
          schedule_notes?: string | null
          sqft_basement?: number | null
          sqft_main_floors?: number | null
          sqft_roof?: number | null
          started_at?: string | null
          status?: string | null
          target_date?: string | null
          total_sqft?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_lots_current_phase_fkey"
            columns: ["current_phase"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_lots_issued_to_worker_id_fkey"
            columns: ["issued_to_worker_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_lots_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_material_requests: {
        Row: {
          acknowledged_at: string | null
          authorized_at: string | null
          authorized_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by_id: string | null
          confidence: number | null
          created_at: string | null
          deleted_at: string | null
          delivered_at: string | null
          delivered_by_id: string | null
          delivered_by_name: string | null
          delivery_location: string | null
          delivery_notes: string | null
          id: string
          in_transit_at: string | null
          jobsite_id: string | null
          language_detected: string | null
          lot_id: string
          material_name: string | null
          material_type: string | null
          notes: string | null
          operator_id: string | null
          organization_id: string | null
          phase_id: string
          photo_url: string | null
          quantity: number | null
          raw_message: string | null
          requested_at: string | null
          requested_by: string
          requested_by_name: string | null
          source: string | null
          status: string | null
          sub_items: Json | null
          unit: string | null
          updated_at: string | null
          urgency_factors: Json | null
          urgency_level: string | null
          urgency_reason: string | null
          urgency_score: number | null
          worker_id: string | null
          worker_name: string | null
          worker_phone: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          authorized_at?: string | null
          authorized_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_id?: string | null
          confidence?: number | null
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivered_by_id?: string | null
          delivered_by_name?: string | null
          delivery_location?: string | null
          delivery_notes?: string | null
          id?: string
          in_transit_at?: string | null
          jobsite_id?: string | null
          language_detected?: string | null
          lot_id: string
          material_name?: string | null
          material_type?: string | null
          notes?: string | null
          operator_id?: string | null
          organization_id?: string | null
          phase_id: string
          photo_url?: string | null
          quantity?: number | null
          raw_message?: string | null
          requested_at?: string | null
          requested_by: string
          requested_by_name?: string | null
          source?: string | null
          status?: string | null
          sub_items?: Json | null
          unit?: string | null
          updated_at?: string | null
          urgency_factors?: Json | null
          urgency_level?: string | null
          urgency_reason?: string | null
          urgency_score?: number | null
          worker_id?: string | null
          worker_name?: string | null
          worker_phone?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          authorized_at?: string | null
          authorized_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_id?: string | null
          confidence?: number | null
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivered_by_id?: string | null
          delivered_by_name?: string | null
          delivery_location?: string | null
          delivery_notes?: string | null
          id?: string
          in_transit_at?: string | null
          jobsite_id?: string | null
          language_detected?: string | null
          lot_id?: string
          material_name?: string | null
          material_type?: string | null
          notes?: string | null
          operator_id?: string | null
          organization_id?: string | null
          phase_id?: string
          photo_url?: string | null
          quantity?: number | null
          raw_message?: string | null
          requested_at?: string | null
          requested_by?: string
          requested_by_name?: string | null
          source?: string | null
          status?: string | null
          sub_items?: Json | null
          unit?: string | null
          updated_at?: string | null
          urgency_factors?: Json | null
          urgency_level?: string | null
          urgency_reason?: string | null
          urgency_score?: number | null
          worker_id?: string | null
          worker_name?: string | null
          worker_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_material_requests_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_cancelled_by_id_fkey"
            columns: ["cancelled_by_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_delivered_by_id_fkey"
            columns: ["delivered_by_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "frm_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_material_tracking: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          description: string | null
          id: string
          installed_at: string | null
          installed_by: string | null
          jobsite_id: string | null
          length_inches: number | null
          lot_id: string
          material_subtype: string | null
          material_type: string
          notes: string | null
          ordered_at: string | null
          ordered_by: string | null
          organization_id: string | null
          phase_id: string | null
          quantity: number
          status: string
          unit: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          welded_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          jobsite_id?: string | null
          length_inches?: number | null
          lot_id: string
          material_subtype?: string | null
          material_type: string
          notes?: string | null
          ordered_at?: string | null
          ordered_by?: string | null
          organization_id?: string | null
          phase_id?: string | null
          quantity?: number
          status?: string
          unit?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          welded_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          jobsite_id?: string | null
          length_inches?: number | null
          lot_id?: string
          material_subtype?: string | null
          material_type?: string
          notes?: string | null
          ordered_at?: string | null
          ordered_by?: string | null
          organization_id?: string | null
          phase_id?: string | null
          quantity?: number
          status?: string
          unit?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          welded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_material_tracking_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_tracking_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_tracking_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_tracking_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_tracking_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_material_tracking_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_messages: {
        Row: {
          ai_context: Json | null
          ai_model: string | null
          ai_question: string | null
          attachments: Json | null
          content: string
          created_at: string
          id: string
          is_ai_response: boolean | null
          jobsite_id: string
          lot_id: string | null
          metadata: Json | null
          organization_id: string | null
          phase_at_creation: number | null
          reply_to_id: string | null
          sender_avatar_url: string | null
          sender_id: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          ai_context?: Json | null
          ai_model?: string | null
          ai_question?: string | null
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          is_ai_response?: boolean | null
          jobsite_id: string
          lot_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          phase_at_creation?: number | null
          reply_to_id?: string | null
          sender_avatar_url?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
        }
        Update: {
          ai_context?: Json | null
          ai_model?: string | null
          ai_question?: string | null
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          is_ai_response?: boolean | null
          jobsite_id?: string
          lot_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          phase_at_creation?: number | null
          reply_to_id?: string | null
          sender_avatar_url?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_messages_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_messages_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "frm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_operator_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          available_since: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          jobsite_id: string
          notes: string | null
          operator_id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          available_since?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          jobsite_id: string
          notes?: string | null
          operator_id: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          available_since?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          jobsite_id?: string
          notes?: string | null
          operator_id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_operator_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_operator_assignments_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_operator_assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_operator_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_operator_state: {
        Row: {
          operator_id: string
          reason: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          operator_id: string
          reason?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          operator_id?: string
          reason?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_operator_state_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_patterns: {
        Row: {
          canonical_material: string
          confidence: number | null
          created_at: string | null
          id: string
          jobsite_id: string | null
          keyword: string
          last_used_at: string | null
          sample_count: number | null
          worker_id: string
        }
        Insert: {
          canonical_material: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          jobsite_id?: string | null
          keyword: string
          last_used_at?: string | null
          sample_count?: number | null
          worker_id: string
        }
        Update: {
          canonical_material?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          jobsite_id?: string | null
          keyword?: string
          last_used_at?: string | null
          sample_count?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_patterns_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_phase_assignments: {
        Row: {
          assigned_at: string | null
          completed_at: string | null
          crew_id: string
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          phase_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          crew_id: string
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          phase_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          crew_id?: string
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          phase_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_phase_assignments_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "frm_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_assignments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_assignments_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_phase_payments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          crew_id: string
          deductions: number | null
          extras: number | null
          final_amount: number | null
          holdback_amount: number | null
          holdback_notes: string | null
          holdback_pct: number
          holdback_reassigned_to: string | null
          holdback_released_at: string | null
          holdback_released_by: string | null
          holdback_status: string
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          paid_at: string | null
          payable_now: number | null
          phase_id: string
          rate_per_sqft: number
          sqft: number
          status: string | null
          total: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          crew_id: string
          deductions?: number | null
          extras?: number | null
          final_amount?: number | null
          holdback_amount?: number | null
          holdback_notes?: string | null
          holdback_pct?: number
          holdback_reassigned_to?: string | null
          holdback_released_at?: string | null
          holdback_released_by?: string | null
          holdback_status?: string
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payable_now?: number | null
          phase_id: string
          rate_per_sqft: number
          sqft: number
          status?: string | null
          total?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          crew_id?: string
          deductions?: number | null
          extras?: number | null
          final_amount?: number | null
          holdback_amount?: number | null
          holdback_notes?: string | null
          holdback_pct?: number
          holdback_reassigned_to?: string | null
          holdback_released_at?: string | null
          holdback_released_by?: string | null
          holdback_status?: string
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payable_now?: number | null
          phase_id?: string
          rate_per_sqft?: number
          sqft?: number
          status?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_phase_payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_payments_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "frm_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_payments_holdback_reassigned_to_fkey"
            columns: ["holdback_reassigned_to"]
            isOneToOne: false
            referencedRelation: "frm_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_payments_holdback_released_by_fkey"
            columns: ["holdback_released_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_phase_payments_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_phases: {
        Row: {
          description: string | null
          id: string
          is_backframe: boolean | null
          is_optional: boolean | null
          name: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id: string
          is_backframe?: boolean | null
          is_optional?: boolean | null
          name: string
          sort_order: number
        }
        Update: {
          description?: string | null
          id?: string
          is_backframe?: boolean | null
          is_optional?: boolean | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      frm_photos: {
        Row: {
          ai_confidence: number | null
          ai_detected_items: Json | null
          ai_validation_notes: string | null
          ai_validation_status: string | null
          created_at: string | null
          id: string
          is_training_eligible: boolean | null
          lot_id: string
          metadata: Json | null
          organization_id: string | null
          phase_id: string | null
          photo_type: string | null
          photo_url: string
          quality_score: number | null
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_detected_items?: Json | null
          ai_validation_notes?: string | null
          ai_validation_status?: string | null
          created_at?: string | null
          id?: string
          is_training_eligible?: boolean | null
          lot_id: string
          metadata?: Json | null
          organization_id?: string | null
          phase_id?: string | null
          photo_type?: string | null
          photo_url: string
          quality_score?: number | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_detected_items?: Json | null
          ai_validation_notes?: string | null
          ai_validation_status?: string | null
          created_at?: string | null
          id?: string
          is_training_eligible?: boolean | null
          lot_id?: string
          metadata?: Json | null
          organization_id?: string | null
          phase_id?: string | null
          photo_type?: string | null
          photo_url?: string
          quality_score?: number | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_photos_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_photos_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_progress: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          phase_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          phase_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          phase_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_progress_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_progress_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_progress_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_return_visits: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          crew_id: string | null
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          photo_after: string | null
          photo_before: string | null
          reason: string
          requested_by: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          crew_id?: string | null
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          photo_after?: string | null
          photo_before?: string | null
          reason: string
          requested_by?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          crew_id?: string | null
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          photo_after?: string | null
          photo_before?: string | null
          reason?: string
          requested_by?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_return_visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_return_visits_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "frm_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_return_visits_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_return_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_return_visits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_safety_checks: {
        Row: {
          blocking: boolean | null
          created_at: string | null
          description: string | null
          id: string
          lot_id: string
          organization_id: string | null
          phase_id: string | null
          photo_url: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_photo: string | null
          status: string | null
          type: string
        }
        Insert: {
          blocking?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          lot_id: string
          organization_id?: string | null
          phase_id?: string | null
          photo_url: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_photo?: string | null
          status?: string | null
          type: string
        }
        Update: {
          blocking?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          lot_id?: string
          organization_id?: string | null
          phase_id?: string | null
          photo_url?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_photo?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_safety_checks_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_safety_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_safety_checks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_safety_checks_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_safety_checks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_scans: {
        Row: {
          ai_processed: boolean | null
          ai_result: Json | null
          created_at: string | null
          file_type: string | null
          generated_svg: string | null
          id: string
          jobsite_id: string
          organization_id: string | null
          original_url: string
        }
        Insert: {
          ai_processed?: boolean | null
          ai_result?: Json | null
          created_at?: string | null
          file_type?: string | null
          generated_svg?: string | null
          id?: string
          jobsite_id: string
          organization_id?: string | null
          original_url: string
        }
        Update: {
          ai_processed?: boolean | null
          ai_result?: Json | null
          created_at?: string | null
          file_type?: string | null
          generated_svg?: string | null
          id?: string
          jobsite_id?: string
          organization_id?: string | null
          original_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_scans_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_schedule_phases: {
        Row: {
          actual_duration_days: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          blocked_reason: string | null
          blocked_since: string | null
          created_at: string | null
          depends_on_phases: string[] | null
          expected_duration_days: number | null
          expected_end_date: string | null
          expected_start_date: string | null
          id: string
          notes: string | null
          organization_id: string | null
          payment_approved_at: string | null
          payment_approved_by: string | null
          payment_exported_at: string | null
          payment_notes: string | null
          payment_status: string | null
          phase_id: string
          schedule_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          blocked_reason?: string | null
          blocked_since?: string | null
          created_at?: string | null
          depends_on_phases?: string[] | null
          expected_duration_days?: number | null
          expected_end_date?: string | null
          expected_start_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_approved_at?: string | null
          payment_approved_by?: string | null
          payment_exported_at?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          phase_id: string
          schedule_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          blocked_reason?: string | null
          blocked_since?: string | null
          created_at?: string | null
          depends_on_phases?: string[] | null
          expected_duration_days?: number | null
          expected_end_date?: string | null
          expected_start_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_approved_at?: string | null
          payment_approved_by?: string | null
          payment_exported_at?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          phase_id?: string
          schedule_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_schedule_phases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_schedule_phases_payment_approved_by_fkey"
            columns: ["payment_approved_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_schedule_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_schedule_phases_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "frm_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_schedules: {
        Row: {
          actual_duration_days: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          ai_analysis_notes: string | null
          ai_last_analyzed_at: string | null
          ai_predicted_end_date: string | null
          ai_risk_score: number | null
          assigned_worker_id: string | null
          assigned_worker_name: string | null
          created_at: string | null
          deviation_days: number | null
          deviation_reason: string | null
          expected_duration_days: number | null
          expected_end_date: string
          expected_start_date: string
          id: string
          jobsite_id: string | null
          lot_id: string
          organization_id: string | null
          status: string | null
          template_name: string | null
          template_version: number | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          ai_analysis_notes?: string | null
          ai_last_analyzed_at?: string | null
          ai_predicted_end_date?: string | null
          ai_risk_score?: number | null
          assigned_worker_id?: string | null
          assigned_worker_name?: string | null
          created_at?: string | null
          deviation_days?: number | null
          deviation_reason?: string | null
          expected_duration_days?: number | null
          expected_end_date: string
          expected_start_date: string
          id?: string
          jobsite_id?: string | null
          lot_id: string
          organization_id?: string | null
          status?: string | null
          template_name?: string | null
          template_version?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          ai_analysis_notes?: string | null
          ai_last_analyzed_at?: string | null
          ai_predicted_end_date?: string | null
          ai_risk_score?: number | null
          assigned_worker_id?: string | null
          assigned_worker_name?: string | null
          created_at?: string | null
          deviation_days?: number | null
          deviation_reason?: string | null
          expected_duration_days?: number | null
          expected_end_date?: string
          expected_start_date?: string
          id?: string
          jobsite_id?: string | null
          lot_id?: string
          organization_id?: string | null
          status?: string | null
          template_name?: string | null
          template_version?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_schedules_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_schedules_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_schedules_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_shared_report_items: {
        Row: {
          created_at: string
          id: string
          is_blocking: boolean
          item_code: string
          item_label: string
          notes: string | null
          photo_urls: string[]
          report_id: string
          result: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_blocking?: boolean
          item_code: string
          item_label: string
          notes?: string | null
          photo_urls?: string[]
          report_id: string
          result: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_blocking?: boolean
          item_code?: string
          item_label?: string
          notes?: string | null
          photo_urls?: string[]
          report_id?: string
          result?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "frm_shared_report_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "frm_shared_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_shared_reports: {
        Row: {
          completed_at: string
          created_at: string
          edit_history: Json
          expires_at: string | null
          fail_count: number
          gate_check_id: string | null
          id: string
          inspector_company: string | null
          inspector_name: string
          jobsite: string
          lot_number: string
          na_count: number
          pass_count: number
          passed: boolean
          reference: string
          source: string
          started_at: string | null
          token: string
          total_items: number
          total_photos: number
          transition: string
          transition_label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          edit_history?: Json
          expires_at?: string | null
          fail_count: number
          gate_check_id?: string | null
          id?: string
          inspector_company?: string | null
          inspector_name: string
          jobsite: string
          lot_number: string
          na_count: number
          pass_count: number
          passed: boolean
          reference: string
          source?: string
          started_at?: string | null
          token: string
          total_items: number
          total_photos?: number
          transition: string
          transition_label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          edit_history?: Json
          expires_at?: string | null
          fail_count?: number
          gate_check_id?: string | null
          id?: string
          inspector_company?: string | null
          inspector_name?: string
          jobsite?: string
          lot_number?: string
          na_count?: number
          pass_count?: number
          passed?: boolean
          reference?: string
          source?: string
          started_at?: string | null
          token?: string
          total_items?: number
          total_photos?: number
          transition?: string
          transition_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_shared_reports_gate_check_id_fkey"
            columns: ["gate_check_id"]
            isOneToOne: false
            referencedRelation: "frm_gate_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_site_workers: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          display_name: string | null
          first_seen_at: string | null
          id: string
          is_active: boolean | null
          jobsite_id: string
          last_active_at: string | null
          organization_id: string | null
          phone_e164: string | null
          total_requests: number | null
          trades: string[] | null
          updated_at: string | null
          worker_id: string
          worker_name: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          display_name?: string | null
          first_seen_at?: string | null
          id?: string
          is_active?: boolean | null
          jobsite_id: string
          last_active_at?: string | null
          organization_id?: string | null
          phone_e164?: string | null
          total_requests?: number | null
          trades?: string[] | null
          updated_at?: string | null
          worker_id: string
          worker_name?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          display_name?: string | null
          first_seen_at?: string | null
          id?: string
          is_active?: boolean | null
          jobsite_id?: string
          last_active_at?: string | null
          organization_id?: string | null
          phone_e164?: string | null
          total_requests?: number | null
          trades?: string[] | null
          updated_at?: string | null
          worker_id?: string
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_site_workers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_site_workers_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_site_workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_site_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_third_party_entries: {
        Row: {
          authorized_by: string | null
          company: string
          entered_at: string | null
          exited_at: string | null
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          phase_id: string | null
          purpose: string
        }
        Insert: {
          authorized_by?: string | null
          company: string
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          phase_id?: string | null
          purpose: string
        }
        Update: {
          authorized_by?: string | null
          company?: string
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          phase_id?: string | null
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_third_party_entries_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_third_party_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_third_party_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_third_party_entries_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "frm_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_timeline: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          lot_id: string
          metadata: Json | null
          organization_id: string | null
          source: string | null
          source_link: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          lot_id: string
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          source_link?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          lot_id?: string
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          source_link?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_timeline_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_timeline_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_trade_pauses: {
        Row: {
          ended_at: string | null
          expected_end: string | null
          id: string
          lot_id: string
          notes: string | null
          organization_id: string | null
          started_at: string
          trades_in: string[] | null
        }
        Insert: {
          ended_at?: string | null
          expected_end?: string | null
          id?: string
          lot_id: string
          notes?: string | null
          organization_id?: string | null
          started_at: string
          trades_in?: string[] | null
        }
        Update: {
          ended_at?: string | null
          expected_end?: string | null
          id?: string
          lot_id?: string
          notes?: string | null
          organization_id?: string | null
          started_at?: string
          trades_in?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_trade_pauses_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_trade_pauses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_warnings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          dismissable: boolean | null
          expires_at: string | null
          id: string
          lot_id: string | null
          organization_id: string | null
          persistent: boolean | null
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_proof: string | null
          sent_by: string | null
          status: string | null
          target_id: string | null
          target_type: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          dismissable?: boolean | null
          expires_at?: string | null
          id?: string
          lot_id?: string | null
          organization_id?: string | null
          persistent?: boolean | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_proof?: string | null
          sent_by?: string | null
          status?: string | null
          target_id?: string | null
          target_type: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          dismissable?: boolean | null
          expires_at?: string | null
          id?: string
          lot_id?: string | null
          organization_id?: string | null
          persistent?: boolean | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_proof?: string | null
          sent_by?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "frm_warnings_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "frm_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_warnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "core_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_warnings_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frm_warnings_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_worker_bundles: {
        Row: {
          created_at: string | null
          id: string
          jobsite_id: string
          label: string | null
          lot_ids: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jobsite_id: string
          label?: string | null
          lot_ids?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jobsite_id?: string
          label?: string | null
          lot_ids?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frm_worker_bundles_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
        ]
      }
      frm_workers: {
        Row: {
          created_at: string | null
          display_name: string | null
          first_seen_at: string | null
          id: string
          last_active_at: string | null
          phone_e164: string
          total_requests: number | null
          trades: string[] | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          first_seen_at?: string | null
          id?: string
          last_active_at?: string | null
          phone_e164: string
          total_requests?: number | null
          trades?: string[] | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          first_seen_at?: string | null
          id?: string
          last_active_at?: string | null
          phone_e164?: string
          total_requests?: number | null
          trades?: string[] | null
        }
        Relationships: []
      }
      int_behavior_patterns: {
        Row: {
          avg_hours_per_week: number | null
          avg_sessions_per_week: number | null
          created_at: string | null
          feature_adoption: Json | null
          id: string
          median_hours_per_week: number | null
          peak_end_hour: number | null
          peak_start_hour: number | null
          peak_work_day: number | null
          period_end: string
          period_start: string
          period_type: string
          sample_size: number | null
          segment_type: string
          segment_value: string
          std_dev_hours: number | null
          updated_at: string | null
        }
        Insert: {
          avg_hours_per_week?: number | null
          avg_sessions_per_week?: number | null
          created_at?: string | null
          feature_adoption?: Json | null
          id?: string
          median_hours_per_week?: number | null
          peak_end_hour?: number | null
          peak_start_hour?: number | null
          peak_work_day?: number | null
          period_end: string
          period_start: string
          period_type: string
          sample_size?: number | null
          segment_type: string
          segment_value: string
          std_dev_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_hours_per_week?: number | null
          avg_sessions_per_week?: number | null
          created_at?: string | null
          feature_adoption?: Json | null
          id?: string
          median_hours_per_week?: number | null
          peak_end_hour?: number | null
          peak_start_hour?: number | null
          peak_work_day?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          sample_size?: number | null
          segment_type?: string
          segment_value?: string
          std_dev_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      int_voice_patterns: {
        Row: {
          confidence_avg: number | null
          dialect_region: string | null
          first_seen_at: string | null
          id: string
          is_validated: boolean | null
          language: string | null
          last_seen_at: string | null
          normalized_form: string
          occurrence_count: number | null
          pattern_type: string
          raw_form: string
          trade_context: string | null
          unique_users_count: number | null
          validated_at: string | null
          validated_by: string | null
          variations: Json | null
        }
        Insert: {
          confidence_avg?: number | null
          dialect_region?: string | null
          first_seen_at?: string | null
          id?: string
          is_validated?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          normalized_form: string
          occurrence_count?: number | null
          pattern_type: string
          raw_form: string
          trade_context?: string | null
          unique_users_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
          variations?: Json | null
        }
        Update: {
          confidence_avg?: number | null
          dialect_region?: string | null
          first_seen_at?: string | null
          id?: string
          is_validated?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          normalized_form?: string
          occurrence_count?: number | null
          pattern_type?: string
          raw_form?: string
          trade_context?: string | null
          unique_users_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
          variations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "int_voice_patterns_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "core_admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      log_errors: {
        Row: {
          action_attempted: string | null
          app_name: string
          app_version: string | null
          created_at: string | null
          device_model: string | null
          error_code: string | null
          error_context: Json | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          network_type: string | null
          occurred_at: string
          os_version: string | null
          platform: string | null
          screen_name: string | null
          user_id: string | null
        }
        Insert: {
          action_attempted?: string | null
          app_name: string
          app_version?: string | null
          created_at?: string | null
          device_model?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          network_type?: string | null
          occurred_at: string
          os_version?: string | null
          platform?: string | null
          screen_name?: string | null
          user_id?: string | null
        }
        Update: {
          action_attempted?: string | null
          app_name?: string
          app_version?: string | null
          created_at?: string | null
          device_model?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          network_type?: string | null
          occurred_at?: string
          os_version?: string | null
          platform?: string | null
          screen_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      log_events: {
        Row: {
          app_name: string
          app_version: string | null
          client_timestamp: string | null
          country: string | null
          created_at: string | null
          device_id: string | null
          device_model: string | null
          duration_ms: number | null
          error_message: string | null
          event_category: string | null
          event_name: string
          feature_name: string | null
          id: string
          os_version: string | null
          platform: string | null
          properties: Json | null
          province: string | null
          screen_name: string | null
          session_id: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          app_name: string
          app_version?: string | null
          client_timestamp?: string | null
          country?: string | null
          created_at?: string | null
          device_id?: string | null
          device_model?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_category?: string | null
          event_name: string
          feature_name?: string | null
          id?: string
          os_version?: string | null
          platform?: string | null
          properties?: Json | null
          province?: string | null
          screen_name?: string | null
          session_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          app_name?: string
          app_version?: string | null
          client_timestamp?: string | null
          country?: string | null
          created_at?: string | null
          device_id?: string | null
          device_model?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_category?: string | null
          event_name?: string
          feature_name?: string | null
          id?: string
          os_version?: string | null
          platform?: string | null
          properties?: Json | null
          province?: string | null
          screen_name?: string | null
          session_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      log_locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          created_at: string | null
          distance_from_center: number | null
          entry_id: string | null
          event_type: string
          geofence_id: string | null
          geofence_name: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          occurred_at: string
          session_id: string | null
          speed: number | null
          synced_at: string | null
          trigger_type: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string | null
          distance_from_center?: number | null
          entry_id?: string | null
          event_type: string
          geofence_id?: string | null
          geofence_name?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          occurred_at: string
          session_id?: string | null
          speed?: number | null
          synced_at?: string | null
          trigger_type?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string | null
          distance_from_center?: number | null
          entry_id?: string | null
          event_type?: string
          geofence_id?: string | null
          geofence_name?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          occurred_at?: string
          session_id?: string | null
          speed?: number | null
          synced_at?: string | null
          trigger_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_accountant_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          is_primary: boolean
          name: string | null
          operator_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          name?: string | null
          operator_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_accountant_contacts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_client_company_access: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_client_company_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ops_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_client_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ops_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_clients: {
        Row: {
          created_at: string
          display_name: string
          email: string
          fee_percent_override: number | null
          first_invoice_at: string | null
          id: string
          operator_id: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          fee_percent_override?: number | null
          first_invoice_at?: string | null
          id?: string
          operator_id: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          fee_percent_override?: number | null
          first_invoice_at?: string | null
          id?: string
          operator_id?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_clients_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_companies: {
        Row: {
          address: string | null
          created_at: string
          current_invoice_number: number
          hst_number: string | null
          id: string
          invoice_prefix: string
          is_active: boolean
          legal_name: string
          logo_url: string | null
          operator_id: string
          trade_name: string | null
          wsib_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_invoice_number?: number
          hst_number?: string | null
          id?: string
          invoice_prefix: string
          is_active?: boolean
          legal_name: string
          logo_url?: string | null
          operator_id: string
          trade_name?: string | null
          wsib_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          current_invoice_number?: number
          hst_number?: string | null
          id?: string
          invoice_prefix?: string
          is_active?: boolean
          legal_name?: string
          logo_url?: string | null
          operator_id?: string
          trade_name?: string | null
          wsib_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_companies_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_export_logs: {
        Row: {
          accountant_email: string
          company_id: string | null
          id: string
          invoice_count: number
          operator_id: string
          period_end: string
          period_start: string
          sent_at: string
          total_amount: number
          zip_url: string | null
        }
        Insert: {
          accountant_email: string
          company_id?: string | null
          id?: string
          invoice_count: number
          operator_id: string
          period_end: string
          period_start: string
          sent_at?: string
          total_amount: number
          zip_url?: string | null
        }
        Update: {
          accountant_email?: string
          company_id?: string | null
          id?: string
          invoice_count?: number
          operator_id?: string
          period_end?: string
          period_start?: string
          sent_at?: string
          total_amount?: number
          zip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_export_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ops_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_export_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_gcs: {
        Row: {
          created_at: string
          default_payment_method: string
          id: string
          name: string
          notes: string | null
          operator_id: string
        }
        Insert: {
          created_at?: string
          default_payment_method?: string
          id?: string
          name: string
          notes?: string | null
          operator_id: string
        }
        Update: {
          created_at?: string
          default_payment_method?: string
          id?: string
          name?: string
          notes?: string | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_gcs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_inbox_blocklist: {
        Row: {
          blocked_at: string
          blocked_email: string
          id: string
          operator_id: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_email: string
          id?: string
          operator_id: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_email?: string
          id?: string
          operator_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_inbox_blocklist_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_invoice_versions: {
        Row: {
          amount_gross: number
          id: string
          invoice_id: string
          is_current: boolean
          pdf_hash: string | null
          pdf_url: string
          received_at: string
          rejected: boolean
          version_number: number
        }
        Insert: {
          amount_gross: number
          id?: string
          invoice_id: string
          is_current?: boolean
          pdf_hash?: string | null
          pdf_url: string
          received_at: string
          rejected?: boolean
          version_number: number
        }
        Update: {
          amount_gross?: number
          id?: string
          invoice_id?: string
          is_current?: boolean
          pdf_hash?: string | null
          pdf_url?: string
          received_at?: string
          rejected?: boolean
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ops_invoice_versions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ops_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_invoices: {
        Row: {
          amount_gross: number
          amount_hst: number | null
          amount_received: number | null
          approved_at: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          divergence_amount: number | null
          divergence_flagged: boolean
          from_email: string
          from_name: string | null
          gc_id: string | null
          id: string
          invoice_number: string | null
          locked_at: string | null
          operator_id: string
          operator_notes: string | null
          paid_by_gc_at: string | null
          paid_to_client_at: string | null
          pdf_hash: string | null
          pdf_url: string
          raw_email_id: string | null
          received_at: string
          site_address: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          amount_gross: number
          amount_hst?: number | null
          amount_received?: number | null
          approved_at?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          divergence_amount?: number | null
          divergence_flagged?: boolean
          from_email: string
          from_name?: string | null
          gc_id?: string | null
          id?: string
          invoice_number?: string | null
          locked_at?: string | null
          operator_id: string
          operator_notes?: string | null
          paid_by_gc_at?: string | null
          paid_to_client_at?: string | null
          pdf_hash?: string | null
          pdf_url: string
          raw_email_id?: string | null
          received_at: string
          site_address?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          amount_gross?: number
          amount_hst?: number | null
          amount_received?: number | null
          approved_at?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          divergence_amount?: number | null
          divergence_flagged?: boolean
          from_email?: string
          from_name?: string | null
          gc_id?: string | null
          id?: string
          invoice_number?: string | null
          locked_at?: string | null
          operator_id?: string
          operator_notes?: string | null
          paid_by_gc_at?: string | null
          paid_to_client_at?: string | null
          pdf_hash?: string | null
          pdf_url?: string
          raw_email_id?: string | null
          received_at?: string
          site_address?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ops_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ops_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_invoices_gc_id_fkey"
            columns: ["gc_id"]
            isOneToOne: false
            referencedRelation: "ops_gcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_invoices_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_ledger_entries: {
        Row: {
          amount: number
          balance_after: number
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          invoice_id: string | null
          operator_id: string
          settled_by_invoice_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          invoice_id?: string | null
          operator_id: string
          settled_by_invoice_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          invoice_id?: string | null
          operator_id?: string
          settled_by_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_ledger_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ops_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_ledger_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ops_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_ledger_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "ops_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_ledger_entries_settled_by_invoice_id_fkey"
            columns: ["settled_by_invoice_id"]
            isOneToOne: false
            referencedRelation: "ops_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_operators: {
        Row: {
          created_at: string
          default_fee_percent: number
          display_name: string
          id: string
          inbox_username: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_fee_percent?: number
          display_name: string
          id?: string
          inbox_username: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_fee_percent?: number
          display_name?: string
          id?: string
          inbox_username?: string
          user_id?: string
        }
        Relationships: []
      }
      ref_material_types: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          default_unit: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_pt: string | null
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          default_unit?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_pt?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          default_unit?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_pt?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_provinces: {
        Row: {
          code: string
          country: string | null
          created_at: string | null
          has_red_seal: boolean | null
          id: string
          is_active: boolean | null
          min_wage: number | null
          name_en: string
          name_fr: string | null
          overtime_threshold: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string | null
          has_red_seal?: boolean | null
          id?: string
          is_active?: boolean | null
          min_wage?: number | null
          name_en: string
          name_fr?: string | null
          overtime_threshold?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string | null
          has_red_seal?: boolean | null
          id?: string
          is_active?: boolean | null
          min_wage?: number | null
          name_en?: string
          name_fr?: string | null
          overtime_threshold?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ref_trades: {
        Row: {
          category: string | null
          code: string
          common_calculations: string[] | null
          common_materials: string[] | null
          common_tools: string[] | null
          created_at: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_es: string | null
          name_fr: string | null
          name_pt: string | null
          parent_trade_id: string | null
          sort_order: number | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          common_calculations?: string[] | null
          common_materials?: string[] | null
          common_tools?: string[] | null
          created_at?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_es?: string | null
          name_fr?: string | null
          name_pt?: string | null
          parent_trade_id?: string | null
          sort_order?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          common_calculations?: string[] | null
          common_materials?: string[] | null
          common_tools?: string[] | null
          created_at?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_es?: string | null
          name_fr?: string | null
          name_pt?: string | null
          parent_trade_id?: string | null
          sort_order?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_trades_parent_trade_id_fkey"
            columns: ["parent_trade_id"]
            isOneToOne: false
            referencedRelation: "ref_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_units: {
        Row: {
          base_unit_code: string | null
          code: string
          conversion_factor: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_fr: string | null
          name_pt: string | null
          spoken_variations: Json | null
          symbol: string
          system: string
          unit_type: string
        }
        Insert: {
          base_unit_code?: string | null
          code: string
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_fr?: string | null
          name_pt?: string | null
          spoken_variations?: Json | null
          symbol: string
          system: string
          unit_type: string
        }
        Update: {
          base_unit_code?: string | null
          code?: string
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_fr?: string | null
          name_pt?: string | null
          spoken_variations?: Json | null
          symbol?: string
          system?: string
          unit_type?: string
        }
        Relationships: []
      }
      shp_carts: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          items: Json | null
          session_id: string | null
          subtotal: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          items?: Json | null
          session_id?: string | null
          subtotal?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          items?: Json | null
          session_id?: string | null
          subtotal?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shp_carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shp_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shp_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shp_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shp_order_items: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_sku: string | null
          quantity: number
          size: string | null
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_sku?: string | null
          quantity: number
          size?: string | null
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_sku?: string | null
          quantity?: number
          size?: string | null
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shp_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shp_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shp_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shp_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shp_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shp_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      shp_orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          currency: string | null
          customer_notes: string | null
          delivered_at: string | null
          discount: number | null
          id: string
          internal_notes: string | null
          order_number: string
          paid_at: string | null
          shipped_at: string | null
          shipping: number | null
          shipping_address: Json | null
          shipping_method: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          tax: number | null
          total: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount?: number | null
          id?: string
          internal_notes?: string | null
          order_number: string
          paid_at?: string | null
          shipped_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal: number
          tax?: number | null
          total: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount?: number | null
          id?: string
          internal_notes?: string | null
          order_number?: string
          paid_at?: string | null
          shipped_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shp_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shp_products: {
        Row: {
          allow_backorder: boolean | null
          base_price: number
          category_id: string | null
          colors: string[] | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          has_variants: boolean | null
          id: string
          images: string[] | null
          inventory_quantity: number | null
          is_active: boolean | null
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          sizes: string[] | null
          sku: string | null
          slug: string
          sort_order: number | null
          target_trades: string[] | null
          total_revenue: number | null
          total_sold: number | null
          track_inventory: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_backorder?: boolean | null
          base_price: number
          category_id?: string | null
          colors?: string[] | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          has_variants?: boolean | null
          id?: string
          images?: string[] | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          sizes?: string[] | null
          sku?: string | null
          slug: string
          sort_order?: number | null
          target_trades?: string[] | null
          total_revenue?: number | null
          total_sold?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_backorder?: boolean | null
          base_price?: number
          category_id?: string | null
          colors?: string[] | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          has_variants?: boolean | null
          id?: string
          images?: string[] | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          sizes?: string[] | null
          sku?: string | null
          slug?: string
          sort_order?: number | null
          target_trades?: string[] | null
          total_revenue?: number | null
          total_sold?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shp_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shp_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shp_variants: {
        Row: {
          color: string | null
          compare_at_price: number | null
          created_at: string | null
          id: string
          inventory_quantity: number | null
          is_active: boolean | null
          name: string
          price: number
          product_id: string
          size: string | null
          sku: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean | null
          name: string
          price: number
          product_id: string
          size?: string | null
          sku?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean | null
          name?: string
          price?: number
          product_id?: string
          size?: string | null
          sku?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shp_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shp_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sht_exports: {
        Row: {
          created_at: string | null
          export_format: string
          file_url: string | null
          filters_used: Json | null
          id: string
          jobsite_id: string
          row_count: number | null
          sheet_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          export_format: string
          file_url?: string | null
          filters_used?: Json | null
          id?: string
          jobsite_id: string
          row_count?: number | null
          sheet_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          export_format?: string
          file_url?: string | null
          filters_used?: Json | null
          id?: string
          jobsite_id?: string
          row_count?: number | null
          sheet_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sht_exports_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sht_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sht_qb_mappings: {
        Row: {
          created_at: string | null
          field_source: string
          id: string
          organization_id: string | null
          qb_field: string
          transform: Json | null
        }
        Insert: {
          created_at?: string | null
          field_source: string
          id?: string
          organization_id?: string | null
          qb_field: string
          transform?: Json | null
        }
        Update: {
          created_at?: string | null
          field_source?: string
          id?: string
          organization_id?: string | null
          qb_field?: string
          transform?: Json | null
        }
        Relationships: []
      }
      sht_saved_views: {
        Row: {
          columns: Json | null
          created_at: string | null
          filters: Json | null
          id: string
          is_default: boolean | null
          jobsite_id: string
          name: string
          sheet_type: string
          sort_by: string | null
          sort_dir: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          columns?: Json | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          jobsite_id: string
          name: string
          sheet_type: string
          sort_by?: string | null
          sort_dir?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          columns?: Json | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          jobsite_id?: string
          name?: string
          sheet_type?: string
          sort_by?: string | null
          sort_dir?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sht_saved_views_jobsite_id_fkey"
            columns: ["jobsite_id"]
            isOneToOne: false
            referencedRelation: "frm_jobsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sht_saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmk_analytics: {
        Row: {
          app_opens: number | null
          app_version: string | null
          auto_entries: number | null
          created_at: string | null
          device_model: string | null
          errors_count: number | null
          features_used: Json | null
          geofence_accuracy_avg: number | null
          geofence_triggers: number | null
          manual_entries: number | null
          organization_id: string | null
          os: string | null
          sessions_count: number | null
          sync_attempts: number | null
          sync_failures: number | null
          synced_at: string | null
          total_minutes: number | null
          user_id: string
          voice_commands: number | null
          work_date: string
        }
        Insert: {
          app_opens?: number | null
          app_version?: string | null
          auto_entries?: number | null
          created_at?: string | null
          device_model?: string | null
          errors_count?: number | null
          features_used?: Json | null
          geofence_accuracy_avg?: number | null
          geofence_triggers?: number | null
          manual_entries?: number | null
          organization_id?: string | null
          os?: string | null
          sessions_count?: number | null
          sync_attempts?: number | null
          sync_failures?: number | null
          synced_at?: string | null
          total_minutes?: number | null
          user_id: string
          voice_commands?: number | null
          work_date: string
        }
        Update: {
          app_opens?: number | null
          app_version?: string | null
          auto_entries?: number | null
          created_at?: string | null
          device_model?: string | null
          errors_count?: number | null
          features_used?: Json | null
          geofence_accuracy_avg?: number | null
          geofence_triggers?: number | null
          manual_entries?: number | null
          organization_id?: string | null
          os?: string | null
          sessions_count?: number | null
          sync_attempts?: number | null
          sync_failures?: number | null
          synced_at?: string | null
          total_minutes?: number | null
          user_id?: string
          voice_commands?: number | null
          work_date?: string
        }
        Relationships: []
      }
      tmk_audit: {
        Row: {
          accuracy: number | null
          created_at: string | null
          event_type: string
          id: string
          latitude: number
          location_id: string | null
          location_name: string | null
          longitude: number
          occurred_at: string
          organization_id: string | null
          session_id: string | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          latitude: number
          location_id?: string | null
          location_name?: string | null
          longitude: number
          occurred_at: string
          organization_id?: string | null
          session_id?: string | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          latitude?: number
          location_id?: string | null
          location_name?: string | null
          longitude?: number
          occurred_at?: string
          organization_id?: string | null
          session_id?: string | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmk_audit_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tmk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tmk_corrections: {
        Row: {
          corrected_value: string | null
          created_at: string | null
          field: string
          id: string
          organization_id: string | null
          original_value: string | null
          reason: string | null
          reverted: boolean | null
          session_id: string | null
          source: string | null
          synced_at: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          corrected_value?: string | null
          created_at?: string | null
          field: string
          id?: string
          organization_id?: string | null
          original_value?: string | null
          reason?: string | null
          reverted?: boolean | null
          session_id?: string | null
          source?: string | null
          synced_at?: string | null
          user_id: string
          work_date: string
        }
        Update: {
          corrected_value?: string | null
          created_at?: string | null
          field?: string
          id?: string
          organization_id?: string | null
          original_value?: string | null
          reason?: string | null
          reverted?: boolean | null
          session_id?: string | null
          source?: string | null
          synced_at?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmk_corrections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tmk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tmk_day_summary: {
        Row: {
          break_minutes: number | null
          created_at: string | null
          deleted_at: string | null
          first_entry: string | null
          flags: Json | null
          id: string
          last_exit: string | null
          notes: string | null
          organization_id: string | null
          primary_location: string | null
          primary_location_id: string | null
          sessions_count: number | null
          source_mix: Json | null
          synced_at: string | null
          total_minutes: number | null
          type: string | null
          updated_at: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_entry?: string | null
          flags?: Json | null
          id?: string
          last_exit?: string | null
          notes?: string | null
          organization_id?: string | null
          primary_location?: string | null
          primary_location_id?: string | null
          sessions_count?: number | null
          source_mix?: Json | null
          synced_at?: string | null
          total_minutes?: number | null
          type?: string | null
          updated_at?: string | null
          user_id: string
          work_date: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_entry?: string | null
          flags?: Json | null
          id?: string
          last_exit?: string | null
          notes?: string | null
          organization_id?: string | null
          primary_location?: string | null
          primary_location_id?: string | null
          sessions_count?: number | null
          source_mix?: Json | null
          synced_at?: string | null
          total_minutes?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
      tmk_entries: {
        Row: {
          client_created_at: string | null
          created_at: string | null
          deleted_at: string | null
          device_id: string | null
          duration_minutes: number | null
          edit_reason: string | null
          entry_at: string
          entry_method: string
          exit_at: string | null
          exit_method: string | null
          geofence_id: string | null
          geofence_name: string | null
          id: string
          integrity_hash: string | null
          is_manual_entry: boolean | null
          manually_edited: boolean | null
          notes: string | null
          original_entry_at: string | null
          original_exit_at: string | null
          pause_minutes: number | null
          project_id: string | null
          synced_at: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_created_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          duration_minutes?: number | null
          edit_reason?: string | null
          entry_at: string
          entry_method: string
          exit_at?: string | null
          exit_method?: string | null
          geofence_id?: string | null
          geofence_name?: string | null
          id?: string
          integrity_hash?: string | null
          is_manual_entry?: boolean | null
          manually_edited?: boolean | null
          notes?: string | null
          original_entry_at?: string | null
          original_exit_at?: string | null
          pause_minutes?: number | null
          project_id?: string | null
          synced_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_created_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          duration_minutes?: number | null
          edit_reason?: string | null
          entry_at?: string
          entry_method?: string
          exit_at?: string | null
          exit_method?: string | null
          geofence_id?: string | null
          geofence_name?: string | null
          id?: string
          integrity_hash?: string | null
          is_manual_entry?: boolean | null
          manually_edited?: boolean | null
          notes?: string | null
          original_entry_at?: string | null
          original_exit_at?: string | null
          pause_minutes?: number | null
          project_id?: string | null
          synced_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmk_entries_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "tmk_geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmk_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tmk_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmk_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmk_errors: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_model: string | null
          error_context: Json | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          occurred_at: string
          organization_id: string | null
          os: string | null
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_model?: string | null
          error_context?: Json | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          occurred_at: string
          organization_id?: string | null
          os?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_model?: string | null
          error_context?: Json | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string | null
          os?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tmk_events: {
        Row: {
          accuracy: number | null
          confidence: number | null
          created_at: string | null
          event_type: string
          id: string
          latitude: number | null
          location_id: string
          longitude: number | null
          occurred_at: string
          organization_id: string | null
          received_at: string
          source: string
          synced_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          confidence?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          latitude?: number | null
          location_id: string
          longitude?: number | null
          occurred_at: string
          organization_id?: string | null
          received_at: string
          source?: string
          synced_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          confidence?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          occurred_at?: string
          organization_id?: string | null
          received_at?: string
          source?: string
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tmk_geofences: {
        Row: {
          address_city: string | null
          address_postal_code: string | null
          address_province: string | null
          address_street: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          last_entry_at: string | null
          latitude: number
          location_type: string | null
          longitude: number
          name: string
          project_type: string | null
          radius: number | null
          status: string | null
          synced_at: string | null
          total_entries: number | null
          total_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_postal_code?: string | null
          address_province?: string | null
          address_street?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          last_entry_at?: string | null
          latitude: number
          location_type?: string | null
          longitude: number
          name: string
          project_type?: string | null
          radius?: number | null
          status?: string | null
          synced_at?: string | null
          total_entries?: number | null
          total_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_postal_code?: string | null
          address_province?: string | null
          address_street?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          last_entry_at?: string | null
          latitude?: number
          location_type?: string | null
          longitude?: number
          name?: string
          project_type?: string | null
          radius?: number | null
          status?: string | null
          synced_at?: string | null
          total_entries?: number | null
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmk_geofences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmk_projects: {
        Row: {
          actual_end_date: string | null
          actual_hours: number | null
          actual_start_date: string | null
          budget_amount: number | null
          building_type: string | null
          client_name: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          estimated_end_date: string | null
          estimated_hours: number | null
          estimated_start_date: string | null
          hourly_rate: number | null
          id: string
          name: string
          project_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_hours?: number | null
          actual_start_date?: string | null
          budget_amount?: number | null
          building_type?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_end_date?: string | null
          estimated_hours?: number | null
          estimated_start_date?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          project_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_end_date?: string | null
          actual_hours?: number | null
          actual_start_date?: string | null
          budget_amount?: number | null
          building_type?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_end_date?: string | null
          estimated_hours?: number | null
          estimated_start_date?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          project_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmk_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmk_sessions: {
        Row: {
          break_seconds: number | null
          confidence: number | null
          created_at: string | null
          deleted_at: string | null
          duration_minutes: number | null
          enter_at: string
          exit_at: string | null
          id: string
          location_id: string | null
          location_name: string | null
          meta: Json | null
          notes: string | null
          organization_id: string | null
          source: string
          synced_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          break_seconds?: number | null
          confidence?: number | null
          created_at?: string | null
          deleted_at?: string | null
          duration_minutes?: number | null
          enter_at: string
          exit_at?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          meta?: Json | null
          notes?: string | null
          organization_id?: string | null
          source?: string
          synced_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          break_seconds?: number | null
          confidence?: number | null
          created_at?: string | null
          deleted_at?: string | null
          duration_minutes?: number | null
          enter_at?: string
          exit_at?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          meta?: Json | null
          notes?: string | null
          organization_id?: string | null
          source?: string
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmk_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tmk_geofences"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_link_document_to_lot: {
        Args: {
          p_created_by?: string
          p_document_id: string
          p_lot_number: string
          p_site_id: string
        }
        Returns: string
      }
      calculate_material_urgency_score: {
        Args: {
          p_house_priority?: number
          p_house_status?: string
          p_urgency_level: string
        }
        Returns: number
      }
      check_email_exists: { Args: { email_to_check: string }; Returns: boolean }
      delete_site_cascade: { Args: { target_site_id: string }; Returns: Json }
      get_report_context: {
        Args: { p_days?: number; p_house_id?: string; p_site_id: string }
        Returns: Json
      }
      get_user_org_role: { Args: { org_id: string }; Returns: string }
      get_user_organization_ids: { Args: never; Returns: string[] }
      is_active_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      lookup_builder_token: {
        Args: { p_token: string }
        Returns: {
          builder_email: string
          builder_name: string
          expires_at: string
          id: string
          is_active: boolean
          jobsite_id: string
        }[]
      }
      lookup_pending_token: {
        Args: { token_to_lookup: string }
        Returns: {
          owner_id: string
          owner_name: string
        }[]
      }
      record_builder_access: {
        Args: { p_token_id: string }
        Returns: undefined
      }
      user_belongs_to_org: { Args: { org_id: string }; Returns: boolean }
      user_is_org_admin: { Args: { org_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
